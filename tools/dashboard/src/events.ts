import type { AgentEvent, SequencedEvent } from "./types";

const VALID_EVENT_TYPES: Set<string> = new Set([
  "dispatch", "completion", "gate", "feedback", "merge", "idle",
  "channel_message", "channel_response", "permission_request", "permission_response",
  "comment", "suggestion", "gate_decision",
]);

export class EventBuffer {
  private buffer: SequencedEvent[] = [];
  private nextSeq = 1;
  private readonly capacity: number;

  constructor(capacity: number) {
    this.capacity = capacity;
  }

  push(event: AgentEvent): SequencedEvent {
    if (!VALID_EVENT_TYPES.has(event.type)) {
      throw new Error(`Invalid event type: ${event.type}`);
    }
    const entry: SequencedEvent = { seq: this.nextSeq++, event };
    this.buffer.push(entry);
    if (this.buffer.length > this.capacity) {
      this.buffer.shift();
    }
    return entry;
  }

  getSince(afterSeq: number): SequencedEvent[] {
    return this.buffer.filter((e) => e.seq > afterSeq);
  }

  getAll(): SequencedEvent[] {
    return this.buffer.slice();
  }
}
