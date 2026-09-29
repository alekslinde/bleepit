import { describe, expect, it } from "vitest";
import {
  ProfanityChecker,
  censor,
  createChecker,
  find,
  isProfane,
} from "../src/index.js";

describe("basics", () => {
  it("flags plain profanity", () => {
    expect(isProfane("what the fuck")).toBe(true);
    expect(isProfane("you are a bitch")).toBe(true);
    expect(isProfane("hello world")).toBe(false);
    expect(isProfane("")).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(isProfane("FUCK")).toBe(true);
    expect(isProfane("ShIt")).toBe(true);
  });

  it("catches leet-speak", () => {
    const c = createChecker();
    expect(c.isProfane("sh1t")).toBe(true);
    expect(c.isProfane("@ss")).toBe(true);
    expect(c.isProfane("$hit")).toBe(true);
    expect(c.isProfane("b1tch")).toBe(true);
    // trailing punctuation stays a boundary (no glued `i`)
    expect(c.isProfane("damn!")).toBe(false);
    expect(c.isProfane("sh!t")).toBe(true);
  });

  it("catches separator obfuscation", () => {
    const c = createChecker();
    expect(c.isProfane("f.u.c.k")).toBe(true);
    expect(c.isProfane("f_u_c_k")).toBe(true);
    expect(c.isProfane("f-u-c-k you")).toBe(true);
    expect(c.isProfane("b i t c h")).toBe(true);
  });

  it("catches elongations without flagging doubles", () => {
    const c = createChecker();
    expect(c.isProfane("fuuuuck")).toBe(true);
    expect(c.isProfane("shiiiiiit")).toBe(true);
    expect(c.isProfane("ass")).toBe(true);
    expect(c.isProfane("as")).toBe(false);
    expect(c.isProfane("aab")).toBe(false);
  });

  it("strips diacritics and folds", () => {
    const c = createChecker({ languages: ["de"] });
    expect(c.isProfane("scheiße")).toBe(true);
    expect(c.isProfane("SCHElSSE")).toBe(false);
  });

  it("respects word boundaries (Scunthorpe)", () => {
    const c = createChecker();
    expect(c.isProfane("the class is here")).toBe(false);
    expect(c.isProfane("Scunthorpe")).toBe(false);
    expect(c.isProfane("assistant")).toBe(false);
    expect(c.isProfane("fuck you")).toBe(true);
    // substring mode for aggressive filtering / spaceless scripts
    const loose = createChecker({ wholeWord: false });
    expect(loose.isProfane("the class is here")).toBe(true);
  });

  it("supports whitelist", () => {
    const c = createChecker({ whitelist: ["arsenal"] });
    expect(c.isProfane("arsenal")).toBe(false);
  });

  it("censors with offsets", () => {
    const c = createChecker();
    expect(c.censor("You are a bitch")).toBe("You are a *****");
    expect(c.censor("f.u.c.k this")).toBe("******* this");
    expect(c.censor("clean text")).toBe("clean text");
    expect(censor("oh shit")).toBe("oh ****");
  });

  it("find returns words and offsets", () => {
    const c = createChecker();
    const m = c.find("oh shit, fuck!");
    expect(m.map((x) => x.word)).toEqual(["shit", "fuck"]);
    expect(m[0]).toMatchObject({ start: 3, end: 6 });
  });
});

describe("multilingual / language-agnostic", () => {
  it("loads other languages", () => {
    const c = createChecker({ languages: ["es", "fr", "de"] });
    expect(c.isProfane("qué mierda")).toBe(true);
    expect(c.isProfane("putain de merde")).toBe(true);
    expect(c.isProfane("du Wichser")).toBe(true);
    expect(c.isProfane("hello")).toBe(false);
  });

  it("accepts custom words in any script", () => {
    const c = createChecker({
      languages: [],
      customWords: ["сука", "クソ", "badword"],
    });
    expect(c.size).toBe(3);
    expect(c.isProfane("ах ты СУКА")).toBe(true);
    expect(c.isProfane("クソ")).toBe(true);
    expect(c.isProfane("such a badword!")).toBe(true);
  });

  it("adds and removes words at runtime", () => {
    const c = createChecker({ languages: [] });
    expect(c.isProfane("heck")).toBe(false);
    c.addWords(["heck"]);
    expect(c.isProfane("oh heck")).toBe(true);
    c.removeWords(["heck"]);
    expect(c.isProfane("oh heck")).toBe(false);
  });

  it("default singleton helpers work", () => {
    expect(isProfane("fuck")).toBe(true);
    expect(find("fuck").length).toBe(1);
  });
});
