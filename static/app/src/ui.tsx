import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import type { Band, Freshness, Kind } from './types';

/* ---------- icons (inline SVG, decorative unless labelled) ---------- */
const paths: Record<string, string> = {
  dashboard: 'M3 3h8v10H3zM13 3h8v6h-8zM13 11h8v10h-8zM3 15h8v6H3z',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  plus: 'M12 5v14M5 12h14',
  info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16v-4M12 8h.01',
  check: 'M20 6 9 17l-5-5',
  alert: 'M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
  link: 'M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1',
  refresh: 'M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  play: 'M6 4l14 8-14 8z',
  trash: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6',
  back: 'M19 12H5M12 19l-7-7 7-7',
  chevronDown: 'M6 9l6 6 6-6',
  calendar: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
  moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
  menu: 'M4 6h16M4 12h16M4 18h16',
  close: 'M18 6 6 18M6 6l12 12',
  chevronLeft: 'M15 18l-6-6 6-6',
  chevronRight: 'M9 18l6-6-6-6',
  sparkle: 'M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2z',
};

export function Icon({ name, size = 20 }: { name: keyof typeof paths | string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d={paths[name] || paths.info} />
    </svg>
  );
}

/* ---------- badges ---------- */
export function BandBadge({ band }: { band: Band | null }) {
  if (!band) return <span className="badge">Not analyzed</span>;
  const map = { ready: ['ok', 'Ready'], 'needs-work': ['warn', 'Needs work'], 'not-ready': ['danger', 'Not ready'] } as const;
  return <span className={`badge ${map[band][0]}`}>{map[band][1]}</span>;
}

export function ScorePill({ score, band }: { score: number | null; band: Band | null }) {
  if (score == null) return <span className="muted">—</span>;
  return <span className={`score-pill band-${band || 'not-ready'}`} aria-label={`Readiness score ${score} out of 100`}>{score}</span>;
}

const KIND_LABEL: Record<Kind, [string, string]> = {
  verified: ['ok', 'Verified fact'],
  inferred: ['violet', 'AI inference'],
  missing: ['warn', 'Missing information'],
  assumption: ['info', 'User assumption'],
};
export function KindBadge({ kind }: { kind: Kind }) {
  const [cls, label] = KIND_LABEL[kind];
  return <span className={`badge ${cls}`}>{label}</span>;
}

export function FreshBadge({ value }: { value?: Freshness }) {
  const map = { fresh: ['ok', 'Fresh'], aging: ['warn', 'Aging'], stale: ['danger', 'Stale'] } as const;
  const [cls, label] = map[value || 'stale'];
  return <span className={`badge ${cls}`}>{label}</span>;
}

/* ---------- feedback ---------- */
export function Skeleton({ h = 20, w = '100%' }: { h?: number; w?: number | string }) {
  return <div className="skeleton" style={{ height: h, width: w }} aria-hidden="true" />;
}

export function LoadingBlock({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="stack" role="status" aria-live="polite">
      <span className="sr-only">{label}…</span>
      <Skeleton h={28} w="40%" />
      <Skeleton h={90} />
      <Skeleton h={90} />
    </div>
  );
}

export function EmptyState({ icon = 'sparkle', title, body, children }: { icon?: string; title: string; body: string; children?: ReactNode }) {
  return (
    <div className="empty card">
      <div className="ic"><Icon name={icon} size={26} /></div>
      <h2>{title}</h2>
      <p>{body}</p>
      {children}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="alert" role="alert">
      <strong>Something needs attention.</strong>
      <p>{message}</p>
      {onRetry && <button className="btn sm" style={{ marginTop: 10 }} onClick={onRetry}><Icon name="refresh" size={16} /> Try again</button>}
    </div>
  );
}

/* ---------- toasts ---------- */
interface ToastItem { id: number; text: string; kind: 'ok' | 'err' }
const ToastCtx = createContext<(text: string, kind?: 'ok' | 'err') => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((text: string, kind: 'ok' | 'err' = 'ok') => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x, { id, text, kind }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), kind === 'err' ? 8000 : 4000);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" aria-live="polite" role="status">
        {items.map((t) => <div key={t.id} className={`toast ${t.kind}`}>{t.text}</div>)}
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------- modal with focus management ---------- */
export function Modal({ title, onClose, children, footer }: { title: string; onClose: () => void; children: ReactNode; footer: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const first = ref.current?.querySelector<HTMLElement>('input,select,textarea,button');
    (first || ref.current)?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
      if (e.key !== 'Tab' || !ref.current) return;
      const f = [...ref.current.querySelectorAll<HTMLElement>('button,input,select,textarea,a[href]')].filter((el) => !el.hasAttribute('disabled'));
      if (!f.length) return;
      const a = f[0]; const z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    }
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); prev?.focus(); };
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={ref} tabIndex={-1}>
        <h2 id={titleId} style={{ marginBottom: 12 }}>{title}</h2>
        {children}
        <div className="foot">{footer}</div>
      </div>
    </div>
  );
}

/* ---------- form helpers ---------- */
export function Field({ label, hint, error, children, full }: { label: string; hint?: string; error?: string; children: (id: string) => ReactNode; full?: boolean }) {
  const id = useId();
  return (
    <div className={`field${full ? ' full' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {children(id)}
      {hint && !error && <span className="hint">{hint}</span>}
      {error && <span className="err" role="alert">{error}</span>}
    </div>
  );
}

export const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—');
export const fmtDay = (iso?: string | null) => (iso ? new Date(iso + (iso.length === 10 ? 'T00:00:00' : '')).toLocaleDateString(undefined, { dateStyle: 'medium' }) : 'Not set');

/* ---------- charts (SVG, with text alternatives) ---------- */
export function Gauge({ score, band }: { score: number; band: Band }) {
  const r = 52; const c = 2 * Math.PI * r; const off = c * (1 - score / 100);
  const color = band === 'ready' ? 'var(--ok)' : band === 'needs-work' ? 'var(--warn)' : 'var(--danger)';
  return (
    <svg width="140" height="140" viewBox="0 0 140 140" role="img" aria-label={`Readiness ${score} out of 100`}>
      <circle cx="70" cy="70" r={r} fill="none" stroke="var(--bg-2)" strokeWidth="12" />
      <circle cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="12" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} transform="rotate(-90 70 70)" style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
      <text x="70" y="68" textAnchor="middle" fontSize="32" fontWeight="700" fill="var(--text)">{score}</text>
      <text x="70" y="90" textAnchor="middle" fontSize="11" fill="var(--muted)">out of 100</text>
    </svg>
  );
}

export function GroupedBars({ data, labelA, labelB }: { data: { label: string; a: number; b: number }[]; labelA: string; labelB: string }) {
  const max = Math.max(1, ...data.flatMap((d) => [d.a, d.b]));
  const W = 520; const H = 190; const pad = 28; const slot = (W - pad) / data.length; const bw = Math.min(18, slot / 3);
  const y = (v: number) => H - 26 - (v / max) * (H - 50);
  return (
    <figure style={{ margin: 0 }}>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`${labelA} and ${labelB} per week. ${data.map((d) => `${d.label}: ${d.a} ${labelA}, ${d.b} ${labelB}`).join('; ')}`}>
        {[0, 0.5, 1].map((t) => <line key={t} x1={pad} x2={W} y1={y(max * t)} y2={y(max * t)} stroke="var(--border)" strokeDasharray="3 4" />)}
        <text x={0} y={y(max) + 4}>{max}</text>
        <text x={0} y={y(0) + 4}>0</text>
        {data.map((d, i) => {
          const x = pad + i * slot + slot / 2;
          return (
            <g key={d.label}>
              <rect x={x - bw - 2} y={y(d.a)} width={bw} height={Math.max(0, y(0) - y(d.a))} rx="4" fill="var(--primary)"><title>{`${d.label}: ${d.a} ${labelA}`}</title></rect>
              <rect x={x + 2} y={y(d.b)} width={bw} height={Math.max(0, y(0) - y(d.b))} rx="4" fill="var(--violet)"><title>{`${d.label}: ${d.b} ${labelB}`}</title></rect>
              <text x={x} y={H - 6} textAnchor="middle">{d.label}</text>
            </g>
          );
        })}
      </svg>
      <figcaption className="legend"><span><i style={{ background: 'var(--primary)' }} />{labelA}</span><span><i style={{ background: 'var(--violet)' }} />{labelB}</span></figcaption>
    </figure>
  );
}

export function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return <span className="muted small">Run the analysis again to build a trend.</span>;
  const W = 220; const H = 56;
  const xy = points.map((p, i) => [(i / (points.length - 1)) * (W - 8) + 4, H - 6 - (p / 100) * (H - 12)]);
  return (
    <svg className="chart" width="100%" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Readiness history: ${points.join(', ')}`}>
      <polyline points={xy.map((p) => p.join(',')).join(' ')} fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinejoin="round" />
      {xy.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="var(--violet)"><title>{`Score ${points[i]}`}</title></circle>)}
    </svg>
  );
}
