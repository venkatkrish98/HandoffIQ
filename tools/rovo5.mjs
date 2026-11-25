import { attach } from './lib.mjs';
const { b, pg } = await attach();
await pg.goto('https://www.atlassian.com/software/rovo', { waitUntil: 'domcontentloaded' });
await pg.waitForTimeout(6000);
const links = await pg.locator('a').evaluateAll((els) => els.filter((e) => /try rovo|get rovo/i.test(e.innerText)).map((e) => e.innerText.trim() + ' -> ' + e.href));
console.log(links.join('\n'));
await pg.screenshot({ path: 'out-app.png' });
await b.close();
