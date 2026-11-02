import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyze, parseDate, freshness, computeReadiness, mergeQuestions, extractFacts } from '../src/lib/engine.js';
import { demoSources } from '../src/lib/demo-data.js';

const handover = { expectedDelivery: '2026-12-15' };

test('parseDate handles ISO and long formats and rejects invalid dates', () => {
  assert.equal(parseDate('due 2026-12-15'), '2026-12-15');
  assert.equal(parseDate('Go live on 12 Jan 2027'), '2027-01-12');
  assert.equal(parseDate('March 3, 2027'), '2027-03-03');
  assert.equal(parseDate('2026-02-31'), null);
  assert.equal(parseDate('no date here'), null);
});

test('freshness classifies retrieval age', () => {
  const now = Date.now();
  assert.equal(freshness(new Date(now - 3600e3).toISOString(), now), 'fresh');
  assert.equal(freshness(new Date(now - 3 * 86400e3).toISOString(), now), 'aging');
  assert.equal(freshness(new Date(now - 30 * 86400e3).toISOString(), now), 'stale');
  assert.equal(freshness('garbage', now), 'stale');
});

test('extracts requirements, decisions, dependencies and risks with source excerpts', () => {
  const facts = extractFacts(demoSources());
  const reqs = facts.filter((f) => f.category === 'requirement');
  assert.ok(reqs.length >= 3);
  assert.ok(reqs.every((r) => r.sourceId && r.excerpt));
  assert.ok(facts.some((f) => f.category === 'decision' && /single sign-on/i.test(f.text)));
  assert.ok(facts.some((f) => f.category === 'dependency' && /billing/i.test(f.text)));
  assert.ok(facts.some((f) => f.category === 'risk'));
});

test('detects the conflicting owner and the conflicting go-live date', () => {
  const { contradictions } = analyze(demoSources(), handover);
  const owner = contradictions.find((c) => c.type === 'owner');
  const date = contradictions.find((c) => c.type === 'date');
  assert.ok(owner, 'owner conflict expected');
  assert.match(owner.summary, /Priya Raman/);
  assert.match(owner.summary, /Marcus Lee/);
  assert.equal(owner.sides.length, 2);
  assert.ok(owner.sides.every((s) => s.sourceId && s.excerpt));
  assert.ok(date, 'date conflict expected');
  assert.match(date.summary, /2026-12-15/);
  assert.match(date.summary, /2027-01-12/);
});

test('detects conflicting dates between two sources without any handover date', () => {
  const { contradictions } = analyze(demoSources(), {});
  const c = contradictions.find((x) => x.type === 'date');
  assert.ok(c, 'source-vs-source date conflict expected');
  assert.equal(c.sides.length, 2);
  assert.notEqual(c.sides[0].sourceId, c.sides[1].sourceId);
});

test('does not report a date conflict for different topics', () => {
  const s = [
    { id: 'a', type: 'confluence', title: 'A', url: 'u', retrievedAt: new Date().toISOString(), text: 'Security audit deadline: 2026-11-01.' },
    { id: 'b', type: 'confluence', title: 'B', url: 'u', retrievedAt: new Date().toISOString(), text: 'Billing migration deadline: 2027-02-01.' },
  ];
  assert.equal(analyze(s, {}).contradictions.filter((c) => c.type === 'date').length, 0);
});

test('flags the delivery date that disagrees with the handover form', () => {
  const { contradictions } = analyze(demoSources(), handover);
  assert.ok(contradictions.some((c) => c.kind === 'inferred' && /handover expects/.test(c.summary)));
});

test('flags a requirement that overlaps an out-of-scope statement', () => {
  const sources = demoSources();
  sources.push({
    id: 'confluence:x', type: 'confluence', title: 'Scope', url: 'u', retrievedAt: new Date().toISOString(),
    text: 'Requirement: Mobile app support must be available at launch.\nMobile app support is out of scope.',
  });
  const { contradictions } = analyze(sources, handover);
  assert.ok(contradictions.some((c) => c.type === 'scope'));
});

test('detects missing information: unassigned Jira issue, open items, missing date', () => {
  const { facts, questions } = analyze(demoSources(), handover);
  assert.ok(facts.some((f) => f.category === 'owner' && f.kind === 'missing'));
  assert.ok(questions.some((q) => /Who will own/.test(q.text)));
  assert.ok(questions.some((q) => /open item/i.test(q.text)));
  const empty = analyze([], {});
  assert.ok(empty.questions.some((q) => /delivery date/i.test(q.text)));
  assert.ok(empty.questions.some((q) => /decisions/i.test(q.text)));
});

test('readiness score is bounded, explained, and approval-sensitive', () => {
  const a = analyze(demoSources(), handover);
  assert.ok(a.readiness.score >= 0 && a.readiness.score <= 100);
  assert.equal(a.readiness.dimensions.length, 7);
  assert.ok(a.readiness.dimensions.every((d) => d.why.length > 0));
  assert.equal(a.readiness.dimensions.find((d) => d.key === 'approval').score, 0);
  const approved = computeReadiness(a.facts, a.contradictions, demoSources(), { ...handover, approval: { status: 'approved', by: 'QA' } });
  assert.ok(approved.score > a.readiness.score);
  // Empty input: only dependencies (40 x 10) and blockers (100 x 15) score, over total weight 100 => 19.
  assert.equal(computeReadiness([], [], [], {}).score, 19);
});

test('empty input does not crash and reports not-ready', () => {
  const a = analyze([], {});
  assert.equal(a.readiness.band, 'not-ready');
  assert.deepEqual(a.contradictions, []);
});

test('mergeQuestions preserves human edits and appends only new questions', () => {
  const a = analyze(demoSources(), handover);
  const existing = a.questions.map((q, i) => (i === 0 ? { ...q, status: 'resolved', response: 'Confirmed by PM' } : q));
  const merged = mergeQuestions(existing, a.questions);
  assert.equal(merged.length, existing.length);
  assert.equal(merged[0].status, 'resolved');
  const extra = mergeQuestions(existing, [{ id: 'new', text: 'Entirely unrelated brand new question about zebras', status: 'open' }]);
  assert.equal(extra.length, existing.length + 1);
});
