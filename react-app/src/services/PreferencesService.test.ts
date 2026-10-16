import { describe, it, expect } from 'vitest';
import { DEFAULT_PREFERENCES, loadPreferences, mergePreferences } from './PreferencesService';

describe('mergePreferences', () => {
    it('completa o que falta com os padrões', () => {
        expect(mergePreferences({ autoOpenFocus: true })).toEqual({ ...DEFAULT_PREFERENCES, autoOpenFocus: true });
    });

    it('descarta valores inválidos e chaves desconhecidas', () => {
        const merged = mergePreferences({ collapseSidebar: 'sim', reopenOnStartup: 1, extra: true });
        expect(merged).toEqual(DEFAULT_PREFERENCES);
        expect(merged).not.toHaveProperty('extra');
    });

    it('usa os padrões quando não há nada salvo', () => {
        expect(mergePreferences(undefined)).toEqual(DEFAULT_PREFERENCES);
        expect(mergePreferences(null)).toEqual(DEFAULT_PREFERENCES);
    });
});

describe('loadPreferences', () => {
    it('cai nos padrões fora da extensão (sem chrome.storage)', async () => {
        await expect(loadPreferences()).resolves.toEqual(DEFAULT_PREFERENCES);
    });
});
