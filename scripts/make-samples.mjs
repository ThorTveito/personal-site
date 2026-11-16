// Lager 28 eksempelbilder (SVG) så siden kan prøves før du har egne bilder.
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'site', 'photos');
await mkdir(dir, { recursive: true });
const names = ['dim lit cafes', 'morgenlys', 'tur til fjells', 'bytur', 'sommer', 'kveld', 'venner', 'havet'];
for (let i = 0; i < 28; i++) {
  const w = 600, h = i % 2 ? 800 : 450, hue = (i * 37) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue},50%,${30 + (i % 5) * 7}%)"/><stop offset="1" stop-color="hsl(${hue + 40},55%,${25 + (i % 4) * 9}%)"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`;
  await writeFile(join(dir, `${String(i + 1).padStart(2, '0')}-${names[i % names.length]}.svg`), svg);
}
console.log('28 eksempelbilder laget');
