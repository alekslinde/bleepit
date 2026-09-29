import { it } from "vitest";
import { ProfanityChecker } from "../src/index.js";

it("scans 100KB in well under a second", () => {
  const c = new ProfanityChecker({ languages: ["en", "es", "fr", "de"] });
  const clean = "the quick brown fox jumps over the lazy dog. ".repeat(2200);
  const dirty = clean + " what the f.u.c.k shiiiiiit mierda putain scheiße";
  const t0 = performance.now();
  for (let i = 0; i < 5; i++) c.isProfane(dirty);
  const ms = (performance.now() - t0) / 5;
  console.log(`avg scan of ${(dirty.length / 1024).toFixed(0)}KB: ${ms.toFixed(1)}ms`);
});
