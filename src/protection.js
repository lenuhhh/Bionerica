// ╔══════════════════════════════════════════════════════════════╗
// ║  GREEN REGION — ЗАЩИТА ОТ КОПИРОВАНИЯ                        ║
// ║  Подключается один раз в main.jsx                             ║
// ╚══════════════════════════════════════════════════════════════╝

/**
 * Инициализирует защиту от копирования кода и UI.
 * Вызови initProtection() один раз при старте приложения.
 */
export function initProtection() {
  if (typeof window === "undefined") return;

  // 1. Блокировка правой кнопки мыши
  document.addEventListener("contextmenu", (e) => e.preventDefault());

  // 2. Блокировка горячих клавиш
  document.addEventListener("keydown", (e) => {
    // Ctrl+U — просмотр исходника
    if (e.ctrlKey && (e.key === "u" || e.key === "U")) { e.preventDefault(); return; }
    // Ctrl+S — сохранение страницы
    if (e.ctrlKey && (e.key === "s" || e.key === "S")) { e.preventDefault(); return; }
    // Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+Shift+C — DevTools
    if (e.ctrlKey && e.shiftKey && ["i","I","j","J","c","C"].includes(e.key)) { e.preventDefault(); return; }
    // F12 — DevTools
    if (e.key === "F12") { e.preventDefault(); return; }
    // Ctrl+A — выделить всё (разрешаем только в полях ввода)
    if (e.ctrlKey && (e.key === "a" || e.key === "A")) {
      const tag = document.activeElement?.tagName;
      if (tag !== "INPUT" && tag !== "TEXTAREA") e.preventDefault();
    }
  });

  // 3. Блокировка drag-and-drop изображений/элементов
  document.addEventListener("dragstart", (e) => e.preventDefault());

  // 4. Предупреждение в консоли (DevTools)
  const style = "color:#c06b3a;font-size:16px;font-weight:bold;";
  console.log("%c⚠️ STOP!", style);
  console.log(
    "%cЭта консоль предназначена только для разработчиков. " +
    "Не вставляйте сюда код, который вы не понимаете — это может навредить вашему сайту.",
    "font-size:13px;color:#333;"
  );
  console.log(
    "%c🌿 Green Region © " + new Date().getFullYear() + " — All rights reserved.",
    "color:#1e3d1f;font-weight:bold;"
  );
}

/**
 * Проверяет, является ли текущая установка оригинальной (по OWNER_SIGNATURE).
 * Если ключ не настроен — возвращает false (DEMO MODE).
 */
export function checkOwnership(signature) {
  return (
    typeof signature === "string" &&
    signature.length > 6 &&
    signature !== "YOUR_SECRET_SIGNATURE_2024"
  );
}
