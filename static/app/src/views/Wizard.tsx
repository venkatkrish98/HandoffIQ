import { useEffect, useMemo, useState } from 'react';
import { call } from '../api';
import { msg, useAsync } from '../hooks';
import type { Handover, HandoverInput } from '../types';
import { Combobox, DatePicker, FormGrid, TextField } from '../fields';
import { ErrorState, Icon, Modal, useToast } from '../ui';

interface Props { done: (id: string) => void; cancel: () => void }
interface Project { key: string; name: string }
interface Space { id: string; key: string; name: string }
interface Page { id: string; title: string }

const blank: HandoverInput = { name: '', sourceTeam: '', receivingTeam: '', description: '', priority: 'Medium', expectedDelivery: '', jiraProjectKeys: [], jiraIssueKeys: [], pageIds: [], notes: '' };
const STEPS = ['Details', 'Sources', 'Review'];
const NO_SPACE = '__none__';
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'].map((p) => ({ value: p, label: p }));

interface SeedResult { pages: { id: string; title: string; url: string }[]; issues: { key: string; url: string }[] }

/** Approval-gated creation of clearly-labelled synthetic sample content in the user's own project and space. */
function SeedDialog({ projects, spaces, onClose, onDone }: { projects: Project[]; spaces: Space[]; onClose: () => void; onDone: (r: SeedResult, projectKey: string, spaceId: string) => void }) {
  const [projectKey, setProjectKey] = useState('');
  const [spaceId, setSpaceId] = useState(NO_SPACE);
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function go() {
    setBusy(true); setErr('');
    try { const sid = spaceId === NO_SPACE ? '' : spaceId; onDone(await call<SeedResult>('seedDemoData', { projectKey, spaceId: sid }), projectKey, sid); } catch (e) { setErr(msg(e)); setBusy(false); }
  }
  return (
    <Modal title="Create sample content" onClose={onClose}
      footer={<><button className="btn" onClick={onClose} disabled={busy}>Cancel</button><button className="btn primary" disabled={!projectKey || !ack || busy} onClick={go}>{busy ? 'Creating…' : 'Approve & create'}</button></>}>
      <p className="muted small" style={{ marginBottom: 14 }}>This creates synthetic onboarding content prefixed “[Demo]”: <strong>4 Jira issues</strong> plus either <strong>2 Confluence pages</strong> (if you choose a space) or <strong>2 more Jira issues</strong> holding the requirements and meeting notes. It is created as you, with your permissions. Nothing else is changed.</p>
      <div className="stack">
        <Combobox label="Jira project" value={projectKey} onChange={setProjectKey} options={projects.map((p) => ({ value: p.key, label: p.name, hint: p.key }))} />
        <Combobox label="Confluence space (optional)" value={spaceId} onChange={setSpaceId} options={[{ value: NO_SPACE, label: 'None – Jira only' }, ...spaces.map((s) => ({ value: s.id, label: s.name, hint: s.key }))]} />
        <label className="check"><input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} /><span>I approve creating this sample content in my site.</span></label>
        {err && <div className="alert" role="alert">{err}</div>}
      </div>
    </Modal>
  );
}

export function Wizard({ done, cancel }: Props) {
  const [step, setStep] = useState(0);
  const [f, setF] = useState<HandoverInput>(blank);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [spaceId, setSpaceId] = useState('');
  const [manualIssues, setManualIssues] = useState('');
  const [seedOpen, setSeedOpen] = useState(false);
  const toast = useToast();

  const projects = useAsync(() => call<Project[]>('listProjects'), []);
  const spaces = useAsync(() => call<Space[]>('listSpaces'), []);
  const pages = useAsync(() => (spaceId ? call<Page[]>('listPages', { spaceId }) : Promise.resolve([] as Page[])), [spaceId]);

  // Keep titles of selected pages even after the user switches to another space.
  const [pageTitles, setPageTitles] = useState<Record<string, string>>({});
  useEffect(() => { if (pages.data) setPageTitles((t) => ({ ...t, ...Object.fromEntries(pages.data!.map((p) => [p.id, p.title])) })); }, [pages.data]);

  useEffect(() => { document.getElementById('wizard-title')?.focus(); }, [step]);

  const set = <K extends keyof HandoverInput>(k: K, v: HandoverInput[K]) => setF((x) => ({ ...x, [k]: v }));

  const projectOpts = useMemo(() => (projects.data || []).map((p) => ({ value: p.key, label: p.name, hint: p.key })), [projects.data]);
  const spaceOpts = useMemo(() => (spaces.data || []).map((s) => ({ value: s.id, label: s.name, hint: s.key })), [spaces.data]);
  const pageOpts = useMemo(() => {
    const here = (pages.data || []).map((p) => ({ value: p.id, label: p.title }));
    const extra = f.pageIds.filter((id) => !here.some((o) => o.value === id)).map((id) => ({ value: id, label: pageTitles[id] || `Page ${id}` }));
    return [...here, ...extra];
  }, [pages.data, f.pageIds, pageTitles]);

  function validateDetails() {
    const e: Record<string, string> = {};
    if (!f.name.trim()) e.name = 'Enter the project or customer name.';
    if (!f.sourceTeam.trim()) e.sourceTeam = 'Enter the team handing over.';
    if (!f.receivingTeam.trim()) e.receivingTeam = 'Enter the team receiving the handover.';
    setErrs(e);
    return !Object.keys(e).length;
  }

  const issueKeys = () => manualIssues.split(/[\s,;]+/).map((s) => s.trim().toUpperCase()).filter(Boolean);

  function next() {
    if (step === 0 && !validateDetails()) return;
    if (step === 1) {
      const keys = issueKeys();
      if (keys.some((k) => !/^[A-Z][A-Z0-9_]+-\d+$/.test(k))) { setErrs({ issues: 'Issue keys look like ONB-12, separated by commas.' }); return; }
      if (!f.jiraProjectKeys.length && !keys.length && !f.pageIds.length) { setErrs({ sources: 'Select at least one Jira project, issue or Confluence page so there is evidence to analyze.' }); return; }
      set('jiraIssueKeys', keys);
      setErrs({});
    }
    setStep(step + 1);
  }

  async function submit() {
    setBusy(true);
    try {
      const h = await call<Handover>('createHandover', { input: { ...f, jiraIssueKeys: issueKeys() } });
      toast('Handover created. Retrieving evidence…');
      try { await call('runAnalysis', { id: h.id }); toast('Analysis complete.'); } catch (e) { toast(`Created, but analysis failed: ${msg(e)}`, 'err'); }
      done(h.id);
    } catch (e) { toast(msg(e), 'err'); setBusy(false); }
  }

  return (
    <>
      <header className="page-head">
        <div><h1 id="wizard-title" tabIndex={-1}>New handover</h1><p className="sub">Three steps. HandoffIQ only reads what your own Atlassian permissions allow.</p></div>
        <button className="btn ghost" onClick={cancel}><Icon name="back" size={18} /> Cancel</button>
      </header>
      <ol className="steps" aria-label="Progress" style={{ listStyle: 'none', padding: 0 }}>
        {STEPS.map((s, i) => <li key={s} className={`step${i <= step ? ' on' : ''}`} aria-current={i === step ? 'step' : undefined}><span className="n">{i < step ? <Icon name="check" size={14} /> : i + 1}</span>{s}</li>)}
      </ol>

      {seedOpen && (
        <SeedDialog projects={projects.data || []} spaces={spaces.data || []} onClose={() => setSeedOpen(false)}
          onDone={(r, _projectKey, sid) => {
            setSeedOpen(false);
            setSpaceId(sid);
            setPageTitles((t) => ({ ...t, ...Object.fromEntries(r.pages.map((p) => [p.id, p.title])) }));
            setManualIssues(r.issues.map((i) => i.key).join(', '));
            setF((x) => ({ ...x, pageIds: [...new Set([...x.pageIds, ...r.pages.map((p) => p.id)])] }));
            toast(`Created ${r.pages.length} page(s) and ${r.issues.length} issue(s). They are selected as sources.`);
            pages.reload();
          }} />
      )}
      <div className="card">
        {step === 0 && (
          <FormGrid>
            <TextField full label="Project / customer name" value={f.name} maxLength={120} error={errs.name} onChange={(v) => set('name', v)} />
            <TextField label="Source team" value={f.sourceTeam} maxLength={80} error={errs.sourceTeam} onChange={(v) => set('sourceTeam', v)} />
            <TextField label="Receiving team" value={f.receivingTeam} maxLength={80} error={errs.receivingTeam} onChange={(v) => set('receivingTeam', v)} />
            <Combobox label="Business priority" options={PRIORITIES} value={f.priority} searchable={false} onChange={(v) => set('priority', v)} />
            <DatePicker label="Expected delivery date" value={f.expectedDelivery} hint="Compared with dates found in your sources." onChange={(v) => set('expectedDelivery', v)} />
            <TextField full multiline rows={4} label="Project description" value={f.description} maxLength={2000} hint="Treated as a user-provided assumption, not verified fact." onChange={(v) => set('description', v)} />
          </FormGrid>
        )}

        {step === 1 && (
          <div className="stack" style={{ gap: 22 }}>
            {errs.sources && <div className="alert" role="alert">{errs.sources}</div>}
            <section>
              <h2 className="mb-1">Jira</h2>
              <p className="muted small mb-3">All recent issues in each selected project are analyzed (up to 50).</p>
              {projects.error ? <ErrorState message={projects.error} onRetry={projects.reload} /> : (
                <FormGrid>
                  <Combobox multiple full label="Jira projects" options={projectOpts} value={f.jiraProjectKeys} loading={projects.loading}
                    emptyText="No Jira projects are visible to you." onChange={(v) => set('jiraProjectKeys', v)} hint={projects.loading ? undefined : `${projectOpts.length} project(s) available. Type to search.`} />
                  <TextField full label="Specific Jira issues (optional)" value={manualIssues} error={errs.issues} hint="Comma-separated keys, e.g. ONB-12, ONB-15" onChange={setManualIssues} />
                </FormGrid>
              )}
            </section>
            <div className="evi row" style={{ alignItems: 'center' }}>
              <span className="small"><strong>No content to analyze yet?</strong><br /><span className="muted">Create clearly-labelled synthetic sample content in a project and space you choose.</span></span>
              <button className="btn sm" onClick={() => setSeedOpen(true)}><Icon name="sparkle" size={16} /> Create sample content</button>
            </div>
            <section>
              <h2 className="mb-3">Confluence</h2>
              {spaces.error ? <ErrorState message={spaces.error} onRetry={spaces.reload} /> : (
                <FormGrid>
                  <Combobox label="Space" options={spaceOpts} value={spaceId} loading={spaces.loading} emptyText="No Confluence spaces are visible to you." onChange={setSpaceId} />
                  <Combobox multiple label="Pages" options={pageOpts} value={f.pageIds} loading={pages.loading} disabled={!spaceId && f.pageIds.length === 0}
                    emptyText={spaceId ? 'No pages in this space.' : 'Choose a space first.'} onChange={(v) => set('pageIds', v)}
                    hint={f.pageIds.length ? `${f.pageIds.length} page(s) selected` : spaceId ? 'Type to search pages.' : 'Pick a space to list its pages.'} />
                </FormGrid>
              )}
            </section>
          </div>
        )}

        {step === 2 && (
          <div className="stack" style={{ gap: 18 }}>
            <TextField multiline rows={3} label="Additional notes (optional)" value={f.notes} maxLength={2000} hint="Recorded as a user-provided assumption." onChange={(v) => set('notes', v)} />
            <h2>Review</h2>
            <dl className="m-0 grid grid-cols-[minmax(110px,190px)_1fr] gap-x-4 gap-y-2">
              <dt className="muted">Name</dt><dd className="m-0">{f.name}</dd>
              <dt className="muted">Handover</dt><dd className="m-0">{f.sourceTeam} → {f.receivingTeam}</dd>
              <dt className="muted">Priority</dt><dd className="m-0">{f.priority}</dd>
              <dt className="muted">Expected delivery</dt><dd className="m-0">{f.expectedDelivery || 'Not set'}</dd>
              <dt className="muted">Jira</dt><dd className="m-0">{[...f.jiraProjectKeys, ...issueKeys()].join(', ') || 'None'}</dd>
              <dt className="muted">Confluence pages</dt><dd className="m-0">{f.pageIds.length}</dd>
            </dl>
            <p className="muted small">Creating the handover retrieves evidence and runs the analysis. Nothing is written to Jira or Confluence without your approval.</p>
          </div>
        )}

        <div className="actions-row" style={{ justifyContent: 'space-between', marginTop: 24 }}>
          <button className="btn" onClick={() => setStep(step - 1)} disabled={step === 0 || busy}>Back</button>
          {step < 2 ? <button className="btn primary" onClick={next}>Continue</button> : <button className="btn primary" onClick={submit} disabled={busy}>{busy ? 'Working…' : 'Create and analyze'}</button>}
        </div>
      </div>
    </>
  );
}
