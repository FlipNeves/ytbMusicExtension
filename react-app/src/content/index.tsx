import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '../App';
import { sessionService } from '../services/SessionService';
import { preloadPreferences } from '../services/PreferencesService';

// Registra o listener de mensagens do background antes do primeiro render,
// para não perder um SESSION_INCOMING_LINK que chegue cedo.
sessionService.init();

const render = () => {
  const root = document.createElement('div');
  root.id = 'crx-root';
  document.body.appendChild(root);

  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

// Preferências primeiro: os estados iniciais (menu lateral, letra, vídeo) já nascem certos
preloadPreferences().finally(render);
