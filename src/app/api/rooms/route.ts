import { NextResponse } from "next/server";
import { createRoomOnServer, listRooms } from "@/lib/serverRooms";
import { DEFAULT_ROUNDS, MAX_ROUNDS, MIN_ROUNDS } from "@/lib/types";

export const dynamic = "force-dynamic";

/** GET /api/rooms — list all active rooms (for the home page / join discovery). */
export async function GET() {
  return NextResponse.json(
    { rooms: listRooms() },
    { headers: { "Cache-Control": "no-store" } }
  );
}

/** POST /api/rooms — create a room; the creator becomes the Admin automatically. */
export async function POST(request: Request) {
  let body: { name?: unknown; adminName?: unknown; rounds?: unknown; adminAvatarUrl?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const name = typeof body.name === "string" ? body.name : "";
  const adminName = typeof body.adminName === "string" ? body.adminName : "";
  if (!adminName.trim()) {
    return NextResponse.json(
      { error: "Please enter your name — the room creator becomes the Admin." },
      { status: 400 }
    );
  }

  const roundsRaw = Number(body.rounds);
  const rounds = Number.isFinite(roundsRaw)
    ? Math.min(MAX_ROUNDS, Math.max(MIN_ROUNDS, Math.floor(roundsRaw)))
    : DEFAULT_ROUNDS;

  const adminAvatarUrl = typeof body.adminAvatarUrl === "string" ? body.adminAvatarUrl : undefined;

  const room = createRoomOnServer(name, adminName.trim(), rounds, adminAvatarUrl);
  return NextResponse.json(
    { room },
    { status: 201, headers: { "Cache-Control": "no-store" } }
  );
}
