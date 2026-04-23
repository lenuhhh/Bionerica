/**
 * Telegram Bot Service — Bionerika Agency Chat
 *
 * ── КАК РАБОТАЕТ ────────────────────────────────────────────────────────────
 * 1. Клиент пишет на сайте → сообщение уходит боту в Telegram
 * 2. Менеджер видит сообщение в Telegram и отвечает
 * 3. Сайт каждые 3 сек опрашивает бота (getUpdates) → ответ появляется в чате
 *
 * ── НАСТРОЙКА БОТА (3 минуты) ───────────────────────────────────────────────
 * 1. Откройте Telegram → найдите @BotFather
 * 2. Напишите: /newbot
 * 3. Придумайте имя: Bionerika Agency Bot
 * 4. Придумайте username: greenregion_support_bot (уникальный, на _bot)
 * 5. BotFather даст вам BOT_TOKEN — скопируйте его ниже
 *
 * 6. Узнать CHAT_ID (куда бот будет слать сообщения):
 *    а) Напишите вашему боту любое сообщение в Telegram
 *    б) Откройте в браузере:
 *       https://api.telegram.org/bot<ВАШ_TOKEN>/getUpdates
 *    в) В ответе найдите "chat":{"id": XXXXXXX} — это ваш CHAT_ID
 *
 * 7. Вставьте оба значения ниже
 */

export const TG_BOT_TOKEN = 'YOUR_BOT_TOKEN'   // от @BotFather, формат: 123456:ABC-xxx
export const TG_CHAT_ID   = 'YOUR_CHAT_ID'     // ваш Telegram chat ID (число)

const BASE = `https://api.telegram.org/bot${TG_BOT_TOKEN}`

/** Отправить сообщение менеджеру в Telegram */
export async function tgSend(text) {
  if (!TG_BOT_TOKEN || TG_BOT_TOKEN === 'YOUR_BOT_TOKEN') return { ok: false, error: 'Telegram не настроен' }
  try {
    const r = await fetch(`${BASE}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TG_CHAT_ID, text, parse_mode: 'HTML' }),
    })
    const d = await r.json()
    return d.ok ? { ok: true } : { ok: false, error: d.description }
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

/**
 * Получить новые сообщения из Telegram (polling)
 * offset — ID последнего обработанного update
 */
export async function tgGetUpdates(offset = 0) {
  if (!TG_BOT_TOKEN || TG_BOT_TOKEN === 'YOUR_BOT_TOKEN') return []
  try {
    const r = await fetch(`${BASE}/getUpdates?offset=${offset}&timeout=2&allowed_updates=["message"]`)
    const d = await r.json()
    if (!d.ok) return []
    return d.result || []
  } catch {
    return []
  }
}

/** Уведомление о новом чате (первое сообщение) */
export async function notifyNewChat({ sessionId, message }) {
  const text = [
    '🌿 <b>Bionerika Agency — новый чат</b>',
    `🆔 Сессия: <code>${sessionId}</code>`,
    `📅 ${new Date().toLocaleString('ru-RU')}`,
    '',
    `💬 <b>Сообщение клиента:</b>`,
    message,
    '',
    '<i>Ответьте в этот чат — клиент увидит ваш ответ на сайте.</i>',
  ].join('\n')
  return tgSend(text)
}

/** Пересылка сообщения клиента в Telegram */
export async function forwardMessage({ message, sessionId }) {
  const text = `💬 <b>Клиент [${sessionId.slice(-6)}]:</b>\n${message}`
  return tgSend(text)
}
