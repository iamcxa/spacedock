export interface FrontmatterFields {
  [key: string]: string;
}

export interface Stage {
  name: string;
  worktree: boolean;
  concurrency: number;
  gate: boolean;
  terminal: boolean;
  initial: boolean;
}

export interface Entity {
  slug: string;
  path: string;
  id: string;
  status: string;
  title: string;
  score: string;
  source: string;
  worktree: string;
  [key: string]: string;
}

export interface Workflow {
  dir: string;
  commissioned_by: string;
}

export interface WorkflowData {
  dir: string;
  name: string;
  commissioned_by: string;
  entity_type: string;
  entity_label: string;
  stages: Stage[];
  entities: Entity[];
  entity_count_by_stage: Record<string, number>;
}

export interface ParsedEntity {
  frontmatter: FrontmatterFields;
  tags: string[];
  body: string;
}

export interface StageReportItem {
  status: "done" | "skip" | "fail" | "pending";
  text: string;
  detail: string;
}

export interface StageReport {
  stage: string;
  items: StageReportItem[];
  summary: string;
}

export interface EntityDetail extends ParsedEntity {
  stage_reports: StageReport[];
  filepath: string;
  slug?: string;
}

export interface FilterOptions {
  status?: string | null;
  tag?: string | null;
  min_score?: number | null;
  max_score?: number | null;
}
