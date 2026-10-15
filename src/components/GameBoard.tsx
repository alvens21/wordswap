"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Room } from "@/lib/types";
import { cn, KEYBOARD_ROWS } from "@/lib/utils";

interface GameBoardProps {
  room: Room;
  onSubmitSwap: (position: number, letter: string) => void;
  /** When true, the board is locked (player already answered this turn). */
  disabled?: boolean;
}

/**
 * The 5 letter boxes + letter picker. The active player selects a box,
 * picks a replacement letter, and submits; the AI Referee validates.
 */
export default function GameBoard({ room, onSubmitSwap, disabled }: GameBoardProps) {
  const playing = room.phase === "playing" && !disabled;
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [pending, setPending] = useState<Record<number, string>>({});

  // A new turn (board changed / turn advanced / new round) resets the draft.
  useEffect(() => {
    setSelectedSlot(null);
    setPending({});
  }, [room.board, room.turnIndex, room.round]);

  const candidate = useMemo(() => {
    return room.board
      .split("")
      .map((letter, index) => pending[index] ?? letter)
      .join("");
  }, [room.board, pending]);

  const diffPositions = useMemo(() => {
    const positions: number[] = [];
    for (let i = 0; i < room.board.length; i += 1) {
      if (candidate[i] !== room.board[i]) positions.push(i);
    }
    return positions;
  }, [candidate, room.board]);

  const canSubmit = playing && diffPositions.length > 0;

  const setLetter = useCallback((letter: string) => {
    setPending((prev) => {
      if (selectedSlot === null) return prev;
      if (prev[selectedSlot] === letter) {
        const next = { ...prev };
        delete next[selectedSlot];
        return next;
      }
      return { ...prev, [selectedSlot]: letter };
    });
  }, [selectedSlot]);

  const clearSlot = useCallback((slot: number | null) => {
    setPending((prev) => {
      if (slot === null) return prev;
      const next = { ...prev };
      delete next[slot];
      return next;
    });
  }, []);

  const submit = useCallback(() => {
    if (!canSubmit || selectedSlot === null) return;
    onSubmitSwap(selectedSlot, candidate[selectedSlot]);
  }, [canSubmit, selectedSlot, candidate, onSubmitSwap]);

  // Physical keyboard: 1–5 selects a box, A–Z fills it, Enter submits.
  useEffect(() => {
    if (!playing) return;
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
      ) {
        return;
      }
      if (/^[a-zA-Z]$/.test(event.key)) {
        event.preventDefault();
        setLetter(event.key.toUpperCase());
        return;
      }
      if (/^[1-5]$/.test(event.key)) {
        event.preventDefault();
        setSelectedSlot(Number(event.key) - 1);
        return;
      }
      if (event.key === "Backspace") {
        event.preventDefault();
        if (selectedSlot !== null) {
          clearSlot(selectedSlot);
        } else {
          setPending({});
        }
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        submit();
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setPending({});
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [playing, selectedSlot, setLetter, clearSlot, submit]);

  return (
    <section className="card">
      <header className="card-header">
        <div className="stack stack-xs">
          <h2 className="text-h4">Game Board</h2>
          <span className="board-word">On board: {room.board}</span>
        </div>
        <span className="badge badge-brand text-mono">
          {room.swapsThisRound} swaps this round
        </span>
      </header>

      <div className="stack stack-lg">
        <div
          className="board"
          role="group"
          aria-label="Word board — select a letter box to replace"
        >
          {room.board.split("").map((letter, index) => {
            const shown = pending[index] ?? letter;
            const isPending = Boolean(pending[index]) && pending[index] !== letter;
            return (
              <button
                key={index}
                type="button"
                disabled={!playing}
                aria-label={`Letter box ${index + 1}: ${letter}${
                  isPending ? `, pending ${shown}` : ""
                }`}
                className={cn(
                  "letter-box",
                  selectedSlot === index && "is-active",
                  isPending && "is-pending"
                )}
                onClick={() =>
                  setSelectedSlot((prev) => (prev === index ? null : index))
                }
              >
                {shown}
              </button>
            );
          })}
        </div>

        <p className="board-word center" aria-live="polite">
          {candidate !== room.board ? `Candidate: ${candidate}` : "Select a box, then pick a letter"}
        </p>

        <div className="keyboard" role="group" aria-label="Letter picker">
          {KEYBOARD_ROWS.map((row) => (
            <div key={row} className="keyboard-row">
              {row.split("").map((letter) => (
                <button
                  key={letter}
                  type="button"
                  className="keyboard-key"
                  disabled={!playing || selectedSlot === null}
                  onClick={() => setLetter(letter)}
                >
                  {letter}
                </button>
              ))}
            </div>
          ))}
        </div>

        <div className="row row-md row-wrap">
          <button
            type="button"
            className={cn("btn", "btn-primary", "btn-lg", "grow")}
            disabled={!canSubmit}
            onClick={submit}
          >
            Play Word
          </button>
          <button
            type="button"
            className={cn("btn", "btn-secondary")}
            disabled={!playing || Object.keys(pending).length === 0}
            onClick={() => setPending({})}
          >
            Clear
          </button>
        </div>

        <p className="field-hint">
          Tip: use your keyboard — 1–5 selects a box, any letter fills it,
          Enter submits, Esc clears. Invalid words score 0 and pass the turn.
        </p>
      </div>
    </section>
  );
}
