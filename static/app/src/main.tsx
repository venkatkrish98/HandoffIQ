import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import IssuePanel from './views/IssuePanel';
import { PREVIEW } from './api';
import './styles.css';

try {
  const s = localStorage.getItem('handoffiq.theme');
  document.documentElement.dataset.theme = s === 'light' || s === 'dark' ? s : window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
} catch { /* ignore */ }

/** Which Forge module is hosting this bundle: the issue panel renders a compact view, everything else the full app. */
async function issueKeyFromContext(): Promise<string | null> {
  if (PREVIEW) return new URLSearchParams(location.search).get('panel');
  try {
    const { view } = await import('@forge/bridge');
    const ctx = (await view.getContext()) as { moduleKey?: string; extension?: { type?: string; issue?: { key?: string } } };
    return ctx.extension?.type === 'jira:issuePanel' ? ctx.extension.issue?.key || null : null;
  } catch { return null; }
}

issueKeyFromContext().then((issueKey) => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>{issueKey ? <IssuePanel issueKey={issueKey} /> : <App />}</StrictMode>,
  );
});
