export type Kind = 'verified' | 'inferred' | 'missing' | 'assumption';
export type Band = 'ready' | 'needs-work' | 'not-ready';
export type Freshness = 'fresh' | 'aging' | 'stale';

export interface Fact {
  id: string;
  category: string;
  kind: Kind;
  text: string;
  sourceId: string | null;
  sourceTitle: string | null;
  sourceUrl: string | null;
  excerpt: string | null;
  critical?: boolean;
  person?: string;
  date?: string;
  ref?: string;
}

export interface ConflictSide { label: string | null; sourceId?: string; sourceUrl?: string | null; excerpt: string | null }
export interface Contradiction { id: string; type: string; kind: Kind; summary: string; sides: ConflictSide[] }

export interface Question {
  id: string;
  text: string;
  reason: string;
  refs: (string | null)[];
  status: 'open' | 'resolved';
  assignee: string | null;
  response: string;
}

export interface Dimension { key: string; label: string; weight: number; score: number; why: string }
export interface Readiness { score: number; band: Band; penalty: number; dimensions: Dimension[]; method: string }

export interface SourceMeta { id: string; type: 'jira' | 'confluence' | 'note'; title: string; url: string; retrievedAt: string; updated: string | null; freshness?: Freshness }

export interface Analysis {
  facts: Fact[];
  contradictions: Contradiction[];
  questions: Question[];
  readiness: Readiness;
  assumptions: { id: string; kind: Kind; text: string }[];
  warnings: { sourceId: string; code: string; message: string }[];
  sources: SourceMeta[];
  generatedAt: string;
  version: number;
}

export interface PlanItem {
  id: string;
  type: 'jira-issue' | 'confluence-page';
  title: string;
  description: string;
  priority?: string;
  rationale: string;
  status: 'proposed' | 'created' | 'failed';
  approvedBy?: string;
  approvedAt?: string;
  result?: { key?: string; url: string; title?: string };
  error?: string;
}

export interface AuditEntry { at: string; actor: string; action: string; detail: string; result: string; analysisVersion: number }

export interface Handover {
  id: string;
  name: string;
  sourceTeam: string;
  receivingTeam: string;
  description: string;
  priority: string;
  expectedDelivery: string;
  jiraProjectKeys: string[];
  jiraIssueKeys: string[];
  pageIds: string[];
  notes: string;
  demo: boolean;
  createdAt: string;
  updatedAt: string;
  analysisVersion: number;
  approval: { status: 'pending' | 'approved' | 'rejected'; by?: string; at?: string; note?: string };
  plan: PlanItem[];
  history: { at: string; score: number }[];
  audit: AuditEntry[];
  sources: SourceMeta[];
}

export interface HandoverSummary {
  id: string; name: string; sourceTeam: string; receivingTeam: string; priority: string; expectedDelivery: string; demo: boolean;
  updatedAt: string; approval: string; score: number | null; band: Band | null; openQuestions: number; analyzed: boolean;
}

export interface DashboardData {
  totals: { active: number; ready: number; missingInfo: number; awaitingApproval: number; criticalBlockers: number; all: number };
  recent: { id: string; name: string; receivingTeam: string; score: number | null; band: Band | null; updatedAt: string; demo: boolean; openQuestions: number }[];
  weeks: { label: string; created: number; approved: number }[];
  workload: { team: string; handovers: number; openQuestions: number }[];
}

export interface HandoverInput {
  name: string; sourceTeam: string; receivingTeam: string; description: string; priority: string; expectedDelivery: string;
  jiraProjectKeys: string[]; jiraIssueKeys: string[]; pageIds: string[]; notes: string;
}
