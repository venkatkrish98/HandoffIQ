import { attach } from './lib.mjs';
const { b, pg } = await attach();
await pg.goto('https://admin.atlassian.com/o/d9dd9950-3f78-47fa-bdb9-83a0dec053c6/rovo-settings', { waitUntil: 'domcontentloaded' });
await pg.waitForTimeout(8000);
console.log(pg.url());
console.log((await pg.locator('main, body').last().innerText()).slice(0, 1500));
await pg.screenshot({ path: 'out-app.png' });
await b.close();
