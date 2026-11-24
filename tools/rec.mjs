// Records the live HandoffIQ app (CDP screencast) while driving the demo; stores scene start times.
// Prereqs: node session.mjs (logged in), node tts.mjs (out/audio/durations.json), clean site (node prep.mjs delete).
import fs from 'node:fs';
import { attach, openApp, SITE } from './lib.mjs';

const dur = JSON.parse(fs.readFileSync('out/audio/durations.json', 'utf8'));
const { b, ctx, pg } = await attach();
await pg.setViewportSize({ width: 1600, height: 900 });
const wait = (ms) => pg.waitForTimeout(ms);
let fr = await openApp(pg);
const type = async (loc, text, delay = 20) => { await loc.click(); await loc.pressSequentially(text, { delay }); };
const scroll = async (total, steps, gap = 1200) => { await pg.mouse.move(900, 520); for (let i = 0; i < steps; i++) { await pg.mouse.wheel(0, total / steps); await wait(gap); } };

// ---------- prep (not recorded): cookie banner, hide the Jira navigation (it lists third-party apps), clean handovers ----------
await pg.getByRole('button', { name: /Only necessary/ }).click({ timeout: 2500 }).catch(() => {});
const collapse = pg.getByRole('button', { name: 'Collapse sidebar' });
if (await collapse.count()) await collapse.first().click().catch(() => {});
for (let n = 0; n < 10; n++) {
  await fr.getByRole('button', { name: /^Handovers$/ }).click(); await wait(1500);
  const row = fr.locator('.table.responsive .linkish, .cards-list button').first();
  if (!(await row.count())) break;
  await row.click(); await fr.getByRole('button', { name: /Delete/ }).first().click();
  await fr.getByRole('button', { name: 'Delete handover' }).click(); await wait(1800);
}
await fr.getByRole('button', { name: /^Dashboard$/ }).click(); await wait(1200);
await pg.evaluate(() => window.scrollTo(0, 0));

// ---------- start recording ----------
fs.rmSync('out/frames', { recursive: true, force: true }); fs.mkdirSync('out/frames', { recursive: true });
const cdp = await ctx.newCDPSession(pg);
const frames = []; let idx = 0;
cdp.on('Page.screencastFrame', (f) => {
  const n = String(++idx).padStart(6, '0');
  fs.writeFileSync(`out/frames/f${n}.jpg`, Buffer.from(f.data, 'base64'));
  frames.push({ n, ts: f.metadata.timestamp });
  cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
});
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 88, maxWidth: 1600, maxHeight: 900, everyNthFrame: 1 });
await wait(800);
const starts = {};
async function scene(id, fn) {
  const t0 = Date.now() / 1000; starts[id] = t0;
  await fn();
  const rest = dur[id] + 0.9 - (Date.now() / 1000 - t0);
  if (rest > 0) await wait(rest * 1000);
}

await scene('s2', async () => {
  await fr.getByRole('button', { name: /New handover/ }).first().click(); await wait(600);
  await type(fr.getByLabel('Project / customer name'), 'Harbor Ridge – Customer Onboarding Workflow', 14);
  await type(fr.getByLabel('Source team'), 'Sales Engineering', 14);
  await type(fr.getByLabel('Receiving team'), 'Implementation', 14);
  await fr.getByRole('combobox', { name: 'Business priority' }).click(); await wait(300);
  await fr.getByRole('option', { name: 'High' }).click(); await wait(250);
  await fr.getByRole('button', { name: /Expected delivery date/ }).click(); await wait(500);
  await fr.getByRole('button', { name: 'Next month' }).click(); await wait(400);
  await fr.locator('[data-date="2026-12-15"]').click(); await wait(400);
  await type(fr.getByLabel('Project description'), 'Client wants a new customer onboarding workflow.', 12);
});
await scene('s2b', async () => {
  await fr.getByRole('button', { name: 'Continue' }).click(); await wait(1500);
  await fr.getByRole('button', { name: /Create sample content/ }).click(); await wait(800);
  await fr.getByRole('combobox', { name: 'Jira project', exact: true }).click(); await wait(400);
  await fr.getByRole('option', { name: /Customer Onboarding/ }).first().click(); await wait(400);
  await fr.getByLabel(/Confluence space/).first().click({ force: true }); await wait(600);
  await fr.getByRole('option', { name: /Software Development/ }).click(); await wait(500);
  await fr.getByLabel('I approve creating this sample content').check(); await wait(700);
  await fr.getByRole('button', { name: 'Approve & create' }).click();
  await fr.waitForSelector('text=/Created [0-9]+ page/', { timeout: 150000 });
  await wait(1500);
  await fr.getByRole('button', { name: 'Continue' }).click(); await wait(900);
  await fr.getByRole('button', { name: /Create and analyze/ }).click();
  await fr.waitForSelector('text=Why this score', { timeout: 150000 }); await wait(1200);
});
await scene('s3', async () => {
  await wait(1200);
  await fr.getByRole('tab', { name: /Evidence/ }).click(); await wait(1200);
  await scroll(1500, 5, 1500);
});
await scene('s4', async () => {
  await pg.evaluate(() => window.scrollTo(0, 0));
  await fr.getByRole('tab', { name: /Conflicts/ }).click(); await wait(2000);
  await scroll(900, 3, 2400);
});
await scene('s5', async () => {
  await pg.evaluate(() => window.scrollTo(0, 0));
  await fr.getByRole('tab', { name: /Overview/ }).click(); await wait(1200);
  await fr.locator('#why').scrollIntoViewIfNeeded(); await wait(4000);
  await pg.evaluate(() => window.scrollTo(0, 0));
  await fr.getByRole('tab', { name: /Questions/ }).click(); await wait(1200);
  await type(fr.getByLabel('Assigned to').first(), 'Priya Raman', 14);
  await type(fr.getByLabel('Response').first(), 'Confirmed with the PM.', 14);
  await fr.getByRole('button', { name: 'Mark resolved' }).first().click(); await wait(1200);
});
await scene('s6', async () => {
  await pg.evaluate(() => window.scrollTo(0, 0));
  await fr.getByRole('tab', { name: /Actions/ }).click(); await wait(700);
  await fr.getByRole('button', { name: /Propose Jira tasks/ }).click();
  await fr.waitForSelector('text=Review & approve'); await wait(1200);
  await scroll(500, 2, 1200);
  await fr.getByRole('button', { name: /Review & approve/ }).click(); await wait(800);
  await fr.getByRole('combobox', { name: 'Create Jira issues in project', exact: true }).click(); await wait(400);
  await fr.getByRole('option', { name: /Customer Onboarding/ }).first().click(); await wait(400);
  await fr.getByRole('combobox', { name: 'Create Confluence page in space' }).click(); await wait(500);
  await fr.getByRole('option', { name: /Software Development/ }).click(); await wait(400);
  await fr.getByLabel('I reviewed these changes').check(); await wait(1200);
  await fr.getByRole('button', { name: /Approve & create/ }).click();
  await fr.waitForSelector('text=/item\\(s\\) created|created, .* failed/', { timeout: 150000 }).catch(() => {});
  await wait(1500);
});
await scene('s7', async () => {
  await pg.evaluate(() => window.scrollTo(0, 0));
  await fr.getByRole('tab', { name: /Audit/ }).click(); await wait(1500);
  await scroll(500, 2, 1200);
  await pg.goto(`${SITE}/jira/software/projects/KAN/list`, { waitUntil: 'domcontentloaded' }); await wait(5500);
  const page = await pg.evaluate(async () => { const r = await (await fetch('/wiki/api/v2/pages?limit=5&title=' + encodeURIComponent('Handover: Harbor Ridge – Customer Onboarding Workflow'), { credentials: 'include' })).json(); return r.results?.[0]; });
  if (page) { await pg.goto(`${SITE}/wiki/spaces/SD/pages/${page.id}`, { waitUntil: 'domcontentloaded' }); await wait(4500); await scroll(500, 2, 1300); }
});
const tEnd = Date.now() / 1000;
await wait(1200);
await cdp.send('Page.stopScreencast');
fs.writeFileSync('out/timeline.json', JSON.stringify({ frames, starts, tEnd }));
console.log('FRAMES', frames.length, 'SPAN', (frames.at(-1).ts - frames[0].ts).toFixed(1) + 's');
await b.close();
