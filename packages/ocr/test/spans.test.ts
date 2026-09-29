import { describe, expect, it } from "vitest";
import {
  joinSeparately,
  joinWords,
  mergeBoxes,
  wordsInRange,
} from "../src/spans.js";
import type { OcrWord } from "../src/types.js";

/** Terse word factory — box values are arbitrary but distinguishable. */
function w(text: string, i = 0, confidence = 95): OcrWord {
  return {
    text,
    bbox: { x0: i * 10, y0: 0, x1: i * 10 + 8, y1: 10 },
    confidence,
  };
}

describe("joinWords", () => {
  it("joins with single spaces and records offsets", () => {
    const { text, spans } = joinWords([w("hello", 0), w("world", 1)]);
    expect(text).toBe("hello world");
    expect(spans.map((s) => [s.start, s.end])).toEqual([
      [0, 5],
      [6, 11],
    ]);
  });

  it("slices back to the original word at each span", () => {
    const words = [w("the", 0), w("quick", 1), w("brown", 2)];
    const { text, spans } = joinWords(words);
    for (const span of spans) {
      expect(text.slice(span.start, span.end)).toBe(span.word.text);
    }
  });

  it("skips empty words without leaving stray separators", () => {
    const { text, spans } = joinWords([w("a", 0), w("", 1), w("b", 2)]);
    expect(text).toBe("a b");
    expect(spans).toHaveLength(2);
  });

  it("returns empty text for no words", () => {
    expect(joinWords([])).toEqual({ text: "", spans: [] });
  });

  it("tracks offsets correctly past astral characters", () => {
    // "😀" is two UTF-16 units; the next span must account for that.
    const { text, spans } = joinWords([w("😀", 0), w("damn", 1)]);
    const second = spans[1];
    expect(second).toBeDefined();
    expect(text.slice(second!.start, second!.end)).toBe("damn");
  });
});

describe("joinSeparately", () => {
  it("yields one segment per word, each offset from zero", () => {
    const segments = joinSeparately([w("hello", 0), w("world", 1)]);
    expect(segments.map((s) => s.text)).toEqual(["hello", "world"]);
    for (const segment of segments) {
      const span = segment.spans[0];
      expect(span).toBeDefined();
      expect(segment.text.slice(span!.start, span!.end)).toBe(span!.word.text);
    }
  });

  it("skips empty words", () => {
    expect(joinSeparately([w("a", 0), w("", 1)])).toHaveLength(1);
  });

  it("returns nothing for no words", () => {
    expect(joinSeparately([])).toEqual([]);
  });
});

describe("wordsInRange", () => {
  const words = [w("aaa", 0), w("bbb", 1), w("ccc", 2)];
  const { spans } = joinWords(words); // "aaa bbb ccc" → 0-3, 4-7, 8-11

  it("finds a word fully inside one span", () => {
    expect(wordsInRange(spans, 4, 6).map((x) => x.text)).toEqual(["bbb"]);
  });

  it("finds every word a range straddles", () => {
    expect(wordsInRange(spans, 2, 5).map((x) => x.text)).toEqual([
      "aaa",
      "bbb",
    ]);
  });

  it("spans all words for a full-text range", () => {
    expect(wordsInRange(spans, 0, 10).map((x) => x.text)).toEqual([
      "aaa",
      "bbb",
      "ccc",
    ]);
  });

  it("excludes a word ending exactly at the range start", () => {
    // "aaa" occupies [0,3); a match starting at 3 (the separator) must not
    // pull it in — this is the off-by-one the binary search has to respect.
    expect(wordsInRange(spans, 3, 3)).toEqual([]);
  });

  it("includes a word starting exactly at the range end", () => {
    expect(wordsInRange(spans, 3, 4).map((x) => x.text)).toEqual(["bbb"]);
  });

  it("returns nothing past the end of the text", () => {
    expect(wordsInRange(spans, 50, 60)).toEqual([]);
  });

  it("agrees with a linear scan over many words", () => {
    const many = Array.from({ length: 200 }, (_, i) => w(`w${i}`, i));
    const joined = joinWords(many);
    const linear = (start: number, end: number): string[] =>
      joined.spans
        .filter((s) => s.end > start && s.start <= end)
        .map((s) => s.word.text);
    for (const [start, end] of [
      [0, 0],
      [7, 9],
      [100, 140],
      [3, 3],
      [0, 10_000],
    ] as const) {
      expect(wordsInRange(joined.spans, start, end).map((x) => x.text)).toEqual(
        linear(start, end),
      );
    }
  });
});

describe("mergeBoxes", () => {
  it("returns null for no boxes", () => {
    expect(mergeBoxes([])).toBeNull();
  });

  it("returns the same box for a single input", () => {
    const box = { x0: 1, y0: 2, x1: 3, y1: 4 };
    expect(mergeBoxes([box])).toEqual(box);
  });

  it("covers every input box", () => {
    expect(
      mergeBoxes([
        { x0: 10, y0: 5, x1: 20, y1: 15 },
        { x0: 4, y0: 8, x1: 12, y1: 30 },
      ]),
    ).toEqual({ x0: 4, y0: 5, x1: 20, y1: 30 });
  });
});
