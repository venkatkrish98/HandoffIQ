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

## Accomplishments
19 passing unit tests that caught real defects in our own engine; responsive UI verified at desktop, tablet and phone widths; approval-gated, permission-aware execution.

## What we learned / next
Teamwork Graph connectors, rovo:mcp and rovo:skill once GA; shared team handovers; Marketplace listing.

## Built with
Atlassian Forge, Rovo agents and actions, Jira Cloud REST API, Confluence Cloud REST API v2, React, TypeScript, Vite.

## Bonus claims
Only "Best Agents" is plausibly applicable (Rovo agent + actions); confirm 2026 wording and live-test first. No claims for MCP, Teamwork Graph or Marketplace.

Repository: https://github.com/venkatkrish98/HandoffIQ

*Fill in before submitting: install link, video URL.*
