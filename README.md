# Balatrue

[Play Balatrue](https://balatrue.x6n.me/) · [简体中文](README.zh-CN.md)

Balatrue is a daily web puzzle about Balatro Jokers. You have six guesses. After each guess, five
clues—rarity, base price or acquisition, primary effect, trigger timing, and dependency—help narrow
down the answer.

The format is inspired by [Wordle](https://www.nytimes.com/games/wordle/index.html),
[Handle](https://github.com/antfu/handle), and BLAST.tv's
[Counter-Strikle](https://blast.tv/counter-strikle/daily).

## Status

The game is published at [balatrue.x6n.me](https://balatrue.x6n.me/) as a tested, client-side
static site. A clean checkout produces the same self-contained build. Its original source code is
available under the MIT License. The repository
intentionally preserves separately identified upstream review data and Joker artwork outside that
license; see the rights section below. No authorization from the Balatro rights holders is claimed.

## Features

- **Daily Joker:** one answer per Beijing calendar day, six guesses, and restorable local progress.
- **Endless:** a local shuffle bag cycles through all 150 Jokers without repeating within a round.
- **Five clues:** rarity, price or acquisition, main effect, trigger timing, and dependency.
- **Search:** in-game English and Simplified Chinese names, full pinyin, and pinyin initials; every
  match remains available in a scrollable list.
- **Clue glossary:** every player-facing clue value, available without affecting the score.
- **Joker collection:** searchable and filterable; opening it during an active Daily round marks that
  round as assisted and excludes it from stats.
- **Local stats and sharing:** win rate, streaks, average guesses, and spoiler-free result sharing.
- **Responsive play:** the Joker identity and five clue cells stay aligned as six columns on common
  phone widths; screens at 340px and below use a more readable fallback.

Balatrue is a client-side game. Its answer can be inspected, so it does not promise anti-cheat or
support prize-based competition.

## Local development

The project uses React 19, TypeScript, Vite, and Bun 1.3.11. Vite also requires Node.js `^20.19.0`
or `>=22.12.0`.

```bash
bun install --frozen-lockfile
bun run dev
```

Run the complete technical checks and browser journeys with:

```bash
bun run check
bunx playwright install chromium # one-time browser setup on a new machine
bun run test:e2e
```

Build and preview the static site:

```bash
bun run build
bun run preview
```

The deployable output is `dist/`. Remote data synchronization is a maintainer-only operation and is
disabled by default; the checked-in source snapshot makes normal validation and builds reproducible
without contacting the Wiki. See [Data sources and boundaries](docs/data-sources.md) before using
the synchronization command.

`package.json` keeps `private: true` only to prevent accidental npm publication. It does not restrict
GitHub visibility or the MIT license.

## Project structure

```text
src/          React UI, game rules, search, localization, and generated runtime data
data/         checked-in per-Joker provenance and repository-only upstream review data
scripts/      data generation, validation, and release-artifact checks
tests/e2e/    Playwright browser journeys
docs/         product, architecture, design, rights, and reproducible release guidance
public/       low-resolution Joker images used for card identification
```

The implementation route and module boundaries are documented in
[Architecture](docs/architecture.md).

## Data, artwork, and rights

Balatrue is a free, non-commercial fan-made guessing game. It currently has no ads, purchases,
prizes, sponsorships, or donations. It is not affiliated with, sponsored, endorsed, or approved by
LocalThunk or Playstack. Balatro is developed by LocalThunk and published by Playstack; related
names and artwork belong to their respective rights holders.

The repository retains 150 low-resolution Joker images obtained through the community-run
[Balatro Wiki](https://balatrowiki.org/) solely to identify cards in the fan game. The Wiki is a
reference and provenance source, not represented here as the original rights holder or as a licensor
of the game artwork. The images are excluded from the MIT License. Each image has a checked-in source
page, source URL, hashes, and dimensions in
[`data/jokers.provenance.generated.json`](data/jokers.provenance.generated.json). Provenance,
attribution, disclaimers, and a takedown process do not create permission; public redistribution and
display therefore retain residual rights risk.

For a rights concern, contact [@x6ncraft](https://x.com/x6ncraft). The project will prioritize taking
the related material offline immediately while the concern is reviewed, then remove or replace it as
needed.

The browser catalog contains the names and facts required by the puzzle, project-authored
classifications, and source digests. Complete normalized English effect and unlock wording is kept
in [`data/upstream/jokers.wiki.generated.json`](data/upstream/jokers.wiki.generated.json) so later
reviews and data upgrades remain reproducible. It is third-party source-review material, excluded
from both the project MIT License and the production build. The adjacent
[source notice](data/upstream/README.md) records the Wiki attribution, source-site license notices,
Fandom migration history, transformation, and possible original-game text rights without claiming
that one Creative Commons license covers every field.

Read the [License scope](LICENSE_SCOPE.md), [Asset and data notice](ASSET_NOTICE.md),
[Rights and release notes](docs/legal-notice.md), [Release checklist](docs/release-checklist.md), and
[Third-party notices](THIRD_PARTY_NOTICES.md) before publishing or redistributing the project.

## Documentation

- [Product and rules](docs/product.md)
- [Architecture](docs/architecture.md)
- [Data sources and boundaries](docs/data-sources.md)
- [Visual and interaction design](docs/design.md)
- [Acceptance criteria](docs/acceptance.md)
- [Release checklist](docs/release-checklist.md)
- [Rights and release notes](docs/legal-notice.md)
- [Roadmap](docs/roadmap.md)
- [Contributing](CONTRIBUTING.md)

The working documents are written in Chinese so product and release decisions stay precise for the
project owner.

## License

Balatrue's original feature definitions, game logic, UI, engineering code, and the project-authored
documentation that describes them are licensed under the [MIT License](LICENSE). This license does
not cover Balatro-related names, trademarks, game text, Joker artwork, third-party fonts,
dependencies, or other material identified in
[ASSET_NOTICE.md](ASSET_NOTICE.md) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
