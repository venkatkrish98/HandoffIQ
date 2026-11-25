import { attach } from './lib.mjs';
const { b, pg } = await attach();
await pg.goto('https://admin.atlassian.com/o/5537762c-e4e2-4c8f-9882-152a92cedf36/agents', { waitUntil: 'domcontentloaded' });
await pg.waitForTimeout(8000);
await pg.getByRole('button', { name: /Select a site/ }).click().catch(() => {});
await pg.waitForTimeout(2500);
console.log((await pg.locator('body').innerText()).slice(0, 700));
await pg.screenshot({ path: 'out-app.png' });
await b.close();
