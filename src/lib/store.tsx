"use client";

/**
 * WordSwap — Client data layer.
 *
 * Rooms live on the server (see lib/serverRooms.ts + /api/rooms). This
 * module keeps the UI in sync with lightweight polling and exposes the
 * API helpers pages need:
 *
 *  - useRoomList()  → all active rooms (home page)
 *  - useRoomSync()  → one room, polled while the page is open
 *  - useIdentity()  → which seat this browser/tab controls
 *                     (sessionStorage per tab, with an in-memory fallback)
 *
 * All storage access is guarded so restricted contexts (sandboxed
 * iframes, private modes) can never crash the game.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { Room, RoomActionRequest } from "./types";

const IDENTITY_PREFIX = "wordswap:identity:";
const ROOM_POLL_MS = 500;
const LIST_POLL_MS = 3000;

/* ------------------------------------------------------------------ */
/* API helpers                                                         */
/* ------------------------------------------------------------------ */

type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

async function requestJSON<T>(
  url: string,
  method: "GET" | "POST",
  body?: unknown
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method,
      cache: "no-store",
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      const message =
        typeof data.error === "string"
          ? data.error
          : `Request failed (${res.status}).`;
      return { ok: false, error: message };
    }
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, error: "Could not reach the game server. Try again." };
  }
}

export function apiListRooms() {
  return requestJSON<{ rooms: Room[] }>("/api/rooms", "GET");
}

export function apiCreateRoom(name: string, adminName: string, rounds: number, adminAvatarUrl?: string) {
  return requestJSON<{ room: Room }>("/api/rooms", "POST", {
    name,
    adminName,
    rounds,
    adminAvatarUrl,
  });
}

export function apiJoinRoom(roomId: string, playerName: string, avatarUrl?: string) {
  return requestJSON<{ room: Room; playerId: string }>(
    `/api/rooms/${encodeURIComponent(roomId)}/join`,
    "POST",
    { name: playerName, avatarUrl }
  );
}

export function apiRoomAction(
  roomId: string,
  playerId: string,
  action: RoomActionRequest
) {
  return requestJSON<{ room: Room }>(
    `/api/rooms/${encodeURIComponent(roomId)}/action`,
    "POST",
    { playerId, action }
  );
}

/* ------------------------------------------------------------------ */
/* Identity (per browser tab)                                          */
/* ------------------------------------------------------------------ */

const memoryIdentity = new Map<string, string>();

function readIdentity(roomId: string): string | null {
  try {
    const stored = window.sessionStorage.getItem(IDENTITY_PREFIX + roomId);
    if (stored) return stored;
  } catch {
    // Storage unavailable — fall back to this tab's in-memory map.
  }
  return memoryIdentity.get(roomId) ?? null;
}

function writeIdentity(roomId: string, playerId: string): void {
  memoryIdentity.set(roomId, playerId);
  try {
    window.sessionStorage.setItem(IDENTITY_PREFIX + roomId, playerId);
  } catch {
    // Ignore — in-memory copy still works for this tab.
  }
}

export interface Identity {
  /** The seat this tab controls in `roomId` (null = spectator). */
  myPlayerId: string | null;
  /** Bind this tab to a seat. */
  claim: (roomId: string, playerId: string) => void;
  /** Forget this tab's seat. */
  release: (roomId: string) => void;
}

export function useIdentity(roomId: string | undefined): Identity {
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId) {
      setMyPlayerId(null);
      return;
    }
    setMyPlayerId(readIdentity(roomId));
  }, [roomId]);

  const claim = useCallback(
    (targetRoomId: string, playerId: string) => {
      writeIdentity(targetRoomId, playerId);
      if (targetRoomId === roomId) setMyPlayerId(playerId);
    },
    [roomId]
  );

  const release = useCallback(
    (targetRoomId: string) => {
      memoryIdentity.delete(targetRoomId);
      try {
        window.sessionStorage.removeItem(IDENTITY_PREFIX + targetRoomId);
      } catch {
        // Ignore.
      }
      if (targetRoomId === roomId) setMyPlayerId(null);
    },
    [roomId]
  );

  return { myPlayerId, claim, release };
}

/* ------------------------------------------------------------------ */
/* Room list (home page)                                               */
/* ------------------------------------------------------------------ */

export function useRoomList(): { rooms: Room[]; loading: boolean } {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      const result = await apiListRooms();
      if (!active) return;
      if (result.ok) {
        setRooms(result.data.rooms);
        setLoading(false);
      }
      timer = setTimeout(tick, LIST_POLL_MS);
    };

    tick();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, []);

  return { rooms, loading };
}

/* ------------------------------------------------------------------ */
/* Single room sync (lobby / game pages)                               */
/* ------------------------------------------------------------------ */

export interface RoomSync {
  room: Room | null;
  loading: boolean;
  notFound: boolean;
  /** Apply a fresh room immediately (e.g. an action response). */
  applyRoom: (room: Room) => void;
  /** Force an immediate fetch. */
  refresh: () => void;
}

export function useRoomSync(roomId: string | undefined): RoomSync {
  const [room, setRoom] = useState<Room | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const activeRef = useRef(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const fetchOnce = useCallback(async () => {
    if (!roomId) return;
    const result = await requestJSON<{ room: Room }>(
      `/api/rooms/${encodeURIComponent(roomId)}`,
      "GET"
    );
    if (!activeRef.current) return;
    if (result.ok) {
      setRoom(result.data.room);
      setNotFound(false);
    } else {
      setNotFound(true);
    }
    setLoading(false);
  }, [roomId]);

  const schedule = useCallback(() => {
    timerRef.current = setTimeout(async () => {
      await fetchOnce();
      if (activeRef.current) schedule();
    }, ROOM_POLL_MS);
  }, [fetchOnce]);

  useEffect(() => {
    activeRef.current = true;
    setLoading(true);
    setNotFound(false);
    setRoom(null);

    const run = async () => {
      await fetchOnce();
      if (activeRef.current) schedule();
    };
    run();

    return () => {
      activeRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [roomId, fetchOnce, schedule]);

  const applyRoom = useCallback((next: Room) => {
    setRoom(next);
    setNotFound(false);
    setLoading(false);
  }, []);

  const refresh = useCallback(() => {
    fetchOnce();
  }, [fetchOnce]);

  return { room, loading, notFound, applyRoom, refresh };
}
