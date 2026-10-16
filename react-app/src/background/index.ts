import type {
  SessionPlayback,
  SessionRestore,
  SessionRuntimeMessage,
  SessionSummary,
} from "../types/sessions";
import { buildTrackUrl, getVideoIdFromUrl } from "../services/TrackUrl";
import { loadPreferences } from "../services/PreferencesService";

const DEFAULT_URL = "https://music.youtube.com";
const YTM_TABS = "https://music.youtube.com/*";

/** Chaves no chrome.storage.local */
const KEYS = {
  SESSIONS: "ytmSessionWindows",
  ACTIVE: "ytmActiveWindowId",
  /** O que a sessão ativa tocava por último (para reabrir no início) */
  PLAYBACK: "ytmLastPlayback",
  /** Versões antigas guardavam uma única janela */
  LEGACY_WINDOW: "ytmWindowId",
} as const;

/**
 * Sessão reaberta no início do navegador. Fica no storage.session (some
 * quando o navegador fecha), para sobreviver às pausas do service worker.
 */
const STARTUP_SESSION_KEY = "ytmStartupSession";

interface StartupSession {
  windowId: number;
  videoId: string;
  time: number;
  /** A posição já foi entregue ao content script (não repete num reload) */
  restored: boolean;
  /** Uma cópia restaurada pelo Ctrl+Shift+T já foi descartada */
  deduped: boolean;
}

/** Espera a restauração do próprio navegador antes de reabrir a sessão */
const STARTUP_GRACE_MS = 4000;

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

const getStartupSession = (): Promise<StartupSession | null> =>
  new Promise(resolve => {
    chrome.storage.session.get([STARTUP_SESSION_KEY], (result: Record<string, StartupSession>) => {
      resolve(chrome.runtime.lastError ? null : result[STARTUP_SESSION_KEY] ?? null);
    });
  });

const setStartupSession = (value: StartupSession): Promise<void> =>
  new Promise(resolve => {
    chrome.storage.session.set({ [STARTUP_SESSION_KEY]: value }, () => {
      void chrome.runtime.lastError;
      resolve();
    });
  });

/**
 * Avisa as abas do YTM que o registro mudou (menu de sessões), agrupando
 * mudanças seguidas num único aviso.
 */
let sessionsChangedTimer: ReturnType<typeof setTimeout> | null = null;
const notifySessionsChanged = () => {
  if (sessionsChangedTimer) return;
  sessionsChangedTimer = setTimeout(() => {
    sessionsChangedTimer = null;
    chrome.tabs.query({ url: YTM_TABS }, tabs => {
      if (chrome.runtime.lastError) return;
      const message: SessionRuntimeMessage = { type: "SESSIONS_CHANGED" };
      tabs.forEach(tab => {
        if (tab.id !== undefined) {
          chrome.tabs.sendMessage(tab.id, message, () => void chrome.runtime.lastError);
        }
      });
    });
  }, 150);
};

const getSessionWindows = async (): Promise<number[]> =>
  (await getStored<number[]>(KEYS.SESSIONS)) ?? [];

const setSessionWindows = async (ids: number[]): Promise<void> => {
  await setStored(KEYS.SESSIONS, ids.length > 0 ? ids : null);
  notifySessionsChanged();
};

const getActiveWindowId = (): Promise<number | null> =>
  getStored<number>(KEYS.ACTIVE);

const setActiveWindowId = async (id: number | null): Promise<void> => {
  await setStored(KEYS.ACTIVE, id);
  notifySessionsChanged();
};

/**
 * Serializa as leituras+escritas do registro: listeners disparam em paralelo
 * (ex.: várias janelas restauradas de uma vez) e um sobrescrevia o outro.
 * As tarefas enfileiradas não podem chamar umas às outras.
 */
let registryQueue: Promise<unknown> = Promise.resolve();
const withRegistry = <T>(task: () => Promise<T>): Promise<T> => {
  const run = registryQueue.then(task, task);
  registryQueue = run.catch(() => undefined);
  return run;
};

/** Versões antigas guardavam uma única janela em ytmWindowId */
const migrateLegacyWindowId = () => withRegistry(async () => {
  const legacy = await getStored<number>(KEYS.LEGACY_WINDOW);
  if (legacy !== null) {
    const sessions = await getSessionWindows();
    if (!sessions.includes(legacy)) {
      await setSessionWindows([...sessions, legacy]);
    }
    await setActiveWindowId(legacy);
    chrome.storage.local.remove(KEYS.LEGACY_WINDOW, () => void chrome.runtime.lastError);
  }
});
migrateLegacyWindowId();

const getWindow = (windowId: number): Promise<chrome.windows.Window | null> =>
  new Promise(resolve => {
    chrome.windows.get(windowId, {}, window => {
      resolve(chrome.runtime.lastError || !window ? null : window);
    });
  });

const windowExists = async (windowId: number): Promise<boolean> =>
  (await getWindow(windowId)) !== null;

const focusWindow = (windowId: number) =>
  chrome.windows.update(windowId, { focused: true }, () => void chrome.runtime.lastError);

/** Remove do registro janelas que já não existem e devolve as vivas */
const pruneSessions = (): Promise<number[]> => withRegistry(async () => {
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
});

/**
 * Registra a janela como sessão (sem duplicar). `activate` a marca como
 * ativa; sem ele, ela só vira ativa se não houver outra.
 */
const addSession = (windowId: number, activate: boolean) => withRegistry(async () => {
  const sessions = await getSessionWindows();
  if (!sessions.includes(windowId)) {
    await setSessionWindows([...sessions, windowId]);
  }

  const active = await getActiveWindowId();
  if (activate || active === null || !sessions.includes(active)) {
    await setActiveWindowId(windowId);
  }
});

/**
 * Popup com o YTM fora do registro é uma sessão reaberta pelo navegador
 * (Ctrl+Shift+T traz a popup de volta como popup, mas com outro windowId):
 * entra no registro em vez de ser tratada como link externo e fechada.
 * Se for a mesma música que a extensão já reabriu no início do navegador,
 * a cópia restaurada é descartada (uma vez só, para não brigar com o usuário).
 */
const adoptRestoredSession = async (windowId: number, url: string): Promise<boolean> => {
  const window = await getWindow(windowId);
  if (window?.type !== "popup") {
    return false;
  }

  const startup = await getStartupSession();
  if (
    startup && !startup.deduped &&
    startup.windowId !== windowId &&
    getVideoIdFromUrl(url) === startup.videoId &&
    await windowExists(startup.windowId)
  ) {
    await setStartupSession({ ...startup, deduped: true });
    chrome.windows.remove(windowId, () => void chrome.runtime.lastError);
    focusWindow(startup.windowId);
    return true;
  }

  // Ids da execução anterior do navegador ainda podem estar no registro
  await pruneSessions();
  await addSession(windowId, false);
  return true;
};

/**
 * Abre uma sessão (janela popup) e devolve o windowId, ou null se falhar.
 * Os eventos da aba nova podem chegar antes deste callback: como a janela é
 * popup, handleYtmTab a adota em vez de tratá-la como link externo.
 */
const createSessionWindow = (url: string = DEFAULT_URL): Promise<number | null> => {
  // Popup nos dois navegadores. Atenção: no Firefox a janela popup fica
  // sempre por cima das outras (motivo da antiga exceção IS_FIREFOX).
  return new Promise(resolve => {
    chrome.windows.create({
      url,
      type: "popup",
      state: "maximized"
    }, (window) => {
      if (chrome.runtime.lastError || !window?.id) {
        resolve(null);
        return;
      }
      const windowId = window.id;
      void addSession(windowId, true).then(() => resolve(windowId));
    });
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
 * ao usuário o que fazer (tocar a seguir / nova sessão / substituir /
 * cancelar) e devolve a decisão via SESSION_DECISION. Sem sessão, abre direto.
 */
const handleIncomingLink = async (url: string) => {
  const sessions = await pruneSessions();

  if (sessions.length === 0) {
    void createSessionWindow(url);
    return;
  }

  const activeId = (await getActiveWindowId()) ?? sessions[sessions.length - 1];
  focusWindow(activeId);

  const tab = await getSessionTab(activeId);
  if (!tab?.id) {
    void createSessionWindow(url);
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

/** Guarda o que a sessão ativa está tocando, para reabrir no início do navegador */
const rememberPlayback = async (windowId: number | undefined, playback: SessionPlayback) => {
  if (windowId === undefined || !playback?.videoId) return;

  const sessions = await getSessionWindows();
  if (!sessions.includes(windowId)) return;

  const active = await getActiveWindowId();
  if (active !== null && active !== windowId && sessions.includes(active)) return;

  await setStored(KEYS.PLAYBACK, { ...playback, savedAt: Date.now() });
};

/** Posição a retomar se a aba for da sessão reaberta no início (uma vez só) */
const takeStartupRestore = async (windowId: number | undefined): Promise<SessionRestore | null> => {
  const startup = await getStartupSession();
  if (!startup || startup.restored || startup.windowId !== windowId) return null;

  await setStartupSession({ ...startup, restored: true });
  return { videoId: startup.videoId, time: startup.time };
};

chrome.runtime.onMessage.addListener((message: SessionRuntimeMessage | undefined, sender, sendResponse) => {
  switch (message?.type) {
    case "SESSION_DECISION": {
      if (message.decision === "new") {
        void createSessionWindow(message.url);
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
      focusWindow(message.windowId);
      sendResponse({ ok: true });
      return;
    }

    case "SESSION_CLOSE": {
      chrome.windows.remove(message.windowId, () => void chrome.runtime.lastError);
      sendResponse({ ok: true });
      return;
    }

    case "SESSION_NEW": {
      void createSessionWindow();
      sendResponse({ ok: true });
      return;
    }

    case "SESSION_PLAYBACK": {
      void rememberPlayback(sender.tab?.windowId, message.playback);
      return;
    }

    case "SESSION_HELLO": {
      takeStartupRestore(sender.tab?.windowId).then(restore => sendResponse(restore ? { restore } : {}));
      return true;
    }
  }
});

chrome.action.onClicked.addListener(async () => {
  const sessions = await pruneSessions();

  if (sessions.length === 0) {
    void createSessionWindow();
    return;
  }

  const activeId = (await getActiveWindowId()) ?? sessions[sessions.length - 1];
  focusWindow(activeId);
});

/** Aba do YTM numa janela: a ativa, se for do YTM; senão a primeira do YTM */
const getYtmTab = (windowId: number): Promise<chrome.tabs.Tab | null> =>
  new Promise(resolve => {
    chrome.tabs.query({ windowId, url: YTM_TABS }, tabs => {
      if (chrome.runtime.lastError || !tabs?.length) {
        resolve(null);
        return;
      }
      resolve(tabs.find(tab => tab.active) ?? tabs[0]);
    });
  });

const getLastFocusedWindowId = (): Promise<number | null> =>
  new Promise(resolve => {
    chrome.windows.getLastFocused({}, window => {
      resolve(chrome.runtime.lastError || !window?.id ? null : window.id);
    });
  });

/**
 * Atalho de teclado: abre/fecha o modo foco no YTM da janela em foco; sem
 * ele, na sessão ativa (trazida para frente); sem sessão, abre uma.
 */
const toggleFocusMode = async () => {
  const focusedId = await getLastFocusedWindowId();
  let tab = focusedId !== null ? await getYtmTab(focusedId) : null;

  if (!tab) {
    const sessions = await pruneSessions();
    if (sessions.length > 0) {
      const activeId = (await getActiveWindowId()) ?? sessions[sessions.length - 1];
      tab = await getYtmTab(activeId);
      focusWindow(activeId);
    }
  }

  if (tab?.id === undefined) {
    void createSessionWindow();
    return;
  }

  const message: SessionRuntimeMessage = { type: "FOCUS_TOGGLE" };
  chrome.tabs.sendMessage(tab.id, message, () => void chrome.runtime.lastError);
};

chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle-focus-mode") {
    void toggleFocusMode();
  }
});

/**
 * Reabre a última sessão quando o navegador inicia (preferência). O próprio
 * navegador não traz a popup de volta sozinho — só pelo Ctrl+Shift+T.
 * A faixa volta pausada na posição salva (o content script pede no SESSION_HELLO).
 */
const reopenLastSession = async () => {
  const preferences = await loadPreferences();
  if (!preferences.reopenOnStartup) return;

  const playback = await getStored<SessionPlayback>(KEYS.PLAYBACK);
  if (!playback?.videoId) return;

  await new Promise(resolve => setTimeout(resolve, STARTUP_GRACE_MS));
  if ((await pruneSessions()).length > 0) return;

  const windowId = await createSessionWindow(buildTrackUrl(playback.videoId, playback.playlistId));
  if (windowId !== null) {
    await setStartupSession({
      windowId,
      videoId: playback.videoId,
      time: playback.time,
      restored: false,
      deduped: false,
    });
  }
};

chrome.runtime.onStartup.addListener(() => {
  void reopenLastSession();
});

/**
 * Abas em tratamento: onCreated e onUpdated disparam para a mesma aba, e o
 * link era processado duas vezes (dois prompts / duas janelas).
 */
const handlingTabs = new Set<number>();

/** Aba do YTM fora de uma sessão: adota (se for sessão restaurada) ou redireciona */
const handleYtmTab = async (tabId: number, windowId: number, url: string) => {
  if (handlingTabs.has(tabId)) {
    return;
  }
  handlingTabs.add(tabId);

  try {
    if ((await getSessionWindows()).includes(windowId) || await adoptRestoredSession(windowId, url)) {
      return;
    }

    const sessions = await pruneSessions();
    if (sessions.length === 0) {
      return;
    }

    chrome.tabs.remove(tabId, () => void chrome.runtime.lastError);
    await handleIncomingLink(url);
  } finally {
    handlingTabs.delete(tabId);
  }
};

const isYtmUrl = (url?: string): url is string => !!url?.includes("music.youtube.com");

chrome.tabs.onCreated.addListener((tab) => {
  const url = tab.pendingUrl || tab.url;
  if (tab.id !== undefined && isYtmUrl(url)) {
    void handleYtmTab(tab.id, tab.windowId, url);
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (isYtmUrl(changeInfo.url)) {
    void handleYtmTab(tabId, tab.windowId, changeInfo.url);
  }
});

chrome.windows.onRemoved.addListener((windowId) => withRegistry(async () => {
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
}));

chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    return;
  }

  void withRegistry(async () => {
    const sessions = await getSessionWindows();
    const active = await getActiveWindowId();
    if (sessions.includes(windowId) && active !== windowId) {
      await setActiveWindowId(windowId);
    }
  });
});
