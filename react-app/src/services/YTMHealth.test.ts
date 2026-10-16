import { describe, it, expect } from 'vitest';
import { CRITICAL_SELECTORS, SELECTORS } from '../constants';
import { findMissingSelectors } from './YTMHealth';

/** Raiz falsa que só "encontra" os seletores informados */
const rootWith = (present: string[]) => ({
    querySelector: (selector: string) => (present.includes(selector) ? ({} as Element) : null),
});

describe('findMissingSelectors', () => {
    it('não acusa nada quando a player bar está completa', () => {
        const all = CRITICAL_SELECTORS.map((name) => SELECTORS[name]);
        expect(findMissingSelectors(rootWith(all))).toEqual([]);
    });

    it('lista os seletores críticos que sumiram', () => {
        const present = CRITICAL_SELECTORS
            .filter((name) => name !== 'TIME_INFO' && name !== 'LIKE_BUTTON')
            .map((name) => SELECTORS[name]);

        expect(findMissingSelectors(rootWith(present))).toEqual(['TIME_INFO', 'LIKE_BUTTON']);
    });
});
