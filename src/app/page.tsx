"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import {
  DEFAULT_ROUNDS,
  MAX_PLAYERS,
  MAX_ROUNDS,
  MIN_ROUNDS,
} from "@/lib/types";
import { apiCreateRoom, apiJoinRoom, useIdentity, useRoomList } from "@/lib/store";
import { cn } from "@/lib/utils";
import { WORD_COUNT } from "@/lib/dictionary";
import AvatarUploadField from "@/components/AvatarUploadField";

export default function HomePage() {
  const router = useRouter();
  const { rooms, loading } = useRoomList();
  const { claim } = useIdentity(undefined);

  const [roomName, setRoomName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminAvatar, setAdminAvatar] = useState<string | undefined>();
  const [rounds, setRounds] = useState(String(DEFAULT_ROUNDS));
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);

  const [joinCode, setJoinCode] = useState("");
  const [joinName, setJoinName] = useState("");
  const [joinAvatar, setJoinAvatar] = useState<string | undefined>();
  const [joinError, setJoinError] = useState("");
  const [joining, setJoining] = useState(false);

  const handleCreate = async () => {
    setCreateError("");
    if (!adminName.trim()) {
      setCreateError("Please enter your name — you will be the Admin.");
      return;
    }
    setCreating(true);
    const result = await apiCreateRoom(roomName, adminName, Number(rounds), adminAvatar);
    setCreating(false);
    if (!result.ok) {
      setCreateError(result.error);
      return;
    }
    claim(result.data.room.id, result.data.room.adminId);
    router.push(`/lobby/${result.data.room.id}`);
  };

  const handleJoin = async () => {
    setJoinError("");
    const code = joinCode.trim().toUpperCase();
    if (!code) {
      setJoinError("Please enter a room code.");
      return;
    }
    if (!joinName.trim()) {
      setJoinError("Please enter your player name.");
      return;
    }
    setJoining(true);
    const result = await apiJoinRoom(code, joinName, joinAvatar);
    setJoining(false);
    if (!result.ok) {
      setJoinError(result.error);
      return;
    }
    claim(code, result.data.playerId);
    router.push(`/lobby/${code}`);
  };

  const phaseBadge = (phase: string, round: number, totalRounds: number) => {
    if (phase === "lobby") {
      return <span className="badge badge-brand">Open lobby</span>;
    }
    if (phase === "playing") {
      return (
        <span className="badge badge-success">
          Round {round}/{totalRounds}
        </span>
      );
    }
    return <span className="badge badge-neutral">Finished</span>;
  };

  return (
    <main className="page">
      <div className="container-wide stack stack-xl">
        {/* Hero Section */}
        <section className="home-hero stack stack-md center">
          <h1 className="text-h1 center">
            Swap one letter. Make a new word. Stay alive.
          </h1>
          <p className="text-body-lg center">
            WordSwap is an online word game for 2 to {MAX_PLAYERS} players.
            The board shows 5 letters; on your turn you replace one letter to
            form a different valid word. The AI Referee judges every move —
            invalid words score 0 and the turn passes on.
          </p>
          <p className="text-caption center">
            AI Referee powered by an offline dictionary of {WORD_COUNT}{" "}
            curated 5-letter words. Rooms live on the server — share the code
            and anyone can join from their own browser.
          </p>
        </section>

        {/* Create / Join Cards */}
        <div className="home-actions-grid">
          <section className="card">
            <header className="card-header">
              <h2 className="text-h3">Create Room</h2>
              <span className="badge badge-brand">Up to {MAX_PLAYERS} players</span>
            </header>
            <div className="stack stack-md">
              <div className="field">
                <label className="text-label" htmlFor="create-room-name">
                  Room name
                </label>
                <input
                  id="create-room-name"
                  className="input"
                  value={roomName}
                  maxLength={40}
                  placeholder="Friday Night Words"
                  onChange={(e) => setRoomName(e.target.value)}
                />
              </div>
              <div className="field">
                <label className="text-label" htmlFor="create-host-name">
                  Your name
                </label>
                <input
                  id="create-host-name"
                  className="input"
                  value={adminName}
                  maxLength={20}
                  placeholder="Alex"
                  onChange={(e) => setAdminName(e.target.value)}
                />
              </div>
              <AvatarUploadField
                value={adminAvatar}
                onChange={setAdminAvatar}
                label="Your profile image (optional)"
              />
              <div className="field">
                <label className="text-label" htmlFor="create-rounds">
                  Rounds
                </label>
                <select
                  id="create-rounds"
                  className="select"
                  value={rounds}
                  onChange={(e) => setRounds(e.target.value)}
                >
                  {Array.from(
                    { length: MAX_ROUNDS - MIN_ROUNDS + 1 },
                    (_, i) => i + MIN_ROUNDS
                  ).map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? "round" : "rounds"}
                    </option>
                  ))}
                </select>
              </div>
              {createError ? <p className="field-error">{createError}</p> : null}
              <button
                type="button"
                className={cn("btn", "btn-primary", "btn-lg", "btn-block")}
                disabled={creating}
                onClick={handleCreate}
              >
                {creating ? "Creating…" : "Create Room"}
              </button>
              <p className="field-hint">
                There is exactly one way to make a room. The player who
                creates it automatically becomes the Admin: you control the
                game and monitor the players — you do not play yourself.
                Everyone else joins as regular players with the room code.
              </p>
            </div>
          </section>

          <section className="card">
            <header className="card-header">
              <h2 className="text-h3">Join a Room</h2>
            </header>
            <div className="stack stack-md">
              <div className="field">
                <label className="text-label" htmlFor="join-code">
                  Room code
                </label>
                <input
                  id="join-code"
                  className="input text-mono"
                  value={joinCode}
                  maxLength={5}
                  placeholder="ABC12"
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                />
              </div>
              <div className="field">
                <label className="text-label" htmlFor="join-name">
                  Player name
                </label>
                <input
                  id="join-name"
                  className="input"
                  value={joinName}
                  maxLength={20}
                  placeholder="Sam"
                  onChange={(e) => setJoinName(e.target.value)}
                />
              </div>
              <AvatarUploadField
                value={joinAvatar}
                onChange={setJoinAvatar}
                label="Profile image (optional)"
              />
              {joinError ? <p className="field-error">{joinError}</p> : null}
              <button
                type="button"
                className={cn("btn", "btn-secondary", "btn-lg", "btn-block")}
                disabled={joining}
                onClick={handleJoin}
              >
                {joining ? "Joining…" : "Join Room"}
              </button>
              <p className="field-hint">
                Enter the code the Admin shared with you. You will join the
                lobby as a regular player — only the Admin controls the game
                flow.
              </p>
            </div>
          </section>
        </div>

        {/* Active Rooms */}
        <section className="card card-sunken">
          <header className="card-header">
            <h2 className="text-h4">Active rooms</h2>
            {loading ? <span className="text-caption">Loading…</span> : null}
          </header>
          {rooms.length === 0 ? (
            <p className="text-body-sm">
              No rooms yet — create one above and share the code with your
              friends.
            </p>
          ) : (
            <div className="stack stack-sm">
              {rooms.map((room) => {
                return (
                  <Link
                    key={room.id}
                    href={
                      room.phase === "lobby" ? `/lobby/${room.id}` : `/game/${room.id}`
                    }
                    className="player-row"
                  >
                    <span className={cn("avatar", "avatar-sm")} aria-hidden="true">
                      {room.id.slice(0, 2)}
                    </span>
                    <div className="stack stack-xs grow">
                      <span className="player-name">{room.name}</span>
                      <span className="text-caption">
                        Code {room.id} · Admin {room.adminName} ·{" "}
                        {room.players.length}/{room.maxPlayers} players
                      </span>
                    </div>
                    {phaseBadge(room.phase, room.round, room.totalRounds)}
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* How to Play */}
        <section className="card">
          <header className="card-header">
            <h2 className="text-h3">How to play</h2>
          </header>
          <div className="home-rules-list">
            <div className="home-rule-item">
              <span className="home-rule-number">1</span>
              <div className="home-rule-content">
                <p className="text-body">
                  The board starts each round with a 5-letter word, like
                  <span className="log-word"> FOODS</span>.
                </p>
              </div>
            </div>
            <div className="home-rule-item">
              <span className="home-rule-number">2</span>
              <div className="home-rule-content">
                <p className="text-body">
                  On your turn, remove one letter and put a new one in its place —
                  <span className="log-word"> FOODS</span> becomes
                  <span className="log-word"> GOODS</span>.
                </p>
              </div>
            </div>
            <div className="home-rule-item">
              <span className="home-rule-number">3</span>
              <div className="home-rule-content">
                <p className="text-body">
                  The AI Referee checks spelling. Valid word: points equal to the
                  seconds remaining on the timer. Invalid word: 0 points and the
                  turn passes immediately.
                </p>
              </div>
            </div>
            <div className="home-rule-item">
              <span className="home-rule-number">4</span>
              <div className="home-rule-content">
                <p className="text-body">
                  Words cannot repeat within a round. When no valid words are
                  left, the game automatically starts the next round. Highest
                  total score wins the game.
                </p>
              </div>
            </div>
            <div className="home-rule-item">
              <span className="home-rule-number">5</span>
              <div className="home-rule-content">
                <p className="text-body">
                  The room creator is the Admin: they run the game, watch the
                  scores and see word suggestions — but never play.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
