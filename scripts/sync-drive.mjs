// Laster ned nye bilder fra en delt Google Drive-mappe til site/photos/.
// Krever: driveFolderId i config.local.json eller DRIVE_FOLDER_ID i miljøet (mappen delt som «alle med lenken kan se»)
// og miljøvariabelen GOOGLE_API_KEY (en API-nøkkel med Drive API slått på).
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from './config.mjs';
import { execFileSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { driveFolderId } = await loadConfig(root);
const key = process.env.GOOGLE_API_KEY;
if (!driveFolderId || !key) {
  console.error('Mangler driveFolderId (config.local.json eller DRIVE_FOLDER_ID) eller GOOGLE_API_KEY i miljøet.');
  process.exit(1);
}
const dir = join(root, 'site', 'photos');
await mkdir(dir, { recursive: true });

const q = `'${driveFolderId}' in parents and mimeType contains 'image/' and trashed = false`;
let pageToken = '', files = [];
do {
  const url = 'https://www.googleapis.com/drive/v3/files?' + new URLSearchParams({
    q, key, pageSize: '1000', fields: 'nextPageToken,files(id,name)', ...(pageToken && { pageToken })
  });
  const res = await fetch(url);
  if (!res.ok) { console.error('Drive svarte', res.status, await res.text()); process.exit(1); }
  const json = await res.json();
  files.push(...json.files); pageToken = json.nextPageToken || '';
} while (pageToken);

// Husk hvilke Drive-filer som allerede er hentet (originalene flyttes av optimize-photos).
const seenPath = join(root, 'scripts', '.drive-seen.json');
let seen = {};
try { seen = JSON.parse(await readFile(seenPath, 'utf8')); } catch {}

// Hopp også over filer som finnes fra før (i photos/ eller originals/), selv uten sporing.
// Sammenlign uten filendelse: IMG_1234.HEIC blir til IMG_1234.jpg når den konverteres, og i
// GitHub Actions finnes verken originals/ eller .drive-seen.json fra forrige kjøring.
const stem = (n) => n.replace(/\.[^.]+$/, '').toLowerCase();
const have = new Set();
for (const d of [dir, join(root, 'originals')]) {
  try { for (const n of await readdir(d)) have.add(stem(n)); } catch {}
}
let added = 0;
for (const f of files) {
  if (seen[f.id]) continue;
  const safe = f.name.replace(/[\\/:*?"<>|]/g, '_');
  if (have.has(stem(safe))) { seen[f.id] = safe; continue; }
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${f.id}?alt=media&key=${key}`);
  if (!res.ok) { console.warn('Hoppet over', f.name, res.status); continue; }
  await writeFile(join(dir, safe), Buffer.from(await res.arrayBuffer()));
  seen[f.id] = safe;
  await writeFile(seenPath, JSON.stringify(seen, null, 2));
  added++;
}
console.log(`${added} nye bilder (${files.length} i mappen)`);
for (const s of ['optimize-photos.mjs', 'build-photos.mjs']) {
  execFileSync(process.execPath, [join(root, 'scripts', s)], { stdio: 'inherit' });
}
