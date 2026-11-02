/**
 * HandoffIQ business logic, shared by the UI resolvers and the Rovo actions.
 * Human control rule: nothing is written to Jira or Confluence unless the
 * caller passes item ids that the user explicitly approved.
 */
import { analyze, mergeQuestions, computeReadiness, freshness } from './engine.js';
import { demoSources, DEMO_PAGES, DEMO_ISSUES } from './demo-data.js';
import {
  HandoffError, validateHandoverInput, buildPlan, buildConfluenceDoc, assertId, escapeHtml, PATTERNS, redact,
} from './format.js';
import * as atl from './atlassian.js';
import * as store from './store.js';

const MAX_SOURCES = 60;

/* ---------- creation & lookup ---------- */

export async function createHandover(me, input, { demo = false } = {}) {
  const data = validateHandoverInput(input);
  const rec = {
    id: store.newId(), ownerId: me.accountId, ownerName: me.displayName, ...data,
    demo, createdAt: new Date().toISOString(), analysisVersion: 0, approval: { status: 'pending' }, plan: [], history: [], audit: [], sources: [],
  };
  store.audit(rec, me.displayName, 'handover.created', `Created handover "${rec.name}"${demo ? ' (synthetic demo data)' : ''}`);
  await store.saveHandover(me.accountId, rec); // no analysis yet (KVS rejects null values)
  return rec;
}

export async function getHandover(me, id) {
  const { rec, analysis } = await store.getHandover(me.accountId, id);
  return { handover: rec, analysis: analysis ? withFreshness(analysis, rec) : null };
}

function withFreshness(analysis, rec) {
  const sources = (rec.sources || []).map((s) => ({ ...s, freshness: freshness(s.retrievedAt) }));
  return { ...analysis, sources };
}

/* ---------- discovery + analysis ---------- */

export async function runAnalysis(me, id) {
  const { rec, analysis: prev } = await store.getHandover(me.accountId, id);
  const retrievedAt = new Date().toISOString();
  let sources;
  let warnings = [];
  if (rec.demo) {
    sources = demoSources(retrievedAt);
  } else {
    const jiraRes = await atl.fetchJiraSources({ projectKeys: rec.jiraProjectKeys, issueKeys: rec.jiraIssueKeys }, retrievedAt).catch((e) => ({ sources: [], warnings: [{ sourceId: 'jira', code: e.code, message: e.message }] }));
    const confRes = await atl.fetchConfluenceSources(rec.pageIds, retrievedAt);
    sources = [...jiraRes.sources, ...confRes.sources].slice(0, MAX_SOURCES);
    warnings = [...jiraRes.warnings, ...confRes.warnings];
  }
  if (!sources.length) {
    throw new HandoffError('VALIDATION', warnings.length ? `No sources could be retrieved: ${warnings.map((w) => w.message).join(' ')}` : 'Select at least one Jira project/issue or Confluence page.');
  }
  const result = analyze(sources, rec);
  // Preserve human work on questions across re-runs.
  const questions = prev ? mergeQuestions(prev.questions, result.questions) : result.questions;
  rec.analysisVersion += 1;
  // Data minimisation: store excerpts (inside facts) and source metadata, never full source bodies.
  rec.sources = sources.map(({ id: sid, type, title, url, retrievedAt: at, meta }) => ({ id: sid, type, title, url, retrievedAt: at, updated: meta?.updated || null }));
  const stored = { ...result, questions, warnings, generatedAt: retrievedAt, version: rec.analysisVersion };
  stored.readiness = computeReadiness(stored.facts, stored.contradictions, rec.sources, rec);
  rec.history.push({ at: retrievedAt, score: stored.readiness.score });
  store.audit(rec, me.displayName, 'analysis.run', `Analysis v${rec.analysisVersion}: ${sources.length} source(s), ${stored.facts.length} claim(s), ${stored.contradictions.length} conflict(s)`, warnings.length ? `${warnings.length} source(s) not retrievable` : 'ok');
  await store.saveHandover(me.accountId, rec, stored);
  return { handover: rec, analysis: withFreshness(stored, rec) };
}

/* ---------- clarification workflow ---------- */

export async function updateQuestion(me, id, qid, patch) {
  const { rec, analysis } = await store.getHandover(me.accountId, id);
  if (!analysis) throw new HandoffError('VALIDATION', 'Run an analysis first.');
  const q = analysis.questions.find((x) => x.id === qid);
  if (!q) throw new HandoffError('NOT_FOUND', 'Question not found.', 404);
  if (typeof patch.text === 'string') {
    if (!patch.text.trim() || patch.text.length > 500) throw new HandoffError('VALIDATION', 'Question text must be 1–500 characters.');
    q.text = patch.text.trim();
  }
  if (typeof patch.assignee === 'string') q.assignee = patch.assignee.trim().slice(0, 80) || null;
  if (typeof patch.response === 'string') q.response = patch.response.slice(0, 1000);
  if (patch.status) {
    if (!['open', 'resolved'].includes(patch.status)) throw new HandoffError('VALIDATION', 'Invalid status.');
    q.status = patch.status;
  }
  store.audit(rec, me.displayName, 'question.updated', `${q.id}: ${Object.keys(patch).join(', ')}`);
  await store.saveHandover(me.accountId, rec, analysis);
  return { question: q };
}

/** Receiving-team approval of the handover itself (feeds the readiness model). */
export async function setHandoverApproval(me, id, status, note = '') {
  if (!['approved', 'pending', 'rejected'].includes(status)) throw new HandoffError('VALIDATION', 'Invalid approval status.');
  const { rec, analysis } = await store.getHandover(me.accountId, id);
  rec.approval = { status, by: me.displayName, at: new Date().toISOString(), note: String(note).slice(0, 500) };
  store.audit(rec, me.displayName, 'handover.approval', `Handover marked ${status}`);
  if (analysis) {
    analysis.readiness = computeReadiness(analysis.facts, analysis.contradictions, rec.sources, rec);
    rec.history.push({ at: new Date().toISOString(), score: analysis.readiness.score });
  }
  await store.saveHandover(me.accountId, rec, analysis ?? undefined);
  return { handover: rec, analysis: analysis ? withFreshness(analysis, rec) : null };
}

/* ---------- proposal → approval → execution ---------- */

export async function proposePlan(me, id) {
  const { rec, analysis } = await store.getHandover(me.accountId, id);
  if (!analysis) throw new HandoffError('VALIDATION', 'Run an analysis before proposing changes.');
  const done = (rec.plan || []).filter((p) => p.status === 'created');
  rec.plan = [...done, ...buildPlan(rec, analysis, rec.sources).filter((p) => !done.some((d) => d.title === p.title))];
  store.audit(rec, me.displayName, 'plan.proposed', `${rec.plan.length} proposed change(s); nothing has been created yet`);
  await store.saveHandover(me.accountId, rec, undefined);
  return { plan: rec.plan };
}

/**
 * Execute ONLY the items the user approved. Each result (success or failure) is
 * written to the audit trail. Failures never abort the remaining approved items.
 */
export async function executeApproved(me, id, { itemIds, projectKey, spaceId }) {
  const { rec, analysis } = await store.getHandover(me.accountId, id);
  if (!analysis) throw new HandoffError('VALIDATION', 'Run an analysis first.');
  if (!Array.isArray(itemIds) || !itemIds.length) throw new HandoffError('VALIDATION', 'Approve at least one proposed change.');
  const items = rec.plan.filter((p) => itemIds.includes(p.id) && p.status !== 'created');
  const needsJira = items.some((p) => p.type === 'jira-issue');
  const needsConf = items.some((p) => p.type === 'confluence-page');
  if (needsJira && !PATTERNS.projectKey.test(projectKey || '')) throw new HandoffError('VALIDATION', 'Choose a target Jira project.');
  if (needsConf && !/^\d{1,20}$/.test(String(spaceId || ''))) throw new HandoffError('VALIDATION', 'Choose a target Confluence space.');

  rec.lastTarget = { projectKey: projectKey || null, spaceId: spaceId ? String(spaceId) : null };
  const results = [];
  const created = rec.plan.filter((p) => p.status === 'created' && p.type === 'jira-issue').map((p) => ({ key: p.result.key, url: p.result.url, title: p.title }));
  // Jira first so the Confluence page can reference the created issue keys.
  for (const it of [...items.filter((p) => p.type === 'jira-issue'), ...items.filter((p) => p.type === 'confluence-page')]) {
    it.approvedBy = me.displayName;
    it.approvedAt = new Date().toISOString();
    try {
      if (it.type === 'jira-issue') {
        const out = await atl.createJiraIssue({ projectKey, title: it.title, description: it.description, priority: it.priority, assigneeId: null });
        it.status = 'created';
        it.result = out;
        created.push({ key: out.key, url: out.url, title: it.title });
        store.audit(rec, me.displayName, 'jira.issue.created', `${out.key} in ${projectKey}: ${it.title}`, out.url);
        const anchor = (rec.jiraIssueKeys || [])[0];
        if (anchor) await atl.linkIssues(out.key, anchor).catch(() => store.audit(rec, 'HandoffIQ', 'jira.link.skipped', `Could not link ${out.key} to ${anchor}`, 'non-fatal'));
      } else {
        const body = buildConfluenceDoc(rec, analysis, rec.sources, created);
        const out = await atl.createConfluencePage({ spaceId: String(spaceId), title: it.title, storageBody: body });
        it.status = 'created';
        it.result = out;
        store.audit(rec, me.displayName, 'confluence.page.created', `${out.title}`, out.url);
      }
      results.push({ id: it.id, ok: true, result: it.result });
    } catch (e) {
      it.status = 'failed';
      it.error = redact(e.message);
      store.audit(rec, me.displayName, it.type === 'jira-issue' ? 'jira.issue.failed' : 'confluence.page.failed', it.title, `${e.code || 'ERROR'}: ${redact(e.message)}`);
      results.push({ id: it.id, ok: false, code: e.code || 'ERROR', error: redact(e.message) });
    }
  }
  await store.saveHandover(me.accountId, rec, analysis);
  return { results, plan: rec.plan };
}

/* ---------- dashboard ---------- */

export async function dashboard(me) {
  const all = await store.listHandovers(me.accountId);
  const loaded = await Promise.all(all.map(async (r) => ({ rec: r, an: (await store.getHandover(me.accountId, r.id)).analysis })));
  const latestScore = (r) => (r.history.length ? r.history[r.history.length - 1].score : null);
  const openQ = (an) => (an ? an.questions.filter((q) => q.status === 'open').length : 0);
  const blockers = (an) => (an ? an.facts.filter((f) => f.category === 'risk' && f.critical).length : 0);
  const ready = loaded.filter(({ rec, an }) => an && an.readiness.band === 'ready' && rec.approval.status !== 'rejected');
  const awaiting = loaded.filter(({ rec, an }) => an && rec.approval.status !== 'approved');
  const missing = loaded.filter(({ an }) => openQ(an) > 0);

  const weeks = [];
  const now = Date.now();
  for (let i = 5; i >= 0; i--) {
    const start = now - (i + 1) * 7 * 864e5;
    const end = now - i * 7 * 864e5;
    const within = (iso) => iso && new Date(iso).getTime() >= start && new Date(iso).getTime() < end;
    weeks.push({
      label: new Date(end - 864e5).toISOString().slice(5, 10),
      created: loaded.filter(({ rec }) => within(rec.createdAt)).length,
      approved: loaded.filter(({ rec }) => rec.approval.status === 'approved' && within(rec.approval.at)).length,
    });
  }
  const teams = {};
  for (const { rec, an } of loaded) {
    const t = (teams[rec.receivingTeam] = teams[rec.receivingTeam] || { team: rec.receivingTeam, handovers: 0, openQuestions: 0 });
    t.handovers += 1;
    t.openQuestions += openQ(an);
  }
  return {
    totals: {
      active: loaded.filter(({ rec }) => rec.approval.status !== 'approved').length,
      ready: ready.length,
      missingInfo: missing.length,
      awaitingApproval: awaiting.length,
      criticalBlockers: loaded.reduce((s, { an }) => s + blockers(an), 0),
      all: loaded.length,
    },
    recent: loaded
      .sort((a, b) => b.rec.updatedAt.localeCompare(a.rec.updatedAt))
      .slice(0, 6)
      .map(({ rec, an }) => ({ id: rec.id, name: rec.name, receivingTeam: rec.receivingTeam, score: latestScore(rec), band: an?.readiness.band || null, updatedAt: rec.updatedAt, demo: rec.demo, openQuestions: openQ(an) })),
    weeks,
    workload: Object.values(teams).sort((a, b) => b.handovers - a.handovers),
  };
}

export async function listHandoverSummaries(me) {
  const all = await store.listHandovers(me.accountId);
  const out = [];
  for (const r of all) {
    const { analysis } = await store.getHandover(me.accountId, r.id);
    out.push({
      id: r.id, name: r.name, sourceTeam: r.sourceTeam, receivingTeam: r.receivingTeam, priority: r.priority, expectedDelivery: r.expectedDelivery, demo: r.demo,
      updatedAt: r.updatedAt, approval: r.approval.status,
      score: r.history.length ? r.history[r.history.length - 1].score : null,
      band: analysis?.readiness.band || null,
      openQuestions: analysis ? analysis.questions.filter((q) => q.status === 'open').length : 0,
      analyzed: !!analysis,
    });
  }
  return out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/* ---------- demo scenario ---------- */

/** Offline scenario: runs the real engine over clearly-labelled synthetic sources. */
export async function loadDemoScenario(me) {
  const rec = await createHandover(me, {
    name: 'Northwind – Customer Onboarding Workflow (demo)',
    sourceTeam: 'Sales Engineering',
    receivingTeam: 'Implementation',
    description: 'Synthetic demo: client wants a new customer onboarding workflow.',
    priority: 'High',
    expectedDelivery: '2026-12-15',
    notes: 'Assumption: the legacy CRM export will be available by mid-November.',
  }, { demo: true });
  return runAnalysis(me, rec.id);
}

/**
 * Writes the synthetic scenario into the user's real Jira project and
 * Confluence space (so discovery can be demonstrated on live data). Only called
 * after an explicit confirmation in the UI.
 */
export async function seedDemoData(me, { projectKey, spaceId }) {
  if (!PATTERNS.projectKey.test(projectKey || '')) throw new HandoffError('VALIDATION', 'Choose a Jira project.');
  const withPages = !!spaceId;
  if (withPages && !/^d{1,20}$/.test(String(spaceId))) throw new HandoffError('VALIDATION', 'Choose a valid Confluence space.');
  const pages = [];
  const issues = [];
  for (const p of DEMO_PAGES) {
    if (withPages) {
      const body = `<p><em>Synthetic demo content created by HandoffIQ.</em></p><ul>${p.lines.map((l) => `<li>${escapeHtml(l)}</li>`).join('')}</ul>`;
      pages.push(await atl.createConfluencePage({ spaceId: String(spaceId), title: p.title, storageBody: body }));
    } else {
      // Jira-only sites: the same synthetic "document" content goes into the description of a Jira issue.
      issues.push(await atl.createJiraIssue({ projectKey, title: `[Demo] ${p.title}`, description: p.lines.join('\n'), priority: 'Medium', assigneeId: null }));
    }
  }
  for (const t of DEMO_ISSUES) {
    issues.push(await atl.createJiraIssue({ projectKey, title: `[Demo] ${t.summary}`, description: t.description, priority: t.priority, assigneeId: t.assignToMe ? me.accountId : null }));
  }
  return { pages, issues };
}
