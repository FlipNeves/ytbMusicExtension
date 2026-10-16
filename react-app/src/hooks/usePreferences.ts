/**
 * usePreferences - Preferências da extensão como estado React
 *
 * Começa com os valores pré-carregados (preloadPreferences, antes do primeiro
 * render) e acompanha mudanças feitas em outras abas e na página de opções.
 */

import { useCallback, useEffect, useState } from 'react';
import {
    getPreloadedPreferences,
    onPreferencesChange,
    savePreferences,
    type Preferences,
} from '../services/PreferencesService';

export const usePreferences = () => {
    const [preferences, setPreferences] = useState<Preferences>(getPreloadedPreferences);

    useEffect(() => onPreferencesChange(setPreferences), []);

    const update = useCallback((patch: Partial<Preferences>) => {
        setPreferences((current) => ({ ...current, ...patch }));
        void savePreferences(patch);
    }, []);

    return { preferences, update };
};
