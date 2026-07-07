import { db, type PendingOp } from "./schema";
import type { CanvasNode, Board } from "@/app/types/canvas";

// ─── Board Operations ──────────────────────────────────────────────────────────

export async function getOrCreateBoard(boardId: string): Promise<Board> {
  const existing = await db.boards.get(boardId);
  if (existing) return existing;
  const board: Board = {
    id: boardId,
    name: "Untitled Board",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await db.boards.put(board);
  return board;
}

// ─── Node Operations ───────────────────────────────────────────────────────────

export async function getAllNodes(): Promise<CanvasNode[]> {
  return db.nodes.orderBy("zIndex").toArray();
}

export async function upsertNode(node: CanvasNode): Promise<void> {
  await db.nodes.put(node);
}

export async function upsertNodes(nodes: CanvasNode[]): Promise<void> {
  await db.nodes.bulkPut(nodes);
}

export async function deleteNode(id: string): Promise<void> {
  await db.nodes.delete(id);
}

export async function clearAllNodes(): Promise<void> {
  await db.nodes.clear();
}

// ─── Pending Ops ───────────────────────────────────────────────────────────────

export async function addPendingOp(
  op: Omit<PendingOp, "id">
): Promise<void> {
  await db.pendingOps.add(op);
}

export async function getPendingOps(): Promise<PendingOp[]> {
  return db.pendingOps.orderBy("timestamp").toArray();
}

export async function clearPendingOps(): Promise<void> {
  await db.pendingOps.clear();
}

export async function getPendingOpsCount(): Promise<number> {
  return db.pendingOps.count();
}
