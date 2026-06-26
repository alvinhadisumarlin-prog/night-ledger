# The Night Ledger

A private compendium of Southeast & East Asian horror folklore and Singapore
haunted-place legends — creatures, hauntings, and uneasy ground, collected and
catalogued. A single self-contained static site: dark, type-driven, no
framework, **zero external runtime dependencies** (fonts are self-hosted, so it
works offline and leaks nothing to third parties).

**Live:** https://alvinhadisumarlin-prog.github.io/night-ledger/

---

## How it works

The site is a **codex**: `index.html` is a clickable list of every entry, and
each story renders to its own page `<CODE>.html` (the full retelling, accounts
gathered online, and the sources behind them). Each story is its own file in
[`stories/`](stories/) — a **library of contained stories**. Site-level copy
(masthead, sections, reserved codes) lives in [`site.json`](site.json). On every
push, a GitHub Action runs [`build.js`](build.js), which renders everything into
a self-contained `dist/` and deploys it to GitHub Pages.

**You never build or commit HTML by hand.** Add a story file, push, done —
the Action regenerates and publishes (usually live within a minute).

```
night-ledger/
├── stories/                ← the library — one file per story (edit/add here)
│   ├── MY-001.json
│   └── …
├── site.json               ← masthead, sections, "to be collected" list
├── build.js                ← renders dist/ from stories/ + site.json (zero deps)
├── src/page.html           ← shared page shell (head, meta, {{CONTENT}})
├── src/styles.css          ← canonical design / palette / typography
├── src/styles-extra.css    ← codex list + per-entry page styles
├── fonts/                  ← self-hosted woff2 (Cinzel, Spectral, IBM Plex Mono)
├── favicon.svg             ← amber diamond mark
├── og-image.png            ← social/link-preview card (generated, committed)
├── scripts/                ← og-image.svg + make-og.js (regenerate the OG card)
└── .github/workflows/      ← deploy.yml (build + publish on push)
```

`dist/` is a build artifact — it is **gitignored** and produced fresh by the
Action. Nothing generated is committed.

---

## Add a story (the whole loop)

1. **Get the entry as JSON** from the companion Claude project (it outputs
   exactly this shape).
2. **Save it** as `stories/<CODE>.json`, e.g. `stories/TH-001.json`:

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
       "Lead with the sense that announces it (a smell, a sound, a sight).",
       "Give the rule that governs it, and end on the thing that lingers."
     ],
     "note": [
       "Variants, the ward against it, where it is told; if first-hand, who told you and when."
     ],
     "recountings": [
       {
         "text": "A paraphrased 2 to 4 sentence account or retelling gathered online (never copied verbatim).",
         "attribution": "who/where it came from, e.g. a forum thread or news outlet",
         "url": "https://..."
       }
     ],
     "references": [
       { "title": "Page or article title", "publisher": "Wikipedia / a news outlet / a blog", "url": "https://..." }
     ]
   }
   ```

3. **Push:**

   ```bash
   git add stories/TH-001.json
   git commit -m "content: add Name of the thing (TH-001)"
   git push
   ```

   The Action builds and deploys automatically. That's it — no `npm run build`.

### Field reference

- **`code`** — unique catalogue code; becomes the page (`TH-001.html`) the codex
  links to. Prefix by origin: `MY` Malay/Nusantara · `CN` Chinese · `SG`
  Singapore site · `TH` Thai · `PH` Filipino · `JP` Japanese · `IN` South Asian ·
  `AP` Apocrypha (invented).
- **`section`** — must match a section `id` in `site.json` (`bestiary`,
  `haunted-singapore`, or `apocrypha`). To add a section, add it to `site.json`
  first.
- **`order`** *(optional)* — integer; lower sorts first within a section
  (existing entries use 10, 20, 30…). Omit it and the story simply appends to
  its section (sorted by code). Add one only to place it precisely.
- **`dread`** — integer 1 to 5; renders as ◆ of five.
- **`note`** *(optional)* — omit the field entirely for no Keeper's note.
- **`recountings`** *(optional)* — array of accounts gathered online. Each is
  `{ text, attribution, url }`. **Paraphrase**, never paste copyrighted text.
  Renders under "Recounted online". Omit for `apocrypha` (invented) entries.
- **`references`** *(optional)* — array of `{ title, publisher, url }` sources,
  listed at the foot of the page under "Sources".
- Filename should match the code (`stories/TH-001.json`) for tidiness; the build
  reads every `*.json` in `stories/` regardless of filename.

> When a reserved story gets written, also delete its line from `toCollect` in
> `site.json`.

The build **fails loudly** (so a bad story can't ship) on: missing code/name,
duplicate code, unknown section, malformed JSON, or an em-dash / en-dash
anywhere in shipped text (body, note, recountings, references, name, alias).

---

## Preview locally (optional)

You only need this if you want to see changes before pushing:

```bash
node build.js          # writes dist/
# open dist/index.html in a browser
```

No dependencies required — `build.js` is plain Node.

## Regenerate the social card

Only if you change the art in `scripts/og-image.svg`:

```bash
npm install     # installs sharp (dev-only, never shipped)
npm run og       # writes og-image.png (1200×630) — commit it
```

---

## Deploy / setup notes

- Pages source is **GitHub Actions** (Settings → Pages). The
  [`deploy.yml`](.github/workflows/deploy.yml) workflow builds `dist/` and
  publishes it on every push to `main`.
- To deploy manually: Actions tab → "Build & deploy to GitHub Pages" → Run
  workflow.

## Design notes

- Palette, typography roles, and the `<article class="entry">` structure are the
  canonical design and live in `src/styles.css` (+ `src/styles-extra.css` for the
  codex and per-entry pages); the page shell is `src/page.html`.
- Fonts: **Cinzel** (display), **Spectral** (body), **IBM Plex Mono** (labels),
  self-hosted under `fonts/` (SIL Open Font License).
- Honours `prefers-reduced-motion`, keyboard focus is visible, mobile-first.
- Content is original prose / public-domain folklore — safe to publish publicly.
