# ⚙️ Настройка Bionerika Agency — 2 сервиса

---

## 📧 EmailJS (заказы + контакт-форма) — 1 шаблон

### Шаг 1 — Регистрация
→ https://www.emailjs.com → Sign Up Free

### Шаг 2 — Подключить Gmail
Email Services → Add New Service → Gmail → aleksandrsmisko63@gmail.com  
Запишите **Service ID** (например: `service_abc123`)

### Шаг 3 — Создать ОДИН шаблон
Email Templates → Create New Template:

| Поле | Значение |
|------|----------|
| Subject | `{{subject_line}}` |
| To Email | `aleksandrsmisko63@gmail.com` |
| Reply To | `{{reply_to}}` |
| Тело (Body) | `{{message_body}}` |

Сохраните → запишите **Template ID** (например: `template_abc123`)

### Шаг 4 — Public Key
Account → General → скопируйте **Public Key**

### Шаг 5 — Вставить в проект
Откройте `src/services/emailService.js`:
```js
export const EMAILJS_PUBLIC_KEY  = 'gCX5liVFM2bUmyRK5'
export const EMAILJS_SERVICE_ID  = 'service_irxigdj'
export const EMAILJS_TEMPLATE_ID = 'template_4lmqzaa'
```

✅ Готово! Заказы и контактная форма будут приходить на вашу почту.

---

## 💬 Telegram Bot (чат на сайте)

### Шаг 1 — Создать бота
1. Откройте Telegram → найдите **@BotFather**
2. Напишите: `/newbot`
3. Имя бота: `Bionerika Agency Support`
4. Username: `greenregion_support_bot` (придумайте уникальный, должен заканчиваться на `_bot`)
5. BotFather пришлёт **Token** вида: `123456789:ABCdefGhIJKlmNoPQRstUVwxyZ`

### Шаг 2 — Узнать Chat ID
1. Найдите своего бота в Telegram (по username)
2. Напишите ему любое сообщение, например: `Привет`
3. Откройте в браузере (замените TOKEN на ваш):
   ```
   https://api.telegram.org/botТОКЕН/getUpdates
   ```
4. Найдите в ответе: `"chat":{"id": 123456789}` — это ваш **Chat ID**

### Шаг 3 — Вставить в проект
Откройте `src/services/telegramService.js`:
```js
export const TG_BOT_TOKEN = '8676821517:AAFLX3y2rn8JNf1YtJG-VJutYhzb2Hw-b8g'
export const TG_CHAT_ID   = '-1003809728960'
```

### Как работает чат

```
Клиент пишет на сайте
        ↓
Сообщение уходит боту в Telegram
        ↓
Вы отвечаете в Telegram (просто ответьте на сообщение бота)
        ↓
Сайт опрашивает бота каждые 3 секунды
        ↓
Ваш ответ появляется в чате на сайте
```

**Важно:** отвечайте в тот же чат с ботом. Ваш ответ должен быть обычным текстом (без команд `/`).

---

## 🚀 Запуск

```bash
cd greenregion
npm install
npm run dev      # разработка → http://localhost:3000
npm run build    # продакшн сборка
```

---

## Лимиты EmailJS (бесплатный план)
| | |
|-|-|
| Писем/месяц | 200 |
| Шаблонов | 2 (используем 1) |
| Сервисов | 2 |

Для 200+ писем → план Personal, $15/мес.
