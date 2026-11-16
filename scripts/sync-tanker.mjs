// Henter tanker fra et Google Docs-dokument og lager site/tanker.json.
// Dokumentet må være delt som «alle med lenken kan se».
// Format i dokumentet: innlegg skilles med en linje som bare er ---.
// Første linje i hvert innlegg: «2026-11-16 Tittel» (datoen er valgfri).
import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from './config.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { name, docId } = await loadConfig(root);
let text;
if (docId) {
  const res = await fetch(`https://docs.google.com/document/d/${docId}/export?format=txt`);
  if (!res.ok) { console.error('Kunne ikke hente dokumentet:', res.status, '(er det delt med lenke?)'); process.exit(1); }
  text = await res.text();
} else {
  console.warn('Ingen docId i config.json, bruker eksempel-tekst.');
  text = '2026-11-16 Eksempel på en tanke\nHer kommer teksten din fra Google Docs.\n\n---\n2026-11-09 Et eldre innlegg\nEldre tanker havner lenger ned.';
}
const posts = text.replace(/^﻿/, '').replace(/\r/g, '').split(/^\s*---\s*$/m)
  .map((chunk) => chunk.trim()).filter(Boolean).map((chunk) => {
    const [first, ...rest] = chunk.split('\n');
    const m = first.match(/^(\d{4}-\d{2}-\d{2})\s+(.*)$/);
    return { date: m ? m[1] : '', title: (m ? m[2] : first).trim(), body: rest.join('\n').trim() };
  })
  .sort((a, b) => b.date.localeCompare(a.date));
const docUrl = docId ? `https://docs.google.com/document/d/${docId}/edit` : '';
await writeFile(join(root, 'site', 'tanker.json'), JSON.stringify({ name, docUrl, posts }, null, 2));
console.log(`tanker.json: ${posts.length} innlegg`);
