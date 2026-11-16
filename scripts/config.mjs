// Leser config.json (kan ligge i git) og legger privat config.local.json oppå (ignorert av git).
// Legg Drive-mappe-ID og dokument-ID i config.local.json, ikke i config.json.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function loadConfig(root) {
  const base = JSON.parse(await readFile(join(root, 'config.json'), 'utf8'));
  try {
    return { ...base, ...JSON.parse(await readFile(join(root, 'config.local.json'), 'utf8')) };
  } catch { return base; }
}
