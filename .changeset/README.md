# Changesets

This directory tracks pending version bumps for `bleepit`.

- Run `pnpm changeset` after a change that should bump the published version, and follow the prompts to pick patch/minor/major and describe the change.
- Run `pnpm run version:packages` to consume pending changesets, bump `package.json`, and update `CHANGELOG.md`.
- Run `pnpm run release` to build and publish after versioning.

See https://github.com/changesets/changesets for the full docs.
