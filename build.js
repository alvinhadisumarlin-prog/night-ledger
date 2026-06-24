#!/usr/bin/env node
/*
 * The Night Ledger — static site build.
 * Renders index.html from entries.json + src/template.html.
 * Zero dependencies. Run:  node build.js
 *
 * To add an entry: add one object to "entries" in entries.json, then rebuild.
 * The entry markup pattern is owned here so content stays a pure-data drop-in.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'entries.json'), 'utf8'));
let template = fs.readFileSync(path.join(ROOT, 'src', 'template.html'), 'utf8');

// --- helpers ---------------------------------------------------------------
const esc = (s) => String(s)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

function dread(n) {
  const filled = Math.max(0, Math.min(5, Number(n) | 0));
  return '◆'.repeat(filled) + '◇'.repeat(5 - filled);
}

function sectionById(id) {
  return data.sections.find((s) => s.id === id);
}

// --- validation ------------------------------------------------------------
const codes = new Set();
for (const e of data.entries) {
  if (!e.code) throw new Error(`Entry "${e.name || '?'}" is missing a code.`);
  if (codes.has(e.code)) throw new Error(`Duplicate entry code: ${e.code}`);
  codes.add(e.code);
  if (!sectionById(e.section)) throw new Error(`Entry ${e.code} references unknown section "${e.section}".`);
}

// --- render one entry card -------------------------------------------------
function renderEntry(e, idxInSection) {
  const delay = Math.min(0.05 + idxInSection * 0.05, 0.4).toFixed(2);
  const t = e.tags || {};
  const body = (e.body || []).map((p) => `    <p>${esc(p)}</p>`).join('\n');
  let note = '';
  if (e.note && e.note.length) {
    const noteParas = e.note.map((p) => `      <p>${esc(p)}</p>`).join('\n');
    note =
`    <div class="note">
      <span class="lbl">Keeper's note</span>
${noteParas}
    </div>
`;
  }
  return `  <article class="entry" id="${esc(e.code)}" style="animation-delay:${delay}s">
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
${body}
${note}  </article>`;
}

// --- render entry sections -------------------------------------------------
let sectionsHtml = '';
for (const sec of data.sections) {
  const entries = data.entries.filter((e) => e.section === sec.id);
  const cards = entries.map((e, i) => renderEntry(e, i)).join('\n\n');
  sectionsHtml +=
`  <!-- ============ SECTION ${sec.num} ============ -->
  <div class="section-head" id="sec-${esc(sec.id)}">
    <span class="num">${esc(sec.num)}</span>
    <h2>${esc(sec.title)}</h2>
  </div>
  <div class="section-rule"></div>

${cards}

  <p><a class="to-top" href="#top">↑ Back to the index</a></p>

`;
}

// --- render the "To Be Collected" section ----------------------------------
const stubs = (data.toCollect || [])
  .map((s) => `    <li>${esc(s.name)} <span>${esc(s.code)}</span></li>`)
  .join('\n');
sectionsHtml +=
`  <!-- ============ TO BE COLLECTED ============ -->
  <div class="section-head" id="sec-to-be-collected">
    <span class="num">★</span>
    <h2>To Be Collected</h2>
  </div>
  <div class="section-rule"></div>
  <p style="color:var(--smoke);font-size:15px;margin-top:-8px;">Reserved codes for entries still to be written — first-hand accounts especially welcome.</p>
  <ul class="stub-list">
${stubs}
  </ul>

  <p><a class="to-top" href="#top">↑ Back to the index</a></p>

`;

// --- render the index / nav ------------------------------------------------
let indexHtml = '';
for (const sec of data.sections) {
  const entries = data.entries.filter((e) => e.section === sec.id);
  const items = entries
    .map((e) => `      <li><span class="ix-code">${esc(e.code)}</span> <a href="#${esc(e.code)}">${esc(e.name)}</a></li>`)
    .join('\n');
  indexHtml +=
`    <p class="index-sec">${esc(sec.num)} ${esc(sec.title)}</p>
    <ul>
${items}
    </ul>
`;
}
indexHtml +=
`    <p class="index-sec">★ To Be Collected</p>
    <ul>
      <li><span class="ix-code">—</span> <a href="#sec-to-be-collected">Reserved codes (${(data.toCollect || []).length})</a></li>
    </ul>`;

// --- fill the template -----------------------------------------------------
const m = data.meta || {};
const replacements = {
  '{{TITLE}}': esc(m.title || 'The Night Ledger'),
  '{{EYEBROW}}': esc(m.eyebrow || ''),
  '{{SUB}}': esc(m.sub || ''),
  '{{EPIGRAPH}}': esc(m.epigraph || ''),
  '{{EPIGRAPH_SOURCE}}': esc(m.epigraphSource || ''),
  '{{FOOTER}}': esc(m.footer || ''),
  '{{INDEX}}': indexHtml,
  '{{SECTIONS}}': sectionsHtml,
};
for (const [k, v] of Object.entries(replacements)) {
  template = template.split(k).join(v);
}

const leftover = template.match(/{{[A-Z_]+}}/);
if (leftover) throw new Error(`Unfilled template placeholder: ${leftover[0]}`);

fs.writeFileSync(path.join(ROOT, 'index.html'), template);
console.log(`Built index.html — ${data.entries.length} entries across ${data.sections.length} sections, ${(data.toCollect || []).length} reserved codes.`);
