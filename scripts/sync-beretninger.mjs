// Henter beretninger fra et Google Docs-dokument og fletter dem inn i site/beretninger.json.
// Dokumentet må være delt som «alle med lenken kan se».
// Format i dokumentet: innlegg skilles med en linje som bare er ---.
// Første linje i hvert innlegg: «2026-11-16 Tittel» (datoen er valgfri).
//
// Beretninger skrevet på skrivesiden (skriv.html) blir liggende. Bare innlegg som kom
// fra dokumentet (source: "docs") og eksempelinnleggene byttes ut ved hver synk.
import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from './config.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'site', 'beretninger.json');
const { name, docId } = await loadConfig(root);
if (!docId) {
  console.log('Ingen docId i config.local.json, så det er ingenting å synke. beretninger.json er ikke endret.');
  process.exit(0);
}

const res = await fetch(`https://docs.google.com/document/d/${docId}/export?format=txt`);
if (!res.ok) { console.error('Kunne ikke hente dokumentet:', res.status, '(er det delt med lenke?)'); process.exit(1); }
const text = await res.text();

const slug = (s) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .replace(/æ/g, 'ae').replace(/ø/g, 'o').replace(/å/g, 'a')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

const fromDoc = text.replace(/^﻿/, '').replace(/\r/g, '').split(/^\s*---\s*$/m)
  .map((chunk) => chunk.trim()).filter(Boolean).map((chunk) => {
    const [first, ...rest] = chunk.split('\n');
    const m = first.match(/^(\d{4}-\d{2}-\d{2})\s+(.*)$/);
    const date = m ? m[1] : '';
    const title = (m ? m[2] : first).trim();
    return { id: `docs-${date}-${slug(title)}`, date, title, body: rest.join('\n').trim(), images: [], source: 'docs' };
  });

let existing = [];
try { existing = JSON.parse(await readFile(out, 'utf8')).posts || []; } catch {}
const kept = existing.filter((p) => p.source !== 'docs' && p.source !== 'eksempel');
const posts = [...kept, ...fromDoc].sort((a, b) => b.date.localeCompare(a.date));

const docUrl = `https://docs.google.com/document/d/${docId}/edit`;
await writeFile(out, JSON.stringify({ name, docUrl, posts }, null, 2) + '\n');
console.log(`beretninger.json: ${fromDoc.length} fra dokumentet, ${kept.length} fra skrivesiden`);
