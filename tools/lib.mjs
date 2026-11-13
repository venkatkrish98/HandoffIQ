// Shared helpers for attaching to the logged-in Edge window and driving the live HandoffIQ app.
import { chromium } from 'playwright';
export const SITE = process.env.SITE || 'https://handoffiq-test.atlassian.net';
export const APP_ID = 'e68f72e1-81ae-4e1a-b52a-9315f7c103c8';
export const ENV_ID = '4536e036-d47a-4f69-8169-cbcffabf7297'; // production installation environment
export const JIRA_APP = `${SITE}/jira/apps/${APP_ID}/${ENV_ID}`;
export const CONF_APP = `${SITE}/wiki/apps/${APP_ID}/${ENV_ID}/handoffiq`;
export async function attach() {
  const b = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const ctx = b.contexts()[0];
  const pg = ctx.pages()[0];
  return { b, ctx, pg };
}
export const frameOf = (pg) => pg.frames().find((f) => f !== pg.mainFrame() && (/atlassian-dev|forge/.test(f.url()) || f.url() === ''));
export async function openApp(pg, url = JIRA_APP) {
  await pg.goto(url, { waitUntil: 'domcontentloaded' });
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    for (const f of pg.frames()) {
      if (f === pg.mainFrame()) continue;
      if (await f.locator('#main').count().catch(() => 0)) { await pg.waitForTimeout(2000); return f; }
    }
    await pg.waitForTimeout(500);
  }
  throw new Error('HandoffIQ frame did not load');
}
