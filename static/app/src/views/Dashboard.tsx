import { useState } from 'react';
import { call } from '../api';
import { msg, useAsync } from '../hooks';
import type { DashboardData, Handover, Analysis } from '../types';
import { BandBadge, EmptyState, ErrorState, GroupedBars, Icon, LoadingBlock, ScorePill, fmtDate, useToast } from '../ui';

interface Props { open: (id: string) => void; create: () => void }

export function Dashboard({ open, create }: Props) {
  const { data, error, loading, reload } = useAsync(() => call<DashboardData>('dashboard'), []);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  async function demo() {
    setBusy(true);
    try {
      const r = await call<{ handover: Handover; analysis: Analysis }>('loadDemo');
      toast('Demo scenario analyzed with synthetic data.');
      open(r.handover.id);
    } catch (e) { toast(msg(e), 'err'); } finally { setBusy(false); }
  }

  if (loading && !data) return <LoadingBlock label="Loading dashboard" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;

  const t = data.totals;
  if (t.all === 0) {
    return (
      <>
        <Head create={create} />
        <EmptyState icon="sparkle" title="Create your first handover" body="HandoffIQ gathers evidence from Jira and Confluence, flags conflicts and gaps, and prepares a verifiable handover. Start with your own project or explore a synthetic scenario first.">
          <div className="actions-row" style={{ justifyContent: 'center' }}>
            <button className="btn primary" onClick={create}><Icon name="plus" size={18} /> New handover</button>
            <button className="btn" onClick={demo} disabled={busy}>{busy ? 'Analyzing…' : 'Try the synthetic demo'}</button>
          </div>
        </EmptyState>
      </>
    );
  }

  const kpis = [
    { l: 'Active handovers', v: t.active, c: '#5b86ff', i: 'list' },
    { l: 'Ready for handover', v: t.ready, c: '#3fd8a4', i: 'check' },
    { l: 'Missing information', v: t.missingInfo, c: '#f6bd54', i: 'info' },
    { l: 'Awaiting approval', v: t.awaitingApproval, c: '#9a7bff', i: 'clock' },
    { l: 'Critical blockers', v: t.criticalBlockers, c: '#ff7384', i: 'alert' },
  ];

  return (
    <>
      <Head create={create} />
      <section className="grid kpis" aria-label="Key figures">
        {kpis.map((k) => (
          <div className="card kpi" key={k.l} style={{ ['--kpi' as string]: k.c }}>
            <span className="chip"><Icon name={k.i} size={18} /></span>
            <span className="v">{k.v}</span>
            <span className="l">{k.l}</span>
          </div>
        ))}
      </section>
      <div className="grid two" style={{ marginTop: 16 }}>
        <section className="card" aria-labelledby="trend">
          <div className="head"><h2 id="trend">Handover trend</h2><span className="muted small">Last 6 weeks · your handovers</span></div>
          <GroupedBars data={data.weeks.map((w) => ({ label: w.label, a: w.created, b: w.approved }))} labelA="Created" labelB="Approved" />
        </section>
        <section className="card" aria-labelledby="work">
          <div className="head"><h2 id="work">Team workload</h2></div>
          {data.workload.length === 0 ? <p className="muted">No receiving teams yet.</p> : (
            <ul className="stack" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {data.workload.map((w) => (
                <li key={w.team} className="row" style={{ alignItems: 'center' }}>
                  <span><strong>{w.team}</strong><br /><span className="muted small">{w.openQuestions} open question(s)</span></span>
                  <span className="badge info">{w.handovers} handover{w.handovers === 1 ? '' : 's'}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <section className="card" style={{ marginTop: 16 }} aria-labelledby="recent">
        <div className="head"><h2 id="recent">Recently updated</h2></div>
        <table className="table responsive">
          <thead><tr><th>Handover</th><th>Receiving team</th><th>Readiness</th><th>Status</th><th>Updated</th></tr></thead>
          <tbody>
            {data.recent.map((r) => (
              <tr key={r.id}>
                <td><button className="linkish" onClick={() => open(r.id)}>{r.name}</button>{r.demo && <> <span className="badge violet">Synthetic</span></>}</td>
                <td>{r.receivingTeam}</td>
                <td><ScorePill score={r.score} band={r.band} /></td>
                <td><BandBadge band={r.band} /></td>
                <td className="muted">{fmtDate(r.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="cards-list">
          {data.recent.map((r) => (
            <button key={r.id} className="evi" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => open(r.id)}>
              <div className="row"><strong>{r.name}</strong><ScorePill score={r.score} band={r.band} /></div>
              <div className="muted small">{r.receivingTeam} · {r.openQuestions} open question(s)</div>
            </button>
          ))}
        </div>
      </section>
    </>
  );
}

function Head({ create }: { create: () => void }) {
  return (
    <header className="page-head">
      <div>
        <h1>Dashboard</h1>
        <p className="sub">Handover readiness across your teams. Figures come from handovers you created in this site.</p>
      </div>
      <div className="actions-row"><button className="btn primary" onClick={create}><Icon name="plus" size={18} /> New handover</button></div>
    </header>
  );
}
