# HandoffIQ – notes for coding agents

- Forge **Custom UI** app (not UI Kit): React + TypeScript in `static/app` (Vite), plain-JS ESM backend in `src/`.
- `src/lib/engine.js` and `src/lib/format.js` are pure and unit-tested (`npm test`). Keep them free of Forge imports.
- All Atlassian calls run `asUser()` (see `src/lib/atlassian.js`). Never use `asApp()` for reads.
- Nothing may write to Jira/Confluence except `executeApproved` in `src/lib/service.js`, which acts only on user-approved plan item ids.
- Never commit tokens. Forge CLI auth uses `FORGE_EMAIL` / `FORGE_API_TOKEN` environment variables.
- Build UI before deploy: `npm run build:ui`. Preview build with simulated writes: `npm --prefix static/app run preview:mock`.
