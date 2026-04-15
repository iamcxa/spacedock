// spacebridge/src/domain/gate/types.ts
// ABOUTME: Domain types for the gate fmodel CQRS aggregate (daemon-side).
// Commands: approve_gate | reject_gate.
// Events: gate_approved | gate_rejected.
// State: Map<"${entitySlug}::${stage}", GateDecisionSnapshot>.

// ─── State ─────────────────────────────────────────────────────────────────────

export interface GateDecisionSnapshot {
  decision: "approved" | "rejected";
  entitySlug: string;
  stage: string;
  decidedBy: string;
  decidedAt: number; // epoch-ms
  reason: string | null;
}

export type GateState = Map<string, GateDecisionSnapshot>;

export const emptyGateState: GateState = new Map();

// ─── Commands ──────────────────────────────────────────────────────────────────

export interface ApproveGateCommand {
  type: "approve_gate";
  entitySlug: string;
  stage: string;
  decidedBy: string;
  reason?: string;
}

export interface RejectGateCommand {
  type: "reject_gate";
  entitySlug: string;
  stage: string;
  decidedBy: string;
  reason?: string;
}

export type GateCommand = ApproveGateCommand | RejectGateCommand;

// ─── Events ────────────────────────────────────────────────────────────────────

export interface GateApprovedEvent {
  type: "gate_approved";
  entitySlug: string;
  stage: string;
  decidedBy: string;
  decidedAt: number; // epoch-ms
}

export interface GateRejectedEvent {
  type: "gate_rejected";
  entitySlug: string;
  stage: string;
  decidedBy: string;
  reason: string;
  decidedAt: number; // epoch-ms
}

export type GateEvent = GateApprovedEvent | GateRejectedEvent;
