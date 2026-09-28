/**
 * Aho-Corasick multi-pattern automaton.
 *
 * Scans text in O(n + z) where n = input length, z = number of matches —
 * scan time is independent of dictionary size, so adding languages
 * or thousands of custom words costs nothing at query time.
 *
 * Extension over the classic algorithm: elongated words (`fuuuuck`)
 * are caught by repeat-tolerant stepping. When the current char equals
 * the previous one we prefer a real transition (preserves doubles like
 * `ass`); only if none exists do we stay in place (skips the elongation).
 * This keeps `as` ≠ `ass` while `fuuuck` still matches `fuck`.
 */

export interface Automaton {
  next: Array<Map<string, number>>;
  fail: number[];
  /** Pattern indices ending at each node. */
  output: number[][];
  /** Normalized word per pattern index. */
  words: string[];
}

export interface RawHit {
  /** Start position in the normalized stream ( elongation-aware). */
  start: number;
  /** End position in the normalized stream. */
  end: number;
  /** Pattern index. */
  pat: number;
}

export function buildAutomaton(patterns: string[]): Automaton {
  const next: Array<Map<string, number>> = [new Map()];
  const fail: number[] = [0];
  const output: number[][] = [[]];

  patterns.forEach((pat, idx) => {
    let state = 0;
    for (const ch of pat) {
      const nxt = (next[state] as Map<string, number>).get(ch);
      if (nxt === undefined) {
        const created = next.length;
        (next[state] as Map<string, number>).set(ch, created);
        next.push(new Map());
        fail.push(0);
        output.push([]);
        state = created;
      } else {
        state = nxt;
      }
    }
    (output[state] as number[][][number]).push(idx);
  });

  // BFS failure links.
  const queue: number[] = [];
  for (const s of (next[0] as Map<string, number>).values()) {
    fail[s] = 0;
    queue.push(s);
  }
  while (queue.length > 0) {
    const r = queue.shift() as number;
    for (const [ch, s] of (next[r] as Map<string, number>).entries()) {
      queue.push(s);
      let f = fail[r] as number;
      while (f !== 0 && !(next[f] as Map<string, number>).has(ch)) {
        f = fail[f] as number;
      }
      const nf = (next[f] as Map<string, number>).get(ch) ?? 0;
      fail[s] = nf;
      if ((output[nf] as number[]).length > 0) {
        output[s] = (output[s] as number[]).concat(output[nf] as number[]);
      }
    }
  }

  return {
    next,
    fail,
    output,
    words: patterns,
  };
}

/**
 * Walk backwards from a hit to find where the match really started.
 * Needed because elongations (`fuuuuck`) consume more chars than the
 * pattern is long. Skipped chars are always repeats of their successor,
 * so any non-matching repeat is stepped over.
 */
function matchStart(norm: string, end: number, pat: string): number {
  let j = end;
  for (let p = pat.length - 1; p >= 0; p--) {
    const need = pat[p] as string;
    while (j >= 0 && norm[j] !== need && norm[j] === norm[j + 1]) j--;
    if (j < 0 || norm[j] !== need) return Math.max(0, end - pat.length + 1);
    j--;
  }
  return j + 1;
}

export function search(
  auto: Automaton,
  norm: string,
  limit: number,
  accept: (start: number, end: number, pat: number) => boolean,
): RawHit[] {
  const hits: RawHit[] = [];
  const { next, fail, output, words } = auto;
  let state = 0;
  let prev = "";

  for (let i = 0; i < norm.length; i++) {
    const ch = norm[i] as string;
    if (ch === prev) {
      // Repeat-tolerant step: only a direct child continues the path
      // (preserves doubles like `ass`); otherwise the char is an
      // elongation and the state is kept. Fail links are deliberately
      // NOT followed here — with a large dictionary they would divert
      // the live partial match onto an unrelated path.
      const nxt = (next[state] as Map<string, number>).get(ch);
      if (nxt === undefined) continue;
      state = nxt;
    } else {
      while (state !== 0 && !(next[state] as Map<string, number>).has(ch)) {
        state = fail[state] as number;
      }
      state = (next[state] as Map<string, number>).get(ch) ?? 0;
      prev = ch;
    }
    const out = output[state] as number[];
    for (const pat of out) {
      const start = matchStart(norm, i, words[pat] as string);
      if (accept(start, i, pat)) {
        hits.push({ start, end: i, pat });
        if (hits.length >= limit) return hits;
      }
    }
  }
  return hits;
}
