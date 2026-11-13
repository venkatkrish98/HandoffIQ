import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://127.0.0.1:9222');
const pg = b.contexts()[0].pages()[0];
await pg.goto(process.argv[2], { waitUntil: 'domcontentloaded' });
await pg.waitForTimeout(6000);
console.log(pg.url().slice(0, 150));
console.log((await pg.locator('body').innerText()).slice(0, 600));
await pg.screenshot({ path: 'out-go.png' });
await b.close();
