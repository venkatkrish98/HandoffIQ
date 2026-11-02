import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyze } from '../src/lib/engine.js';
import { demoSources } from '../src/lib/demo-data.js';
import {
  HandoffError, escapeHtml, storageToText, adfToText, textToAdf, validateHandoverInput, redact, buildPlan, buildConfluenceDoc, assertId,
} from '../src/lib/format.js';

const valid = { name: 'Northwind', sourceTeam: 'Sales', receivingTeam: 'Delivery', priority: 'High', expectedDelivery: '2026-12-15', jiraProjectKeys: ['ONB'], pageIds: ['12345'] };

test('storageToText strips markup, decodes entities and keeps line breaks', () => {
  const t = storageToText('<h1>Title</h1><p>Must &amp; should</p><ul><li>One</li><li>Two</li></ul><script>x</script>');
  assert.match(t, /Title\nMust & should\nOne\nTwo/);
});

test('adfToText flattens paragraphs; textToAdf round-trips', () => {
  const adf = textToAdf('line one\nline two');
  assert.equal(adf.type, 'doc');
  assert.equal(adfToText(adf).trim(), 'line one\nline two');
  assert.equal(adfToText(null), '');
});

test('validateHandoverInput accepts valid input and normalises it', () => {
  const v = validateHandoverInput({ ...valid, name: '  Northwind  ' });
  assert.equal(v.name, 'Northwind');
  assert.deepEqual(v.jiraProjectKeys, ['ONB']);
});

test('validateHandoverInput rejects bad input with VALIDATION errors', () => {
  const bad = [
    { ...valid, name: '' },
    { ...valid, priority: 'Urgent' },
    { ...valid, expectedDelivery: '15/12/2026' },
    { ...valid, jiraProjectKeys: ['onb; DROP'] },
    { ...valid, pageIds: ['abc'] },
    { ...valid, description: 'x'.repeat(2001) },
  ];
  for (const b of bad) assert.throws(() => validateHandoverInput(b), (e) => e instanceof HandoffError && e.code === 'VALIDATION');
  assert.throws(() => assertId('../etc'), HandoffError);
});

test('escapeHtml and redact neutralise markup and secrets', () => {
  assert.equal(escapeHtml('<img src=x onerror="a">'), '&lt;img src=x onerror=&quot;a&quot;&gt;');
  assert.ok(!redact('Authorization: Bearer abc123secret').includes('abc123secret'));
  assert.ok(!redact('token ATATT3xFfGF0abc_def=ZZ').includes('ATATT3'));
});

test('buildPlan proposes Jira issues for conflicts and one Confluence page, all unexecuted', () => {
  const sources = demoSources();
  const analysis = analyze(sources, { expectedDelivery: '2026-12-15' });
  const plan = buildPlan({ name: 'Northwind' }, analysis, sources);
  assert.ok(plan.some((p) => p.type === 'jira-issue' && /conflict/i.test(p.title)));
  assert.equal(plan.filter((p) => p.type === 'confluence-page').length, 1);
  assert.ok(plan.every((p) => p.status === 'proposed'));
  assert.ok(plan.every((p) => p.title.length <= 200));
  // Regression: a conflict must not be proposed twice (once as "Resolve conflict", once as "Clarify").
  assert.ok(!plan.some((p) => /Clarify: .*(Conflicting|Source states)/.test(p.title)));
  assert.equal(new Set(plan.map((p) => p.title)).size, plan.length);
});

test('buildConfluenceDoc includes all required sections and escapes injected HTML', () => {
  const sources = demoSources();
  sources[0].text += '\nRequirement: The system must <script>alert(1)</script> be safe.';
  const analysis = analyze(sources, { expectedDelivery: '2026-12-15' });
  const doc = buildConfluenceDoc({ name: 'N', sourceTeam: 'A', receivingTeam: 'B', priority: 'High', description: '<b>x</b>' }, analysis, sources);
  for (const s of ['Project overview', 'Confirmed requirements', 'Decisions', 'Conflicting information', 'Open questions', 'Dependencies', 'Risks and blockers', 'Ownership', 'Next actions', 'Source evidence']) {
    assert.ok(doc.includes(s), `missing section ${s}`);
  }
  assert.ok(!doc.includes('<script>'));
  assert.ok(!doc.includes('<b>x</b>'));
});
