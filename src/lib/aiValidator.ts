/**
 * WordSwap — AI Referee.
 *
 * Validates letter swaps and detects when the board is exhausted. The
 * "AI Referee" runs fully offline: it combines the curated dictionary
 * with word-distance analysis (Levenshtein) to produce verdicts and
 * suggestions. To plug in a real LLM/dictionary API later, only this
 * module needs to change — every consumer depends on `validateSwap`
 * and `hasAvailableSwaps` only.
 */

import { WORD_LENGTH } from "./types";
import type { SwapValidation, ValidationCode } from "./types";
import { isDictionaryWord, WORD_LIST } from "./dictionary";
import { ALPHABET, replaceAt } from "./utils";

/** Levenshtein edit distance for short words (fine for length 5). */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > 1) return 2;
  const prev = new Array<number>(n + 1);
  const curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j += 1) prev[j] = j;
  for (let i = 1; i <= m; i += 1) {
    curr[0] = i;
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= n; j += 1) prev[j] = curr[j];
  }
  return prev[n];
}

/** Dictionary words within edit distance 1 of `word` (did-you-mean). */
export function findSuggestions(word: string, limit = 3): string[] {
  const target = word.toUpperCase();
  if (!/^[A-Z]+$/.test(target)) return [];
  const matches: string[] = [];
  for (const entry of WORD_LIST) {
    if (entry === target) continue;
    if (levenshtein(target, entry) <= 1) {
      matches.push(entry);
      if (matches.length >= limit) break;
    }
  }
  return matches;
}

function formatError(candidate: string): SwapValidation {
  return {
    valid: false,
    code: "FORMAT_ERROR",
    message: `AI Referee: "${candidate || "?"}" is not a ${WORD_LENGTH}-letter word. Pick exactly ${WORD_LENGTH} letters A–Z.`,
  };
}

/**
 * Validates a candidate word produced by swapping letters on the board.
 *
 * Hard rules (turn is NOT consumed, UI blocks):
 *  - FORMAT_ERROR          candidate is not the right shape
 *  - NOT_A_CHANGE          candidate equals the current board word
 *  - NOT_EXACTLY_ONE_CHANGE more/less than exactly one letter was replaced
 * Penalty rules (turn IS consumed, 0 points):
 *  - NOT_IN_DICTIONARY     not a real word
 *  - USED_THIS_ROUND       already played in this round
 */
export function validateSwap(args: {
  original: string;
  candidate: string;
  usedWords: string[];
}): SwapValidation {
  const { original, usedWords } = args;
  const candidate = args.candidate.toUpperCase();

  if (!/^[A-Z]{5}$/.test(candidate)) return formatError(candidate);
  if (candidate === original.toUpperCase()) {
    return {
      valid: false,
      code: "NOT_A_CHANGE",
      message: `AI Referee: "${candidate}" is the word already on the board. Replace one letter with a NEW letter.`,
    };
  }

  let diffCount = 0;
  for (let i = 0; i < WORD_LENGTH; i += 1) {
    if (candidate[i] !== original[i].toUpperCase()) diffCount += 1;
  }
  if (diffCount !== 1) {
    return {
      valid: false,
      code: "NOT_EXACTLY_ONE_CHANGE",
      message: `AI Referee: you changed ${diffCount} letters. Swap exactly ONE letter per turn.`,
    };
  }

  if (usedWords.map((w) => w.toUpperCase()).includes(candidate)) {
    return {
      valid: false,
      code: "USED_THIS_ROUND",
      message: `AI Referee: "${candidate}" was already played this round. Words cannot repeat within a round.`,
    };
  }

  if (!isDictionaryWord(candidate)) {
    const suggestions = findSuggestions(candidate);
    const hint =
      suggestions.length > 0
        ? ` Did you mean ${suggestions.map((s) => `"${s}"`).join(" or ")}?`
        : "";
    return {
      valid: false,
      code: "NOT_IN_DICTIONARY",
      message: `AI Referee: "${candidate}" is not a valid English word.${hint}`,
      suggestions,
    };
  }

  return {
    valid: true,
    code: "OK",
    message: `AI Referee: verified "${candidate}" is a valid English word. Accepted!`,
  };
}

/**
 * Every valid word one letter away from `board` that has not been used
 * in the current round yet. The AI Referee uses this to declare the
 * board exhausted.
 */
export function listAvailableSwaps(board: string, usedWords: string[]): string[] {
  const used = new Set(usedWords.map((w) => w.toUpperCase()));
  const results = new Set<string>();
  for (let position = 0; position < board.length; position += 1) {
    for (const letter of ALPHABET) {
      if (letter === board[position]) continue;
      const candidate = replaceAt(board, position, letter);
      if (!used.has(candidate) && isDictionaryWord(candidate)) {
        results.add(candidate);
      }
    }
  }
  return Array.from(results).sort();
}

export function hasAvailableSwaps(board: string, usedWords: string[]): boolean {
  return listAvailableSwaps(board, usedWords).length > 0;
}

/** Total swap candidates the AI Referee scans for the exhaustion check. */
export function scannedSwapCount(board: string): number {
  return board.length * 26;
}

export type { ValidationCode };
