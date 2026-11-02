/**
 * Thin Atlassian REST client. Every call runs as the invoking user
 * (api.asUser()), so Jira/Confluence permissions are always enforced by
 * Atlassian itself — HandoffIQ never reads anything the user cannot read.
 */
import * as forgeApi from '@forge/api';
import { HandoffError, adfToText, storageToText, textToAdf, redact, JIRA_PRIORITY } from './format.js';

// Interop-safe access: the bundler may expose the default export or only the namespace.
const api = forgeApi.default && forgeApi.default.asUser ? forgeApi.default : forgeApi;
const route = forgeApi.route || forgeApi.default?.route;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function call(fetcher, req, init = {}) {
  let res = await fetcher(req, { ...init, headers: { Accept: 'application/json', ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers } });
  if (res.status === 429) {
    const wait = Math.min(Number(res.headers.get('retry-after')) || 1, 3) * 1000;
    await sleep(wait);
    res = await fetcher(req, { ...init, headers: { Accept: 'application/json', ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers } });
  }
  if (res.ok) return res.status === 204 ? null : res.json();
  const body = redact(await res.text().catch(() => ''));
  if (res.status === 401 || res.status === 403) throw new HandoffError('PERMISSION', 'You do not have permission to access this Atlassian resource.', res.status);
  if (res.status === 404) throw new HandoffError('NOT_FOUND', 'The requested Atlassian resource was not found or is not visible to you.', 404);
  if (res.status === 429) throw new HandoffError('RATE_LIMIT', 'Atlassian is rate limiting requests. Please retry shortly.', 429);
  throw new HandoffError('UPSTREAM', `Atlassian returned ${res.status}: ${body}`, res.status);
}

const jira = (r, init) => call(api.asUser().requestJira, r, init);
const conf = (r, init) => call(api.asUser().requestConfluence, r, init);

const origin = (url) => { try { return new URL(url).origin; } catch { return ''; } };

/* ---------- identity ---------- */

export async function whoAmI() {
  const me = await jira(route`/rest/api/3/myself`);
  return { accountId: me.accountId, displayName: me.displayName };
}

/* ---------- discovery lists for the UI ---------- */

export async function listJiraProjects() {
  const data = await jira(route`/rest/api/3/project/search?maxResults=50&orderBy=name`);
  return (data.values || []).map((p) => ({ key: p.key, name: p.name }));
}

export async function listConfluenceSpaces() {
  const data = await conf(route`/wiki/api/v2/spaces?limit=50&status=current`);
  return (data.results || []).map((s) => ({ id: s.id, key: s.key, name: s.name }));
}

export async function listConfluencePages(spaceId) {
  const data = await conf(route`/wiki/api/v2/spaces/${spaceId}/pages?limit=50&sort=-modified-date&status=current`);
  return (data.results || []).map((p) => ({ id: p.id, title: p.title }));
}

export async function listJiraIssues(projectKey) {
  const data = await jira(route`/rest/api/3/search/jql`, {
    method: 'POST',
    body: JSON.stringify({ jql: `project = "${projectKey}" ORDER BY updated DESC`, fields: ['summary', 'status'], maxResults: 50 }),
  });
  return (data.issues || []).map((i) => ({ key: i.key, summary: i.fields.summary, status: i.fields.status?.name }));
}

/* ---------- evidence retrieval ---------- */

const ISSUE_FIELDS = ['summary', 'description', 'status', 'assignee', 'duedate', 'priority', 'labels', 'updated'];

function issueToSource(issue, retrievedAt) {
  const f = issue.fields || {};
  return {
    id: `jira:${issue.key}`,
    type: 'jira',
    title: f.summary || issue.key,
    url: `${origin(issue.self)}/browse/${issue.key}`,
    text: adfToText(f.description).trim(),
    retrievedAt,
    meta: {
      key: issue.key,
      status: f.status?.name || '',
      assignee: f.assignee?.displayName || null,
      dueDate: f.duedate || null,
      priority: f.priority?.name || '',
      flagged: (f.labels || []).some((l) => /^(blocked|flagged|impediment)$/i.test(l)),
      updated: f.updated || null,
    },
  };
}

export async function fetchJiraSources({ projectKeys = [], issueKeys = [] }, retrievedAt) {
  const clauses = [];
  if (projectKeys.length) clauses.push(`project in (${projectKeys.map((k) => `"${k}"`).join(',')})`);
  if (issueKeys.length) clauses.push(`key in (${issueKeys.map((k) => `"${k}"`).join(',')})`);
  if (!clauses.length) return { sources: [], warnings: [] };
  const data = await jira(route`/rest/api/3/search/jql`, {
    method: 'POST',
    body: JSON.stringify({ jql: `(${clauses.join(' OR ')}) ORDER BY updated DESC`, fields: ISSUE_FIELDS, maxResults: 50 }),
  });
  return { sources: (data.issues || []).map((i) => issueToSource(i, retrievedAt)), warnings: [] };
}

export async function fetchConfluenceSources(pageIds, retrievedAt) {
  const sources = [];
  const warnings = [];
  for (const id of pageIds) {
    try {
      const p = await conf(route`/wiki/api/v2/pages/${id}?body-format=storage`);
      sources.push({
        id: `confluence:${p.id}`,
        type: 'confluence',
        title: p.title,
        url: `${p._links?.base || ''}${p._links?.webui || ''}`,
        text: storageToText(p.body?.storage?.value),
        retrievedAt,
        meta: { updated: p.version?.createdAt || null, version: p.version?.number },
      });
    } catch (e) {
      // Never pretend inaccessible content was retrieved: report it instead.
      warnings.push({ sourceId: `confluence:${id}`, code: e.code || 'UPSTREAM', message: e.message });
    }
  }
  return { sources, warnings };
}

/* ---------- writes (called only after explicit approval) ---------- */

async function issueTypeFor(projectKey) {
  const p = await jira(route`/rest/api/3/project/${projectKey}`);
  const types = (p.issueTypes || []).filter((t) => !t.subtask);
  const chosen = types.find((t) => t.name === 'Task') || types[0];
  if (!chosen) throw new HandoffError('VALIDATION', `Project ${projectKey} has no usable issue type.`);
  return chosen.id;
}

export async function createJiraIssue({ projectKey, title, description, priority, assigneeId, dueDate }) {
  const issuetype = { id: await issueTypeFor(projectKey) };
  const fields = {
    project: { key: projectKey },
    summary: title.slice(0, 250),
    description: textToAdf(description),
    issuetype,
    priority: { name: JIRA_PRIORITY[priority] || priority || 'Medium' },
  };
  if (assigneeId) fields.assignee = { accountId: assigneeId };
  if (dueDate) fields.duedate = dueDate;
  // Some project screens reject optional fields; drop only the rejected ones and retry.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const created = await jira(route`/rest/api/3/issue`, { method: 'POST', body: JSON.stringify({ fields }) });
      return { key: created.key, id: created.id, url: `${origin(created.self)}/browse/${created.key}` };
    } catch (e) {
      const m = /"errors":\{([^}]*)\}/.exec(e.message || '');
      const bad = m ? ['priority', 'assignee', 'duedate'].find((k) => m[1].includes(`"${k}"`)) : null;
      if (e.code === 'UPSTREAM' && bad && fields[bad]) delete fields[bad];
      else throw e;
    }
  }
  throw new HandoffError('UPSTREAM', 'Jira rejected the issue after retries.');
}

export async function linkIssues(inwardKey, outwardKey) {
  await jira(route`/rest/api/3/issueLink`, {
    method: 'POST',
    body: JSON.stringify({ type: { name: 'Relates' }, inwardIssue: { key: inwardKey }, outwardIssue: { key: outwardKey } }),
  });
}

export async function createConfluencePage({ spaceId, title, storageBody }) {
  const p = await conf(route`/wiki/api/v2/pages`, {
    method: 'POST',
    body: JSON.stringify({ spaceId, status: 'current', title: title.slice(0, 255), body: { representation: 'storage', value: storageBody } }),
  });
  return { id: p.id, title: p.title, url: `${p._links?.base || ''}${p._links?.webui || ''}` };
}
