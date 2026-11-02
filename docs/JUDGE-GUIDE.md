# Judge testing guide

## Install
Use the install link provided in the Devpost submission (production distribution link), or deploy from source as described in the README. Install on a site that has **Jira and Confluence** (a free site works). The installer needs the scopes listed in `manifest.yml`.

## 2-minute path (no site data needed)
1. Open **Jira → Apps → HandoffIQ**.
2. On the empty dashboard click **Try the synthetic demo**. The real analysis engine runs over clearly labelled *synthetic* content (no Jira/Confluence calls).
3. **Overview**: readiness score and the seven dimensions behind it. **Evidence**: each claim with its quoted source line. **Conflicts**: owner conflict (Priya Raman vs Marcus Lee) and date conflict (2026-12-15 vs 2027-01-12). **Questions**: edit, assign, respond, resolve, re-run.
4. **Actions → Propose …** then **Review & approve**: shows exactly what would be created.

## Full path (real Jira/Confluence)
1. Create a Jira project (e.g. key `ONB`). A Confluence space is optional.
2. In the app: **New handover**, then on the Sources step choose **Create sample content**. It creates clearly labelled `[Demo]` Jira issues (and Confluence pages if you pick a space) after you approve, then selects them as sources. Or select your own project and pages.
3. Select the project and pages → **Create and analyze**. Sources are retrieved as *you*; inaccessible pages are reported, never silently skipped.
4. **Actions → Propose → Review & approve**, pick the target project and space, tick the confirmation, **Approve & create**. The result shows real issue keys and the Confluence page link.
5. **Audit trail** records each action and result. Mark the handover approved on **Overview** and watch the readiness change.

## Rovo agent
*Not live-tested by the author yet (Rovo was unavailable on the test site); implemented per `manifest.yml`.*
Open Rovo chat → agent **HandoffIQ** → "Which of my handovers are not ready, and why?" The agent calls the actions listed in `manifest.yml`; it can propose changes but not approve them.

## Permission behaviour to try
Use a user without Jira create permission: the item fails with a clear message and is recorded; other items continue.
