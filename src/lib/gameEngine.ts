/**
 * WordSwap — Game engine.
 *
 * Pure functions over the `Room` state object. No React, no DOM, no
 * persistence: the store layer (store.tsx) applies these transitions and
 * persists the result. Keeping transitions pure makes the rules easy to
 * test and lets the state be lifted to a realtime backend later without
 * touching the UI.
 *
 * GAME FLOW (simultaneous turns):
 *   1. beginRound picks a start word and opens turn 1 (turnStartedAt = now).
 *   2. All players submit answers simultaneously via submitAnswer().
 *   3. When the 10-second timer expires the server calls closeTurn(), which
 *      awards timer-based points (10-9-8-…-1), updates the board to the
 *      first correct answer, and either opens the next turn or advances
 *      to the next round.
 */

import {
  DEFAULT_ROUNDS,
  MAX_PLAYERS,
  MIN_PLAYERS,
  TURN_DURATION_MS,
  TURNS_PER_ROUND,
} from "./types";
import type {
  LogKind,
  Player,
  Room,
  SwapResult,
  TurnSubmission,
} from "./types";
import { hasAvailableSwaps, validateSwap } from "./aiValidator";
import { randomWord } from "./dictionary";
import { generateRoomCode, replaceAt, uid } from "./utils";

const MAX_LOG_ENTRIES = 40;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function pushLog(room: Room, kind: LogKind, text: string): LogEntry[] {
  const entry = { id: uid("log"), kind, text };
  return [entry, ...room.log].slice(0, MAX_LOG_ENTRIES);
}

import type { LogEntry } from "./types";

export function currentTurnPlayer(room: Room): Player | null {
  return room.players[room.turnIndex] ?? null;
}

export function getStandings(players: Player[]): Player[] {
  return [...players].sort(
    (a, b) => b.score - a.score || a.name.localeCompare(b.name)
  );
}

/**
 * Returns the ranking (1-based) of each player. Players with the same
 * score share the same rank; the next rank skips accordingly.
 */
export function getRankings(players: Player[]): Map<string, number> {
  const sorted = getStandings(players);
  const map = new Map<string, number>();
  sorted.forEach((p, i) => {
    if (i === 0 || p.score < sorted[i - 1].score) {
      map.set(p.id, i + 1);
    } else {
      map.set(p.id, map.get(sorted[i - 1].id)!);
    }
  });
  return map;
}

export function getWinners(room: Room): Player[] {
  const standings = getStandings(room.players);
  if (standings.length === 0) return [];
  const top = standings[0].score;
  return standings.filter((p) => p.score === top);
}

/** Whether the current turn's timer has expired. */
export function isTurnExpired(room: Room, now: number = Date.now()): boolean {
  if (!room.turnStartedAt) return false;
  return now - room.turnStartedAt >= TURN_DURATION_MS;
}

/** Milliseconds remaining in the current turn. */
export function turnTimeRemaining(room: Room, now: number = Date.now()): number {
  if (!room.turnStartedAt) return TURN_DURATION_MS;
  return Math.max(0, TURN_DURATION_MS - (now - room.turnStartedAt));
}

/* ------------------------------------------------------------------ */
/* Room lifecycle                                                      */
/* ------------------------------------------------------------------ */

export function createRoom(
  name: string,
  adminName: string,
  totalRounds: number = DEFAULT_ROUNDS,
  adminAvatarUrl?: string
): Room {
  const admin = adminName.trim() || "Admin";
  return {
    id: generateRoomCode(),
    name: name.trim() || `${admin}'s Room`,
    adminId: uid("admin"),
    adminName: admin,
    adminAvatarUrl,
    maxPlayers: MAX_PLAYERS,
    totalRounds,
    phase: "lobby",
    players: [],
    turnIndex: 0,
    round: 0,
    board: "",
    usedWords: [],
    pastWords: [],
    swapsThisRound: 0,
    lastResult: null,
    log: [
      {
        id: uid("log"),
        kind: "info",
        text: `Room created by ${admin} (Admin).`,
      },
    ],
    createdAt: Date.now(),
  };
}

export type AddPlayerResult =
  | { ok: true; room: Room; playerId: string }
  | { ok: false; error: string };

export function addPlayer(
  room: Room,
  rawName: string,
  avatarUrl?: string
): AddPlayerResult {
  const name = rawName.trim();
  if (!name) return { ok: false, error: "Please enter a player name." };
  if (room.phase !== "lobby") {
    return { ok: false, error: "Players can only join while in the lobby." };
  }
  if (room.players.length >= room.maxPlayers) {
    return {
      ok: false,
      error: `This room is full (max ${room.maxPlayers} players).`,
    };
  }
  const taken =
    room.players.some(
      (p) => p.name.toLowerCase() === name.toLowerCase()
    ) || room.adminName.toLowerCase() === name.toLowerCase();
  if (taken) return { ok: false, error: `"${name}" is already taken.` };

  const player: Player = { id: uid("player"), name, score: 0, avatarUrl };
  return {
    ok: true,
    playerId: player.id,
    room: {
      ...room,
      players: [...room.players, player],
      log: pushLog(room, "info", `${name} joined the room.`),
    },
  };
}

/** Admin-only: remove a player (lobby phase only). */
export function removePlayer(room: Room, playerId: string): Room {
  if (room.phase !== "lobby") return room;
  const player = room.players.find((p) => p.id === playerId);
  if (!player) return room;
  return {
    ...room,
    players: room.players.filter((p) => p.id !== playerId),
    log: pushLog(room, "info", `${player.name} was removed by the Admin.`),
  };
}

/* ------------------------------------------------------------------ */
/* Round & turn flow                                                   */
/* ------------------------------------------------------------------ */

function pickStartWord(pastWords: string[]): string {
  for (let tries = 0; tries < 60; tries += 1) {
    const word = randomWord(pastWords);
    if (hasAvailableSwaps(word, [word])) return word;
  }
  return randomWord(pastWords);
}

/** Opens a new turn within a round (or the first turn of a new round). */
function openTurn(room: Room, board: string, turnNumber: number, now: number): Room {
  const playerCount = Math.max(room.players.length, 1);
  const startIndex = (room.round - 1) % playerCount;
  const turnIndex = (startIndex + turnNumber - 1) % playerCount;
  return {
    ...room,
    board,
    turnStartedAt: now,
    turnSubmissions: [],
    answeredPlayerIds: [],
    turnNumber,
    turnIndex,
    lastResult: null,
  };
}

function beginRound(room: Room, round: number, note: string, now: number): Room {
  const board = pickStartWord(room.pastWords);
  const startIndex = (round - 1) % Math.max(room.players.length, 1);
  const leader = room.players[startIndex];
  const base: Room = {
    ...room,
    phase: "playing",
    round,
    usedWords: [board],
    pastWords: [...room.pastWords, board],
    swapsThisRound: 0,
    log: pushLog(
      { ...room, log: [] },
      "round",
      leader
        ? `${note} Round ${round} starts with "${board}" — ${leader.name} leads.`
        : `${note} Round ${round} starts with "${board}".`
    ),
  };
  return openTurn(base, board, 1, now);
}

export type StartGameResult =
  | { ok: true; room: Room }
  | { ok: false; error: string };

export function startGame(room: Room, now: number = Date.now()): StartGameResult {
  if (room.phase !== "lobby") return { ok: false, error: "Game already started." };
  if (room.players.length < MIN_PLAYERS) {
    return {
      ok: false,
      error: `You need at least ${MIN_PLAYERS} players to start.`,
    };
  }
  return { ok: true, room: beginRound(room, 1, "Game started!", now) };
}

/* ------------------------------------------------------------------ */
/* Simultaneous answer submission                                      */
/* ------------------------------------------------------------------ */

export type AnswerResult =
  | { ok: true; room: Room; submission: TurnSubmission }
  | { ok: false; error: string; result?: SwapResult };

/**
 * Records a player's answer during the current simultaneous turn.
 * The player must not have already answered this turn, and the turn
 * must still be within its 10-second window.
 */
export function submitAnswer(
  room: Room,
  playerId: string,
  position: number,
  letter: string,
  now: number = Date.now()
): AnswerResult {
  if (room.phase !== "playing") {
    return { ok: false, error: "The game is not running." };
  }
  if (!room.turnStartedAt || !room.board) {
    return { ok: false, error: "No active turn." };
  }

  // Timer check.
  if (now - room.turnStartedAt >= TURN_DURATION_MS) {
    return { ok: false, error: "Time is up for this turn." };
  }

  // Player must be seated.
  const player = room.players.find((p) => p.id === playerId);
  if (!player) {
    return { ok: false, error: "You are not seated in this room." };
  }

  // Player must not have already answered.
  const answered = room.answeredPlayerIds ?? [];
  if (answered.includes(playerId)) {
    return { ok: false, error: "You have already answered this turn." };
  }

  // Validate format.
  const index = Number(position);
  const newLetter = letter.trim().toUpperCase();
  if (
    Number.isNaN(index) ||
    index < 0 ||
    index >= room.board.length ||
    !/^[A-Z]$/.test(newLetter)
  ) {
    return {
      ok: false,
      error: "Pick a letter box and a letter A–Z.",
      result: {
        valid: false,
        code: "FORMAT_ERROR",
        playerName: player.name,
        original: room.board,
        candidate: "",
        message: "AI Referee: pick a letter box and a letter A–Z.",
      },
    };
  }

  const candidate = replaceAt(room.board, index, newLetter);
  const validation = validateSwap({
    original: room.board,
    candidate,
    usedWords: room.usedWords,
  });

  const responseTime = now - room.turnStartedAt;

  // Hard blocks (format / no change) — don't consume the answer slot.
  const hardBlock =
    validation.code === "FORMAT_ERROR" ||
    validation.code === "NOT_A_CHANGE" ||
    validation.code === "NOT_EXACTLY_ONE_CHANGE";

  if (hardBlock) {
    return {
      ok: false,
      error: validation.message,
      result: {
        valid: false,
        code: validation.code,
        playerName: player.name,
        original: room.board,
        candidate,
        message: validation.message,
      },
    };
  }

  // Record the submission (valid or invalid — both consume the answer slot).
  const submission: TurnSubmission = {
    playerId,
    candidate,
    position: index,
    letter: newLetter,
    valid: validation.valid,
    points: 0, // Points assigned later in closeTurn.
    responseTime,
  };

  const submissions = [...(room.turnSubmissions ?? []), submission];
  const newAnswered = [...answered, playerId];

  const logKind: LogKind = validation.valid ? "swap" : "invalid";
  const logText = validation.valid
    ? `${player.name}: ${candidate} (${responseTime}ms)`
    : `${player.name}: ${candidate} — rejected (${responseTime}ms)`;

  const swapResult: SwapResult = {
    valid: validation.valid,
    code: validation.code,
    playerName: player.name,
    original: room.board,
    candidate,
    message: validation.message,
    suggestions: validation.suggestions,
  };

  return {
    ok: true,
    submission,
    room: {
      ...room,
      turnSubmissions: submissions,
      answeredPlayerIds: newAnswered,
      lastResult: swapResult,
      log: pushLog(room, logKind, logText),
    },
  };
}

/* ------------------------------------------------------------------ */
/* Turn close — called by the server when the timer expires            */
/* ------------------------------------------------------------------ */

/**
 * Finalises the current turn: awards speed-based points, updates the
 * board to the first correct answer, and either opens the next turn
 * or advances to the next round / ends the game.
 */
export function closeTurn(room: Room, now: number = Date.now()): Room {
  if (room.phase !== "playing") return room;
  if (!room.turnStartedAt) return room;

  const submissions = room.turnSubmissions ?? [];

  // Separate correct answers, ordered by response time (fastest first).
  const correct = submissions
    .filter((s) => s.valid)
    .sort((a, b) => a.responseTime - b.responseTime);

  // Deduplicate: if two players submitted the same word, only the
  // faster one counts; the duplicate is marked invalid.
  const seenWords = new Set<string>(room.usedWords);
  const uniqueCorrect: TurnSubmission[] = [];
  const adjustedSubmissions = submissions.map((s) => {
    if (!s.valid) return s;
    if (seenWords.has(s.candidate)) {
      // Duplicate word — no points.
      return { ...s, valid: false, points: 0 };
    }
    seenWords.add(s.candidate);
    uniqueCorrect.push(s);
    return s;
  });

  // Award timer-based points to unique correct answers.
  // Points = seconds remaining on the countdown timer when submitted.
  const pointUpdates = new Map<string, number>();
  uniqueCorrect.forEach((s) => {
    const remaining = TURN_DURATION_MS - s.responseTime;
    const pts = Math.max(0, Math.ceil(remaining / 1000));
    if (pts > 0) {
      pointUpdates.set(s.playerId, (pointUpdates.get(s.playerId) ?? 0) + pts);
    }
  });

  // Apply points to players.
  const updatedPlayers = room.players.map((p) => {
    const bonus = pointUpdates.get(p.id) ?? 0;
    return bonus > 0 ? { ...p, score: p.score + bonus } : p;
  });

  // The board advances to the first correct answer (if any).
  let firstCorrect = uniqueCorrect.length > 0 ? uniqueCorrect[0].candidate : room.board;
  let newUsedWords =
    firstCorrect !== room.board
      ? [...room.usedWords, firstCorrect]
      : room.usedWords;

  // If the board has no available swaps, replace it with a fresh word
  // so players always have a playable board within the round.
  if (!hasAvailableSwaps(firstCorrect, newUsedWords)) {
    const excludeSet = new Set([...room.pastWords, ...newUsedWords]);
    let freshWord = "";
    for (let tries = 0; tries < 60; tries += 1) {
      const candidate = randomWord(room.pastWords);
      if (!excludeSet.has(candidate) && hasAvailableSwaps(candidate, [candidate])) {
        freshWord = candidate;
        break;
      }
    }
    if (freshWord) {
      firstCorrect = freshWord;
      newUsedWords = [...newUsedWords, freshWord];
    }
  }

  // Log the turn results.
  const summaryParts = uniqueCorrect.map((s) => {
    const remaining = TURN_DURATION_MS - s.responseTime;
    const pts = Math.max(0, Math.ceil(remaining / 1000));
    const pName = room.players.find((p) => p.id === s.playerId)?.name ?? "?";
    return `${pName} → ${s.candidate} (+${pts})`;
  });
  const summary =
    summaryParts.length > 0
      ? `Turn ${room.turnNumber ?? 1}: ${summaryParts.join(", ")}`
      : `Turn ${room.turnNumber ?? 1}: no correct answers`;

  let nextRoom: Room = {
    ...room,
    players: updatedPlayers,
    board: firstCorrect,
    usedWords: newUsedWords,
    swapsThisRound: room.swapsThisRound + uniqueCorrect.length,
    log: pushLog(room, "round", summary),
  };

  // Decide: next turn or next round?
  const currentTurnNum = room.turnNumber ?? 1;
  if (currentTurnNum >= TURNS_PER_ROUND) {
    // Round is over.
    if (room.round >= room.totalRounds) {
      return endGame(nextRoom);
    }
    return beginRound(
      nextRoom,
      nextRoom.round + 1,
      `Round ${room.round} finished.`,
      now
    );
  }

  // Open the next turn within the same round.
  return openTurn(nextRoom, firstCorrect, currentTurnNum + 1, now);
}

/* ------------------------------------------------------------------ */
/* Admin actions                                                       */
/* ------------------------------------------------------------------ */

/** Admin action: skip the current turn (close it immediately). */
export function forceNextPlayer(room: Room, now: number = Date.now()): Room {
  if (room.phase !== "playing") return room;
  return closeTurn(
    {
      ...room,
      log: pushLog(room, "skip", "Admin skipped the current turn."),
    },
    now
  );
}

/**
 * Admin action: start the next round, or finish the game when the final
 * round is complete.
 */
export function nextRound(room: Room, now: number = Date.now()): Room {
  if (room.phase !== "playing") return room;
  if (room.round >= room.totalRounds) {
    return endGame(room);
  }
  return beginRound(
    room,
    room.round + 1,
    `Previous round finished with "${room.board}".`,
    now
  );
}

/** Admin action: end the game immediately. */
export function endGame(room: Room): Room {
  if (room.phase === "gameEnd") return room;
  const winners = getWinners(room);
  const winnerNames =
    winners.length === 1
      ? `${winners[0].name} wins`
      : `Tie between ${winners.map((w) => w.name).join(", ")}`;
  return {
    ...room,
    phase: "gameEnd",
    lastResult: null,
    turnStartedAt: undefined,
    turnSubmissions: undefined,
    answeredPlayerIds: undefined,
    log: pushLog(room, "round", `Game over — ${winnerNames} with the top score!`),
  };
}

/** Restarts with the same room, players and settings; scores reset. */
export function resetToLobby(room: Room): Room {
  return {
    ...room,
    phase: "lobby",
    round: 0,
    board: "",
    usedWords: [],
    pastWords: [],
    swapsThisRound: 0,
    lastResult: null,
    turnIndex: 0,
    turnStartedAt: undefined,
    turnSubmissions: undefined,
    answeredPlayerIds: undefined,
    turnNumber: undefined,
    players: room.players.map((p) => ({ ...p, score: 0 })),
    log: pushLog(room, "info", "Admin started a new game — back to the lobby."),
  };
}

/** Convenience re-export so UI code has one engine entry point. */
export { hasAvailableSwaps };
