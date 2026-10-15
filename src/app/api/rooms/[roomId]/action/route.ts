import { NextResponse } from "next/server";
import { applyRoomAction } from "@/lib/serverRooms";
import type { RoomActionRequest } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/rooms/[roomId]/action — game actions (start, swap, forceNext,
 * nextRound, endGame, kick, reset). The server validates permissions
 * (Admin-only actions) and the game rules before mutating the room.
 */
export async function POST(
  request: Request,
  { params }: { params: { roomId: string } }
) {
  let body: { playerId?: unknown; action?: Partial<RoomActionRequest> } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const playerId = typeof body.playerId === "string" ? body.playerId : "";
  const action = body.action;
  if (!playerId || !action || typeof action.type !== "string") {
    return NextResponse.json(
      { error: "Invalid action request." },
      { status: 400 }
    );
  }

  const result = await applyRoomAction(
    params.roomId.toUpperCase(),
    playerId,
    action as RoomActionRequest
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(
    { room: result.room },
    { headers: { "Cache-Control": "no-store" } }
  );
}
