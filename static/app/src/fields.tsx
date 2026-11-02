import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Icon } from './ui';

/* ======================================================================
   Material-style form controls: floating-label text field, searchable
   combobox (single / multi with chips) and a calendar date picker.
   All keyboard accessible with ARIA roles; no external libraries.
   ====================================================================== */

interface Shared { label: string; error?: string; hint?: string; full?: boolean; disabled?: boolean }

function Helper({ id, error, hint }: { id: string; error?: string; hint?: string }) {
  if (!error && !hint) return null;
  return <p id={id} role={error ? 'alert' : undefined} className={`mt-1 px-1 text-[0.78rem] ${error ? 'text-danger' : 'text-muted'}`}>{error || hint}</p>;
}

/* ---------- floating-label text field ---------- */
interface TextProps extends Shared {
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  multiline?: boolean;
  maxLength?: number;
  rows?: number;
}

export function TextField({ label, value, onChange, onBlur, error, hint, multiline, maxLength, rows = 3, full, disabled }: TextProps) {
  const id = useId();
  const hid = `${id}-h`;
  const common = {
    id, value, maxLength, disabled, placeholder: ' ', onBlur,
    'aria-invalid': !!error || undefined,
    'aria-describedby': error || hint ? hid : undefined,
    className: 'mf-input peer',
  };
  return (
    <div className={full ? 'sm:col-span-2' : undefined}>
      <div className={`mf ${error ? 'mf-error' : ''}`}>
        {multiline
          ? <textarea {...common} rows={rows} onChange={(e) => onChange(e.target.value)} />
          : <input {...common} type="text" onChange={(e) => onChange(e.target.value)} />}
        <label htmlFor={id}>{label}</label>
        {maxLength && multiline && <span className="pointer-events-none absolute right-3 bottom-2 text-[0.7rem] text-muted">{value.length}/{maxLength}</span>}
      </div>
      <Helper id={hid} error={error} hint={hint} />
    </div>
  );
}

/* ---------- click-outside helper ---------- */
function useOutside(ref: React.RefObject<HTMLElement | null>, onOut: () => void, active: boolean) {
  useEffect(() => {
    if (!active) return;
    const h = (e: MouseEvent | TouchEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onOut(); };
    document.addEventListener('mousedown', h);
    document.addEventListener('touchstart', h);
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('touchstart', h); };
  }, [ref, onOut, active]);
}

/* ---------- searchable combobox ---------- */
export interface Option { value: string; label: string; hint?: string }

interface ComboBase extends Shared {
  options: Option[];
  loading?: boolean;
  placeholder?: string;
  emptyText?: string;
  searchable?: boolean;
}
type ComboProps = ComboBase & (
  | { multiple?: false; value: string; onChange: (v: string) => void }
  | { multiple: true; value: string[]; onChange: (v: string[]) => void }
);

export function Combobox(props: ComboProps) {
  const { label, options, loading, emptyText = 'No matches', error, hint, full, disabled, searchable = true } = props;
  const id = useId();
  const listId = `${id}-list`;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const close = useCallback(() => { setOpen(false); setQuery(''); }, []);
  useOutside(wrap, close, open);

  const selected = props.multiple ? props.value : props.value ? [props.value] : [];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => `${o.label} ${o.hint || ''}`.toLowerCase().includes(q)) : options;
  }, [options, query]);

  useEffect(() => { setActive(0); }, [query, open]);
  useEffect(() => {
    if (open) document.getElementById(`${id}-opt-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open, id]);

  const current = !props.multiple ? options.find((o) => o.value === props.value) : undefined;
  const filled = open || selected.length > 0;

  function pick(o: Option) {
    if (props.multiple) {
      props.onChange(props.value.includes(o.value) ? props.value.filter((x) => x !== o.value) : [...props.value, o.value]);
      setQuery('');
      input.current?.focus();
    } else {
      props.onChange(o.value);
      close();
      input.current?.blur();
    }
  }

  function onKey(e: KeyboardEvent) {
    if (disabled) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); if (!open) setOpen(true); else setActive((a) => Math.min(filtered.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === 'Home' && open) { e.preventDefault(); setActive(0); }
    else if (e.key === 'End' && open) { e.preventDefault(); setActive(filtered.length - 1); }
    else if (e.key === 'Enter') { if (open && filtered[active]) { e.preventDefault(); pick(filtered[active]); } else if (!open) { e.preventDefault(); setOpen(true); } }
    else if (e.key === 'Escape' && open) { e.preventDefault(); e.stopPropagation(); close(); }
    else if (e.key === 'Backspace' && props.multiple && !query && props.value.length) props.onChange(props.value.slice(0, -1));
    else if (e.key === 'Tab') close();
  }

  return (
    <div className={full ? 'sm:col-span-2' : undefined} ref={wrap}>
      <div className={`mf relative ${error ? 'mf-error' : ''} ${filled ? 'filled' : ''} ${disabled ? 'opacity-60' : ''}`} onClick={() => { if (!disabled) { setOpen(true); input.current?.focus(); } }}>
        <div className="mf-input flex cursor-text flex-wrap items-center gap-1.5 !pr-10">
          {props.multiple && props.value.map((v) => {
            const o = options.find((x) => x.value === v);
            return (
              <span key={v} className="inline-flex max-w-full items-center gap-1 rounded-full border border-brand-400/30 bg-brand-400/10 py-0.5 pr-1 pl-2.5 text-[0.8rem] font-medium text-brand-300">
                <span className="truncate">{o?.label || v}</span>
                <button type="button" tabIndex={-1} aria-label={`Remove ${o?.label || v}`} className="grid size-5 cursor-pointer place-items-center rounded-full hover:bg-veil/10" onClick={(e) => { e.stopPropagation(); props.onChange(props.value.filter((x) => x !== v)); }}><Icon name="close" size={12} /></button>
              </span>
            );
          })}
          <input
            ref={input} id={id} role="combobox" aria-expanded={open} aria-controls={listId} aria-autocomplete="list" aria-haspopup="listbox"
            aria-activedescendant={open && filtered[active] ? `${id}-opt-${active}` : undefined} aria-invalid={!!error || undefined}
            disabled={disabled} readOnly={!searchable} autoComplete="off"
            value={open ? query : props.multiple ? '' : current?.label || ''}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => !disabled && setOpen(true)} onKeyDown={onKey}
            className="min-w-[4ch] flex-1 border-0 bg-transparent p-0 text-fg outline-none placeholder:text-transparent focus:ring-0"
            style={{ minHeight: 0 }}
          />
        </div>
        <label htmlFor={id}>{label}</label>
        <span aria-hidden="true" className={`pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted transition ${open ? 'rotate-180' : ''}`}><Icon name="chevronDown" size={18} /></span>
        {open && (
          <ul id={listId} role="listbox" aria-multiselectable={props.multiple || undefined} aria-label={label}
            className="absolute top-full right-0 left-0 z-40 mt-1.5 max-h-60 animate-rise overflow-auto rounded-xl border border-veil/10 bg-ink-800 p-1.5 shadow-card">
            {loading && <li className="px-3 py-2.5 text-sm text-muted" role="status">Loading…</li>}
            {!loading && filtered.length === 0 && <li className="px-3 py-2.5 text-sm text-muted">{emptyText}</li>}
            {!loading && filtered.map((o, i) => {
              const on = selected.includes(o.value);
              return (
                <li key={o.value} id={`${id}-opt-${i}`} role="option" aria-selected={on}
                  onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); pick(o); }} onMouseMove={() => setActive(i)}
                  className={`flex min-h-10 cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm ${i === active ? 'bg-brand-400/15' : ''} ${on ? 'text-fg' : 'text-fg'}`}>
                  {props.multiple && <span className={`grid size-4 shrink-0 place-items-center rounded border ${on ? 'border-transparent bg-brand-500 text-on-brand' : 'border-veil/25'}`}>{on && <Icon name="check" size={12} />}</span>}
                  <span className="min-w-0 flex-1"><span className="block truncate">{o.label}</span>{o.hint && <span className="block truncate text-xs text-muted">{o.hint}</span>}</span>
                  {!props.multiple && on && <span className="text-brand-400"><Icon name="check" size={16} /></span>}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <Helper id={`${id}-h`} error={error} hint={hint} />
    </div>
  );
}

/* ---------- calendar date picker ---------- */
const pad = (n: number) => String(n).padStart(2, '0');
const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
function fromIso(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  return d.getMonth() === +m[2] - 1 ? d : null;
}
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const WEEK = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

interface DateProps extends Shared { value: string; onChange: (v: string) => void }

export function DatePicker({ label, value, onChange, error, hint, full, disabled }: DateProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const selected = fromIso(value);
  const [view, setView] = useState<Date>(() => selected || new Date());
  const [focus, setFocus] = useState<Date>(() => selected || new Date());
  const wrap = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useOutside(wrap, close, open);

  const openIt = () => { const base = fromIso(value) || new Date(); setView(base); setFocus(base); setOpen(true); };

  // Move real focus onto the focused day while the calendar is open.
  useEffect(() => {
    if (open) grid.current?.querySelector<HTMLButtonElement>(`[data-date="${toIso(focus)}"]`)?.focus();
  }, [focus, open, view]);

  const days = useMemo(() => {
    const first = new Date(view.getFullYear(), view.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7; // Monday first
    return Array.from({ length: 42 }, (_, i) => addDays(first, i - offset));
  }, [view]);

  const today = toIso(new Date());
  const move = (d: Date) => { setFocus(d); if (d.getMonth() !== view.getMonth() || d.getFullYear() !== view.getFullYear()) setView(new Date(d.getFullYear(), d.getMonth(), 1)); };
  const choose = (d: Date) => { onChange(toIso(d)); setOpen(false); trigger.current?.focus(); };

  function onGridKey(e: KeyboardEvent) {
    const map: Record<string, () => void> = {
      ArrowLeft: () => move(addDays(focus, -1)), ArrowRight: () => move(addDays(focus, 1)),
      ArrowUp: () => move(addDays(focus, -7)), ArrowDown: () => move(addDays(focus, 7)),
      PageUp: () => move(new Date(focus.getFullYear(), focus.getMonth() - 1, focus.getDate())),
      PageDown: () => move(new Date(focus.getFullYear(), focus.getMonth() + 1, focus.getDate())),
      Home: () => move(addDays(focus, -((focus.getDay() + 6) % 7))), End: () => move(addDays(focus, 6 - ((focus.getDay() + 6) % 7))),
      Escape: () => { setOpen(false); trigger.current?.focus(); },
    };
    if (map[e.key]) { e.preventDefault(); e.stopPropagation(); map[e.key](); }
  }

  const text = selected ? selected.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  return (
    <div className={full ? 'sm:col-span-2' : undefined} ref={wrap}>
      <div className={`mf relative ${error ? 'mf-error' : ''} ${selected || open ? 'filled' : ''} ${disabled ? 'opacity-60' : ''}`}>
        <button ref={trigger} id={id} type="button" disabled={disabled} aria-haspopup="dialog" aria-expanded={open}
          aria-label={`${label}${text ? `: ${text}` : ''}. Open calendar`} onClick={() => (open ? close() : openIt())}
          className="mf-input flex w-full cursor-pointer items-center text-left">
          <span className={text ? 'text-fg' : 'text-transparent'}>{text || '—'}</span>
        </button>
        <label htmlFor={id}>{label}</label>
        <span aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted"><Icon name="calendar" size={18} /></span>
        {open && (
          <div role="dialog" aria-label={`Choose ${label}`} className="absolute top-full left-0 z-40 mt-1.5 w-[19rem] max-w-[calc(100vw-2rem)] animate-rise rounded-2xl border border-veil/10 bg-ink-800 p-3 shadow-card">
            <div className="mb-2 flex items-center justify-between">
              <button type="button" aria-label="Previous month" className="grid size-9 cursor-pointer place-items-center rounded-lg text-muted hover:bg-veil/10 hover:text-fg" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}><Icon name="chevronLeft" size={18} /></button>
              <div className="text-sm font-semibold" aria-live="polite">{view.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</div>
              <button type="button" aria-label="Next month" className="grid size-9 cursor-pointer place-items-center rounded-lg text-muted hover:bg-veil/10 hover:text-fg" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}><Icon name="chevronRight" size={18} /></button>
            </div>
            <div className="grid grid-cols-7 text-center text-[0.7rem] font-semibold text-muted" aria-hidden="true">{WEEK.map((w) => <div key={w} className="py-1">{w}</div>)}</div>
            <div ref={grid} role="grid" aria-label={view.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })} className="grid grid-cols-7 gap-0.5" onKeyDown={onGridKey}>
              {days.map((d) => {
                const iso = toIso(d);
                const inMonth = d.getMonth() === view.getMonth();
                const isSel = iso === value;
                return (
                  <button key={iso} type="button" role="gridcell" data-date={iso} tabIndex={iso === toIso(focus) ? 0 : -1} aria-selected={isSel} aria-current={iso === today ? 'date' : undefined}
                    aria-label={d.toLocaleDateString(undefined, { dateStyle: 'full' })} onClick={() => choose(d)}
                    className={`grid size-9 cursor-pointer place-items-center rounded-lg text-sm transition ${isSel ? 'bg-gradient-to-br from-brand-600 to-[#6a4fe0] font-semibold text-on-brand' : inMonth ? 'text-fg hover:bg-veil/10' : 'text-muted/70 hover:bg-veil/5'} ${iso === today && !isSel ? 'ring-1 ring-brand-400/60' : ''}`}>
                    {d.getDate()}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex justify-between border-t border-veil/10 pt-2">
              <button type="button" className="btn ghost sm" onClick={() => { onChange(''); setOpen(false); trigger.current?.focus(); }}>Clear</button>
              <button type="button" className="btn ghost sm" onClick={() => choose(new Date())}>Today</button>
            </div>
          </div>
        )}
      </div>
      <Helper id={`${id}-h`} error={error} hint={hint} />
    </div>
  );
}

export function FormGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>;
}
