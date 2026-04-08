import { Database } from "bun:sqlite";
import type { AgentEvent, SequencedEvent } from "./types";

const VALID_EVENT_TYPES: Set<string> = new Set([
  "dispatch", "completion", "gate", "feedback", "merge", "idle",
  "channel_message", "channel_response", "permission_request", "permission_response",
  "comment", "suggestion", "gate_decision", "share_created",
]);

export class EventBuffer {
  private readonly db: Database;
  private readonly capacity: number;
  private readonly insertStmt;
  private readonly selectAllStmt;
  private readonly selectSinceStmt;
  private readonly countStmt;

  constructor(db: Database, capacity: number) {
    this.db = db;
    this.capacity = capacity;
    this.insertStmt = db.query(
      "INSERT INTO events (type, entity, stage, agent, timestamp, detail) VALUES (?, ?, ?, ?, ?, ?)"
    );
    this.selectAllStmt = db.query("SELECT * FROM events ORDER BY seq ASC");
    this.selectSinceStmt = db.query("SELECT * FROM events WHERE seq > ? ORDER BY seq ASC");
    this.countStmt = db.query("SELECT COUNT(*) as cnt FROM events");
  }

  push(event: AgentEvent): SequencedEvent {
    if (!VALID_EVENT_TYPES.has(event.type)) {
      throw new Error(`Invalid event type: ${event.type}`);
    }
    const result = this.insertStmt.run(
      event.type,
      event.entity,
      event.stage,
      event.agent,
      event.timestamp,
      event.detail ?? null,
    );
    const seq = Number(result.lastInsertRowid);
    // Enforce capacity: delete oldest rows when over limit
    const { cnt } = this.countStmt.get() as { cnt: number };
    if (cnt > this.capacity) {
      const excess = cnt - this.capacity;
      this.db.query(
        "DELETE FROM events WHERE seq IN (SELECT seq FROM events ORDER BY seq ASC LIMIT ?)"
      ).run(excess);
    }
    return { seq, event };
  }

  getSince(afterSeq: number): SequencedEvent[] {
    const rows = this.selectSinceStmt.all(afterSeq) as Array<EventRow>;
    return rows.map(rowToSequencedEvent);
  }

  getAll(): SequencedEvent[] {
    const rows = this.selectAllStmt.all() as Array<EventRow>;
    return rows.map(rowToSequencedEvent);
  }

  clear(): void {
    this.db.query("DELETE FROM events").run();
  }
}

interface EventRow {
  seq: number;
  type: string;
  entity: string;
  stage: string;
  agent: string;
  timestamp: string;
  detail: string | null;
}

function rowToSequencedEvent(row: EventRow): SequencedEvent {
  return {
    seq: row.seq,
    event: {
      type: row.type as AgentEvent["type"],
      entity: row.entity,
      stage: row.stage,
      agent: row.agent,
      timestamp: row.timestamp,
      detail: row.detail ?? undefined,
    },
  };
}
