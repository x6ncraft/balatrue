# Third-party notices

This file records the third-party software and font packages distributed in Balatrue's production
build. It does not grant any rights to Balatro names, artwork, game text, or other material owned by
their respective rights holders.

## Runtime software

| Package                         | License | Copyright notice                                         |
| ------------------------------- | ------- | -------------------------------------------------------- |
| React, React DOM, and Scheduler | MIT     | Meta Platforms, Inc. and affiliates                      |
| Lucide React                    | ISC     | Lucide Contributors; portions from Feather by Cole Bemis |
| pinyin-pro                      | MIT     | zh-lx                                                    |

Unmodified license texts are included in production builds under `legal/licenses/`.

## Font

Balatrue bundles Silkscreen through `@fontsource/silkscreen`. Silkscreen is licensed under the SIL
Open Font License 1.1 and credited to the Silkscreen Project Authors. The full OFL text is included
at `legal/licenses/Silkscreen-OFL-1.1.txt` in production builds.

## Balatro-related material

Balatro is developed by LocalThunk and published by Playstack. Its in-game names, trademarks, and
artwork belong to their respective rights holders. Balatrue includes 150 low-resolution Joker images
only to identify cards in this free, non-commercial fan game, which currently has no ads, purchases,
prizes, sponsorships, or donations. The images are excluded from the project MIT License and are not
relicensed by this notice. Their inclusion, attribution, disclaimer, and takedown process do not
constitute authorization and do not remove residual rights risk.

The images were obtained through the community-run Balatro Wiki, hosted by Weird Gloop. The Wiki is
used as a reference and provenance source; this project does not represent it as the original rights
holder or as a licensor of the game artwork. Per-Joker reference pages, file-description pages,
image source URLs, hashes, and dimensions are recorded in
[`data/jokers.provenance.generated.json`](data/jokers.provenance.generated.json). This public record
documents provenance; it does not treat a Wiki source as a license for artwork owned by another
rights holder. See [`ASSET_NOTICE.md`](ASSET_NOTICE.md) for the project boundary and takedown contact.

If a rights concern is raised, the project will take the related material offline first, then review
the concern and remove or replace the material as needed.

The client catalog keeps the names and factual fields required by the puzzle, project-authored
classifications, fixed source revisions, and cryptographic digests. Complete upstream English effect
and unlock prose is retained only in a maintainer's local, git-ignored audit file. A clean checkout
does not require that file, and production builds exclude its fields.

The current Balatro Wiki footer states CC BY-NC-SA 3.0. Its About page also records a June 2025 fork
from Fandom, whose Balatro Wiki text is marked CC BY-SA; Weird Gloop's general licensing table does
not currently identify a Balatro-specific fork date or transition rule. Creative Commons guidance
does not treat BY-SA and BY-NC-SA adaptations as automatically compatible. Some effect and unlock
phrasing may also originate in Balatro itself, beyond what Wiki contributors can license. The
project therefore does not claim that one Creative Commons license covers the local audit text and
keeps it out of Git, public builds, and the project MIT License.

Weird Gloop separately states that non-text files must be checked on their own description pages.
No Wiki text notice is relied on for Joker artwork.
