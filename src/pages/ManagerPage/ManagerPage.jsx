/**
 * ManagerPage — Dashboard for the Bionerika support manager
 *
 * Access: password-gated (default: "bionerika2024")
 * Data:   reads/writes to localStorage shared with AccountPage chat
 *
 * ── localStorage keys ───────────────────────────────────────────
 * bionerika_sessions          → [{id, name, lastMsg, time, unread}]
 * bionerika_msgs_{sid}        → [{id, from, text, time}]
 * bionerika_reply_{sid}       → {text, time, ts}  (consumed by client chat)
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase, signInWithGoogle } from '../../services/supabase';
import { useProductPricesCtx } from '../../contexts/ProductPricesContext.jsx';
import { products as PRODUCTS_DATA } from '../../data/products.js';

/* ─── Shared localStorage helpers ──────────────────────────────── */
const LS_SESSIONS = 'bionerika_sessions';
const LS_MSGS     = sid => `bionerika_msgs_${sid}`;
const LS_REPLY    = sid => `bionerika_reply_${sid}`;

function lsGetSessions()       { try { return JSON.parse(localStorage.getItem(LS_SESSIONS)) || []; } catch { return []; } }
function lsSaveSessions(arr)   { try { localStorage.setItem(LS_SESSIONS, JSON.stringify(arr)); } catch {} }
function lsGetMsgs(sid)        { try { return JSON.parse(localStorage.getItem(LS_MSGS(sid))) || []; } catch { return []; } }
function lsSaveMsgs(sid, msgs) { try { localStorage.setItem(LS_MSGS(sid), JSON.stringify(msgs)); } catch {} }
function lsSendReply(sid, text) {
  const r = { text, time: new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}), ts: Date.now() };
  try { localStorage.setItem(LS_REPLY(sid), JSON.stringify(r)); } catch {}
  // Also append to thread so manager thread stays consistent
  // _ts is included so client-side deduplication (AccountPage polling) can detect this message
  const msgs = lsGetMsgs(sid);
  msgs.push({ id: Date.now() + Math.random(), from: 'manager', text, time: r.time, _ts: r.ts });
  lsSaveMsgs(sid, msgs.slice(-100));
  // Update session last msg
  const sessions = lsGetSessions();
  const idx = sessions.findIndex(s => s.id === sid);
  if (idx >= 0) { sessions[idx].lastMsg = text; sessions[idx].time = Date.now(); sessions[idx].unread = 0; lsSaveSessions(sessions); }
}
function lsMarkRead(sid) {
  const sessions = lsGetSessions();
  const idx = sessions.findIndex(s => s.id === sid);
  if (idx >= 0) { sessions[idx].unread = 0; lsSaveSessions(sessions); }
}

/* ─── Quick-reply templates ─────────────────────────────────────── */
const QUICK_REPLIES = {
  greet: [
    { l:'Привіт 👋',     t:'Привіт! Чим можу допомогти? 🌿' },
    { l:'Добрий день',   t:'Доброго дня! Рада вас бачити. Чим можу допомогти сьогодні?' },
    { l:'Добрий вечір',  t:'Добрий вечір! Bionerika — свіже щодня 🌿 Чим можу допомогти?' },
    { l:'✅ Отримали',   t:'Дякуємо за звернення! Ваше повідомлення отримано, відповімо найближчим часом.' },
    { l:'Хвилинку ⏳',  t:'Зачекайте, будь ласка, хвилинку — уточнюю інформацію для вас ⏳' },
  ],
  delivery: [
    { l:'Київ 🚚',       t:'Доставка по Києву щодня до 10:00 🚚 Безкоштовна від 2000 грн. Який ваш район?' },
    { l:'Регіони 📦',    t:'Доставляємо по всій Україні 📦 Регіони — 1–3 дні. Яке ваше місто?' },
    { l:'Самовивіз',     t:'Можливий самовивіз зі складу 🏭 Адресу та зручний час уточню особисто.' },
    { l:'Час замовлення',t:'Замовляйте до 15:00 — доставимо наступного ранку ⏰ Мін. замовлення 500 грн.' },
  ],
  price: [
    { l:'Надішлю прайс', t:'Актуальний прайс-лист надішлю зараз 📋 Яка категорія цікавить найбільше?' },
    { l:'Оптові ціни',   t:'Оптові ціни від 20 кг: знижка 10%, від 50 кг — 15%, від 100 кг — до 30% 💚 Яка позиція?' },
    { l:'Роздрібні',     t:'Роздрібні ціни актуальні в каталозі на сайті 🌿 Що саме хочете замовити?' },
  ],
  order: [
    { l:'✅ Підтверджено',t:'Замовлення прийнято та підтверджено! ✅ Доставка завтра ранком до 10:00. Оплата при отриманні.' },
    { l:'⏳ В обробці',  t:'Ваше замовлення в обробці ⏳ Уточнимо деталі і підтвердимо протягом 30 хвилин.' },
    { l:'Уточніть дані', t:'Уточніть, будь ласка: що саме, кількість і адреса доставки — оформимо зразу 📋' },
    { l:'Як замовити',   t:'Замовити просто: каталог → кошик → оформити 🛒 Або напишіть список тут — оформимо за вас!' },
  ],
  general: [
    { l:'Контакти 📞',   t:'Телефон: +380 44 123-45-67 (Пн–Пт 8–19, Сб 9–17) 📞 Email: info@bionerika.com | Telegram: @bionerika_support' },
    { l:'Дякуємо 🌸',   t:'Дякуємо за довіру до Bionerika! 🌸 Якщо є ще питання — завжди поруч.' },
    { l:'Зрозуміло ✓',  t:'Зрозуміло! Дякуємо за уточнення. Підготуємо найкращий варіант для вас 🌿' },
    { l:'Якість 🌱',     t:'Вся продукція від перевірених фермерів — без ГМО 🌱 Сертифікати є. Якщо щось не так — замінимо!' },
  ],
};

const QR_TABS = [
  { k:'greet',    l:'Привітання', ico:'👋' },
  { k:'delivery', l:'Доставка',   ico:'🚚' },
  { k:'price',    l:'Ціни',       ico:'💰' },
  { k:'order',    l:'Замовлення', ico:'📦' },
  { k:'general',  l:'Загальні',   ico:'💬' },
];

/* ─── Manager access whitelist ─────────────────────────────────── */
const MANAGER_EMAILS = ['aleksandrsmisko5@gmail.com', 'aleksandrsmisko63@gmail.com'];

/* ─── Color palette (matches App.jsx CSS vars) ────────────────── */
const C = {
  dark:    '#141a14',
  forest:  'var(--forest,#1e4020)',
  moss:    'var(--moss,#2e5e30)',
  cream:   '#f0ece5',
  parch:   '#e6e0d6',
  border:  'rgba(30,64,32,.13)',
  muted:   '#7a8c7a',
  gold:    '#c9922a',
  white:   '#fdfcf8',
  text:    '#2a3828',
  terr:    '#c06b3a',
};
/* Dark palette for analytics panel */
const D = {
  bg:      '#111111',
  card:    '#1a1a1a',
  card2:   '#1e1e1e',
  border:  'rgba(255,255,255,.08)',
  text:    '#e8e4da',
  muted:   'rgba(200,196,186,.5)',
  forest:  '#2a6e34',
  moss:    '#358040',
  gold:    '#c9922a',
  terr:    '#c06b3a',
  bar:     '#2a6e34',
  barBg:   'rgba(42,110,52,.15)',
};

/* ─── Order status definitions ─────────────────────────────────── */
/* SVG icon helpers for order statuses & UI */
const IcoNew        = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
const IcoProc       = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>;
const IcoDone       = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IcoCancelled  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IcoBox        = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>;
const IcoChat       = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
const IcoTrash      = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>;
const IcoSearch     = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const IcoUser       = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const IcoRefresh    = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>;
const IcoSend       = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>;
const IcoAI         = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
const IcoPhone      = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.18 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>;
const IcoAddress    = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>;
const IcoBar        = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;
const IcoList       = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>;
const IcoUsers      = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const IcoPkg        = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>;
const IcoEdit       = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IcoMail       = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>;
const IcoTag        = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>;
const IcoChevR      = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>;
const IcoSave       = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>;
const IcoCircle     = () => <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="12" cy="12" r="10"/></svg>;

const ORDER_STATUSES = [
  { k:'new',        l:'Нове',      Ico:IcoNew,       col:'#c9922a', bg:'rgba(201,146,42,.12)'  },
  { k:'processing', l:'В обробці', Ico:IcoProc,      col:'#3b82f6', bg:'rgba(59,130,246,.12)'  },
  { k:'done',       l:'Готово',    Ico:IcoDone,      col:'#16a34a', bg:'rgba(22,163,74,.12)'   },
  { k:'cancelled',  l:'Скасовано', Ico:IcoCancelled, col:'#dc2626', bg:'rgba(220,38,38,.12)'   },
];

/* ─── UI string translations ─────────────────────────────────── */
const STRINGS = {
  ua: {
    panelTitle:'Панель менеджера', checking:'Перевірка доступу...', noAccessMsg:e=>`Акаунт ${e} не має доступу до панелі менеджера.`,
    signOutOther:'Вийти і спробувати інший акаунт', signInPrompt:'Увійдіть через Google щоб отримати доступ до панелі управління чатами',
    signInBtn:'Увійти через Google', backSite:'← Повернутись на сайт', goSite:'← Сайт', signOut:'Вийти',
    newMsg:n=>`${n} нових`, tabChats:'Чати', tabOrders:'Замовлення', tabAnalytics:'Аналітика',
    statusAll:'Всі', statusNew:'Нове', statusProcessing:'В обробці', statusDone:'Готово', statusCancelled:'Скасовано',
    searchPH:"Ім'я, телефон, No замовлення, товар…", groupByClient:'По клієнту', refresh:'Оновити',
    total:'Всього:', found:'Знайдено:', sum:'Сума:', ordCount:n=>`${n} замовл.`,
    loadingOrders:'Завантаження замовлень…', noOrders:'Замовлень не знайдено',
    address:'Адреса:', comment:'Коментар:', products:'Товари:', statusLabel:'Статус:', phone:'Телефон:', saving:'Збереження…', unknown:'Невідомо',
    loadingAnalytics:'Завантаження аналітики…', cardTotal:'Всього замовлень', cardDone:'Виконано', cardActive:'Активних',
    cardRevenue:'Загальний дохід', cardAvg:'Середній чек', card30d:'За 30 днів',
    chartTitle:'Активність за 30 днів', chartOrders:n=>`${n} замовлень`, topProducts:'Топ продуктів',
    orderStatuses:'Статуси замовлень', noAnalytics:'Немає даних для аналітики',
    chatsTitle:'Чати клієнтів', filterAll:'Всі', filterUnread:'Непрочитані',
    noUnread:'Немає нових повідомлень', noChats:'Чатів поки немає',
    chatsHint:"Клієнти з'являтимуться тут,", chatsHint2:'коли напишуть із сайту',
    statsTotal:'Всього:', statsUnread:'Непрочит.:', selectChat:'Оберіть чат',
    selectHint:'Клікніть на чат зліва, щоб', selectHint2:'переглянути переписку та відповісти',
    sessionInfo:(id,n)=>`Сесія #${id} · ${n} повідомлень`, ordersBtn:'Замовлення', deleteBtn:'Видалити',
    ordersOf:'клієнт', loadingCl:'завантаження…', noClientOrds:'Замовлень не знайдено',
    noMsgs:'Повідомлень ще немає', guest:'Гість', aiLabel:'AI-асистент',
    youSender:'Ви ·', replyPH:'Відповідь клієнту... (Enter — відправити, Shift+Enter — новий рядок)',
    sendBtn:'Відправити', newStatus:'нове',
    tabClients:'Клієнти', tabProducts:'Товари',
    searchClientsP:"Ім'я, телефон, email…", noClients:'Клієнтів не знайдено',
    clientOrdersLbl:'Замовлень:', clientSpendLbl:'Витрачено:', clientAvgLbl:'Сер. чек:',
    clientChatBtn:'Відкрити чат', clientSelectHint:'Оберіть клієнта зі списку',
    clientSelectSub:'Деталі, замовлення та контакти',
    productSearchP:'Пошук товару…', productNote:"Нотатка (необов'язково)",
    statusAvail:'Є в наявності', statusLow:'Мало залишилось', statusOut:'Немає в наявності',
    saveStatus:'Зберегти', productSaved:'Збережено ✓', loadingProd:'Завантаження…',
    tabExchange:'Курс валют', exchRateLabel:'Курс НБУ', exchRefresh:'Оновити',
    exchCalcTitle:'Калькулятор цін', exchPriceList:'Ціни товарів',
    exchLoading:'Завантаження курсу…', exchRateToday:'Офіційний курс НБУ · сьогодні',
    exchSource:'Джерело: Національний банк України (bank.gov.ua)',
    exchError:'Не вдалося завантажити курс.', exchRetry:'Спробувати ще', exchCalcPH:'напр. 5.00',
    editPriceBtn:'Змінити ціну', editSaveBtn:'Зберегти', editCancelBtn:'Скасувати',
  },
  ru: {
    panelTitle:'Панель менеджера', checking:'Проверка доступа...', noAccessMsg:e=>`Аккаунт ${e} не имеет доступа к панели менеджера.`,
    signOutOther:'Выйти и попробовать другой аккаунт', signInPrompt:'Войдите через Google для доступа к панели управления чатами',
    signInBtn:'Войти через Google', backSite:'← Вернуться на сайт', goSite:'← Сайт', signOut:'Выйти',
    newMsg:n=>`${n} новых`, tabChats:'Чаты', tabOrders:'Заказы', tabAnalytics:'Аналитика',
    statusAll:'Все', statusNew:'Новый', statusProcessing:'В обработке', statusDone:'Готово', statusCancelled:'Отменён',
    searchPH:'Имя, телефон, № заказа, товар…', groupByClient:'По клиенту', refresh:'Обновить',
    total:'Всего:', found:'Найдено:', sum:'Сумма:', ordCount:n=>`${n} заказ.`,
    loadingOrders:'Загрузка заказов…', noOrders:'Заказов не найдено',
    address:'Адрес:', comment:'Комментарий:', products:'Товары:', statusLabel:'Статус:', phone:'Телефон:', saving:'Сохранение…', unknown:'Неизвестно',
    loadingAnalytics:'Загрузка аналитики…', cardTotal:'Всего заказов', cardDone:'Выполнено', cardActive:'Активных',
    cardRevenue:'Общий доход', cardAvg:'Средний чек', card30d:'За 30 дней',
    chartTitle:'Активность за 30 дней', chartOrders:n=>`${n} заказов`, topProducts:'Топ продуктов',
    orderStatuses:'Статусы заказов', noAnalytics:'Нет данных для аналитики',
    chatsTitle:'Чаты клиентов', filterAll:'Все', filterUnread:'Непрочитанные',
    noUnread:'Нет новых сообщений', noChats:'Чатов пока нет',
    chatsHint:'Клиенты появятся здесь,', chatsHint2:'когда напишут с сайта',
    statsTotal:'Всего:', statsUnread:'Непрочит.:', selectChat:'Выберите чат',
    selectHint:'Нажмите на чат слева, чтобы', selectHint2:'просмотреть переписку и ответить',
    sessionInfo:(id,n)=>`Сессия #${id} · ${n} сообщений`, ordersBtn:'Заказы', deleteBtn:'Удалить',
    ordersOf:'клиент', loadingCl:'загрузка…', noClientOrds:'Заказов не найдено',
    noMsgs:'Сообщений пока нет', guest:'Гость', aiLabel:'AI-ассистент',
    youSender:'Вы ·', replyPH:'Ответ клиенту... (Enter — отправить, Shift+Enter — новая строка)',
    sendBtn:'Отправить', newStatus:'новый',
    tabClients:'Клиенты', tabProducts:'Товары',
    searchClientsP:'Имя, телефон, email…', noClients:'Клиентов не найдено',
    clientOrdersLbl:'Заказов:', clientSpendLbl:'Потрачено:', clientAvgLbl:'Ср. чек:',
    clientChatBtn:'Открыть чат', clientSelectHint:'Выберите клиента из списка',
    clientSelectSub:'Детали, заказы и контакты',
    productSearchP:'Поиск товара…', productNote:'Заметка (необязательно)',
    statusAvail:'В наличии', statusLow:'Мало осталось', statusOut:'Нет в наличии',
    saveStatus:'Сохранить', productSaved:'Сохранено ✓', loadingProd:'Загрузка…',
    tabExchange:'Курс валют', exchRateLabel:'Курс НБУ', exchRefresh:'Обновить',
    exchCalcTitle:'Калькулятор цен', exchPriceList:'Цены товаров',
    exchLoading:'Загрузка курса…', exchRateToday:'Официальный курс НБУ · сегодня',
    exchSource:'Источник: Национальный банк Украины (bank.gov.ua)',
    exchError:'Не удалось загрузить курс.', exchRetry:'Попробовать снова', exchCalcPH:'напр. 5.00',
    editPriceBtn:'Изменить цену', editSaveBtn:'Сохранить', editCancelBtn:'Отмена',
  },
  en: {
    panelTitle:'Manager Panel', checking:'Checking access...', noAccessMsg:e=>`Account ${e} has no access to the manager panel.`,
    signOutOther:'Sign out and try another account', signInPrompt:'Sign in with Google to access the chat management panel',
    signInBtn:'Sign in with Google', backSite:'← Back to site', goSite:'← Site', signOut:'Sign out',
    newMsg:n=>`${n} new`, tabChats:'Chats', tabOrders:'Orders', tabAnalytics:'Analytics',
    statusAll:'All', statusNew:'New', statusProcessing:'Processing', statusDone:'Done', statusCancelled:'Cancelled',
    searchPH:'Name, phone, order no., product…', groupByClient:'By client', refresh:'Refresh',
    total:'Total:', found:'Found:', sum:'Total:', ordCount:n=>`${n} orders`,
    loadingOrders:'Loading orders…', noOrders:'No orders found',
    address:'Address:', comment:'Comment:', products:'Products:', statusLabel:'Status:', phone:'Phone:', saving:'Saving…', unknown:'Unknown',
    loadingAnalytics:'Loading analytics…', cardTotal:'Total orders', cardDone:'Done', cardActive:'Active',
    cardRevenue:'Total revenue', cardAvg:'Avg. order', card30d:'Last 30 days',
    chartTitle:'Activity — last 30 days', chartOrders:n=>`${n} orders`, topProducts:'Top products',
    orderStatuses:'Order statuses', noAnalytics:'No analytics data',
    chatsTitle:'Client chats', filterAll:'All', filterUnread:'Unread',
    noUnread:'No new messages', noChats:'No chats yet',
    chatsHint:'Clients will appear here', chatsHint2:'when they message from the site',
    statsTotal:'Total:', statsUnread:'Unread:', selectChat:'Select a chat',
    selectHint:'Click a chat on the left to', selectHint2:'view the conversation and reply',
    sessionInfo:(id,n)=>`Session #${id} · ${n} messages`, ordersBtn:'Orders', deleteBtn:'Delete',
    ordersOf:'client', loadingCl:'loading…', noClientOrds:'No orders found',
    noMsgs:'No messages yet', guest:'Guest', aiLabel:'AI assistant',
    youSender:'You ·', replyPH:'Reply to client... (Enter to send, Shift+Enter — new line)',
    sendBtn:'Send', newStatus:'new',
    tabClients:'Clients', tabProducts:'Products',
    searchClientsP:'Name, phone, email…', noClients:'No clients found',
    clientOrdersLbl:'Orders:', clientSpendLbl:'Spent:', clientAvgLbl:'Avg order:',
    clientChatBtn:'Open chat', clientSelectHint:'Select a client from the list',
    clientSelectSub:'Details, orders and contacts',
    productSearchP:'Search product…', productNote:'Note (optional)',
    statusAvail:'In stock', statusLow:'Low stock', statusOut:'Out of stock',
    saveStatus:'Save', productSaved:'Saved ✓', loadingProd:'Loading…',
    tabExchange:'Exchange', exchRateLabel:'NBU Rate', exchRefresh:'Refresh',
    exchCalcTitle:'Price calculator', exchPriceList:'Product prices',
    exchLoading:'Loading rate…', exchRateToday:'Official NBU rate · today',
    exchSource:'Source: National Bank of Ukraine (bank.gov.ua)',
    exchError:'Failed to load exchange rate.', exchRetry:'Try again', exchCalcPH:'e.g. 5.00',
    editPriceBtn:'Edit price', editSaveBtn:'Save', editCancelBtn:'Cancel',
  },
};

/* ─────────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────────── */
export default function ManagerPage({ lang = 'ua', onPage }) {
  const { prices: globalPrices, updatePrice: globalUpdatePrice } = useProductPricesCtx();
  const [authState,   setAuthState]   = useState({ loading: true, email: null });
  const [sessions,    setSessions]    = useState([]);
  const [activeId,    setActiveId]    = useState(null);
  const [msgs,        setMsgs]        = useState([]);
  const [replyInput,  setReplyInput]  = useState('');
  const [sending,     setSending]     = useState(false);
  const [filter,      setFilter]      = useState('all'); // 'all' | 'unread'
  const [qrTab,       setQrTab]       = useState('greet');
  const [qrOpen,      setQrOpen]      = useState(true);
  const [ordPanelOpen, setOrdPanelOpen] = useState(false);
  const [clientOrders, setClientOrders] = useState([]);
  const [clientOrdLoading, setClientOrdLoading] = useState(false);
  const [expandedOrd,  setExpandedOrd]  = useState(null);
  /* Orders management tab state */
  const [mainTab,       setMainTab]       = useState('chats');
  const [allOrders,     setAllOrders]     = useState([]);
  const [ordLoading,    setOrdLoading]    = useState(false);
  const [ordSearch,     setOrdSearch]     = useState('');
  const [ordStatusFlt,  setOrdStatusFlt]  = useState('all');
  const [ordExpandedId, setOrdExpandedId] = useState(null);
  const [updatingId,    setUpdatingId]    = useState(null);
  const [ordGroupBy,    setOrdGroupBy]    = useState(false);
  /* Clients tab */
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientSearch,   setClientSearch]   = useState('');
  /* Products tab */
  const [productSearch,  setProductSearch]  = useState('');
  const [productStatuses,setProductStatuses]= useState([]);
  const [prodSaving,     setProdSaving]     = useState(null);
  const [prodNotes,      setProdNotes]      = useState({});
  /* Product prices + exchange rate */
  const [productPrices,  setProductPrices]  = useState([]);
  const [editingProd,    setEditingProd]    = useState(null);
  const [editForm,       setEditForm]       = useState({ name:'', priceUsd:'', price_uah:'' });
  const [priceSaving,    setPriceSaving]    = useState(null);
  const [exchRate,       setExchRate]       = useState(null);
  const [exchLoading,    setExchLoading]    = useState(false);
  const [calcUsd,        setCalcUsd]        = useState('');
  const msgsContainerRef = useRef(null);
  const inputRef  = useRef(null);

  const T = STRINGS[lang] || STRINGS.ua;
  const ordStatuses = ORDER_STATUSES.map((s, i) => ({
    ...s,
    l: [T.statusNew, T.statusProcessing, T.statusDone, T.statusCancelled][i],
  }));

  /* Check Supabase auth on mount and subscribe to changes */
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evt, session) => {
      setAuthState({ loading: false, email: session?.user?.email ?? null });
    });
    supabase.auth.getSession().then(({ data }) => {
      setAuthState({ loading: false, email: data.session?.user?.email ?? null });
    });
    return () => subscription.unsubscribe();
  }, []);

  const isAuthed = !authState.loading && !!authState.email && MANAGER_EMAILS.includes(authState.email);
  const isDenied = !authState.loading && !!authState.email && !MANAGER_EMAILS.includes(authState.email);

  /* Poll localStorage for new sessions/messages every 2.5s */
  useEffect(() => {
    if (!isAuthed) return;
    const tick = () => {
      const fresh = lsGetSessions();
      setSessions(fresh);
      if (activeId) {
        const freshMsgs = lsGetMsgs(activeId);
        setMsgs(freshMsgs);
      }
    };
    tick();
    const iv = setInterval(tick, 2500);
    return () => clearInterval(iv);
  }, [isAuthed, activeId]);

  /* Scroll to bottom when msgs change */
  useEffect(() => {
    if (msgsContainerRef.current)
      msgsContainerRef.current.scrollTop = msgsContainerRef.current.scrollHeight;
  }, [msgs]);

  /* Mark session as read when opened */
  useEffect(() => {
    if (activeId) {
      lsMarkRead(activeId);
      setMsgs(lsGetMsgs(activeId));
      setOrdPanelOpen(false);
      setClientOrders([]);
      setExpandedOrd(null);
    }
  }, [activeId]);

  const handleSignIn = () => signInWithGoogle().catch(console.error);

  const handleSend = useCallback(() => {
    const text = replyInput.trim();
    if (!text || !activeId || sending) return;
    setReplyInput('');
    setSending(true);
    lsSendReply(activeId, text);
    setMsgs(lsGetMsgs(activeId));
    setSending(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [replyInput, activeId, sending]);

  const clearSession = (sid) => {
    const sessions = lsGetSessions();
    lsSaveSessions(sessions.filter(s => s.id !== sid));
    try { localStorage.removeItem(LS_MSGS(sid)); localStorage.removeItem(LS_REPLY(sid)); } catch {}
    if (activeId === sid) { setActiveId(null); setMsgs([]); setOrdPanelOpen(false); setClientOrders([]); }
  };

  const fetchClientOrders = useCallback(async (clientName) => {
    if (!clientName) { setClientOrders([]); return; }
    setClientOrdLoading(true);
    try {
      const { data } = await supabase.from('orders').select('*')
        .ilike('name', `%${clientName}%`)
        .order('created_at', { ascending: false })
        .limit(10);
      setClientOrders(data || []);
    } catch { setClientOrders([]); }
    setClientOrdLoading(false);
  }, []);

  /* Realtime subscription for new orders — notify manager */
  useEffect(() => {
    if (!isAuthed) return;
    const ch = supabase.channel('orders_new_watch')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, payload => {
        if (payload.new) {
          setAllOrders(prev => [payload.new, ...prev]);
        }
      }).subscribe();
    return () => supabase.removeChannel(ch);
  }, [isAuthed]);

  /* Load all orders when switching to orders, analytics, clients, or products tab */
  useEffect(() => {
    if (!isAuthed || (mainTab !== 'orders' && mainTab !== 'analytics' && mainTab !== 'clients' && mainTab !== 'products')) return;
    setOrdLoading(true);
    supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(2000)
      .then(({ data }) => { setAllOrders(data || []); setOrdLoading(false); });
  }, [isAuthed, mainTab]);

  const handleStatusChange = async (ordId, newStatus) => {
    setUpdatingId(ordId);
    try {
      await supabase.from('orders').update({ status: newStatus }).eq('id', ordId);
      setAllOrders(prev => prev.map(o => o.id === ordId ? { ...o, status: newStatus } : o));
      setClientOrders(prev => prev.map(o => o.id === ordId ? { ...o, status: newStatus } : o));
    } catch(e) { console.error('[status update]', e); }
    setUpdatingId(null);
  };

  const handleReviewOrder = async (ordId) => {
    try {
      await supabase.from('orders').update({ reviewed: true }).eq('id', ordId);
      setAllOrders(prev => prev.map(o => o.id === ordId ? { ...o, reviewed: true } : o));
      setClientOrders(prev => prev.map(o => o.id === ordId ? { ...o, reviewed: true } : o));
    } catch(e) { console.error('[review order]', e); }
  };

  /* Load + subscribe product statuses when products tab is active */
  useEffect(() => {
    if (!isAuthed || mainTab !== 'products') return;
    supabase.from('product_statuses').select('*').then(({ data }) => {
      if (data) {
        setProductStatuses(data);
        const notes = {};
        data.forEach(p => { notes[p.product_id] = p.note || ''; });
        setProdNotes(prev => ({ ...prev, ...notes }));
      }
    });
    const ch = supabase.channel('product_statuses_mgr')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_statuses' }, payload => {
        if (payload.new) setProductStatuses(prev => {
          const has = prev.find(p => p.product_id === payload.new.product_id);
          return has ? prev.map(p => p.product_id === payload.new.product_id ? payload.new : p) : [...prev, payload.new];
        });
      }).subscribe();
    return () => supabase.removeChannel(ch);
  }, [isAuthed, mainTab]);

  const saveProductStatus = useCallback(async (productId, productName, status) => {
    const note = prodNotes[productId] || '';
    setProdSaving(productId);
    try {
      const existing = productStatuses.find(p => p.product_id === productId);
      if (existing) {
        await supabase.from('product_statuses').update({ status, note, updated_at: new Date().toISOString() }).eq('product_id', productId);
      } else {
        await supabase.from('product_statuses').insert({ product_id: productId, product_name: productName, status, note });
      }
      setProductStatuses(prev => {
        const has = prev.find(p => p.product_id === productId);
        if (has) return prev.map(p => p.product_id === productId ? { ...p, status, note } : p);
        return [...prev, { product_id: productId, product_name: productName, status, note }];
      });
    } catch(e) { console.error('[saveProductStatus]', e); }
    setProdSaving(null);
  }, [prodNotes, productStatuses]);

  /* Load + subscribe product prices when products tab is active */
  useEffect(() => {
    if (!isAuthed || mainTab !== 'products') return;
    // Sync local array from global context
    setProductPrices(Object.values(globalPrices));
  }, [isAuthed, mainTab, globalPrices]);

  const fetchExchRate = useCallback(() => {
    setExchLoading(true);
    const tryNBU = () =>
      fetch('https://bank.gov.ua/NBUStatService/v1/statdataindicator?id=USD&json')
        .then(r => { if (!r.ok) throw new Error('nbu'); return r.json(); })
        .then(d => { const rate = d[0]?.rate; if (!rate) throw new Error('nbu'); return rate; });
    const tryPrivat = () =>
      fetch('https://api.privatbank.ua/p24api/pubinfo?exchange&coursid=5')
        .then(r => { if (!r.ok) throw new Error('privat'); return r.json(); })
        .then(d => { const u = d.find(x => x.ccy === 'USD'); if (!u) throw new Error('privat'); return +u.sale; });
    const tryCDN = () =>
      fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json')
        .then(r => { if (!r.ok) throw new Error('cdn'); return r.json(); })
        .then(d => { const rate = d?.usd?.uah; if (!rate) throw new Error('cdn'); return rate; });
    tryNBU()
      .catch(() => tryPrivat())
      .catch(() => tryCDN())
      .then(rate => { setExchRate(rate); setExchLoading(false); })
      .catch(() => setExchLoading(false));
  }, []);

  /* Fetch exchange rate when exchange or products tab is active */
  useEffect(() => {
    if (!isAuthed || (mainTab !== 'exchange' && mainTab !== 'products')) return;
    if (!exchRate) fetchExchRate();
  }, [isAuthed, mainTab, exchRate, fetchExchRate]);

  const saveProductPrice = useCallback(async (productId, productName, priceUsd, priceUahRaw) => {
    // Compute final UAH: prefer priceUsd × live rate; fallback to raw UAH input
    const uah = priceUsd && exchRate
      ? Math.round(parseFloat(priceUsd) * exchRate)
      : (priceUahRaw ? Math.round(parseFloat(priceUahRaw)) : 0)
    const isFlower = (() => { const p = PRODUCTS_DATA.find(x=>String(x.id)===String(productId)); return p && (p.cat==='flowers'||p.cat==='exotic'); })()
    const priceLabel = `${uah} ₴/${isFlower ? 'шт' : 'кг'}`
    setPriceSaving(productId);
    try {
      const existing = productPrices.find(p => p.product_id === String(productId));
      if (existing) {
        await supabase.from('product_prices').update({ product_name: productName, price_label: priceLabel, price_uah: uah, updated_at: new Date().toISOString() }).eq('product_id', String(productId));
      } else {
        await supabase.from('product_prices').insert({ product_id: String(productId), product_name: productName, price_label: priceLabel, price_uah: uah });
      }
      const rec = { product_name: productName, price_label: priceLabel, price_uah: uah };
      // Мгновенно обновляем глобальный контекст — каталог и главная сразу видят новую цену
      globalUpdatePrice(productId, rec);
      setProductPrices(prev => {
        const full = { product_id: String(productId), ...rec };
        const has = prev.find(p => p.product_id === String(productId));
        return has ? prev.map(p => p.product_id === String(productId) ? { ...p, ...full } : p) : [...prev, full];
      });
      setEditingProd(null);
    } catch(e) { console.error('[saveProductPrice]', e); }
    setPriceSaving(null);
  }, [productPrices, globalUpdatePrice, exchRate]);

  const totalUnread     = sessions.reduce((s, x) => s + (x.unread || 0), 0);
  const unreviewedCount = allOrders.filter(o => !o.reviewed && (o.status === 'new' || !o.status)).length;
  const visibleSessions = filter === 'unread' ? sessions.filter(s => s.unread > 0) : sessions;

  const filteredOrders = allOrders.filter(o => {
    if (ordStatusFlt !== 'all' && (o.status || 'new') !== ordStatusFlt) return false;
    const q = ordSearch.toLowerCase();
    if (!q) return true;
    return (o.name||'').toLowerCase().includes(q) ||
           (o.phone||'').toLowerCase().includes(q) ||
           String(o.order_id||o.order_number||'').toLowerCase().includes(q) ||
           (o.email||'').toLowerCase().includes(q) ||
           (o.items_text||'').toLowerCase().includes(q);
  });

  const ordGroups = ordGroupBy ? filteredOrders.reduce((acc, o) => {
    const k = o.name || o.email || o.uid || T.unknown;
    if (!acc[k]) acc[k] = [];
    acc[k].push(o);
    return acc;
  }, {}) : {};

  /* Derived: unique clients from all orders */
  const clientMap = {};
  allOrders.forEach(o => {
    const key = (o.phone&&o.phone.trim()) || (o.email&&o.email.trim()) || (o.name&&o.name.trim()) || T.unknown;
    if (!clientMap[key]) clientMap[key] = { key, name:o.name||T.unknown, email:o.email||null, phone:o.phone||null, uid:o.uid||null, orders:[] };
    if (o.name  && !clientMap[key].name)  clientMap[key].name  = o.name;
    if (o.email && !clientMap[key].email) clientMap[key].email = o.email;
    if (o.phone && !clientMap[key].phone) clientMap[key].phone = o.phone;
    clientMap[key].orders.push(o);
  });
  const allClientsList = Object.values(clientMap).sort((a,b) => b.orders.length - a.orders.length);
  const filteredClients = clientSearch
    ? allClientsList.filter(c => {
        const q = clientSearch.toLowerCase();
        return (c.name||'').toLowerCase().includes(q) || (c.phone||'').toLowerCase().includes(q) || (c.email||'').toLowerCase().includes(q);
      })
    : allClientsList;
  /* Filtered products */
  const filteredProducts = productSearch
    ? PRODUCTS_DATA.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
    : PRODUCTS_DATA;

  const renderOrdRow = (ord, idx=0) => {
    const isExpanded = ordExpandedId === ord.id;
    const st = ordStatuses.find(s => s.k === (ord.status || 'new')) || ordStatuses[0];
    const isUpdating = updatingId === ord.id;
    const isNew = !ord.reviewed && (ord.status === 'new' || !ord.status);
    return (
      <div key={ord.id} className="mgr-fu" style={{ animationDelay:`${Math.min(idx,16)*0.033}s`, borderBottom:`1px solid ${C.border}`, background: isNew ? 'rgba(201,146,42,.04)' : 'transparent' }}>
        <div
          onClick={() => setOrdExpandedId(isExpanded ? null : ord.id)}
          style={{ padding:'10px 20px', cursor:'pointer', display:'flex', alignItems:'center', gap:10, transition:'background .15s', background: isExpanded ? C.cream : 'transparent' }}
          onMouseEnter={e=>{ if(!isExpanded) e.currentTarget.style.background=C.cream; }}
          onMouseLeave={e=>{ if(!isExpanded) e.currentTarget.style.background='transparent'; }}>
          {/* Reviewed checkmark */}
          <button
            onClick={e=>{ e.stopPropagation(); if(!ord.reviewed) handleReviewOrder(ord.id); }}
            title={ord.reviewed ? 'Переглянуто' : 'Позначити як переглянуто'}
            style={{ width:20, height:20, borderRadius:6, border:`1.5px solid ${ord.reviewed ? '#16a34a' : C.gold}`, background: ord.reviewed ? 'rgba(22,163,74,.12)' : 'rgba(201,146,42,.1)', color: ord.reviewed ? '#16a34a' : C.gold, cursor: ord.reviewed ? 'default' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all .2s' }}>
            {ord.reviewed
              ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              : <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="12" cy="12" r="5"/></svg>}
          </button>
          <span style={{ fontSize:10, color:C.muted, width:14, flexShrink:0 }}>{isExpanded?'▼':'▶'}</span>
          <span style={{ fontSize:11, fontFamily:'monospace', color:C.moss, fontWeight:700, minWidth:90, flexShrink:0 }}>{ord.order_id || ord.order_number || `#${ord.id}`}</span>
          <span style={{ fontSize:12, fontWeight:700, color:C.dark, width:130, flexShrink:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ord.name || '—'}</span>
          <span style={{ fontSize:11, color:C.muted, width:110, flexShrink:0 }}>{ord.phone || '—'}</span>
          <span style={{ fontSize:11, color:C.text, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ord.items_text || '—'}</span>
          <span style={{ fontSize:12, fontWeight:700, color:C.dark, whiteSpace:'nowrap', flexShrink:0 }}>{ord.total ? `${ord.total} ${ord.currency_symbol||'₴'}` : '—'}</span>
          <span style={{ fontSize:11, color:C.muted, whiteSpace:'nowrap', flexShrink:0, marginRight:4 }}>{ord.created_at ? new Date(ord.created_at).toLocaleDateString('uk-UA',{day:'numeric',month:'short',year:'2-digit'}) : ''}</span>
          {isNew && <span className="mgr-np" style={{ fontSize:9, padding:'2px 7px', borderRadius:100, background:'rgba(201,146,42,.18)', color:C.gold, fontWeight:700, flexShrink:0, whiteSpace:'nowrap' }}>NEW</span>}
          <select
            value={ord.status || 'new'}
            onChange={e=>{ e.stopPropagation(); handleStatusChange(ord.id, e.target.value); }}
            onClick={e=>e.stopPropagation()}
            disabled={isUpdating}
            style={{ padding:'3px 8px', borderRadius:8, border:`1.5px solid ${st.col}`, background:st.bg, color:st.col, fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'var(--sans,Jost)', outline:'none', flexShrink:0, opacity: isUpdating ? .5 : 1 }}>
            {ordStatuses.map(s => <option key={s.k} value={s.k}>{s.l}</option>)}
          </select>
        </div>
        {isExpanded && (
          <div style={{ padding:'10px 20px 14px 44px', background:C.cream, fontSize:11, color:C.text, lineHeight:1.9, borderTop:`1px solid ${C.border}` }}>
            {ord.email   && <div><strong>Email:</strong> {ord.email}</div>}
            {ord.address && <div><strong>{T.address}</strong> {ord.address}</div>}
            {ord.comment && <div style={{color:C.terr}}><strong>{T.comment}</strong> {ord.comment}</div>}
            {ord.items_text && <div><strong>{T.products}</strong> {ord.items_text}</div>}
            <div style={{marginTop:6, display:'flex', alignItems:'center', gap:8}}>
              <strong>{T.statusLabel}</strong>
              <select
                value={ord.status || 'new'}
                onChange={e => handleStatusChange(ord.id, e.target.value)}
                disabled={isUpdating}
                style={{ padding:'3px 10px', borderRadius:8, border:`1.5px solid ${st.col}`, background:st.bg, color:st.col, fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'var(--sans,Jost)', outline:'none' }}>
                {ordStatuses.map(s => <option key={s.k} value={s.k}>{s.l}</option>)}
              </select>
              {isUpdating && <span style={{color:C.muted, opacity:.7, fontSize:11}}>{T.saving}</span>}
              {!ord.reviewed && (
                <button onClick={() => handleReviewOrder(ord.id)}
                  style={{ padding:'3px 10px', borderRadius:8, border:`1.5px solid ${C.gold}`, background:'rgba(201,146,42,.1)', color:C.gold, fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'var(--sans,Jost)', display:'flex', alignItems:'center', gap:5 }}>
                  <IcoDone/> Позначити переглянутим
                </button>
              )}
            </div>
            <div style={{marginTop:4, fontSize:10, color:C.muted, opacity:.5, fontFamily:'monospace'}}>UID: {ord.uid}</div>
          </div>
        )}
      </div>
    );
  };

  /* ── Auth gate ── */
  if (!isAuthed) return (
    <div style={{ minHeight:'100vh', background: C.cream, display:'flex', alignItems:'center', justifyContent:'center', padding:'var(--nav-h) 20px 40px' }}>
      <div style={{ maxWidth:380, width:'100%', background: C.white, borderRadius:24, padding:'48px 36px', boxShadow:'var(--s2,0 30px 70px rgba(30,61,31,.18))', textAlign:'center' }}>
        <div style={{ width:64, height:64, borderRadius:18, background: C.forest, display:'flex', alignItems:'center', justifyContent:'center', fontSize:30, margin:'0 auto 20px' }}>🌿</div>
        <div style={{ fontFamily:'var(--serif,Cormorant Garamond)', fontSize:26, color: C.dark, marginBottom:6 }}>{T.panelTitle}</div>

        {authState.loading ? (
          <div style={{ padding:'30px 0', color: C.muted, fontSize:14 }}>{T.checking}</div>
        ) : isDenied ? (
          <>
            <div style={{ background:'#fee2e2', border:'1px solid #fca5a5', borderRadius:10, padding:'12px 16px', fontSize:13, color:'#dc2626', margin:'16px 0 20px', lineHeight:1.6 }}>
              {T.noAccessMsg(authState.email)}
            </div>
            <button onClick={() => supabase.auth.signOut()}
              style={{ width:'100%', padding:'12px', borderRadius:12, border:`1.5px solid ${C.border}`, background: C.cream, color: C.muted, fontSize:14, cursor:'pointer', fontFamily:'var(--sans,Jost)' }}>
              {T.signOutOther}
            </button>
          </>
        ) : (
          <>
            <div style={{ fontSize:13, color: C.muted, marginBottom:28, lineHeight:1.6 }}>
              {T.signInPrompt}
            </div>
            <button onClick={handleSignIn}
              style={{ width:'100%', padding:'13px', borderRadius:12, border:'none', background: C.forest, color: C.cream, fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:'var(--sans,Jost)', display:'flex', alignItems:'center', justifyContent:'center', gap:10, transition:'background .2s, transform .2s' }}
              onMouseEnter={e=>{e.currentTarget.style.background=C.moss;e.currentTarget.style.transform='translateY(-2px)';}}
              onMouseLeave={e=>{e.currentTarget.style.background=C.forest;e.currentTarget.style.transform='none';}}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill="rgba(255,255,255,.9)" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="rgba(255,255,255,.75)" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="rgba(255,255,255,.6)" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="rgba(255,255,255,.85)" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              {T.signInBtn}
            </button>
          </>
        )}

        <button onClick={() => onPage && onPage('home')}
          style={{ marginTop:16, background:'none', border:'none', fontSize:13, color: C.muted, cursor:'pointer', fontFamily:'var(--sans,Jost)' }}>
          {T.backSite}
        </button>
      </div>
    </div>
  );

  /* ── Manager dashboard ── */
  return (
    <div style={{ minHeight:'100vh', background: C.cream, paddingTop:'var(--nav-h)' }}>
      <style>{`
        .mgr-tab { padding: 5px 18px; white-space: nowrap; }
        .mgr-tab-label { display: inline; }
        .mgr-signout-label { display: inline; }
        .mgr-bar-logo-sub { display: inline; }
        .mgr-back { display: none !important; }
        .mgr-clients-back { display: none !important; }
        .mgr-orders-scroll { overflow-x: auto; }
        .mgr-orders-inner { min-width: 680px; }
        .mgr-clients-left { width: 300px; flex-shrink: 0; }
        @media (max-width: 1100px) { .mgr-tab { padding: 5px 12px; } }
        @media (max-width: 900px)  { .mgr-tab { padding: 5px 9px; } }
        @media (max-width: 680px) {
          .mgr-tab { padding: 5px 7px; }
          .mgr-tab-label { display: none !important; }
          .mgr-bar-logo-sub { display: none !important; }
          .mgr-bar-logo-dot { display: none !important; }
          .mgr-signout-label { display: none !important; }
        }
        @media (max-width: 540px) {
          .mgr-content { position: relative !important; }
          .mgr-left { position: absolute !important; top:0; left:0; width:100% !important; height:100% !important; z-index:4; }
          .mgr-left--hidden { display: none !important; }
          .mgr-back { display: flex !important; }
          .mgr-clients-left { position: absolute !important; top:0; left:0; width:100% !important; height:100% !important; z-index:4; }
          .mgr-clients-left--hidden { display: none !important; }
          .mgr-clients-back { display: flex !important; }
          .mgr-prod-grid { grid-template-columns: 1fr !important; }
        }
        @keyframes mgrPanelIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        .mgr-panel { animation: mgrPanelIn 0.22s ease both; }
      `}</style>

      {/* Tab bar */}
      <div style={{ background:'#f0ece5', padding:'0 24px', display:'grid', gridTemplateColumns:'1fr auto 1fr', alignItems:'center', height:60, boxShadow:'0 1px 0 rgba(30,64,32,.12),0 2px 12px rgba(30,64,32,.07)', borderBottom:'1px solid rgba(30,64,32,.13)', flexShrink:0 }}>
        {/* Left: logo */}
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:30, height:30, borderRadius:8, background:'#141a14', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8fba8f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2C6 2 3 7 3 12c0 3 1.5 5.5 4 7M12 2c6 0 9 5 9 10 0 3-1.5 5.5-4 7M12 2v20M7 7c2 1 4 3 5 5M17 7c-2 1-4 3-5 5"/>
            </svg>
          </div>
          <div style={{ display:'flex', alignItems:'baseline', gap:7 }}>
            <span style={{ fontFamily:'var(--serif,Cormorant Garamond)', fontSize:21, fontWeight:700, color:'#141a14', letterSpacing:'.04em', textTransform:'uppercase' }}>Bionerika</span>
            <span className="mgr-bar-logo-dot" style={{ color:'rgba(30,64,32,.3)', fontSize:14, fontWeight:300, lineHeight:1 }}>·</span>
            <span className="mgr-bar-logo-sub" style={{ fontFamily:'var(--sans,Jost)', fontSize:9, fontWeight:600, letterSpacing:'.2em', textTransform:'uppercase', color:'rgba(30,64,32,.55)', whiteSpace:'nowrap' }}>Manager Menu</span>
          </div>
          {totalUnread > 0 && (
            <span style={{ padding:'2px 8px', borderRadius:100, background:'rgba(192,107,58,.25)', color:C.terr, fontSize:11, fontWeight:700, border:`1px solid ${C.terr}44` }}>
              {T.newMsg(totalUnread)}
            </span>
          )}
        </div>

        {/* Center: tabs */}
        <div className="mgr-tabs" style={{ display:'flex', gap:4, background:'rgba(30,64,32,.07)', borderRadius:12, padding:'4px 5px' }}>
          {([
            ['chats',    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>, T.tabChats],
            ['orders',   <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>, T.tabOrders],
            ['clients',  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>, T.tabClients],
            ['products', <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>, T.tabProducts],
            ['exchange', <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>, T.tabExchange],
            ['analytics',<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>, T.tabAnalytics],
          ]).map(([tab, ico, label]) => (
            <button key={tab} onClick={() => setMainTab(tab)} className="mgr-tab"
              style={{ borderRadius:8, border:'none', cursor:'pointer', fontSize:12, fontWeight:700, fontFamily:'var(--sans,Jost)', transition:'background .2s, color .2s, transform .15s',
                background: mainTab===tab ? 'var(--forest,#1e4020)' : 'transparent',
                color:      mainTab===tab ? '#fff' : 'rgba(30,64,32,.65)',
                display:'flex', alignItems:'center', gap:6,
              }}
              onMouseEnter={e=>{ if(mainTab!==tab) { e.currentTarget.style.background='rgba(30,64,32,.1)'; e.currentTarget.style.color='#1e4020'; } }}
              onMouseLeave={e=>{ if(mainTab!==tab) { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='rgba(30,64,32,.65)'; } }}>
              {ico}
              <span className="mgr-tab-label">{label}</span>
              {tab==='chats' && totalUnread>0 ? <span style={{ padding:'1px 6px', borderRadius:100, background:C.terr, color:'#fff', fontSize:10, fontWeight:800, marginLeft:2 }}>{totalUnread}</span> : ''}
              {tab==='orders' && unreviewedCount>0 ? <span style={{ padding:'1px 6px', borderRadius:100, background:C.gold, color:'#fff', fontSize:10, fontWeight:800, marginLeft:2 }}>{unreviewedCount}</span> : ''}
            </button>
          ))}
        </div>

        {/* Right: sign out */}
        <div style={{ display:'flex', justifyContent:'flex-end' }}>
          <button onClick={() => supabase.auth.signOut()}
            style={{ padding:'6px 14px', borderRadius:100, border:'1px solid rgba(220,38,38,.3)', background:'rgba(220,38,38,.08)', color:'#f87171', fontSize:12, cursor:'pointer', fontFamily:'var(--sans,Jost)', transition:'background .2s, transform .15s', display:'flex', alignItems:'center', gap:6 }}
            onMouseEnter={e=>{ e.currentTarget.style.background='rgba(220,38,38,.18)'; e.currentTarget.style.transform='translateY(-1px)'; }}
            onMouseLeave={e=>{ e.currentTarget.style.background='rgba(220,38,38,.08)'; e.currentTarget.style.transform='none'; }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            <span className="mgr-signout-label">{T.signOut}</span>
          </button>
        </div>
      </div>

      <div className="mgr-content" style={{ display:'flex', height:'calc(100vh - var(--nav-h) - 60px)', overflow:'hidden' }}>
        <div key={mainTab} className="mgr-panel" style={{ flex:1, display:'flex', overflow:'hidden', minWidth:0 }}>
        {mainTab === 'analytics' ? (
          /* ── ANALYTICS PANEL ── */
          <div style={{ flex:1, overflow:'auto', padding:'28px 32px', background:D.bg, scrollbarWidth:'thin', scrollbarColor:`rgba(80,80,80,.5) transparent` }}>
            {ordLoading ? (
              <div style={{ textAlign:'center', padding:'60px', color:D.muted }}>
                <div style={{ marginBottom:12, opacity:.4, display:'flex', justifyContent:'center' }}><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg></div>
                <div>{T.loadingAnalytics}</div>
              </div>
            ) : (() => {
              const now = Date.now();
              const msPerDay = 86400000;
              const last30 = allOrders.filter(o => o.created_at && (now - new Date(o.created_at).getTime()) < 30 * msPerDay);
              const totalRevenue = allOrders.reduce((s, o) => s + (parseFloat(o.total) || 0), 0);
              const doneOrders = allOrders.filter(o => o.status === 'done');
              const activeOrders = allOrders.filter(o => o.status === 'new' || o.status === 'processing');
              const avgOrderValue = allOrders.length ? totalRevenue / allOrders.length : 0;

              // Activity last 30 days bar chart
              const dayMap = {};
              for (let i = 29; i >= 0; i--) {
                const d = new Date(now - i * msPerDay);
                const key = d.toLocaleDateString('uk-UA', { day:'2-digit', month:'2-digit' });
                dayMap[key] = 0;
              }
              last30.forEach(o => {
                const key = new Date(o.created_at).toLocaleDateString('uk-UA', { day:'2-digit', month:'2-digit' });
                if (dayMap[key] !== undefined) dayMap[key]++;
              });
              const days = Object.entries(dayMap);
              const maxDay = Math.max(...days.map(([,v]) => v), 1);

              // Top products frequency
              const prodMap = {};
              allOrders.forEach(o => {
                if (!o.items_text) return;
                o.items_text.split(', ').forEach(item => {
                  const name = item.replace(/\s*×\d+$/, '').trim();
                  if (name) prodMap[name] = (prodMap[name] || 0) + 1;
                });
              });
              const topProducts = Object.entries(prodMap).sort((a, b) => b[1] - a[1]).slice(0, 8);
              const maxProd = topProducts.length ? topProducts[0][1] : 1;

              return (
                <div style={{ maxWidth:960, margin:'0 auto', display:'flex', flexDirection:'column', gap:22 }}>
                  {/* Summary cards */}
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:14 }}>
                    {[
                      { Ico:IcoBox,  label:T.cardTotal,   value:allOrders.length,              col:C.moss   },
                      { Ico:IcoDone, label:T.cardDone,    value:doneOrders.length,             col:'#16a34a'},
                      { Ico:IcoProc, label:T.cardActive,  value:activeOrders.length,           col:'#3b82f6'},
                      { Ico:IcoBar,  label:T.cardRevenue, value:`${totalRevenue.toFixed(0)} ₴`, col:C.gold  },
                      { Ico:IcoBar,  label:T.cardAvg,     value:`${avgOrderValue.toFixed(0)} ₴`,col:C.terr  },
                      { Ico:IcoList, label:T.card30d,     value:last30.length,                 col:C.forest},
                    ].map(({ Ico, label, value, col }) => (
                      <div key={label} style={{ background:D.card, borderRadius:16, padding:'18px 20px', border:`1px solid ${D.border}`, boxShadow:'0 2px 12px rgba(0,0,0,.35)', transition:'transform .2s, box-shadow .2s', cursor:'default' }}
                        onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow=`0 8px 24px rgba(0,0,0,.5)`; }}
                        onMouseLeave={e=>{ e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='0 2px 12px rgba(0,0,0,.35)'; }}>
                        <div style={{ width:34, height:34, borderRadius:10, background:`${col}28`, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:10, color:col }}><Ico/></div>
                        <div style={{ fontSize:22, fontWeight:700, color:col, fontFamily:'var(--serif,Cormorant Garamond)' }}>{value}</div>
                        <div style={{ fontSize:11, color:D.muted, marginTop:3 }}>{label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Activity chart — last 30 days */}
                  <div style={{ background:D.card, borderRadius:16, padding:'20px 24px', border:`1px solid ${D.border}` }}>
                    <div style={{ fontSize:13, fontWeight:700, color:D.text, marginBottom:2, fontFamily:'var(--sans,Jost)' }}>{T.chartTitle}</div>
                    <div style={{ fontSize:11, color:D.muted, marginBottom:16 }}>{T.chartOrders(last30.length)}</div>
                    <div style={{ display:'flex', alignItems:'flex-end', gap:3, height:90, overflowX:'auto' }}>
                      {days.map(([day, count], idx) => (
                        <div key={day} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2, minWidth:22, flex:'1 0 22px' }}>
                          <div
                            style={{ width:'100%', borderRadius:'4px 4px 2px 2px', background: count > 0 ? D.bar : D.barBg, height:`${Math.max(4, (count / maxDay) * 70)}px`, transition:'height .3s' }}
                            title={`${day}: ${T.ordCount(count)}`}
                          />
                          <div style={{ fontSize:8, color:D.muted, whiteSpace:'nowrap', opacity:.65 }}>
                            {idx % 5 === 0 ? day : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top products */}
                  {topProducts.length > 0 && (
                    <div style={{ background:D.card, borderRadius:16, padding:'20px 24px', border:`1px solid ${D.border}` }}>
                      <div style={{ fontSize:13, fontWeight:700, color:D.text, marginBottom:16, fontFamily:'var(--sans,Jost)' }}>{T.topProducts}</div>
                      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                        {topProducts.map(([name, count]) => (
                          <div key={name} style={{ display:'flex', alignItems:'center', gap:12 }}>
                            <div style={{ width:150, fontSize:12, color:'rgba(220,216,206,.75)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flexShrink:0 }}>{name}</div>
                            <div style={{ flex:1, height:8, borderRadius:6, background:D.barBg, overflow:'hidden' }}>
                              <div style={{ height:'100%', borderRadius:6, background:`linear-gradient(90deg,${D.bar},${D.moss})`, width:`${(count/maxProd)*100}%`, transition:'width .5s' }}/>
                            </div>
                            <div style={{ fontSize:12, fontWeight:700, color:D.text, width:32, textAlign:'right', flexShrink:0 }}>{count}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Status breakdown */}
                  <div style={{ background:D.card, borderRadius:16, padding:'20px 24px', border:`1px solid ${D.border}` }}>
                    <div style={{ fontSize:13, fontWeight:700, color:D.text, marginBottom:16, fontFamily:'var(--sans,Jost)' }}>{T.orderStatuses}</div>
                    <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                      {ordStatuses.map(st => {
                        const StIco = st.Ico;
                        const cnt = allOrders.filter(o => (o.status || 'new') === st.k).length;
                        const pct = allOrders.length ? Math.round(cnt / allOrders.length * 100) : 0;
                        return (
                          <div key={st.k} style={{ background:`${st.col}20`, border:`1px solid ${st.col}50`, borderRadius:14, padding:'16px 22px', flex:'1 1 120px', textAlign:'center', transition:'transform .2s, box-shadow .2s' }}
                            onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow=`0 8px 24px ${st.col}30`; }}
                            onMouseLeave={e=>{ e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='none'; }}>
                            <div style={{ width:32, height:32, borderRadius:8, background:`${st.col}30`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 8px', color:st.col }}><StIco/></div>
                            <div style={{ fontSize:22, fontWeight:700, color:st.col, fontFamily:'var(--serif,Cormorant Garamond)' }}>{cnt}</div>
                            <div style={{ fontSize:11, color:D.muted }}>{st.l}</div>
                            <div style={{ fontSize:11, color:st.col, fontWeight:600, marginTop:2 }}>{pct}%</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {allOrders.length === 0 && (
                    <div style={{ textAlign:'center', padding:'40px', color:D.muted }}>
                      <div style={{ marginBottom:12, opacity:.3, display:'flex', justifyContent:'center' }}><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></div>
                      <div>{T.noAnalytics}</div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        ) : mainTab === 'orders' ? (
          /* ── ORDERS MANAGEMENT PANEL ── */
          <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background: C.cream }}>
            {/* Toolbar */}
            <div style={{ padding:'12px 20px', borderBottom:`1px solid ${C.border}`, background:C.parch, flexShrink:0, display:'flex', flexWrap:'wrap', gap:10, alignItems:'center' }}>
              <input
                type="text"
                value={ordSearch}
                onChange={e => setOrdSearch(e.target.value)}
                placeholder={`   ${T.searchPH}`}
                style={{ padding:'7px 14px', borderRadius:20, border:`1.5px solid ${C.border}`, fontSize:12, fontFamily:'var(--sans,Jost)', color:C.dark, background:C.white, outline:'none', minWidth:220, flex:'1 1 200px', transition:'border-color .2s' }}
                onFocus={e=>e.target.style.borderColor=C.moss}
                onBlur={e=>e.target.style.borderColor=C.border}
              />
              <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                {[{k:'all',l:T.statusAll,Ico:IcoList,col:C.dark},...ordStatuses].map(st=>{
                  const StIco = st.Ico; return (
                  <button key={st.k} onClick={()=>setOrdStatusFlt(st.k)}
                    style={{ padding:'4px 12px', borderRadius:100, fontSize:11, fontWeight:700, fontFamily:'var(--sans,Jost)', border:'none', cursor:'pointer', transition:'background .15s',
                      background: ordStatusFlt===st.k ? (st.col||C.dark) : 'rgba(20,26,20,.08)',
                      color:      ordStatusFlt===st.k ? '#fff' : C.muted,
                      display:'flex', alignItems:'center', gap:4,
                      transition:'background .15s, transform .1s',
                    }}
                    onMouseEnter={e=>e.currentTarget.style.transform='translateY(-1px)'}
                    onMouseLeave={e=>e.currentTarget.style.transform='none'}>
                    <StIco/> {st.l}
                  </button>
                )})}
              </div>
              <div style={{ display:'flex', gap:6, marginLeft:'auto' }}>
                <button onClick={()=>setOrdGroupBy(g=>!g)}
                  style={{ padding:'5px 12px', borderRadius:8, border:`1px solid ${C.border}`, fontSize:11, fontWeight:600, fontFamily:'var(--sans,Jost)', cursor:'pointer', transition:'background .15s, color .15s, transform .1s',
                    background: ordGroupBy ? C.forest : 'transparent',
                    color:      ordGroupBy ? C.cream  : C.muted,
                    display:'flex', alignItems:'center', gap:5,
                  }}
                  onMouseEnter={e=>e.currentTarget.style.transform='translateY(-1px)'}
                  onMouseLeave={e=>e.currentTarget.style.transform='none'}>
                  <IcoUser/> {T.groupByClient}
                </button>
                <button
                  onClick={()=>{ setOrdLoading(true); supabase.from('orders').select('*').order('created_at',{ascending:false}).limit(2000).then(({data})=>{setAllOrders(data||[]);setOrdLoading(false);}); }}
                  style={{ padding:'5px 12px', borderRadius:8, border:`1px solid ${C.border}`, fontSize:11, fontFamily:'var(--sans,Jost)', cursor:'pointer', background:'transparent', color:C.muted, transition:'background .15s, transform .15s', display:'flex', alignItems:'center', gap:5 }}
                  onMouseEnter={e=>{ e.currentTarget.style.background=C.cream; e.currentTarget.style.transform='translateY(-1px)'; }}
                  onMouseLeave={e=>{ e.currentTarget.style.background='transparent'; e.currentTarget.style.transform='none'; }}>
                  <IcoRefresh/> {T.refresh}
                </button>
              </div>
            </div>
            {/* Stats bar */}
            <div style={{ padding:'5px 20px', background:C.white, borderBottom:`1px solid ${C.border}`, fontSize:11, color:C.muted, display:'flex', gap:16, flexShrink:0, flexWrap:'wrap', alignItems:'center' }}>
              <span>{T.total} <strong style={{color:C.dark}}>{allOrders.length}</strong></span>
              {ordStatuses.map(st=>{
                const Ico = st.Ico;
                const cnt = allOrders.filter(o=>(o.status||'new')===st.k).length;
                return cnt>0 ? <span key={st.k} style={{color:st.col,display:'inline-flex',alignItems:'center',gap:3}}><Ico/> {st.l}: <strong>{cnt}</strong></span> : null;
              })}
              {unreviewedCount>0 && (
                <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'2px 10px', borderRadius:100, background:'rgba(201,146,42,.12)', border:`1px solid ${C.gold}66`, color:C.gold, fontWeight:700, cursor:'pointer' }}
                  onClick={()=>setOrdStatusFlt(ordStatusFlt==='new'?'all':'new')}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="12" cy="12" r="10"/></svg>
                  {unreviewedCount} не переглянуто
                </span>
              )}
              {ordSearch && <span style={{color:C.moss}}>{T.found} <strong>{filteredOrders.length}</strong></span>}
            </div>
            {/* Orders list */}
            <div className="mgr-orders-scroll" style={{ flex:1, overflowY:'auto', overflowX:'auto', scrollbarWidth:'thin', scrollbarColor:`${C.muted} transparent` }}>
              <div className="mgr-orders-inner">
              {ordLoading ? (
                <div style={{ padding:'60px', textAlign:'center', color:C.muted }}>
                  <div style={{ marginBottom:12, opacity:.4, display:'flex', justifyContent:'center' }}><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg></div>
                  <div>{T.loadingOrders}</div>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div style={{ padding:'60px', textAlign:'center', color:C.muted }}>
                  <div style={{ marginBottom:12, opacity:.3, display:'flex', justifyContent:'center' }}><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></div>
                  <div style={{ fontSize:14 }}>{T.noOrders}</div>
                </div>
              ) : ordGroupBy ? (
                Object.entries(ordGroups).map(([uName, ords]) => (
                  <div key={uName}>
                    <div style={{ padding:'8px 20px', background:C.parch, borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:10, position:'sticky', top:0, zIndex:1, boxShadow:'0 1px 4px rgba(0,0,0,.06)' }}>
                      <div style={{ width:26, height:26, borderRadius:'50%', background:C.forest, display:'flex', alignItems:'center', justifyContent:'center', color:C.cream, fontSize:11, fontWeight:700, flexShrink:0 }}>
                        {uName?.[0]?.toUpperCase()||'?'}
                      </div>
                      <span style={{ fontSize:12, fontWeight:700, color:C.dark, fontFamily:'var(--sans,Jost)' }}>{uName}</span>
                      <span style={{ fontSize:11, color:C.muted }}>({T.ordCount(ords.length)})</span>
                      {ords[0]?.phone && <span style={{ fontSize:11, color:C.muted, display:'inline-flex', alignItems:'center', gap:3 }}><IcoPhone/> {ords[0].phone}</span>}
                      <span style={{ fontSize:11, color:C.muted, marginLeft:'auto' }}>{T.sum} <strong style={{color:C.dark}}>{ords.reduce((s,o)=>s+(parseFloat(o.total)||0),0).toFixed(0)} ₴</strong></span>
                    </div>
                    {ords.map((ord,i) => renderOrdRow(ord,i))}
                  </div>
                ))
              ) : (
                filteredOrders.map((ord,i) => renderOrdRow(ord,i))
              )}
              </div>{/* /mgr-orders-inner */}
            </div>{/* /mgr-orders-scroll */}
          </div>
        ) : mainTab === 'clients' ? (
          /* ── CLIENTS PANEL ── */
          (() => {
            const selC = selectedClient ? allClientsList.find(c => c.key === selectedClient) : null;
            const selOrders = selC ? selC.orders.slice().sort((a,b) => new Date(b.created_at) - new Date(a.created_at)) : [];
            const selSpend  = selOrders.reduce((s,o) => s+(parseFloat(o.total)||0), 0);
            return (
              <div style={{ flex:1, display:'flex', overflow:'hidden', background:C.cream, position:'relative' }} className="mgr-content">

                {/* Left: client list */}
                <div className={`mgr-clients-left${selectedClient ? ' mgr-clients-left--hidden' : ''}`}
                  style={{ width:310, borderRight:`1px solid ${C.border}`, display:'flex', flexDirection:'column', background:C.white, flexShrink:0, overflow:'hidden' }}>
                  {/* Header */}
                  <div style={{ padding:'14px 16px 10px', borderBottom:`1px solid ${C.border}`, background:C.parch, flexShrink:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                      <IcoUsers/>
                      <span style={{ fontSize:11, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:C.muted }}>{T.tabClients}</span>
                      <span style={{ marginLeft:'auto', fontSize:11, color:C.muted, fontWeight:600 }}>{allClientsList.length}</span>
                    </div>
                    <input type="text" value={clientSearch} onChange={e=>setClientSearch(e.target.value)}
                      placeholder={T.searchClientsP}
                      style={{ width:'100%', padding:'7px 12px', borderRadius:20, border:`1.5px solid ${C.border}`, fontSize:12, fontFamily:'var(--sans,Jost)', color:C.dark, background:C.cream, outline:'none', boxSizing:'border-box', transition:'border-color .2s' }}
                      onFocus={e=>e.target.style.borderColor=C.moss} onBlur={e=>e.target.style.borderColor=C.border}/>
                  </div>
                  {/* List */}
                  {ordLoading ? (
                    <div style={{ padding:'40px', textAlign:'center', color:C.muted, display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
                      <IcoRefresh/><span style={{fontSize:12}}>{T.loadingOrders}</span>
                    </div>
                  ) : (
                    <div style={{ flex:1, overflowY:'auto', scrollbarWidth:'thin', scrollbarColor:`${C.muted} transparent` }}>
                      {filteredClients.length === 0 ? (
                        <div style={{ padding:'40px 16px', textAlign:'center', color:C.muted, fontSize:12 }}>{T.noClients}</div>
                      ) : filteredClients.map(c => {
                        const isActive = selectedClient === c.key;
                        const spend = c.orders.reduce((s,o)=>s+(parseFloat(o.total)||0),0);
                        const hasUnreviewed = c.orders.some(o => !o.reviewed && (o.status==='new'||!o.status));
                        return (
                          <div key={c.key} onClick={()=>setSelectedClient(c.key)}
                            style={{ padding:'11px 16px', cursor:'pointer', borderBottom:`1px solid ${C.border}`, transition:'background .15s', position:'relative',
                              background: isActive ? C.cream : 'transparent',
                              borderLeft: isActive ? `3px solid ${C.forest}` : '3px solid transparent' }}
                            onMouseEnter={e=>{ if(!isActive) e.currentTarget.style.background=C.cream; }}
                            onMouseLeave={e=>{ if(!isActive) e.currentTarget.style.background='transparent'; }}>
                            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                              <div style={{ width:34, height:34, borderRadius:'50%', background:isActive?C.forest:'rgba(30,61,31,.1)', display:'flex', alignItems:'center', justifyContent:'center', color:isActive?C.cream:C.muted, fontSize:14, fontWeight:700, flexShrink:0 }}>
                                {c.name?.[0]?.toUpperCase()||'?'}
                              </div>
                              <div style={{ flex:1, minWidth:0 }}>
                                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                                  <span style={{ fontSize:13, fontWeight:700, color:C.dark, fontFamily:'var(--sans,Jost)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:140 }}>{c.name}</span>
                                  <span style={{ fontSize:11, fontWeight:700, color:C.moss, whiteSpace:'nowrap' }}>{spend.toFixed(0)} ₴</span>
                                </div>
                                <div style={{ display:'flex', gap:8, marginTop:2 }}>
                                  {c.phone && <span style={{ fontSize:10, color:C.muted, display:'inline-flex', alignItems:'center', gap:2 }}><IcoPhone/>{c.phone}</span>}
                                  <span style={{ fontSize:10, color:C.muted }}>{T.clientOrdersLbl} <strong style={{color:C.dark}}>{c.orders.length}</strong></span>
                                </div>
                              </div>
                              {hasUnreviewed && <span style={{ width:8, height:8, borderRadius:'50%', background:C.gold, flexShrink:0 }}/>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {/* Footer */}
                  <div style={{ padding:'8px 16px', borderTop:`1px solid ${C.border}`, background:C.parch, flexShrink:0, display:'flex', justifyContent:'space-between', fontSize:10, color:C.muted }}>
                    <span>{T.total} <strong style={{color:C.dark}}>{allClientsList.length}</strong></span>
                    <span>{T.clientOrdersLbl} <strong style={{color:C.dark}}>{allOrders.length}</strong></span>
                  </div>
                </div>

                {/* Right: client detail */}
                <div className={`mgr-clients-right${selectedClient ? '' : ''}`} style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
                  {!selC ? (
                    <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:12, color:C.muted }}>
                      <div style={{ opacity:.2 }}><IcoUsers/></div>
                      <div style={{ fontFamily:'var(--serif,Cormorant Garamond)', fontSize:24, color:C.dark, opacity:.35 }}>{T.clientSelectHint}</div>
                      <div style={{ fontSize:13, opacity:.5 }}>{T.clientSelectSub}</div>
                    </div>
                  ) : (
                    <>
                      {/* Client header */}
                      <div style={{ padding:'16px 24px', borderBottom:`1px solid ${C.border}`, background:C.white, flexShrink:0, boxShadow:'0 1px 8px rgba(0,0,0,.06)' }}>
                        {/* Mobile back */}
                        <button className="mgr-clients-back" onClick={()=>setSelectedClient(null)}
                          style={{ marginBottom:10, padding:'5px 10px', borderRadius:8, border:`1px solid ${C.border}`, background:'transparent', color:C.muted, fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>← {T.tabClients}</button>
                        <div style={{ display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
                          <div style={{ width:52, height:52, borderRadius:'50%', background:C.forest, display:'flex', alignItems:'center', justifyContent:'center', color:C.cream, fontSize:22, fontWeight:700, flexShrink:0 }}>
                            {selC.name?.[0]?.toUpperCase()||'?'}
                          </div>
                          <div style={{ flex:1, minWidth:180 }}>
                            <div style={{ fontSize:18, fontWeight:700, color:C.dark, fontFamily:'var(--serif,Cormorant Garamond)' }}>{selC.name}</div>
                            <div style={{ display:'flex', flexWrap:'wrap', gap:10, marginTop:4, fontSize:12, color:C.muted }}>
                              {selC.phone && <span style={{ display:'inline-flex', alignItems:'center', gap:4 }}><IcoPhone/>{selC.phone}</span>}
                              {selC.email && <span style={{ display:'inline-flex', alignItems:'center', gap:4 }}><IcoMail/>{selC.email}</span>}
                              {selC.uid   && <span style={{ fontFamily:'monospace', fontSize:11, opacity:.5 }}>uid: {selC.uid}</span>}
                            </div>
                          </div>
                          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                            {[
                              { Ico:IcoBox,  v:selOrders.length,       l:T.clientOrdersLbl, col:C.moss  },
                              { Ico:IcoBar,  v:`${selSpend.toFixed(0)} ₴`, l:T.clientSpendLbl,  col:C.gold  },
                              { Ico:IcoList, v:selOrders.length ? `${(selSpend/selOrders.length).toFixed(0)} ₴` : '—', l:T.clientAvgLbl, col:C.terr },
                            ].map(({Ico,v,l,col})=>(
                              <div key={l} style={{ textAlign:'center', background:`${col}12`, border:`1px solid ${col}33`, borderRadius:12, padding:'10px 16px', minWidth:80 }}>
                                <div style={{ color:col, display:'flex', justifyContent:'center', marginBottom:4 }}><Ico/></div>
                                <div style={{ fontSize:16, fontWeight:700, color:col, fontFamily:'var(--serif,Cormorant Garamond)' }}>{v}</div>
                                <div style={{ fontSize:10, color:C.muted }}>{l}</div>
                              </div>
                            ))}
                            <button onClick={()=>{ setMainTab('chats'); }}
                              style={{ padding:'8px 14px', borderRadius:100, border:`1px solid ${C.border}`, background:'transparent', color:C.muted, fontSize:12, cursor:'pointer', fontFamily:'var(--sans,Jost)', display:'flex', alignItems:'center', gap:6, transition:'background .2s, transform .2s' }}
                              onMouseEnter={e=>{e.currentTarget.style.background=C.cream;e.currentTarget.style.transform='translateY(-1px)';}}
                              onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.transform='none';}}>
                              <IcoChat/> {T.clientChatBtn}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Orders list */}
                      <div style={{ flex:1, overflowY:'auto', scrollbarWidth:'thin', scrollbarColor:`${C.muted} transparent`, background:C.cream }}>
                        {selOrders.length === 0 ? (
                          <div style={{ padding:'40px', textAlign:'center', color:C.muted, fontSize:13 }}>{T.noOrders}</div>
                        ) : selOrders.map(ord => {
                          const st = ordStatuses.find(s=>s.k===(ord.status||'new'))||ordStatuses[0];
                          const isUpdating = updatingId === ord.id;
                          const StIco = st.Ico;
                          const isNew = !ord.reviewed && (!ord.status || ord.status==='new');
                          return (
                            <div key={ord.id} style={{ margin:'10px 16px', background:C.white, borderRadius:14, border:`1px solid ${isNew ? C.gold+'88' : C.border}`, overflow:'hidden', boxShadow: isNew ? `0 0 0 2px ${C.gold}22` : 'none', transition:'box-shadow .2s' }}>
                              {/* Order header */}
                              <div style={{ padding:'10px 16px', display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', borderBottom:`1px solid ${C.border}` }}>
                                <span style={{ fontFamily:'monospace', fontSize:12, color:C.moss, fontWeight:700 }}>{ord.order_id||`#${ord.id}`}</span>
                                {isNew && <span style={{ fontSize:9, padding:'2px 8px', borderRadius:100, background:'rgba(201,146,42,.18)', color:C.gold, fontWeight:700 }}>NEW</span>}
                                <span style={{ fontSize:11, color:C.muted }}>{ord.created_at ? new Date(ord.created_at).toLocaleDateString('uk-UA',{day:'numeric',month:'short',year:'2-digit'}) : ''}</span>
                                <span style={{ marginLeft:'auto', fontSize:13, fontWeight:700, color:C.dark }}>{ord.total ? `${ord.total} ${ord.currency_symbol||'₴'}` : '—'}</span>
                                <div style={{ display:'flex', alignItems:'center', gap:4, padding:'3px 10px', borderRadius:100, background:st.bg, border:`1px solid ${st.col}44` }}>
                                  <StIco/><span style={{ fontSize:11, fontWeight:700, color:st.col }}>{st.l}</span>
                                </div>
                              </div>
                              {/* Order body */}
                              <div style={{ padding:'10px 16px', fontSize:12, color:C.text, lineHeight:1.8 }}>
                                {ord.items_text && <div><strong style={{color:C.muted}}>{T.products}</strong> {ord.items_text}</div>}
                                {ord.address    && <div style={{display:'flex',alignItems:'center',gap:4}}><IcoAddress/><strong style={{color:C.muted}}>{T.address}</strong> {ord.address}</div>}
                                {ord.comment    && <div style={{color:C.terr}}><strong>{T.comment}</strong> {ord.comment}</div>}
                              </div>
                              {/* Actions */}
                              <div style={{ padding:'8px 16px', borderTop:`1px solid ${C.border}`, display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                                <select value={ord.status||'new'} onChange={e=>handleStatusChange(ord.id,e.target.value)} disabled={isUpdating}
                                  style={{ padding:'4px 10px', borderRadius:8, border:`1.5px solid ${st.col}`, background:st.bg, color:st.col, fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'var(--sans,Jost)', outline:'none' }}>
                                  {ordStatuses.map(s=><option key={s.k} value={s.k}>{s.l}</option>)}
                                </select>
                                {!ord.reviewed && (
                                  <button onClick={()=>handleReviewOrder(ord.id)}
                                    style={{ padding:'4px 12px', borderRadius:8, border:`1.5px solid ${C.gold}`, background:'rgba(201,146,42,.1)', color:C.gold, fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'var(--sans,Jost)', display:'flex', alignItems:'center', gap:5 }}>
                                    <IcoDone/> Переглянуто
                                  </button>
                                )}
                                {ord.reviewed && <span style={{ fontSize:11, color:'#16a34a', display:'flex', alignItems:'center', gap:4 }}><IcoDone/> Переглянуто</span>}
                                {isUpdating && <span style={{ fontSize:11, color:C.muted }}>{T.saving}</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })()
        ) : mainTab === 'exchange' ? (
          /* ── EXCHANGE RATE PANEL ── */
          <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:C.cream }}>
            <div style={{ padding:'12px 20px', borderBottom:`1px solid ${C.border}`, background:C.parch, flexShrink:0, display:'flex', gap:10, alignItems:'center' }}>
              <div style={{ fontSize:13, fontWeight:700, color:C.dark, flex:1 }}>{T.tabExchange} · USD / UAH · НБУ</div>
              <button onClick={fetchExchRate} disabled={exchLoading}
                style={{ padding:'6px 14px', borderRadius:8, border:`1.5px solid ${C.moss}44`, background:'transparent', color:C.moss, fontSize:12, cursor:'pointer', fontFamily:'var(--sans,Jost)', fontWeight:600, transition:'background .15s', display:'flex', alignItems:'center', gap:5 }}
                onMouseEnter={e=>e.currentTarget.style.background=C.parch} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <IcoRefresh/>{exchLoading ? '...' : T.exchRefresh}
              </button>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:'20px', scrollbarWidth:'thin', scrollbarColor:`${C.muted} transparent` }}>
              {/* Rate card */}
              <div style={{ background:C.white, borderRadius:16, border:`1px solid ${C.border}`, padding:'28px 24px', textAlign:'center', marginBottom:18 }}>
                {exchLoading ? (
                  <div style={{ color:C.muted, fontSize:14 }}>{T.exchLoading}</div>
                ) : exchRate ? (
                  <>
                    <div style={{ fontSize:11, fontWeight:700, color:C.muted, letterSpacing:'.09em', textTransform:'uppercase', marginBottom:10 }}>{T.exchRateToday}</div>
                    <div style={{ display:'flex', alignItems:'baseline', justifyContent:'center', gap:12 }}>
                      <span style={{ fontSize:44, fontWeight:800, color:C.moss, fontFamily:'var(--serif,Cormorant)', lineHeight:1 }}>1 $</span>
                      <span style={{ fontSize:28, color:C.muted }}>=</span>
                      <span style={{ fontSize:44, fontWeight:800, color:C.dark, fontFamily:'var(--serif,Cormorant)', lineHeight:1 }}>{exchRate.toFixed(2)} ₴</span>
                    </div>
                    <div style={{ fontSize:11, color:C.muted, marginTop:8 }}>{T.exchSource}</div>
                  </>
                ) : (
                  <div style={{ color:C.terr, fontSize:13 }}>{T.exchError}
                    <button onClick={fetchExchRate} style={{ background:'none', border:'none', color:C.moss, cursor:'pointer', fontWeight:700, fontFamily:'var(--sans,Jost)', marginLeft:6 }}>{T.exchRetry}</button>
                  </div>
                )}
              </div>
              {/* Calculator */}
              {exchRate && (
                <div style={{ background:C.white, borderRadius:16, border:`1px solid ${C.border}`, padding:'16px 20px', marginBottom:18 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'.08em', marginBottom:12 }}>{T.exchCalcTitle}</div>
                  <div style={{ display:'flex', gap:12, alignItems:'flex-end', flexWrap:'wrap' }}>
                    <div>
                      <label style={{ fontSize:10, color:C.muted, display:'block', marginBottom:4, fontWeight:700 }}>USD</label>
                      <input type="number" value={calcUsd} onChange={e=>setCalcUsd(e.target.value)} placeholder={T.exchCalcPH} min="0" step="0.01"
                        style={{ width:120, padding:'8px 12px', borderRadius:8, border:`1.5px solid ${C.border}`, fontSize:14, fontFamily:'var(--sans,Jost)', color:C.dark, background:C.cream, outline:'none', boxSizing:'border-box' }}
                        onFocus={e=>e.target.style.borderColor=C.moss} onBlur={e=>e.target.style.borderColor=C.border}/>
                    </div>
                    <div style={{ fontSize:20, color:C.muted, paddingBottom:9 }}>→</div>
                    <div>
                      <label style={{ fontSize:10, color:C.muted, display:'block', marginBottom:4, fontWeight:700 }}>UAH</label>
                      <div style={{ minWidth:150, padding:'8px 14px', borderRadius:8, border:`1.5px solid ${C.border}`, fontSize:14, fontWeight:700, color:C.moss, background:C.parch, boxSizing:'border-box' }}>
                        {calcUsd && !isNaN(+calcUsd) && +calcUsd > 0 ? `${(+calcUsd * exchRate).toFixed(2)} ₴` : '—'}
                      </div>
                    </div>
                    {calcUsd && !isNaN(+calcUsd) && +calcUsd > 0 && (
                      <div style={{ fontSize:11, color:C.muted, paddingBottom:10 }}>(курс {exchRate.toFixed(2)})</div>
                    )}
                  </div>
                </div>
              )}
              {/* Products price list */}
              <div style={{ background:C.white, borderRadius:16, border:`1px solid ${C.border}`, overflow:'hidden' }}>
                <div style={{ padding:'12px 18px', borderBottom:`1px solid ${C.border}`, fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'.08em' }}>{T.exchPriceList}</div>
                {PRODUCTS_DATA.map((p, i) => {
                  const dbP = productPrices.find(pp => pp.product_id === String(p.id));
                  const displayLabel = dbP?.price_label || p.priceLabel;
                  const computedUah = exchRate ? Math.round(p.price * exchRate) : null;
                  return (
                    <div key={p.id} style={{ padding:'9px 18px', display:'flex', alignItems:'center', gap:10, borderTop:i>0?`1px solid ${C.border}`:'none', background:i%2===0?'transparent':'rgba(0,0,0,.015)' }}>
                      <img src={p.img} alt={p.name} style={{ width:30, height:30, borderRadius:7, objectFit:'cover', flexShrink:0, background:C.parch }} loading="lazy"/>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:12, fontWeight:700, color:C.dark, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{dbP?.product_name || p.name}</div>
                        <div style={{ fontSize:10, color:C.muted }}>{p.origin}</div>
                      </div>
                      <div style={{ textAlign:'right', flexShrink:0 }}>
                        <div style={{ fontSize:12, fontWeight:700, color:C.moss }}>{displayLabel}</div>
                        {!dbP?.price_uah && computedUah && <div style={{ fontSize:10, color:C.muted }}>~{computedUah} ₴/кг</div>}
                        {dbP?.price_uah && <div style={{ fontSize:10, color:C.muted }}>UAH: {dbP.price_uah} ₴</div>}
                      </div>
                      {dbP && <span style={{ fontSize:9, padding:'2px 7px', borderRadius:100, background:'rgba(58,107,59,.12)', color:C.moss, fontWeight:700, flexShrink:0 }}>✓ DB</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : mainTab === 'products' ? (
          /* ── PRODUCTS PANEL ── */
          (() => {
            const fp = productSearch
              ? PRODUCTS_DATA.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
              : PRODUCTS_DATA;
            return (
              <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:C.cream }}>
                {/* Toolbar */}
                <div style={{ padding:'12px 20px', borderBottom:`1px solid ${C.border}`, background:C.parch, flexShrink:0, display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
                  <div style={{ position:'relative', flex:'1 1 200px', minWidth:200, maxWidth:380 }}>
                    <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:C.muted, pointerEvents:'none' }}><IcoSearch/></span>
                    <input type="text" value={productSearch} onChange={e=>setProductSearch(e.target.value)}
                      placeholder={T.productSearchP}
                      style={{ width:'100%', padding:'8px 12px 8px 34px', borderRadius:20, border:`1.5px solid ${C.border}`, fontSize:12, fontFamily:'var(--sans,Jost)', color:C.dark, background:C.white, outline:'none', boxSizing:'border-box', transition:'border-color .2s' }}
                      onFocus={e=>e.target.style.borderColor=C.moss} onBlur={e=>e.target.style.borderColor=C.border}/>
                  </div>
                  <div style={{ fontSize:11, color:C.muted }}>{T.found} <strong style={{color:C.dark}}>{fp.length}</strong></div>
                </div>

                {/* Products grid */}
                <div style={{ flex:1, overflowY:'auto', padding:'16px 20px', scrollbarWidth:'thin', scrollbarColor:`${C.muted} transparent` }}>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:14 }}>
                    {fp.map(prod => {
                      const ps = productStatuses.find(p=>p.product_id===prod.id);
                      const status = ps?.status || 'available';
                      const statusColors = { available:'#16a34a', low:'#c9922a', out:'#dc2626' };
                      const statusLabels = { available:T.statusAvail, low:T.statusLow, out:T.statusOut };
                      const sCol = statusColors[status];
                      const sLbl = statusLabels[status];
                      // orders containing this product
                      const matchOrders = allOrders.filter(o => o.items_text && o.items_text.toLowerCase().includes(prod.name.toLowerCase()));
                      const activeMatchOrds = matchOrders.filter(o => o.status==='new'||o.status==='processing'||!o.status);
                      const isSaving = prodSaving === prod.id;
                      const savedRecently = ps && !isSaving;
                      return (
                        <div key={prod.id} style={{ background:C.white, borderRadius:16, border:`1px solid ${C.border}`, overflow:'hidden', transition:'box-shadow .2s, transform .2s' }}
                          onMouseEnter={e=>{e.currentTarget.style.boxShadow='0 6px 22px rgba(0,0,0,.09)';e.currentTarget.style.transform='translateY(-2px)';}}
                          onMouseLeave={e=>{e.currentTarget.style.boxShadow='none';e.currentTarget.style.transform='none';}}>
                          {/* Product header */}
                          <div style={{ display:'flex', gap:12, padding:'12px 14px', borderBottom:`1px solid ${C.border}`, alignItems:'center' }}>
                            <img src={prod.img} alt={prod.name} style={{ width:46, height:46, borderRadius:10, objectFit:'cover', flexShrink:0, background:C.parch }} loading="lazy"/>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontSize:13, fontWeight:700, color:C.dark, fontFamily:'var(--sans,Jost)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{prod.name}</div>
                              <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{prod.origin}</div>
                              <div style={{ fontSize:11, fontWeight:700, color:C.moss, marginTop:1 }}>{prod.priceLabel}</div>
                            </div>
                            {/* Status badge */}
                            <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
                              <span style={{ fontSize:9, padding:'2px 8px', borderRadius:100, background:`${sCol}18`, color:sCol, fontWeight:700, border:`1px solid ${sCol}44`, whiteSpace:'nowrap' }}>{sLbl}</span>
                              {activeMatchOrds.length > 0 && (
                                <span style={{ fontSize:9, padding:'2px 7px', borderRadius:100, background:'rgba(201,146,42,.15)', color:C.gold, fontWeight:700 }}>
                                  {activeMatchOrds.length} замовл.
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Current DB price badge */}
                          {(() => { const dbP = productPrices.find(p=>p.product_id===String(prod.id)); return dbP ? (
                            <div style={{ padding:'4px 14px 0', display:'flex', gap:6, alignItems:'center' }}>
                              <span style={{ fontSize:10, padding:'2px 8px', borderRadius:6, background:'rgba(58,107,59,.1)', color:C.moss, fontWeight:700 }}>✓ {dbP.price_label}</span>
                              {dbP.product_name !== prod.name && <span style={{ fontSize:10, color:C.muted, fontStyle:'italic' }}>→ {dbP.product_name}</span>}
                            </div>
                          ) : null; })()}
                          {/* Status editor */}
                          <div style={{ padding:'10px 14px', display:'flex', flexDirection:'column', gap:8 }}>
                            <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                              {[{k:'available',l:T.statusAvail,c:'#16a34a'},{k:'low',l:T.statusLow,c:'#c9922a'},{k:'out',l:T.statusOut,c:'#dc2626'}].map(s=>(
                                <button key={s.k}
                                  onClick={()=>saveProductStatus(prod.id,prod.name,s.k)}
                                  disabled={isSaving}
                                  style={{ padding:'4px 11px', borderRadius:100, fontSize:11, fontWeight:700, fontFamily:'var(--sans,Jost)', cursor:'pointer', border:`1.5px solid ${status===s.k ? s.c : 'transparent'}`, background: status===s.k ? `${s.c}18` : 'rgba(20,26,20,.06)', color: status===s.k ? s.c : C.muted, transition:'all .2s', opacity:isSaving?.5:1 }}>
                                  {s.l}
                                </button>
                              ))}
                            </div>
                            <input type="text" value={prodNotes[prod.id]||''} onChange={e=>setProdNotes(prev=>({...prev,[prod.id]:e.target.value}))}
                              placeholder={T.productNote}
                              style={{ padding:'5px 10px', borderRadius:8, border:`1px solid ${C.border}`, fontSize:11, fontFamily:'var(--sans,Jost)', color:C.dark, background:C.cream, outline:'none', transition:'border-color .2s' }}
                              onFocus={e=>e.target.style.borderColor=C.moss} onBlur={e=>{ e.target.style.borderColor=C.border; if((prodNotes[prod.id]||'')!==(ps?.note||'')) saveProductStatus(prod.id,prod.name,status); }}/>
                          </div>

                          {/* Price editor */}
                          {editingProd === prod.id ? (
                            <div style={{ padding:'2px 14px 12px', display:'flex', flexDirection:'column', gap:6, borderTop:`1px solid ${C.border}`, background:C.cream }}>
                              <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'.07em', marginTop:8 }}>Зміна ціни / назви</div>
                              <input type="text" value={editForm.name} onChange={e=>setEditForm(f=>({...f,name:e.target.value}))}
                                placeholder={`Назва (${prod.name})`}
                                style={{ padding:'6px 10px', borderRadius:8, border:`1.5px solid ${C.border}`, fontSize:12, fontFamily:'var(--sans,Jost)', color:C.dark, background:C.white, outline:'none' }}
                                onFocus={e=>e.target.style.borderColor=C.moss} onBlur={e=>e.target.style.borderColor=C.border}/>
                              {/* USD input → auto-compute UAH */}
                              <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                                <input type="number" value={editForm.priceUsd}
                                  onChange={e=>{
                                    const usd = e.target.value;
                                    const uah = exchRate && usd ? Math.round(parseFloat(usd) * exchRate) : '';
                                    setEditForm(f=>({...f, priceUsd:usd, price_uah:uah}));
                                  }}
                                  placeholder="Ціна в $ USD за кг/шт"
                                  min="0" step="0.01"
                                  style={{ flex:1, padding:'6px 10px', borderRadius:8, border:`1.5px solid ${C.moss}55`, fontSize:12, fontFamily:'var(--sans,Jost)', color:C.dark, background:C.white, outline:'none' }}
                                  onFocus={e=>e.target.style.borderColor=C.moss} onBlur={e=>e.target.style.borderColor=`${C.moss}55`}/>
                                {exchRate && editForm.priceUsd ? (
                                  <span style={{ fontSize:13, fontWeight:700, color:C.moss, whiteSpace:'nowrap' }}>
                                    = {Math.round(parseFloat(editForm.priceUsd||0) * exchRate)} ₴
                                  </span>
                                ) : (
                                  <span style={{ fontSize:11, color:C.muted, whiteSpace:'nowrap' }}>
                                    {exchRate ? `1$ = ${exchRate} ₴` : 'Завантаження курсу…'}
                                  </span>
                                )}
                              </div>
                              {/* Fallback: direct UAH input if no USD */}
                              <input type="number" value={editForm.price_uah}
                                onChange={e=>setEditForm(f=>({...f,price_uah:e.target.value, priceUsd:''}))}
                                placeholder="Або введіть ціну в ₴ напряму"
                                min="0" step="1"
                                style={{ padding:'6px 10px', borderRadius:8, border:`1.5px solid ${C.border}`, fontSize:12, fontFamily:'var(--sans,Jost)', color:C.dark, background:C.white, outline:'none' }}
                                onFocus={e=>e.target.style.borderColor=C.moss} onBlur={e=>e.target.style.borderColor=C.border}/>
                              <div style={{ display:'flex', gap:6, marginTop:2 }}>
                                <button onClick={()=>saveProductPrice(prod.id, editForm.name||prod.name, editForm.priceUsd, editForm.price_uah)}
                                  disabled={priceSaving===prod.id}
                                  style={{ padding:'6px 16px', borderRadius:8, border:'none', background:C.moss, color:C.cream, fontSize:12, fontWeight:700, fontFamily:'var(--sans,Jost)', cursor:'pointer', opacity:priceSaving===prod.id?0.6:1, display:'flex', alignItems:'center', gap:5, transition:'opacity .2s' }}>
                                  {priceSaving===prod.id ? '…' : <><IcoSave/> {T.editSaveBtn}</>}
                                </button>
                                <button onClick={()=>setEditingProd(null)}
                                  style={{ padding:'6px 12px', borderRadius:8, border:`1px solid ${C.border}`, background:'transparent', color:C.muted, fontSize:12, cursor:'pointer', fontFamily:'var(--sans,Jost)', transition:'background .15s' }}
                                  onMouseEnter={e=>e.currentTarget.style.background=C.parch} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                                  {T.editCancelBtn}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div style={{ padding:'0 14px 10px' }}>
                              <button onClick={()=>{
                                const pp=productPrices.find(p=>p.product_id===String(prod.id));
                                const uah = pp?.price_uah || prod.price;
                                const usd = exchRate && uah ? (uah / exchRate).toFixed(2) : '';
                                setEditForm({ name:pp?.product_name||prod.name, priceUsd:usd, price_uah:uah });
                                setEditingProd(prod.id);
                              }}
                                style={{ padding:'5px 12px', borderRadius:8, border:`1px solid ${C.moss}44`, background:'transparent', color:C.moss, fontSize:11, cursor:'pointer', fontFamily:'var(--sans,Jost)', fontWeight:600, display:'flex', alignItems:'center', gap:5, transition:'background .15s' }}
                                onMouseEnter={e=>e.currentTarget.style.background='rgba(58,107,59,.07)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                                <IcoEdit/> {T.editPriceBtn}
                              </button>
                            </div>
                          )}
                          {/* Orders by this product */}
                          {matchOrders.length > 0 && (
                            <div style={{ borderTop:`1px solid ${C.border}`, background:C.cream }}>
                              <div style={{ padding:'6px 14px 4px', fontSize:10, fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:C.muted, display:'flex', alignItems:'center', gap:6 }}>
                                <IcoBox/> {T.clientOrdersLbl} {matchOrders.length}
                                {activeMatchOrds.length>0 && <span style={{color:C.gold, fontWeight:700}}>({activeMatchOrds.length} активних)</span>}
                              </div>
                              <div style={{ maxHeight:160, overflowY:'auto', scrollbarWidth:'thin', scrollbarColor:`${C.muted} transparent` }}>
                                {matchOrders.slice(0,8).map(ord=>{
                                  const st2 = ordStatuses.find(s=>s.k===(ord.status||'new'))||ordStatuses[0];
                                  const St2Ico = st2.Ico;
                                  const isNw = !ord.reviewed&&(!ord.status||ord.status==='new');
                                  return (
                                    <div key={ord.id} style={{ padding:'6px 14px', display:'flex', alignItems:'center', gap:8, borderTop:`1px solid ${C.border}`, background: isNw?'rgba(201,146,42,.04)':'transparent' }}>
                                      <span style={{ fontSize:10, fontFamily:'monospace', color:C.moss, fontWeight:700 }}>{ord.order_id||`#${ord.id}`}</span>
                                      <span style={{ fontSize:11, color:C.dark, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ord.name||'—'}</span>
                                      {isNw && <span style={{ fontSize:9, padding:'1px 6px', borderRadius:100, background:'rgba(201,146,42,.18)', color:C.gold, fontWeight:700 }}>NEW</span>}
                                      <span style={{ display:'flex', alignItems:'center', gap:3, fontSize:10, color:st2.col, fontWeight:700 }}><St2Ico/>{st2.l}</span>
                                      <button onClick={()=>handleStatusChange(ord.id, ord.status==='new'?'processing':ord.status==='processing'?'done':ord.status)}
                                        disabled={updatingId===ord.id}
                                        style={{ padding:'2px 8px', borderRadius:6, border:`1px solid ${C.moss}33`, background:'transparent', color:C.moss, fontSize:10, cursor:'pointer', fontFamily:'var(--sans,Jost)', fontWeight:600, transition:'background .15s' }}
                                        onMouseEnter={e=>e.currentTarget.style.background=C.parch}
                                        onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                                        <IcoChevR/>
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()
        ) : <>

        {/* ── LEFT PANEL: session list ── */}
        <div className={`mgr-left${activeId ? ' mgr-left--hidden' : ''}`} style={{ width:300, borderRight:`1px solid ${C.border}`, display:'flex', flexDirection:'column', background: C.white, flexShrink:0, overflow:'hidden' }}>

          {/* Panel header */}
          <div style={{ padding:'14px 16px', borderBottom:`1px solid ${C.border}`, background: C.parch, flexShrink:0 }}>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color: C.muted, marginBottom:10 }}>
              {T.chatsTitle}
            </div>
            {/* Filter chips */}
            <div style={{ display:'flex', gap:6 }}>
              {[['all',T.filterAll], ['unread',T.filterUnread]].map(([key, lbl]) => (
                <button key={key} onClick={() => setFilter(key)}
                  style={{ padding:'4px 12px', borderRadius:100, border:'none', cursor:'pointer', fontSize:11, fontWeight:700, fontFamily:'var(--sans,Jost)', transition:'background .2s',
                    background: filter===key ? C.dark : 'rgba(20,26,20,.08)',
                    color:      filter===key ? C.cream : C.muted,
                  }}>
                  {lbl}{key === 'unread' && totalUnread > 0 && ` (${totalUnread})`}
                </button>
              ))}
            </div>
          </div>

          {/* Session list */}
          <div style={{ flex:1, overflowY:'auto', scrollbarWidth:'thin', scrollbarColor:`${C.muted} transparent` }}>
            {visibleSessions.length === 0 ? (
              <div style={{ padding:'32px 16px', textAlign:'center' }}>
                <div style={{ marginBottom:10, opacity:.4, display:'flex', justifyContent:'center' }}><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>
                <div style={{ fontSize:12, color: C.muted }}>
                  {filter === 'unread' ? T.noUnread : T.noChats}
                </div>
                <div style={{ fontSize:11, color: C.muted, marginTop:6, opacity:.7 }}>
                  {T.chatsHint}<br/>{T.chatsHint2}
                </div>
              </div>
            ) : visibleSessions.map((s, si) => {
              const isActive  = s.id === activeId;
              const hasUnread = s.unread > 0;
              const age = Date.now() - s.time;
              const ageStr = age < 60000 ? 'зараз' : age < 3600000 ? `${Math.floor(age/60000)} хв` : `${Math.floor(age/3600000)} год`;
              return (
                <div key={s.id}
                  className="mgr-fu"
                  onClick={() => setActiveId(s.id)}
                  style={{ animationDelay:`${Math.min(si,14)*0.04}s`, padding:'12px 16px', cursor:'pointer', borderBottom:`1px solid ${C.border}`, transition:'background .15s', position:'relative',
                    background: isActive ? C.cream : (hasUnread ? 'rgba(201,146,42,.06)' : 'transparent'),
                    borderLeft: isActive ? `3px solid ${C.forest}` : '3px solid transparent',
                  }}
                  onMouseEnter={e=>{ if(!isActive) e.currentTarget.style.background = hasUnread ? 'rgba(201,146,42,.1)' : C.cream; }}
                  onMouseLeave={e=>{ if(!isActive) e.currentTarget.style.background = isActive ? C.cream : (hasUnread ? 'rgba(201,146,42,.06)' : 'transparent'); }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                    {/* Avatar */}
                    <div style={{ width:32, height:32, borderRadius:'50%', background: isActive ? C.forest : 'rgba(30,61,31,.12)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0, color: isActive ? C.cream : C.muted }}>
                      {s.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <span style={{ fontSize:13, fontWeight: hasUnread ? 700 : 500, color: hasUnread ? C.dark : C.text, fontFamily:'var(--sans,Jost)' }}>{s.name || 'Гість'}</span>
                        <span style={{ fontSize:10, color: C.muted }}>{ageStr}</span>
                      </div>
                      <div style={{ fontSize:11, color: hasUnread ? C.muted : 'rgba(42,56,40,.4)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginTop:1 }}>
                        {s.lastMsg || '—'}
                      </div>
                    </div>
                    {hasUnread && (
                      <span style={{ width:18, height:18, borderRadius:'50%', background: C.gold, color:'#fff', fontSize:10, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{s.unread}</span>
                    )}
                  </div>
                  <div style={{ fontSize:9, color: C.muted, fontFamily:'monospace', opacity:.5, marginLeft:40 }}>#{s.id}</div>

                  {/* Delete button */}
                  <button
                    onClick={e => { e.stopPropagation(); clearSession(s.id); }}
                    style={{ position:'absolute', top:8, right:8, opacity:0, width:20, height:20, borderRadius:6, border:`1px solid #fca5a5`, background:'transparent', color:'#dc2626', cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', justifyContent:'center', transition:'opacity .2s' }}
                    onMouseEnter={e=>{e.currentTarget.style.opacity='1';e.currentTarget.style.background='#fee2e2';}}
                    onMouseLeave={e=>{e.currentTarget.style.opacity='0';e.currentTarget.style.background='transparent';}}
                    title="Видалити чат">×</button>
                </div>
              );
            })}
          </div>

          {/* Stats footer */}
          <div style={{ padding:'10px 16px', borderTop:`1px solid ${C.border}`, background: C.parch, flexShrink:0 }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color: C.muted }}>
              <span>{T.statsTotal} <strong style={{ color: C.dark }}>{sessions.length}</strong></span>
              <span>{T.statsUnread} <strong style={{ color: totalUnread > 0 ? C.gold : C.dark }}>{totalUnread}</strong></span>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL: chat thread ── */}
        <div className="mgr-right" style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          {!activeId ? (
            /* Placeholder */
            <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:14, color: C.muted }}>
              <div style={{ opacity:.2 }}><svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>
              <div style={{ fontFamily:'var(--serif,Cormorant Garamond)', fontSize:24, color: C.dark, opacity:.35 }}>{T.selectChat}</div>
              <div style={{ fontSize:13, opacity:.5, textAlign:'center', lineHeight:1.7 }}>
                {T.selectHint}<br/>{T.selectHint2}
              </div>
            </div>
          ) : (() => {
            const session = sessions.find(s => s.id === activeId);
            return (
              <>
                {/* Chat header */}
                <div style={{ padding:'12px 20px', borderBottom:`1px solid ${C.border}`, background: C.white, display:'flex', alignItems:'center', gap:12, flexShrink:0, boxShadow:'0 1px 8px rgba(0,0,0,.06)' }}>
                  {/* Back button */}
                  <button className="mgr-back" onClick={() => setActiveId(null)}
                    style={{ padding:'6px 10px', borderRadius:8, border:`1px solid ${C.border}`, background:'transparent', color:C.muted, fontSize:18, cursor:'pointer', lineHeight:1, alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    ←
                  </button>
                  {/* Avatar */}
                  <div style={{ width:40, height:40, borderRadius:'50%', background: C.forest, display:'flex', alignItems:'center', justifyContent:'center', color: C.cream, fontSize:17, fontWeight:700, fontFamily:'var(--serif,Cormorant Garamond)', flexShrink:0 }}>
                    {session?.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <div style={{ fontSize:15, fontWeight:700, color: C.dark, fontFamily:'var(--sans,Jost)' }}>{session?.name || T.guest}</div>
                    <div style={{ fontSize:11, color: C.muted, fontFamily:'monospace' }}>{T.sessionInfo(activeId, msgs.length)}</div>
                  </div>
                  <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
                    <button
                      onClick={() => {
                        const newOpen = !ordPanelOpen;
                        setOrdPanelOpen(newOpen);
                        if (newOpen) fetchClientOrders(session?.name);
                      }}
                      style={{ padding:'6px 12px', borderRadius:8, border:`1px solid ${C.border}`, background: ordPanelOpen ? C.forest : 'transparent', color: ordPanelOpen ? C.cream : C.muted, fontSize:11, cursor:'pointer', fontFamily:'var(--sans,Jost)', transition:'background .2s, color .2s, transform .15s', display:'flex', alignItems:'center', gap:5 }}
                      onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-1px)'; if(!ordPanelOpen){ e.currentTarget.style.background=C.cream; e.currentTarget.style.color=C.dark; } }}
                      onMouseLeave={e=>{ e.currentTarget.style.transform='none'; if(!ordPanelOpen){ e.currentTarget.style.background='transparent'; e.currentTarget.style.color=C.muted; } }}>
                      <IcoBox/> {T.ordersBtn}
                    </button>
                    <button
                      onClick={() => clearSession(activeId)}
                      style={{ padding:'6px 12px', borderRadius:8, border:`1px solid #fca5a5`, background:'transparent', color:'#dc2626', fontSize:11, cursor:'pointer', fontFamily:'var(--sans,Jost)', transition:'background .2s, transform .15s', display:'flex', alignItems:'center', gap:5 }}
                      onMouseEnter={e=>{ e.currentTarget.style.background='#fee2e2'; e.currentTarget.style.transform='translateY(-1px)'; }}
                      onMouseLeave={e=>{ e.currentTarget.style.background='transparent'; e.currentTarget.style.transform='none'; }}>
                      <IcoTrash/> {T.deleteBtn}
                    </button>
                  </div>
                </div>

                {/* Orders panel */}
                {ordPanelOpen && (
                  <div style={{ background: C.white, borderBottom:`1px solid ${C.border}`, maxHeight:220, overflowY:'auto', scrollbarWidth:'thin', scrollbarColor:`${C.muted} transparent` }}>
                    <div style={{ padding:'8px 16px 6px', fontSize:10, fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color: C.muted, borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:8 }}>
                      {T.ordersBtn}: {session?.name || T.ordersOf}
                      {clientOrdLoading && <span style={{ opacity:.5 }}>{T.loadingCl}</span>}
                    </div>
                    {!clientOrdLoading && clientOrders.length === 0 && (
                      <div style={{ padding:'16px', textAlign:'center', fontSize:12, color: C.muted, opacity:.7 }}>{T.noClientOrds}</div>
                    )}
                    {clientOrders.map(ord => (
                      <div key={ord.id} style={{ borderBottom:`1px solid ${C.border}` }}>
                        <div
                          onClick={() => setExpandedOrd(expandedOrd === ord.id ? null : ord.id)}
                          style={{ padding:'8px 16px', cursor:'pointer', display:'flex', alignItems:'center', gap:10, transition:'background .15s' }}
                          onMouseEnter={e=>e.currentTarget.style.background=C.cream}
                          onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                          <span style={{ fontSize:11, fontFamily:'monospace', color: C.moss, fontWeight:700 }}>{ord.order_id || `#${ord.id}`}</span>
                          <span style={{ fontSize:11, color: C.text, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ord.name}</span>
                          <span style={{ fontSize:11, fontWeight:700, color: C.dark, whiteSpace:'nowrap' }}>{ord.total}</span>
                          <span style={{ fontSize:10, color: C.muted, whiteSpace:'nowrap' }}>{ord.created_at ? new Date(ord.created_at).toLocaleDateString('uk-UA',{day:'numeric',month:'short'}) : ''}</span>
                          <span style={{ fontSize:9, color: C.muted, opacity:.5 }}>{expandedOrd === ord.id ? '▲' : '▼'}</span>
                        </div>
                        {expandedOrd === ord.id && (
                          <div style={{ padding:'8px 16px 12px', background: C.cream, fontSize:11, color: C.text, lineHeight:1.7 }}>
                            {ord.items_text && <div><strong>{T.products}</strong> {ord.items_text}</div>}
                            {ord.phone    && <div><strong>{T.phone}</strong> {ord.phone}</div>}
                            {ord.address  && <div><strong>{T.address}</strong> {ord.address}</div>}
                            {ord.email    && <div><strong>Email:</strong> {ord.email}</div>}
                            {ord.comment  && <div><strong>{T.comment}</strong> {ord.comment}</div>}
                            <div><strong>{T.statusLabel}</strong> <span style={{ color: C.moss, fontWeight:700 }}>{ord.status || T.newStatus}</span></div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Messages */}
                <div ref={msgsContainerRef} style={{ flex:1, overflowY:'auto', padding:'16px', display:'flex', flexDirection:'column', gap:10, background: C.cream, scrollbarWidth:'thin', scrollbarColor:`${C.muted} transparent` }}>
                  {msgs.length === 0 ? (
                    <div style={{ textAlign:'center', padding:'40px', color: C.muted, opacity:.5 }}>
                      <div style={{ marginBottom:8, opacity:.4 }}><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>
                      <div>{T.noMsgs}</div>
                    </div>
                  ) : msgs.map((m, mi) => {
                    const isManager = m.from === 'manager';
                    const isAI      = m.from === 'ai';
                    return (
                      <div key={m.id} className="mgr-fu" style={{ animationDelay:`${Math.min(mi,20)*0.022}s`, display:'flex', justifyContent: isManager ? 'flex-end' : 'flex-start', gap:8, alignItems:'flex-end' }}>
                        {!isManager && (
                          <div style={{ width:28, height:28, borderRadius:'50%', background: isAI ? 'linear-gradient(135deg,#c9922a22,#c9922a44)' : 'rgba(30,61,31,.12)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, border: isAI ? '1px solid rgba(201,146,42,.3)' : 'none', color: isAI ? C.gold : C.muted }}>
                            {isAI ? <IcoAI/> : <IcoUser/>}
                          </div>
                        )}
                        <div style={{ maxWidth:'72%' }}>
                          {!isManager && (
                            <div style={{ fontSize:10, color: C.muted, marginBottom:3, marginLeft:2 }}>
                              {isAI ? <><IcoAI/> {T.aiLabel}</> : <><IcoUser/> {session?.name || T.guest}</>}
                            </div>
                          )}
                          <div style={{ padding:'8px 14px', borderRadius:14, fontSize:13, lineHeight:1.55, wordBreak:'break-word',
                              background: isManager ? C.forest : isAI ? 'rgba(201,146,42,.08)' : C.white,
                              color: isManager ? C.cream : C.dark,
                              border: isManager ? 'none' : isAI ? '1px solid rgba(201,146,42,.22)' : `1px solid ${C.border}`,
                              boxShadow: '0 1px 4px rgba(0,0,0,.06)',
                            }}>{m.text}</div>
                          <div style={{ fontSize:10, color: C.muted, marginTop:3, textAlign: isManager ? 'right' : 'left' }}>
                            {isManager && <span style={{ marginRight:4 }}>{T.youSender}</span>}{m.time}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                </div>

                {/* Reply input */}
                <div style={{ padding:'12px 16px', borderTop:`1px solid ${C.border}`, background: C.white, display:'flex', gap:10, flexShrink:0, alignItems:'flex-end' }}>
                  <textarea
                    ref={inputRef}
                    value={replyInput}
                    onChange={e => setReplyInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder={T.replyPH}
                    rows={2}
                    style={{ flex:1, padding:'10px 14px', borderRadius:14, border:`1.5px solid ${C.border}`, fontSize:13, fontFamily:'var(--sans,Jost)', color: C.dark, outline:'none', resize:'none', background: C.cream, lineHeight:1.5, transition:'border-color .2s' }}
                    onFocus={e=>e.target.style.borderColor=C.moss}
                    onBlur={e=>e.target.style.borderColor=C.border}
                  />
                  <button onClick={handleSend} disabled={!replyInput.trim() || sending}
                    style={{ padding:'10px 20px', borderRadius:100, border:'none', background: replyInput.trim() ? C.forest : C.border, color: replyInput.trim() ? C.cream : C.muted, fontFamily:'var(--sans,Jost)', fontSize:13, fontWeight:700, cursor: replyInput.trim() ? 'pointer' : 'default', transition:'background .2s, transform .2s', flexShrink:0, alignSelf:'flex-end', marginBottom:2, display:'flex', alignItems:'center', gap:7 }}
                    onMouseEnter={e=>{ if(replyInput.trim()) { e.currentTarget.style.background=C.moss; e.currentTarget.style.transform='translateY(-1px)'; } }}
                    onMouseLeave={e=>{ e.currentTarget.style.background=replyInput.trim()?C.forest:C.border; e.currentTarget.style.transform='none'; }}>
                    {sending ? <IcoProc/> : <IcoSend/>} {sending ? '…' : T.sendBtn}
                  </button>
                </div>
              </>
            );
          })()}
        </div>        </>}
        </div>
      </div>
    </div>
  );
}
