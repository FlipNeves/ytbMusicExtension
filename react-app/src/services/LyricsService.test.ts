import { describe, it, expect, vi, afterEach } from 'vitest';
import {
    clearCache,
    fetchLyrics,
    isInCache,
    LyricsUnavailableError,
    normalizeArtist,
    normalizeTitle,
    parseLRC,
} from './LyricsService';

describe('parseLRC', () => {
    it('converte linhas LRC em objetos ordenados por tempo', () => {
        const lrc = '[00:12.50]Primeira linha\n[00:05.00]Linha anterior\n[01:00.25]Última linha';
        const result = parseLRC(lrc);

        expect(result).toHaveLength(3);
        expect(result[0]).toEqual({ time: 5, text: 'Linha anterior' });
        expect(result[1]).toEqual({ time: 12.5, text: 'Primeira linha' });
        expect(result[2]).toEqual({ time: 60.25, text: 'Última linha' });
    });

    it('lê milissegundos com 3 dígitos (antes ficavam segundos atrasados)', () => {
        const [line] = parseLRC('[00:12.345]Linha');
        expect(line.time).toBeCloseTo(12.345);
    });

    it('lê frações de 1 dígito e tempos sem fração', () => {
        const result = parseLRC('[00:03.5]Meio\n[00:07]Inteiro');
        expect(result.map((l) => l.time)).toEqual([3.5, 7]);
    });

    it('repete a linha para cada tempo quando há vários (refrão)', () => {
        const result = parseLRC('[00:10.00][01:10.00]Refrão');
        expect(result).toEqual([
            { time: 10, text: 'Refrão' },
            { time: 70, text: 'Refrão' },
        ]);
    });

    it('aceita quebras de linha CRLF', () => {
        expect(parseLRC('[00:01.00]A\r\n[00:02.00]B').map((l) => l.text)).toEqual(['A', 'B']);
    });

    it('ignora linhas sem timestamp, sem texto e metadados', () => {
        const lrc = 'sem timestamp\n[ar:Artista]\n[00:10.00]\n[00:20.00]Com texto';
        const result = parseLRC(lrc);

        expect(result).toHaveLength(1);
        expect(result[0].text).toBe('Com texto');
    });

    it('retorna lista vazia para entrada vazia', () => {
        expect(parseLRC('')).toEqual([]);
    });
});

describe('fetchLyrics', () => {
    afterEach(() => {
        clearCache();
        vi.unstubAllGlobals();
    });

    const response = (status: number, body: unknown) =>
        Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) });

    it('não guarda falha de rede como "sem letra" e tenta de novo depois', async () => {
        const fetchMock = vi.fn(() => Promise.reject(new TypeError('Failed to fetch')));
        vi.stubGlobal('fetch', fetchMock);

        await expect(fetchLyrics('Música', 'Artista')).rejects.toBeInstanceOf(LyricsUnavailableError);
        expect(isInCache('Música', 'Artista')).toBe(false);

        fetchMock.mockImplementation(() => response(200, { syncedLyrics: '[00:01.00]Oi' }) as never);
        const result = await fetchLyrics('Música', 'Artista');
        expect(result.syncedLyrics).toEqual([{ time: 1, text: 'Oi' }]);
    });

    it('guarda "sem letra" quando o serviço responde que não existe', async () => {
        const fetchMock = vi.fn((url: string) =>
            (url.includes('/api/get') ? response(404, {}) : response(200, [])) as never);
        vi.stubGlobal('fetch', fetchMock);

        const result = await fetchLyrics('Instrumental', 'Artista');
        expect(result).toEqual({ syncedLyrics: [], plainLyrics: null });
        expect(isInCache('Instrumental', 'Artista')).toBe(true);
    });

    it('trata erro do servidor (5xx) como falha temporária', async () => {
        vi.stubGlobal('fetch', vi.fn(() => response(503, {}) as never));

        await expect(fetchLyrics('Música', 'Artista')).rejects.toBeInstanceOf(LyricsUnavailableError);
        expect(isInCache('Música', 'Artista')).toBe(false);
    });

    it('cai para a busca e prefere resultados sincronizados', async () => {
        vi.stubGlobal('fetch', vi.fn((url: string) =>
            (url.includes('/api/get')
                ? response(404, {})
                : response(200, [{ plainLyrics: 'só texto' }, { syncedLyrics: '[00:02.00]Sincronizada' }])) as never));

        const result = await fetchLyrics('Música', 'Artista');
        expect(result.syncedLyrics).toEqual([{ time: 2, text: 'Sincronizada' }]);
    });
});

describe('normalizeTitle', () => {
    it('remove sufixos comuns de vídeo', () => {
        expect(normalizeTitle('Song (Official Music Video)')).toBe('Song');
        expect(normalizeTitle('Song (Official Audio)')).toBe('Song');
        expect(normalizeTitle('Song (Lyrics)')).toBe('Song');
        expect(normalizeTitle('Song [Explicit]')).toBe('Song');
        expect(normalizeTitle('Song - Remastered 2011')).toBe('Song');
    });

    it('mantém títulos sem sufixos', () => {
        expect(normalizeTitle('Bohemian Rhapsody')).toBe('Bohemian Rhapsody');
    });
});

describe('normalizeArtist', () => {
    it('extrai o artista principal', () => {
        expect(normalizeArtist('Artista A, Artista B')).toBe('Artista A');
        expect(normalizeArtist('Artista A feat. Artista B')).toBe('Artista A');
        expect(normalizeArtist('Artista A ft. Artista B')).toBe('Artista A');
        expect(normalizeArtist('Artista A & Artista B')).toBe('Artista A');
        expect(normalizeArtist('Artista A e Artista B')).toBe('Artista A');
    });

    it('mantém artista único', () => {
        expect(normalizeArtist('Djavan')).toBe('Djavan');
    });
});
