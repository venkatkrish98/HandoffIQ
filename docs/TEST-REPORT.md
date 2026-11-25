# Test report

Only results that were actually executed are listed as passed. Date: 2026-11-01.

## Executed and passed

| Check | Command | Result |
|---|---|---|
| Unit tests (engine + formatting) | `npm test` | **19 / 19 passed** |
| Frontend type-check + production build | `npm --prefix static/app run build` | passed (no TS errors) |
| Forge lint | `forge lint` | "No issues found" |
| Forge deploy (development) | `forge deploy -e development` | deployed as *HandoffIQ* |
| Forge install | `forge install` (Jira + Confluence, demo site `one-atlas-xzpf`) | installed |
| Production bundle contains no preview/mock code | `grep mockInvoke dist/assets/*` | no matches |
| Repo contains no real credentials | grep for token fragments | none found |
| Responsive/browser QA on the **preview build** (headless Chromium, 1366 / 820 / 390 px) | scripted walk-through: empty state → demo → all six tabs → propose → approval dialog → create → audit → dashboard → wizard | no console/page errors; no horizontal overflow at 390 px on any tab |

### What the unit tests cover
Date parsing; freshness classification; extraction of requirements/decisions/dependencies/risks with source excerpts; owner conflict; date conflict (source vs source, and vs the handover form); no false date conflict across different topics; requirement vs out-of-scope conflict; missing-information detection (unassigned issue, open items, missing date/decisions); readiness bounds, explanations and approval sensitivity; empty input; question merging that preserves human edits; storage→text and ADF conversion; input validation (injection-style keys, bad dates, over-length); HTML escaping and secret redaction; action-plan content and de-duplication; Confluence document sections and XSS escaping.

### Defects found by tests/QA and fixed
1. `redact()` left bearer-token values visible.
2. Out-of-scope overlap was diluted by generic words ("requirement", "scope").
3. Source-vs-source date conflicts were missed (subject matching on "go-live" wording).
4. One line produced duplicate clarification questions.
5. The plan proposed both "Resolve conflict" and a duplicate "Clarify" issue for the same conflict.
6. Mobile horizontal overflow (grid item min-width).

## Live run on the installed app (development env, `one-atlas-xzpf.atlassian.net`, 2026-11-01)

| Check | Result |
|---|---|
| App loads inside Jira (Custom UI, global page), light theme | passed |
| Dashboard resolver + Forge KVS read | passed (after fix below) |
| Synthetic demo end-to-end on Forge: analysis stored, 3 conflicts detected (owner, date, date-vs-form), 7 questions, 9 proposed changes | **passed** |
| Live run on a second, fresh site (handoffiq-test, production build installed on Jira + Confluence, 2026-11-13) | see below |
| Jira project list, Confluence space list (`asUser`) | **passed** (2 spaces listed) |
| Create sample content incl. 2 Confluence pages in a chosen space | **passed** (after fixing the space-id regex bug below) |
| Retrieve 4 Jira issues + 2 Confluence pages, analyze | **passed**: 6 sources, 5 requirements, 4 decisions, 3 conflicts (owner, date, date vs form), 7 questions, readiness 41 |
| Approve and execute plan: real Jira issues (KAN-5 to KAN-12) and a real Confluence page "Handover: Harbor Ridge ..." | **passed**, page opened and rendered in Confluence |
| Jira issue panel "HandoffIQ handover status" | **passed** (renders; listing for an issue not in any handover verified) |
| Rovo agent in Rovo chat (checked 2026-11-25 on the first demo site, development install; Rovo is not yet surfaced on handoffiq-test) | **partially passed**: the HandoffIQ agent is listed under Rovo Agents with its description and our three conversation starters; asking "What conflicts and open questions block this handover?" made Rovo call a HandoffIQ action and relay an honest answer ("no handovers found" because that site had none). **Not yet verified with real handover data.** |

Bugs found only by the live runs and fixed: (1) `@forge/resolver` default import resolved to a namespace object ("not a constructor"); (2) Forge KVS rejects `null` values; (3) two validation regexes had lost a backslash (`/^d{1,20}$/` instead of digits), which rejected every Confluence space id; now uses the shared, unit-tested `PATTERNS`.

Earlier site (one-atlas-xzpf) returned 401 for every user-token call, so it was abandoned. The Jira-only flow was also verified on venkatswamy2304.atlassian.net (real issue creation, audit trail).

## NOT yet executed (do not treat as passed)

* **Rovo agent** answering with real handover data (the agent and its action invocation were verified; see above).
* Permission-failure paths against a restricted user.
* Screen-reader testing; only keyboard/focus structure and ARIA roles were implemented.

## Known limitations
* Pattern-based extraction (English); misses unusual phrasing; contradiction detection needs similar wording.
* Handovers are stored per user in Forge KVS (private to the creator, no team sharing yet); an index of ids, ≤ 240 KB per value.
* Analysis reads up to 50 Jira issues per run and the selected pages; very large pages are truncated by line length rules.
* Preview build simulates writes and is for QA only; it is never deployed.
* Rovo skill / Rovo MCP (EAP, dev-only deployment) and Teamwork Graph are not implemented.
