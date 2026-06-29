import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress ResizeObserver errors
const _error = console.error;
console.error = (...args) => {
  if (
    typeof args[0] === 'string' &&
    args[0].includes('ResizeObserver')
  ) {
    return;
  }
  _error(...args);
};

window.addEventListener('error', e => {
  if (typeof e.message === 'string' && e.message.includes('ResizeObserver')) {
    e.stopImmediatePropagation();
    e.preventDefault();
  }
});

const originalOnerror = window.onerror;
window.onerror = function(message, source, lineno, colno, error) {
  if (typeof message === 'string' && message.includes('ResizeObserver')) {
    return true;
  }
  if (originalOnerror) {
    return originalOnerror(message, source, lineno, colno, error);
  }
  return false;
};

window.addEventListener('unhandledrejection', e => {
  if (e.reason && typeof e.reason.message === 'string' && e.reason.message.includes('ResizeObserver')) {
    e.preventDefault();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
