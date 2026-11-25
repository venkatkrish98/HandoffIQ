import { attach } from './lib.mjs';
const { b, pg } = await attach();
await pg.goto('https://admin.atlassian.com/o/5537762c-e4e2-4c8f-9882-152a92cedf36/rovo-overview', { waitUntil: 'domcontentloaded' });
await pg.waitForTimeout(9000);
console.log((await pg.locator('main, body').last().innerText()).replace(/\n+/g, ' | ').slice(0, 900));
await pg.screenshot({ path: 'out-app.png' });
await b.close();
