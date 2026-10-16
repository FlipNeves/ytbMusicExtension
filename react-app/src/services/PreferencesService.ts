/**
 * PreferencesService - Preferências da extensão (chrome.storage.local)
 *
 * Lidas pelo content script, pelo background e pela página de opções.
 * Qualquer falha do storage (contexto invalidado, fora da extensão) cai nos
 * valores padrão em vez de quebrar a interface.
 */

export interface Preferences {
    /** Abre o modo foco sozinho quando a música começa */
    autoOpenFocus: boolean;
    /** Mantém o menu lateral do YTM recolhido (playlists ficam no atalho da extensão) */
    collapseSidebar: boolean;
    /** Usa a cor da capa em detalhes do YTM (barra de progresso, título da faixa) */
    tintYouTubeMusic: boolean;
    /** Reabre a última sessão, pausada, quando o navegador inicia */
    reopenOnStartup: boolean;
    /** Lembrados entre aberturas do modo foco */
    showLyrics: boolean;
    showVideo: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = {
    autoOpenFocus: false,
    collapseSidebar: true,
    tintYouTubeMusic: true,
    reopenOnStartup: false,
    showLyrics: false,
    showVideo: false,
};

export const PREFERENCES_KEY = 'fmpPreferences';

/** Completa o que veio do storage com os padrões, descartando valores inválidos */
export const mergePreferences = (stored: unknown): Preferences => {
    const result = { ...DEFAULT_PREFERENCES };
    if (stored && typeof stored === 'object') {
        for (const key of Object.keys(DEFAULT_PREFERENCES) as (keyof Preferences)[]) {
            const value = (stored as Record<string, unknown>)[key];
            if (typeof value === 'boolean') {
                result[key] = value;
            }
        }
    }
    return result;
};

const getArea = (): chrome.storage.LocalStorageArea | null => {
    try {
        return typeof chrome !== 'undefined' && chrome.storage?.local ? chrome.storage.local : null;
    } catch {
        return null;
    }
};

export const loadPreferences = (): Promise<Preferences> =>
    new Promise(resolve => {
        const area = getArea();
        if (!area) {
            resolve({ ...DEFAULT_PREFERENCES });
            return;
        }
        try {
            area.get([PREFERENCES_KEY], (result) => {
                resolve(chrome.runtime.lastError
                    ? { ...DEFAULT_PREFERENCES }
                    : mergePreferences(result?.[PREFERENCES_KEY]));
            });
        } catch {
            // Contexto da extensão invalidado (extensão recarregada/atualizada)
            resolve({ ...DEFAULT_PREFERENCES });
        }
    });

let preloaded: Preferences = { ...DEFAULT_PREFERENCES };

/** Carrega antes do primeiro render, para os estados iniciais já virem certos */
export const preloadPreferences = async (): Promise<Preferences> => {
    preloaded = await loadPreferences();
    return preloaded;
};

/** Valores carregados por preloadPreferences (padrões, se ainda não carregou) */
export const getPreloadedPreferences = (): Preferences => preloaded;

export const savePreferences = async (patch: Partial<Preferences>): Promise<void> => {
    const area = getArea();
    if (!area) return;

    const current = await loadPreferences();
    await new Promise<void>(resolve => {
        try {
            area.set({ [PREFERENCES_KEY]: { ...current, ...patch } }, () => {
                void chrome.runtime.lastError;
                resolve();
            });
        } catch {
            resolve();
        }
    });
};

/** Avisa quando as preferências mudam (em qualquer aba ou na página de opções) */
export const onPreferencesChange = (listener: (preferences: Preferences) => void): (() => void) => {
    const handler = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
        if (areaName === 'local' && changes[PREFERENCES_KEY]) {
            listener(mergePreferences(changes[PREFERENCES_KEY].newValue));
        }
    };

    try {
        chrome.storage.onChanged.addListener(handler);
    } catch {
        return () => undefined;
    }

    return () => {
        try {
            chrome.storage.onChanged.removeListener(handler);
        } catch {
            // Contexto invalidado: o listener já morreu junto
        }
    };
};
