import { useCallback, useEffect, useRef, useState } from 'react';
import { PREVIEW } from './api';
import { Icon, ToastProvider } from './ui';
import { Dashboard } from './views/Dashboard';
import { HandoverList } from './views/HandoverList';
import { Wizard } from './views/Wizard';
import { Detail } from './views/Detail';
import { About } from './views/About';

type Route = { name: 'dashboard' } | { name: 'list' } | { name: 'new' } | { name: 'about' } | { name: 'detail'; id: string };

const NAV = [
  { name: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { name: 'list', label: 'Handovers', icon: 'list' },
  { name: 'new', label: 'New handover', icon: 'plus' },
  { name: 'about', label: 'How it works', icon: 'info' },
] as const;

const TITLES: Record<Route['name'], string> = { dashboard: 'Dashboard', list: 'Handovers', new: 'New handover', about: 'How it works', detail: 'Handover details' };
const STORE_KEY = 'handoffiq.sidebar.collapsed';
const THEME_KEY = 'handoffiq.theme';
type Theme = 'light' | 'dark';

// Saved choice wins; otherwise follow the OS preference. Storage may be blocked in sandboxed iframes.
function initialTheme(): Theme {
  try { const s = localStorage.getItem(THEME_KEY); if (s === 'light' || s === 'dark') return s; } catch { /* ignore */ }
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

// localStorage can be blocked inside sandboxed iframes; the UI must work without it.
const readCollapsed = () => { try { return localStorage.getItem(STORE_KEY) === '1'; } catch { return false; } };
const writeCollapsed = (v: boolean) => { try { localStorage.setItem(STORE_KEY, v ? '1' : '0'); } catch { /* ignore */ } };

interface SidebarProps { active: string; compact: boolean; go: (name: (typeof NAV)[number]['name']) => void; onToggle?: () => void }

function SidebarContent({ active, compact, go, onToggle }: SidebarProps) {
  return (
    <>
      <div className={`flex h-14 items-center gap-3 ${compact ? 'justify-center' : 'px-2'}`}>
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-violet text-on-brand shadow-lg shadow-brand-500/30"><Icon name="sparkle" size={18} /></span>
        {!compact && <span className="text-[1.05rem] font-semibold tracking-tight">HandoffIQ</span>}
      </div>
      <nav aria-label="Main" className="mt-2 flex flex-col gap-1">
        {NAV.map((n) => {
          const on = active === n.name;
          return (
            <button
              key={n.name}
              onClick={() => go(n.name)}
              aria-current={on ? 'page' : undefined}
              aria-label={compact ? n.label : undefined}
              className={`group relative flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-3 text-left text-sm font-medium transition ${compact ? 'justify-center' : ''} ${on ? 'bg-veil/[0.08] text-fg' : 'text-muted hover:bg-veil/[0.05] hover:text-fg'}`}
            >
              {on && <span className="absolute top-2.5 bottom-2.5 left-0 w-[3px] rounded-r bg-gradient-to-b from-brand-400 to-violet" />}
              <span className={on ? 'text-brand-400' : 'transition group-hover:text-brand-300'}><Icon name={n.icon} /></span>
              {!compact && <span>{n.label}</span>}
              {compact && (
                <span role="tooltip" className="pointer-events-none absolute left-full z-50 ml-3 rounded-lg border border-veil/10 bg-ink-700 px-2.5 py-1 text-xs font-medium whitespace-nowrap text-fg opacity-0 shadow-card transition group-hover:opacity-100 group-focus-visible:opacity-100">
                  {n.label}
                </span>
              )}
            </button>
          );
        })}
      </nav>
      <div className="mt-auto flex flex-col gap-3 pb-3">
        {!compact && (
          <div className="rounded-xl border border-veil/10 bg-veil/[0.04] p-3 text-[0.8rem] text-muted">
            <strong className="block text-fg">Never lose context between teams.</strong>
            Evidence-linked, approval-controlled handovers.
          </div>
        )}
        {onToggle && (
          <button onClick={onToggle} aria-expanded={!compact} aria-label={compact ? 'Expand sidebar' : 'Collapse sidebar'} title={compact ? 'Expand sidebar ([)' : 'Collapse sidebar ([)'}
            className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-veil/10 px-3 text-sm font-medium text-muted transition hover:bg-veil/[0.06] hover:text-fg ${compact ? 'justify-center' : ''}`}>
            <Icon name={compact ? 'chevronRight' : 'chevronLeft'} size={18} />
            {!compact && <span>Collapse</span>}
          </button>
        )}
      </div>
    </>
  );
}

export default function App() {
  const [route, setRoute] = useState<Route>({ name: 'dashboard' });
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [drawer, setDrawer] = useState(false);
  const [theme, setTheme] = useState<Theme>(initialTheme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* ignore */ }
  }, [theme]);
  const closeRef = useRef<HTMLButtonElement>(null);

  const go = useCallback((r: Route) => { setRoute(r); setDrawer(false); window.scrollTo({ top: 0 }); }, []);
  const toggleCollapsed = useCallback(() => setCollapsed((c) => { writeCollapsed(!c); return !c; }), []);
  const active = route.name === 'detail' ? 'list' : route.name;

  // "[" toggles the sidebar (ignored while typing); Escape closes the mobile drawer.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing = t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable);
      if (e.key === '[' && !typing && !e.metaKey && !e.ctrlKey) toggleCollapsed();
      if (e.key === 'Escape') setDrawer(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [toggleCollapsed]);

  useEffect(() => { if (drawer) closeRef.current?.focus(); }, [drawer]);

  const onNav = (name: (typeof NAV)[number]['name']) => go({ name });

  return (
    <ToastProvider>
      <div className="flex min-h-screen">
        {/* Desktop sidebar */}
        <aside className={`sticky top-0 z-40 hidden h-screen shrink-0 flex-col border-r border-veil/10 bg-ink-950/80 px-3 backdrop-blur-xl transition-[width] duration-200 lg:flex ${collapsed ? 'w-[76px]' : 'w-64'}`}>
          <SidebarContent active={active} compact={collapsed} go={onNav} onToggle={toggleCollapsed} />
        </aside>

        {/* Mobile drawer */}
        {drawer && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
            <div className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm" onClick={() => setDrawer(false)} />
            <div className="relative flex h-full w-72 max-w-[85vw] animate-[slidein_0.2s_ease-out] flex-col border-r border-veil/10 bg-ink-900 px-3 shadow-card">
              <button ref={closeRef} onClick={() => setDrawer(false)} aria-label="Close navigation" className="absolute top-3 right-3 grid size-9 cursor-pointer place-items-center rounded-lg text-muted hover:bg-veil/10 hover:text-fg"><Icon name="close" size={18} /></button>
              <SidebarContent active={active} compact={false} go={onNav} />
            </div>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-veil/10 bg-ink-950/70 px-4 backdrop-blur-xl sm:px-6">
            <button onClick={() => setDrawer(true)} aria-label="Open navigation" className="grid size-10 cursor-pointer place-items-center rounded-xl text-muted transition hover:bg-veil/[0.07] hover:text-fg lg:hidden"><Icon name="menu" /></button>
            <button onClick={toggleCollapsed} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!collapsed} className="hidden size-10 cursor-pointer place-items-center rounded-xl text-muted transition hover:bg-veil/[0.07] hover:text-fg lg:grid"><Icon name="menu" /></button>
            <div className="flex min-w-0 items-center gap-2 text-sm">
              <span className="hidden text-muted sm:inline">HandoffIQ</span>
              <span className="hidden text-veil/30 sm:inline">/</span>
              <h2 className="truncate text-sm font-semibold">{TITLES[route.name]}</h2>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))} aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
                className="grid size-10 cursor-pointer place-items-center rounded-xl text-muted transition hover:bg-veil/[0.07] hover:text-fg"><Icon name={theme === 'dark' ? 'sun' : 'moon'} /></button>
              {PREVIEW && <span className="badge warn hidden sm:inline-flex">Preview · simulated writes</span>}
              {(route.name === 'detail' || route.name === 'about') && <button className="btn primary sm" onClick={() => go({ name: 'new' })}><Icon name="plus" size={16} /><span className="hidden sm:inline">New handover</span><span className="sr-only sm:hidden">New handover</span></button>}
            </div>
          </header>

          <main id="main" className="mx-auto w-full max-w-7xl min-w-0 flex-1 px-4 py-6 pb-16 sm:px-6 lg:px-8 lg:py-8">
            {PREVIEW && <div className="banner sm:hidden" role="note">Preview build with synthetic data. Writes are simulated.</div>}
            {route.name === 'dashboard' && <Dashboard open={(id) => go({ name: 'detail', id })} create={() => go({ name: 'new' })} />}
            {route.name === 'list' && <HandoverList open={(id) => go({ name: 'detail', id })} create={() => go({ name: 'new' })} />}
            {route.name === 'new' && <Wizard done={(id) => go({ name: 'detail', id })} cancel={() => go({ name: 'list' })} />}
            {route.name === 'about' && <About />}
            {route.name === 'detail' && <Detail id={route.id} back={() => go({ name: 'list' })} />}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
