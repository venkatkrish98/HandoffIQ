/**
 * PREVIEW-ONLY backend used by the `--mode mock` build for visual/responsive QA.
 * It runs the real analysis engine on synthetic sources but SIMULATES Jira and
 * Confluence writes; the UI shows a permanent banner in this mode. It is never
 * bundled into the Forge deployment.
 */
import { analyze, computeReadiness, mergeQuestions } from '../../../src/lib/engine.js';
import { demoSources } from '../../../src/lib/demo-data.js';
import { buildPlan, validateHandoverInput } from '../../../src/lib/format.js';

/* eslint-disable @typescript-eslint/no-explicit-any */
const db: { recs: Record<string, any>; an: Record<string, any> } = { recs: {}, an: {} };
const me = { accountId: 'preview', displayName: 'Preview User' };
let n = 0;
const audit = (r: any, action: string, detail: string, result = 'ok') =>
  r.audit.push({ at: new Date().toISOString(), actor: me.displayName, action, detail, result, analysisVersion: r.analysisVersion });
const ok = (data: unknown) => ({ ok: true, data });
const fail = (code: string, message: string) => ({ ok: false, error: { code, message } });
const meta = (s: any) => ({ id: s.id, type: s.type, title: s.title, url: s.url, retrievedAt: s.retrievedAt, updated: null });

function run(id: string) {
  const r = db.recs[id];
  const at = new Date().toISOString();
  const sources = demoSources(at);
  const res: any = analyze(sources, r);
  const prev = db.an[id];
  r.analysisVersion += 1;
  r.sources = sources.map(meta);
  const stored = { ...res, questions: prev ? mergeQuestions(prev.questions, res.questions) : res.questions, warnings: [], generatedAt: at, version: r.analysisVersion };
  stored.readiness = computeReadiness(stored.facts, stored.contradictions, r.sources, r);
  r.history.push({ at, score: stored.readiness.score });
  audit(r, 'analysis.run', `Analysis v${r.analysisVersion}: ${sources.length} source(s), ${stored.facts.length} claim(s), ${stored.contradictions.length} conflict(s)`);
  db.an[id] = stored;
  r.updatedAt = at;
}

function create(input: any, demo: boolean) {
  const data = validateHandoverInput(input);
  const id = `h${++n}`;
  const now = new Date().toISOString();
  db.recs[id] = { id, ownerId: me.accountId, ...data, demo, createdAt: now, updatedAt: now, analysisVersion: 0, approval: { status: 'pending' }, plan: [], history: [], audit: [], sources: [] };
  audit(db.recs[id], 'handover.created', `Created handover "${data.name}"`);
  return id;
}

const withFresh = (id: string) => ({ handover: db.recs[id], analysis: db.an[id] ? { ...db.an[id], sources: db.recs[id].sources.map((s: any) => ({ ...s, freshness: 'fresh' })) } : null });

export async function mockInvoke(name: string, p: Record<string, any>): Promise<unknown> {
  await new Promise((r) => setTimeout(r, 120));
  try {
    switch (name) {
      case 'me': return ok(me);
      case 'listProjects': return ok([{ key: 'ONB', name: 'Customer Onboarding' }, { key: 'PLAT', name: 'Platform' }]);
      case 'listSpaces': return ok([{ id: '1001', key: 'ONB', name: 'Onboarding Hub' }, { id: '1002', key: 'ENG', name: 'Engineering' }]);
      case 'listPages': return ok([{ id: '2001', title: 'Customer Onboarding Workflow – Requirements (Demo)' }, { id: '2002', title: 'Onboarding Kickoff Meeting Notes (Demo)' }]);
      case 'listIssues': return ok([{ key: 'ONB-1', summary: 'Design welcome email sequence', status: 'To Do' }, { key: 'ONB-4', summary: 'Define data migration format', status: 'Blocked' }]);
      case 'loadDemo': {
        const id = create({ name: 'Harbor Ridge – Customer Onboarding Workflow (demo)', sourceTeam: 'Sales Engineering', receivingTeam: 'Implementation', description: 'Synthetic demo: client wants a new customer onboarding workflow.', priority: 'High', expectedDelivery: '2026-12-15', notes: 'Assumption: the legacy CRM export will be available by mid-November.' }, true);
        run(id);
        return ok(withFresh(id));
      }
      case 'createHandover': return ok(db.recs[create(p.input, true)]);
      case 'listHandovers': return ok(Object.values(db.recs).map((r: any) => ({ id: r.id, name: r.name, sourceTeam: r.sourceTeam, receivingTeam: r.receivingTeam, priority: r.priority, expectedDelivery: r.expectedDelivery, demo: r.demo, updatedAt: r.updatedAt, approval: r.approval.status, score: r.history.at(-1)?.score ?? null, band: db.an[r.id]?.readiness.band ?? null, openQuestions: db.an[r.id] ? db.an[r.id].questions.filter((q: any) => q.status === 'open').length : 0, analyzed: !!db.an[r.id] })));
      case 'getHandover': if (!db.recs[p.id]) return fail('NOT_FOUND', 'Handover not found.'); return ok(withFresh(p.id));
      case 'runAnalysis': run(p.id); return ok(withFresh(p.id));
      case 'updateQuestion': {
        const q = db.an[p.id].questions.find((x: any) => x.id === p.qid);
        Object.assign(q, p.patch);
        audit(db.recs[p.id], 'question.updated', `${q.id}: ${Object.keys(p.patch).join(', ')}`);
        return ok({ question: q });
      }
      case 'setApproval': {
        const r = db.recs[p.id];
        r.approval = { status: p.status, by: me.displayName, at: new Date().toISOString(), note: p.note || '' };
        audit(r, 'handover.approval', `Handover marked ${p.status}`);
        db.an[p.id].readiness = computeReadiness(db.an[p.id].facts, db.an[p.id].contradictions, r.sources, r);
        r.history.push({ at: r.approval.at, score: db.an[p.id].readiness.score });
        return ok(withFresh(p.id));
      }
      case 'proposePlan': {
        const r = db.recs[p.id];
        r.plan = buildPlan(r, db.an[p.id], r.sources);
        audit(r, 'plan.proposed', `${r.plan.length} proposed change(s); nothing has been created yet`);
        return ok({ plan: r.plan });
      }
      case 'executeApproved': {
        const r = db.recs[p.id];
        const results: unknown[] = [];
        for (const it of r.plan.filter((x: any) => p.itemIds.includes(x.id))) {
          it.status = 'created';
          it.approvedBy = me.displayName;
          it.result = it.type === 'jira-issue' ? { key: `${p.projectKey}-${100 + results.length}`, url: '#preview-simulated' } : { url: '#preview-simulated', title: it.title };
          audit(r, it.type === 'jira-issue' ? 'jira.issue.created' : 'confluence.page.created', `SIMULATED in preview: ${it.title}`, 'preview');
          results.push({ id: it.id, ok: true, result: it.result });
        }
        return ok({ results, plan: r.plan });
      }
      case 'seedDemoData': return ok({ pages: [{ id: '2001', title: 'Customer Onboarding Workflow – Requirements (Demo)', url: '#' }, { id: '2002', title: 'Onboarding Kickoff Meeting Notes (Demo)', url: '#' }], issues: [{ key: `${p.projectKey}-101`, url: '#' }, { key: `${p.projectKey}-102`, url: '#' }, { key: `${p.projectKey}-103`, url: '#' }, { key: `${p.projectKey}-104`, url: '#' }] });
      case 'deleteHandover': delete db.recs[p.id]; delete db.an[p.id]; return ok({ deleted: true });
      case 'dashboard': {
        const list = Object.values(db.recs) as any[];
        const q = (id: string) => (db.an[id] ? db.an[id].questions.filter((x: any) => x.status === 'open').length : 0);
        return ok({
          totals: { active: list.length, ready: list.filter((r) => db.an[r.id]?.readiness.band === 'ready').length, missingInfo: list.filter((r) => q(r.id) > 0).length, awaitingApproval: list.filter((r) => r.approval.status !== 'approved').length, criticalBlockers: list.reduce((s, r) => s + (db.an[r.id]?.facts.filter((f: any) => f.category === 'risk' && f.critical).length ?? 0), 0), all: list.length },
          recent: list.map((r) => ({ id: r.id, name: r.name, receivingTeam: r.receivingTeam, score: r.history.at(-1)?.score ?? null, band: db.an[r.id]?.readiness.band ?? null, updatedAt: r.updatedAt, demo: r.demo, openQuestions: q(r.id) })),
          weeks: ['09-29', '10-06', '10-13', '10-20', '10-27', '11-03'].map((label, i) => ({ label, created: i === 5 ? list.length : 0, approved: 0 })),
          workload: list.length ? [{ team: list[0].receivingTeam, handovers: list.length, openQuestions: list.reduce((s, r) => s + q(r.id), 0) }] : [],
        });
      }
      default: return fail('NOT_FOUND', `Unknown resolver ${name}`);
    }
  } catch (e: any) {
    return fail(e.code || 'INTERNAL', e.message);
  }
}
