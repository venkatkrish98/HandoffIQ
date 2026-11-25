import { attach } from './lib.mjs';
const { b, pg } = await attach();
await pg.getByRole('button', { name: 'Switch sites or apps' }).click().catch(() => {});
await pg.waitForTimeout(1500);
await pg.getByText('2 more', { exact: true }).click().catch(() => {});
await pg.waitForTimeout(1500);
console.log((await pg.locator('body').innerText()).slice(0, 100).replace(/\n/g, ' '));
await pg.screenshot({ path: 'out-app.png' });
await b.close();
