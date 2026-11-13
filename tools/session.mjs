// Opens a headed Edge window with a persistent profile and a CDP port so recording scripts can attach.
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const start = process.argv[2] || 'https://id.atlassian.com/login';
const ctx = await chromium.launchPersistentContext(path.join(dir, '.profile'), {
  channel: 'msedge', headless: false, viewport: null, args: ['--remote-debugging-port=9222', '--window-size=1600,1000'],
});
const pg = ctx.pages()[0] || (await ctx.newPage());
await pg.goto(start);
console.log('READY');
setInterval(() => {}, 60_000);
