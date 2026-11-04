# Hackathon compliance checklist (Codegeist 2026)

Source: the full Official Rules text, pasted by the owner on 2026-11-04 (earlier: overview page). Checked against this project line by line below.

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
| Installation link for judges ("Start sharing your app") | ✅ Production v2.0.0 deployed; distribution set to "Sharing with anyone" (Jira + Confluence). Link in `docs/INSTALL-LINK.txt`. |
| Demo video < 5 min, **public on YouTube** | ⚠ A 3:08 Jira-only draft was recorded and reviewed by the owner; it must be re-recorded with the Confluence scenes and uploaded by the owner (YouTube/Google login cannot be automated). |
| Category + bonus selection with supporting material | ✅ Drafted in `docs/DEVPOST.md` |
| Explanation of how the project meets the technology requirement | ✅ Drafted in `docs/DEVPOST.md` |
| Complete the Devpost form before the deadline | ❌ Not submitted (owner approval required). |
| Public GitHub repo + OSS licence | ✅ https://github.com/venkatkrish98/HandoffIQ (public, MIT). |

## Rules check (Official Rules, 2026-11-04)

| Rule | Finding | Action |
|---|---|---|
| Excluded countries (§3) | Listed: Brazil, Quebec, Russia, Belarus, Crimea, Cuba, Iran, North Korea, Syria, Sudan, Myanmar, OFAC-designated. **India is not listed.** Age of majority and not being a Sponsor/Administrator employee, relative or Judge are the owner's declaration. | Owner confirms personally |
| Forge + at least one Atlassian product | Forge Custom UI + Jira REST + Confluence REST + Rovo agent | ✅ |
| New project, Forge manifest, ≥1 module | Created after 2026-10-27; `manifest.yml` has jira:globalPage, confluence:globalPage, rovo:agent, action modules | ✅ |
| Installable via installation link; runs consistently; works as depicted | Link generated, production v2.0.0. Jira flow verified live. **Confluence + Rovo not yet live-verified**; video must only show what works | ⚠ finish live tests, then record |
| Video < 5 min, **judges need not watch beyond 3:00** | Plan: all key moments (problem, evidence, conflicts, approval, real result) inside the first 3:00; total ≤ 3:30 | ⚠ re-record |
| Video: public on YouTube, shows project functioning | Owner uploads (Google login not automatable) | ⚠ owner |
| Video: no third-party trademarks or copyrighted music | No music. Jira's "Recommended for your team" sidebar shows third-party app logos; the recording must hide/collapse the Jira navigation sidebar. Demo company renamed from "Northwind" (a Microsoft sample brand) to the fictional "Harbor Ridge" | ✅ code, ⚠ re-record |
| Third-party tools used under their terms (§4) | Narration voice must come from a source licensed for this use (see DEVPOST.md "AI voice"). The unofficial Edge read-aloud endpoint is **not** used for the final video | ⚠ regenerate audio |
| Original work, solely owned, OSS licences respected | MIT; dependencies React, Vite, Tailwind, Forge SDKs are permissively licensed | ✅ owner confirms ownership |
| Instructions for judges incl. configuration | `docs/JUDGE-GUIDE.md` | ✅ |
| Text description + how it meets the technology requirement | `docs/DEVPOST.md` | ✅ |
| English materials | All English | ✅ |
| Category + bonus write-up | Apps for Business Teams; Best Agents (rovo:agent + action modules) | ✅ draft |
| No financial/preferential support from Sponsor | None | ✅ |

## Bonus prizes (from the overview page)

| Bonus | Requirement (per page) | Our position |
|---|---|---|
| Best Agents | Forge app including `rovo:agent`, `rovo:agentConnector`, or reusable `rovo:skill` + `rovo:action` | ✅ **Qualifies on paper:** `rovo:agent` + 5 `action` modules. **Agent not yet tested live in Rovo chat.** |
| Best app with Atlassian MCP | Forge app exposing an MCP server | ❌ Not implemented (`rovo:mcp` is EAP). Do not claim. |
| Teamwork Graph integration | Writes to or reads from the Teamwork Graph API | ❌ Not implemented. Do not claim. |
| Marketplace published | Listing link or Marketplace review ticket | ❌ Not done. Do not claim. |

## Notes
* `rovo:skill` and `rovo:mcp` are early-access and deploy only to development environments (docs, 2026-11-01).
* Privacy policy and terms: `docs/PRIVACY.md`, `docs/TERMS.md` (used in the distribution form).
* The demo site `one-atlas-xzpf.atlassian.net` expires **2027-01-30**.
* Forge CLI 15.0 needs a newer Node patch; CLI 14.2.0 is used.
