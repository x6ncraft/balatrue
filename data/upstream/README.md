# Upstream Joker source review data

`jokers.wiki.generated.json` preserves the English effect and unlock wording that Balatrue used to
review and reproduce its Joker classifications. Keeping this source snapshot in the repository
makes later audits, corrections, and data-version upgrades reproducible. The browser application
does not import it, and the production build does not distribute it.

## Source and transformation

- Source site: [Balatro Wiki](https://balatrowiki.org/), hosted by Weird Gloop.
- Parsed table entry: the `Jokers` page revision recorded in `metadata.source.wikiPageUrl`.
- Names: the fixed English and Simplified Chinese localization module revisions recorded beside it.
- Per-card traceability: every record links to its Joker page and records source-text and image
  hashes through `data/jokers.provenance.generated.json`.
- Transformation: `scripts/sync-jokers.ts` removes MediaWiki presentation markup and normalizes the
  relevant table cells to JSON. Balatrue's classification fields are maintained separately.

The recorded `Jokers` revision identifies the parsed container page. The table may obtain fields
from individual Joker pages dynamically, so it is not a substitute for a revision ID for every
linked page. The per-card URLs and hashes preserve exactly what this snapshot used; a future remote
sync should additionally record per-page revision IDs when the source exposes them.

## Rights and license notice

This directory is third-party source-review material and is excluded from Balatrue's root MIT
License. The Balatro Wiki footer states
[`CC BY-NC-SA 3.0; additional terms may apply`](https://creativecommons.org/licenses/by-nc-sa/3.0/),
and its About page records that the wiki became a Weird Gloop-hosted fork of the Fandom Balatro Wiki
on 17 June 2025. The Fandom source labels community text
[`CC BY-SA`](https://creativecommons.org/licenses/by-sa/3.0/). Some short effect and unlock wording
may also reproduce in-game Balatro text rather than original wiki commentary.

To the extent individual fields are licensed by Balatro Wiki contributors, this snapshot
redistributes those contributions under the Wiki's stated CC BY-NC-SA 3.0 terms with attribution to
Balatro Wiki contributors. Balatrue removed MediaWiki presentation markup and normalized whitespace
and rendered variable values to JSON; it made no claim of authorship over the wording. The project
records the Fandom migration notice without asserting that one Creative Commons license covers every
field. The Wiki contributors, LocalThunk, Playstack, and any other respective rights holders retain
whatever rights apply to their material. This repository does not relicense original-game wording.
See the repository-wide [asset and data notice](../../ASSET_NOTICE.md) for the non-commercial use,
attribution, rights contact, and takedown process.

Attribution links:

- [Balatro Wiki: About](https://balatrowiki.org/w/Balatro_Wiki%3AAbout)
- [Balatro Wiki: Jokers](https://balatrowiki.org/w/Jokers)
- [Fandom Balatro Wiki: Jokers](https://balatrogame.fandom.com/wiki/Jokers)
- [Weird Gloop licensing guidance](https://meta.weirdgloop.org/w/Licensing)
- [Weird Gloop Terms of Use](https://weirdgloop.org/terms/)

Future automated access requires prior consent under the current Weird Gloop Terms of Use. The
checked-in snapshot can be reviewed and built without contacting the source site.
