import { Database } from "bun:sqlite";
import type { AgentEvent, SequencedEvent } from "./types";

const VALID_EVENT_TYPES: Set<string> = new Set([
  "dispatch", "completion", "gate", "feedback", "merge", "idle",
  "channel_message", "channel_response", "permission_request", "permission_response",
  "comment", "suggestion", "gate_decision", "share_created", "rollback",
  "pr_ready", "pipeline_error", "entity_shipped",
]);

export class EventBuffer {
  private readonly db: Database;
  private readonly capacity: number;
  private readonly insertStmt;
  private readonly selectAllStmt;
  private readonly selectSinceStmt;
  private readonly countStmt;
  private readonly selectByEntityStmt;
  private readonly selectChannelMsgSinceStmt;
  private readonly selectChannelMsgSinceEntityStmt;

  constructor(db: Database, capacity: number) {
    this.db = db;
    this.capacity = capacity;
    this.insertStmt = db.query(
      "INSERT INTO events (type, entity, stage, agent, timestamp, detail) VALUES (?, ?, ?, ?, ?, ?)"
    );
    this.selectAllStmt = db.query("SELECT * FROM events ORDER BY seq ASC");
    this.selectSinceStmt = db.query("SELECT * FROM events WHERE seq > ? ORDER BY seq ASC");
    this.countStmt = db.query("SELECT COUNT(*) as cnt FROM events");
    this.selectByEntityStmt = db.query("SELECT * FROM events WHERE entity = ? ORDER BY seq ASC");
    this.selectChannelMsgSinceStmt = db.query(
      "SELECT * FROM events WHERE type = 'channel_message' AND seq > ? ORDER BY seq ASC"
    );
    this.selectChannelMsgSinceEntityStmt = db.query(
      "SELECT * FROM events WHERE type = 'channel_message' AND seq > ? AND entity = ? ORDER BY seq ASC"
    );
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

  getByEntity(entity: string): SequencedEvent[] {
    const rows = this.selectByEntityStmt.all(entity) as Array<EventRow>;
    return rows.map(rowToSequencedEvent);
  }

  clear(): void {
    this.db.query("DELETE FROM events").run();
  }

  getChannelMessagesSince(afterSeq: number, entity?: string): SequencedEvent[] {
    if (entity !== undefined && entity !== "") {
      const rows = this.selectChannelMsgSinceEntityStmt.all(afterSeq, entity) as Array<EventRow>;
      return rows.map(rowToSequencedEvent);
    }
    const rows = this.selectChannelMsgSinceStmt.all(afterSeq) as Array<EventRow>;
    return rows.map(rowToSequencedEvent);
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
