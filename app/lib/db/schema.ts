import Dexie, { type Table } from "dexie";
import type { CanvasNode, Board } from "@/app/types/canvas";

export interface PendingOp {
  id?: number;
  type: "add" | "update" | "delete";
  boardId: string;
  nodeId: string;
  payload?: Partial<CanvasNode>;
  timestamp: number;
}

export class CanvasDB extends Dexie {
  boards!: Table<Board, string>;
  nodes!: Table<CanvasNode, string>;
  pendingOps!: Table<PendingOp, number>;

  constructor() {
    super("CanvasBoardDB");
    this.version(1).stores({
      boards: "id, name, createdAt, updatedAt",
      nodes: "id, type, createdAt, updatedAt, zIndex",
      pendingOps: "++id, type, boardId, nodeId, timestamp",
    });
  }
}

export const db = new CanvasDB();
