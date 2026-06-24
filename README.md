# The Night Ledger

A private compendium of Southeast & East Asian horror folklore and Singapore
haunted-place legends — creatures, hauntings, and uneasy ground, collected and
catalogued. A single self-contained static site: dark, type-driven, no
framework, **zero external runtime dependencies** (fonts are self-hosted, so it
works offline and leaks nothing to third parties).

**Live:** https://alvinhadisumarlin-prog.github.io/night-ledger/

---

## How it's built

Content lives as pure data in [`entries.json`](entries.json). A tiny
zero-dependency Node script ([`build.js`](build.js)) renders it into the shipped
[`index.html`](index.html) using the markup template in
[`src/template.html`](src/template.html).

**Why JSON + a build step (not raw HTML blocks):** adding a story is then just
adding one object — no copying markup, no risk of a malformed `<article>`. The
entry markup pattern is owned in one place (`build.js`), so it stays identical
across every entry and every future addition. The build prints a summary and
fails loudly on duplicate codes, unknown sections, or unfilled placeholders.

```
night-ledger/
├── index.html            ← shipped site (generated — do not hand-edit)
├── entries.json          ← the content (edit this)
├── build.js              ← renders index.html from entries.json + template
├── favicon.svg           ← amber diamond mark
├── og-image.png          ← social/link-preview card (generated)
├── fonts/                ← self-hosted woff2 (Cinzel, Spectral, IBM Plex Mono)
├── src/
│   └── template.html     ← page shell + canonical CSS (design lives here)
└── scripts/
    ├── og-image.svg      ← source art for the OG card
    └── make-og.js        ← renders og-image.png (needs the sharp dev dep)
```

`index.html` is a build artifact but **is committed** so GitHub Pages can serve
it directly with no CI step.

---

## Add a new entry

1. Open `entries.json` and add one object to the `entries` array:

   ```json
   {
     "code": "TH-001",
     "section": "bestiary",
     "name": "Name of the thing",
     "alias": "other names · what it is in one breath",
     "tags": {
       "origin": "Thai",
       "type": "Vengeful spirit",
       "region": "TH · MY",
       "dread": 4
     },
     "body": [
       "The retelling — lead with the sense that announces it (a smell, a sound, a sight).",
       "Give the rule that governs it, and end on the thing that lingers."
     ],
     "note": [
       "Variants, the ward against it, where it is told, and — if first-hand — who told you and when."
     ]
   }
   ```

   - `code` — unique catalogue code (`MY` Malay/Nusantara · `CN` Chinese ·
     `SG` Singapore site · `TH` Thai · `PH` Filipino · `JP` Japanese ·
     `IN` South Asian). Becomes the entry's anchor (`#TH-001`).
   - `section` — must match a section `id` in the `sections` array
     (`bestiary` or `haunted-singapore`). To add a new section, append to
     `sections` first.
   - `dread` — integer 1–5; rendered as ◆ of five.
   - `note` — optional; omit it for no Keeper's note.
   - Entries appear in the order they sit in the array; the nav index and the
     section are generated automatically.

2. Rebuild:

   ```bash
   npm run build      # or: node build.js
   ```

3. Commit & push (see Deploy). Content authored in the companion Claude project
   arrives as ready-to-paste JSON objects — drop them in and rebuild.

> Tip: move a code from `toCollect` to a full `entries` object as each
> reserved story gets written.

---

## Regenerate the social card

Only needed if you change the title/subtitle art in `scripts/og-image.svg`.
Requires the one dev dependency:

```bash
npm install     # installs sharp (dev-only, never shipped)
npm run og       # writes og-image.png (1200×630)
```

---

## Deploy (GitHub Pages)

The repo is published from the `main` branch root via GitHub Pages.

```bash
npm run build
git add -A
git commit -m "content: add <entry>"
git push
```

Pages redeploys automatically on push (usually live within a minute). To set it
up from scratch: **Settings → Pages → Source: Deploy from a branch → `main` /
`(root)`**.

---

## Design notes

- Palette, typography roles, and the `<article class="entry">` structure are the
  canonical design and live in `src/template.html` — **implemented, not
  redesigned**.
- Fonts: **Cinzel** (display), **Spectral** (body), **IBM Plex Mono** (labels),
  all self-hosted under `fonts/` (SIL Open Font License).
- Honours `prefers-reduced-motion`, keyboard focus is visible, mobile-first.
- The original on-page "Entry Template" block was dropped in favour of the JSON
  template above — an on-page HTML template would no longer reflect how entries
  are actually added.
