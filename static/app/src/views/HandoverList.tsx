import { useMemo, useState } from 'react';
import { call } from '../api';
import { msg, useAsync } from '../hooks';
import type { HandoverSummary } from '../types';
import { Combobox, TextField } from '../fields';
import { BandBadge, EmptyState, ErrorState, Icon, LoadingBlock, ScorePill, fmtDate, fmtDay, useToast } from '../ui';

interface Props { open: (id: string) => void; create: () => void }

export function HandoverList({ open, create }: Props) {
  const { data, error, loading, reload } = useAsync(() => call<HandoverSummary[]>('listHandovers'), []);
  const [q, setQ] = useState('');
  const [band, setBand] = useState('all');
  const toast = useToast();

  const rows = useMemo(() => (data || []).filter((h) => (band === 'all' || h.band === band || (band === 'none' && !h.band)) && h.name.toLowerCase().includes(q.toLowerCase())), [data, q, band]);

  async function demo() {
    try { const r = await call<{ handover: { id: string } }>('loadDemo'); toast('Demo scenario analyzed with synthetic data.'); open(r.handover.id); } catch (e) { toast(msg(e), 'err'); }
  }

  return (
    <>
      <header className="page-head">
        <div><h1>Handovers</h1><p className="sub">Every handover you created, with its current readiness.</p></div>
        <div className="actions-row"><button className="btn primary" onClick={create}><Icon name="plus" size={18} /> New handover</button></div>
      </header>
      {loading && !data ? <LoadingBlock label="Loading handovers" /> : error ? <ErrorState message={error} onRetry={reload} /> : !data || data.length === 0 ? (
        <EmptyState icon="list" title="No handovers yet" body="Create a handover from Jira projects and Confluence pages, or explore the synthetic scenario.">
          <div className="actions-row" style={{ justifyContent: 'center' }}>
            <button className="btn primary" onClick={create}>New handover</button>
            <button className="btn" onClick={demo}>Try the synthetic demo</button>
          </div>
        </EmptyState>
      ) : (
        <section className="card">
          <div className="form-grid" style={{ marginBottom: 14 }}>
            <TextField label="Search by name" value={q} onChange={setQ} />
            <Combobox label="Readiness" searchable={false} value={band} onChange={setBand} options={[{ value: 'all', label: 'All' }, { value: 'ready', label: 'Ready' }, { value: 'needs-work', label: 'Needs work' }, { value: 'not-ready', label: 'Not ready' }, { value: 'none', label: 'Not analyzed' }]} />
          </div>
          {rows.length === 0 ? <p className="muted">No handovers match these filters.</p> : (
            <>
              <table className="table responsive">
                <thead><tr><th>Handover</th><th>Teams</th><th>Priority</th><th>Delivery</th><th>Readiness</th><th>Open Qs</th><th>Updated</th></tr></thead>
                <tbody>
                  {rows.map((h) => (
                    <tr key={h.id}>
                      <td><button className="linkish" onClick={() => open(h.id)}>{h.name}</button>{h.demo && <> <span className="badge violet">Synthetic</span></>}</td>
                      <td>{h.sourceTeam} → {h.receivingTeam}</td>
                      <td>{h.priority}</td>
                      <td>{fmtDay(h.expectedDelivery)}</td>
                      <td><ScorePill score={h.score} band={h.band} /> <BandBadge band={h.band} /></td>
                      <td>{h.openQuestions}</td>
                      <td className="muted">{fmtDate(h.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="cards-list">
                {rows.map((h) => (
                  <button key={h.id} className="evi" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => open(h.id)}>
                    <div className="row"><strong>{h.name}</strong><ScorePill score={h.score} band={h.band} /></div>
                    <div className="muted small">{h.sourceTeam} → {h.receivingTeam} · {h.priority} · {h.openQuestions} open</div>
                    <div style={{ marginTop: 6 }}><BandBadge band={h.band} /></div>
                  </button>
                ))}
              </div>
            </>
          )}
        </section>
      )}
    </>
  );
}
