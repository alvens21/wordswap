"use client";

import type { Room } from "@/lib/types";
import { cn } from "@/lib/utils";
import Avatar from "@/components/Avatar";

interface SeatClaimerProps {
  room: Room;
  onClaim: (playerId: string) => void;
}

/**
 * Shown when this browser has no identity in the room (fresh tab, reload
 * without session storage, or a spectator). Lets the user re-bind to the
 * Admin console, an existing player seat, or keep watching.
 */
export default function SeatClaimer({ room, onClaim }: SeatClaimerProps) {
  return (
    <section className="card">
      <header className="card-header">
        <h2 className="text-h4">Continue as…</h2>
        <span className="badge badge-neutral">Watching</span>
      </header>
      <p className="text-body-sm">
        This browser is not seated in the room yet. Continue as the Admin or
        pick a seat below to keep playing, or just watch the game.
      </p>
      <hr className="divider" />
      <div className="stack stack-sm">
        <div className="player-row">
          <Avatar name={room.adminName} imageUrl={room.adminAvatarUrl} size="sm" />
          <div className="stack stack-xs grow">
            <span className="player-name">{room.adminName}</span>
            <span className="text-caption">
              Admin · manages the game, does not play
            </span>
          </div>
          <button
            type="button"
            className={cn("btn", "btn-secondary", "btn-sm")}
            onClick={() => onClaim(room.adminId)}
          >
            Continue as Admin
          </button>
        </div>
        {room.players.map((player) => (
          <div key={player.id} className="player-row">
            <Avatar name={player.name} imageUrl={player.avatarUrl} size="sm" />
            <div className="stack stack-xs grow">
              <span className="player-name">{player.name}</span>
              <span className="text-caption">Score {player.score}</span>
            </div>
            <button
              type="button"
              className={cn("btn", "btn-secondary", "btn-sm")}
              onClick={() => onClaim(player.id)}
            >
              Sit here
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
