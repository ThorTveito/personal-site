// Gjør bildene klare for nettet: HEIC (iPhone) og store bilder blir JPEG, maks 1600 px.
// Originalene flyttes til originals/ (utenfor site/, så de ikke publiseres).
// Krever ImageMagick (kommandoen `convert` eller `magick`) med HEIC-støtte.
import { readdir, stat, mkdir, rename, rm } from 'node:fs/promises';
import { join, extname, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'site', 'photos');
const orig = join(root, 'originals');
await mkdir(orig, { recursive: true });

function tool() {
  for (const t of ['magick', 'convert']) {
    try { execFileSync(t, ['-version'], { stdio: 'ignore' }); return t; } catch {}
  }
  return null;
}
const im = tool();
const heic = new Set(['.heic', '.heif']);
const big = new Set(['.jpg', '.jpeg', '.png', '.webp']);
let done = 0, skipped = 0;

for (const f of await readdir(dir)) {
  const ext = extname(f).toLowerCase();
  const path = join(dir, f);
  const size = (await stat(path)).size;
  let needs = heic.has(ext);
  if (!needs && big.has(ext) && size > 500 * 1024 && im) {
    // Bare bilder som faktisk er større enn 1600 px behandles (ikke de som allerede er minsket).
    try {
      const [w, h] = execFileSync(im === 'magick' ? 'magick' : 'identify', [...(im === 'magick' ? ['identify'] : []), '-format', '%w %h', path + '[0]'], { stdio: 'pipe' }).toString().trim().split(' ').map(Number);
      needs = Math.max(w, h) > 1700;
    } catch {}
  }
  if (!needs) continue;
  if (!im) { console.error('ImageMagick mangler (magick/convert). Installer den for å konvertere HEIC.'); process.exit(1); }
  const out = join(dir, basename(f, extname(f)) + '.jpg');
  const tmp = join(dir, '.tmp-' + basename(f, extname(f)) + '.jpg');
  try {
    execFileSync(im, [path + '[0]', '-auto-orient', '-resize', '1600x1600>', '-strip', '-quality', '82', tmp], { stdio: 'pipe' });
  } catch (e) {
    console.warn('Hoppet over', f, '(kunne ikke konvertere)');
    await rm(tmp, { force: true });
    skipped++; continue;
  }
  await rename(path, join(orig, f));
  await rename(tmp, out);
  done++;
}
// Små miniatyrer (maks 640 px) til 3D-rommet, så siden laster og tegner raskt.
const thumbs = join(root, 'site', 'thumbs');
await mkdir(thumbs, { recursive: true });
let made = 0;
const have = new Set(await readdir(thumbs));
for (const f of await readdir(dir)) {
  const ext = extname(f).toLowerCase();
  if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext) || have.has(f) || f.startsWith('.')) continue;
  if (!im) break;
  try {
    execFileSync(im, [join(dir, f) + '[0]', '-auto-orient', '-resize', '640x640>', '-strip', '-quality', '75', join(thumbs, f)], { stdio: 'pipe' });
    made++;
  } catch { console.warn('Ingen miniatyr for', f); }
}
console.log(`optimize: ${made} miniatyrer laget`);
console.log(`optimize: ${done} bilder konvertert/minsket${skipped ? `, ${skipped} hoppet over` : ''}`);
