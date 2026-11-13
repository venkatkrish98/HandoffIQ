import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://127.0.0.1:9222');
const tab = await b.contexts()[0].newPage();
await tab.goto('https://handoffiq-test.atlassian.net/_edge/tenant_info', { waitUntil: 'domcontentloaded' });
console.log(await tab.locator('body').innerText());
await tab.close(); await b.close();
