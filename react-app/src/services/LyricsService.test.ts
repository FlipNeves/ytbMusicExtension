import { describe, it, expect } from 'vitest';
import { parseLRC, normalizeTitle, normalizeArtist } from './LyricsService';

describe('parseLRC', () => {
    it('converte linhas LRC em objetos ordenados por tempo', () => {
        const lrc = '[00:12.50]Primeira linha\n[00:05.00]Linha anterior\n[01:00.25]Última linha';
        const result = parseLRC(lrc);

        expect(result).toHaveLength(3);
        expect(result[0]).toEqual({ time: 5, text: 'Linha anterior' });
        expect(result[1]).toEqual({ time: 12.5, text: 'Primeira linha' });
        expect(result[2]).toEqual({ time: 60.25, text: 'Última linha' });
    });

    it('ignora linhas sem timestamp ou sem texto', () => {
        const lrc = 'sem timestamp\n[00:10.00]\n[00:20.00]Com texto';
        const result = parseLRC(lrc);

        expect(result).toHaveLength(1);
        expect(result[0].text).toBe('Com texto');
    });

    it('retorna lista vazia para entrada vazia', () => {
        expect(parseLRC('')).toEqual([]);
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
