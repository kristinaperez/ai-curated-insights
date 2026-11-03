export function escapeHtml(s = '') {
  return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
}

/** Текст черновика для проверки: заголовок, короткий пересказ и ссылка на источник. */
export function formatDraft({ title, text, link }) {
  return [
    '🧪 <b>ЧЕРНОВИК на проверку</b>',
    '',
    `<b>${escapeHtml(title)}</b>`,
    '',
    escapeHtml(text),
    '',
    `Источник: ${escapeHtml(link)}`,
  ].join('\n');
}

export async function sendMessage({ token, chatId, text, fetchImpl = fetch }) {
  const res = await fetchImpl(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: false }),
    signal: AbortSignal.timeout(15000),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.ok) throw new Error(`Telegram ${res.status}: ${body.description ?? 'unknown error'}`);
  return body.result;
}
