import { useEffect, useState } from 'react';
import { call } from '../api';
import type { HandoverSummary } from '../types';
import { BandBadge, ScorePill, LoadingBlock, ErrorState } from '../ui';

type Row = HandoverSummary & { via: 'issue' | 'project' };

/** Compact Jira issue panel: which of my handovers include this issue, and how ready they are. */
export default function IssuePanel({ issueKey }: { issueKey: string }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState('');
  const load = () => { setErr(''); setRows(null); call<Row[]>('issueHandovers', { issueKey }).then(setRows, (e) => setErr(e.message)); };
  useEffect(load, [issueKey]); // eslint-disable-line react-hooks/exhaustive-deps
  if (err) return <ErrorState message={err} onRetry={load} />;
  if (!rows) return <LoadingBlock label="Loading handover status" />;
  if (!rows.length) return <p className="muted" style={{ padding: 12 }}>{issueKey} is not part of any of your handovers. Create one from Apps → HandoffIQ.</p>;
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 12, display: 'grid', gap: 10 }}>
      {rows.map((h) => (
        <li key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <ScorePill score={h.score} band={h.band} />
          <span style={{ flex: 1, minWidth: 160 }}>
            <strong>{h.name}</strong>
            <span className="muted" style={{ display: 'block', fontSize: 13 }}>
              {h.sourceTeam} → {h.receivingTeam} · {h.openQuestions} open question(s) · approval: {h.approval} · included via {h.via}
            </span>
          </span>
          <BandBadge band={h.band} />
        </li>
      ))}
    </ul>
  );
}
