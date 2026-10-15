/**
 * WordSwap — AI Referee online fallback.
 *
 * The offline curated dictionary is intentionally small (fast + dependency
 * free), which means genuinely valid words can be missing from it. When a
 * swap candidate is not in the offline set, the referee consults free
 * online word sources — in order:
 *
 *   1. dictionaryapi.dev  (curated dictionary definitions)
 *   2. Wiktionary REST    (curated, community-maintained dictionary)
 *   3. Datamuse API       (large statistical word vocabulary)
 *
 * The chain stops at the first definitive verdict:
 *
 *   - verified online  → the word is LEARNED into the runtime word set
 *                        (addWord), so this and every future check accepts it
 *   - rejected online  → negatively cached so we never re-query it
 *   - every source unreachable → inconclusive; the offline verdict stands
 *                        and the word is neither learned nor cached
 *
 * Only the server imports this module. Lookups are de-duplicated, capped
 * by short timeouts, and cached on globalThis so they survive dev hot
 * reloads.
 */

import { addWord, isDictionaryWord } from "./dictionary";

const LOOKUP_TIMEOUT_MS = 3500;

interface VerifierCaches {
  verified: Set<string>;
  rejected: Set<string>;
  pending: Map<string, Promise<boolean | null>>;
}

const globalRef = globalThis as unknown as {
  __wordswapVerifier?: VerifierCaches;
};

function caches(): VerifierCaches {
  if (!globalRef.__wordswapVerifier) {
    globalRef.__wordswapVerifier = {
      verified: new Set(),
      rejected: new Set(),
      pending: new Map(),
    };
  }
  return globalRef.__wordswapVerifier;
}

/** Fetch JSON with a hard timeout. Returns null when the source is unreachable. */
async function fetchJson(url: string, headers?: Record<string, string>): Promise<{ status: number; body: unknown } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);
    const res = await fetch(url, { signal: controller.signal, headers });
    clearTimeout(timeout);
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    return { status: res.status, body };
  } catch {
    return null;
  }
}

/** Source 1: dictionaryapi.dev — definitive true/false, null when down. */
async function tryDictionaryApi(word: string): Promise<boolean | null> {
  const res = await fetchJson(
    `https://api.dictionaryapi.dev/api/v2/entries/en/${word.toLowerCase()}`
  );
  if (!res) return null;
  if (res.status === 404) return false;
  if (res.status === 200 && Array.isArray(res.body)) return res.body.length > 0;
  return null;
}

/** Source 2: Wiktionary REST — definitive true/false, null when unreachable. */
async function tryWiktionary(word: string): Promise<boolean | null> {
  const res = await fetchJson(
    `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(word.toLowerCase())}`,
    { "User-Agent": "WordSwap-AI-Referee/1.0 (word game validator)" }
  );
  if (!res) return null;
  if (res.status === 200) return true;
  if (res.status === 404) return false;
  return null;
}

/** Source 3: Datamuse — true on an exact-spelling hit; inconclusive on a miss. */
async function tryDatamuse(word: string): Promise<boolean | null> {
  const res = await fetchJson(
    `https://api.datamuse.com/words?sp=${encodeURIComponent(word.toLowerCase())}&max=5`
  );
  if (!res || res.status !== 200 || !Array.isArray(res.body)) return null;
  const hit = res.body.some(
    (entry) =>
      typeof entry === "object" &&
      entry !== null &&
      (entry as { word?: unknown }).word === word.toLowerCase()
  );
  return hit ? true : null;
}

async function queryOnline(word: string): Promise<boolean | null> {
  const verdict = await tryDictionaryApi(word);
  if (verdict !== null) return verdict;

  const wiktionary = await tryWiktionary(word);
  if (wiktionary !== null) return wiktionary;

  return tryDatamuse(word);
}

/**
 * Makes sure the referee knows `word` if it is a real English word:
 * checks the offline set first, then the online fallback chain. After
 * this resolves, `isDictionaryWord` reflects the final verdict.
 *
 * Resolves to the verdict: true (verified), false (rejected), or
 * null (inconclusive — no network, timeouts, or API issues).
 */
export async function ensureWordKnown(rawWord: string): Promise<boolean | null> {
  const word = rawWord.toUpperCase();
  if (!/^[A-Z]{5}$/.test(word)) return false;

  if (isDictionaryWord(word)) return true;

  const cache = caches();
  if (cache.verified.has(word)) return true;
  if (cache.rejected.has(word)) return false;

  const inFlight = cache.pending.get(word);
  if (inFlight) return inFlight;

  const task = (async () => {
    try {
      const verdict = await queryOnline(word);
      if (verdict === true) {
        addWord(word);
        cache.verified.add(word);
      } else if (verdict === false) {
        cache.rejected.add(word);
      }
      return verdict;
    } finally {
      cache.pending.delete(word);
    }
  })();

  cache.pending.set(word, task);
  return task;
}
