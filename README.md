# bleepit

Monorepo for bleepit and its companion packages.

| Package | Description |
|---|---|
| [`bleepit`](packages/bleepit) | Lightweight, fast, language-agnostic profanity checker. Zero dependencies, isomorphic. |
| [`@bleepit/ocr`](packages/ocr) | Profanity detection for images: OCR adapter with match-to-bounding-box mapping. Zero runtime dependencies. |

## Development

```bash
pnpm install
pnpm build   # build every package
pnpm test    # test every package
pnpm lint    # type-check every package
```

Per-package scripts run through a filter:

```bash
pnpm --filter bleepit bench
pnpm --filter bleepit site:build
pnpm --filter @bleepit/ocr test:watch
```

Releases are managed with [changesets](https://github.com/changesets/changesets):
`pnpm changeset` to record a change, `pnpm release` to publish.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, commit conventions, and what
belongs in this repo — notably that `bleepit` takes no runtime dependencies.

## License

Apache-2.0
