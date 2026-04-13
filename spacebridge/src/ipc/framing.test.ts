// spacebridge/src/ipc/framing.test.ts
// ABOUTME: Tests for the 4-byte big-endian length-prefix + UTF-8 JSON framing codec.

import { describe, test, expect } from "bun:test";
import { encodeMessage, createFrameDecoder, MAX_PAYLOAD_BYTES } from "./framing";

describe("encodeMessage", () => {
  test("encodes a simple object with 4-byte header", () => {
    const msg = { type: "register", id: "abc", payload: {} };
    const buf = encodeMessage(msg);
    const json = JSON.stringify(msg);
    const payloadLen = Buffer.byteLength(json, "utf8");
    expect(buf.length).toBe(4 + payloadLen);
    expect(buf.readUInt32BE(0)).toBe(payloadLen);
    expect(buf.slice(4).toString("utf8")).toBe(json);
  });

  test("encodes empty payload object {}", () => {
    const msg = {};
    const buf = encodeMessage(msg);
    const json = "{}";
    const payloadLen = Buffer.byteLength(json, "utf8");
    expect(buf.readUInt32BE(0)).toBe(payloadLen);
    expect(buf.slice(4).toString("utf8")).toBe(json);
  });

  test("encodes large payload (100KB)", () => {
    const big = "x".repeat(100_000);
    const msg = { type: "data", payload: { data: big } };
    const buf = encodeMessage(msg);
    const json = JSON.stringify(msg);
    const payloadLen = Buffer.byteLength(json, "utf8");
    expect(buf.readUInt32BE(0)).toBe(payloadLen);
    expect(buf.length).toBe(4 + payloadLen);
  });
});

describe("createFrameDecoder", () => {
  test("single message encode/decode round-trip", () => {
    const received: unknown[] = [];
    const decoder = createFrameDecoder((msg) => { received.push(msg); });

    const msg = { type: "heartbeat", id: "1", payload: { ts: 123 } };
    decoder(encodeMessage(msg));

    expect(received.length).toBe(1);
    expect(received[0]).toEqual(msg);
  });

  test("multiple messages in one chunk", () => {
    const received: unknown[] = [];
    const decoder = createFrameDecoder((msg) => { received.push(msg); });

    const msg1 = { type: "a", id: "1", payload: 1 };
    const msg2 = { type: "b", id: "2", payload: 2 };
    const msg3 = { type: "c", id: "3", payload: 3 };

    const combined = Buffer.concat([
      encodeMessage(msg1),
      encodeMessage(msg2),
      encodeMessage(msg3),
    ]);
    decoder(combined);

    expect(received.length).toBe(3);
    expect(received[0]).toEqual(msg1);
    expect(received[1]).toEqual(msg2);
    expect(received[2]).toEqual(msg3);
  });

  test("partial message split across two chunks", () => {
    const received: unknown[] = [];
    const decoder = createFrameDecoder((msg) => { received.push(msg); });

    const msg = { type: "test", id: "x", payload: { hello: "world" } };
    const encoded = encodeMessage(msg);
    const half = Math.floor(encoded.length / 2);

    decoder(encoded.slice(0, half));
    expect(received.length).toBe(0);

    decoder(encoded.slice(half));
    expect(received.length).toBe(1);
    expect(received[0]).toEqual(msg);
  });

  test("partial header split across two chunks", () => {
    const received: unknown[] = [];
    const decoder = createFrameDecoder((msg) => { received.push(msg); });

    const msg = { type: "test", id: "y", payload: null };
    const encoded = encodeMessage(msg);

    // Send only 2 of 4 header bytes
    decoder(encoded.slice(0, 2));
    expect(received.length).toBe(0);

    decoder(encoded.slice(2));
    expect(received.length).toBe(1);
    expect(received[0]).toEqual(msg);
  });

  test("empty payload {}", () => {
    const received: unknown[] = [];
    const decoder = createFrameDecoder((msg) => { received.push(msg); });
    decoder(encodeMessage({}));
    expect(received.length).toBe(1);
    expect(received[0]).toEqual({});
  });

  test("large payload round-trip", () => {
    const received: unknown[] = [];
    const decoder = createFrameDecoder((msg) => { received.push(msg); });
    const big = "x".repeat(100_000);
    const msg = { type: "large", id: "big", payload: { data: big } };
    decoder(encodeMessage(msg));
    expect(received.length).toBe(1);
    expect((received[0] as any).payload.data.length).toBe(100_000);
  });

  test("rejects message exceeding MAX_PAYLOAD_BYTES", () => {
    const decoder = createFrameDecoder(() => {});
    // Craft a frame whose length header claims MAX_PAYLOAD_BYTES + 1
    const header = Buffer.alloc(4);
    header.writeUInt32BE(MAX_PAYLOAD_BYTES + 1, 0);
    expect(() => decoder(header)).toThrow("message exceeds max size");
  });

  test("rejects buffer overflow from slow-drain accumulation", () => {
    const decoder = createFrameDecoder(() => {});
    // A single chunk larger than MAX_PAYLOAD_BYTES * 2 triggers the overflow guard
    // immediately after concat, before the while loop runs.
    const oversized = Buffer.alloc(MAX_PAYLOAD_BYTES * 2 + 1);
    expect(() => decoder(oversized)).toThrow("buffer overflow");
  });

  test("invalid JSON throws or calls error handler", () => {
    const errors: unknown[] = [];
    const decoder = createFrameDecoder(
      () => {},
      (err) => errors.push(err),
    );
    // Craft a frame with invalid JSON payload
    const header = Buffer.alloc(4);
    const invalid = Buffer.from("not valid json!!!{}", "utf8");
    header.writeUInt32BE(invalid.length, 0);
    const bad = Buffer.concat([header, invalid]);

    decoder(bad);
    expect(errors.length).toBe(1);
  });
});
