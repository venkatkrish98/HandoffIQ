import { attach } from './lib.mjs';
const { b, pg } = await attach();
await pg.waitForTimeout(6000);
console.log(pg.url().slice(0, 150));
await pg.screenshot({ path: 'out-app.png' });
await b.close();
