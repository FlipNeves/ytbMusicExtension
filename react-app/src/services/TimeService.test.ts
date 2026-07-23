import { describe, it, expect } from 'vitest';
import { timeToSeconds, formatTime } from './TimeService';

describe('timeToSeconds', () => {
    it('converte M:SS', () => {
        expect(timeToSeconds('1:23')).toBe(83);
        expect(timeToSeconds('0:00')).toBe(0);
    });

    it('converte MM:SS', () => {
        expect(timeToSeconds('12:05')).toBe(725);
    });

    it('converte H:MM:SS', () => {
        expect(timeToSeconds('1:02:03')).toBe(3723);
    });

    it('retorna 0 para entradas inválidas', () => {
        expect(timeToSeconds('')).toBe(0);
        expect(timeToSeconds('abc')).toBe(0);
        expect(timeToSeconds('1:aa')).toBe(0);
        expect(timeToSeconds('1')).toBe(0);
    });
});

describe('formatTime', () => {
    it('formata segundos como M:SS', () => {
        expect(formatTime(83)).toBe('1:23');
        expect(formatTime(0)).toBe('0:00');
        expect(formatTime(59)).toBe('0:59');
    });

    it('formata durações longas como H:MM:SS', () => {
        expect(formatTime(3723)).toBe('1:02:03');
    });

    it('trata valores inválidos', () => {
        expect(formatTime(NaN)).toBe('0:00');
        expect(formatTime(-10)).toBe('0:00');
    });

    it('é inverso de timeToSeconds para valores inteiros', () => {
        for (const s of [0, 59, 60, 61, 725, 3600, 3723]) {
            expect(timeToSeconds(formatTime(s))).toBe(s);
        }
    });
});
