import { useEffect } from 'react';
import FocusMode from './features/focus-mode/FocusMode';
import PlaylistsMenu from './features/sidebar/PlaylistsMenu';
import SessionPrompt from './features/sessions/SessionPrompt';
import SessionsMenu from './features/sessions/SessionsMenu';
import { usePreferences } from './hooks/usePreferences';

/** Classe no <html> que libera a cor da capa nos detalhes do YTM (base.css) */
const TINT_CLASS = 'fmp-tint-ytm';

function App() {
  const { preferences } = usePreferences();

  useEffect(() => {
    document.documentElement.classList.toggle(TINT_CLASS, preferences.tintYouTubeMusic);
  }, [preferences.tintYouTubeMusic]);

  return (
    <>
      <FocusMode />
      <PlaylistsMenu />
      <SessionsMenu />
      <SessionPrompt />
    </>
  );
}

export default App;
