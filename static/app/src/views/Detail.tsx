import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { PREVIEW, call } from '../api';
import { msg, useAsync } from '../hooks';
import type { Analysis, Fact, Handover, PlanItem, Question } from '../types';
import { Combobox, TextField } from '../fields';
import { BandBadge, EmptyState, ErrorState, FreshBadge, Gauge, Icon, KindBadge, LoadingBlock, Modal, Sparkline, fmtDate, fmtDay, useToast } from '../ui';

type Payload = { handover: Handover; analysis: Analysis | null };
const TABS = ['Overview', 'Evidence', 'Conflicts', 'Questions', 'Actions', 'Audit trail'] as const;
type Tab = (typeof TABS)[number];

/** External link that works inside the Forge iframe (router.open) and in the preview build. */
export function ExtLink({ href, children }: { href: string | null | undefined; children: ReactNode }) {
  if (!href || !/^https?:\/\//.test(href)) return <span>{children}</span>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" onClick={(e) => { if (!PREVIEW) { e.preventDefault(); import('@forge/bridge').then(({ router }) => router.open(href)).catch(() => window.open(href, '_blank', 'noopener')); } }}>
      {children}
    </a>
  );
}

export function Detail({ id, back }: { id: string; back: () => void }) {
  const state = useAsync(() => call<Payload>('getHandover', { id }), [id]);
  const [tab, setTab] = useState<Tab>('Overview');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const toast = useToast();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const update = (p: Payload) => state.set(p);

  async function rerun() {
    setBusy(true);
    try { update(await call<Payload>('runAnalysis', { id })); toast('Evidence refreshed and analysis re-run.'); } catch (e) { toast(msg(e), 'err'); } finally { setBusy(false); }
  }

  async function remove() {
    setBusy(true);
    try { await call('deleteHandover', { id }); toast('Handover deleted.'); back(); } catch (e) { toast(msg(e), 'err'); setBusy(false); setConfirmDelete(false); }
  }

  function onTabKey(e: KeyboardEvent, i: number) {
    const n = e.key === 'ArrowRight' ? (i + 1) % TABS.length : e.key === 'ArrowLeft' ? (i + TABS.length - 1) % TABS.length : e.key === 'Home' ? 0 : e.key === 'End' ? TABS.length - 1 : -1;
    if (n >= 0) { e.preventDefault(); setTab(TABS[n]); tabRefs.current[n]?.focus(); }
  }

  if (state.loading && !state.data) return <LoadingBlock label="Loading handover" />;
  if (state.error) return <><button className="btn ghost" onClick={back}><Icon name="back" size={18} /> Back</button><div style={{ height: 12 }} /><ErrorState message={state.error} onRetry={state.reload} /></>;
  if (!state.data) return null;
  const { handover: h, analysis: a } = state.data;

  return (
    <>
      <button className="btn ghost sm" onClick={back} style={{ marginBottom: 10 }}><Icon name="back" size={16} /> All handovers</button>
      <header className="page-head">
        <div>
          <h1>{h.name} {h.demo && <span className="badge violet">Synthetic data</span>}</h1>
          <p className="sub">{h.sourceTeam} → {h.receivingTeam} · {h.priority} priority · Expected {fmtDay(h.expectedDelivery)}</p>
        </div>
        <div className="actions-row">
          <button className="btn" onClick={rerun} disabled={busy}><Icon name="refresh" size={18} /> {busy ? 'Analyzing…' : a ? 'Refresh & re-run' : 'Run analysis'}</button>
          <button className="btn danger" onClick={() => setConfirmDelete(true)} disabled={busy}><Icon name="trash" size={18} /> Delete</button>
        </div>
      </header>

      {confirmDelete && (
        <Modal title="Delete this handover?" onClose={() => setConfirmDelete(false)}
          footer={<><button className="btn" onClick={() => setConfirmDelete(false)}>Cancel</button><button className="btn danger" onClick={remove} disabled={busy}>{busy ? 'Deleting…' : 'Delete handover'}</button></>}>
          <p>This removes the handover, its analysis and its audit trail from HandoffIQ. <strong>Jira issues and Confluence pages already created are not deleted.</strong></p>
        </Modal>
      )}

      <div className="tabs" role="tablist" aria-label="Handover sections">
        {TABS.map((t, i) => (
          <button key={t} ref={(el) => { tabRefs.current[i] = el; }} role="tab" id={`tab-${i}`} aria-selected={tab === t} aria-controls={`panel-${i}`} tabIndex={tab === t ? 0 : -1} onClick={() => setTab(t)} onKeyDown={(e) => onTabKey(e, i)}>
            {t}{t === 'Questions' && a ? ` (${a.questions.filter((q) => q.status === 'open').length})` : ''}{t === 'Conflicts' && a ? ` (${a.contradictions.length})` : ''}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${TABS.indexOf(tab)}`} aria-labelledby={`tab-${TABS.indexOf(tab)}`}>
        {!a && tab !== 'Audit trail' ? (
          <EmptyState icon="play" title="No analysis yet" body="Run the analysis to retrieve evidence from the linked Jira and Confluence sources.">
            <button className="btn primary" onClick={rerun} disabled={busy}>{busy ? 'Analyzing…' : 'Run analysis'}</button>
          </EmptyState>
        ) : tab === 'Overview' && a ? <Overview h={h} a={a} update={update} />
          : tab === 'Evidence' && a ? <Evidence a={a} />
          : tab === 'Conflicts' && a ? <Conflicts a={a} />
          : tab === 'Questions' && a ? <Questions id={id} a={a} update={update} h={h} rerun={rerun} />
          : tab === 'Actions' && a ? <Actions id={id} h={h} reload={state.reload} />
          : <Audit h={h} />}
      </div>
    </>
  );
}

/* ---------------- Overview ---------------- */
function Overview({ h, a, update }: { h: Handover; a: Analysis; update: (p: Payload) => void }) {
  const [confirm, setConfirm] = useState<null | 'approved' | 'rejected'>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const cnt = (c: string) => a.facts.filter((f) => f.category === c).length;
  const r = a.readiness;
  const next: string[] = [];
  if (a.contradictions.length) next.push(`Resolve ${a.contradictions.length} conflicting statement(s) between sources.`);
  const noOwner = a.facts.filter((f) => f.category === 'owner' && f.kind === 'missing').length;
  if (noOwner) next.push(`Assign an owner to ${noOwner} Jira issue(s) that have none.`);
  const openQ = a.questions.filter((q) => q.status === 'open').length;
  if (openQ) next.push(`Answer ${openQ} open clarification question(s).`);
  if (h.approval.status !== 'approved') next.push('Get receiving-team approval once the items above are cleared.');

  async function setApproval(status: 'approved' | 'rejected' | 'pending') {
    setBusy(true);
    try { update(await call<Payload>('setApproval', { id: h.id, status, note })); toast(`Handover marked ${status}.`); setConfirm(null); setNote(''); } catch (e) { toast(msg(e), 'err'); } finally { setBusy(false); }
  }

  return (
    <div className="stack">
      {a.warnings.length > 0 && (
        <div className="alert" role="alert"><strong>Some sources could not be retrieved</strong>
          <ul>{a.warnings.map((w, i) => <li key={i}>{w.sourceId}: {w.message}</li>)}</ul>
          <p className="small">These were not analyzed, and nothing from them is shown.</p></div>
      )}
      <div className="grid two">
        <section className="card" aria-labelledby="exec">
          <h2 id="exec" style={{ marginBottom: 10 }}>Executive summary</h2>
          <p>
            HandoffIQ retrieved <strong>{a.sources.length}</strong> source(s) and found <strong>{cnt('requirement')}</strong> requirement(s), <strong>{cnt('decision')}</strong> decision(s),{' '}
            <strong>{cnt('dependency')}</strong> dependency statement(s) and <strong>{cnt('risk')}</strong> risk/blocker mention(s). It detected <strong>{a.contradictions.length}</strong> conflict(s)
            and generated <strong>{a.questions.length}</strong> clarification question(s).
          </p>
          <p className="muted small" style={{ marginTop: 8 }}>This summary is generated from counts of cited evidence; it contains no unsourced claims.</p>
          <h3 style={{ margin: '16px 0 8px' }}>Recommended next actions</h3>
          {next.length ? <ol style={{ margin: 0, paddingLeft: 20 }}>{next.map((n) => <li key={n}>{n}</li>)}</ol> : <p>Nothing outstanding. Ready for the receiving team.</p>}
          {a.assumptions.length > 0 && (<><h3 style={{ margin: '16px 0 8px' }}>User-provided assumptions <KindBadge kind="assumption" /></h3><ul style={{ margin: 0, paddingLeft: 20 }}>{a.assumptions.map((s) => <li key={s.id}>{s.text}</li>)}</ul></>)}
        </section>
        <section className="card" aria-labelledby="ready">
          <div className="head"><h2 id="ready">Readiness</h2><BandBadge band={r.band} /></div>
          <div style={{ display: 'flex', justifyContent: 'center' }}><Gauge score={r.score} band={r.band} /></div>
          <div style={{ marginTop: 8 }}><span className="label">History</span><Sparkline points={h.history.map((x) => x.score)} /></div>
          <p className="muted small" style={{ marginTop: 10 }}>{r.method}</p>
        </section>
      </div>

      <section className="card" aria-labelledby="why">
        <h2 id="why">Why this score</h2>
        {r.dimensions.map((d) => (
          <div className="dim" key={d.key}>
            <div><strong>{d.label}</strong> <span className="muted small">weight {d.weight}</span><div className="muted small">{d.why}</div></div>
            <strong>{d.score}</strong>
            <div className="bar" role="img" aria-label={`${d.label}: ${d.score} out of 100`}><span style={{ width: `${d.score}%` }} /></div>
          </div>
        ))}
        {r.penalty > 0 && <p className="small" style={{ marginTop: 10 }}>Contradiction penalty: −{r.penalty} points.</p>}
      </section>

      <div className="grid two">
        <section className="card" aria-labelledby="src">
          <h2 id="src" style={{ marginBottom: 10 }}>Sources &amp; freshness</h2>
          <ul className="stack" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {a.sources.map((s) => (
              <li key={s.id} className="row" style={{ alignItems: 'center' }}>
                <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}><span className="badge">{s.type}</span> <ExtLink href={s.url}>{s.title}</ExtLink><br /><span className="muted small">Retrieved {fmtDate(s.retrievedAt)}</span></span>
                <FreshBadge value={s.freshness} />
              </li>
            ))}
          </ul>
        </section>
        <section className="card" aria-labelledby="appr">
          <h2 id="appr" style={{ marginBottom: 10 }}>Receiving-team approval</h2>
          <p><span className={`badge ${h.approval.status === 'approved' ? 'ok' : h.approval.status === 'rejected' ? 'danger' : 'warn'}`}>{h.approval.status}</span>{h.approval.by && <span className="muted small"> · {h.approval.by}, {fmtDate(h.approval.at)}</span>}</p>
          <p className="muted small" style={{ margin: '8px 0 14px' }}>Approval is one input to the readiness score. It records a human decision; it does not change Jira or Confluence.</p>
          <div className="actions-row">
            <button className="btn primary" disabled={h.approval.status === 'approved'} onClick={() => setConfirm('approved')}><Icon name="check" size={18} /> Approve handover</button>
            <button className="btn danger" disabled={h.approval.status === 'rejected'} onClick={() => setConfirm('rejected')}>Reject</button>
            {h.approval.status !== 'pending' && <button className="btn ghost" onClick={() => setApproval('pending')} disabled={busy}>Reset</button>}
          </div>
        </section>
      </div>

      {confirm && (
        <Modal title={confirm === 'approved' ? 'Approve this handover?' : 'Reject this handover?'} onClose={() => setConfirm(null)}
          footer={<><button className="btn" onClick={() => setConfirm(null)}>Cancel</button><button className={`btn ${confirm === 'approved' ? 'primary' : 'danger'}`} disabled={busy} onClick={() => setApproval(confirm)}>{busy ? 'Saving…' : confirm === 'approved' ? 'Approve' : 'Reject'}</button></>}>
          <p>Current readiness is <strong>{r.score}/100</strong> with <strong>{openQ}</strong> open question(s) and <strong>{a.contradictions.length}</strong> conflict(s). Your name and the time are recorded in the audit trail.</p>
          <div style={{ marginTop: 16 }}><TextField multiline label="Note (optional)" value={note} maxLength={500} onChange={setNote} /></div>
        </Modal>
      )}
    </div>
  );
}

/* ---------------- Evidence ---------------- */
const CATS: Record<string, string> = {
  requirement: 'Confirmed requirements', openRequirement: 'Open requirements', decision: 'Decisions', dependency: 'Dependencies', risk: 'Risks & blockers',
  owner: 'Owners', date: 'Dates', task: 'Jira tasks', scopeOut: 'Out of scope', question: 'Unresolved questions',
};

function Evidence({ a }: { a: Analysis }) {
  const [cat, setCat] = useState('all');
  const groups = useMemo(() => Object.keys(CATS).map((k) => [k, a.facts.filter((f) => f.category === k)] as [string, Fact[]]).filter(([, v]) => v.length), [a]);
  const shown = groups.filter(([k]) => cat === 'all' || cat === k);
  return (
    <div className="stack">
      <div className="card">
        <Combobox label="Show category" searchable={false} value={cat} onChange={setCat} options={[{ value: 'all', label: `All (${a.facts.length})` }, ...groups.map(([k, v]) => ({ value: k, label: `${CATS[k]} (${v.length})` }))]} />
        <p className="muted small" style={{ marginTop: 8 }}>Each item quotes the exact source text. “Verified” means the text is present in the source; it does not mean the source itself is correct.</p>
      </div>
      {shown.length === 0 && <EmptyState icon="list" title="No evidence extracted" body="The retrieved sources did not contain recognizable requirements, decisions or risks." />}
      {shown.map(([k, items]) => (
        <section className="card" key={k} aria-labelledby={`cat-${k}`}>
          <h2 id={`cat-${k}`} style={{ marginBottom: 12 }}>{CATS[k]} <span className="muted small">({items.length})</span></h2>
          <div className="stack">
            {items.map((f) => (
              <article className="evi" key={f.id}>
                <div className="row"><strong style={{ overflowWrap: 'anywhere' }}>{f.text}</strong><KindBadge kind={f.kind} /></div>
                {f.excerpt && <blockquote>“{f.excerpt}”</blockquote>}
                <div className="muted small" style={{ marginTop: 8 }}><Icon name="link" size={14} /> <ExtLink href={f.sourceUrl}>{f.sourceTitle}</ExtLink></div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/* ---------------- Conflicts ---------------- */
function Conflicts({ a }: { a: Analysis }) {
  if (!a.contradictions.length) return <EmptyState icon="check" title="No conflicts detected" body="No contradicting owners, dates or scope statements were found across the retrieved sources. This does not prove the sources agree on everything." />;
  return (
    <div className="stack">
      {a.contradictions.map((c) => (
        <section className="card" key={c.id}>
          <div className="row"><h2><Icon name="alert" size={18} /> {c.summary}</h2><KindBadge kind={c.kind} /></div>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', marginTop: 12 }}>
            {c.sides.map((s, i) => (
              <div className="evi" key={i}>
                <div className="label">{s.label}</div>
                <blockquote>“{s.excerpt}”</blockquote>
                {s.sourceUrl && <div className="small" style={{ marginTop: 8 }}><ExtLink href={s.sourceUrl}>Open source</ExtLink></div>}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/* ---------------- Questions ---------------- */
function Questions({ id, a, update, h, rerun }: { id: string; a: Analysis; update: (p: Payload) => void; h: Handover; rerun: () => void }) {
  const [filter, setFilter] = useState<'open' | 'resolved' | 'all'>('open');
  const [editing, setEditing] = useState<string | null>(null);
  const toast = useToast();
  const list = a.questions.filter((q) => filter === 'all' || q.status === filter);

  async function patch(q: Question, p: Partial<Question>) {
    try {
      const r = await call<{ question: Question }>('updateQuestion', { id, qid: q.id, patch: p });
      update({ handover: h, analysis: { ...a, questions: a.questions.map((x) => (x.id === q.id ? r.question : x)) } });
      return true;
    } catch (e) { toast(msg(e), 'err'); return false; }
  }

  return (
    <div className="stack">
      <div className="card row" style={{ alignItems: 'center' }}>
        <div style={{ minWidth: 200 }}><Combobox label="Show" searchable={false} value={filter} onChange={(v) => setFilter(v as typeof filter)} options={[{ value: 'open', label: 'Open' }, { value: 'resolved', label: 'Resolved' }, { value: 'all', label: 'All' }]} /></div>
        <button className="btn" onClick={rerun}><Icon name="refresh" size={18} /> Re-run after new information</button>
      </div>
      {list.length === 0 ? <EmptyState icon="check" title={filter === 'open' ? 'No open questions' : 'Nothing to show'} body="Your edits and responses are kept when you re-run the analysis." /> : list.map((q) => (
        <QuestionCard key={q.id} q={q} editing={editing === q.id} setEditing={(v) => setEditing(v ? q.id : null)} patch={patch} />
      ))}
    </div>
  );
}

function QuestionCard({ q, editing, setEditing, patch }: { q: Question; editing: boolean; setEditing: (v: boolean) => void; patch: (q: Question, p: Partial<Question>) => Promise<boolean> }) {
  const [text, setText] = useState(q.text);
  const [assignee, setAssignee] = useState(q.assignee || '');
  const [response, setResponse] = useState(q.response);
  useEffect(() => { setText(q.text); setAssignee(q.assignee || ''); setResponse(q.response); }, [q]);
  return (
    <section className="card">
      <div className="row">
        <div style={{ flex: 1, minWidth: 220 }}>
          {editing ? (
            <TextField multiline label="Question" value={text} maxLength={500} onChange={setText} />
          ) : <h3 style={{ textDecoration: q.status === 'resolved' ? 'line-through' : 'none' }}>{q.text}</h3>}
          <p className="muted small" style={{ marginTop: 4 }}><KindBadge kind="missing" /> {q.reason}</p>
        </div>
        <span className={`badge ${q.status === 'resolved' ? 'ok' : 'warn'}`}>{q.status}</span>
      </div>
      <div className="form-grid" style={{ marginTop: 12 }}>
        <TextField label="Assigned to" value={assignee} maxLength={80} hint="Who can answer this?" onChange={setAssignee} onBlur={() => { if (assignee !== (q.assignee || '')) void patch(q, { assignee }); }} />
        <TextField multiline rows={2} label="Response" value={response} maxLength={1000} onChange={setResponse} onBlur={() => { if (response !== q.response) void patch(q, { response }); }} />
      </div>
      <div className="actions-row" style={{ marginTop: 12 }}>
        {editing ? (<><button className="btn primary sm" onClick={async () => { if (await patch(q, { text })) setEditing(false); }}>Save question</button><button className="btn sm" onClick={() => { setText(q.text); setEditing(false); }}>Cancel</button></>) : <button className="btn sm" onClick={() => setEditing(true)}>Edit question</button>}
        <button className="btn sm" onClick={() => patch(q, { status: q.status === 'open' ? 'resolved' : 'open' })}>{q.status === 'open' ? 'Mark resolved' : 'Reopen'}</button>
      </div>
    </section>
  );
}

/* ---------------- Actions (approval-controlled) ---------------- */
function Actions({ id, h, reload }: { id: string; h: Handover; reload: () => void }) {
  const [plan, setPlan] = useState<PlanItem[]>(h.plan || []);
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  useEffect(() => { setPlan(h.plan || []); }, [h.plan]);

  const pending = plan.filter((p) => p.status !== 'created');
  const chosen = pending.filter((p) => sel[p.id] ?? true);

  async function propose() {
    setBusy(true);
    try { const r = await call<{ plan: PlanItem[] }>('proposePlan', { id }); setPlan(r.plan); setSel({}); toast('Changes proposed. Nothing has been created yet.'); } catch (e) { toast(msg(e), 'err'); } finally { setBusy(false); }
  }

  return (
    <div className="stack">
      <section className="card">
        <div className="head"><h2>Proposed changes</h2><button className="btn" onClick={propose} disabled={busy}><Icon name="sparkle" size={18} /> {plan.length ? 'Re-propose from latest analysis' : 'Propose Jira tasks & handover page'}</button></div>
        <p className="muted small"><Icon name="shield" size={14} /> AI proposes · you approve · Forge executes. Nothing is created in Jira or Confluence until you approve it in the dialog.</p>
      </section>
      {plan.length === 0 ? <EmptyState icon="list" title="No proposals yet" body="Generate a proposal to see exactly which Jira issues and Confluence page HandoffIQ would create." /> : (
        <section className="card">
          <div className="stack">
            {plan.map((p) => (
              <article className="evi" key={p.id}>
                <div className="row">
                  <label className="check" style={{ flex: 1, border: 0, background: 'none', padding: 0, minWidth: 220 }}>
                    {p.status !== 'created' && <input type="checkbox" checked={sel[p.id] ?? true} onChange={(e) => setSel({ ...sel, [p.id]: e.target.checked })} />}
                    <span><strong>{p.title}</strong><br /><span className="muted small">{p.type === 'jira-issue' ? `Jira issue · ${p.priority}` : 'Confluence page'} — {p.rationale}</span></span>
                  </label>
                  {p.status === 'created' ? <span className="badge ok">Created</span> : p.status === 'failed' ? <span className="badge danger">Failed</span> : <span className="badge warn">Proposed</span>}
                </div>
                {p.status === 'created' && p.result && <p className="small" style={{ marginTop: 8 }}><ExtLink href={p.result.url}>{p.result.key || p.result.title || 'Open'}</ExtLink> · approved by {p.approvedBy}</p>}
                {p.status === 'failed' && <p className="small" style={{ marginTop: 8, color: '#ffc2ca' }} role="alert">{p.error}</p>}
              </article>
            ))}
          </div>
          <div className="actions-row" style={{ marginTop: 16 }}>
            <button className="btn primary" disabled={!chosen.length} onClick={() => setOpen(true)}><Icon name="check" size={18} /> Review &amp; approve ({chosen.length})</button>
          </div>
        </section>
      )}
      {open && <ApproveDialog id={id} items={chosen} onClose={() => setOpen(false)} onDone={(p) => { setPlan(p); setOpen(false); reload(); }} />}
    </div>
  );
}

function ApproveDialog({ id, items, onClose, onDone }: { id: string; items: PlanItem[]; onClose: () => void; onDone: (plan: PlanItem[]) => void }) {
  const needsJira = items.some((i) => i.type === 'jira-issue');
  const needsConf = items.some((i) => i.type === 'confluence-page');
  const projects = useAsync(() => (needsJira ? call<{ key: string; name: string }[]>('listProjects') : Promise.resolve([])), [needsJira]);
  const spaces = useAsync(() => (needsConf ? call<{ id: string; key: string; name: string }[]>('listSpaces') : Promise.resolve([])), [needsConf]);
  const [projectKey, setProjectKey] = useState('');
  const [spaceId, setSpaceId] = useState('');
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const ready = ack && (!needsJira || projectKey) && (!needsConf || spaceId);

  async function go() {
    setBusy(true);
    try {
      const r = await call<{ results: { ok: boolean; error?: string }[]; plan: PlanItem[] }>('executeApproved', { id, itemIds: items.map((i) => i.id), projectKey, spaceId });
      const bad = r.results.filter((x) => !x.ok).length;
      toast(bad ? `${r.results.length - bad} created, ${bad} failed — see details.` : `${r.results.length} item(s) created.`, bad ? 'err' : 'ok');
      onDone(r.plan);
    } catch (e) { toast(msg(e), 'err'); setBusy(false); }
  }

  return (
    <Modal title="Review and approve changes" onClose={onClose}
      footer={<><button className="btn" onClick={onClose} disabled={busy}>Cancel</button><button className="btn primary" disabled={!ready || busy} onClick={go}>{busy ? 'Creating…' : `Approve & create ${items.length}`}</button></>}>
      <p className="muted small" style={{ marginBottom: 12 }}>These changes will be made as <strong>you</strong>, using your Jira and Confluence permissions. If a permission is missing, that item fails and is reported.</p>
      <div className="stack">
        {needsJira && <Combobox label="Create Jira issues in project" value={projectKey} onChange={setProjectKey} loading={projects.loading} emptyText="No projects you can create issues in." options={(projects.data || []).map((p) => ({ value: p.key, label: p.name, hint: p.key }))} />}
        {needsConf && <Combobox label="Create Confluence page in space" value={spaceId} onChange={setSpaceId} loading={spaces.loading} emptyText="No spaces you can write to." options={(spaces.data || []).map((s) => ({ value: s.id, label: s.name, hint: s.key }))} />}
        <div>
          <span className="label">Will be created ({items.length})</span>
          <ul style={{ margin: '6px 0 0', paddingLeft: 20 }}>{items.map((i) => <li key={i.id}><strong>{i.type === 'jira-issue' ? 'Jira issue' : 'Confluence page'}:</strong> {i.title}</li>)}</ul>
        </div>
        <label className="check"><input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} /><span>I reviewed these changes and approve creating them.</span></label>
      </div>
    </Modal>
  );
}

/* ---------------- Audit ---------------- */
function Audit({ h }: { h: Handover }) {
  const rows = [...h.audit].reverse();
  return (
    <section className="card">
      <h2 style={{ marginBottom: 14 }}>Audit trail</h2>
      <p className="muted small" style={{ marginBottom: 14 }}>Every analysis, approval and Jira/Confluence action is recorded with who did it, when, which analysis version, and the result.</p>
      <ol className="tl">
        {rows.map((e, i) => (
          <li key={i}>
            <div className="row"><strong>{e.action}</strong><span className="muted small">{fmtDate(e.at)} · analysis v{e.analysisVersion}</span></div>
            <div style={{ overflowWrap: 'anywhere' }}>{e.detail}</div>
            <div className="muted small">{e.actor} · result: {/^https?:/.test(e.result) ? <ExtLink href={e.result}>{e.result}</ExtLink> : e.result}</div>
          </li>
        ))}
      </ol>
    </section>
  );
}
