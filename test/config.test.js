import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('publishing disabled by default', () => {
  assert.notEqual(process.env.PUBLISH_ENABLED, 'true');
});

test('sources config has no X entries', async () => {
  const cfg = JSON.parse(await readFile(new URL('../config/sources.json', import.meta.url), 'utf8'));
  for (const f of cfg.feeds) assert.doesNotMatch(f.url, /(^|\/\/)(x|twitter)\.com/);
});
