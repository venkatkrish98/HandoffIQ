import * as ResolverModule from '@forge/resolver';
import * as svc from './lib/service.js';
import * as atl from './lib/atlassian.js';
import { HandoffError, assertId, redact } from './lib/format.js';

// Forge's bundler may hand back either the class or a namespace object, depending on module format.
const Resolver = ResolverModule.default?.default || ResolverModule.default;
const resolver = new Resolver();

// Cache the display name per warm function instance (accountId always comes from the platform context).
const names = new Map();
async function currentUser(req) {
  const accountId = req.context?.accountId;
  if (!accountId) throw new HandoffError('PERMISSION', 'No signed-in Atlassian user.', 401);
  if (!names.has(accountId)) {
    const me = await atl.whoAmI().catch(() => ({ displayName: 'Atlassian user' }));
    names.set(accountId, me.displayName);
  }
  return { accountId, displayName: names.get(accountId) };
}

/** Wrap a resolver so every response is { ok, data } or { ok:false, error } and nothing sensitive leaks. */
function define(name, fn) {
  resolver.define(name, async (req) => {
    try {
      const me = await currentUser(req);
      return { ok: true, data: await fn(me, req.payload || {}) };
    } catch (e) {
      const known = e instanceof HandoffError;
      console.error(`[resolver:${name}]`, known ? e.code : 'UNEXPECTED', redact(e.message));
      return { ok: false, error: { code: known ? e.code : 'INTERNAL', message: known ? e.message : 'Something went wrong. Please try again.' } };
    }
  });
}

define('me', (me) => me);
define('dashboard', (me) => svc.dashboard(me));
define('listHandovers', (me) => svc.listHandoverSummaries(me));
define('getHandover', (me, p) => svc.getHandover(me, assertId(p.id)));
define('createHandover', (me, p) => svc.createHandover(me, p.input));
define('runAnalysis', (me, p) => svc.runAnalysis(me, assertId(p.id)));
define('updateQuestion', (me, p) => svc.updateQuestion(me, assertId(p.id), assertId(p.qid), p.patch || {}));
define('setApproval', (me, p) => svc.setHandoverApproval(me, assertId(p.id), p.status, p.note));
define('proposePlan', (me, p) => svc.proposePlan(me, assertId(p.id)));
define('executeApproved', (me, p) => svc.executeApproved(me, assertId(p.id), p));
define('loadDemo', (me) => svc.loadDemoScenario(me));
define('seedDemoData', (me, p) => svc.seedDemoData(me, p));
define('deleteHandover', async (me, p) => {
  const { deleteHandover } = await import('./lib/store.js');
  await deleteHandover(me.accountId, assertId(p.id));
  return { deleted: true };
});

// Pickers for the "Create handover" workflow (all permission-aware: run as the user).
define('listProjects', () => atl.listJiraProjects());
define('listIssues', (me, p) => atl.listJiraIssues(String(p.projectKey)));
define('listSpaces', () => atl.listConfluenceSpaces());
define('listPages', (me, p) => atl.listConfluencePages(String(p.spaceId)));

export const handler = resolver.getDefinitions();

export { listHandovers, analyzeHandover, getHandoverGaps, proposeHandoverActions, createApprovedItems } from './actions.js';
