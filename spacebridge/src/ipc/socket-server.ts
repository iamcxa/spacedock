// spacebridge/src/ipc/socket-server.ts
// ABOUTME: Unix socket server for the spacebridge daemon side.
// Accepts shim connections, routes IPC messages by type, maintains session→socket map.
// Uses Node.js net module (Bun compatibility layer) for unix socket support.

import * as net from "node:net";
import { unlinkSync, existsSync } from "node:fs";
import { encodeMessage, createFrameDecoder } from "./framing";
import type {
  IpcMessage,
  RegisterPayload,
  RegisterAckPayload,
  RpcRequestPayload,
  RpcResponsePayload,
  CoordinationRequestPayload,
  CoordinationResponsePayload,
  HeartbeatPayload,
} from "./types";

export interface SocketServerOptions {
  socketPath: string;
  onRegister: (session: RegisterPayload, send: (msg: IpcMessage) => void) => RegisterAckPayload;
  onRpcRequest: (sessionId: string, req: RpcRequestPayload) => Promise<RpcResponsePayload>;
  onCoordinationRequest: (sessionId: string, req: CoordinationRequestPayload) => Promise<CoordinationResponsePayload>;
  onDisconnect: (sessionId: string) => void;
  onHeartbeat?: (sessionId: string) => void;
}

export interface SocketServer {
  listen(): Promise<void>;
  close(): Promise<void>;
  pushToSession(sessionId: string, msg: IpcMessage): boolean;
  pushToAll(msg: IpcMessage): void;
  getConnectedSessions(): string[];
}

export function createSocketServer(opts: SocketServerOptions): SocketServer {
  const sessionSockets = new Map<string, net.Socket>();
  // Reverse map: socket → sessionId (for disconnect handling before register-ack)
  const socketSessions = new Map<net.Socket, string>();

  const server = net.createServer((socket) => {
    const decoder = createFrameDecoder(
      (raw): void => {
        (async () => {
          const msg = raw as IpcMessage;
          if (msg.type === "register") {
            const payload = msg.payload as RegisterPayload;
            const sessionId = payload.sessionId;
            sessionSockets.set(sessionId, socket);
            socketSessions.set(socket, sessionId);

            const send = (m: IpcMessage) => {
              if (!socket.destroyed) socket.write(encodeMessage(m));
            };

            const ack = opts.onRegister(payload, send);
            send({ id: msg.id, type: "register-ack", payload: ack });
            return;
          }

          const sessionId = socketSessions.get(socket);
          if (!sessionId) return; // unregistered socket, ignore

          if (msg.type === "heartbeat") {
            const payload = msg.payload as HeartbeatPayload;
            opts.onHeartbeat?.(payload.sessionId ?? sessionId);
            if (!socket.destroyed) {
              socket.write(encodeMessage({ id: msg.id, type: "heartbeat-ack", payload: {} }));
            }
            return;
          }

          if (msg.type === "rpc-request") {
            const req = msg.payload as RpcRequestPayload;
            try {
              const result = await opts.onRpcRequest(sessionId, req);
              if (!socket.destroyed) {
                socket.write(encodeMessage({ id: msg.id, type: "rpc-response", payload: result }));
              }
            } catch (err) {
              if (!socket.destroyed) {
                socket.write(encodeMessage({
                  id: msg.id,
                  type: "rpc-response",
                  payload: { error: (err as Error).message } satisfies RpcResponsePayload,
                }));
              }
            }
            return;
          }

          if (msg.type === "coordination-request") {
            const req = msg.payload as CoordinationRequestPayload;
            try {
              const result = await opts.onCoordinationRequest(sessionId, req);
              if (!socket.destroyed) {
                socket.write(encodeMessage({ id: msg.id, type: "coordination-response", payload: result }));
              }
            } catch (err) {
              if (!socket.destroyed) {
                socket.write(encodeMessage({
                  id: msg.id,
                  type: "coordination-response",
                  payload: { error: (err as Error).message } satisfies CoordinationResponsePayload,
                }));
              }
            }
            return;
          }
        })().catch((err) => {
          // Async handler errors are logged; the socket remains open for subsequent messages
          console.error("[socket-server] onMessage error:", err);
        });
      },
    );

    socket.on("data", decoder);

    const handleClose = () => {
      const sessionId = socketSessions.get(socket);
      if (sessionId) {
        // Guard: only evict if this socket is still the live session socket.
        // Prevents a stale socket close from evicting a newly registered live session.
        if (sessionSockets.get(sessionId) !== socket) return;
        sessionSockets.delete(sessionId);
        socketSessions.delete(socket);
        opts.onDisconnect(sessionId);
      }
    };

    socket.on("close", handleClose);
    socket.on("error", () => { /* error fires before close */ });
  });

  return {
    listen(): Promise<void> {
      return new Promise((resolve, reject) => {
        // Stale socket cleanup: unlink if file exists
        if (existsSync(opts.socketPath)) {
          try { unlinkSync(opts.socketPath); } catch {}
        }
        server.listen(opts.socketPath, () => resolve());
        server.on("error", reject);
      });
    },

    close(): Promise<void> {
      return new Promise((resolve) => {
        // Destroy all active sockets
        for (const socket of sessionSockets.values()) {
          socket.destroy();
        }
        server.close(() => resolve());
      });
    },

    pushToSession(sessionId: string, msg: IpcMessage): boolean {
      const socket = sessionSockets.get(sessionId);
      if (!socket || socket.destroyed) return false;
      socket.write(encodeMessage(msg));
      return true;
    },

    pushToAll(msg: IpcMessage): void {
      const encoded = encodeMessage(msg);
      for (const socket of sessionSockets.values()) {
        if (!socket.destroyed) socket.write(encoded);
      }
    },

    getConnectedSessions(): string[] {
      return Array.from(sessionSockets.keys());
    },
  };
}
