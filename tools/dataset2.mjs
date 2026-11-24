// Creates a second, hand-written scenario (support escalation) directly through the REST APIs, NOT through HandoffIQ,
// to show the analysis works on content it has never seen. Cleaned up by prep.mjs.
import { attach, SITE } from './lib.mjs';
const { b, ctx } = await attach();
const tab = await ctx.newPage();
await tab.goto(`${SITE}/wiki/spaces`, { waitUntil: 'domcontentloaded' }); await tab.waitForTimeout(3000);
const out = await tab.evaluate(async () => {
  const h = { 'Content-Type': 'application/json', 'X-Atlassian-Token': 'no-check', Accept: 'application/json' };
  const li = (t) => `<li>${t}</li>`;
  const pages = [
    ['Support Escalation Plan', ['Project: Priority ticket escalation from Support to Engineering.', 'Requirement: Tier-2 engineers must acknowledge priority-one tickets within 15 minutes.', 'Requirement: Every escalation must carry the customer impact summary.', 'Requirement: Escalation metrics must be reported weekly.', 'Escalation plan owner: Dana Whitfield.', 'Launch deadline: 2027-02-03.', 'The plan depends on the ticketing system webhook being available.', 'Risk: Weekend coverage gaps may delay priority-one response.']],
    ['Support Sync Notes', ['Decision: We agreed to page the on-call engineer through the existing rota.', 'Decision: Weekly escalation review will start in the first sprint.', 'Escalation plan owner: Omar Haddad.', 'Customer launch deadline: 2027-02-17.', 'Who approves the final escalation matrix?', 'Voice support is out of scope for phase one.']],
  ];
  const sp = (await (await fetch('/wiki/api/v2/spaces?keys=SD', { credentials: 'include', headers: h })).json()).results[0];
  const log = [];
  for (const [title, lines] of pages) {
    const r = await fetch('/wiki/api/v2/pages', { method: 'POST', credentials: 'include', headers: h, body: JSON.stringify({ spaceId: sp.id, status: 'current', title, body: { representation: 'storage', value: `<ul>${lines.map(li).join('')}</ul>` } }) });
    log.push(`page ${title} ${r.status}`);
  }
  const adf = (t) => ({ type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text: t }] }] });
  for (const [summary, d] of [['Escalation: Define the priority-one acknowledgement rule', 'Tier-2 acknowledges priority-one tickets within 15 minutes.'], ['Escalation: Configure the on-call rota', 'On-call engineers are paged for priority-one escalations.'], ['Escalation: Build the weekly metrics report', 'Weekly escalation metrics for the review meeting.']]) {
    const r = await fetch('/rest/api/3/issue', { method: 'POST', credentials: 'include', headers: h, body: JSON.stringify({ fields: { project: { key: 'KAN' }, summary, issuetype: { name: 'Task' }, description: adf(d) } }) });
    const j = await r.json().catch(() => ({}));
    log.push(`issue ${j.key || r.status} ${summary.slice(0, 40)}`);
  }
  return log;
});
console.log(out.join('\n'));
(await import('node:fs')).writeFileSync('out/dataset2.json', JSON.stringify({ keys: out.filter((l) => l.startsWith('issue ')).map((l) => l.split(' ')[1]) }));
await tab.close(); await b.close();
