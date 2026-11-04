/**
 * Synthetic demonstration data. No real customer information.
 * Used (a) by the "Create demo data" action, which writes these into the
 * user's own Jira project / Confluence space after explicit approval, and
 * (b) by the unit tests.
 */

export const DEMO_PAGES = [
  {
    title: 'Customer Onboarding Workflow – Requirements (Demo)',
    lines: [
      'Project: Harbor Ridge Customer Onboarding Workflow (synthetic demo).',
      'Requirement: New customers must receive a welcome email within 5 minutes of signing the contract.',
      'Requirement: The workflow should support single sign-on for the customer admin.',
      'Requirement: Onboarding progress must be visible on a shared dashboard.',
      'Requirement: Data migration format is TBD.',
      'Onboarding workflow owner: Priya Raman.',
      'Go-live deadline: 2026-12-15.',
      'The workflow depends on the billing system API being available.',
      'Risk: Legacy CRM export may delay data migration.',
    ],
  },
  {
    title: 'Onboarding Kickoff Meeting Notes (Demo)',
    lines: [
      'Decision: We agreed to use email plus in-app notifications for the welcome sequence.',
      'Decision: Single sign-on will be delivered in phase one.',
      'Onboarding workflow owner: Marcus Lee.',
      'Customer go-live deadline: 2027-01-12.',
      'Who approves the final data migration format?',
      'Mobile app support is out of scope for phase one.',
    ],
  },
];

export const DEMO_ISSUES = [
  { summary: 'Design welcome email sequence', description: 'Welcome email must be sent within 5 minutes of contract signature.', priority: 'High', assignToMe: true },
  { summary: 'Integrate SSO for customer admin', description: 'Single sign-on delivered in phase one per kickoff decision.', priority: 'High', assignToMe: true },
  { summary: 'Build onboarding progress dashboard', description: 'Progress must be visible to the customer on a shared dashboard.', priority: 'Medium', assignToMe: false },
  { summary: 'Define data migration format', description: 'Format is TBD. Blocked until the legacy CRM export is confirmed.', priority: 'Highest', assignToMe: false },
];

/** Offline sample sources that mirror what discovery returns (used by tests and the in-browser preview). */
export function demoSources(now = new Date().toISOString()) {
  const pages = DEMO_PAGES.map((p, i) => ({
    id: `confluence:demo-${i + 1}`,
    type: 'confluence',
    title: p.title,
    url: `https://example.invalid/wiki/demo-${i + 1}`,
    text: p.lines.join('\n'),
    retrievedAt: now,
    meta: {},
  }));
  const issues = DEMO_ISSUES.map((t, i) => ({
    id: `jira:DEMO-${i + 1}`,
    type: 'jira',
    title: t.summary,
    url: `https://example.invalid/browse/DEMO-${i + 1}`,
    text: t.description,
    retrievedAt: now,
    meta: {
      key: `DEMO-${i + 1}`,
      status: i === 3 ? 'Blocked' : 'To Do',
      assignee: t.assignToMe ? 'Priya Raman' : null,
      dueDate: null,
      priority: t.priority,
      flagged: i === 3,
    },
  }));
  return [...pages, ...issues];
}
