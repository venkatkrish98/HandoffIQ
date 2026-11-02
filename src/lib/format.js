/**
 * Pure helpers: content conversion, input validation, action-plan building and
 * Confluence document generation. No network access.
 */

export class HandoffError extends Error {
  constructor(code, message, status) {
    super(message);
    this.code = code; // VALIDATION | PERMISSION | NOT_FOUND | RATE_LIMIT | UPSTREAM | CONFLICT
    this.status = status;
  }
}

/* ---------- escaping & conversion ---------- */

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

const ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ', '&rsquo;': '’', '&lsquo;': '‘', '&ndash;': '–', '&mdash;': '—' };

/** Confluence storage format (XHTML-ish) → plain text with line breaks. */
export function storageToText(storage) {
  return String(storage || '')
    .replace(/<ac:structured-macro[^>]*ac:name="(?:code|noformat)"[\s\S]*?<\/ac:structured-macro>/gi, ' ')
    .replace(/<\/(p|li|tr|h[1-6]|div|blockquote)>|<br\s*\/?>/gi, '\n')
    .replace(/<\/t[dh]>/gi, ' | ')
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z#0-9]+;/gi, (e) => ENTITIES[e.toLowerCase()] ?? ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}

/** Atlassian Document Format → plain text. */
export function adfToText(node) {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (node.type === 'text') return node.text || '';
  if (node.type === 'hardBreak') return '\n';
  const inner = (node.content || []).map(adfToText).join('');
  return ['paragraph', 'heading', 'listItem', 'blockquote', 'codeBlock', 'tableRow'].includes(node.type) ? `${inner}\n` : inner;
}

/** Plain text → minimal ADF document (one paragraph per line). */
export function textToAdf(text) {
  const lines = String(text || '').split(/\r?\n/).filter((l) => l.trim().length);
  return {
    type: 'doc',
    version: 1,
    content: (lines.length ? lines : ['(no description)']).map((l) => ({ type: 'paragraph', content: [{ type: 'text', text: l.slice(0, 2000) }] })),
  };
}

/* ---------- validation ---------- */

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
export const JIRA_PRIORITY = { Low: 'Low', Medium: 'Medium', High: 'High', Critical: 'Highest' };

const str = (v, name, max, { required = false } = {}) => {
  const s = typeof v === 'string' ? v.trim() : '';
  if (required && !s) throw new HandoffError('VALIDATION', `${name} is required`);
  if (s.length > max) throw new HandoffError('VALIDATION', `${name} must be at most ${max} characters`);
  return s;
};

const list = (v, name, pattern, max = 25) => {
  const arr = Array.isArray(v) ? v : [];
  if (arr.length > max) throw new HandoffError('VALIDATION', `${name}: at most ${max} entries`);
  return [...new Set(arr.map((x) => String(x).trim()).filter(Boolean))].map((x) => {
    if (!pattern.test(x)) throw new HandoffError('VALIDATION', `${name}: invalid value "${x.slice(0, 40)}"`);
    return x;
  });
};

export const PATTERNS = {
  projectKey: /^[A-Z][A-Z0-9_]{1,19}$/,
  issueKey: /^[A-Z][A-Z0-9_]{1,19}-\d{1,8}$/,
  pageId: /^\d{1,20}$/,
  id: /^[A-Za-z0-9_-]{1,64}$/,
};

export function validateHandoverInput(input = {}) {
  const expectedDelivery = str(input.expectedDelivery, 'Expected delivery date', 10);
  if (expectedDelivery && !/^\d{4}-\d{2}-\d{2}$/.test(expectedDelivery)) throw new HandoffError('VALIDATION', 'Expected delivery date must be YYYY-MM-DD');
  const priority = str(input.priority, 'Priority', 10) || 'Medium';
  if (!PRIORITIES.includes(priority)) throw new HandoffError('VALIDATION', `Priority must be one of ${PRIORITIES.join(', ')}`);
  return {
    name: str(input.name, 'Project / customer name', 120, { required: true }),
    sourceTeam: str(input.sourceTeam, 'Source team', 80, { required: true }),
    receivingTeam: str(input.receivingTeam, 'Receiving team', 80, { required: true }),
    description: str(input.description, 'Project description', 2000),
    priority,
    expectedDelivery,
    jiraProjectKeys: list(input.jiraProjectKeys, 'Jira projects', PATTERNS.projectKey, 5),
    jiraIssueKeys: list(input.jiraIssueKeys, 'Jira issues', PATTERNS.issueKey, 50),
    pageIds: list(input.pageIds, 'Confluence pages', PATTERNS.pageId, 25),
    notes: str(input.notes, 'Additional notes', 2000),
  };
}

export function assertId(id) {
  if (!PATTERNS.id.test(String(id || ''))) throw new HandoffError('VALIDATION', 'Invalid identifier');
  return id;
}

/** Redact secrets/tokens from text before it is logged or returned. */
export function redact(text) {
  return String(text ?? '')
    .replace(/(authorization|bearer|token|secret|password)["':= ]+(?:bearer\s+)?[^\s"',}]+/gi, '$1=[redacted]')
    .replace(/ATATT[A-Za-z0-9_\-=]+/g, '[redacted]')
    .slice(0, 400);
}

/* ---------- action plan ---------- */

/**
 * Build the proposed (not yet executed) changes from an analysis. Nothing here
 * touches Jira or Confluence.
 */
export function buildPlan(handover, analysis, sourcesMeta) {
  const items = [];
  let n = 0;
  const add = (it) => items.push({ id: `p${++n}`, status: 'proposed', selected: true, ...it });
  const cite = (ids) => (ids || []).filter(Boolean).map((id) => sourcesMeta.find((s) => s.id === id)).filter(Boolean);
  const refs = (ids) => cite(ids).map((s) => `${s.title} — ${s.url}`).join('\n');

  for (const c of analysis.contradictions.slice(0, 4)) {
    add({
      type: 'jira-issue',
      title: `[Handoff] Resolve conflict: ${c.summary}`.slice(0, 200),
      description: `${c.summary}\n\nEvidence:\n${c.sides.map((s) => `• ${s.label}: “${s.excerpt}”`).join('\n')}\n\nGenerated by HandoffIQ for handover "${handover.name}".`,
      priority: 'High',
      rationale: 'Contradictions must be resolved before the receiving team accepts the handover.',
    });
  }
  for (const f of analysis.facts.filter((x) => x.category === 'owner' && x.kind === 'missing').slice(0, 3)) {
    add({
      type: 'jira-issue',
      title: `[Handoff] Assign an owner for ${f.ref || f.sourceTitle}`.slice(0, 200),
      description: `${f.text}.\n\nSource: ${f.sourceTitle} — ${f.sourceUrl}\n\nGenerated by HandoffIQ for handover "${handover.name}".`,
      priority: 'Medium',
      rationale: 'Ownership coverage is part of the readiness score.',
    });
  }
  // Conflict and missing-owner questions already have dedicated issues above.
  const covered = (x) => x.reason === 'Contradiction between sources' || x.reason === 'No assignee in Jira';
  for (const q of analysis.questions.filter((x) => x.status === 'open' && !covered(x)).slice(0, 3)) {
    add({
      type: 'jira-issue',
      title: `[Handoff] Clarify: ${q.text}`.slice(0, 200),
      description: `${q.text}\nReason: ${q.reason}\n\n${refs(q.refs) ? `Sources:\n${refs(q.refs)}\n\n` : ''}Generated by HandoffIQ for handover "${handover.name}".`,
      priority: 'Medium',
      rationale: q.reason,
    });
  }
  add({
    type: 'confluence-page',
    title: `Handover: ${handover.name}`.slice(0, 200),
    description: 'Structured handover document with evidence, decisions, open questions, risks and ownership.',
    rationale: 'Gives the receiving team one verifiable source of truth.',
  });
  return items;
}

/* ---------- Confluence document ---------- */

const h = (n, t) => `<h${n}>${escapeHtml(t)}</h${n}>`;
const ul = (arr) => (arr.length ? `<ul>${arr.map((x) => `<li>${x}</li>`).join('')}</ul>` : '<p><em>None identified in the retrieved sources.</em></p>');
const link = (s) => (s.url && /^https?:\/\//.test(s.url) ? `<a href="${escapeHtml(s.url)}">${escapeHtml(s.title)}</a>` : escapeHtml(s.title));

/** Render the handover as Confluence storage format. All dynamic text is escaped. */
export function buildConfluenceDoc(handover, analysis, sourcesMeta, createdIssues = []) {
  const byCat = (c) => analysis.facts.filter((f) => f.category === c);
  const cited = (f) => `${escapeHtml(f.text)} <em>(${link({ title: f.sourceTitle, url: f.sourceUrl })})</em>`;
  const r = analysis.readiness;
  const parts = [
    `<p><strong>Generated by HandoffIQ</strong> on ${escapeHtml(new Date().toISOString().slice(0, 10))}. Verified items cite a source; inferences and gaps are labelled.</p>`,
    h(2, 'Project overview'),
    `<p>${escapeHtml(handover.description || 'No description provided.')}</p>`,
    ul([
      `Source team: ${escapeHtml(handover.sourceTeam)}`,
      `Receiving team: ${escapeHtml(handover.receivingTeam)}`,
      `Business priority: ${escapeHtml(handover.priority)}`,
      `Expected delivery (user-provided): ${escapeHtml(handover.expectedDelivery || 'not set')}`,
    ]),
    h(2, `Readiness: ${r.score}/100 (${escapeHtml(r.band)})`),
    `<p>${escapeHtml(r.method)}</p>`,
    ul(r.dimensions.map((d) => `${escapeHtml(d.label)}: ${d.score}/100 (weight ${d.weight}) — ${escapeHtml(d.why)}`)),
    h(2, 'Confirmed requirements (verified)'),
    ul(byCat('requirement').map(cited)),
    h(2, 'Decisions (verified)'),
    ul(byCat('decision').map(cited)),
    h(2, 'Conflicting information (inferred by comparing sources)'),
    ul(analysis.contradictions.map((c) => `<strong>${escapeHtml(c.summary)}</strong>${ul(c.sides.map((s) => `${escapeHtml(s.label || '')}: “${escapeHtml(s.excerpt || '')}”`))}`)),
    h(2, 'Open questions (missing information)'),
    ul(analysis.questions.map((q) => `[${escapeHtml(q.status)}] ${escapeHtml(q.text)}${q.assignee ? ` — assigned to ${escapeHtml(q.assignee)}` : ''}${q.response ? ` — response: ${escapeHtml(q.response)}` : ''}`)),
    h(2, 'Dependencies'),
    ul(byCat('dependency').map(cited)),
    h(2, 'Risks and blockers'),
    ul(byCat('risk').map(cited)),
    h(2, 'Ownership'),
    ul(byCat('owner').filter((o) => o.kind === 'verified').map(cited)),
    h(2, 'Dates and milestones'),
    ul(byCat('date').map(cited)),
    h(2, 'User-provided assumptions'),
    ul(analysis.assumptions.map((a) => escapeHtml(a.text))),
    h(2, 'Next actions'),
    ul(createdIssues.length ? createdIssues.map((i) => `${link({ title: i.key, url: i.url })} — ${escapeHtml(i.title)}`) : ['No Jira tasks created yet.']),
    h(2, 'Source evidence'),
    ul(sourcesMeta.map((s) => `${link(s)} — ${escapeHtml(s.type)}, retrieved ${escapeHtml(s.retrievedAt)}`)),
  ];
  return parts.join('');
}
