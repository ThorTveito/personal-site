// Lager site/photos.json fra bildene i site/photos/.
// Tittelen er datoen bildet ble tatt (fra EXIF, lest fra originalen i originals/ om den finnes).
// Faller tilbake på filnavnet hvis datoen ikke finnes.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, extname, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from './config.mjs';
import { execFileSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const config = await loadConfig(root);
const dir = join(root, 'site', 'photos');
const ok = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.svg']);

let thumbs = new Set();
try { thumbs = new Set(await readdir(join(root, 'site', 'thumbs'))); } catch {}
let originals = [];
try { originals = await readdir(join(root, 'originals')); } catch {}

const im = ['magick', 'identify'].find((t) => {
  try { execFileSync(t, t === 'magick' ? ['-version'] : ['-version'], { stdio: 'ignore' }); return true; } catch { return false; }
});
const cachePath = join(root, 'scripts', '.dates.json');
let cache = {};
// Datoer som allerede står i photos.json brukes om igjen. Konverterte bilder har ikke EXIF lenger,
// og i GitHub Actions finnes verken originals/ eller .dates.json.
try {
  for (const p of JSON.parse(await readFile(join(root, 'site', 'photos.json'), 'utf8')).photos || []) {
    if (p.date) cache[decodeURIComponent(p.src.replace(/^photos\//, ''))] = p.date;
  }
} catch {}
try { Object.assign(cache, JSON.parse(await readFile(cachePath, 'utf8'))); } catch {}

function exifDate(path) {
  if (!im) return '';
  const args = (im === 'magick' ? ['identify'] : []).concat(['-format', '%[EXIF:DateTimeOriginal]\\n', path]);
  try {
    const out = execFileSync(im, args, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().split('\n')[0].trim();
    const m = out.match(/^(\d{4}):(\d{2}):(\d{2})/);
    return m ? `${m[1]}-${m[2]}-${m[3]}` : '';
  } catch { return ''; }
}

const months = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];
const pretty = (iso) => { const [y, m, d] = iso.split('-').map(Number); return `${d}. ${months[m - 1]} ${y}`; };

const files = (await readdir(dir)).filter((f) => ok.has(extname(f).toLowerCase())).sort();
const photos = files.map((f) => {
  const stem = basename(f, extname(f));
  let date = cache[f];
  if (date === undefined) {
    const orig = originals.find((o) => basename(o, extname(o)) === stem);
    date = (orig && exifDate(join(root, 'originals', orig))) || exifDate(join(dir, f)) || '';
    cache[f] = date;
  }
  return {
    src: 'photos/' + encodeURIComponent(f),
    ...(thumbs.has(f) && { thumb: 'thumbs/' + encodeURIComponent(f) }),
    date,
    // Uten dato: bare navn på formen «03-dim-lit-cafes» blir tittel (eget navn). Kameranavn som IMG_1234 er støy.
    title: date ? pretty(date) : (/^\d{2}[-_ ]/.test(stem) ? stem.replace(/^\d+[-_ ]+/, '').replace(/[-_]+/g, ' ').trim() : '')
  };
}).sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999') || a.src.localeCompare(b.src));

await writeFile(cachePath, JSON.stringify(cache));
await writeFile(join(root, 'site', 'photos.json'), JSON.stringify({ name: config.name, photos }, null, 2));
const withDate = photos.filter((p) => p.date).length;
console.log(`photos.json: ${photos.length} bilder (${withDate} med dato)`);
