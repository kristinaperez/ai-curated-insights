import OpenAI from 'openai';
import { readFile } from 'node:fs/promises';
import { parseFeed } from './feeds.js';
import { formatDraft, sendMessage } from './telegram.js';
import { loadSeen, saveSeen } from './state.js';
import { summarize } from './summarize.js';

const config = JSON.parse(await readFile(new URL('../config/sources.json', import.meta.url), 'utf8'));
const publish = process.env.PUBLISH_ENABLED === 'true';
const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;
const statePath = process.env.STATE_PATH || 'state/seen.json';
const maxPerRun = Number(process.env.MAX_PER_RUN || 3);

if (publish && (!token || !chatId)) throw Error('PUBLISH_ENABLED=true требует TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID');

// 1. Сбор кандидатов из фидов
const items = [];
for (const feed of config.feeds) {
  try {
    const r = await fetch(feed.url, { signal: AbortSignal.timeout(15000), headers: { 'user-agent': 'ai-curated-insights/1.0' } });
    if (!r.ok) throw Error('HTTP ' + r.status);
    for (const it of parseFeed(await r.text(), feed.format)) items.push({ ...it, source: feed.name });
  } catch (e) {
    console.error('FEED_ERROR', feed.name, e.message);
  }
}
const time = (s) => Date.parse(s) || 0;
items.sort((a, b) => time(b.published) - time(a.published));

// 2. Отбрасываем уже обработанные ссылки
const seen = await loadSeen(statePath);
const fresh = items.filter((it) => !seen.has(it.link));
console.log(`Candidates ${items.length}, new ${fresh.length}`);

if (!process.env.OPENAI_API_KEY) {
  console.log('No API key; preview only');
  process.exit(0);
}

// 3. Пересказ и отправка
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
let done = 0;
for (const item of fresh) {
  if (done >= maxPerRun) break;
  try {
    const s = await summarize({ client, model, item });
    seen.add(item.link);
    if (!s.relevant) continue;
    const text = formatDraft({ title: s.title, text: s.text, link: item.link });
    if (publish) {
      await sendMessage({ token, chatId, text });
      console.log('SENT', item.link);
    } else {
      console.log('PREVIEW\n' + text);
    }
    done++;
  } catch (e) {
    console.error('ITEM_ERROR', item.link, e.message);
  }
}

if (publish) await saveSeen(statePath, seen);
