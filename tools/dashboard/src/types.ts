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
  feedback_to: string;
  conditional: boolean;
  model: string;
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
  | "comment" | "suggestion" | "gate_decision" | "share_created" | "rollback"
  | "pr_ready" | "pipeline_error" | "entity_shipped";

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
  author: "captain" | "fo" | "guest";
  timestamp: string; // ISO 8601
  resolved: boolean;
  resolved_reason?: string;   // e.g. "section_updated", "manual"
  resolved_version?: number;  // snapshot version at time of auto-resolve
  thread: CommentReply[];
}

export interface CommentReply {
  content: string;
  author: "captain" | "fo" | "guest";
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

// --- Share Link Types ---

export interface ShareLink {
  token: string;
  passwordHash: string;
  entityPaths: string[];       // scoped entity file paths
  stages: string[];            // scoped stages (empty = all)
  createdAt: string;           // ISO 8601
  expiresAt: string;           // ISO 8601
  label: string;               // human-readable label for UI
}

export interface ShareSession {
  token: string;               // maps back to ShareLink.token
  authenticatedAt: string;     // ISO 8601
}

// --- Entity Snapshot Types ---

export type SnapshotSource = "update" | "rollback" | "create";

export interface EntitySnapshot {
  id: number;
  entity: string;
  version: number;
  body: string;
  frontmatter: string | null;
  author: string;
  reason: string;
  source: SnapshotSource;
  rollback_from_version: number | null;
  rollback_section: string | null;
  created_at: string;
}

export interface SnapshotVersion {
  version: number;
  author: string;
  reason: string;
  source: SnapshotSource;
  created_at: string;
  rollback_from_version: number | null;
  rollback_section: string | null;
}

export interface ParsedSection {
  heading: string;       // exact heading line text (e.g., "## Bug B")
  level: number;         // 1-6
  body: string;          // content after heading until next heading of equal/higher level
  start: number;         // line index of heading
  end: number;           // line index AFTER section end (exclusive)
}

export interface SectionDiff {
  heading: string;
  status: "unchanged" | "added" | "removed" | "modified";
  diff?: string;         // unified diff string when modified
}
