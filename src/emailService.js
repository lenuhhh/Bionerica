// ╔══════════════════════════════════════════════════════════════╗
// ║  Bionerika Agency — СЕРВИС ОТПРАВКИ EMAIL (EmailJS)              ║
// ╚══════════════════════════════════════════════════════════════╝

let emailjsReady = false;

/**
 * Динамически загружает EmailJS SDK и инициализирует его.
 */
async function loadEmailJS(publicKey) {
  if (emailjsReady) return;
  if (!window.emailjs) {
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js";
      s.onload = resolve;
      s.onerror = () => reject(new Error("Failed to load EmailJS SDK"));
      document.head.appendChild(s);
    });
  }
  window.emailjs.init({ publicKey });
  emailjsReady = true;
}

/**
 * Отправляет письмо через EmailJS.
 * @returns {{ ok: boolean, demo?: boolean, error?: string }}
 */
export async function sendEmail({ config, isOwner, templateId, params }) {
  // Если не владелец — DEMO режим, письма не отправляются
  if (!isOwner) {
    console.warn("⚠️ DEMO MODE — email not sent. Set your keys in src/config.js");
    return { ok: false, demo: true };
  }

  try {
    await loadEmailJS(config.EMAILJS_PUBLIC_KEY);
    await window.emailjs.send(
      config.EMAILJS_SERVICE_ID,
      templateId,
      { ...params, _signature: config.OWNER_SIGNATURE }
    );
    return { ok: true };
  } catch (err) {
    console.error("EmailJS error:", err);
    return { ok: false, error: err.message };
  }
}

/**
 * Форматирует корзину в текст для письма.
 */
export function cartToText(cart, total) {
  const lines = cart.map(i =>
    `• ${i.product.emoji} ${i.product.name} × ${i.qty} ${i.product.unit} = ${(i.product.price * i.qty).toLocaleString("uk")} ₴`
  );
  lines.push(`\nИТОГО: ${total.toLocaleString("uk")} ₴`);
  return lines.join("\n");
}
