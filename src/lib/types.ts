/**
 * WordSwap — Shared domain types & game constants.
 * Single source of truth for the whole application.
 */

/** Maximum players allowed in a single room. */
export const MAX_PLAYERS = 20;

/** Minimum players required to start a game. */
export const MIN_PLAYERS = 2;

/** Length of the board word (number of letter boxes). */
export const WORD_LENGTH = 5;

/** Duration of each turn in milliseconds. */
export const TURN_DURATION_MS = 10_000;

/**
 * Scoring: each correct answer earns points equal to the seconds
 * remaining on the countdown timer when submitted.
 * Timer shows 10 → 10 pts, 9 → 9 pts, … 1 → 1 pt, 0 → 0 pts.
 */

/** Maximum turns per round before the round auto-advances. */
export const TURNS_PER_ROUND = 10;

/** Default number of rounds for a new room. */
export const DEFAULT_ROUNDS = 3;

/** Minimum / maximum configurable rounds. */
export const MIN_ROUNDS = 1;
export const MAX_ROUNDS = 10;

export interface Player {
  id: string;
  name: string;
  score: number;
  /** Optional base64 data URL for the player's profile image. */
  avatarUrl?: string;
}

export type Phase = "lobby" | "playing" | "gameEnd";

export type LogKind = "swap" | "invalid" | "skip" | "round" | "info";

export interface LogEntry {
  id: string;
  kind: LogKind;
  text: string;
}

export type ValidationCode =
  | "OK"
  | "NOT_A_CHANGE"
  | "NOT_EXACTLY_ONE_CHANGE"
  | "USED_THIS_ROUND"
  | "NOT_IN_DICTIONARY"
  | "FORMAT_ERROR";

export interface SwapValidation {
  valid: boolean;
  code: ValidationCode;
  /** Human-readable AI referee message. */
  message: string;
  /** Suggestions for near-miss words (NOT_IN_DICTIONARY only). */
  suggestions?: string[];
}

export interface SwapResult {
  valid: boolean;
  code: ValidationCode;
  playerName: string;
  original: string;
  candidate: string;
  message: string;
  suggestions?: string[];
}

/** A single player's answer during a simultaneous turn. */
export interface TurnSubmission {
  playerId: string;
  candidate: string;
  position: number;
  letter: string;
  valid: boolean;
  points: number;
  /** ms from turn start to submission */
  responseTime: number;
}

export interface Room {
  id: string;
  name: string;
  /** The room creator — manages and monitors the game but does NOT play. */
  adminId: string;
  adminName: string;
  /** Optional base64 data URL for the Admin's profile image. */
  adminAvatarUrl?: string;
  maxPlayers: number;
  totalRounds: number;
  phase: Phase;
  players: Player[];
  /** Index into `players` whose turn it is (legacy, kept for compatibility). */
  turnIndex: number;
  /** 1-based round number. */
  round: number;
  /** Current board word, e.g. "FOODS". */
  board: string;
  /** All words played on the board in the current round (board included). */
  usedWords: string[];
  /** Every board word used in the game (start words of past rounds). */
  pastWords: string[];
  swapsThisRound: number;
  lastResult: SwapResult | null;
  log: LogEntry[];
  createdAt: number;

  /* ---- Simultaneous turn fields ---- */

  /** Server timestamp (Date.now()) when the current turn started. */
  turnStartedAt?: number;
  /** All submissions received during the current turn. */
  turnSubmissions?: TurnSubmission[];
  /** Player IDs who have already answered this turn. */
  answeredPlayerIds?: string[];
  /** Sequential turn counter within the current round. */
  turnNumber?: number;

  /**
   * Server-computed: whether any valid swap exists on the current board.
   * Set by the server room registry after every playing-phase mutation.
   */
  wordsRemaining?: boolean;
  /**
   * Server-computed: up to 12 valid swap candidates for the current
   * board (Admin's word suggestion panel).
   */
  suggestedWords?: string[];
}

/* ------------------------------------------------------------------ */
/* Client → server room actions (see /api/rooms/[roomId]/action)       */
/* ------------------------------------------------------------------ */

export type RoomActionType =
  | "start"
  | "swap"
  | "answer"
  | "forceNext"
  | "nextRound"
  | "endGame"
  | "kick"
  | "reset";

export interface RoomActionRequest {
  type: RoomActionType;
  /** swap/answer: which letter box to replace. */
  position?: number;
  /** swap/answer: the new letter A–Z. */
  letter?: string;
  /** kick: which player to remove (lobby only). */
  targetPlayerId?: string;
}
