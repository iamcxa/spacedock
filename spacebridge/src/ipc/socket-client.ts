// spacebridge/src/ipc/socket-client.ts
// ABOUTME: Unix socket client for the spacebridge shim side.
// Connects to daemon, handles request/response correlation, and reconnect with exponential backoff.
// Uses Node.js net module (Bun compatibility layer) for unix socket support.

import * as net from "node:net";
import { randomUUID } from "node:crypto";
import { encodeMessage, createFrameDecoder } from "./framing";
import type {
  IpcMessage,
  RegisterAckPayload,
  RegisterPayload,
} from "./types";

export interface SocketClientOptions {
  socketPath: string;
  sessionId: string;
  projectRoot: string;
  pid: number;
  onPush?: (msg: IpcMessage) => void;
  reconnect?: {
    initialDelayMs?: number; // default 100
    maxDelayMs?: number;     // default 5000
    maxRetries?: number;     // default 5
  };
}

export interface SocketClient {
  connect(): Promise<RegisterAckPayload>;
  request(msg: IpcMessage): Promise<IpcMessage>;
  close(): void;
  readonly connected: boolean;
}

interface PendingRequest {
  resolve: (msg: IpcMessage) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export function createSocketClient(opts: SocketClientOptions): SocketClient {
  const reconnectCfg = {
    initialDelayMs: opts.reconnect?.initialDelayMs ?? 100,
    maxDelayMs: opts.reconnect?.maxDelayMs ?? 5000,
    maxRetries: opts.reconnect?.maxRetries ?? 5,
  };

  let socket: net.Socket | null = null;
  let _connected = false;
  let closed = false;
  let reconnectAttempt = 0;

  const pending = new Map<string, PendingRequest>();

  function rejectAllPending(reason: string): void {
    const err = new Error(reason);
    for (const [id, req] of pending) {
      clearTimeout(req.timer);
      req.reject(err);
      pending.delete(id);
    }
  }

  function sendRegister(sock: net.Socket): string {
    const id = randomUUID();
    const msg: IpcMessage = {
      id,
      type: "register",
      payload: {
        projectRoot: opts.projectRoot,
        sessionId: opts.sessionId,
        pid: opts.pid,
        protocolVersion: 1,
      } satisfies RegisterPayload,
    };
    sock.write(encodeMessage(msg));
    return id;
  }

  function connectOnce(): Promise<RegisterAckPayload> {
    return new Promise((resolve, reject) => {
      const sock = net.createConnection({ path: opts.socketPath });
      socket = sock;
      let registerId: string;

      const decoder = createFrameDecoder((raw) => {
        const msg = raw as IpcMessage;

        if (msg.type === "register-ack" && msg.id === registerId) {
          _connected = true;
          reconnectAttempt = 0;
          resolve(msg.payload as RegisterAckPayload);
          return;
        }

        // Response to a pending request
        if (msg.type === "rpc-response" || msg.type === "coordination-response") {
          const req = pending.get(msg.id);
          if (req) {
            clearTimeout(req.timer);
            pending.delete(msg.id);
            req.resolve(msg);
          }
          return;
        }

        // Push message (daemon → shim, unsolicited)
        if (msg.type === "event-push" || msg.type === "action-push") {
          opts.onPush?.(msg);
          return;
        }
      });

      sock.on("data", decoder);

      sock.on("connect", () => {
        registerId = sendRegister(sock);
      });

      sock.on("error", (err) => {
        if (!_connected) {
          reject(err);
        }
      });

      const handleDisconnect = () => {
        _connected = false;
        socket = null;

        if (closed) {
          rejectAllPending("Client closed");
          return;
        }

        if (!opts.reconnect) {
          rejectAllPending("Socket disconnected");
          return;
        }

        scheduleReconnect();
      };

      sock.on("close", handleDisconnect);
      sock.on("end", () => { /* close follows end */ });
    });
  }

  function scheduleReconnect(): void {
    if (closed) return;
    if (reconnectAttempt >= reconnectCfg.maxRetries) {
      rejectAllPending(`Max reconnect retries (${reconnectCfg.maxRetries}) exceeded`);
      return;
    }

    const delay = Math.min(
      reconnectCfg.initialDelayMs * Math.pow(2, reconnectAttempt),
      reconnectCfg.maxDelayMs,
    ) + Math.random() * 50; // jitter

    reconnectAttempt++;

    setTimeout(async () => {
      if (closed) return;
      try {
        await connectOnce();
        // Re-register succeeded — reconnect complete
      } catch {
        // Will schedule next attempt via handleDisconnect → scheduleReconnect
      }
    }, delay);
  }

  return {
    connect(): Promise<RegisterAckPayload> {
      return connectOnce();
    },

    request(msg: IpcMessage): Promise<IpcMessage> {
      return new Promise((resolve, reject) => {
        if (!socket || socket.destroyed || !_connected) {
          reject(new Error("Not connected"));
          return;
        }

        const timer = setTimeout(() => {
          pending.delete(msg.id);
          reject(new Error(`Request ${msg.id} timed out after 30s`));
        }, 30_000);

        pending.set(msg.id, { resolve, reject, timer });
        socket.write(encodeMessage(msg));
      });
    },

    close(): void {
      closed = true;
      rejectAllPending("Client closed");
      if (socket && !socket.destroyed) {
        socket.destroy();
      }
      socket = null;
      _connected = false;
    },

    get connected(): boolean {
      return _connected;
    },
  };
}
