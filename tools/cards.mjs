// Renders the intro and outro title cards (plain HTML, no third-party logos).
import { chromium } from 'playwright';
const b = await chromium.launch({ channel: 'msedge', headless: true });
const pg = await b.newPage({ viewport: { width: 1600, height: 900 } });
const css = `body{margin:0;width:1600px;height:900px;display:grid;place-items:center;background:radial-gradient(1200px 700px at 30% 20%,#2a2478 0%,#0b1030 55%,#060a18 100%);font-family:Segoe UI,Inter,Arial,sans-serif;color:#eef0ff;text-align:center}
h1{font-size:120px;margin:0 0 18px;letter-spacing:-2px;background:linear-gradient(90deg,#8b7bff,#4f46e5);-webkit-background-clip:text;color:transparent}
p{margin:8px 0;font-size:42px;color:#c9ceff}small{display:block;margin-top:46px;font-size:26px;color:#8f97d8}`;
await pg.setContent(`<style>${css}</style><div><h1>HandoffIQ</h1><p>Never lose context between teams.</p><small>Evidence-linked, approval-controlled handovers for Jira and Confluence · Built on Atlassian Forge</small></div>`);
await pg.screenshot({ path: 'out/intro.png' });
await pg.setContent(`<style>${css}</style><div><h1>HandoffIQ</h1><p>Never lose context between teams.</p><small>github.com/venkatkrish98/HandoffIQ</small><small style="margin-top:14px;font-size:22px">Narration: AI-generated voice (Piper TTS, en_US libritts_r voice, CC BY 4.0). Screen footage: the real app.</small></div>`);
await pg.screenshot({ path: 'out/outro.png' });
await b.close();
