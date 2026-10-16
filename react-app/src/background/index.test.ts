import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createChromeMock } from './chromeMock';

type Mock = ReturnType<typeof createChromeMock>;

const YTM = 'https://music.youtube.com/';
const PLAYBACK = { videoId: 'abc123', playlistId: 'RDAMVMabc123', time: 42, title: 'Fake Song' };

/** Carrega o background do zero com um chrome falso */
const loadBackground = async (initialLocal: Record<string, unknown> = {}): Promise<Mock> => {
    const mock = createChromeMock(initialLocal);
    vi.stubGlobal('chrome', mock.chrome);
    vi.resetModules();
    await import('./index');
    await vi.advanceTimersByTimeAsync(0);
    return mock;
};

const flush = () => vi.advanceTimersByTimeAsync(50);

/** Envia uma mensagem de runtime como se viesse de uma aba */
const sendRuntimeMessage = async (mock: Mock, message: unknown, sender: { tab?: { id: number; windowId: number } }) => {
    let response: unknown;
    mock.chrome.runtime.onMessage.fire(message, sender, (value: unknown) => { response = value; });
    await flush();
    return response;
};

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
});

describe('reabrir a sessão ao iniciar o navegador', () => {
    it('reabre a última música (com a fila) quando a preferência está ligada', async () => {
        const mock = await loadBackground({
            fmpPreferences: { reopenOnStartup: true },
            ytmLastPlayback: PLAYBACK,
            ytmSessionWindows: [1], // id da execução anterior: não existe mais
        });

        mock.chrome.runtime.onStartup.fire();
        await vi.advanceTimersByTimeAsync(4500);

        expect(mock.createdWindows).toEqual([
            expect.objectContaining({ type: 'popup', url: `${YTM}watch?v=abc123&list=RDAMVMabc123` }),
        ]);
        expect(mock.local.ytmSessionWindows).toEqual([mock.createdWindows[0].id]);
        expect(mock.session.ytmStartupSession).toMatchObject({ videoId: 'abc123', time: 42, restored: false });
    });

    it('não reabre com a preferência desligada', async () => {
        const mock = await loadBackground({ ytmLastPlayback: PLAYBACK });

        mock.chrome.runtime.onStartup.fire();
        await vi.advanceTimersByTimeAsync(4500);

        expect(mock.createdWindows).toEqual([]);
    });

    it('não duplica quando o navegador já trouxe uma sessão de volta', async () => {
        const mock = await loadBackground({ fmpPreferences: { reopenOnStartup: true }, ytmLastPlayback: PLAYBACK });

        mock.chrome.runtime.onStartup.fire();
        mock.addWindow('popup', `${YTM}watch?v=outra`); // restaurada durante a espera
        await vi.advanceTimersByTimeAsync(4500);

        expect(mock.createdWindows).toEqual([]);
    });

    it('entrega a posição salva uma única vez à aba reaberta', async () => {
        const mock = await loadBackground({ fmpPreferences: { reopenOnStartup: true }, ytmLastPlayback: PLAYBACK });
        mock.chrome.runtime.onStartup.fire();
        await vi.advanceTimersByTimeAsync(4500);

        const windowId = mock.createdWindows[0].id;
        const tabId = mock.windows.get(windowId)!.tabs[0].id;
        const sender = { tab: { id: tabId, windowId } };

        expect(await sendRuntimeMessage(mock, { type: 'SESSION_HELLO' }, sender))
            .toEqual({ restore: { videoId: 'abc123', time: 42 } });
        expect(await sendRuntimeMessage(mock, { type: 'SESSION_HELLO' }, sender)).toEqual({});
    });

    it('descarta a cópia da mesma sessão trazida pelo Ctrl+Shift+T', async () => {
        const mock = await loadBackground({ fmpPreferences: { reopenOnStartup: true }, ytmLastPlayback: PLAYBACK });
        mock.chrome.runtime.onStartup.fire();
        await vi.advanceTimersByTimeAsync(4500);
        const reopenedId = mock.createdWindows[0].id;

        const { windowId: restoredId } = mock.addWindow('popup', `${YTM}watch?v=abc123&list=RDAMVMabc123`);
        await flush();

        expect(mock.removedWindows).toContain(restoredId);
        expect(mock.local.ytmSessionWindows).toEqual([reopenedId]);
    });
});

describe('janelas restauradas e links', () => {
    it('adota a popup do YTM restaurada pelo Ctrl+Shift+T como sessão', async () => {
        const mock = await loadBackground({ ytmSessionWindows: [1], ytmActiveWindowId: 1 });

        const { windowId } = mock.addWindow('popup', YTM);
        await flush();

        expect(mock.local.ytmSessionWindows).toEqual([windowId]);
        expect(mock.local.ytmActiveWindowId).toBe(windowId);
        expect(mock.removedWindows).toEqual([]);
    });

    it('mantém a sessão atual e adota a restaurada (antes ela era fechada)', async () => {
        const mock = await loadBackground();
        const { windowId: liveId } = mock.addWindow('popup', `${YTM}watch?v=atual`);
        await flush();

        const { windowId: restoredId } = mock.addWindow('popup', `${YTM}watch?v=antiga`);
        await flush();

        expect(mock.local.ytmSessionWindows).toEqual([liveId, restoredId]);
        expect(mock.local.ytmActiveWindowId).toBe(liveId);
        expect(mock.windows.get(liveId)!.tabs[0].url).toBe(`${YTM}watch?v=atual`);
    });

    it('leva um link aberto numa aba comum para a sessão ativa', async () => {
        const mock = await loadBackground();
        const { windowId: sessionId, tabId: sessionTab } = mock.addWindow('popup', YTM);
        await flush();

        const { tabId: linkTab } = mock.addWindow('normal', `${YTM}watch?v=link`);
        await flush();

        expect(mock.sentMessages).toContainEqual({
            tabId: sessionTab,
            message: { type: 'SESSION_INCOMING_LINK', url: `${YTM}watch?v=link` },
        });
        expect([...mock.windows.values()].flatMap((w) => w.tabs).some((t) => t.id === linkTab)).toBe(false);
        expect(mock.local.ytmSessionWindows).toEqual([sessionId]);
    });

    it('processa o link uma vez só quando onCreated e onUpdated chegam juntos', async () => {
        const mock = await loadBackground();
        const { tabId: sessionTab } = mock.addWindow('popup', YTM);
        await flush();

        const url = `${YTM}watch?v=link`;
        const { windowId, tabId } = mock.addWindow('normal', url);
        mock.chrome.tabs.onUpdated.fire(tabId, { url }, { id: tabId, windowId, url });
        await flush();

        const prompts = mock.sentMessages.filter((m) => m.tabId === sessionTab && m.message.type === 'SESSION_INCOMING_LINK');
        expect(prompts).toHaveLength(1);
    });
});

describe('atalho e avisos', () => {
    it('o atalho abre/fecha o modo foco na aba do YTM da janela em foco', async () => {
        const mock = await loadBackground();
        const { windowId, tabId } = mock.addWindow('popup', YTM);
        await flush();
        mock.chrome.windows.update(windowId, { focused: true });

        mock.chrome.commands.onCommand.fire('toggle-focus-mode');
        await flush();

        expect(mock.sentMessages).toContainEqual({ tabId, message: { type: 'FOCUS_TOGGLE' } });
    });

    it('avisa as abas do YTM quando o registro de sessões muda', async () => {
        const mock = await loadBackground();
        const { tabId } = mock.addWindow('popup', YTM);
        await vi.advanceTimersByTimeAsync(300);

        expect(mock.sentMessages).toContainEqual({ tabId, message: { type: 'SESSIONS_CHANGED' } });
    });

    it('guarda o que a sessão ativa está tocando', async () => {
        const mock = await loadBackground();
        const { windowId, tabId } = mock.addWindow('popup', YTM);
        await flush();

        await sendRuntimeMessage(mock, { type: 'SESSION_PLAYBACK', playback: PLAYBACK }, { tab: { id: tabId, windowId } });

        expect(mock.local.ytmLastPlayback).toMatchObject(PLAYBACK);
    });
});
