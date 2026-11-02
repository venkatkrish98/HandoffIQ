# Source references (checked 2026-11-01)

| Topic | URL | Notes |
|---|---|---|
| Hackathon rules | https://codegeist2026.devpost.com/rules | HTTP 403 to automated fetch; only search snippets read |
| Forge platform | https://developer.atlassian.com/platform/forge/ | |
| `rovo:agent` | https://developer.atlassian.com/platform/forge/manifest-reference/modules/rovo-agent/ | `key`, `name` (≤30), `prompt` required; `actions`, `conversationStarters` optional |
| `action` (Rovo action) | https://developer.atlassian.com/platform/forge/manifest-reference/modules/rovo-action/ | verbs GET/CREATE/UPDATE/DELETE/TRIGGER; no built-in confirmation step, so approval is enforced in app code |
| `rovo:skill` | https://developer.atlassian.com/platform/forge/manifest-reference/modules/rovo-skill/ | EAP; development environments only |
| `rovo:mcp` | https://developer.atlassian.com/platform/forge/manifest-reference/modules/rovo-mcp/ | EAP; one per app |
| `jira:globalPage` | https://developer.atlassian.com/platform/forge/manifest-reference/modules/jira-global-page/ | one per app |
| `confluence:globalPage` | https://developer.atlassian.com/platform/forge/manifest-reference/modules/confluence-global-page/ | `route` required; use `router` from `@forge/bridge` for links |
| Confluence REST v2 | https://developer.atlassian.com/cloud/confluence/rest/v2/ | scopes `read:page:confluence`, `write:page:confluence`, `read:space:confluence`; request shapes from general API knowledge, to be confirmed by live test |
| Forge CLI | `forge --help` (v14.2.0) | CLI 15.0 needs newer Node |
