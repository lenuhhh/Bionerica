require('dotenv').config()
const express  = require('express')
const cors     = require('cors')
const nodemailer = require('nodemailer')

const app  = express()
const PORT = process.env.PORT || 3001

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:5173'] }))
app.use(express.json())

// ─── Nodemailer transport ──────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

// ─── Helpers ───────────────────────────────────────────────────────────────────
function buildManagerHTML(data) {
  const { categories, products, volume, frequency, client } = data

  const productRows = products.length
    ? products.map(p => `
        <tr>
          <td style="padding:10px 14px;border-bottom:1px solid #e8e3d8">${p.name}</td>
          <td style="padding:10px 14px;border-bottom:1px solid #e8e3d8;color:#6b7c6b">${p.origin || ''}</td>
          <td style="padding:10px 14px;border-bottom:1px solid #e8e3d8;font-weight:600;color:#1a2e1a">${p.priceLabel || p.price}</td>
        </tr>`).join('')
    : `<tr><td colspan="3" style="padding:10px 14px;color:#6b7c6b;font-style:italic">Товары не выбраны</td></tr>`

  return `
<!DOCTYPE html>
<html lang="ru">
<head><meta charset="UTF-8"><title>Новый заказ — Bionerika Agency</title></head>
<body style="margin:0;padding:0;background:#f0ece3;font-family:'Helvetica Neue',Arial,sans-serif">
  <div style="max-width:620px;margin:32px auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(26,46,26,0.1)">

    <!-- Header -->
    <div style="background:#1a2e1a;padding:32px 40px;text-align:center">
      <div style="display:inline-block;background:rgba(255,255,255,0.1);border-radius:10px;padding:8px 16px;margin-bottom:12px">
        <span style="color:#8fba8f;font-size:22px">🌿</span>
        <span style="color:#fff;font-size:17px;font-weight:500;margin-left:8px">Bionerika Agency</span>
      </div>
      <h1 style="color:#fff;font-size:24px;margin:0;font-weight:400">Новый заказ с сайта</h1>
      <p style="color:rgba(255,255,255,0.6);margin:6px 0 0;font-size:14px">${new Date().toLocaleString('ru-RU', { dateStyle:'long', timeStyle:'short' })}</p>
    </div>

    <div style="padding:32px 40px">

      <!-- Client info -->
      <h2 style="font-size:16px;font-weight:600;color:#1a2e1a;margin:0 0 16px;padding-bottom:10px;border-bottom:2px solid #f0ece3">
        👤 Данные клиента
      </h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:28px">
        ${[
          ['Имя',       client.name    || '—'],
          ['Компания',  client.company || '—'],
          ['Email',     client.email   || '—'],
          ['Телефон',   client.phone   || '—'],
          ['Адрес доставки', client.address || '—'],
        ].map(([label, val]) => `
          <tr>
            <td style="padding:8px 0;color:#6b7c6b;font-size:13px;width:140px">${label}</td>
            <td style="padding:8px 0;color:#1a2e1a;font-size:14px;font-weight:500">${val}</td>
          </tr>`).join('')}
      </table>

      <!-- Order details -->
      <h2 style="font-size:16px;font-weight:600;color:#1a2e1a;margin:0 0 16px;padding-bottom:10px;border-bottom:2px solid #f0ece3">
        🛒 Детали заказа
      </h2>

      <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
        <tr>
          <td style="padding:8px 0;color:#6b7c6b;font-size:13px;width:140px">Категории</td>
          <td style="padding:8px 0;color:#1a2e1a;font-size:14px;font-weight:500">${categories.join(', ') || '—'}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#6b7c6b;font-size:13px">Объём</td>
          <td style="padding:8px 0;color:#1a2e1a;font-size:14px;font-weight:500">${volume || '—'}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#6b7c6b;font-size:13px">Частота</td>
          <td style="padding:8px 0;color:#1a2e1a;font-size:14px;font-weight:500">${frequency || '—'}</td>
        </tr>
      </table>

      <!-- Products table -->
      <h3 style="font-size:14px;font-weight:600;color:#1a2e1a;margin:20px 0 10px">Выбранные товары:</h3>
      <table style="width:100%;border-collapse:collapse;background:#f8f5ee;border-radius:12px;overflow:hidden">
        <thead>
          <tr style="background:#e8e3d8">
            <th style="padding:10px 14px;text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#6b7c6b">Товар</th>
            <th style="padding:10px 14px;text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#6b7c6b">Происхождение</th>
            <th style="padding:10px 14px;text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#6b7c6b">Цена</th>
          </tr>
        </thead>
        <tbody>${productRows}</tbody>
      </table>

      <!-- CTA -->
      <div style="background:#f0ece3;border-radius:14px;padding:20px;margin-top:28px;text-align:center">
        <p style="margin:0 0 12px;font-size:14px;color:#1a2e1a;font-weight:500">Свяжитесь с клиентом в течение 30 минут</p>
        <a href="mailto:${client.email}" style="display:inline-block;background:#1a2e1a;color:#fff;padding:12px 28px;border-radius:100px;text-decoration:none;font-size:14px;font-weight:500">
          Ответить клиенту →
        </a>
      </div>

    </div>

    <!-- Footer -->
    <div style="background:#f8f5ee;padding:20px 40px;text-align:center;border-top:1px solid #e8e3d8">
      <p style="margin:0;font-size:12px;color:#6b7c6b">Bionerika Agency — Greenhouse Business · bionerika.agency</p>
    </div>
  </div>
</body>
</html>`
}

function buildClientHTML(data) {
  const { client, categories, products } = data

  const productList = products.length
    ? products.map(p => `<li style="padding:6px 0;color:#1a2e1a;font-size:14px">• ${p.name} — ${p.priceLabel || p.price}</li>`).join('')
    : '<li style="color:#6b7c6b;font-size:14px;padding:6px 0">Товары не уточнены</li>'

  return `
<!DOCTYPE html>
<html lang="ru">
<head><meta charset="UTF-8"><title>Ваш заказ принят — Bionerika Agency</title></head>
<body style="margin:0;padding:0;background:#f0ece3;font-family:'Helvetica Neue',Arial,sans-serif">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(26,46,26,0.1)">

    <div style="background:#1a2e1a;padding:40px;text-align:center">
      <div style="font-size:48px;margin-bottom:12px">📬</div>
      <h1 style="color:#fff;font-size:26px;margin:0;font-weight:400">Заказ принят!</h1>
      <p style="color:rgba(255,255,255,0.7);margin:8px 0 0;font-size:14px">Спасибо, ${client.name || 'за ваш заказ'}!</p>
    </div>

    <div style="padding:36px 40px">
      <p style="font-size:15px;color:#1a2e1a;line-height:1.7;margin:0 0 24px">
        Мы получили ваш заказ и свяжемся с вами <strong>в течение 30 минут</strong>.
        Менеджер уточнит детали и подтвердит доставку.
      </p>

      <div style="background:#f8f5ee;border-radius:14px;padding:24px;margin-bottom:24px">
        <h3 style="font-size:14px;font-weight:600;color:#1a2e1a;margin:0 0 14px;text-transform:uppercase;letter-spacing:0.06em">Ваш заказ</h3>
        <p style="margin:0 0 8px;font-size:13px;color:#6b7c6b">Категории: <span style="color:#1a2e1a;font-weight:500">${categories.join(', ') || '—'}</span></p>
        <ul style="margin:12px 0 0;padding:0;list-style:none">${productList}</ul>
      </div>

      <div style="background:#e8f4e8;border-radius:14px;padding:20px">
        <p style="margin:0;font-size:13px;color:#2d4a2d;line-height:1.6">
          📞 <strong>Контактный номер:</strong> +380 (000) 000-00-00<br>
          ✉️ <strong>Email:</strong> example@gmail.com<br>
          ⏰ <strong>Часы работы:</strong> Пн–Пт 8:00–19:00, Сб 9:00–16:00
        </p>
      </div>
    </div>

    <div style="background:#f8f5ee;padding:20px 40px;text-align:center;border-top:1px solid #e8e3d8">
      <p style="margin:0;font-size:12px;color:#6b7c6b">Bionerika Agency — Greenhouse Business · bionerika.agency</p>
      <p style="margin:4px 0 0;font-size:11px;color:#9baa9b">Это автоматическое письмо, не отвечайте на него.</p>
    </div>
  </div>
</body>
</html>`
}

// ─── POST /api/order ───────────────────────────────────────────────────────────
app.post('/api/order', async (req, res) => {
  try {
    const { categories = [], products = [], volume, frequency, client = {} } = req.body

    // Validation
    if (!client.name || !client.email) {
      return res.status(400).json({ ok: false, error: 'Имя и email обязательны' })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client.email)) {
      return res.status(400).json({ ok: false, error: 'Неверный формат email' })
    }

    const managerEmail = process.env.MANAGER_EMAIL || 'aleksandrsmisko63@gmail.com'

    // 1. Email to manager
    await transporter.sendMail({
      from:    `"Bionerika Agency Site" <${process.env.SMTP_USER}>`,
      to:      managerEmail,
      subject: `🛒 Новый заказ от ${client.name} — Bionerika Agency`,
      html:    buildManagerHTML({ categories, products, volume, frequency, client }),
    })

    // 2. Confirmation email to client
    if (client.email) {
      await transporter.sendMail({
        from:    `"Bionerika Agency" <${process.env.SMTP_USER}>`,
        to:      client.email,
        subject: '✅ Ваш заказ принят — Bionerika Agency',
        html:    buildClientHTML({ client, categories, products }),
      })
    }

    res.json({ ok: true, message: 'Заказ отправлен!' })

  } catch (err) {
    console.error('Mail error:', err)
    res.status(500).json({ ok: false, error: 'Ошибка при отправке письма. Проверьте настройки SMTP.' })
  }
})

// ─── POST /api/contact ─────────────────────────────────────────────────────────
app.post('/api/contact', async (req, res) => {
  try {
    const { name, company, email, phone, subject, message } = req.body

    if (!name || !email || !message) {
      return res.status(400).json({ ok: false, error: 'Имя, email и сообщение обязательны' })
    }

    const managerEmail = process.env.MANAGER_EMAIL || 'aleksandrsmisko63@gmail.com'

    await transporter.sendMail({
      from:    `"Bionerika Agency Site" <${process.env.SMTP_USER}>`,
      to:      managerEmail,
      replyTo: email,
      subject: `📬 Новое сообщение: ${subject || 'Без темы'} — от ${name}`,
      html: `
<!DOCTYPE html>
<html lang="ru">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f0ece3;font-family:'Helvetica Neue',Arial,sans-serif">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(26,46,26,0.1)">
    <div style="background:#1a2e1a;padding:28px 36px">
      <h1 style="color:#fff;font-size:20px;margin:0;font-weight:400">📬 Новое сообщение с сайта</h1>
      <p style="color:rgba(255,255,255,0.6);margin:4px 0 0;font-size:13px">${new Date().toLocaleString('ru-RU', { dateStyle:'long', timeStyle:'short' })}</p>
    </div>
    <div style="padding:28px 36px">
      <table style="width:100%;border-collapse:collapse">
        ${[
          ['Имя',      name],
          ['Компания', company || '—'],
          ['Email',    email],
          ['Телефон',  phone || '—'],
          ['Тема',     subject || '—'],
        ].map(([l,v]) => `
          <tr>
            <td style="padding:7px 0;color:#6b7c6b;font-size:13px;width:110px">${l}</td>
            <td style="padding:7px 0;color:#1a2e1a;font-size:14px;font-weight:500">${v}</td>
          </tr>`).join('')}
      </table>
      <div style="margin-top:20px;background:#f8f5ee;border-radius:12px;padding:18px">
        <p style="margin:0 0 6px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:#6b7c6b">Сообщение</p>
        <p style="margin:0;font-size:14px;color:#1a2e1a;line-height:1.7">${message.replace(/\n/g, '<br>')}</p>
      </div>
      <div style="margin-top:20px;text-align:center">
        <a href="mailto:${email}" style="display:inline-block;background:#1a2e1a;color:#fff;padding:12px 28px;border-radius:100px;text-decoration:none;font-size:14px;font-weight:500">Ответить → ${email}</a>
      </div>
    </div>
    <div style="background:#f8f5ee;padding:16px 36px;text-align:center;border-top:1px solid #e8e3d8">
      <p style="margin:0;font-size:12px;color:#6b7c6b">Bionerika Agency · bionerika.agency</p>
    </div>
  </div>
</body>
</html>`,
    })

    res.json({ ok: true, message: 'Сообщение отправлено!' })

  } catch (err) {
    console.error('Contact mail error:', err)
    res.status(500).json({ ok: false, error: 'Ошибка при отправке. Проверьте настройки SMTP.' })
  }
})

// ─── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }))

app.listen(PORT, () => {
  console.log(`\n🌿 Bionerika Agency API server running on http://localhost:${PORT}`)
  console.log(`   SMTP user:    ${process.env.SMTP_USER || '⚠️  not set (check .env)'}`)
  console.log(`   Manager mail: ${process.env.MANAGER_EMAIL || 'aleksandrsmisko63@gmail.com'}\n`)
})
