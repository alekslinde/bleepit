# bleepit

Super lightweight, fast, language-agnostic profanity checker. Zero dependencies, isomorphic (Node · Browser · Deno · Bun · Workers).

```ts
import { ProfanityChecker } from "bleepit";

const checker = new ProfanityChecker({ languages: ["en", "es"] });

checker.isProfane("What the f.u.c.k?!"); // true
checker.isProfane("shiiiiiit");          // true (elongation)
checker.isProfane("sh1t");               // true (leet-speak)
checker.isProfane("the class");          // false (word boundaries)
checker.censor("You are a b1tch");       // "You are a *****"
```

## Why this design

- **Aho-Corasick automaton** — one `O(n)` scan per query, independent of
  dictionary size. Adding languages or 10k custom words costs nothing at
  query time.
- **Normalize-then-match** — a single pass folds case, diacritics
  (`scheiße`→`scheisse`), leet (`@`→`a`, `$`→`s`), drops separators
  (`f.u-c_k`→`fuck`), and tolerates elongations (`fuuuuck`) by
  repeat-aware stepping that still keeps `as` ≠ `ass`.
- **Language-agnostic engine** — unicode-aware by construction; plug in any
  wordlist or script (`customWords: ["сука", "クソ"]`). Ships with compact
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
import { createChecker } from "bleepit";
import { es } from "bleepit/lists"; // individual lists for tiny bundles

const c = createChecker({ languages: ["es"], whitelist: ["arsenal"] });
```

## Known limitation

Single-character masking (`f*ck`, `sh*t`) is intentionally out of scope —
a `*` can stand for any letter, so reliable matching needs edit-distance
search, which would break the lightweight/`O(n)` guarantees. Workaround:
add the variants you care about via `customWords`.

## License

Apache-2.0. Wordlists are compact starters — curate them for your community.
