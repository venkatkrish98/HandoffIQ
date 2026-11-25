import { attach } from './lib.mjs';
const { b, pg } = await attach();
await pg.goto('https://home.atlassian.com/o/5537762c-e4e2-4c8f-9882-152a92cedf36/chat?cloudId=e970ee07-c576-4614-9a18-f6088dc631e2', { waitUntil: 'domcontentloaded' });
await pg.waitForTimeout(10000);
console.log(pg.url().slice(0, 150));
console.log((await pg.locator('body').innerText()).slice(0, 700));
await pg.screenshot({ path: 'out-app.png' });
await b.close();
