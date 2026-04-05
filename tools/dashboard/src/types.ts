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

// --- Activity Feed Events ---

export type AgentEventType = "dispatch" | "completion" | "gate" | "feedback" | "merge" | "idle"
  | "channel_message" | "channel_response" | "permission_request" | "permission_response"
  | "comment" | "suggestion";

export interface AgentEvent {
  type: AgentEventType;
  entity: string;
  stage: string;
  agent: string;
  timestamp: string; // ISO 8601
  detail?: string;
}

export interface SequencedEvent {
  seq: number;
  event: AgentEvent;
}

export interface ChannelMessage {
  content: string;
  meta?: Record<string, string>;
}

export interface PermissionRequest {
  request_id: string;
  tool_name: string;
  description: string;
  input_preview?: string;
}

export interface PermissionVerdict {
  request_id: string;
  behavior: "allow" | "deny";
}

// --- Collaborative Review Types ---

export interface Comment {
  id: string;
  entity_path: string;
  selected_text: string;
  section_heading: string;
  content: string;
  author: "captain" | "fo";
  timestamp: string; // ISO 8601
  resolved: boolean;
  thread: CommentReply[];
}

export interface CommentReply {
  content: string;
  author: "captain" | "fo";
  timestamp: string;
}

export interface Suggestion {
  id: string;
  comment_id: string;
  diff_from: string;
  diff_to: string;
  status: "pending" | "accepted" | "rejected";
  timestamp: string;
}

export interface CommentThread {
  comments: Comment[];
  suggestions: Suggestion[];
}
