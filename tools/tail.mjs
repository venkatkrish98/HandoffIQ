import { attach, frameOf } from './lib.mjs';
const { b, pg } = await attach();
const fr = frameOf(pg) || pg.frames().find((f) => f !== pg.mainFrame());
const t = await fr.locator('#main').innerText();
console.log(t.slice(t.indexOf('Confluence page') - 100).slice(0, 900));
await b.close();
