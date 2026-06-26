#!/usr/bin/env node
/*
 * The Night Ledger static site build.
 *
 * The site is a CODEX: index.html is a clickable list of every entry, and each
 * story renders to its own page <CODE>.html. Reads site.json + every
 * stories/*.json + the shared shell (src/page.html) and the design
 * (src/styles.css + src/styles-extra.css). Zero dependencies.
 *
 *   node build.js        (output: dist/)
 *
 * To add a story: drop one stories/<CODE>.json file and push. The GitHub
 * Action rebuilds and deploys; no manual regenerate. Files starting with "_"
 * are skipped (e.g. the gitignored _TEMPLATE.json).
 *
 * Each entry may carry, after its body and Keeper's note:
 *   "recountings": [ { "text", "attribution", "url" } ]   accounts gathered online
 *   "references":  [ { "title", "publisher", "url" } ]    sources, listed at the foot
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');
const STORIES_DIR = path.join(ROOT, 'stories');
const SRC = path.join(ROOT, 'src');

const SITE_URL = 'https://alvinhadisumarlin-prog.github.io/night-ledger/';

const site = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.json'), 'utf8'));
const shell = fs.readFileSync(path.join(SRC, 'page.html'), 'utf8');
const styles =
  fs.readFileSync(path.join(SRC, 'styles.css'), 'utf8') +
  '\n' +
  fs.readFileSync(path.join(SRC, 'styles-extra.css'), 'utf8');

// --- load the library of contained stories ---------------------------------
const storyFiles = fs.readdirSync(STORIES_DIR).filter((f) => f.endsWith('.json') && !f.startsWith('_'));
const stories = storyFiles.map((f) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(STORIES_DIR, f), 'utf8'));
  } catch (e) {
    throw new Error(`stories/${f} is not valid JSON: ${e.message}`);
  }
});

// --- helpers ---------------------------------------------------------------
const esc = (s) => String(s)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

const escAttr = (s) => esc(s).replace(/"/g, '&quot;');

function dread(n) {
  const filled = Math.max(0, Math.min(5, Number(n) | 0));
  return '◆'.repeat(filled) + '◇'.repeat(5 - filled);
}

const sectionById = (id) => site.sections.find((s) => s.id === id);

// --- validation ------------------------------------------------------------
const codes = new Set();
for (const e of stories) {
  if (!e.code) throw new Error(`A story file is missing a "code".`);
  if (!e.name) throw new Error(`Story ${e.code} is missing a "name".`);
  if (codes.has(e.code)) throw new Error(`Duplicate story code: ${e.code}`);
  codes.add(e.code);
  if (!sectionById(e.section)) throw new Error(`Story ${e.code} references unknown section "${e.section}". Add it to site.json first.`);
}

// no em-dashes or en-dashes anywhere in shipped text (house rule)
const DASH = /[—–]/;
for (const e of stories) {
  const blobs = [];
  for (const p of e.body || []) blobs.push(p);
  for (const p of e.note || []) blobs.push(p);
  for (const r of e.recountings || []) { blobs.push(r.text || ''); blobs.push(r.attribution || ''); }
  for (const r of e.references || []) { blobs.push(r.title || ''); blobs.push(r.publisher || ''); }
  blobs.push(e.name || '', e.alias || '');
  for (const b of blobs) {
    if (DASH.test(b)) throw new Error(`Story ${e.code} contains an em-dash or en-dash (house rule forbids them): "${b.slice(0, 80)}"`);
  }
}

// stable order: explicit `order` first (ascending), then by code
const inSection = (id) =>
  stories
    .filter((e) => e.section === id)
    .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity) || a.code.localeCompare(b.code));

const entryHref = (code) => `${esc(code)}.html`;

// --- render the recountings / references blocks ----------------------------
function renderRecountings(e) {
  if (!e.recountings || !e.recountings.length) return '';
  const items = e.recountings.map((r) => {
    const attr = r.url
      ? `<a href="${escAttr(r.url)}" target="_blank" rel="noopener noreferrer">${esc(r.attribution || r.url)}</a>`
      : esc(r.attribution || '');
    return `      <div class="recounting">
        <p>${esc(r.text)}</p>
        <span class="attr">${attr}</span>
      </div>`;
  }).join('\n');
  return `    <div class="recountings">
      <p class="block-label">Recounted online</p>
${items}
    </div>`;
}

function renderReferences(e) {
  if (!e.references || !e.references.length) return '';
  const items = e.references.map((r) => {
    const title = r.url
      ? `<a href="${escAttr(r.url)}" target="_blank" rel="noopener noreferrer">${esc(r.title)}</a>`
      : esc(r.title);
    const pub = r.publisher ? ` <span class="pub">${esc(r.publisher)}</span>` : '';
    return `        <li>${title}${pub}</li>`;
  }).join('\n');
  return `    <div class="references">
      <p class="block-label">Sources</p>
      <ol class="ref-list">
${items}
      </ol>
    </div>`;
}

function renderNote(e) {
  if (!e.note || !e.note.length) return '';
  const noteParas = e.note.map((p) => `      <p>${esc(p)}</p>`).join('\n');
  return `    <div class="note">
      <span class="lbl">Keeper's note</span>
${noteParas}
    </div>`;
}

function renderApocryphaMark(e) {
  if (e.section !== 'apocrypha') return '';
  return `    <div class="apocrypha-mark">
      <span class="lbl">Apocrypha</span>
      <p>This entry is an original invention of the keeper, not collected folklore. It carries no recountings or sources by design; it borrows only the grammar of real local legend, and should be read as fiction.</p>
    </div>`;
}

// --- render one full entry card (used on per-entry pages) ------------------
function renderEntryCard(e) {
  const t = e.tags || {};
  const body = (e.body || []).map((p) => `    <p>${esc(p)}</p>`).join('\n');
  const blocks = [body, renderNote(e), renderRecountings(e), renderReferences(e), renderApocryphaMark(e)]
    .filter(Boolean)
    .join('\n');
  return `  <article class="entry" id="${esc(e.code)}">
    <span class="code">${esc(e.code)}</span>
    <h3>${esc(e.name)}</h3>
    <p class="alias">${esc(e.alias || '')}</p>
    <div class="title-rule"></div>
    <div class="tags">
      <span class="tag origin">${esc(t.origin || '')}</span>
      <span class="tag type">${esc(t.type || '')}</span>
      <span class="tag region">${esc(t.region || '')}</span>
      <span class="tag dread">${dread(t.dread)}</span>
    </div>
${blocks}
  </article>`;
}

// --- render the codex (the main index list) --------------------------------
function renderCodexRow(e) {
  const t = e.tags || {};
  const alias = e.alias ? `<span class="c-alias">${esc(e.alias)}</span>` : '<span class="c-alias"></span>';
  return `      <li><a class="codex-row" href="${entryHref(e.code)}">
        <span class="c-code">${esc(e.code)}</span>
        <span class="c-name">${esc(e.name)}</span>
        ${alias}
        <span class="c-dread" title="dread ${Number(t.dread) | 0} of 5">${dread(t.dread)}</span>
      </a></li>`;
}

function renderCodex() {
  let html = '';
  for (const sec of site.sections) {
    const entries = inSection(sec.id);
    const rows = entries.map(renderCodexRow).join('\n');
    const intro = sec.intro ? `    <p class="codex-intro">${esc(sec.intro)}</p>\n` : '';
    html +=
`  <section class="codex-sec" id="sec-${esc(sec.id)}">
    <div class="codex-head">
      <span class="num">${esc(sec.num)}</span>
      <h2>${esc(sec.title)}</h2>
      <span class="codex-count">${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}</span>
    </div>
    <div class="section-rule"></div>
${intro}    <ul class="codex-list">
${rows}
    </ul>
  </section>

`;
  }

  // To Be Collected
  const stubs = (site.toCollect || [])
    .map((s) => `      <li class="stub"><span class="c-code">${esc(s.code)}</span> <span class="c-name" style="font-family:'IBM Plex Mono',monospace;font-size:14px;color:var(--smoke);">${esc(s.name)}</span></li>`)
    .join('\n');
  html +=
`  <section class="codex-sec" id="sec-to-be-collected">
    <div class="codex-head">
      <span class="num">★</span>
      <h2>To Be Collected</h2>
      <span class="codex-count">${(site.toCollect || []).length} reserved</span>
    </div>
    <div class="section-rule"></div>
    <p class="codex-intro">Reserved codes for entries still to be written; first-hand accounts especially welcome.</p>
    <ul class="codex-list">
${stubs}
    </ul>
  </section>`;
  return html;
}

// --- assemble a page from the shared shell ---------------------------------
function page({ title, desc, canonical, ogType, content }) {
  const repl = {
    '{{PAGE_TITLE}}': escAttr(title),
    '{{PAGE_DESC}}': escAttr(desc),
    '{{CANONICAL}}': escAttr(canonical),
    '{{OG_TYPE}}': ogType,
    '{{STYLES}}': styles,
    '{{CONTENT}}': content,
  };
  let out = shell;
  for (const [k, v] of Object.entries(repl)) out = out.split(k).join(v);
  const leftover = out.match(/{{[A-Z_]+}}/);
  if (leftover) throw new Error(`Unfilled template placeholder: ${leftover[0]}`);
  return out;
}

// --- index.html (the codex) ------------------------------------------------
const m = site.meta || {};
const indexContent =
`  <header class="mast">
    <p class="eyebrow">${esc(m.eyebrow || '')}</p>
    <h1>${esc(m.title || 'The Night Ledger')}</h1>
    <p class="sub">${esc(m.sub || '')}</p>
    <hr class="ember">
  </header>

  <p class="epigraph">
    ${esc(m.epigraph || '')}
    <span>${esc(m.epigraphSource || '')}</span>
  </p>

  <div class="legend">
    <h2>How the ledger is kept</h2>
    <p>This page is the index. Choose any entry to open its own page: the full retelling, accounts gathered from around the web, and the sources that hold them up.</p>
    <p>Every entry carries a <code>catalogue code</code> by origin: <code>MY</code> Malay/Nusantara · <code>CN</code> Chinese · <code>SG</code> Singapore site · <code>TH</code> Thai · <code>PH</code> Filipino · <code>JP</code> Japanese · <code>IN</code> South Asian · <code>AP</code> Apocrypha (invented).</p>
    <p>Each entry rates its <strong style="color:var(--oxblood-bright)">dread</strong> in diamonds (◆ of five), opens with a <strong style="color:var(--oxblood-bright)">Keeper's note</strong> on wards and variants, then gathers what people have <strong style="color:var(--joss)">recounted online</strong> and the <strong style="color:var(--joss)">sources</strong> behind them.</p>
  </div>

${renderCodex()}
  <footer>
    ${esc(m.footer || '')}
  </footer>`;

// --- per-entry pages -------------------------------------------------------
function renderEntryPage(e, sec, prev, next) {
  const back = `  <a class="backlink" href="index.html">↑ The Index</a>`;
  const crumb = `  <p class="entry-crumb">${esc(sec.num)} ${esc(sec.title)}</p>`;
  let nav = '';
  const prevLink = prev
    ? `<a href="${entryHref(prev.code)}"><span class="nav-dir">Previous</span>${esc(prev.name)}</a>`
    : '<span></span>';
  const nextLink = next
    ? `<a class="nx" href="${entryHref(next.code)}"><span class="nav-dir">Next</span>${esc(next.name)}</a>`
    : '<span></span>';
  nav = `  <nav class="entry-nav">
    ${prevLink}
    ${nextLink}
  </nav>`;
  const content =
`${back}
${crumb}
<div class="entry-page">
${renderEntryCard(e)}
</div>
${nav}
  <p style="margin-top:28px;"><a class="to-top" href="index.html">↑ Back to the index</a></p>`;

  const desc = `${e.name}: ${e.alias || ''}. ${(e.body && e.body[0]) ? e.body[0].slice(0, 150) : ''}`.replace(/\s+/g, ' ').trim();
  return page({
    title: `${e.name} · The Night Ledger`,
    desc,
    canonical: `${SITE_URL}${e.code}.html`,
    ogType: 'article',
    content,
  });
}

// --- write dist/ -----------------------------------------------------------
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

// index
fs.writeFileSync(path.join(DIST, 'index.html'), page({
  title: m.title || 'The Night Ledger',
  desc: m.sub || 'A compendium of Southeast & East Asian horror folklore and Singapore haunted-place legends.',
  canonical: SITE_URL,
  ogType: 'website',
  content: indexContent,
}));

// entry pages
let entryCount = 0;
for (const sec of site.sections) {
  const entries = inSection(sec.id);
  entries.forEach((e, i) => {
    const prev = entries[i - 1] || null;
    const next = entries[i + 1] || null;
    fs.writeFileSync(path.join(DIST, `${e.code}.html`), renderEntryPage(e, sec, prev, next));
    entryCount++;
  });
}

// copy static assets verbatim
fs.cpSync(path.join(ROOT, 'fonts'), path.join(DIST, 'fonts'), { recursive: true });
for (const asset of ['favicon.svg', 'og-image.png']) {
  fs.copyFileSync(path.join(ROOT, asset), path.join(DIST, asset));
}
fs.writeFileSync(path.join(DIST, '.nojekyll'), '');

console.log(`Built dist/: index codex + ${entryCount} entry pages across ${site.sections.length} sections, ${(site.toCollect || []).length} reserved codes.`);
