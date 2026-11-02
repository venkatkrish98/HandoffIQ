/**
 * Rovo actions: the tools the HandoffIQ Rovo agent can call. They run as the
 * invoking user. The only action that writes to Jira/Confluence
 * (`createApprovedItems`) refuses to run unless the user has already
 * approved items in the HandoffIQ app — the agent can propose, never self-approve.
 */
import * as svc from './lib/service.js';
import * as atl from './lib/atlassian.js';
import * as store from './lib/store.js';
import { HandoffError, redact } from './lib/format.js';

async function user() {
  const me = await atl.whoAmI();
  return me;
}

async function findHandover(me, name) {
  const all = await store.listHandovers(me.accountId);
  if (!all.length) throw new HandoffError('NOT_FOUND', 'You have no handovers yet. Create one in the HandoffIQ app first.');
  const q = String(name || '').trim().toLowerCase();
  const hits = q ? all.filter((h) => h.name.toLowerCase().includes(q)) : all.length === 1 ? all : [];
  if (hits.length === 1) return hits[0];
  if (!hits.length) throw new HandoffError('NOT_FOUND', `No handover matches "${name}". Available: ${all.map((h) => h.name).join('; ')}`);
  throw new HandoffError('VALIDATION', `"${name}" is ambiguous. Matches: ${hits.map((h) => h.name).join('; ')}`);
}

/** Wrap an action so failures come back as readable text for the agent instead of a crash. */
function action(fn) {
  return async (payload) => {
    try {
      return await fn(await user(), payload || {});
    } catch (e) {
      console.error('[rovo-action]', e.code || 'UNEXPECTED', redact(e.message));
      return { error: true, message: e instanceof HandoffError ? e.message : 'The action failed unexpectedly.' };
    }
  };
}

const brief = (analysis) => ({
  readiness: { score: analysis.readiness.score, band: analysis.readiness.band, method: analysis.readiness.method, dimensions: analysis.readiness.dimensions.map((d) => ({ label: d.label, score: d.score, why: d.why })) },
  conflicts: analysis.contradictions.map((c) => ({ summary: c.summary, evidence: c.sides.map((s) => ({ source: s.label, url: s.sourceUrl, excerpt: s.excerpt })) })),
  openQuestions: analysis.questions.filter((q) => q.status === 'open').map((q) => ({ question: q.text, reason: q.reason, assignee: q.assignee })),
});

export const listHandovers = action(async (me) => {
  const list = await svc.listHandoverSummaries(me);
  return { handovers: list.map((h) => ({ name: h.name, receivingTeam: h.receivingTeam, readinessScore: h.score, band: h.band, openQuestions: h.openQuestions, approval: h.approval, analyzed: h.analyzed })) };
});

export const analyzeHandover = action(async (me, p) => {
  const rec = await findHandover(me, p.handoverName);
  const { analysis, handover } = await svc.runAnalysis(me, rec.id);
  return { handover: handover.name, analysisVersion: analysis.version, sourcesRetrieved: analysis.sources.length, warnings: analysis.warnings, ...brief(analysis), note: 'Verified items cite a source. Conflicts are inferences from comparing sources.' };
});

export const getHandoverGaps = action(async (me, p) => {
  const rec = await findHandover(me, p.handoverName);
  const { analysis, handover } = await svc.getHandover(me, rec.id);
  if (!analysis) return { message: `"${handover.name}" has not been analyzed yet. Run the analyze action first.` };
  return { handover: handover.name, ...brief(analysis), staleSources: analysis.sources.filter((s) => s.freshness === 'stale').map((s) => s.title) };
});

export const proposeHandoverActions = action(async (me, p) => {
  const rec = await findHandover(me, p.handoverName);
  const { plan } = await svc.proposePlan(me, rec.id);
  return {
    message: 'These changes are PROPOSED only. Nothing has been created. Ask the user to review and approve them in the HandoffIQ app.',
    proposed: plan.filter((i) => i.status === 'proposed').map((i) => ({ type: i.type, title: i.title, why: i.rationale })),
  };
});

export const createApprovedItems = action(async (me, p) => {
  const rec = await findHandover(me, p.handoverName);
  const { handover } = await svc.getHandover(me, rec.id);
  const approvedPending = (handover.plan || []).filter((i) => i.approvedBy && i.status !== 'created');
  if (!approvedPending.length) {
    return { message: 'There are no user-approved items waiting. Approve items in the HandoffIQ app (Actions tab); the agent cannot approve on the user\'s behalf.' };
  }
  const target = handover.lastTarget || {};
  const out = await svc.executeApproved(me, rec.id, { itemIds: approvedPending.map((i) => i.id), projectKey: target.projectKey, spaceId: target.spaceId });
  return { results: out.results };
});
