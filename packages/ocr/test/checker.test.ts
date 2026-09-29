import { createChecker } from "bleepit";
import { describe, expect, it, vi } from "vitest";
import { createImageChecker } from "../src/checker.js";
import type { OcrEngine, OcrWord } from "../src/types.js";

function w(text: string, i = 0, confidence = 95): OcrWord {
  return {
    text,
    bbox: { x0: i * 10, y0: 0, x1: i * 10 + 8, y1: 10 },
    confidence,
  };
}

/** Engine stub — returns fixed words, so tests cover mapping, not OCR. */
function stubEngine(words: OcrWord[]): OcrEngine {
  return { recognize: () => Promise.resolve({ words }) };
}

const IMAGE = new Uint8Array([1, 2, 3]);

describe("ImageProfanityChecker", () => {
  it("detects profanity in recognized words", async () => {
    const ic = createImageChecker({
      engine: stubEngine([w("you", 0), w("shit", 1)]),
    });
    expect(await ic.isProfane(IMAGE)).toBe(true);
  });

  it("reports clean text as clean", async () => {
    const ic = createImageChecker({
      engine: stubEngine([w("hello", 0), w("world", 1)]),
    });
    expect(await ic.isProfane(IMAGE)).toBe(false);
    expect(await ic.find(IMAGE)).toEqual([]);
  });

  it("attaches the box of the matched word", async () => {
    const bad = w("shit", 1);
    const ic = createImageChecker({ engine: stubEngine([w("you", 0), bad]) });
    const [match] = await ic.find(IMAGE);
    expect(match).toBeDefined();
    expect(match!.boxes).toEqual([bad.bbox]);
    expect(match!.words.map((x) => x.text)).toEqual(["shit"]);
  });

  it("does not match across the word separator", async () => {
    // "grass" + "assault" must not yield a match from the joined boundary,
    // and neither word contains standalone profanity.
    const ic = createImageChecker({
      engine: stubEngine([w("grass", 0), w("assault", 1)]),
    });
    expect(await ic.find(IMAGE)).toEqual([]);
  });

  it("carries the lowest confidence of the spanned words", async () => {
    const ic = createImageChecker({
      engine: stubEngine([w("shit", 0, 71)]),
      minConfidence: 0,
    });
    const [match] = await ic.find(IMAGE);
    expect(match?.confidence).toBe(71);
  });

  it("drops words below the confidence threshold", async () => {
    const words = [w("you", 0), w("shit", 1, 30)];
    expect(
      await createImageChecker({ engine: stubEngine(words) }).isProfane(IMAGE),
    ).toBe(false);
    expect(
      await createImageChecker({
        engine: stubEngine(words),
        minConfidence: 20,
      }).isProfane(IMAGE),
    ).toBe(true);
  });

  it("still matches when OCR mangles letters into leet shapes", async () => {
    // Tesseract routinely reads "i" as "1" and "o" as "0"; bleepit's
    // normalizer absorbs exactly this confusion.
    const ic = createImageChecker({ engine: stubEngine([w("sh1t", 0)]) });
    expect(await ic.isProfane(IMAGE)).toBe(true);
  });

  it("honours a custom checker's language config", async () => {
    const engine = stubEngine([w("merde", 0)]);
    expect(await createImageChecker({ engine }).isProfane(IMAGE)).toBe(false);
    expect(
      await createImageChecker({
        engine,
        checker: createChecker({ languages: ["en", "fr"] }),
      }).isProfane(IMAGE),
    ).toBe(true);
  });

  it("respects the match limit", async () => {
    const ic = createImageChecker({
      engine: stubEngine([w("shit", 0), w("bitch", 1)]),
    });
    expect(await ic.find(IMAGE)).toHaveLength(2);
    expect(await ic.find(IMAGE, 1)).toHaveLength(1);
  });

  it("returns no matches for an empty page", async () => {
    const ic = createImageChecker({ engine: stubEngine([]) });
    expect(await ic.find(IMAGE)).toEqual([]);
  });

  it("matches words supplied directly, without OCR", async () => {
    const ic = createImageChecker({ engine: stubEngine([]) });
    expect(ic.findInWords([w("shit", 0)])).toHaveLength(1);
  });
});

describe("redact", () => {
  it("returns one merged box per match", async () => {
    const ic = createImageChecker({
      engine: stubEngine([w("shit", 0), w("ok", 1), w("bitch", 2)]),
    });
    const boxes = await ic.redact(IMAGE);
    expect(boxes).toHaveLength(2);
    expect(boxes[0]).toEqual({ x0: 0, y0: 0, x1: 8, y1: 10 });
    expect(boxes[1]).toEqual({ x0: 20, y0: 0, x1: 28, y1: 10 });
  });

  it("returns nothing for a clean page", async () => {
    const ic = createImageChecker({ engine: stubEngine([w("fine", 0)]) });
    expect(await ic.redact(IMAGE)).toEqual([]);
  });
});

describe("terminate", () => {
  it("forwards to the engine when it supports it", async () => {
    const terminate = vi.fn(() => Promise.resolve());
    const ic = createImageChecker({
      engine: { recognize: () => Promise.resolve({ words: [] }), terminate },
    });
    await ic.terminate();
    expect(terminate).toHaveBeenCalledOnce();
  });

  it("is a no-op for engines without cleanup", async () => {
    const ic = createImageChecker({ engine: stubEngine([]) });
    await expect(ic.terminate()).resolves.toBeUndefined();
  });
});
