import { attach, frameOf } from './lib.mjs';
const { b, pg } = await attach();
const fr = frameOf(pg);
console.log((await fr.locator('#main').innerText()).slice(0, 1800));
await pg.screenshot({ path: 'out-app.png' });
await b.close();
