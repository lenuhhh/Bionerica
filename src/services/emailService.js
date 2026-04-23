/**
 * Email Service — Bionerika Agency
 * Styled HTML emails via EmailJS
 *
 * EmailJS TEMPLATE — Content field (HTML):
 *   {{{message_body}}}          ← triple curly braces = HTML is NOT escaped!
 *
 * Subject: {{subject_line}}
 * To Email: {{to_email}}
 * Reply To: {{reply_to}}
 * Content:  {{{message_body}}}   ← IMPORTANT: three braces, not two!
 */

export const EMAILJS_PUBLIC_KEY  = 'gCX5liVFM2bUmyRK5'
export const EMAILJS_SERVICE_ID  = 'service_irxigdj'
export const EMAILJS_TEMPLATE_ID = 'template_4lmqzaa'

let ready = false
async function loadEmailJS() {
  if (ready) return
  await new Promise((res, rej) => {
    const s = document.createElement('script')
    s.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js'
    s.onload = () => { window.emailjs.init(EMAILJS_PUBLIC_KEY); ready = true; res() }
    s.onerror = () => rej(new Error('Failed to load EmailJS'))
    document.head.appendChild(s)
  })
}

async function send(subjectLine, htmlBody, replyTo, toEmail) {
  try {
    await loadEmailJS()
    const params = {
      subject_line: subjectLine,
      message_body: htmlBody,
      reply_to:     replyTo || 'noreply@bionerika.agency',
    }
    if (toEmail) params.to_email = toEmail
    const r = await window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, params)
    return r.status === 200 ? { ok: true } : { ok: false, error: r.text }
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

const MANAGER_EMAIL = 'aleksandrsmisko63@gmail.com'

/* ══════════════════════════════════════════════════════════════════════════
   МЕНЕДЖЕРСКОЕ ПИСЬМО — детали заказа для менеджера
══════════════════════════════════════════════════════════════════════════ */
function buildManagerHtml({ orderId, date, name, email, phone, address, items, total, comment }) {
  const rows = [
    ['👤 Ім\'я',        name],
    ['✉️ Email',      '<a href="mailto:' + email + '" style="color:#4a7c59;text-decoration:none">' + email + '</a>'],
    ['📞 Телефон',    phone],
    ['📍 Адреса',      address || '—'],
    ['📦 Товари',     items],
    ...(comment ? [['💬 Коментар', comment]] : []),
  ]
  const rowsHtml = rows.map(([label, value]) => `
    <tr>
      <td style="padding:11px 14px;background:#f6f9f6;border-bottom:1px solid #ecf0ec;width:115px;
        font-family:Arial,sans-serif;font-size:10px;font-weight:700;color:#7a9480;
        text-transform:uppercase;letter-spacing:.07em;vertical-align:top;white-space:nowrap;">${label}</td>
      <td style="padding:11px 16px;border-bottom:1px solid #ecf0ec;font-family:Arial,sans-serif;
        font-size:13px;color:#1a2e1a;vertical-align:top;line-height:1.55;">${value}</td>
    </tr>`).join('')

  return `<!DOCTYPE html>
<html lang="uk">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<style>
@media only screen and (max-width:600px){
  .w{padding:0!important} .c{border-radius:0!important;width:100%!important}
  .hp{padding:18px 16px!important} .mp{padding:14px 16px!important}
  .sp{padding:16px!important} .sb{padding:0 16px 18px!important}
  .rr td{display:block!important;text-align:center!important;padding:6px 0!important;width:100%!important}
  .fr td{display:block!important;text-align:center!important;padding:2px 0!important}
  .oi{font-size:12px!important;padding:8px 16px!important}
}
</style>
</head>
<body style="margin:0;padding:0;background:#eaf0ea;">
<table width="100%" cellpadding="0" cellspacing="0" class="w" style="background:#eaf0ea;padding:20px 0;">
<tr><td align="center" width="100%">
<table width="100%" cellpadding="0" cellspacing="0" class="c" style="max-width:640px;width:100%;background:#fff;border-radius:20px;box-shadow:0 6px 40px rgba(26,46,26,.14);">

  <!-- HEADER -->
  <tr>
    <td class="hp" bgcolor="#162614" style="background:linear-gradient(135deg,#162614 0%,#243e27 60%,#2e5035 100%);padding:22px 28px;">
      <table cellpadding="0" cellspacing="0" width="100%" class="rr"><tr>
        <td style="vertical-align:middle;">
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="width:42px;height:42px;background:rgba(255,255,255,.13);border-radius:12px;text-align:center;vertical-align:middle;">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style="display:block;margin:10px auto;">
                <path d="M12 2C6 2 3 7 3 12c0 3 1.5 5.5 4 7M12 2c6 0 9 5 9 10 0 3-1.5 5.5-4 7M12 2v20M7 7c2 1 4 3 5 5M17 7c-2 1-4 3-5 5" stroke="#8fba8f" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </td>
            <td style="padding-left:12px;vertical-align:middle;">
              <div style="font-family:Arial,sans-serif;font-size:16px;font-weight:700;color:#fff;letter-spacing:-.01em;">Bionerika Agency</div>
              <div style="font-family:Arial,sans-serif;font-size:10px;color:rgba(255,255,255,.4);margin-top:1px;letter-spacing:.04em;">система сповіщень</div>
            </td>
          </tr></table>
        </td>
        <td align="right" style="vertical-align:middle;">
          <span style="display:inline-block;background:linear-gradient(135deg,#d4701a,#b05010);color:#fff;border-radius:50px;padding:6px 16px;font-family:Arial,sans-serif;font-size:9px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;">🛒 НОВЕ ЗАМОВЛЕННЯ</span>
        </td>
      </tr></table>
    </td>
  </tr>

  <!-- ORDER META -->
  <tr>
    <td class="mp" bgcolor="#243e27" style="background:linear-gradient(90deg,#243e27,#2e5035);padding:18px 28px;">
      <table cellpadding="0" cellspacing="0" width="100%" class="rr"><tr>
        <td style="vertical-align:middle;">
          <div style="font-family:Georgia,serif;font-size:23px;font-weight:400;color:#fff;line-height:1.25;">Замовлення від <em style="font-style:italic;color:#a8d8a8;">${name}</em></div>
          <div style="font-family:Arial,sans-serif;font-size:11px;color:rgba(255,255,255,.45);margin-top:5px;">${date}</div>
        </td>
        <td align="right" style="vertical-align:middle;padding-left:14px;white-space:nowrap;">
          <div style="font-family:Arial,sans-serif;font-size:9px;color:rgba(255,255,255,.45);letter-spacing:.1em;text-align:right;margin-bottom:3px;text-transform:uppercase;">Сума</div>
          <div style="font-family:Georgia,serif;font-size:28px;font-weight:700;color:#fff;">${total}</div>
        </td>
      </tr></table>
    </td>
  </tr>

  <!-- ORDER ID -->
  <tr>
    <td class="oi" style="background:#f4f8f4;padding:9px 28px;border-bottom:2px solid #e8eee8;">
      <span style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;color:#7a9480;letter-spacing:.1em;text-transform:uppercase;">Номер замовлення: </span>
      <span style="font-family:'Courier New',monospace;font-size:13px;font-weight:700;color:#243e27;background:#d8ecd8;border-radius:6px;padding:2px 10px;letter-spacing:.05em;">${orderId}</span>
    </td>
  </tr>

  <!-- CLIENT INFO -->
  <tr><td class="sp" style="padding:20px 28px 0;">
    <div style="font-family:Arial,sans-serif;font-size:9px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#9aaa9a;margin-bottom:10px;">▸ ДАНІ КЛІЄНТА</div>
  </td></tr>
  <tr><td class="sb" style="padding:0 28px 22px;">
    <table cellpadding="0" cellspacing="0" width="100%" style="border-radius:12px;overflow:hidden;border:1.5px solid #e8eee8;">
      ${rowsHtml}
    </table>
  </td></tr>

  <!-- REPLY CTA -->
  <tr>
    <td style="background:#f4f8f4;padding:18px 28px;border-top:1px solid #dce8dc;">
      <table cellpadding="0" cellspacing="0" width="100%" class="rr"><tr>
        <td style="vertical-align:middle;">
          <div style="font-family:Arial,sans-serif;font-size:13px;color:#4a6a4a;line-height:1.65;">
            Відповідіть на цей лист, щоб написати клієнту:<br>
            <strong style="color:#1a2e1a;">${email}</strong>
          </div>
        </td>
        <td align="right" style="vertical-align:middle;padding-left:14px;white-space:nowrap;">
          <a href="mailto:${email}?subject=${orderId}" style="display:inline-block;background:linear-gradient(135deg,#1a2e1a,#2e5035);color:#fff;text-decoration:none;border-radius:50px;padding:11px 22px;font-family:Arial,sans-serif;font-size:12px;font-weight:700;">↩ Відповісти клієнту</a>
        </td>
      </tr></table>
    </td>
  </tr>

  <!-- FOOTER -->
  <tr>
    <td bgcolor="#162614" style="background:#162614;padding:13px 28px;border-radius:0 0 20px 20px;">
      <table cellpadding="0" cellspacing="0" width="100%" class="fr"><tr>
        <td style="font-family:Arial,sans-serif;font-size:10px;color:rgba(255,255,255,.34);">🌿 Bionerika Agency — свіжі продукти з теплиці</td>
        <td align="right" style="font-family:Arial,sans-serif;font-size:10px;color:rgba(255,255,255,.24);">Пн–Пт 8:00–19:00</td>
      </tr></table>
    </td>
  </tr>

</table></td></tr></table>
</body></html>`
}

/* ══════════════════════════════════════════════════════════════════════════
   ПИСЬМО ЗАКАЗЧИКУ — подтверждение заказа для покупателя
══════════════════════════════════════════════════════════════════════════ */
function buildClientHtml({ orderId, date, name, email, phone, address, items, total, comment }) {
  const rows = [
    ['✅ Статус',    'Замовлення прийнято та обробляється'],
    ['📦 Товари',   items],
    ['💰 Сума',     total],
    ['📞 Телефон',  phone],
    ['📍 Адреса',   address || 'Уточнимо при підтвердженні'],
    ...(comment ? [['💬 Коментар', comment]] : []),
  ]
  const rowsHtml = rows.map(([label, value]) => `
    <tr>
      <td style="padding:11px 14px;background:#f6f9f6;border-bottom:1px solid #ecf0ec;width:115px;
        font-family:Arial,sans-serif;font-size:10px;font-weight:700;color:#7a9480;
        text-transform:uppercase;letter-spacing:.07em;vertical-align:top;white-space:nowrap;">${label}</td>
      <td style="padding:11px 16px;border-bottom:1px solid #ecf0ec;font-family:Arial,sans-serif;
        font-size:13px;color:#1a2e1a;vertical-align:top;line-height:1.55;">${value}</td>
    </tr>`).join('')

  return `<!DOCTYPE html>
<html lang="uk">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<style>
@media only screen and (max-width:600px){
  .w{padding:0!important} .c{border-radius:0!important;width:100%!important}
  .hp{padding:18px 16px!important} .mp{padding:14px 16px!important}
  .sp{padding:16px!important} .sb{padding:0 16px 18px!important}
  .rr td{display:block!important;text-align:center!important;padding:6px 0!important;width:100%!important}
  .fr td{display:block!important;text-align:center!important;padding:2px 0!important}
  .oi{font-size:12px!important;padding:8px 16px!important}
}
</style>
</head>
<body style="margin:0;padding:0;background:#eaf0ea;">
<table width="100%" cellpadding="0" cellspacing="0" class="w" style="background:#eaf0ea;padding:20px 0;">
<tr><td align="center" width="100%">
<table width="100%" cellpadding="0" cellspacing="0" class="c" style="max-width:640px;width:100%;background:#fff;border-radius:20px;box-shadow:0 6px 40px rgba(26,46,26,.14);">

  <!-- HEADER -->
  <tr>
    <td class="hp" bgcolor="#162614" style="background:linear-gradient(135deg,#162614 0%,#243e27 60%,#2e5035 100%);padding:22px 28px;">
      <table cellpadding="0" cellspacing="0" width="100%" class="rr"><tr>
        <td style="vertical-align:middle;">
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="width:42px;height:42px;background:rgba(255,255,255,.13);border-radius:12px;text-align:center;vertical-align:middle;">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style="display:block;margin:10px auto;">
                <path d="M12 2C6 2 3 7 3 12c0 3 1.5 5.5 4 7M12 2c6 0 9 5 9 10 0 3-1.5 5.5-4 7M12 2v20M7 7c2 1 4 3 5 5M17 7c-2 1-4 3-5 5" stroke="#8fba8f" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </td>
            <td style="padding-left:12px;vertical-align:middle;">
              <div style="font-family:Arial,sans-serif;font-size:16px;font-weight:700;color:#fff;letter-spacing:-.01em;">Bionerika Agency</div>
              <div style="font-family:Arial,sans-serif;font-size:10px;color:rgba(255,255,255,.4);margin-top:1px;letter-spacing:.04em;">система сповіщень</div>
            </td>
          </tr></table>
        </td>
        <td align="right" style="vertical-align:middle;">
          <span style="display:inline-block;background:linear-gradient(135deg,#4a7c59,#2d5a3a);color:#fff;border-radius:50px;padding:6px 16px;font-family:Arial,sans-serif;font-size:9px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;">✅ ЗАМОВЛЕННЯ</span>
        </td>
      </tr></table>
    </td>
  </tr>

  <!-- ORDER META -->
  <tr>
    <td class="mp" bgcolor="#243e27" style="background:linear-gradient(90deg,#243e27,#2e5035);padding:18px 28px;">
      <table cellpadding="0" cellspacing="0" width="100%" class="rr"><tr>
        <td style="vertical-align:middle;">
          <div style="font-family:Georgia,serif;font-size:23px;font-weight:400;color:#fff;line-height:1.25;">Замовлення прийнято, <em style="font-style:italic;color:#a8d8a8;">${name}</em>!</div>
          <div style="font-family:Arial,sans-serif;font-size:11px;color:rgba(255,255,255,.45);margin-top:5px;">${date}</div>
        </td>
        <td align="right" style="vertical-align:middle;padding-left:14px;white-space:nowrap;">
          <div style="font-family:Arial,sans-serif;font-size:9px;color:rgba(255,255,255,.45);letter-spacing:.1em;text-align:right;margin-bottom:3px;text-transform:uppercase;">Сума</div>
          <div style="font-family:Georgia,serif;font-size:28px;font-weight:700;color:#fff;">${total}</div>
        </td>
      </tr></table>
    </td>
  </tr>

  <!-- ORDER ID -->
  <tr>
    <td class="oi" style="background:#f4f8f4;padding:9px 28px;border-bottom:2px solid #e8eee8;">
      <span style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;color:#7a9480;letter-spacing:.1em;text-transform:uppercase;">Номер замовлення: </span>
      <span style="font-family:'Courier New',monospace;font-size:13px;font-weight:700;color:#243e27;background:#d8ecd8;border-radius:6px;padding:2px 10px;letter-spacing:.05em;">${orderId}</span>
    </td>
  </tr>

  <!-- ORDER DETAILS -->
  <tr><td class="sp" style="padding:20px 28px 0;">
    <div style="font-family:Arial,sans-serif;font-size:9px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#9aaa9a;margin-bottom:10px;">▸ ДЕТАЛІ ЗАМОВЛЕННЯ</div>
  </td></tr>
  <tr><td class="sb" style="padding:0 28px 22px;">
    <table cellpadding="0" cellspacing="0" width="100%" style="border-radius:12px;overflow:hidden;border:1.5px solid #e8eee8;">
      ${rowsHtml}
    </table>
  </td></tr>

  <!-- WHAT NEXT -->
  <tr>
    <td style="background:#f4f8f4;padding:18px 28px;border-top:1px solid #dce8dc;">
      <table cellpadding="0" cellspacing="0" width="100%" class="rr"><tr>
        <td style="vertical-align:middle;">
          <div style="font-family:Arial,sans-serif;font-size:13px;color:#4a6a4a;line-height:1.65;">
            Наш менеджер зателефонує на<br>
            <strong style="color:#1a2e1a;">${phone}</strong> для підтвердження доставки
          </div>
        </td>
        <td align="right" style="vertical-align:middle;padding-left:14px;white-space:nowrap;">
          <a href="mailto:${MANAGER_EMAIL}" style="display:inline-block;background:linear-gradient(135deg,#1a2e1a,#2e5035);color:#fff;text-decoration:none;border-radius:50px;padding:11px 22px;font-family:Arial,sans-serif;font-size:12px;font-weight:700;">✉️ Написати нам</a>
        </td>
      </tr></table>
    </td>
  </tr>

  <!-- FOOTER -->
  <tr>
    <td bgcolor="#162614" style="background:#162614;padding:13px 28px;border-radius:0 0 20px 20px;">
      <table cellpadding="0" cellspacing="0" width="100%" class="fr"><tr>
        <td style="font-family:Arial,sans-serif;font-size:10px;color:rgba(255,255,255,.34);">🌿 Bionerika Agency — свіжі продукти з теплиці</td>
        <td align="right" style="font-family:Arial,sans-serif;font-size:10px;color:rgba(255,255,255,.24);">Пн–Пт 8:00–19:00</td>
      </tr></table>
    </td>
  </tr>

</table></td></tr></table>
</body></html>`
}

/* ══════════════════════════════════════════════════════════════════════════
   ПИСЬМО ОБ ОБРАЩЕНИИ — для менеджера о форме обратной связи
══════════════════════════════════════════════════════════════════════════ */
function buildContactHtml({ date, name, email, phone, company, subject, message }) {
  const infoRows = [
    ['👤 Ім\'я',       name],
    ['✉️ Email',     '<a href="mailto:' + email + '" style="color:#4a7c59;text-decoration:none;">' + email + '</a>'],
    ...(phone   ? [['📞 Телефон', phone]]    : []),
    ...(company ? [['🏢 Компанія', company]] : []),
    ['📋 Тема',      subject || 'Без теми'],
  ].map(([l, v]) => `
    <tr>
      <td style="padding:10px 14px;background:#f6f9f6;border-bottom:1px solid #ecf0ec;width:110px;font-family:Arial,sans-serif;font-size:9px;font-weight:700;color:#7a9480;text-transform:uppercase;letter-spacing:.07em;vertical-align:top;white-space:nowrap;">${l}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #ecf0ec;font-family:Arial,sans-serif;font-size:13px;color:#1a2e1a;vertical-align:top;">${v}</td>
    </tr>`).join('')

  return `<!DOCTYPE html>
<html lang="uk">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<style>
@media only screen and (max-width:600px){
  .w{padding:0!important} .c{border-radius:0!important;width:100%!important}
  .hp{padding:18px 16px!important} .mp{padding:14px 16px!important}
  .sb{padding:0 16px 18px!important} .sp{padding:16px 16px 0!important}
  .rr td{display:block!important;text-align:center!important;padding:6px 0!important;width:100%!important}
  .fr td{display:block!important;text-align:center!important;padding:2px 0!important}
}
</style>
</head>
<body style="margin:0;padding:0;background:#eaf0ea;">
<table width="100%" cellpadding="0" cellspacing="0" class="w" style="background:#eaf0ea;padding:20px 0;">
<tr><td align="center" width="100%">
<table width="100%" cellpadding="0" cellspacing="0" class="c" style="max-width:640px;width:100%;background:#fff;border-radius:20px;box-shadow:0 6px 40px rgba(26,46,26,.14);">

  <!-- HEADER -->
  <tr>
    <td class="hp" bgcolor="#162614" style="background:linear-gradient(135deg,#162614,#243e27,#2e5035);padding:22px 28px;">
      <table cellpadding="0" cellspacing="0" width="100%" class="rr"><tr>
        <td style="vertical-align:middle;">
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="width:42px;height:42px;background:rgba(255,255,255,.13);border-radius:12px;text-align:center;vertical-align:middle;">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style="display:block;margin:10px auto;">
                <path d="M12 2C6 2 3 7 3 12c0 3 1.5 5.5 4 7M12 2c6 0 9 5 9 10 0 3-1.5 5.5-4 7M12 2v20M7 7c2 1 4 3 5 5M17 7c-2 1-4 3-5 5" stroke="#8fba8f" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </td>
            <td style="padding-left:12px;vertical-align:middle;">
              <div style="font-family:Arial,sans-serif;font-size:16px;font-weight:700;color:#fff;">Bionerika Agency</div>
              <div style="font-family:Arial,sans-serif;font-size:10px;color:rgba(255,255,255,.4);margin-top:1px;">нове звернення</div>
            </td>
          </tr></table>
        </td>
        <td align="right" style="vertical-align:middle;">
          <span style="display:inline-block;background:linear-gradient(135deg,#4a7c59,#2d5a3a);color:#fff;border-radius:50px;padding:6px 16px;font-family:Arial,sans-serif;font-size:9px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;">✉️ ПОВІДОМЛЕННЯ</span>
        </td>
      </tr></table>
    </td>
  </tr>

  <!-- META -->
  <tr>
    <td class="mp" bgcolor="#243e27" style="background:linear-gradient(90deg,#243e27,#2e5035);padding:16px 28px;">
      <div style="font-family:Georgia,serif;font-size:21px;font-weight:400;color:#fff;line-height:1.25;">Повідомлення від <em style="font-style:italic;color:#a8d8a8;">${name}</em></div>
      <div style="font-family:Arial,sans-serif;font-size:11px;color:rgba(255,255,255,.45);margin-top:5px;">${date}</div>
    </td>
  </tr>

  <!-- INFO -->
  <tr><td class="sp" style="padding:18px 28px 0;">
    <div style="font-family:Arial,sans-serif;font-size:9px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#9aaa9a;margin-bottom:10px;">▸ ДАНІ ВІДПРАВНИКА</div>
  </td></tr>
  <tr><td class="sb" style="padding:0 28px 0;">
    <table cellpadding="0" cellspacing="0" width="100%" style="border-radius:12px;overflow:hidden;border:1.5px solid #e8eee8;">${infoRows}</table>
  </td></tr>

  <!-- MESSAGE -->
  <tr><td class="sp" style="padding:18px 28px 0;">
    <div style="font-family:Arial,sans-serif;font-size:9px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#9aaa9a;margin-bottom:10px;">▸ ТЕКСТ ПОВІДОМЛЕННЯ</div>
  </td></tr>
  <tr><td class="sb" style="padding:10px 28px 22px;">
    <div style="background:#f6f9f6;border-radius:12px;border:1.5px solid #e8eee8;padding:16px 18px;font-family:Arial,sans-serif;font-size:14px;color:#1a2e1a;line-height:1.7;">
      ${(message || '').replace(/\n/g, '<br>')}
    </div>
  </td></tr>

  <!-- REPLY CTA -->
  <tr>
    <td style="background:#f4f8f4;padding:18px 28px;border-top:1px solid #dce8dc;">
      <table cellpadding="0" cellspacing="0" width="100%" class="rr"><tr>
        <td style="vertical-align:middle;">
          <div style="font-family:Arial,sans-serif;font-size:13px;color:#4a6a4a;line-height:1.65;">
            Відповідіть на цей лист — відповідь піде на<br><strong style="color:#1a2e1a;">${email}</strong>
          </div>
        </td>
        <td align="right" style="vertical-align:middle;padding-left:14px;white-space:nowrap;">
          <a href="mailto:${email}?subject=Re: ${subject || 'Ваше звернення'}" style="display:inline-block;background:linear-gradient(135deg,#1a2e1a,#2e5035);color:#fff;text-decoration:none;border-radius:50px;padding:11px 22px;font-family:Arial,sans-serif;font-size:12px;font-weight:700;">↩ Відповісти</a>
        </td>
      </tr></table>
    </td>
  </tr>

  <!-- FOOTER -->
  <tr>
    <td bgcolor="#162614" style="background:#162614;padding:13px 28px;border-radius:0 0 20px 20px;">
      <table cellpadding="0" cellspacing="0" width="100%" class="fr"><tr>
        <td style="font-family:Arial,sans-serif;font-size:10px;color:rgba(255,255,255,.34);">🌿 Bionerika Agency — свіжі продукти з теплиці</td>
        <td align="right" style="font-family:Arial,sans-serif;font-size:10px;color:rgba(255,255,255,.24);">Пн–Пт 8:00–19:00</td>
      </tr></table>
    </td>
  </tr>

</table></td></tr></table>
</body></html>`
}

/* ══════════════════════════════════════════════════════════════════════════
   EXPORTS
══════════════════════════════════════════════════════════════════════════ */

/* ─── MANAGER NOTIFICATION ─────────────────────────────────────────────── */
export async function sendManagerOrder({ orderId, name, email, phone, address, items, total, comment }) {
  const date = new Date().toLocaleString('uk-UA', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
  const html = buildManagerHtml({ orderId, date, name, email, phone, address, items, total, comment })
  return send('🛒 Нове замовлення ' + orderId + ' від ' + name + ' — ' + total, html, email, MANAGER_EMAIL)
}

/* ─── CLIENT CONFIRMATION ──────────────────────────────────────────────── */
export async function sendClientOrder({ orderId, name, email, phone, address, items, total, comment }) {
  const date = new Date().toLocaleString('uk-UA', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
  const html = buildClientHtml({ orderId, date, name, email, phone, address, items, total, comment })
  return send('✅ Ваше замовлення ' + orderId + ' прийнято — ' + total, html, 'noreply@bionerika.agency', email)
}

/* ─── ORDER (calls manager + client) ───────────────────────────────────── */
export async function sendOrder({ categories, products, totalPrice, client }) {
  const orderId = '#' + Math.random().toString(36).slice(2, 10).toUpperCase()
  const itemsText = products.map(p => `${p.name} ×${p.qty}`).join(', ')
  const payload = {
    orderId,
    name:    client.name    || '',
    email:   client.email   || '',
    phone:   client.phone   || '',
    address: client.address || '',
    items:   itemsText,
    total:   totalPrice,
    comment: client.comment || '',
  }
  const mgr = await sendManagerOrder(payload)
  if (client.email) {
    await sendClientOrder(payload)
  }
  return mgr
}

/* ─── CONTACT FORM ─────────────────────────────────────────────────────── */
export async function sendContact(form) {
  const date = new Date().toLocaleString('uk-UA', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
  const html = buildContactHtml({
    date,
    name:    form.name,
    email:   form.email,
    phone:   form.phone,
    company: form.company,
    subject: form.subject,
    message: form.message,
  })
  return send('✉️ ' + (form.subject || 'Повідомлення') + ' від ' + form.name, html, form.email, MANAGER_EMAIL)
}
