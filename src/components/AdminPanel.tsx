"use client";

import { useEffect, useState } from "react";
import type { Player } from "@/lib/types";
import { getStandings } from "@/lib/gameEngine";
import { cn, initialsOf } from "@/lib/utils";

interface AdminPanelProps {
  playing: boolean;
  wordsRemaining: boolean;
  scannedCount: number;
  round: number;
  totalRounds: number;
  /** Server-computed valid swap candidates for the current board. */
  suggestions: string[];
  players: Player[];
  onForceNextPlayer: () => void;
  onNextRound: () => void;
  onEndGame: () => void;
}

/**
 * The Admin console. The Admin does not play — this panel is their whole
 * game view: word suggestions from the AI Referee, game controls, and
 * the live leaderboard.
 */
export default function AdminPanel({
  playing,
  wordsRemaining,
  scannedCount,
  round,
  totalRounds,
  suggestions,
  players,
  onForceNextPlayer,
  onNextRound,
  onEndGame,
}: AdminPanelProps) {
  const [confirmingRound, setConfirmingRound] = useState(false);

  // Reset the confirm state whenever the round changes.
  useEffect(() => {
    setConfirmingRound(false);
  }, [round]);

  const isFinalRound = round >= totalRounds;
  const exhausted = playing && !wordsRemaining;
  const standings = getStandings(players);
  const topScore = standings.length > 0 ? standings[0].score : 0;

  const requestNextRound = () => {
    if (wordsRemaining && !confirmingRound) {
      setConfirmingRound(true);
      return;
    }
    setConfirmingRound(false);
    onNextRound();
  };

  return (
    <section className={cn("card", "admin-panel")}>
      <header className="card-header">
        <h2 className="text-h4">Admin Console</h2>
        <span className="badge badge-warning">Admin</span>
      </header>

      {exhausted ? (
        <div className={cn("feedback", "feedback-warning", "animate-enter")}>
          <span className="feedback-icon" aria-hidden="true">🤖</span>
          <div className="stack stack-xs">
            <span className="text-label">AI Referee: board exhausted</span>
            <span className="text-body-sm">
              Scanned {scannedCount} possible swaps — no valid words remain.
              You can start the next round.
            </span>
          </div>
        </div>
      ) : null}

      {/* Word suggestions moved to the center column in page.tsx (admin only) */}

      <div className="stack stack-sm">
        <button
          type="button"
          className={cn("btn", "btn-secondary", "btn-block")}
          disabled={!playing}
          onClick={onForceNextPlayer}
        >
          Force Next Player
        </button>

        {confirmingRound ? (
          <div className="stack stack-sm">
            <p className="field-hint">
              Valid words are still possible. Skip to the next round anyway?
            </p>
            <div className="row row-sm">
              <button
                type="button"
                className={cn("btn", "btn-danger", "grow")}
                onClick={requestNextRound}
              >
                {isFinalRound ? "End Game Now" : "Confirm Next Round"}
              </button>
              <button
                type="button"
                className={cn("btn", "btn-secondary")}
                onClick={() => setConfirmingRound(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className={cn(
              "btn",
              exhausted ? "btn-primary" : "btn-secondary",
              "btn-block"
            )}
            disabled={!playing}
            onClick={requestNextRound}
          >
            {isFinalRound ? "Finish Game" : "Next Round"}
          </button>
        )}

        <button
          type="button"
          className={cn("btn", "btn-danger-soft", "btn-block")}
          disabled={!playing}
          onClick={onEndGame}
        >
          End Game
        </button>
      </div>

      <p className="field-hint">
        Round {round} of {totalRounds}. You are the Admin — you manage the
        game and monitor the players without participating.
      </p>

      <hr className="divider" />

      <div className="stack stack-sm">
        <header className="card-header">
          <h3 className="text-label">Leaderboard</h3>
          <span className="text-caption">
            {standings.length} {standings.length === 1 ? "player" : "players"}
          </span>
        </header>
        {standings.length === 0 ? (
          <p className="text-body-sm">No players have joined yet.</p>
        ) : (
          <div className="stack stack-xs">
            {standings.map((player, index) => {
              const isWinner = player.score === topScore && topScore > 0;
              return (
                <div
                  key={player.id}
                  className={cn("standings-row", isWinner && "is-winner")}
                >
                  <span className="standings-rank">#{index + 1}</span>
                  <span className={cn("avatar", "avatar-sm")} aria-hidden="true">
                    {initialsOf(player.name)}
                  </span>
                  <span className="player-name grow">{player.name}</span>
                  <span className="score-chip">{player.score}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
