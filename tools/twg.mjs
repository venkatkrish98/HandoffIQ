import { attach, frameOf } from './lib.mjs';
const { b, pg } = await attach();
const fr = frameOf(pg) || pg.frames().find((f) => f !== pg.mainFrame());
await fr.getByRole('tab', { name: /Overview/ }).click().catch(() => {});
await pg.waitForTimeout(4000);
const el = fr.locator('#twg').locator('xpath=ancestor::section');
console.log((await el.innerText()).slice(0, 700));
await el.scrollIntoViewIfNeeded(); await pg.screenshot({ path: 'out-twg.png' });
await b.close();
