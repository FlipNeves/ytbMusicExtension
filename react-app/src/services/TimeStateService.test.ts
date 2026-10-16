import { describe, it, expect, vi, afterEach } from 'vitest';
import { computeTimeState, timeStateService } from './TimeStateService';

describe('computeTimeState', () => {
    it('usa posição e duração do slider da player bar', () => {
        const state = computeTimeState({ timeText: '0:43 / 2:46', ariaNow: '43', ariaMax: '166' });

        expect(state.duration).toBe(166);
        expect(state.currentTimeSec).toBe(43);
        expect(state.progress).toBeCloseTo(25.9, 1);
        expect(state.currentTime).toBe('0:43');
        expect(state.totalTime).toBe('2:46');
    });

    it('recorre ao texto "atual / total" quando o slider não tem valores', () => {
        const state = computeTimeState({ timeText: '1:00 / 4:00', ariaNow: null, ariaMax: null });

        expect(state.duration).toBe(240);
        expect(state.currentTimeSec).toBe(60);
        expect(state.progress).toBe(25);
    });

    it('não divide por zero no meio da troca de faixa', () => {
        const state = computeTimeState({ timeText: '0:00 / 0:00', ariaNow: '0', ariaMax: '0' });

        expect(state.duration).toBe(0);
        expect(state.progress).toBe(0);
    });

    it('limita o progresso a 100% quando a posição ainda é da faixa anterior', () => {
        const state = computeTimeState({ timeText: '2:46 / 2:46', ariaNow: '2672', ariaMax: '166' });

        expect(state.progress).toBe(100);
    });

    it('refina a posição com o tempo fracionado do player (letras sincronizadas)', () => {
        const state = computeTimeState({ timeText: '0:43 / 2:46', ariaNow: '43', ariaMax: '166', preciseTime: 43.62 });

        expect(state.currentTimeSec).toBe(43.62);
        expect(state.progress).toBeCloseTo((43.62 / 166) * 100);
    });

    it('descarta o tempo do player quando ele não bate com o slider (outra faixa)', () => {
        const state = computeTimeState({ timeText: '0:43 / 2:46', ariaNow: '43', ariaMax: '166', preciseTime: 2671.9 });

        expect(state.currentTimeSec).toBe(43);
    });
});

describe('timeStateService.setTransitioning', () => {
    afterEach(() => {
        timeStateService.setTransitioning(false);
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('encerra a transição sozinho quando nenhuma troca de faixa a libera', () => {
        vi.useFakeTimers();
        vi.stubGlobal('document', { querySelector: () => null });

        timeStateService.setTransitioning(true);
        expect(timeStateService.isInTransition()).toBe(true);

        vi.advanceTimersByTime(1500);
        expect(timeStateService.isInTransition()).toBe(false);
    });

    it('a liberação explícita cancela o teto da transição', () => {
        vi.useFakeTimers();

        timeStateService.setTransitioning(true);
        timeStateService.setTransitioning(false);

        expect(vi.getTimerCount()).toBe(0);
    });
});
