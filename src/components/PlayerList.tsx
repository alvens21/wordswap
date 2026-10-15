"use client";

import type { Player, Room } from "@/lib/types";
import { cn } from "@/lib/utils";
import Avatar from "@/components/Avatar";

interface PlayerListProps {
  room: Room;
  /** Shown when true: an Admin header row above the players. */
  showAdmin?: boolean;
}

/**
 * The list of players with live scores. The Admin is displayed as a
 * separate header row (they are not a player and have no score).
 */
export default function PlayerList({ room, showAdmin }: PlayerListProps) {
  return (
    <section className="card">
      <header className="card-header">
        <h2 className="text-h4">Players</h2>
        <span className="badge badge-neutral">
          {room.players.length} / {room.maxPlayers}
        </span>
      </header>
      <div className="stack stack-sm">
        {showAdmin ? (
          <div className="player-row">
            <Avatar name={room.adminName} imageUrl={room.adminAvatarUrl} size="sm" />
            <div className="stack stack-xs grow">
              <span className="player-name">{room.adminName}</span>
              <span className="text-caption">
                Admin · Room creator · does not play
              </span>
            </div>
            <span className="badge badge-warning">Admin</span>
          </div>
        ) : null}
        {room.players.map((player: Player, index: number) => {
          const isCurrent = room.phase === "playing" && index === room.turnIndex;
          return (
            <div
              key={player.id}
              className={cn("player-row", isCurrent && "is-current")}
            >
              <Avatar name={player.name} imageUrl={player.avatarUrl} size="sm" />
              <div className="stack stack-xs grow">
                <span className="player-name">{player.name}</span>
                <span className="text-caption">Seat {index + 1}</span>
              </div>
              {isCurrent ? (
                <span className="player-turn-arrow" aria-label="Current turn">
                  ▶ Turn
                </span>
              ) : null}
              <span className="score-chip" aria-label={`${player.name} score`}>
                {player.score}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
