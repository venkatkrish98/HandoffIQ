# Hackathon compliance checklist (Codegeist 2026)

Source: the Devpost **overview page text**, pasted by the owner on 2026-11-01. The full "View full rules" page has **not** been read (automated access is blocked), so items marked ⚠ are still open and must be confirmed by a human at <https://codegeist2026.devpost.com/rules>.

## Verified from the overview page

| Item | Finding |
|---|---|
| Deadline | **23 Dec 2026, 1:30 am GMT+5:30** (= 22 Dec 2026, 12:00 pm Pacific) |
| Eligibility (summary) | Above legal age of majority in country of residence; **specific countries/territories excluded** |
| Technology requirement | Build on Forge and integrate at least one of: Jira, Confluence, JSM, Bitbucket, Teamwork Graph, Rovo |
| Category chosen | **Apps for Business Teams** |
| Judging | Technological Implementation, Design, Potential Impact, Innovation/Idea, Presentation: 20% each |

## Submission requirements and current status

| Requirement | Status |
|---|---|
| Installation link for judges ("Start sharing your app") | ❌ **Not done.** Needs a production deploy and a sharing link from the Developer console. |
| Demo video < 5 min, **public on YouTube** | ❌ Not recorded or uploaded (needs the owner's approval to publish). |
| Category + bonus selection with supporting material | ✅ Drafted in `docs/DEVPOST.md` |
| Explanation of how the project meets the technology requirement | ✅ Drafted in `docs/DEVPOST.md` |
| Complete the Devpost form before the deadline | ❌ Not submitted (owner approval required). |
| Public GitHub repo + OSS licence (from owner's brief) | ⚠ MIT licence present; repo not published. |

## Open eligibility questions (⚠ must be answered from the full rules)
* Is the owner's country of residence (India) on the excluded list?
* Age of majority, prize verification/tax documents, ownership/originality, team/individual and multiple-submission rules.

## Bonus prizes (from the overview page)

| Bonus | Requirement (per page) | Our position |
|---|---|---|
| Best Agents | Forge app including `rovo:agent`, `rovo:agentConnector`, or reusable `rovo:skill` + `rovo:action` | ✅ **Qualifies on paper:** `rovo:agent` + 5 `action` modules. **Agent not yet tested live in Rovo chat.** |
| Best app with Atlassian MCP | Forge app exposing an MCP server | ❌ Not implemented (`rovo:mcp` is EAP). Do not claim. |
| Teamwork Graph integration | Writes to or reads from the Teamwork Graph API | ❌ Not implemented. Do not claim. |
| Marketplace published | Listing link or Marketplace review ticket | ❌ Not done. Do not claim. |

## Notes
* `rovo:skill` and `rovo:mcp` are early-access and deploy only to development environments (docs, 2026-11-01).
* The demo site `one-atlas-xzpf.atlassian.net` expires **2027-01-30**.
* Forge CLI 15.0 needs a newer Node patch; CLI 14.2.0 is used.
