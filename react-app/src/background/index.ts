import type { SessionRuntimeMessage, SessionSummary } from "../types/sessions";

const DEFAULT_URL = "https://music.youtube.com";

/** Chaves no chrome.storage.local */
const KEYS = {
  SESSIONS: "ytmSessionWindows",
  ACTIVE: "ytmActiveWindowId",
  /** Versões antigas guardavam uma única janela */
  LEGACY_WINDOW: "ytmWindowId",
} as const;

const getStored = <T>(key: string): Promise<T | null> =>
  new Promise(resolve => {
    chrome.storage.local.get([key], (result: Record<string, T>) => {
      if (chrome.runtime.lastError) {
        resolve(null);
        return;
      }
      resolve(result[key] ?? null);
    });
  });

const setStored = (key: string, value: unknown): Promise<void> =>
  new Promise(resolve => {
    const done = () => {
      void chrome.runtime.lastError;
      resolve();
    };
    if (value === null) {
      chrome.storage.local.remove(key, done);
    } else {
      chrome.storage.local.set({ [key]: value }, done);
    }
  });

const getSessionWindows = async (): Promise<number[]> =>
  (await getStored<number[]>(KEYS.SESSIONS)) ?? [];

const setSessionWindows = (ids: number[]): Promise<void> =>
  setStored(KEYS.SESSIONS, ids.length > 0 ? ids : null);

const getActiveWindowId = (): Promise<number | null> =>
  getStored<number>(KEYS.ACTIVE);

const setActiveWindowId = (id: number | null): Promise<void> =>
  setStored(KEYS.ACTIVE, id);

/** Versões antigas guardavam uma única janela em ytmWindowId */
const migrateLegacyWindowId = async () => {
  const legacy = await getStored<number>(KEYS.LEGACY_WINDOW);
  if (legacy !== null) {
    const sessions = await getSessionWindows();
    if (!sessions.includes(legacy)) {
      await setSessionWindows([...sessions, legacy]);
    }
    await setActiveWindowId(legacy);
    chrome.storage.local.remove(KEYS.LEGACY_WINDOW, () => void chrome.runtime.lastError);
  }
};
migrateLegacyWindowId();

const windowExists = (windowId: number): Promise<boolean> =>
  new Promise(resolve => {
    chrome.windows.get(windowId, {}, window => {
      resolve(!chrome.runtime.lastError && !!window);
    });
  });

/** Remove do registro janelas que já não existem e devolve as vivas */
const pruneSessions = async (): Promise<number[]> => {
  const sessions = await getSessionWindows();
  const checks = await Promise.all(sessions.map(windowExists));
  const alive = sessions.filter((_, index) => checks[index]);

  if (alive.length !== sessions.length) {
    await setSessionWindows(alive);
  }

  const active = await getActiveWindowId();
  if (active !== null && !alive.includes(active)) {
    await setActiveWindowId(alive[alive.length - 1] ?? null);
  }

  return alive;
};

/**
 * URLs de janelas que nós mesmos estamos criando, para os listeners de
 * interceptação não matarem a aba antes de o windowId entrar no registro.
 * Guardadas normalizadas (o Chrome pode reescrever a URL, ex.: barra final)
 * e removidas com atraso, pois a ordem entre onCreated/onUpdated e o
 * callback do windows.create não é garantida.
 */
const pendingCreations = new Set<string>();

const normalizeUrl = (url: string): string => {
  try {
    return new URL(url).href;
  } catch {
    return url;
  }
};

const createSessionWindow = (url: string = DEFAULT_URL) => {
  const normalized = normalizeUrl(url);
  pendingCreations.add(normalized);
  setTimeout(() => pendingCreations.delete(normalized), 10_000);

  // Popup nos dois navegadores. Atenção: no Firefox a janela popup fica
  // sempre por cima das outras (motivo da antiga exceção IS_FIREFOX).
  chrome.windows.create({
    url,
    type: "popup",
    state: "maximized"
  }, async (window) => {
    if (chrome.runtime.lastError || !window?.id) {
      return;
    }
    const sessions = await getSessionWindows();
    await setSessionWindows([...sessions, window.id]);
    await setActiveWindowId(window.id);
  });
};

const getSessionTab = (windowId: number): Promise<chrome.tabs.Tab | null> =>
  new Promise(resolve => {
    chrome.tabs.query({ windowId }, tabs => {
      if (chrome.runtime.lastError || !tabs || tabs.length === 0) {
        resolve(null);
        return;
      }
      resolve(tabs.find(tab => tab.url?.includes("music.youtube.com")) ?? tabs[0]);
    });
  });

/**
 * Link externo do YTM: com sessão ativa tocando, o content script pergunta
 * ao usuário o que fazer (nova sessão / substituir / cancelar) e devolve a
 * decisão via SESSION_DECISION. Sem sessão, abre direto.
 */
const handleIncomingLink = async (url: string) => {
  const sessions = await pruneSessions();

  if (sessions.length === 0) {
    createSessionWindow(url);
    return;
  }

  const activeId = (await getActiveWindowId()) ?? sessions[sessions.length - 1];
  chrome.windows.update(activeId, { focused: true }, () => void chrome.runtime.lastError);

  const tab = await getSessionTab(activeId);
  if (!tab?.id) {
    createSessionWindow(url);
    return;
  }

  const tabId = tab.id;
  const message: SessionRuntimeMessage = { type: "SESSION_INCOMING_LINK", url };
  chrome.tabs.sendMessage(tabId, message, () => {
    if (chrome.runtime.lastError) {
      // Content script indisponível (página ainda carregando): comportamento antigo
      chrome.tabs.update(tabId, { url });
    }
  });
};

/** Remove " - YouTube Music" e afins do título da aba */
const cleanTitle = (title?: string): string => {
  const cleaned = (title ?? "").replace(/\s*[-–—•|]\s*YouTube Music\s*$/i, "").trim();
  return cleaned || "YouTube Music";
};

const listSessions = async (senderWindowId?: number): Promise<SessionSummary[]> => {
  const sessions = await pruneSessions();
  const active = await getActiveWindowId();
  const tabs = await Promise.all(sessions.map(getSessionTab));

  return sessions.map((windowId, index) => ({
    windowId,
    title: cleanTitle(tabs[index]?.title),
    isActive: windowId === active,
    isSelf: windowId === senderWindowId,
  }));
};

chrome.runtime.onMessage.addListener((message: SessionRuntimeMessage | undefined, sender, sendResponse) => {
  switch (message?.type) {
    case "SESSION_DECISION": {
      if (message.decision === "new") {
        createSessionWindow(message.url);
        // A sessão nova vai tocar sozinha: pausa a que originou o prompt
        if (sender.tab?.id) {
          const pause: SessionRuntimeMessage = { type: "SESSION_PAUSE" };
          chrome.tabs.sendMessage(sender.tab.id, pause, () => void chrome.runtime.lastError);
        }
      } else if (message.decision === "replace" && sender.tab?.id) {
        chrome.tabs.update(sender.tab.id, { url: message.url });
      }
      sendResponse({ ok: true });
      return;
    }

    case "SESSIONS_GET": {
      listSessions(sender.tab?.windowId).then(sessions => sendResponse({ sessions }));
      return true;
    }

    case "SESSION_ACTIVATE": {
      chrome.windows.update(message.windowId, { focused: true }, () => void chrome.runtime.lastError);
      sendResponse({ ok: true });
      return;
    }

    case "SESSION_CLOSE": {
      chrome.windows.remove(message.windowId, () => void chrome.runtime.lastError);
      sendResponse({ ok: true });
      return;
    }

    case "SESSION_NEW": {
      createSessionWindow();
      sendResponse({ ok: true });
      return;
    }
  }
});

chrome.action.onClicked.addListener(async () => {
  const sessions = await pruneSessions();

  if (sessions.length === 0) {
    createSessionWindow();
    return;
  }

  const activeId = (await getActiveWindowId()) ?? sessions[sessions.length - 1];
  chrome.windows.update(activeId, { focused: true }, () => void chrome.runtime.lastError);
});

chrome.tabs.onCreated.addListener(async (tab) => {
  const url = tab.pendingUrl || tab.url;
  if (!url?.includes("music.youtube.com") || pendingCreations.has(normalizeUrl(url))) {
    return;
  }

  const sessions = await pruneSessions();
  if (sessions.length === 0 || sessions.includes(tab.windowId)) {
    return;
  }

  if (tab.id) {
    chrome.tabs.remove(tab.id, () => void chrome.runtime.lastError);
  }
  handleIncomingLink(url);
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  const url = changeInfo.url;
  if (!url?.includes("music.youtube.com") || pendingCreations.has(normalizeUrl(url))) {
    return;
  }

  const sessions = await getSessionWindows();
  if (sessions.length === 0 || sessions.includes(tab.windowId)) {
    return;
  }

  chrome.tabs.remove(tabId, () => void chrome.runtime.lastError);
  handleIncomingLink(url);
});

chrome.windows.onRemoved.addListener(async (windowId) => {
  const sessions = await getSessionWindows();
  if (!sessions.includes(windowId)) {
    return;
  }

  const remaining = sessions.filter(id => id !== windowId);
  await setSessionWindows(remaining);

  const active = await getActiveWindowId();
  if (active === windowId) {
    await setActiveWindowId(remaining[remaining.length - 1] ?? null);
  }
});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    return;
  }

  const sessions = await getSessionWindows();
  if (sessions.includes(windowId)) {
    await setActiveWindowId(windowId);
  }
});
