import { attach } from './lib.mjs';
const { b, pg } = await attach();
await pg.getByText('What conflicts and open questions block this', { exact: false }).first().click();
await pg.waitForTimeout(80000);
await pg.screenshot({ path: 'out-app.png' });
await b.close();
