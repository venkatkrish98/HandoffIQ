import { attach } from './lib.mjs';
const { b, pg } = await attach();
await pg.goto('https://admin.atlassian.com/o/d9dd9950-3f78-47fa-bdb9-83a0dec053c6/agents', { waitUntil: 'domcontentloaded' });
await pg.waitForTimeout(8000);
await pg.getByRole('button', { name: /Select a site/ }).click().catch(() => {});
await pg.waitForTimeout(2500);
console.log((await pg.locator('body').innerText()).slice(0, 700));
await pg.screenshot({ path: 'out-app.png' });
await b.close();
