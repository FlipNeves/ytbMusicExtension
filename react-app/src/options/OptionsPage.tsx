import { useEffect, useState } from 'react';
import {
    DEFAULT_PREFERENCES,
    loadPreferences,
    onPreferencesChange,
    savePreferences,
    type Preferences,
} from '../services/PreferencesService';

const FOCUS_COMMAND = 'toggle-focus-mode';
const isFirefox = navigator.userAgent.includes('Firefox');

interface ToggleProps {
    label: string;
    description: string;
    checked: boolean;
    onChange: (value: boolean) => void;
}

const Toggle = ({ label, description, checked, onChange }: ToggleProps) => (
    <div className="option-row">
        <div className="option-text">
            <span className="option-label">{label}</span>
            <span className="option-description">{description}</span>
        </div>
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            className={`switch ${checked ? 'on' : ''}`}
            onClick={() => onChange(!checked)}
        >
            <span className="switch-thumb" />
        </button>
    </div>
);

/** Atalho configurado hoje (o usuário pode trocar na página do navegador) */
const useFocusShortcut = () => {
    const [shortcut, setShortcut] = useState<string | null>(null);

    useEffect(() => {
        chrome.commands?.getAll((commands) => {
            const command = commands.find((c) => c.name === FOCUS_COMMAND);
            setShortcut(command?.shortcut || '');
        });
    }, []);

    return shortcut;
};

const OptionsPage = () => {
    const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
    const [loaded, setLoaded] = useState(false);
    const shortcut = useFocusShortcut();

    useEffect(() => {
        loadPreferences().then((stored) => {
            setPreferences(stored);
            setLoaded(true);
        });
        return onPreferencesChange(setPreferences);
    }, []);

    const update = (patch: Partial<Preferences>) => {
        setPreferences((current) => ({ ...current, ...patch }));
        void savePreferences(patch);
    };

    const openShortcutSettings = () => {
        chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
    };

    return (
        <main className={`options ${loaded ? 'loaded' : ''}`}>
            <header className="options-header">
                <img className="options-logo" src="icon48.png" srcSet="icon48.png 1x, icon96.png 2x" alt="" />
                <div>
                    <h1>Focus Mode for YouTube Music</h1>
                    <p>Opções da extensão</p>
                </div>
            </header>

            <section className="options-section">
                <h2>Modo foco</h2>
                <Toggle
                    label="Abrir quando a música começar"
                    description="O modo foco abre sozinho na primeira música de cada janela do YouTube Music."
                    checked={preferences.autoOpenFocus}
                    onChange={(value) => update({ autoOpenFocus: value })}
                />
                <div className="option-row">
                    <div className="option-text">
                        <span className="option-label">Atalho de teclado</span>
                        <span className="option-description">
                            Abre e fecha o modo foco de qualquer janela do navegador.
                        </span>
                    </div>
                    <div className="shortcut">
                        <kbd>{shortcut === null ? '…' : shortcut || 'Sem atalho'}</kbd>
                        {!isFirefox && (
                            <button type="button" className="link-button" onClick={openShortcutSettings}>
                                Alterar
                            </button>
                        )}
                    </div>
                </div>
                {isFirefox && (
                    <p className="options-hint">
                        No Firefox, troque o atalho em about:addons → engrenagem → Gerenciar atalhos.
                    </p>
                )}
            </section>

            <section className="options-section">
                <h2>YouTube Music</h2>
                <Toggle
                    label="Manter o menu lateral recolhido"
                    description="As playlists ficam no botão da extensão. Desligado, o menu e o botão ☰ voltam ao normal."
                    checked={preferences.collapseSidebar}
                    onChange={(value) => update({ collapseSidebar: value })}
                />
                <Toggle
                    label="Usar a cor da capa no YouTube Music"
                    description="Pinta a barra de progresso, o botão de play e o título da música com a cor da capa."
                    checked={preferences.tintYouTubeMusic}
                    onChange={(value) => update({ tintYouTubeMusic: value })}
                />
            </section>

            <section className="options-section">
                <h2>Sessões</h2>
                <Toggle
                    label="Reabrir ao iniciar o navegador"
                    description="Abre a última música da sessão ativa, pausada no ponto em que parou. Se o Ctrl+Shift+T trouxer a mesma janela, a cópia é descartada."
                    checked={preferences.reopenOnStartup}
                    onChange={(value) => update({ reopenOnStartup: value })}
                />
            </section>

            <footer className="options-footer">
                As alterações são salvas na hora e valem para todas as janelas.
            </footer>
        </main>
    );
};

export default OptionsPage;
