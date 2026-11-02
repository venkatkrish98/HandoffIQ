import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

try {
  const s = localStorage.getItem('handoffiq.theme');
  document.documentElement.dataset.theme = s === 'light' || s === 'dark' ? s : window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
} catch { /* ignore */ }

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
