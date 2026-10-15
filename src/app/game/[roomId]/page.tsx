"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import GameBoard from "@/components/GameBoard";
import PlayerList from "@/components/PlayerList";
import AdminPanel from "@/components/AdminPanel";
import FeedbackBanner from "@/components/FeedbackBanner";
import SeatClaimer from "@/components/SeatClaimer";
import TurnTimer from "@/components/TurnTimer";
import Avatar from "@/components/Avatar";
import {
  currentTurnPlayer,
  getStandings,
  getRankings,
} from "@/lib/gameEngine";
import { TURN_DURATION_MS } from "@/lib/types";
import { scannedSwapCount } from "@/lib/aiValidator";
import { apiRoomAction, useIdentity, useRoomSync } from "@/lib/store";
import { cn } from "@/lib/utils";

export default function GamePage() {
  const router = useRouter();
  const params = useParams<{ roomId: string }>();
  const roomId = params?.roomId?.toUpperCase();
  const { room, loading, notFound, applyRoom } = useRoomSync(roomId);
  const { myPlayerId, claim } = useIdentity(roomId);
  const [actionError, setActionError] = useState("");

  // Rooms still in lobby state belong to the lobby page.
  useEffect(() => {
    if (room && room.phase === "lobby") {
      router.replace(`/lobby/${room.id}`);
    }
  }, [room, router]);

  if (loading && !room) {
    return (
      <main className="page">
        <div className="container">
          <p className="text-body">Loading game…</p>
        </div>
      </main>
    );
  }

  if (notFound || !room) {
    return (
      <main className="page">
        <div className="container-narrow stack stack-md">
          <h1 className="text-h2">Room not found</h1>
          <p className="text-body">
            Room {roomId} does not exist. Check the code with the Admin.
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
  const turnPlayer = currentTurnPlayer(room);
  const isMyTurn = Boolean(seatedPlayer && turnPlayer && turnPlayer.id === myPlayerId);

  // Server-computed by the AI Referee (accounts for online-learned words).
  const wordsRemaining =
    room.phase === "playing" ? room.wordsRemaining !== false : true;

  const runAction = async (
    action: Parameters<typeof apiRoomAction>[2]
  ) => {
    if (!room || !myPlayerId) return;
    setActionError("");
    const result = await apiRoomAction(room.id, myPlayerId, action);
    if (!result.ok) {
      setActionError(result.error);
      return;
    }
    applyRoom(result.data.room);
  };

  const handleSwap = (position: number, letter: string) => {
    runAction({ type: "answer", position, letter });
  };

  const handlePlayAgain = () => {
    runAction({ type: "reset" });
  };

  // Has the current player already answered this turn?
  const hasAnswered = seatedPlayer
    ? (room.answeredPlayerIds ?? []).includes(seatedPlayer.id)
    : false;

  /* ---- Game-end overlay ---- */
  if (room.phase === "gameEnd") {
    const standings = getStandings(room.players);
    const topScore = standings.length > 0 ? standings[0].score : 0;
    return (
      <main className="page">
        <div className="overlay">
          <div className="modal stack stack-lg">
            <div className="stack stack-xs">
              <span className="badge badge-success">Game over</span>
              <h1 className="text-h1">Final Standings</h1>
              <p className="text-body">
                {room.name} · {room.totalRounds}{" "}
                {room.totalRounds === 1 ? "round" : "rounds"} played
              </p>
            </div>
            <div className="stack stack-sm">
              {standings.map((player, index) => {
                const isWinner = player.score === topScore && topScore > 0;
                return (
                  <div
                    key={player.id}
                    className={cn("standings-row", isWinner && "is-winner")}
                  >
                    <span className="standings-rank">#{index + 1}</span>
                    <Avatar name={player.name} imageUrl={player.avatarUrl} size="sm" />
                    <span className="player-name grow">
                      {player.name}
                      {isWinner ? " · Winner" : ""}
                    </span>
                    <span className="score-chip">{player.score}</span>
                  </div>
                );
              })}
            </div>
            {actionError ? <p className="field-error">{actionError}</p> : null}
            <div className="row row-md">
              {amAdmin ? (
                <button
                  type="button"
                  className={cn("btn", "btn-primary", "grow")}
                  onClick={handlePlayAgain}
                >
                  Play Again
                </button>
              ) : null}
              <Link className={cn("btn", "btn-secondary")} href="/">
                Home
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  /* ---- Main game view ---- */
  const rankings = getRankings(room.players);
  const standings = getStandings(room.players);
  const isPlaying = room.phase === "playing";

  return (
    <main className="page">
      <div className="container-wide stack stack-lg">
        {/* Header */}
        <div className="row-between row-wrap">
          <div className="stack stack-xs">
            <h1 className="text-h2">{room.name}</h1>
            <p className="text-caption">
              Room {room.id} · Round {room.round} of {room.totalRounds}
              {amAdmin
                ? " · You are the Admin (not playing)"
                : seatedPlayer
                  ? ` · You are ${seatedPlayer.name}`
                  : " · Watching"}
            </p>
          </div>
          <div className="row row-md">
            {isPlaying ? <TurnTimer room={room} /> : null}
            <span className="badge badge-brand">
              Round {room.round}/{room.totalRounds}
            </span>
            {isPlaying ? (
              <span className="badge badge-success">
                Turn {room.turnNumber ?? 1}
              </span>
            ) : null}
            <div className="header-profile">
              {amAdmin ? (
                <>
                  <span className="text-body-sm header-profile-name">{room.adminName}</span>
                  <Avatar name={room.adminName} imageUrl={room.adminAvatarUrl} size="sm" />
                </>
              ) : seatedPlayer ? (
                <>
                  <span className="text-body-sm header-profile-name">{seatedPlayer.name}</span>
                  <Avatar name={seatedPlayer.name} imageUrl={seatedPlayer.avatarUrl} size="sm" />
                </>
              ) : null}
            </div>
          </div>
        </div>

        {/* Three-column game layout */}
        <div className="grid game-layout-3col">
          {/* LEFT: Player list (scrollable) */}
          <div className="game-col-left">
            <PlayerList room={room} showAdmin />
          </div>

          {/* CENTER: Game board + timer + feedback */}
          <div className="game-col-center">
            <FeedbackBanner result={room.lastResult} />
            {actionError ? (
              <div className={cn("feedback", "feedback-danger", "animate-enter")}>
                <span className="feedback-icon" aria-hidden="true">✕</span>
                <div className="stack stack-xs">
                  <span className="text-label">Action rejected</span>
                  <span className="text-body-sm">{actionError}</span>
                </div>
              </div>
            ) : null}

            {amAdmin ? (
              <div className="stack stack-md">
                <div className={cn("feedback", "feedback-info", "animate-enter")}>
                  <span className="feedback-icon" aria-hidden="true">🛡</span>
                  <div className="stack stack-xs">
                    <span className="text-label">Admin console</span>
                    <span className="text-body-sm">
                      You manage the game and monitor the players — you do not
                      take turns or score points.
                    </span>
                  </div>
                </div>
              </div>
            ) : seatedPlayer ? (
              <div className={cn("stack stack-md player-board-area", isMyTurn && "is-my-turn-area")}>
                <GameBoard
                  room={room}
                  onSubmitSwap={handleSwap}
                  disabled={hasAnswered}
                />
                {hasAnswered ? (
                  <div className={cn("feedback", "feedback-success", "animate-enter")}>
                    <span className="feedback-icon" aria-hidden="true">✓</span>
                    <span className="text-body-sm">
                      Answer submitted! Waiting for the turn to end…
                    </span>
                  </div>
                ) : null}
              </div>
            ) : (
              <SeatClaimer
                room={room}
                onClaim={(playerId) => claim(room.id as string, playerId)}
              />
            )}

            {/* Suggested words (admin only) */}
            {amAdmin && isPlaying ? (
              <section className="card">
                <header className="card-header">
                  <h2 className="text-h4">Suggested Words</h2>
                  <span className="text-caption">
                    {(room.suggestedWords ?? []).length > 0
                      ? `${(room.suggestedWords ?? []).length} valid swap${(room.suggestedWords ?? []).length === 1 ? "" : "s"} found`
                      : "none available"}
                  </span>
                </header>
                {(room.suggestedWords ?? []).length > 0 ? (
                  <div className={cn("row", "row-wrap", "row-sm")}>
                    {(room.suggestedWords ?? []).map((word) => (
                      <span key={word} className="badge badge-brand text-mono">
                        {word}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-body-sm">
                    The AI Referee found no valid words left on this board.
                  </p>
                )}
              </section>
            ) : null}

            {/* Activity log (admin only) */}
            {amAdmin ? (
              <section className="card card-sunken">
                <header className="card-header">
                  <h2 className="text-h4">Activity</h2>
                  <span className="text-caption">
                    {room.usedWords.length} words this round
                  </span>
                </header>
                <div className="log">
                  {room.log.map((entry) => (
                    <div
                      key={entry.id}
                      className={cn("log-item", `log-item-kind-${entry.kind}`)}
                    >
                      {entry.text}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          {/* RIGHT: Leaderboard + my score */}
          <div className="game-col-right">
            {/* My score card (players only) */}
            {seatedPlayer && !amAdmin ? (
              <section className={cn("card", "my-score-card", isMyTurn && "is-my-turn")}>
                <header className="card-header">
                  <h2 className="text-h4">Your Score</h2>
                  <span className="badge badge-brand">
                    Rank #{rankings.get(seatedPlayer.id) ?? "-"}
                  </span>
                </header>
                <div className="my-score-value">{seatedPlayer.score}</div>
                <p className="text-caption center">
                  {hasAnswered
                    ? "Answer submitted — waiting for turn to end…"
                    : isMyTurn
                      ? "It's your turn — make a swap!"
                      : isPlaying
                        ? "Waiting for your turn…"
                        : "Waiting…"}
                </p>
              </section>
            ) : null}

            {/* Leaderboard */}
            <section className="card">
              <header className="card-header">
                <h2 className="text-h4">Leaderboard</h2>
                <span className="text-caption">
                  {standings.length} {standings.length === 1 ? "player" : "players"}
                </span>
              </header>
              <div className="stack stack-xs">
                {standings.map((player, index) => {
                  const rank = rankings.get(player.id) ?? index + 1;
                  const isMe = player.id === seatedPlayer?.id;
                  return (
                    <div
                      key={player.id}
                      className={cn("leaderboard-row", isMe && "is-me")}
                    >
                      <span className="standings-rank">#{rank}</span>
                      <Avatar name={player.name} imageUrl={player.avatarUrl} size="sm" />
                      <span className="player-name grow">
                        {player.name}
                        {isMe ? " (you)" : ""}
                      </span>
                      {/* Show score only for the current player */}
                      {isMe || amAdmin ? (
                        <span className="score-chip">{player.score}</span>
                      ) : (
                        <span className="score-chip score-chip-hidden">—</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Admin controls */}
            {amAdmin ? (
              <AdminPanel
                playing={room.phase === "playing"}
                wordsRemaining={wordsRemaining}
                scannedCount={scannedSwapCount(room.board)}
                round={room.round}
                totalRounds={room.totalRounds}
                suggestions={room.suggestedWords ?? []}
                players={room.players}
                onForceNextPlayer={() => runAction({ type: "forceNext" })}
                onNextRound={() => runAction({ type: "nextRound" })}
                onEndGame={() => runAction({ type: "endGame" })}
              />
            ) : null}
          </div>
        </div>

        <div className="row">
          <Link className={cn("btn", "btn-ghost")} href="/">
            ← Leave to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
