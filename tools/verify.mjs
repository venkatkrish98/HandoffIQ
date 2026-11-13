import { attach, SITE } from './lib.mjs';
const { b, ctx } = await attach();
const tab = await ctx.newPage();
await tab.goto(`${SITE}/wiki/spaces`, { waitUntil: 'domcontentloaded' }); await tab.waitForTimeout(3000);
const r = await tab.evaluate(async () => { const x = await fetch('/wiki/api/v2/pages?limit=25&title=' + encodeURIComponent('Handover: Harbor Ridge – Customer Onboarding Workflow'), { credentials: 'include' }); const d = await x.json(); return d.results.map((p) => ({ id: p.id, title: p.title, spaceId: p.spaceId, status: p.status })); });
console.log('PAGES', JSON.stringify(r));
if (r[0]) { await tab.goto(`${SITE}/wiki/pages/viewpage.action?pageId=${r[0].id}`, { waitUntil: 'domcontentloaded' }); await tab.waitForTimeout(6000); await tab.screenshot({ path: 'out-page.png' }); }
await tab.close(); await b.close();
