import { attach } from './lib.mjs';
const { b, pg } = await attach();
await pg.goto('https://home.atlassian.com/o/d9dd9950-3f78-47fa-bdb9-83a0dec053c6/chat/agents?cloudId=e970ee07-c576-4614-9a18-f6088dc631e2', { waitUntil: 'domcontentloaded' });
await pg.waitForTimeout(9000);
console.log(pg.url().slice(0, 140));
console.log((await pg.locator('body').innerText()).slice(0, 900));
await pg.screenshot({ path: 'out-app.png' });
await b.close();
