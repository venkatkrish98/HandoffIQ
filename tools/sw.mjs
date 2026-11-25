import { attach } from './lib.mjs';
const { b, pg } = await attach();
await pg.getByRole('button', { name: 'Switch sites or apps' }).click().catch(() => {});
await pg.waitForTimeout(3000);
console.log((await pg.locator('[role=dialog], [role=menu], [data-testid*=switcher]').allInnerTexts()).join('\n---\n').replace(/\n+/g, ' | ').slice(0, 800));
await pg.screenshot({ path: 'out-app.png' });
await b.close();
