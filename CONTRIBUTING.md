# Contributing to Balatrue

Thanks for helping improve the puzzle. Please keep changes small, reviewable, and reproducible from
a clean checkout.

## Development

Balatrue uses Bun 1.3.11, React, TypeScript, and Vite.

```bash
bun install --frozen-lockfile
bun run dev
```

Before opening a pull request, run:

```bash
bun run check
bun run test:e2e
```

User-facing changes should be checked in English and Simplified Chinese, on desktop and common phone
widths. Update the narrowest authoritative document under `docs/` when a product rule, data model,
rights boundary, or release contract changes.

## Data and assets

- Do not edit `src/data/jokers.generated.ts`, `data/jokers.provenance.generated.json`, or
  `data/upstream/jokers.wiki.generated.json` by hand.
- Keep upstream effect and unlock wording in the generated `data/upstream/` snapshot with its
  attribution and rights notice; do not copy it into browser code or production assets.
- Do not commit game packages, original game source code, logos, music, or sound effects.
- Do not add or replace third-party artwork without a source record and an explicit review of its
  rights status.
- Remote Wiki synchronization is maintainer-only and requires the access confirmation described in
  `docs/data-sources.md`.

## License

By contributing original code or documentation, you agree to license that contribution under the
project's MIT License. This does not apply to Balatro names, game text, artwork, fonts, dependencies,
or other third-party material identified in `ASSET_NOTICE.md` and `THIRD_PARTY_NOTICES.md`.
