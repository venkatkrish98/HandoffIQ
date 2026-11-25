import { attach } from './lib.mjs';
const { b, pg } = await attach();
await pg.setViewportSize({ width: 1600, height: 900 });
for (const u of ['https://home.atlassian.com/o/5537762c-e4e2-4c8f-9882-152a92cedf36/agents?cloudId=e970ee07-c576-4614-9a18-f6088dc631e2', 'https://home.atlassian.com/o/5537762c-e4e2-4c8f-9882-152a92cedf36/chat?cloudId=e970ee07-c576-4614-9a18-f6088dc631e2']) {
  await pg.goto(u, { waitUntil: 'domcontentloaded' }); await pg.waitForTimeout(9000);
  console.log(pg.url().slice(0, 120), '|', (await pg.locator('body').innerText()).replace(/\n+/g, ' ').slice(0, 160));
}
await b.close();
