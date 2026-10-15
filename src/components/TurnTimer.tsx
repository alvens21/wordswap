"use client";

import { useEffect, useState } from "react";
import { TURN_DURATION_MS } from "@/lib/types";
import type { Room } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TurnTimerProps {
  room: Room;
}

/**
 * A circular countdown timer that shows the remaining seconds for the
 * current turn. Uses the server-authoritative `turnStartedAt` timestamp
 * and counts down locally for smooth animation.
 */
export default function TurnTimer({ room }: TurnTimerProps) {
  const [remaining, setRemaining] = useState(TURN_DURATION_MS);

  useEffect(() => {
    if (!room.turnStartedAt || room.phase !== "playing") {
      setRemaining(TURN_DURATION_MS);
      return;
    }

    const tick = () => {
      const elapsed = Date.now() - room.turnStartedAt!;
      setRemaining(Math.max(0, TURN_DURATION_MS - elapsed));
    };

    tick();
    const interval = setInterval(tick, 50);
    return () => clearInterval(interval);
  }, [room.turnStartedAt, room.phase]);

  const seconds = Math.ceil(remaining / 1000);
  const fraction = remaining / TURN_DURATION_MS;
  const isUrgent = seconds <= 2;
  const isExpired = remaining <= 0;

  return (
    <div className={cn("turn-timer", isUrgent && "is-urgent", isExpired && "is-expired")}>
      <div className="turn-timer-ring">
        <svg viewBox="0 0 100 100" className="turn-timer-svg">
          <circle
            className="turn-timer-track"
            cx="50"
            cy="50"
            r="44"
            fill="none"
            strokeWidth="6"
          />
          <circle
            className="turn-timer-progress"
            cx="50"
            cy="50"
            r="44"
            fill="none"
            strokeWidth="6"
            strokeDasharray={`${fraction * 276.5} 276.5`}
            strokeLinecap="round"
          />
        </svg>
        <span className="turn-timer-value">
          {isExpired ? "0" : seconds}
        </span>
      </div>
      <span className="turn-timer-label">
        {isExpired ? "Time's up!" : "seconds left"}
      </span>
    </div>
  );
}
