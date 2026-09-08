import FocusMode from './features/focus-mode/FocusMode';
import PlaylistsMenu from './features/sidebar/PlaylistsMenu';
import SessionPrompt from './features/sessions/SessionPrompt';
import SessionsMenu from './features/sessions/SessionsMenu';
import './App.css';

function App() {
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
