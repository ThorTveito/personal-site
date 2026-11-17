// Leser config.json (kan ligge i git) og legger privat config.local.json oppå (ignorert av git).
// Legg Drive-mappe-ID og dokument-ID i config.local.json, ikke i config.json.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

// I GitHub Actions finnes ikke config.local.json. Der kommer ID-ene fra miljøvariabler (repo-secrets).
export async function loadConfig(root) {
  const base = JSON.parse(await readFile(join(root, 'config.json'), 'utf8'));
  let local = {};
  try { local = JSON.parse(await readFile(join(root, 'config.local.json'), 'utf8')); } catch {}
  const env = {
    ...(process.env.DRIVE_FOLDER_ID && { driveFolderId: process.env.DRIVE_FOLDER_ID }),
    ...(process.env.GOOGLE_DOC_ID && { docId: process.env.GOOGLE_DOC_ID }),
  };
  return { ...base, ...local, ...env };
}
