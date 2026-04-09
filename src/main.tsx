import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global error handler for early crashes
window.onerror = function(message, source, lineno, colno, error) {
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
