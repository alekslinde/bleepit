# Contributing to bleepit

Thanks for helping out. This is a small monorepo with a deliberately narrow
scope, so the most useful thing you can read first is [What belongs
here](#what-belongs-here) — a good patch aimed at the wrong package is still a
patch we have to turn down.

## Getting set up

Requires Node 22.13+ and [pnpm](https://pnpm.io) 11+ — the floor is pnpm's
own, not the libraries'. The published packages target ES2020 and use no Node
APIs, so they run anywhere a modern runtime does, including browsers, Deno,
Bun and Workers. CI builds and tests on Node 22 and 24.

Both packages declare `engines.node: >=22` to match what CI actually
exercises. The code itself almost certainly runs on older versions — nothing
in it needs Node 22 — but an untested claim of support is not one worth
publishing. Widening the range means widening the test matrix first.

If you have [Corepack](https://nodejs.org/api/corepack.html) enabled, the
pinned pnpm version is picked up automatically from `packageManager`.

```bash
git clone https://github.com/alekslinde/bleepit.git
cd bleepit
pnpm install
pnpm test
```

| Command | Does |
|---|---|
| `pnpm build` | Build every package |
| `pnpm test` | Test every package |
| `pnpm lint` | Type-check every package (`tsc --noEmit`) |
| `pnpm changeset` | Record a user-visible change |

Per-package work runs through a filter:

```bash
pnpm --filter @bleepit/core test:watch
pnpm --filter @bleepit/core bench
pnpm --filter @bleepit/core site:build
pnpm --filter @bleepit/ocr test
```

## The packages

| Package | Scope |
|---|---|
| [`@bleepit/core`](packages/core) | The profanity checker. Aho-Corasick automaton, normalizer, wordlists. |
| [`@bleepit/ocr`](packages/ocr) | Image support: OCR adapter and match-to-box mapping. |

## What belongs here

**`@bleepit/core` has zero runtime dependencies, and that is a feature rather than
an accident.** It is the main reason to pick this library over the many
alternatives. A patch that adds a runtime dependency to the core package will
be turned down regardless of how good the feature is — so if you are weighing
one, open an issue before writing the code.

Companion packages may take dependencies, but as `peerDependencies` or behind
their own entry point, so nobody pays for what they do not import.

Things that do belong:

- Wordlist corrections and additions, per language
- Normalizer improvements (new obfuscation patterns, scripts, folds)
- Performance work, with a benchmark showing the difference
- New language lists under `packages/core/src/lists/`
- OCR engine adapters for `@bleepit/ocr`

Things that do not:

- Image classification — detecting offensive *imagery*, gestures or symbols.
  That is a neural net with a labeled dataset behind it, not string matching,
  and it has failure modes (documented bias against darker skin and fat
  bodies in existing NSFW models) that this project is not equipped to own.
  Reach for a vendor behind an adapter instead.
- Single-character mask matching (`f*ck`). A `*` can stand for any letter, so
  matching it reliably needs edit-distance search, which breaks the `O(n)`
  guarantee. Use `customWords` for the variants you care about.
- Runtime dependencies in `@bleepit/core`, as above.

## Wordlists

Wordlists live in `packages/core/src/lists/` and contain profane language
by necessity — that is expected content here, not a lapse.

They are deliberately compact starters, not exhaustive dictionaries. The
project ships defaults that behave predictably; curating for a specific
community is the consumer's job via `customWords`.

When adding entries:

- Extend the existing language file rather than adding a parallel list
- Add the base form; the normalizer handles case, diacritics, leet and
  elongation, so `sh1t`, `SHIT` and `shiiiit` do not need separate entries
- Mild words are intentionally omitted (`damn`, `crap` and `hell` are not in
  the English list). Raising the severity floor is a judgment call — open an
  issue before doing it in a PR
- Add a test if the entry exercises something the normalizer handles subtly

## Tests

Every behavior change needs a test. Run `pnpm test` before pushing; both
packages must be green.

Two conventions worth knowing, because they have both already caught real
bugs here:

- **Assert against the real wordlist, not an assumed one.** A test using
  `damn` will pass or fail for reasons unrelated to what it claims to test.
- **Make sure a test fails for the reason you think.** A test that passes
  because of an unrelated code path is worse than no test, since it reports
  coverage that does not exist. If you are testing a boundary condition,
  confirm it fails when you break that specific thing.

## Commits

Conventional commits, under 50 characters for the subject:

```
<type>(<scope>): <description>
```

**Types:** `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`

**Scopes:**

- `(checker)` — `ProfanityChecker` core logic
- `(automaton)` — Aho-Corasick automaton
- `(normalizer)` — text normalization
- `(lists)` — wordlist changes
- `(ocr)` — the `@bleepit/ocr` package
- `(site)` — live demo page
- `(config)` — build, tooling, workspace

Explain *why* in the body when the reason is not obvious from the diff. A
commit that says what the code already says is a wasted one.

## Changesets

Any change users would notice needs a changeset:

```bash
pnpm changeset
```

Pick the package, pick a bump, and write the entry for someone reading a
changelog — what changed and what they should do about it, not which files
you touched. Internal refactors, test-only changes and CI tweaks do not need
one.

## CI

Every PR runs:

| Job | What it catches |
|---|---|
| `test` on Node 22, 24 | Build, lint and tests on each supported version |
| `smoke` | Breakage in the *built* output — bad entry points, broken `dts`, dropped exports. The unit suites run against `src/`, so they cannot see this |
| `changeset` | A user-visible change with no changelog entry. Advisory only — it reports, it does not block |

Run `pnpm lint && pnpm test && pnpm build` before pushing and CI rarely
surprises you.

## Releases

Releases are automated and run from CI. Maintainers do not publish from a
laptop — the token stays in the repo's secrets, and each tarball carries a
provenance attestation tying it to the commit and workflow run that built it,
which a local publish cannot produce.

The loop, once a PR with a changeset lands on `main`:

1. The release workflow opens a **"Version Packages"** PR. It applies the
   pending changesets — bumping versions and writing `CHANGELOG.md` — and
   nothing else.
2. Review that PR like any other. It is the last point where a wrong bump is
   cheap to fix.
3. Merging it runs the workflow again. With no changesets left to consume, it
   builds, re-runs lint and tests against the merge commit, and publishes.

So a release is always a reviewed, merged PR. Nothing publishes from a direct
push.

### The demo site

`packages/core/site/` deploys to GitHub Pages on any push to `main` that
touches the site or the library source.

The workflow rebuilds the bundle rather than deploying the committed one, so
the live demo cannot drift from the library it demonstrates. `bleepit.bundle.js`
is checked in for convenience, but it is a build artifact — edit `site/main.ts`
and run `pnpm site:build`. CI warns when the committed copy no longer matches a
fresh build.

Styling is Tailwind. Edit `site/styles.css` — the semantic colour tokens at the
top and the component classes below it — and run `pnpm site:build`, which
compiles `site/styles.build.css`. That file is generated and gitignored, so
never edit or commit it. Prefer an existing token over a raw colour: each one
is defined twice, light and dark, and a literal hex will look wrong in one of
them.

Two things the page is expected to hold to, both easy to break:

- **No horizontal scroll at any width from 320px up.** Wide code blocks and
  tables scroll inside their own container, never the page.
- **Interactive targets are at least 44×44px, and every text colour clears
  WCAG AA against what actually renders behind it** — including in dark mode,
  where an accent that works on white usually does not.

Demo presets are held to the same standard as tests: assert against the real
wordlist. A preset built on a word the list does not carry shows visitors a
profanity being reported as clean, which is worse than shipping no demo.

### Repository setup

These live in repository settings rather than in the repo, so they are listed
here to be found when something fails:

| What | Where | Needed for |
|---|---|---|
| `NPM_TOKEN` | Repo → Secrets → Actions | Publishing. A granular token scoped to the published packages, read+write |
| Pages source | Repo → Pages → **GitHub Actions** | The demo deploy. The workflow fails without it |
| npm org | npmjs.com | Scoped packages cannot publish until the scope exists |

A token that has expired surfaces as `ENEEDAUTH` on the publish step, not as
anything more descriptive.

## Pull requests

Branch from `main` as `<type>/<short-description>`, then open the PR against
`main`. The template asks what changed, why, and how you verified it — the
last one matters most, since "tests pass" and "I checked the built output
behaves correctly" are different claims.

`main` is protected: direct pushes are rejected, and the `test`, `smoke` and
`changeset` checks must pass before a PR can merge.

Keep unrelated changes in separate PRs. A formatting sweep bundled with a
behavior fix makes the behavior fix unreviewable.

## License

By contributing you agree your work is licensed under Apache-2.0, matching
the rest of the project.
