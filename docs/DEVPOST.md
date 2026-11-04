# Devpost submission draft (not submitted)

**Name:** HandoffIQ  **Tagline:** Never lose context between teams.  **Category:** Apps for Business Teams

## Inspiration / problem
When work moves between teams, the context lives in Confluence requirements, Jira tasks and meeting notes. The receiving team inherits conflicting owners and dates, undecided questions and tasks nobody owns, and an AI summary usually smooths these over instead of exposing them.

## What it does
HandoffIQ builds an evidence-linked handover from Jira and Confluence. Every requirement, decision, dependency and risk quotes its source. It detects conflicting owners, dates and scope, turns gaps into clarification questions, and explains a readiness score dimension by dimension. After human review and approval it creates Jira tasks and a Confluence handover page and records everything in an audit trail. A Rovo agent with five actions lets teams query and drive the workflow conversationally.

## How we built it
Forge Custom UI (React/TypeScript) on `jira:globalPage` and `confluence:globalPage`; Forge resolvers and Key-Value Store; Jira REST v3 and Confluence REST v2 called as the invoking user; a deterministic, unit-tested analysis engine; a `rovo:agent` with `action` modules. No external services.

## Challenges
Keeping AI honest: facts, inferences, gaps and assumptions are separated; the agent can propose but never approve. Rovo skills/MCP are early-access and development-only, so they were left out rather than faked.

## Honest status
The Jira flow was tested end to end on a real site. Confluence retrieval/page creation and the Rovo agent are implemented but not yet live-verified. Analysis is deterministic (no generative AI). The demo-video narration is AI-generated speech over a real screen recording. The app is on Runs on Atlassian (no external egress).

## How it meets the technology requirement
HandoffIQ is a Forge app (Custom UI, resolvers, Key-Value Store, `jira:globalPage`, `confluence:globalPage`) that integrates Jira (REST v3: projects, issues, search, create, link), Confluence (REST v2: spaces, pages, create) and Rovo (`rovo:agent` + five `action` modules). All calls run as the invoking user via `asUser`.

## Setup for judges (no configuration needed)
Open the install link, install on Jira (and Confluence if you want page creation), accept the scopes, then open Apps → HandoffIQ. Use **Try the synthetic demo** or **New handover → Create sample content**. Details: docs/JUDGE-GUIDE.md. The Rovo agent needs Rovo enabled on the site.

## Bonus prize: Best Agents
The app includes the `rovo:agent` module (HandoffIQ) and five `action` modules (list, analyze, gaps, propose, create-approved). The agent can propose changes but only executes items a human already approved in the app. Not claimed: Atlassian MCP, Teamwork Graph, Marketplace.

## AI voice
The demo-video narration is AI-generated speech; the screen footage is the real app. No third-party music or logos are used.

## Accomplishments
19 passing unit tests that caught real defects in our own engine; responsive UI verified at desktop, tablet and phone widths; approval-gated, permission-aware execution.

## What we learned / next
Teamwork Graph connectors, rovo:mcp and rovo:skill once GA; shared team handovers; Marketplace listing.

## Built with
Atlassian Forge, Rovo agents and actions, Jira Cloud REST API, Confluence Cloud REST API v2, React, TypeScript, Vite.

## Bonus claims
Only "Best Agents" is plausibly applicable (Rovo agent + actions); confirm 2026 wording and live-test first. No claims for MCP, Teamwork Graph or Marketplace.

Repository: https://github.com/venkatkrish98/HandoffIQ

Install link (production, Jira + Confluence): https://developer.atlassian.com/console/install/e68f72e1-81ae-4e1a-b52a-9315f7c103c8?signature=AYABeGSVtpR%2FMeWkcfSMMImSn5YAAAADAAdhd3Mta21zAEthcm46YXdzOmttczp1cy13ZXN0LTI6NzA5NTg3ODM1MjQzOmtleS83MDVlZDY3MC1mNTdjLTQxYjUtOWY5Yi1lM2YyZGNjMTQ2ZTcAuAECAQB4CxqLTo9l4lqXuFjNim1xJM%2Bp%2F3TVP9xHS2BrU5DRRucBycegbY%2FHxhF5%2B2bF5OULswAAAH4wfAYJKoZIhvcNAQcGoG8wbQIBADBoBgkqhkiG9w0BBwEwHgYJYIZIAWUDBAEuMBEEDPVz1H4rePvS1K%2Bf%2FQIBEIA7Kb2qPXnUaDxECp4tqNW1C1in%2FKk7S%2BSZ6Qw1rmN1f7pkyHGclG1wQUsNcluk4njFvQ%2FblwiiOko0BzcAB2F3cy1rbXMAS2Fybjphd3M6a21zOmV1LXdlc3QtMTo3MDk1ODc4MzUyNDM6a2V5LzQ2MzBjZTZiLTAwYzMtNGRlMi04NzdiLTYyN2UyMDYwZTVjYwC4AQICAHi9bVMAkme4qVQX1fQHo6ePw3H40A7cGfz7yrmSfBWMXgELWYvs5DoGEw%2BeEd%2FJ9a0JAAAAfjB8BgkqhkiG9w0BBwagbzBtAgEAMGgGCSqGSIb3DQEHATAeBglghkgBZQMEAS4wEQQMANRZOI43nFFGUipTAgEQgDtUFh6YFqx55Yh%2BDOtyt8eVzANZPHPs6qf9LiDfSj59l%2Bd4JAqnQFuONNXmulmCnok5I6Tiy6yR75rUewAHYXdzLWttcwBLYXJuOmF3czprbXM6dXMtZWFzdC0xOjcwOTU4NzgzNTI0MzprZXkvNmMxMjBiYTAtNGNkNS00OTg1LWI4MmUtNDBhMDQ5NTJjYzU3ALgBAgIAeDYASx0XCjkny4iLV6vz%2BKtEGSGT6kdt0QRpkn6D%2FlVEAUqeZtbJq%2BD23K3jRXN%2FlXoAAAB%2BMHwGCSqGSIb3DQEHBqBvMG0CAQAwaAYJKoZIhvcNAQcBMB4GCWCGSAFlAwQBLjARBAykmRivXfnz%2FgnFK08CARCAO7bpdx6gjNkW6elOtC0siwY%2BTt4WRkHFL2shZuw5p87cMRQMmNDm069CjTxwALPn6fm4yxESHhTSjjnTAgAAAAAMAAAQAAAAAAAAAAAAAAAAAHPPi8Ee0yV0L4LvWClO19f%2F%2F%2F%2F%2FAAAAAQAAAAAAAAAAAAAAAQAAADLYLJ56omHQK4vEVk60Qpd6Y3QXxgnBmPCxwklAhKnOfR1dFuy10C8GZ34j469Gm0JGvTF6dNmlfmHwiQllQChQOEw%3D&product=jira&product=confluence

*Fill in before submitting: video URL.*
