import { attach } from './lib.mjs';
const { b, pg } = await attach();
await pg.getByText('HandoffIQ handover status').first().click(); await pg.waitForTimeout(9000);
await pg.screenshot({ path: 'out-issue.png' });
await b.close();
