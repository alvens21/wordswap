"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MIN_PLAYERS } from "@/lib/types";
import SeatClaimer from "@/components/SeatClaimer";
import {
  apiJoinRoom,
  apiRoomAction,
  useIdentity,
  useRoomSync,
} from "@/lib/store";
import { cn, initialsOf } from "@/lib/utils";
import Avatar from "@/components/Avatar";

export default function LobbyPage() {
  const router = useRouter();
  const params = useParams<{ roomId: string }>();
  const roomId = params?.roomId?.toUpperCase();
  const { room, loading, notFound, applyRoom } = useRoomSync(roomId);
  const { myPlayerId, claim } = useIdentity(roomId);

  const [playerName, setPlayerName] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joining, setJoining] = useState(false);
  const [actionError, setActionError] = useState("");
  const [copied, setCopied] = useState(false);

  // When the Admin starts the game, everyone moves to the game view.
  useEffect(() => {
    if (room && room.phase === "playing") {
      router.replace(`/game/${room.id}`);
    }
  }, [room, router]);

  if (loading && !room) {
    return (
      <main className="page">
        <div className="container-md">
          <p className="text-body">Loading room…</p>
        </div>
      </main>
    );
  }

  if (notFound || !room) {
    return (
      <main className="page">
        <div className="container-md stack stack-md">
          <h1 className="text-h2">Room not found</h1>
          <p className="text-body">
            Room {roomId} does not exist. Check the code with the Admin —
            rooms live on the server, so any browser can join a valid code.
          </p>
          <Link className={cn("btn", "btn-primary")} href="/">
            Back to Home
          </Link>
        </div>
      </main>
    );
  }

  const seatedPlayer = myPlayerId
    ? room.players.find((p) => p.id === myPlayerId)
    : undefined;
  const amAdmin = Boolean(myPlayerId && myPlayerId === room.adminId);
  const isFull = room.players.length >= room.maxPlayers;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.id);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const handleJoin = async () => {
    setJoinError("");
    if (!roomId) return;
    setJoining(true);
    const result = await apiJoinRoom(roomId, playerName);
    setJoining(false);
    if (!result.ok) {
      setJoinError(result.error);
      return;
    }
    claim(room.id, result.data.playerId);
    applyRoom(result.data.room);
    setPlayerName("");
  };

  const runAdminAction = async (type: "start" | "kick", targetPlayerId?: string) => {
    if (!room || !myPlayerId) return;
    setActionError("");
    const result = await apiRoomAction(room.id, myPlayerId, {
      type,
      targetPlayerId,
    });
    if (!result.ok) {
      setActionError(result.error);
      return;
    }
    applyRoom(result.data.room);
  };

  return (
    <main className="page">
      <div className="container-md stack stack-lg">
        <div className="row-between row-wrap">
          <div className="stack stack-xs">
            <h1 className="text-h1">{room.name}</h1>
            <p className="text-caption">
              Lobby · {room.totalRounds} {room.totalRounds === 1 ? "round" : "rounds"} ·
              up to {room.maxPlayers} players
              {amAdmin
                ? " · You are the Admin"
                : seatedPlayer
                  ? ` · You are ${seatedPlayer.name}`
                  : " · Watching"}
            </p>
          </div>
          <div className="row row-md">
            <button
              type="button"
              className="code-chip"
              onClick={copyCode}
              title="Copy room code"
            >
              {room.id}
              <span className="text-caption">{copied ? "Copied!" : "Copy"}</span>
            </button>
          </div>
        </div>

        <section className="card">
          <header className="card-header">
            <h2 className="text-h4">
              Players ({room.players.length} / {room.maxPlayers})
            </h2>
            {amAdmin ? (
              <span className="badge badge-warning">You are the Admin</span>
            ) : seatedPlayer ? (
              <span className="badge badge-brand">Seated as {seatedPlayer.name}</span>
            ) : (
              <span className="badge badge-neutral">Watching</span>
            )}
          </header>
          <div className="stack stack-sm">
            <div className="player-row">
              <Avatar name={room.adminName} imageUrl={room.adminAvatarUrl} size="sm" />
              <div className="stack stack-xs grow">
                <span className="player-name">
                  {room.adminName}
                  {amAdmin ? " (you)" : ""}
                </span>
                <span className="text-caption">
                  Admin · Room creator · does not play
                </span>
              </div>
              <span className="badge badge-warning">Admin</span>
            </div>
            {room.players.map((player, index) => (
              <div key={player.id} className="player-row">
                <Avatar name={player.name} imageUrl={player.avatarUrl} size="sm" />
                <div className="stack stack-xs grow">
                  <span className="player-name">
                    {player.name}
                    {myPlayerId === player.id ? " (you)" : ""}
                  </span>
                  <span className="text-caption">Player · seat {index + 1}</span>
                </div>
                {amAdmin ? (
                  <button
                    type="button"
                    className={cn("btn", "btn-danger-soft", "btn-sm")}
                    onClick={() => runAdminAction("kick", player.id)}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        {!seatedPlayer && !amAdmin ? (
          <section className="card">
            <header className="card-header">
              <h2 className="text-h4">Join this room</h2>
            </header>
            <div className="stack stack-md">
              {!isFull ? (
                <>
                  <div className="row row-sm">
                    <input
                      className="input grow"
                      value={playerName}
                      maxLength={20}
                      placeholder="Your player name"
                      aria-label="Your player name"
                      onChange={(e) => setPlayerName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleJoin();
                      }}
                    />
                    <button
                      type="button"
                      className={cn("btn", "btn-secondary")}
                      disabled={joining}
                      onClick={handleJoin}
                    >
                      {joining ? "Joining…" : "Join as Player"}
                    </button>
                  </div>
                  {joinError ? <p className="field-error">{joinError}</p> : null}
                  <p className="field-hint">
                    Players join as regular players — the room creator is the
                    Admin and does not play.
                  </p>
                </>
              ) : (
                <p className="field-error">
                  This room is full ({room.maxPlayers} players).
                </p>
              )}
              {room.players.length > 0 ? (
                <>
                  <hr className="divider" />
                  <SeatClaimer
                    room={room}
                    onClaim={(playerId) => claim(room.id, playerId)}
                  />
                </>
              ) : null}
            </div>
          </section>
        ) : null}

        {amAdmin ? (
          <section className="card admin-panel">
            <header className="card-header">
              <h2 className="text-h4">Admin Controls</h2>
              <span className="badge badge-warning">Admin</span>
            </header>
            <div className="stack stack-md">
              <p className="text-body-sm">
                Start the game when at least {MIN_PLAYERS} players have
                joined. As the Admin you do not play — you manage the game
                and monitor the players from the console. Each round begins
                with a fresh 5-letter word; turns rotate in seat order.
              </p>
              {actionError ? <p className="field-error">{actionError}</p> : null}
              <button
                type="button"
                className={cn("btn", "btn-primary", "btn-lg", "btn-block")}
                disabled={room.players.length < MIN_PLAYERS}
                onClick={() => runAdminAction("start")}
              >
                Start Game
              </button>
              {room.players.length < MIN_PLAYERS ? (
                <p className="field-error">
                  Add at least {MIN_PLAYERS - room.players.length} more{" "}
                  {MIN_PLAYERS - room.players.length === 1 ? "player" : "players"} to
                  start.
                </p>
              ) : null}
            </div>
          </section>
        ) : (
          <div className={cn("feedback", "feedback-info")}>
            <span className="feedback-icon" aria-hidden="true">⏳</span>
            <div className="stack stack-xs">
              <span className="text-label">Waiting for the Admin</span>
              <span className="text-body-sm">
                Share the room code ({room.id}) so others can join. The game
                starts automatically for everyone when the Admin begins.
              </span>
            </div>
          </div>
        )}

        <div className="row">
          <Link className={cn("btn", "btn-ghost")} href="/">
            ← Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
