import { NextResponse } from "next/server";
import { joinRoomOnServer } from "@/lib/serverRooms";

export const dynamic = "force-dynamic";

/** POST /api/rooms/[roomId]/join — join an existing room as a regular player. */
export async function POST(
  request: Request,
  { params }: { params: { roomId: string } }
) {
  let body: { name?: unknown; avatarUrl?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const name = typeof body.name === "string" ? body.name : "";
  if (!name.trim()) {
    return NextResponse.json(
      { error: "Please enter a player name." },
      { status: 400 }
    );
  }

  const avatarUrl = typeof body.avatarUrl === "string" ? body.avatarUrl : undefined;

  const result = joinRoomOnServer(params.roomId.toUpperCase(), name, avatarUrl);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(
    { room: result.room, playerId: result.playerId },
    { headers: { "Cache-Control": "no-store" } }
  );
}
