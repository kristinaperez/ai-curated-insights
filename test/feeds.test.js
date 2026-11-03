import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFeed, decodeText } from '../src/feeds.js';
import { escapeHtml, formatDraft } from '../src/telegram.js';

test('parses RSS items with CDATA and entities', () => {
  const xml = `<rss><channel><item><title><![CDATA[Gemini &amp; Claude]]></title><link>https://ex.com/a</link><pubDate>Mon, 02 Nov 2026 10:00:00 GMT</pubDate><description>&lt;p&gt;Текст новости&lt;/p&gt;</description></item></channel></rss>`;
  const [it] = parseFeed(xml, 'rss');
  assert.equal(it.title, 'Gemini & Claude');
  assert.equal(it.link, 'https://ex.com/a');
  assert.equal(it.summary, 'Текст новости');
});

test('parses Atom entries and prefers alternate link', () => {
  const xml = `<feed><entry><title>v1.2</title><link rel="alternate" href="https://github.com/o/r/releases/tag/v1.2"/><updated>2026-11-01T00:00:00Z</updated><content>Notes</content></entry></feed>`;
  const [it] = parseFeed(xml, 'atom');
  assert.equal(it.link, 'https://github.com/o/r/releases/tag/v1.2');
  assert.equal(it.published, '2026-11-01T00:00:00Z');
});

test('draft is HTML-escaped and carries the source link', () => {
  const text = formatDraft({ title: 'A < B', text: 'R&D', link: 'https://ex.com' });
  assert.match(text, /ЧЕРНОВИК/);
  assert.match(text, /A &lt; B/);
  assert.match(text, /R&amp;D/);
  assert.match(text, /Источник: https:\/\/ex\.com/);
  assert.equal(escapeHtml('<b>'), '&lt;b&gt;');
});

test('decodeText handles numeric entities', () => {
  assert.equal(decodeText('&#1087;&#1088;&#1080;'), 'при');
});
