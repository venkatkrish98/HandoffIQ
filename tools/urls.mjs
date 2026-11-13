import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://127.0.0.1:9222');
for (const p of b.contexts()[0].pages()) console.log(p.url().slice(0, 140));
await b.close();
