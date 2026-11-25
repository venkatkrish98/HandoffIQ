import { attach } from './lib.mjs';
const { b, pg } = await attach();
for (let i = 0; i < 10; i++) {
  await pg.goto('https://admin.atlassian.com/o/5537762c-e4e2-4c8f-9882-152a92cedf36/agents', { waitUntil: 'domcontentloaded' });
  await pg.waitForTimeout(9000);
  await pg.getByRole('button', { name: /Select a site/ }).click().catch(() => {});
  await pg.waitForTimeout(2000);
  const t = await pg.locator('body').innerText();
  if (/handoffiq-test/i.test(t.split('Select a site')[1] || '')) { console.log('SITE AVAILABLE after', i + 1, 'tries'); await pg.screenshot({ path: 'out-app.png' }); break; }
  console.log('try', i + 1, 'no site yet');
  await pg.waitForTimeout(50000);
}
await b.close();
