import { attach } from './lib.mjs';
const { b, pg } = await attach();
console.log(pg.url().slice(0, 110), pg.frames().map((f) => f.url().slice(0, 60)));
await pg.screenshot({ path: 'out-app.png' });
await b.close();
