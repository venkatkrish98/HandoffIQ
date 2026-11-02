/**
 * HandoffIQ analysis engine.
 *
 * Pure, deterministic functions (no network, no AI provider). Everything the
 * engine reports is traceable to a source excerpt or is explicitly labelled as
 * an inference, a missing item, or a user-provided assumption.
 *
 * Source shape:
 *   { id, type: 'jira'|'confluence'|'note', title, url, text, retrievedAt,
 *     meta?: { key, status, assignee, dueDate, priority, flagged, updated } }
 */

export const KINDS = ['verified', 'inferred', 'missing', 'assumption'];

const STOP = new Set(
  'the a an and or of to for in on at by with from is are be as it this that will should must shall can has have had not no we our their its into per via'.split(' '),
);

const MONTHS = 'jan feb mar apr may jun jul aug sep oct nov dec'.split(' ');

const RE = {
  requirement: /\b(must|shall|should|required?|requirements?|needs? to|will support|has to)\b/i,
  decision: /\b(decided|decision|agreed|approved|confirmed|signed off|we will go with)\b/i,
  risk: /\b(risks?|blockers?|blocked|at risk|concern|threat|delayed)\b/i,
  dependency: /\b(depends? on|dependent on|dependency|waiting (on|for)|requires .{3,40} from|prerequisite)\b/i,
  open: /(\bTBD\b|\bTBC\b|to be (decided|confirmed|defined)|unresolved|open question|unclear|not yet (decided|agreed|confirmed))/i,
  scopeOut: /\b(out of scope|not in scope|descoped|won't (be )?(built|included|supported)|will not (be )?(built|included|supported))\b/i,
  deadline: /\b(deadline|due|deliver(y|ed)?|go[- ]?live|launch|release|ship)\b/i,
  owner: /\b(owner|owned by|lead|responsible|accountable)\b\s*(?:is|:|-|=)?\s*([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/,
};

const ISO_DATE = /\b(\d{4})-(\d{2})-(\d{2})\b/;
const LONG_DATE = new RegExp(`\\b(\\d{1,2})\\s+(${MONTHS.join('|')})[a-z]*\\.?,?\\s+(\\d{4})\\b|\\b(${MONTHS.join('|')})[a-z]*\\.?\\s+(\\d{1,2}),?\\s+(\\d{4})\\b`, 'i');

/** Parse the first calendar date in a string into YYYY-MM-DD, or null. */
export function parseDate(text) {
  const iso = ISO_DATE.exec(text);
  if (iso) return validDate(+iso[1], +iso[2], +iso[3]);
  const m = LONG_DATE.exec(text);
  if (!m) return null;
  if (m[1]) return validDate(+m[3], MONTHS.indexOf(m[2].toLowerCase()) + 1, +m[1]);
  return validDate(+m[6], MONTHS.indexOf(m[4].toLowerCase()) + 1, +m[5]);
}

function validDate(y, mo, d) {
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return dt.toISOString().slice(0, 10);
}

/** Lower-cased content words used to decide whether two claims are about the same subject. */
export function tokens(text) {
  return (text.toLowerCase().match(/[a-z0-9]+/g) || []).filter((w) => w.length > 2 && !STOP.has(w));
}

export function jaccard(a, b) {
  const A = new Set(a);
  const B = new Set(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter);
}

/** Split source text into trimmed, de-bulleted lines worth examining. */
export function splitLines(text) {
  return String(text || '')
    .split(/\r?\n|(?<=[.!?])\s+(?=[A-Z])/)
    .map((l) => l.replace(/^[\s\-*•\d.)]+/, '').trim())
    .filter((l) => l.length >= 8 && l.length <= 400);
}

/** Truncate an excerpt for storage and display. */
export function excerpt(line, max = 220) {
  return line.length > max ? `${line.slice(0, max - 1)}…` : line;
}

/** How fresh is a retrieval? */
export function freshness(retrievedAt, now = Date.now()) {
  const age = now - new Date(retrievedAt).getTime();
  if (!Number.isFinite(age)) return 'stale';
  if (age < 24 * 3600e3) return 'fresh';
  if (age < 7 * 24 * 3600e3) return 'aging';
  return 'stale';
}

let seq = 0;
const nextId = (prefix) => `${prefix}-${++seq}`;

function item(kind, category, text, src, extra = {}) {
  return {
    id: nextId(category.slice(0, 3)),
    category,
    kind,
    text,
    sourceId: src ? src.id : null,
    sourceTitle: src ? src.title : null,
    sourceUrl: src ? src.url : null,
    excerpt: src ? excerpt(extra.line || text) : null,
    ...extra.fields,
  };
}

/**
 * Extract classified claims from sources. Jira metadata is trusted as
 * structured evidence; free text is classified with transparent patterns.
 */
export function extractFacts(sources) {
  seq = 0;
  const facts = [];
  for (const src of sources) {
    const m = src.meta || {};
    if (src.type === 'jira') {
      if (!m.assignee) {
        facts.push(item('missing', 'owner', `${m.key || src.title} has no assignee`, src, { line: src.title, fields: { ref: m.key } }));
      } else {
        facts.push(item('verified', 'owner', `${m.key || src.title} is assigned to ${m.assignee}`, src, { line: src.title, fields: { person: m.assignee, ref: m.key } }));
      }
      if (m.dueDate) facts.push(item('verified', 'date', `${m.key || src.title} is due ${m.dueDate}`, src, { line: src.title, fields: { date: m.dueDate, ref: m.key } }));
      if (m.flagged || /blocked/i.test(m.status || '')) {
        facts.push(item('verified', 'risk', `${m.key || src.title} is blocked/flagged (${m.status || 'flagged'})`, src, { line: src.title, fields: { critical: true, ref: m.key } }));
      }
      facts.push(item('verified', 'task', `${m.key || ''} ${src.title} [${m.status || 'unknown status'}]`.trim(), src, { line: src.title, fields: { ref: m.key, status: m.status } }));
    }
    for (const line of splitLines(src.text)) {
      const open = RE.open.test(line);
      const date = parseDate(line);
      const ownerMatch = RE.owner.exec(line);
      if (ownerMatch) {
        facts.push(item('verified', 'owner', `${ownerMatch[2]} is named as owner/lead`, src, { line, fields: { person: ownerMatch[2], subject: subjectOf(line, ownerMatch.index) } }));
      }
      if (RE.deadline.test(line) && date) {
        facts.push(item('verified', 'date', `Date stated: ${date}`, src, { line, fields: { date, subject: dateSubject(line) } }));
      }
      if (RE.scopeOut.test(line)) facts.push(item('verified', 'scopeOut', line, src, { line }));
      else if (RE.decision.test(line) && !open) facts.push(item('verified', 'decision', line, src, { line }));
      else if (RE.requirement.test(line)) facts.push(item(open ? 'missing' : 'verified', open ? 'openRequirement' : 'requirement', line, src, { line }));
      if (RE.dependency.test(line)) facts.push(item('verified', 'dependency', line, src, { line }));
      if (RE.risk.test(line)) facts.push(item('verified', 'risk', line, src, { line, fields: { critical: /\bblock(er|ed)\b/i.test(line) } }));
      if (open || /\?\s*$/.test(line)) facts.push(item('missing', 'question', line, src, { line }));
    }
  }
  return facts;
}

const DATE_GENERIC = new Set(['project', 'customer', 'client', 'final', 'target', 'planned', 'go', 'live', 'golive', 'deadline', 'due', 'delivery', 'deliver', 'delivered', 'launch', 'release', 'ship', 'date']);
/** Subject of a date claim: its topic words minus generic delivery vocabulary and the date itself. Empty means 'overall delivery'. */
function dateSubject(line) {
  return tokens(line.replace(ISO_DATE, ' ').replace(LONG_DATE, ' ')).filter((w) => !DATE_GENERIC.has(w)).join(' ');
}

function subjectOf(line, idx) {
  const before = idx > 0 ? line.slice(0, idx) : line;
  const t = tokens(before);
  return t.length ? t.join(' ') : tokens(line).slice(0, 4).join(' ');
}

/**
 * Detect conflicting owners, conflicting dates and requirement-vs-scope conflicts.
 * Each contradiction cites both sides, so it is verifiable.
 */
export function detectContradictions(facts, handover = {}) {
  const out = [];
  const owners = facts.filter((f) => f.category === 'owner' && f.person && f.subject);
  for (let i = 0; i < owners.length; i++) {
    for (let j = i + 1; j < owners.length; j++) {
      const a = owners[i];
      const b = owners[j];
      if (a.person !== b.person && jaccard(tokens(a.subject), tokens(b.subject)) >= 0.5) {
        out.push(conflict('owner', `Conflicting owners: ${a.person} vs ${b.person}`, a, b));
      }
    }
  }
  const dates = facts.filter((f) => f.category === 'date' && f.subject !== undefined);
  for (let i = 0; i < dates.length; i++) {
    for (let j = i + 1; j < dates.length; j++) {
      const a = dates[i];
      const b = dates[j];
      if (a.date !== b.date && a.sourceId !== b.sourceId && sameDateSubject(a.subject, b.subject)) {
        out.push(conflict('date', `Conflicting dates: ${a.date} vs ${b.date}`, a, b));
      }
    }
  }
  if (handover.expectedDelivery) {
    for (const d of dates) {
      if (d.date !== handover.expectedDelivery && /deliver|go[- ]?live|launch|release/i.test(d.excerpt || '')) {
        out.push({
          id: nextId('con'),
          type: 'date',
          kind: 'inferred',
          summary: `Source states ${d.date} but the handover expects ${handover.expectedDelivery}`,
          sides: [{ label: 'Handover form (user-provided)', excerpt: handover.expectedDelivery }, sideOf(d)],
        });
      }
    }
  }
  const reqs = facts.filter((f) => f.category === 'requirement');
  for (const s of facts.filter((f) => f.category === 'scopeOut')) {
    for (const r of reqs) {
      if (jaccard(topicTokens(s.text), topicTokens(r.text)) >= 0.4) out.push(conflict('scope', 'A requirement overlaps with an out-of-scope statement', r, s));
    }
  }
  return dedupe(out);
}

/** Content words minus words that only signal the claim type (so "requirement"/"scope" don't dilute topic overlap). */
const GENERIC = new Set(['requirement', 'requirements', 'scope', 'out', 'available', 'phase', 'support']);
function topicTokens(text) {
  const t = tokens(text).filter((w) => !GENERIC.has(w));
  return t.length ? t : tokens(text);
}

function sameDateSubject(a, b) {
  if (!a && !b) return true;
  return jaccard(tokens(a), tokens(b)) >= 0.34;
}

function sideOf(f) {
  return { label: f.sourceTitle, sourceId: f.sourceId, sourceUrl: f.sourceUrl, excerpt: f.excerpt };
}

function conflict(type, summary, a, b) {
  return { id: nextId('con'), type, kind: 'inferred', summary, sides: [sideOf(a), sideOf(b)] };
}

function dedupe(list) {
  const seen = new Set();
  return list.filter((c) => {
    const key = `${c.type}|${c.summary}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Generate clarification questions from conflicts and gaps. */
export function generateQuestions(facts, contradictions, handover = {}) {
  const qs = [];
  const seen = new Set();
  const add = (text, reason, refs) => {
    const key = tokens(text).join(' ');
    if (seen.has(key)) return;
    seen.add(key);
    qs.push({ id: nextId('q'), text, reason, refs: refs || [], status: 'open', assignee: null, response: '' });
  };
  for (const c of contradictions) {
    if (c.type === 'owner') add(`${c.summary}. Who is the accountable owner?`, 'Contradiction between sources', c.sides.map((s) => s.sourceId));
    else if (c.type === 'date') add(`${c.summary}. Which date is correct and who confirms it?`, 'Contradiction between sources', c.sides.map((s) => s.sourceId));
    else add('A requirement overlaps with something marked out of scope. Is it in scope?', 'Contradiction between sources', c.sides.map((s) => s.sourceId));
  }
  for (const f of facts.filter((x) => x.category === 'owner' && x.kind === 'missing')) {
    add(`Who will own ${f.ref || 'this task'}?`, 'No assignee in Jira', [f.sourceId]);
  }
  for (const f of facts.filter((x) => x.category === 'question' || x.category === 'openRequirement')) {
    add(`Resolve open item: “${excerpt(f.text, 140)}”`, 'Marked unresolved in source', [f.sourceId]);
  }
  if (!handover.expectedDelivery && !facts.some((f) => f.category === 'date')) {
    add('What is the confirmed delivery date?', 'No delivery date found in any source or on the handover', []);
  }
  if (!facts.some((f) => f.category === 'decision')) add('Which key decisions have been made and where are they recorded?', 'No decision statements found', []);
  if (!facts.some((f) => f.category === 'dependency')) add('Are there external dependencies the receiving team must know about?', 'No dependencies found; absence is not proof there are none', []);
  return qs;
}

export const WEIGHTS = {
  requirements: 20,
  decisions: 15,
  ownership: 15,
  dependencies: 10,
  documentation: 10,
  blockers: 15,
  approval: 15,
};

/**
 * Transparent readiness model. Each dimension is 0–100 with a plain-language
 * explanation. This is a heuristic about information completeness, not a
 * prediction of project success.
 */
export function computeReadiness(facts, contradictions, sources, handover = {}) {
  const count = (cat, kind) => facts.filter((f) => f.category === cat && (!kind || f.kind === kind)).length;
  const dims = [];
  const dim = (key, label, score, why) => dims.push({ key, label, weight: WEIGHTS[key], score: Math.round(Math.max(0, Math.min(100, score))), why });

  const confirmed = count('requirement');
  const openReq = count('openRequirement') + count('question');
  const reqScore = confirmed === 0 ? 0 : (100 * confirmed) / (confirmed + openReq);
  dim('requirements', 'Requirement completeness', confirmed < 3 ? reqScore * 0.6 : reqScore,
    `${confirmed} confirmed requirement(s) vs ${openReq} open item(s).${confirmed < 3 ? ' Fewer than 3 requirements found, so the score is reduced by 40%.' : ''}`);

  const decisions = count('decision');
  const unresolved = count('question');
  dim('decisions', 'Decision clarity', decisions === 0 ? 0 : (100 * decisions) / (decisions + unresolved),
    `${decisions} recorded decision(s) vs ${unresolved} unresolved question(s).`);

  const tasks = facts.filter((f) => f.category === 'task').length;
  const noOwner = facts.filter((f) => f.category === 'owner' && f.kind === 'missing').length;
  const ownerConflicts = contradictions.filter((c) => c.type === 'owner').length;
  const ownScore = tasks === 0 ? (count('owner') ? 60 : 0) : (100 * (tasks - noOwner)) / tasks - ownerConflicts * 20;
  dim('ownership', 'Ownership coverage', ownScore,
    `${tasks - noOwner} of ${tasks} Jira issue(s) have an assignee; ${ownerConflicts} owner conflict(s) deduct 20 points each.`);

  const deps = count('dependency');
  dim('dependencies', 'Dependency visibility', deps > 0 ? 100 : 40,
    deps > 0 ? `${deps} dependency statement(s) found.` : 'No dependencies found. Scored 40 because absence of evidence is not evidence of absence.');

  const docs = sources.filter((s) => s.type === 'confluence').length;
  const stale = sources.filter((s) => freshness(s.retrievedAt) === 'stale').length;
  dim('documentation', 'Documentation coverage', (docs === 0 ? 0 : docs === 1 ? 60 : 100) - stale * 15,
    `${docs} Confluence page(s) linked${stale ? `; ${stale} source(s) stale (-15 each)` : ''}.`);

  const critical = facts.filter((f) => f.category === 'risk' && f.critical).length;
  dim('blockers', 'Outstanding blockers', 100 - critical * 25, `${critical} critical blocker(s) detected (-25 each).`);

  const approved = handover.approval && handover.approval.status === 'approved';
  dim('approval', 'Approval status', approved ? 100 : 0,
    approved ? `Approved by ${handover.approval.by || 'receiving team'}.` : 'The receiving team has not approved this handover.');

  const total = dims.reduce((s, d) => s + d.score * d.weight, 0) / dims.reduce((s, d) => s + d.weight, 0);
  const penalty = Math.min(20, contradictions.length * 5);
  const score = Math.round(Math.max(0, total - penalty));
  const band = score >= 80 ? 'ready' : score >= 55 ? 'needs-work' : 'not-ready';
  return {
    score,
    band,
    penalty,
    dimensions: dims,
    method: 'Weighted average of seven dimensions minus 5 points per contradiction (max 20). A heuristic about information completeness, not a guarantee of project success.',
  };
}

/** Run the full pipeline. */
export function analyze(sources, handover = {}) {
  const facts = extractFacts(sources);
  const contradictions = detectContradictions(facts, handover);
  const questions = generateQuestions(facts, contradictions, handover);
  const readiness = computeReadiness(facts, contradictions, sources, handover);
  const assumptions = [handover.description, handover.notes].filter(Boolean).map((n) => ({ id: nextId('ass'), kind: 'assumption', text: n }));
  return { facts, contradictions, questions, readiness, assumptions };
}

/** Merge new questions into existing ones, preserving human edits/answers. */
export function mergeQuestions(existing, fresh) {
  const key = (q) => tokens(q.text).slice(0, 8).join(' ');
  const byKey = new Map(existing.map((q) => [key(q), q]));
  const merged = [...existing];
  for (const q of fresh) if (!byKey.has(key(q))) merged.push(q);
  return merged;
}
