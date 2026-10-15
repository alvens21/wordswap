/**
 * WordSwap — Server-side room registry.
 *
 * Rooms live on the Node server (not in any browser), so every player can
 * create, join by code, and play from their own browser. The registry is an
 * in-memory Map pinned to `globalThis` so it survives hot reloads in dev;
 * swapping in Redis or a database later only requires changing this file.
 *
 * All rule enforcement runs here on top of the pure game engine — the
 * client never mutates rooms directly.
 *
 * SIMULTANEOUS TURNS:
 *   The server manages the 10-second turn timer. When a player submits an
 *   answer, `submitAnswer` is called. When the timer expires (checked on
 *   every request), `closeTurn` is applied automatically before the
 *   response is returned.
 */

import type { Room, RoomActionRequest } from "./types";
import {
  addPlayer,
  closeTurn,
  createRoom,
  endGame,
  forceNextPlayer,
  isTurnExpired,
  nextRound,
  removePlayer,
  resetToLobby,
  startGame,
  submitAnswer,
} from "./gameEngine";
import { listAvailableSwaps } from "./aiValidator";
import { ensureWordKnown } from "./wordVerifier";
import { replaceAt } from "./utils";

interface Registry {
  rooms: Map<string, Room>;
}

const globalRef = globalThis as unknown as { __wordswapRegistry?: Registry };

function registry(): Registry {
  if (!globalRef.__wordswapRegistry) {
    globalRef.__wordswapRegistry = { rooms: new Map() };
  }
  return globalRef.__wordswapRegistry;
}

export function listRooms(): Room[] {
  return Array.from(registry().rooms.values()).sort(
    (a, b) => b.createdAt - a.createdAt
  );
}

export function getRoom(roomId: string): Room | undefined {
  return registry().rooms.get(roomId);
}

export function createRoomOnServer(
  name: string,
  adminName: string,
  totalRounds: number,
  adminAvatarUrl?: string
): Room {
  const reg = registry();
  let room = createRoom(name, adminName, totalRounds, adminAvatarUrl);
  while (reg.rooms.has(room.id)) {
    room = createRoom(name, adminName, totalRounds, adminAvatarUrl);
  }
  reg.rooms.set(room.id, room);
  return room;
}

export type JoinResult =
  | { ok: true; room: Room; playerId: string }
  | { ok: false; status: number; error: string };

export function joinRoomOnServer(
  roomId: string,
  rawName: string,
  avatarUrl?: string
): JoinResult {
  const room = getRoom(roomId);
  if (!room) {
    return {
      ok: false,
      status: 404,
      error: `Room "${roomId}" does not exist. Double-check the code with the Admin.`,
    };
  }
  const result = addPlayer(room, rawName, avatarUrl);
  if (!result.ok) {
    return { ok: false, status: 400, error: result.error };
  }
  registry().rooms.set(roomId, result.room);
  return { ok: true, room: result.room, playerId: result.playerId };
}

export type ActionResult =
  | { ok: true; room: Room }
  | { ok: false; status: number; error: string };

function adminGuard(room: Room, playerId: string): ActionResult | null {
  if (playerId !== room.adminId) {
    return { ok: false, status: 403, error: "Only the Admin can do that." };
  }
  return null;
}

/**
 * Server-derived state applied after every mutation: whether any valid
 * swap exists on the current board (AI Referee exhaustion check) plus a
 * short list of suggested words for the Admin's console.
 */
function withDerivedState(room: Room): Room {
  if (room.phase === "playing" && room.board) {
    const available = listAvailableSwaps(room.board, room.usedWords);
    return {
      ...room,
      wordsRemaining: available.length > 0,
      suggestedWords: available.slice(0, 12),
    };
  }
  return room;
}

/**
 * Auto-close an expired turn. Called before every response so the
 * timer is enforced server-side even if no one sends a request.
 */
function autoCloseExpiredTurn(room: Room): Room {
  if (room.phase === "playing" && isTurnExpired(room)) {
    return closeTurn(room);
  }
  return room;
}

/** Persists and returns the final room state. */
function persist(roomId: string, room: Room): Room {
  const derived = withDerivedState(room);
  registry().rooms.set(roomId, derived);
  return derived;
}

/** Applies a client action with full server-side rule enforcement. */
export async function applyRoomAction(
  roomId: string,
  playerId: string,
  action: RoomActionRequest
): Promise<ActionResult> {
  // Auto-close any expired turn before processing the action.
  const rawRoom = getRoom(roomId);
  if (!rawRoom) return { ok: false, status: 404, error: "Room not found." };
  let room = autoCloseExpiredTurn(rawRoom);

  // The actor is either the Admin (who does not play) or a seated player.
  const isAdmin = playerId === room.adminId;
  const actor = room.players.find((p) => p.id === playerId);
  if (!isAdmin && !actor) {
    return { ok: false, status: 403, error: "You are not seated in this room." };
  }

  let next: Room = room;
  switch (action.type) {
    case "start": {
      const guard = adminGuard(room, playerId);
      if (guard) return guard;
      const result = startGame(room);
      if (!result.ok) return { ok: false, status: 400, error: result.error };
      next = result.room;
      break;
    }

    case "swap":
    case "answer": {
      if (room.phase !== "playing") {
        return { ok: false, status: 400, error: "The game is not running." };
      }
      if (typeof action.position !== "number" || typeof action.letter !== "string") {
        return { ok: false, status: 400, error: "Invalid answer request." };
      }
      // AI Referee fallback: verify the candidate word online if the
      // offline dictionary doesn't know it.
      const candidate = replaceAt(room.board, action.position, action.letter);
      await ensureWordKnown(candidate);
      const result = submitAnswer(room, playerId, action.position, action.letter);
      if (!result.ok) {
        return {
          ok: false,
          status: result.error.includes("not your turn") ? 403 : 400,
          error: result.error,
        };
      }
      next = result.room;
      break;
    }

    case "forceNext": {
      const guard = adminGuard(room, playerId);
      if (guard) return guard;
      next = forceNextPlayer(room);
      break;
    }

    case "nextRound": {
      const guard = adminGuard(room, playerId);
      if (guard) return guard;
      next = nextRound(room);
      break;
    }

    case "endGame": {
      const guard = adminGuard(room, playerId);
      if (guard) return guard;
      next = endGame(room);
      break;
    }

    case "kick": {
      const guard = adminGuard(room, playerId);
      if (guard) return guard;
      const target = room.players.find((p) => p.id === action.targetPlayerId);
      if (!target) {
        return { ok: false, status: 400, error: "That player cannot be removed." };
      }
      next = removePlayer(room, action.targetPlayerId as string);
      if (next === room) {
        return {
          ok: false,
          status: 400,
          error: "Players can only be removed in the lobby.",
        };
      }
      break;
    }

    case "reset": {
      const guard = adminGuard(room, playerId);
      if (guard) return guard;
      next = resetToLobby(room);
      break;
    }

    default:
      return { ok: false, status: 400, error: "Unknown action." };
  }

  return { ok: true, room: persist(roomId, next) };
}

/**
 * GET endpoint helper: returns the room with auto-closed turn if expired.
 * Persists the result so the registry stays in sync.
 */
export function getRoomWithExpiry(roomId: string): Room | undefined {
  const room = getRoom(roomId);
  if (!room) return undefined;
  const updated = autoCloseExpiredTurn(room);
  if (updated !== room) {
    return persist(roomId, updated);
  }
  return updated;
}
