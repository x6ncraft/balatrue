# Restricted source-review data

`jokers.audit.generated.json` preserves the English effect and unlock text used to review Balatrue's
classifications. It is generated together with the browser catalog and public per-Joker provenance,
but remains local-only. `data/restricted/*.json` is git-ignored and must not be edited by hand,
committed, or imported into the client application.

## Source and license record

- Source: [Balatro Wiki](https://balatrowiki.org/), hosted by Weird Gloop.
- Parsed source: the fixed `Jokers` revision and fixed English and Simplified Chinese localization
  module revisions recorded in the file-level metadata.
- Reference pages: each record also links to its Joker page; these are review conveniences, not a
  substitute for the actual parsed-source URLs above.
- Modification: MediaWiki markup and presentation text are reduced to normalized plain text by
  `scripts/sync-jokers.ts`.
- Current site notice: the Balatro Wiki footer states CC BY-NC-SA 3.0.

The license chain is not yet settled. The Wiki's
[About page](https://balatrowiki.org/w/Balatro_Wiki%3AAbout) records a June 2025 fork from Fandom;
the [Fandom Balatro Wiki](https://balatrogame.fandom.com/wiki/Jokers) marks community text CC BY-SA,
while Weird Gloop's general licensing table does not identify a Balatro-specific fork date or
transition rule. [Creative Commons guidance](https://wiki.creativecommons.org/wiki/Wiki/cc_license_compatibility)
says BY-SA and BY-NC-SA adaptations are not automatically compatible. This file may also contain
short text originating in Balatro itself, which a Wiki notice cannot license beyond the
contributor's rights.

The file remains a maintainer-local review aid and is excluded from Git, production builds, and the
project MIT License. A clean checkout uses the checked-in runtime catalog and
`data/jokers.provenance.generated.json`; it does not require this file. Weird Gloop's
[licensing guidance](https://meta.weirdgloop.org/w/Licensing) also says non-text media must be checked
on each file's description page, so no text notice supplies the project's artwork permission.

Remote synchronization is disabled by default because Weird Gloop's terms require prior consent for
automated use. See `docs/data-sources.md` before running the generator.
