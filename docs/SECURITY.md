# Security checklist

| Control | Status | Where |
|---|---|---|
| Least-privilege scopes | Done: `read:jira-work`, `write:jira-work`, `read:jira-user`, `read:page:confluence`, `write:page:confluence`, `read:space:confluence`, `storage:app` | `manifest.yml` |
| Permission-aware retrieval | Done: every Jira/Confluence call uses `api.asUser()` | `src/lib/atlassian.js` |
| No writes without approval | Done: only `executeApproved` writes, for item ids the user approved; the Rovo create action refuses without prior in-app approval | `src/lib/service.js`, `src/actions.js` |
| Tenant isolation | Done: Forge KVS is per installation; handovers also scoped to creator account id | `src/lib/store.js` |
| Server-side identity | Done: account id comes from the platform context, never from client input | `src/index.js` |
| Input validation | Done: strict allow-list patterns for keys/ids, length limits, enum priority, date format | `src/lib/format.js` |
| JQL injection | Mitigated: project/issue keys must match strict regexes before use in JQL | `src/lib/format.js` |
| Output sanitisation | Done: all dynamic text is HTML-escaped in Confluence storage output; React escapes UI text; only `http(s)` links rendered | `format.js`, `Detail.tsx` |
| Safe logging / error redaction | Done: errors are redacted and trimmed; clients get generic messages for unexpected errors | `src/index.js`, `format.js` |
| Rate-limit handling | Done: one bounded retry on HTTP 429 | `atlassian.js` |
| Data minimisation | Done: only excerpts (≤ 220 chars) and source metadata are stored, never full documents | `service.js` |
| Secrets | None in repo or bundle; CLI auth only via environment variables; `.gitignore` blocks token files | |
| Egress | None: no external network access declared | `manifest.yml` |
| Synthetic data only | Done | `src/lib/demo-data.js` |

Residual risks: rotate any API token that has been pasted into chat or logs; excerpts of Confluence/Jira content are stored in the creator's private handover record and persist after source permissions change until the handover is deleted.
