# bleepit

Keep profanity out of your product. A fast, free profanity checker that plugs
into anywhere JavaScript runs (Node · Browser · Deno · Bun · Workers), with
zero dependencies and wordlists you control.

```ts
import { ProfanityChecker } from "@bleepit/core";

const checker = new ProfanityChecker({ languages: ["en", "es"] });

checker.isProfane("What an a.r.s.e?!");   // true
checker.isProfane("arrrse");              // true (elongation)
checker.isProfane("@rse");                // true (leet-speak)
checker.isProfane("the class");           // false (word boundaries)
checker.censor("That was a d0uche move"); // "That was a ****** move"
```

## Why this design

- **Aho-Corasick automaton** — one `O(n)` scan per query, independent of
  dictionary size. Adding languages or 10k custom words costs nothing at
  query time.
- **Normalize-then-match** — a single pass folds case, diacritics
  (`scheiße`→`scheisse`), leet (`@`→`a`, `$`→`s`), drops separators
  (`a.r-s_e`→`arse`), and tolerates elongations (`bollllocks`) by
  repeat-aware stepping that still keeps `as` ≠ `ass`.
- **Script-agnostic engine** — unicode-aware by construction; plug in any
  wordlist or script (`customWords: ["чёрт", "クソ"]`). Ships with compact
  `en`/`es`/`fr`/`de` starters; other languages stay out of your bundle
  unless imported.
- **Tiny** — zero deps, tree-shakeable ESM + CJS, minified (~few KB).

## API

| Method | Description |
|---|---|
| `isProfane(text)` | Fast boolean check |
| `find(text)` | `{ word, start, end }[]` with original-string offsets |
| `censor(text, mask="*")` | Masked string, whitespace preserved |
| `addWords([...])` / `removeWords([...])` | Runtime dictionary updates |
| `size` | Pattern count |

Options: `languages`, `customWords`, `whitelist`, `wholeWord` (default
`true` — avoids the Scunthorpe problem; set `false` for aggressive or
spaceless-script matching), `leet`, `stripDiacritics`.

```ts
import { createChecker } from "@bleepit/core";
import { es } from "@bleepit/core/lists"; // individual lists for tiny bundles

const c = createChecker({ languages: ["es"], whitelist: ["arsenal"] });
```

## Known limitations

**Coverage is the lists you load.** There is no language detection — a word
that is not in a loaded list or in `customWords` is never flagged. Four
starter lists ship (`en`, `es`, `fr`, `de`), and everything else needs adding
explicitly. That includes close cousins of a language you have loaded:
Portuguese `merda` is not matched by Spanish `mierda`, and Swedish `skit` is
not matched by English `shit`.

**Single-character masking** (`a*se`, `b*llocks`) is intentionally out of
scope — a `*` can stand for any letter, so reliable matching needs
edit-distance search, which would break the lightweight/`O(n)` guarantees.
Workaround: add the variants you care about via `customWords`.

No filter is perfect — pair automated checks with reporting and human review
for high-stakes moderation, especially for communities whose languages you do
not speak.

## License

Apache-2.0. Wordlists are compact starters — curate them for your community.
