import { attach, SITE } from './lib.mjs';
const { b, pg } = await attach();
await pg.goto(`${SITE}/jira/for-you`, { waitUntil: 'domcontentloaded' });
await pg.waitForTimeout(9000);
const labels = await pg.locator('button, a').evaluateAll((els) => els.map((e) => (e.getAttribute('aria-label') || e.innerText || '').trim()).filter((t) => /rovo|ask|chat|agent|ai/i.test(t)).slice(0, 20));
console.log(labels);
await pg.screenshot({ path: 'out-app.png' });
await b.close();
