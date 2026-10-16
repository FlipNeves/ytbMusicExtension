/**
 * chrome.* falso, mínimo, para testar o background sem navegador.
 * Callbacks síncronos; eventos guardam os listeners e permitem dispará-los.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

type Listener = (...args: any[]) => any;

const createEvent = () => {
    const listeners: Listener[] = [];
    return {
        addListener: (listener: Listener) => { listeners.push(listener); },
        removeListener: (listener: Listener) => {
            const index = listeners.indexOf(listener);
            if (index !== -1) listeners.splice(index, 1);
        },
        fire: (...args: any[]) => listeners.map((listener) => listener(...args)),
    };
};

export interface MockTab {
    id: number;
    windowId: number;
    url: string;
    active: boolean;
    title?: string;
}

export interface MockWindow {
    id: number;
    type: 'normal' | 'popup';
    tabs: MockTab[];
}

export const createChromeMock = (initialLocal: Record<string, unknown> = {}) => {
    let nextId = 100;
    let focusedWindowId: number | null = null;
    const local: Record<string, unknown> = structuredClone(initialLocal);
    const session: Record<string, unknown> = {};
    const windows = new Map<number, MockWindow>();
    const sentMessages: { tabId: number; message: any }[] = [];
    const removedWindows: number[] = [];
    const createdWindows: { id: number; url: string; type: string }[] = [];

    const runtime = {
        id: 'test-extension',
        lastError: undefined as { message: string } | undefined,
        onMessage: createEvent(),
        onStartup: createEvent(),
    };

    /** Chama o callback com runtime.lastError preenchido, como o Chrome faz */
    const fail = (callback: Listener | undefined, message: string) => {
        runtime.lastError = { message };
        callback?.(undefined);
        runtime.lastError = undefined;
    };

    const area = (store: Record<string, unknown>) => ({
        get: (keys: string | string[], callback: Listener) => {
            const result: Record<string, unknown> = {};
            for (const key of [keys].flat()) {
                if (key in store) result[key] = structuredClone(store[key]);
            }
            callback(result);
        },
        set: (items: Record<string, unknown>, callback?: Listener) => {
            Object.assign(store, structuredClone(items));
            callback?.();
        },
        remove: (key: string, callback?: Listener) => {
            delete store[key];
            callback?.();
        },
    });

    const allTabs = () => [...windows.values()].flatMap((window) => window.tabs);
    const matches = (url: string, pattern?: string) =>
        !pattern || url.startsWith(pattern.replace(/\*$/, ''));

    const tabsOnCreated = createEvent();
    const windowsOnRemoved = createEvent();

    const addWindow = (type: MockWindow['type'], url: string, fireCreated = true) => {
        const windowId = nextId++;
        const tab: MockTab = { id: nextId++, windowId, url, active: true };
        windows.set(windowId, { id: windowId, type, tabs: [tab] });
        if (fireCreated) tabsOnCreated.fire({ ...tab, pendingUrl: url });
        return { windowId, tabId: tab.id };
    };

    const chrome = {
        runtime,
        storage: { local: area(local), session: area(session), onChanged: createEvent() },
        windows: {
            WINDOW_ID_NONE: -1,
            create: (options: { url: string; type?: MockWindow['type'] }, callback?: Listener) => {
                const { windowId } = addWindow(options.type ?? 'normal', options.url);
                createdWindows.push({ id: windowId, url: options.url, type: options.type ?? 'normal' });
                callback?.({ id: windowId, type: options.type ?? 'normal' });
            },
            get: (windowId: number, _options: unknown, callback: Listener) => {
                const window = windows.get(windowId);
                if (!window) {
                    fail(callback, `No window with id: ${windowId}`);
                    return;
                }
                callback({ id: window.id, type: window.type });
            },
            update: (windowId: number, info: { focused?: boolean }, callback?: Listener) => {
                if (!windows.has(windowId)) {
                    fail(callback, `No window with id: ${windowId}`);
                    return;
                }
                if (info.focused) focusedWindowId = windowId;
                callback?.({ id: windowId });
            },
            remove: (windowId: number, callback?: Listener) => {
                windows.delete(windowId);
                removedWindows.push(windowId);
                callback?.();
                windowsOnRemoved.fire(windowId);
            },
            getLastFocused: (_options: unknown, callback: Listener) => {
                const window = focusedWindowId !== null ? windows.get(focusedWindowId) : undefined;
                callback(window ? { id: window.id, type: window.type } : undefined);
            },
            onRemoved: windowsOnRemoved,
            onFocusChanged: createEvent(),
        },
        tabs: {
            query: (query: { windowId?: number; url?: string }, callback: Listener) => {
                callback(allTabs().filter((tab) =>
                    (query.windowId === undefined || tab.windowId === query.windowId) &&
                    matches(tab.url, query.url)
                ));
            },
            sendMessage: (tabId: number, message: unknown, callback?: Listener) => {
                sentMessages.push({ tabId, message });
                callback?.({ ok: true });
            },
            update: (tabId: number, properties: { url: string }) => {
                const tab = allTabs().find((t) => t.id === tabId);
                if (tab) tab.url = properties.url;
            },
            remove: (tabId: number, callback?: Listener) => {
                for (const window of windows.values()) {
                    window.tabs = window.tabs.filter((tab) => tab.id !== tabId);
                    if (window.tabs.length === 0) {
                        windows.delete(window.id);
                        windowsOnRemoved.fire(window.id);
                    }
                }
                callback?.();
            },
            onCreated: tabsOnCreated,
            onUpdated: createEvent(),
        },
        action: { onClicked: createEvent() },
        commands: { onCommand: createEvent() },
    };

    return { chrome, local, session, windows, sentMessages, removedWindows, createdWindows, addWindow };
};
