// Разбор RSS 2.0 и Atom без внешних зависимостей.

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'", nbsp: ' ' };

export function decodeText(raw = '') {
  return raw
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(#\d+|#x[\da-f]+|\w+);/gi, (m, name) => {
      if (name[0] === '#') {
        const code = name[1].toLowerCase() === 'x' ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : m;
      }
      return ENTITIES[name.toLowerCase()] ?? m;
    })
    .replace(/<[^>]+>/g, ' ') // экранированный HTML внутри описания
    .replace(/\s+/g, ' ')
    .trim();
}

function tag(block, name) {
  const m = block.match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}>`, 'i'));
  return m ? m[1] : '';
}

function atomLink(block) {
  const links = [...block.matchAll(/<link\b([^>]*)\/?>/gi)].map((m) => m[1]);
  const alt = links.find((attrs) => !/rel="(?!alternate)/i.test(attrs) && /href="/i.test(attrs)) ?? links.find((a) => /href="/i.test(a));
  const href = alt?.match(/href="([^"]+)"/i);
  return href ? decodeText(href[1]) : '';
}

/**
 * Возвращает элементы фида: { title, link, published, summary }.
 * Поддерживает <item> (RSS) и <entry> (Atom).
 */
export function parseFeed(xml, format) {
  const isAtom = format === 'atom' || /<feed\b/i.test(xml);
  const re = isAtom ? /<entry\b[^>]*>([\s\S]*?)<\/entry>/gi : /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
  const items = [];
  for (const m of xml.matchAll(re)) {
    const block = m[1];
    const link = isAtom ? atomLink(block) : decodeText(tag(block, 'link'));
    const title = decodeText(tag(block, 'title'));
    const summary = decodeText(tag(block, 'summary') || tag(block, 'description') || tag(block, 'content'));
    const published = decodeText(tag(block, 'published') || tag(block, 'updated') || tag(block, 'pubDate'));
    if (link && title) items.push({ title, link, published, summary });
  }
  return items;
}
