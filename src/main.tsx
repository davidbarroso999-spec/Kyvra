import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import 'lenis/dist/lenis.css';
import { registerSW } from 'virtual:pwa-register';

// Register service worker
const updateSW = registerSW({
  onNeedRefresh() {
    console.log('New content available, click on reload button to update.');
  },
  onOfflineReady() {
    console.log('App ready to work offline');
  },
});

// Listener para erros de preload do Vite (comum ao navegar após novo deploy)
window.addEventListener('vite:preloadError', (event) => {
  console.warn('Vite preload error detected. Reloading page...');
  const lastReload = sessionStorage.getItem('kyvra-reload-failed-chunk');
  const now = Date.now();
  if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
    sessionStorage.setItem('kyvra-reload-failed-chunk', now.toString());
    window.location.reload();
  }
});

// Listener para rejeições de promise não tratadas (ex: falhas de import() em caches)
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const errorMsg = reason ? (reason.message || reason.toString()) : '';
  const isDynamicImportError = 
    errorMsg.includes('dynamically imported module') || 
    errorMsg.includes('Importing a module script failed') ||
    errorMsg.includes('Failed to fetch dynamically imported module') ||
    errorMsg.includes('Failed to fetch');

  if (isDynamicImportError) {
    const lastReload = sessionStorage.getItem('kyvra-reload-failed-chunk');
    const now = Date.now();
    if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
      sessionStorage.setItem('kyvra-reload-failed-chunk', now.toString());
      console.log('Kyvra: Falha de importação assíncrona detectada. Atualizando aplicação...');
      window.location.reload();
      event.preventDefault();
    }
  }
});

// Global error handler for early crashes
window.onerror = function(message, source, lineno, colno, error) {
  const errorMsg = message ? message.toString() : '';
  const isDynamicImportError = 
    errorMsg.includes('dynamically imported module') || 
    errorMsg.includes('Importing a module script failed') ||
    errorMsg.includes('Failed to fetch dynamically imported module') ||
    errorMsg.includes('Failed to fetch');

  if (isDynamicImportError) {
    const lastReload = sessionStorage.getItem('kyvra-reload-failed-chunk');
    const now = Date.now();
    if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
      sessionStorage.setItem('kyvra-reload-failed-chunk', now.toString());
      console.log('Kyvra: Falha de chunk detectada via global handler. Atualizando aplicação...');
      window.location.reload();
      return true; // previne exibição do erro vermelho
    }
  }

  const errorDiv = document.createElement('div');
  errorDiv.style.position = 'fixed';
  errorDiv.style.top = '0';
  errorDiv.style.left = '0';
  errorDiv.style.width = '100%';
  errorDiv.style.zIndex = '10000';
  errorDiv.style.color = 'white';
  errorDiv.style.background = 'rgba(255, 0, 0, 0.8)';
  errorDiv.style.padding = '20px';
  errorDiv.style.fontFamily = 'monospace';
  errorDiv.innerText = `Global Error: ${message}\nAt: ${source}:${lineno}:${colno}`;
  document.body.appendChild(errorDiv);
  return false;
};

const rootElement = document.getElementById('root');

if (!rootElement) {
  const errorDiv = document.createElement('div');
  errorDiv.style.color = 'white';
  errorDiv.style.background = 'black';
  errorDiv.style.padding = '20px';
  errorDiv.innerText = 'Critical Error: Root element not found.';
  document.body.appendChild(errorDiv);
} else {
  try {
    createRoot(rootElement).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  } catch (error) {
    console.error("Failed to render React app:", error);
    const errorDiv = document.createElement('div');
    errorDiv.style.color = 'white';
    errorDiv.style.background = 'black';
    errorDiv.style.padding = '20px';
    errorDiv.innerText = 'Critical Error: Failed to render application. Check console for details.';
    document.body.appendChild(errorDiv);
  }
}
