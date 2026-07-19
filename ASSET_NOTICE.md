# Balatrue asset and data notice

The root [MIT License](LICENSE) covers Balatrue's original product definitions, game logic, UI,
engineering source and tooling, and the project-authored documentation that describes those parts.
It does not grant rights to third-party names, trademarks, game text, artwork, fonts, or other
material identified below.

## Balatro material

Balatro is developed by LocalThunk and published by Playstack. Its in-game Joker names, trademarks,
and card artwork belong to their respective rights holders. The 150 low-resolution images in
`public/jokers/` are included only to identify cards in this free, non-commercial fan-made guessing
game. Balatrue is not operated for profit and currently has no advertising, purchases, prizes,
sponsorships, or donations. The images are not relicensed by this repository and must not be treated
as MIT-licensed assets.

The images were obtained through the community-run [Balatro Wiki](https://balatrowiki.org/), hosted
by Weird Gloop. The Wiki is used as a reference and provenance source; this project does not
represent it as the original rights holder or as a licensor of the game artwork. The checked-in
source record for every image is
[`data/jokers.provenance.generated.json`](data/jokers.provenance.generated.json). It records the
Balatro Wiki Joker page, file-description page and image URL, source and local hashes, dimensions,
and the fixed table and localization revisions used by the catalog. Attribution describes
provenance; it does not claim that the Wiki granted this project rights that belong to LocalThunk,
Playstack, or another owner.

The browser catalog contains only the names, factual fields, project-authored classifications, and
source digests required by the puzzle. Full upstream English effect and unlock wording is kept in a
local, git-ignored review file when a maintainer needs to audit or regenerate the data.

Balatrue is not affiliated with, sponsored, endorsed, or approved by LocalThunk or Playstack. For a
rights inquiry or takedown request, contact [@x6ncraft](https://x.com/x6ncraft). We will take the
relevant material offline first, then review the concern and remove or replace it as needed.

## Bundled software and fonts

Runtime dependencies and the Silkscreen font remain under their own licenses. See
[`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md); the production build includes the corresponding
license texts under `dist/legal/`.
