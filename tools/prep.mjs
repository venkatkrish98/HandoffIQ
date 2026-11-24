// Clean-slate for recording: deletes ONLY the app-created demo issues and the three named Confluence pages. Pass "delete" to apply.
import { attach, SITE } from './lib.mjs';
const apply = process.argv[2] === 'delete';
const PAGE_TITLES = ['Customer Onboarding Workflow – Requirements (Demo)', 'Onboarding Kickoff Meeting Notes (Demo)', 'Handover: Harbor Ridge – Customer Onboarding Workflow', 'Billing System Integration Notes (Demo)'];
const { b, ctx } = await attach();
const tab = await ctx.newPage();
await tab.goto(`${SITE}/wiki/spaces`, { waitUntil: 'domcontentloaded' }); await tab.waitForTimeout(3000);
const out = await tab.evaluate(async ({ apply, PAGE_TITLES }) => {
  const h = { 'Content-Type': 'application/json', 'X-Atlassian-Token': 'no-check' };
  const log = [];
  for (const title of PAGE_TITLES) {
    const r = await (await fetch('/wiki/api/v2/pages?limit=10&title=' + encodeURIComponent(title), { credentials: 'include', headers: h })).json();
    for (const p of r.results || []) { let s = '-'; if (apply) s = (await fetch(`/wiki/api/v2/pages/${p.id}`, { method: 'DELETE', credentials: 'include', headers: h })).status; log.push(`page ${p.id} "${p.title.slice(0, 50)}" ${s}`); }
  }
  const q = await (await fetch('/rest/api/3/search/jql?jql=' + encodeURIComponent('project = KAN AND (summary ~ "Demo" OR summary ~ "Handoff") ORDER BY key') + '&fields=summary&maxResults=100', { credentials: 'include', headers: h })).json();
  for (const i of (q.issues || []).filter((i) => /^\[(Demo|Handoff)\]/.test(i.fields.summary))) { let s = '-'; if (apply) s = (await fetch(`/rest/api/3/issue/${i.key}`, { method: 'DELETE', credentials: 'include', headers: h })).status; log.push(`${i.key} ${i.fields.summary.slice(0, 45)} ${s}`); }
  return log;
}, { apply, PAGE_TITLES });
console.log(out.join('\n'));
await tab.close(); await b.close();
