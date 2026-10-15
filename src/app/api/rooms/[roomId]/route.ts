import { NextResponse } from "next/server";
import { getRoomWithExpiry } from "@/lib/serverRooms";

export const dynamic = "force-dynamic";

/** GET /api/rooms/[roomId] — current room state (clients poll this). */
export async function GET(
  _request: Request,
  { params }: { params: { roomId: string } }
) {
  const room = getRoomWithExpiry(params.roomId);
  if (!room) {
    return NextResponse.json(
      { error: `Room "${params.roomId}" does not exist.` },
      { status: 404 }
    );
  }
  return NextResponse.json(
    { room },
    { headers: { "Cache-Control": "no-store" } }
  );
}
