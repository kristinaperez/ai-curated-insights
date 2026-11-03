import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const MAX_SEEN = 2000;

/** Ссылки, которые уже опубликованы: защита от повторов между запусками. */
export async function loadSeen(path) {
  try {
    return new Set(JSON.parse(await readFile(path, 'utf8')));
  } catch {
    return new Set();
  }
}

export async function saveSeen(path, seen) {
  await mkdir(dirname(path), { recursive: true });
  const list = [...seen].slice(-MAX_SEEN);
  await writeFile(path, JSON.stringify(list, null, 2));
}
