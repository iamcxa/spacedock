// spacebridge/src/ipc/framing.ts
// ABOUTME: 4-byte big-endian length-prefix + UTF-8 JSON message framing codec.
// Protocol: [UInt32BE payload_length][UTF-8 JSON payload]
// Handles partial reads via read buffer accumulation.

/** Maximum allowed payload size in bytes (1 MB). */
export const MAX_PAYLOAD_BYTES = 1_048_576;

/**
 * Encode a message object into a length-prefixed frame buffer.
 * Frame layout: 4-byte big-endian length header + UTF-8 JSON payload.
 */
export function encodeMessage(msg: object): Buffer {
  const json = JSON.stringify(msg);
  const payload = Buffer.from(json, "utf8");
  const header = Buffer.alloc(4);
  header.writeUInt32BE(payload.length, 0);
  return Buffer.concat([header, payload]);
}

/**
 * Create a stateful frame decoder that accumulates incoming chunks and
 * calls onMessage for each complete framed message.
 *
 * @param onMessage - Called with the parsed message object for each complete frame.
 * @param onError - Called when JSON parsing fails. If not provided, invalid frames throw.
 * @returns A function that accepts Buffer chunks from a stream.
 */
export function createFrameDecoder(
  onMessage: (msg: unknown) => void | Promise<void>,
  onError?: (err: unknown) => void,
): (chunk: Buffer) => void {
  let buf = Buffer.alloc(0);

  return function decode(chunk: Buffer): void {
    buf = Buffer.concat([buf, chunk]);

    // Guard against slow-drain accumulation attacks
    if (buf.length > MAX_PAYLOAD_BYTES * 2) {
      throw new Error("buffer overflow");
    }

    while (true) {
      // Need at least 4 bytes for the header
      if (buf.length < 4) break;

      const payloadLen = buf.readUInt32BE(0);

      // Reject oversized messages before accumulating payload bytes
      if (payloadLen > MAX_PAYLOAD_BYTES) {
        throw new Error("message exceeds max size");
      }

      // Need header (4 bytes) + payload bytes
      if (buf.length < 4 + payloadLen) break;

      const payloadSlice = buf.subarray(4, 4 + payloadLen);
      // Advance buffer past this message
      buf = buf.subarray(4 + payloadLen);

      try {
        const msg = JSON.parse(payloadSlice.toString("utf8"));
        onMessage(msg);
      } catch (err) {
        if (onError) {
          onError(err);
        } else {
          throw err;
        }
      }
    }
  };
}
