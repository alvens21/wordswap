/**
 * WordSwap — Small shared helpers.
 */

/** Joins truthy class names — the only way components compose classes. */
export function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}

let counter = 0;

/** Cheap unique id generator (client-side only needs). */
export function uid(prefix = "id"): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

/** Replaces the character at `position` in `word` with `letter`. */
export function replaceAt(word: string, position: number, letter: string): string {
  return word.slice(0, position) + letter.toUpperCase() + word.slice(position + 1);
}

/** Uppercase A–Z letters. */
export const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/** Keyboard rows for the on-screen letter picker. */
export const KEYBOARD_ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];

/** Unambiguous character set for room codes. */
const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateRoomCode(length = 5): string {
  let code = "";
  for (let i = 0; i < length; i += 1) {
    code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
  }
  return code;
}

export function initialsOf(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0].toUpperCase()).join("");
}
