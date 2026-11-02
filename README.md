# HandoffIQ

**Never lose context between teams.**

HandoffIQ is an Atlassian Forge app that turns scattered Jira and Confluence context into a **verifiable, approval-controlled handover**. It does not just summarise: it retrieves evidence you are allowed to see, quotes it, detects conflicts and gaps, explains a readiness score, and creates Jira tasks and a Confluence handover page only after a human approves the exact changes.

> Built for Atlassian Codegeist 2026 · Category: Apps for Business Teams · License: MIT

## What it does

| Capability | How |
|---|---|
| Evidence-linked analysis | Requirements, decisions, dependencies, risks, owners and dates are extracted from Jira issues and Confluence pages. Each item quotes the source sentence and links to it. Items are labelled *verified*, *inference*, *missing* or *assumption*. |
| Contradiction detection | Conflicting owners, conflicting dates (source vs source, and source vs the handover form) and requirements that overlap an "out of scope" statement. |
| Missing-context detection | Unassigned issues, unresolved/TBD items, absent decisions and dates become clarification questions. |
| Explainable readiness | Seven weighted dimensions, each with a plain-language reason, minus a contradiction penalty. It measures information completeness, not project success. |
| Clarification workflow | Edit, assign, respond to and resolve questions; re-run after new information without losing human edits. |
| Human-controlled execution | AI proposes → you review the exact changes and target project/space → you approve → Forge executes as **you**. Every result is audited. |
| Freshness | Every source shows when it was retrieved and is flagged fresh / aging / stale. |
| Rovo agent | A native Rovo agent with five Rovo actions (list, analyze, gaps, propose, create-approved). It can propose; it cannot approve. |
| Audit trail | Who did what, when, which analysis version, and the result (including URLs of created items). |

## Architecture

```
Jira global page ─┐                          ┌─ Jira REST v3 (asUser)
Confluence page ──┼─ Custom UI (React/TS) ── Forge resolvers ── Confluence REST v2 (asUser)
Rovo agent ── Rovo actions ───────────────────┘        │
                                        engine.js (pure, tested)  +  Forge KVS (per-installation)
```

* `src/lib/engine.js` – deterministic extraction, contradiction detection, question generation, readiness model.
* `src/lib/format.js` – validation, ADF/storage conversion, action-plan and Confluence document builders, redaction.
* `src/lib/atlassian.js` – REST client; every call runs **as the invoking user**, so Atlassian permissions are always enforced.
* `src/lib/service.js` – business logic shared by the UI resolvers and the Rovo actions.
* `src/lib/store.js` – Forge Key-Value Store persistence; handovers are private to their creator.
* `static/app` – Custom UI (Vite + React + TypeScript), responsive, keyboard accessible.

No external AI provider or third-party service is used; nothing leaves Atlassian. Conversational reasoning is provided by Atlassian's own Rovo agent over the same tools.

## Install (development environment, or the production install link in the Devpost submission)

Prerequisites: Node.js 22/24 (Forge CLI 14.2.0 used here), an Atlassian account, a site with Jira and Confluence (a free Forge developer site: `forge site provision`).

```bash
npm install
npm --prefix static/app install
npm run build:ui
npm install -g @forge/cli@14.2.0
forge login                      # or set FORGE_EMAIL and FORGE_API_TOKEN
forge register HandoffIQ         # or: forge create, then keep this repo's manifest and use your new app id
forge deploy -e development
forge install -e development -p Jira       -s <your-site>.atlassian.net
forge install -e development -p Confluence -s <your-site>.atlassian.net
```

Then open **Jira → Apps → HandoffIQ** (or **Confluence → Apps → HandoffIQ**). See [docs/JUDGE-GUIDE.md](docs/JUDGE-GUIDE.md).

## Develop & test

```bash
npm test                                   # engine + formatting unit tests (node:test)
npm --prefix static/app run build          # type-check + production bundle
npm --prefix static/app run preview:mock   # preview bundle with SIMULATED Jira/Confluence writes
forge lint
```

## Honest limitations

* **Live testing status.** The full Jira flow (retrieval, analysis, approval, issue creation, audit trail) was run live on a real Atlassian site. The Confluence read/write paths and the Rovo agent are implemented and covered by unit tests of the shared logic, but they have **not** yet been exercised live because Confluence could not be provisioned on the test site at the time of writing. See [docs/TEST-REPORT.md](docs/TEST-REPORT.md).
* **No generative AI.** Analysis is deterministic and rule-based. The Rovo agent only calls the same actions.
* **Demo video narration** is AI-generated text-to-speech (Microsoft neural voice); the screen recording is the real app.

See [docs/TEST-REPORT.md](docs/TEST-REPORT.md) and [docs/COMPLIANCE.md](docs/COMPLIANCE.md). In short: extraction is pattern-based and can miss unusual phrasing; "no conflicts" means "none detected"; the Rovo skill and Rovo MCP modules (early-access) and Teamwork Graph are **not** implemented.

## Security

Least-privilege scopes, `asUser()` for all reads and writes, server-side validation, HTML escaping in generated pages, error redaction, no secrets in the repo or bundle. See [docs/SECURITY.md](docs/SECURITY.md).
