import { WebSocketServer, WebSocket } from "ws";
import * as http from "http";
import * as Y from "yjs";
// @ts-ignore
import * as sync from "y-protocols/dist/sync.cjs";
// @ts-ignore
import * as awareness from "y-protocols/dist/awareness.cjs";
// @ts-ignore
import * as encoding from "lib0/dist/encoding.cjs";
// @ts-ignore
import * as decoding from "lib0/dist/decoding.cjs";

const messageSync = 0;
const messageAwareness = 1;

class WSSharedDoc extends Y.Doc {
  name: string;
  conns: Map<WebSocket, any>;
  awareness: any;

  constructor(name: string) {
    super();
    this.name = name;
    this.conns = new Map();
    this.awareness = new awareness.Awareness(this);
    
    const updateHandler = (update: Uint8Array, origin: any) => {
      if (origin !== this) {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, messageSync);
        sync.writeUpdate(encoder, update);
        const message = encoding.toUint8Array(encoder);
        this.conns.forEach((_, conn) => {
          send(this, conn, message);
        });
      }
    };
    this.on("update", updateHandler);
  }
}

const docs = new Map<string, WSSharedDoc>();

const getDoc = (name: string): WSSharedDoc => {
  let doc = docs.get(name);
  if (!doc) {
    doc = new WSSharedDoc(name);
    docs.set(name, doc);
  }
  return doc;
};

const send = (doc: WSSharedDoc, conn: WebSocket, m: Uint8Array) => {
  if (conn.readyState !== WebSocket.OPEN) {
    closeConn(doc, conn);
    return;
  }
  try {
    conn.send(m, (err) => {
      if (err) closeConn(doc, conn);
    });
  } catch (e) {
    closeConn(doc, conn);
  }
};

const closeConn = (doc: WSSharedDoc, conn: WebSocket) => {
  if (doc.conns.has(conn)) {
    doc.conns.delete(conn);
  }
};

const server = http.createServer((request, response) => {
  response.writeHead(200, { "Content-Type": "text/plain" });
  response.end("Yjs Mock WebSockets Server\n");
});

const wss = new WebSocketServer({ noServer: true });

wss.on("connection", (conn: WebSocket, req) => {
  conn.binaryType = "arraybuffer";
  const docName = "canvas-board-v1";
  const doc = getDoc(docName);
  doc.conns.set(conn, new Set());

  // Listen for messages
  conn.on("message", (message: ArrayBuffer) => {
    try {
      const decoder = decoding.createDecoder(new Uint8Array(message));
      const messageType = decoding.readVarUint(decoder);
      if (messageType === messageSync) {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, messageSync);
        sync.readSyncMessage(decoder, encoder, doc, conn);
        if (encoding.length(encoder) > 1) {
          send(doc, conn, encoding.toUint8Array(encoder));
        }
      }
    } catch (err) {
      console.error(err);
    }
  });

  conn.on("close", () => {
    closeConn(doc, conn);
  });

  // Sync step 1
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, messageSync);
  sync.writeSyncStep1(encoder, doc);
  send(doc, conn, encoding.toUint8Array(encoder));
});

server.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});

const PORT = 1234;
server.listen(PORT, () => {
  console.log(`Mock WS Server running on ws://localhost:${PORT}`);
});
