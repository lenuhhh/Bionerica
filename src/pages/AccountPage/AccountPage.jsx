/**
 * AccountPage — full-featured personal cabinet
 * • Personal analytics with charts
 * • Order history with filtering
 * • Address book
 * • Manager chat (Telegram polling)
 * • Direct contact buttons
 * • Profile settings
 */
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  supabase,
  getSession    as sbGetSession,
  getProfile    as sbGetProfile,
  upsertProfile as sbUpsertProfile,
  getOrders     as sbGetOrders,
  signOut       as sbSignOut,
  signInWithGoogle as sbSignInWithGoogle,
} from '../../services/supabase.js';
import { TG_BOT_TOKEN, tgSend, tgGetUpdates, notifyNewChat, forwardMessage } from '../../services/telegramService.js';

/* ── AI Chat assistant ── */
const AI_IS_AVAILABLE = !TG_BOT_TOKEN || TG_BOT_TOKEN === 'YOUR_BOT_TOKEN';

const AI_RESPONSES = {
  greet: {
    ua: ['Привіт! 😊 Я Оля, ваш асистент Bionerika. Як можу допомогти?','Вітаю, звертаюся до вашої уваги — чим можу допомогти сьогодні? 🌿','Доброго дня! Радий вас бачити. Що вас цікавить?'],
    ru: ['Привет! 😊 Я Оля, ваш ассистент Bionerika. Чем могу помочь?','Добрый день! Рада помочь — что вас интересует? 🌿','Здравствуйте! Чем могу быть полезна сегодня?'],
    en: ['Hello! 😊 I\'m Olya, your Bionerika assistant. How can I help?','Hi there! Happy to help — what do you need today? 🌿','Good day! What can I assist you with?'],
  },
  delivery: {
    ua: ['Доставка здійснюється щодня, включаючи вихідні. Власний транспорт — від 1 дня по Україні 🚚 Київ і передмістя: доставляємо вранці до 10:00. Мінімальне замовлення — 500 грн.','Доставляємо по всій Україні! Київ — на наступний день, регіони — 1–3 дні. Є самовивіз зі складу. Хочете дізнатися вартість для вашого міста? 😊'],
    ru: ['Доставка ежедневно, включая выходные. Собственный транспорт — от 1 дня по Украине 🚚 Киев и пригороды: доставляем утром до 10:00. Минимальный заказ — 500 грн.','Доставляем по всей Украине! Киев — на следующий день, регионы — 1–3 дня. Есть самовывоз со склада. Хотите узнать стоимость для вашего города? 😊'],
    en: ['We deliver every day including weekends. Own transport — from 1 day across Ukraine 🚚 Kyiv and suburbs: morning delivery before 10:00 AM. Min order 500 UAH.','We ship all over Ukraine! Kyiv — next day, regions — 1–3 days. Also available for self-pickup. Want to know shipping for your city? 😊'],
  },
  price: {
    ua: ['Ціни залежать від сезону і партії. Для оптових клієнтів (від 20 кг) — знижки 10–30% 💚 Можу надіслати актуальний прайс-лист. Вкажіть, будь ласка, які позиції цікавлять.','У нас честя ціни без переплат — пряма поставка від виробника! Базова лінійка від 28 до 320 грн/кг залежно від позиції. Що конкретно хотіли б замовити? 🌿'],
    ru: ['Цены зависят от сезона и партии. Оптовым клиентам (от 20 кг) — скидки 10–30% 💚 Могу отправить актуальный прайс-лист. Укажите, пожалуйста, какие позиции интересуют.','У нас честные цены без наценок — прямые поставки от производителя! Базовая линейка от 28 до 320 грн/кг. Что конкретно хотели бы заказать? 🌿'],
    en: ['Prices depend on season and order size. Wholesale clients (20kg+) get 10–30% discount 💚 I can send you a current price list. Which products are you interested in?','Fair prices, direct from growers! Range from 28 to 320 UAH/kg depending on the item. What would you like to order? 🌿'],
  },
  product: {
    ua: ['Наш асортимент: 🍅 томати черрі і класичні · 🥒 огірки · 🌸 зрізані квіти · 🍓 ягоди · 🌿 зелень · 🥭 екзотичні фрукти. Що цікавить конкретно? Розповім детальніше!','В наявності завжди свіже! Постачаємо власне та від перевірених фермерів. Є позасезонні культури з теплиць. Яку категорію продукції розглядаєте? 🥦'],
    ru: ['Наш ассортимент: 🍅 томаты черри и классические · 🥒 огурцы · 🌸 срезанные цветы · 🍓 ягоды · 🌿 зелень · 🥭 экзотические фрукты. Что интересует конкретно?','В наличии всегда свежее! Поставляем собственное и от проверенных фермеров. Есть внесезонные культуры из теплиц. Какую категорию продукции рассматриваете? 🥦'],
    en: ['Our range: 🍅 cherry & regular tomatoes · 🥒 cucumbers · 🌸 cut flowers · 🍓 berries · 🌿 greens · 🥭 exotic fruits. What are you interested in?','Always fresh! We supply our own produce and from verified farms. Off-season crops available from greenhouses. What category are you looking for? 🥦'],
  },
  order: {
    ua: ['Замовити дуже просто: 1️⃣ Перейдіть до каталогу → оберіть товар 2️⃣ Натисніть "Замовити" 3️⃣ Введіть дані і підтверджуйте. Або можемо оформити прямо тут — напишіть, що потрібно! 😊','Допоможу оформити замовлення! Напишіть: що саме хочете, кількість, адресу доставки — і я передам менеджеру. Зазвичай підтверджуємо протягом 30 хвилин. 📋'],
    ru: ['Оформить очень просто: 1️⃣ Перейдите в каталог → выберите товар 2️⃣ Нажмите "Заказать" 3️⃣ Введите данные и подтвердите. Или оформим прямо здесь — напишите, что нужно! 😊','Помогу оформить заказ! Напишите: что именно хотите, количество, адрес доставки — и я передам менеджеру. Обычно подтверждаем в течение 30 минут. 📋'],
    en: ['Ordering is easy: 1️⃣ Go to catalog → pick a product 2️⃣ Click "Order" 3️⃣ Fill in details and confirm. Or I can help here — just tell me what you need! 😊','Happy to help with your order! Tell me: what you want, quantity, delivery address — and I\'ll pass it to the manager. We usually confirm within 30 minutes. 📋'],
  },
  payment: {
    ua: ['Приймаємо: 💳 Visa/Mastercard · 📱 Apple/Google Pay · 🏦 На рахунок підприємства (безготівково) · 💵 Готівка при отриманні. Для нових клієнтів перша оплата — 50% передоплата.','Оплата зручним для вас способом. Для постійних клієнтів є відтермінований платіж на 7–14 днів. Оформлюємо всі закриваючі документи. 💼'],
    ru: ['Принимаем: 💳 Visa/Mastercard · 📱 Apple/Google Pay · 🏦 На счёт предприятия (безналично) · 💵 Наличные при получении. Для новых клиентов первая оплата — 50% предоплата.','Оплата удобным для вас способом. Для постоянных клиентов есть отсрочка платежа на 7–14 дней. Оформляем все закрывающие документы. 💼'],
    en: ['We accept: 💳 Visa/Mastercard · 📱 Apple/Google Pay · 🏦 Bank transfer (B2B) · 💵 Cash on delivery. New clients: 50% deposit for first order.','Payment in any way convenient for you. Regular clients can get 7–14 day deferred payment. Full accounting docs provided. 💼'],
  },
  quality: {
    ua: ['Якість — наш головний пріоритет! 🌱 Вся продукція вирощена без ГМО, мінімум хімії. Є власна лабораторія контролю якості. Сертифікати відповідності надаємо на запит.','Контролюємо якість від поля до доставки. Якщо щось не так — повертаємо або замінюємо безкоштовно. Жодних питань, жодних бюрократій. 💪'],
    ru: ['Качество — наш главный приоритет! 🌱 Вся продукция выращена без ГМО, минимум химии. Есть собственная лаборатория контроля качества. Сертификаты соответствия предоставляем по запросу.','Контролируем качество от поля до доставки. Если что-то не так — возвращаем или заменяем бесплатно. Никаких вопросов, никакой бюрократии. 💪'],
    en: ['Quality is our top priority! 🌱 All produce grown without GMO, minimal chemicals. We have an in-house quality lab. Compliance certificates available on request.','We control quality from field to delivery. If anything\'s wrong — we return or replace for free. No questions, no bureaucracy. 💪'],
  },
  thanks: {
    ua: ['Будь ласка! 😊 Якщо ще є питання — задавайте, я тут!','Радо! Звертайтесь будь-коли — я завжди на зв\'язку 🌿','Не за що! Чим ще можу допомогти?'],
    ru: ['Пожалуйста! 😊 Если есть ещё вопросы — спрашивайте, я здесь!','Рада помочь! Обращайтесь в любое время — я всегда на связи 🌿','Не за что! Чем ещё могу помочь?'],
    en: ['You\'re welcome! 😊 Feel free to ask anything else — I\'m here!','My pleasure! Reach out anytime — I\'m always available 🌿','No problem! Anything else I can help with?'],
  },
  fallback: {
    ua: ['Дякую за запитання! Дам відповідь у два рахунки 😊 Уточніть, будь ласка — ви питаєте про доставку, ціни, асортимент чи оформлення замовлення?','Чудове питання! Мені потрібна секунда, щоб знайти точну інформацію для вас. Можете уточнити деталі — яка саме категорія продукції або послуга цікавить? 🌿','Зрозуміла! Щоб дати найкращу відповідь — чи могли б ви уточнити: що саме вас цікавить про наш сервіс або продукцію?'],
    ru: ['Спасибо за вопрос! Отвечу в два счёта 😊 Уточните, пожалуйста — вы спрашиваете про доставку, цены, ассортимент или оформление заказа?','Отличный вопрос! Мне нужна секунда для точного ответа. Можете уточнить детали — какая категория продукции или услуга интересует? 🌿','Понятно! Чтобы дать лучший ответ — не могли бы уточнить: что именно вас интересует о нашем сервисе?'],
    en: ['Thanks for your question! Let me help right away 😊 Could you clarify — are you asking about delivery, prices, products, or placing an order?','Great question! I need a moment to give you the best answer. Could you specify — which product category or service are you interested in? 🌿','Got it! To give you the best answer — could you clarify what specifically you\'d like to know about our service?'],
  },
};

function detectLang(text) {
  // Detect by character set
  if (/[їієё]/.test(text)) return 'ua';
  if (/[ёъыь]/.test(text) || /привет|спасибо|здравствуйте|заказ|цена|доставка|качество/.test(text.toLowerCase())) return 'ru';
  if (/[а-яА-ЯёЁ]/.test(text)) return 'ua'; // default cyrillic to ua
  return 'en';
}

function getAIResponseCategory(text, history) {
  const t = text.toLowerCase().trim();
  // Greetings
  if (/^(привіт|привет|hello|hi|добри|добрый|доброго|вітаю|здравствуй|hey|sup|хай|хей|good morning|good day|доброі|ранку|вечора)/i.test(t)) return 'greet';
  // Thanks
  if (/(дякую|спасибо|thanks|thank you|дяку|вдячн|grateful|appreciate|дякую)/i.test(t)) return 'thanks';
  // Returns / complaints
  if (/(поверн|рекламаці|скарг|зіпсован|плохой|плохое|не свеж|не свіж|complaint|return|refund|замен|обмін|испорч|бракован|поломан|некачеств)/i.test(t)) return 'returns';
  // Wholesale / B2B
  if (/(опт|оптов|wholesale|партнер|партнёр|сотрудниц|співпрац|корпоратив|ресторан|hotel|готел|кафе|магазин|багато|крупн|велик|bulk|b2b|бізнес)/i.test(t)) return 'wholesale';
  // Minimum order
  if (/(мінімал|минимал|minimum|мін.замов|мин.заказ|від якої суми|от какой суммы|from how much)/i.test(t)) return 'minimum';
  // Seasonal
  if (/(сезон|season|що зараз|что сейчас|яке зараз|зараз є|сейчас есть|available now|що свіже|что свежее)/i.test(t)) return 'seasonal';
  // Delivery
  if (/(доставк|delivery|привез|привіз|кур|shipping|ship|відправ|самовивіз|самовывоз|pickup|коли привезут|коли буде|когда приедет)/i.test(t)) return 'delivery';
  // Pricing
  if (/(ціна|цен|price|кошт|почем|скільки|сколько|прайс|вартість|discount|знижк|скидк|дорого|дешево|cheapest|cost|по чём)/i.test(t)) return 'price';
  // Products
  if (/(асортимент|ассортимент|product|товар|овоч|фрукт|квіт|цветы|томат|огурок|огірок|ягод|зелен|базилік|базилик|шпинат|авокадо|яблук|яблок|виноград|полуниц|малин|черниц|перець|перец|броколі|наявн|в наявності|наличи|в наличии|покажи|что есть|що є|чим торгує|catalog|каталог)/i.test(t)) return 'product';
  // Order
  if (/(замовит|заказ|order|купити|купить|оформ|cart|кошик|хочу замов|хочу заказ)/i.test(t)) return 'order';
  // Payment
  if (/(оплат|payment|оплачу|pay|карт|безготівк|безналич|рахунок|invoice|фактур|пдв|vat|mono|приват|visa|mastercard)/i.test(t)) return 'payment';
  // Quality / certified
  if (/(якість|качество|quality|гмо|gmo|орган|сертифік|свіже|свежее|без хімі|без хими|натурал|eco|еко|чистий)/i.test(t)) return 'quality';
  // Contact manager
  if (/(менеджер|manager|живой|живий|людина|человек|person|зв'яж|зв.яж|связат|позвонит|телефон|номер|call me|phone)/i.test(t)) return 'contact_manager';
  // Context: if keyword not found, inherit topic from last few user messages
  if (history && history.length > 1) {
    const prevMsgs = history.filter(m => m.from === 'client' || m.from === 'user').slice(-3).reverse();
    for (const pm of prevMsgs) {
      const p = pm.text.toLowerCase();
      if (/(доставк|delivery|shipping)/.test(p)) return 'delivery';
      if (/(ціна|цен|price|прайс)/.test(p)) return 'price';
      if (/(якість|качество|quality)/.test(p)) return 'quality';
      if (/(оплат|payment|pay)/.test(p)) return 'payment';
      if (/(товар|product|асортимент|фрукт|овоч|наявн)/.test(p)) return 'product';
      if (/(замовит|заказ|order)/.test(p)) return 'order';
      if (/(опт|wholesale|партнер)/.test(p)) return 'wholesale';
      if (/(сезон|season)/.test(p)) return 'seasonal';
    }
  }
  return 'fallback';
}

function getAIResponse(text, lang, history) {
  const category = getAIResponseCategory(text, history);
  const detected = detectLang(text);
  const useLang  = (lang === 'en') ? detected : lang;
  const cats     = AI_RESPONSES[category] || AI_RESPONSES.fallback;
  const pool     = cats[useLang] || cats.ua || cats.en || [];
  // Avoid repeating recent AI responses
  const recentAI = (history || []).filter(m => m.from === 'ai').slice(-4).map(m => m.text);
  const available = pool.filter(r => !recentAI.includes(r));
  const chosen = available.length > 0 ? available : pool;
  return chosen[Math.floor(Math.random() * chosen.length)] || 'Зрозуміла! Зачекайте хвилинку...';
}

/* ── Additional AI categories & expanded responses ── */
Object.assign(AI_RESPONSES, {
  wholesale: {
    ua: [
      'Оптові умови у Bionerika — найкращий варіант для бізнесу! 📦 Від 20 кг — знижка 10%. Від 50 кг — 15%. Від 100 кг — 20–30%. Є персональний менеджер. Яка приблизна потреба?',
      'Для ресторанів, готелів, магазинів — спеціальні умови поставок 🤝 Щоденно або за графіком, всі закриваючі документи. Хочете обговорити умови?',
      'Вигідні оптові умови доступні від 20 кг 🌿 Реєстрація займає до 24 годин: форма → менеджер → договір → поставки. Розкажіть про ваш бізнес!',
    ],
    ru: [
      'Оптовые условия у Bionerika — выгодный вариант для бизнеса! 📦 От 20 кг — скидка 10%. От 50 кг — 15%. От 100 кг — 20–30%. Есть персональный менеджер. Какова ваша потребность?',
      'Для ресторанов, отелей, магазинов — специальные условия поставок 🤝 Ежедневно или по графику, все закрывающие документы. Хотите обсудить условия?',
      'Выгодные оптовые условия доступны от 20 кг 🌿 Регистрация до 24 часов: форма → менеджер → договор → поставки. Расскажите о вашем бизнесе!',
    ],
    en: [
      'Bionerika wholesale is a great business choice! 📦 From 20kg — 10% off. From 50kg — 15%. From 100kg — 20–30%. Personal manager assigned. What is your approximate need?',
      'For restaurants, hotels, stores — special supply terms 🤝 Daily or scheduled deliveries, full accounting docs. Want to discuss partnership terms?',
      'Wholesale available from 20 kg 🌿 Registration takes 24 hours: form → manager → agreement → deliveries start. Tell me about your business!',
    ],
  },
  seasonal: {
    ua: [
      'Зараз у сезоні 🌿 Томати, огірки, перець, базилік, свіжа зелень. Позасезонно в теплицях — огірок і томат цілий рік. Що шукаєте?',
      'Сезонні товари — найсмачніші та найдешевші! 🍅 Весна: полуниця, черешня. Літо: ягоди, томати, огірки. Осінь: виноград, гарбуз. Зима: цитрусові, квіти з теплиць. Яка пора цікавить?',
      'Оновлюємо асортимент щотижня 🌱 Якщо шукаєте щось конкретне — напишіть назву, перевіримо наявність прямо зараз!',
    ],
    ru: [
      'Сейчас в сезоне 🌿 Томаты, огурцы, перец, базилик, свежая зелень. Вне сезона в теплицах — огурец и томат круглый год. Что ищете?',
      'Сезонные товары — самые вкусные и самые дешёвые! 🍅 Весна: клубника, черешня. Лето: ягоды, томаты, огурцы. Осень: виноград, тыква. Зима: цитрусовые, цветы из теплиц. Какой сезон интересует?',
      'Обновляем ассортимент еженедельно 🌱 Если ищете что-то конкретное — напишите название, проверим наличие прямо сейчас!',
    ],
    en: [
      'In season right now 🌿 Tomatoes, cucumbers, peppers, basil, fresh greens. Year-round from greenhouses: cucumber and tomato. What are you looking for?',
      'Seasonal items are tastiest and most affordable! 🍅 Spring: strawberries, cherries. Summer: berries, tomatoes, cucumbers. Autumn: grapes, pumpkin. Winter: citrus, greenhouse flowers. Which season interests you?',
      'We update the range weekly 🌱 If you need something specific — tell me the name and I will check availability right now!',
    ],
  },
  returns: {
    ua: [
      'Повернення або обмін — без зайвих питань! 💯 Якщо продукт не задовольнив: зробіть фото і напишіть в цей чат або на info@bionerika.com. Вирішимо впродовж 1 дня — заміна або повне відшкодування.',
      'Будь-яка проблема з товаром — вирішуємо швидко 🌱 Зіпсований товар завжди компенсуємо. Для оптових клієнтів є менеджер по рекламаціях. Опишіть ситуацію!',
    ],
    ru: [
      'Возврат или обмен — без лишних вопросов! 💯 Если продукт не устроил: сделайте фото и напишите в чат или на info@bionerika.com. Решим в течение 1 дня — замена или полный возврат.',
      'Любая проблема с товаром — решаем быстро 🌱 Испорченный товар всегда компенсируем. Для оптовых клиентов есть менеджер по рекламациям. Опишите ситуацию!',
    ],
    en: [
      'Returns or exchanges — no fuss! 💯 If a product was not satisfactory: take a photo and write in chat or email info@bionerika.com. Resolved within 1 day — replacement or full refund.',
      'Any product issue — we solve it quickly 🌱 Spoiled goods are always compensated. Wholesale clients have a dedicated claims manager. Describe the situation!',
    ],
  },
  minimum: {
    ua: [
      'Мінімальне замовлення — 500 грн для роздробу 🛒 Доставка безкоштовна від 2000 грн по Києву. Для опту від 20 кг — окремі умови. Що плануєте замовити?',
    ],
    ru: [
      'Минимальный заказ — 500 грн для розницы 🛒 Доставка бесплатная от 2000 грн по Киеву. Для опта от 20 кг — отдельные условия. Что планируете заказать?',
    ],
    en: [
      'Minimum order — 500 UAH for retail 🛒 Free delivery in Kyiv from 2000 UAH. For wholesale from 20 kg — special terms. What are you planning to order?',
    ],
  },
  contact_manager: {
    ua: [
      'Зателефонуйте або напишіть менеджеру 👤 Телефон: +380 44 123-45-67 (Пн-Пт 8-19, Сб 9-17). Email: info@bionerika.com. Telegram: @bionerika_support. Або залиште повідомлення тут!',
    ],
    ru: [
      'Позвоните или напишите менеджеру 👤 Телефон: +380 44 123-45-67 (Пн-Пт 8-19, Сб 9-17). Email: info@bionerika.com. Telegram: @bionerika_support. Или оставьте сообщение здесь!',
    ],
    en: [
      'Call or message a manager 👤 Phone: +380 44 123-45-67 (Mon-Fri 8-19, Sat 9-17). Email: info@bionerika.com. Telegram: @bionerika_support. Or leave a message here!',
    ],
  },
});

/* Expand existing categories with more variety */
['ua','ru','en'].forEach(l => {
  AI_RESPONSES.greet[l] && AI_RESPONSES.greet[l].push(...({
    ua: ['Доброго дня! Я Оля, асистент Bionerika 🌿 Можу розповісти про асортимент, ціни або допомогти з замовленням. Чим можу бути корисною?', 'Привіт! Bionerika — свіжа продукція від виробника 🌱 Запитуйте будь-що — я на зв\u2019язку!'],
    ru: ['Добрый день! Я Оля, ассистент Bionerika 🌿 Расскажу об ассортименте, ценах или помогу с заказом. Чем могу помочь?', 'Привет! Bionerika — свежая продукция от производителя 🌱 Спрашивайте что угодно, я на связи!'],
    en: ['Good day! I am Olya, Bionerika assistant 🌿 I can tell you about products, prices or help with an order. What can I do for you?', 'Hi! Bionerika — fresh produce direct from growers 🌱 Ask me anything, I am here for you!'],
  }[l] || []));
  AI_RESPONSES.product[l] && AI_RESPONSES.product[l].push(...({
    ua: ['Широкий вибір завжди в наявності! 🥦 Овочі, фрукти, зелень, квіти, екзотика — усе від перевірених фермерів. Що саме шукаєте?', 'Є свіже щодня 🌿 Асортимент оновлюється залежно від сезону. Назвіть конкретну позицію або категорію — підберемо найкраще!'],
    ru: ['Широкий выбор всегда в наличии! 🥦 Овощи, фрукты, зелень, цветы, экзотика — всё от проверенных фермеров. Что именно ищете?', 'Есть свежее ежедневно 🌿 Ассортимент обновляется по сезону. Назовите позицию или категорию — подберём лучшее!'],
    en: ['Wide selection always available! 🥦 Vegetables, fruits, greens, flowers, exotic — all from verified farms. What exactly are you looking for?', 'Fresh arrivals daily 🌿 Range updated by season. Tell me a product or category and we will find the best option!'],
  }[l] || []));
  AI_RESPONSES.delivery[l] && AI_RESPONSES.delivery[l].push(...({
    ua: ['Доставка щодня, включаючи вихідні 🚚 Київ — до 10:00 ранку, від 50 грн. Безкоштовно від 2000 грн. Уточніть район?', 'Власний автопарк і кур\u2019єрська служба 🛵 Київ — наступний день або день у день (до 15:00). Регіони — 1-3 дні. Самовивіз теж є!'],
    ru: ['Доставка ежедневно, включая выходные 🚚 Киев — до 10:00 утром, от 50 грн. Бесплатно от 2000 грн. Уточните район?', 'Собственный автопарк и курьерская служба 🛵 Киев — следующий день или день в день (до 15:00). Регионы — 1-3 дня. Самовывоз тоже есть!'],
    en: ['Delivery every day including weekends 🚚 Kyiv — by 10 AM, from 50 UAH. Free from 2000 UAH. What is your area?', 'Own fleet and courier service 🛵 Kyiv — next day or same-day (before 3 PM). Regions — 1-3 days. Self-pickup available too!'],
  }[l] || []));
  AI_RESPONSES.price[l] && AI_RESPONSES.price[l].push(...({
    ua: ['Ціни від виробника без посередників 💚 Овочі від 28 грн/кг, фрукти від 75 грн/кг, зелень від 28 грн/кг. Що цікавить?', 'Для опту (від 20 кг) знижки 10-30% 📦 Назвіть позицію і обсяг — зроблю розрахунок!', 'Прайс-лист оновлюємо щотижня 🌱 Черрі-томат 48 грн/кг, огірок 28, полуниця 90. Актуальне завжди на сайті.'],
    ru: ['Цены от производителя без посредников 💚 Овощи от 28 грн/кг, фрукты от 75 грн/кг, зелень от 28 грн/кг. Что интересует?', 'Для опта (от 20 кг) скидки 10-30% 📦 Назовите позицию и объём — сделаю расчёт!', 'Прайс-лист обновляем еженедельно 🌱 Черри-томат 48 грн/кг, огурец 28, клубника 90. Актуальное всегда на сайте.'],
    en: ['Prices direct from grower 💚 Vegetables from 28 UAH/kg, fruits from 75, greens from 28. What interests you?', 'Wholesale (20kg+) discounts 10-30% 📦 Tell me a product and volume and I will calculate for you!', 'Price list updated weekly 🌱 Cherry tomatoes 48 UAH/kg, cucumber 28, strawberries 90. Always current on the website.'],
  }[l] || []));
  AI_RESPONSES.order[l] && AI_RESPONSES.order[l].push(...({
    ua: ['Можу допомогти оформити прямо тут! 📋 Напишіть: що хочете, кількість, місто — передам менеджеру. Відповідь протягом 30 хвилин.', 'Каталог → кошик → оформити 🛒 Або напишіть мені список — підготую і передам замовлення!'],
    ru: ['Могу помочь оформить прямо здесь! 📋 Напишите: что хотите, количество, город — передам менеджеру. Ответ в течение 30 минут.', 'Каталог → корзина → оформить 🛒 Или напишите мне список — подготовлю и передам заказ!'],
    en: ['I can help you order right here! 📋 Tell me: what you want, quantity, city — I will pass it to the manager. Reply within 30 minutes.', 'Catalog → cart → checkout 🛒 Or write me a list and I will prepare and submit the order for you!'],
  }[l] || []));
  AI_RESPONSES.quality[l] && AI_RESPONSES.quality[l].push(...({
    ua: ['Якість — наш головний пріоритет 🌱 Без ГМО, мінімум хімії. Власна лабораторія перевіряє кожну партію. Якщо щось не так — замінимо або повернемо!', 'Контроль якості від поля до доставки 🌿 Сертифікати GlobalG.A.P. і ISO 22000. Всі аналізи в нормі. Потрібні документи на партію — надамо!'],
    ru: ['Качество — наш главный приоритет 🌱 Без ГМО, минимум химии. Собственная лаборатория проверяет каждую партию. Если что не так — заменим или вернём!', 'Контроль качества от поля до доставки 🌿 Сертификаты GlobalG.A.P. и ISO 22000. Все анализы в норме. Нужны документы на партию — предоставим!'],
    en: ['Quality is our top priority 🌱 No GMO, minimal chemicals. Own lab checks every batch. If anything is wrong we will replace or refund!', 'Quality control from field to delivery 🌿 GlobalG.A.P. and ISO 22000 certified. All tests pass. Need batch documentation — we will provide it!'],
  }[l] || []));
  AI_RESPONSES.payment[l] && AI_RESPONSES.payment[l].push(...({
    ua: ['Visa, Mastercard, Apple Pay, Google Pay, готівка, банківський переказ 💳 Нові клієнти — 50% передоплата. Постійні — оплата після доставки або відтермінування 7-14 днів.', 'Будь-який зручний спосіб оплати 💚 Для бізнесу — всі закриваючі документи (рахунок, накладна, акт). Прихованих комісій немає.'],
    ru: ['Visa, Mastercard, Apple Pay, Google Pay, наличные, банковский перевод 💳 Новые клиенты — 50% предоплата. Постоянные — оплата после доставки или отсрочка 7-14 дней.', 'Любой удобный способ оплаты 💚 Для бизнеса — все закрывающие документы (счёт, накладная, акт). Скрытых комиссий нет.'],
    en: ['Visa, Mastercard, Apple Pay, Google Pay, cash, bank transfer 💳 New clients — 50% deposit. Regulars — pay after delivery or 7-14 day deferral.', 'Any convenient payment method 💚 For businesses — full accounting docs (invoice, delivery note, completion act). No hidden fees.'],
  }[l] || []));
  AI_RESPONSES.fallback[l] && AI_RESPONSES.fallback[l].push(...({
    ua: ['Раді допомогти! 😊 Розкажу докладніше про: 📦 асортимент, 🚚 доставку, 💰 ціни, 📋 замовлення або 🌱 якість. Що цікавить найбільше?', 'Для точної відповіді уточніть — яка продукція або послуга вас цікавить? Або просто запитайте конкретно! 🌿', 'Bionerika — свіжі овочі, фрукти, зелень та квіти прямо від виробника 🌸 Про що розповісти детальніше?'],
    ru: ['Рады помочь! 😊 Расскажу подробнее о: 📦 ассортименте, 🚚 доставке, 💰 ценах, 📋 заказах или 🌱 качестве. Что интересует больше всего?', 'Для точного ответа уточните — какая продукция или услуга вас интересует? Или просто спросите конкретно! 🌿', 'Bionerika — свежие овощи, фрукты, зелень и цветы прямо от производителя 🌸 О чём рассказать подробнее?'],
    en: ['Happy to help! 😊 I can tell you more about: 📦 products, 🚚 delivery, 💰 prices, 📋 orders or 🌱 quality. What interests you most?', 'For the best answer, could you clarify which product or service you are asking about? Or just ask directly! 🌿', 'Bionerika — fresh vegetables, fruits, greens and flowers direct from growers 🌸 What would you like to know more about?'],
  }[l] || []));
});

/* localStorage helpers for shared chat storage (used by ManagerPage too) */
const LS_SESSIONS = 'bionerika_sessions';
const LS_MSGS     = sid => `bionerika_msgs_${sid}`;

function lsGetSessions()       { try { return JSON.parse(localStorage.getItem(LS_SESSIONS)) || []; } catch { return []; } }
function lsSaveSessions(arr)   { try { localStorage.setItem(LS_SESSIONS, JSON.stringify(arr)); } catch {} }
function lsGetMsgs(sid)        { try { return JSON.parse(localStorage.getItem(LS_MSGS(sid))) || []; } catch { return []; } }
function lsSaveMsgs(sid, msgs) { try { localStorage.setItem(LS_MSGS(sid), JSON.stringify(msgs)); } catch {} }

function lsUpsertSession(sid, clientName, lastMsg) {
  const sessions = lsGetSessions();
  const idx = sessions.findIndex(s => s.id === sid);
  const entry = { id:sid, name:clientName, lastMsg, time:Date.now(), unread: idx >= 0 ? sessions[idx].unread : 0 };
  if (idx >= 0) sessions[idx] = entry;
  else sessions.unshift(entry);
  lsSaveSessions(sessions.slice(0, 50)); // keep last 50
}

function lsAddMessage(sid, from, text) {
  const msgs = lsGetMsgs(sid);
  const msg  = { id: Date.now() + Math.random(), from, text, time: new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) };
  msgs.push(msg);
  lsSaveMsgs(sid, msgs.slice(-100)); // keep last 100
  return msg;
}

/* ── localStorage helpers ── */
const STORAGE_KEY = 'gr_user_v1';
function loadProfile()  { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null; } catch { return null; } }
function saveProfile(d) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch {} }
function clearProfile() { try { localStorage.removeItem(STORAGE_KEY); } catch {} }

/* ── Product category map ── */
const CATS_KEY = ['vegetables','vegetables','flowers','fruits','vegetables','greens','exotic','flowers','vegetables','fruits','flowers','greens','fruits','fruits','fruits','flowers','flowers','greens','greens','greens','exotic','exotic','exotic','exotic','exotic'];
const PROD_CAT_MAP = (() => {
  const m = {};
  [['cherry tomato','томат черрі'],['dutch cucumber','огірок голландський'],['red rose holland','троянда червона'],['sochi strawberry','полуниця сочинська'],['sweet pepper','перець солодкий'],['fresh basil','базилік свіжий'],['lemon tree','лимонне дерево'],['white orchid','орхідея біла'],['fresh broccoli','броколі свіжа'],['isabella grape','виноград ізабелла'],['sunflower bouquet','букет соняшників'],['arugula mix','мікс руколи'],['garden raspberry','малина садова'],['large blueberry','чорниця велика'],['nectarine peach','нектарин персик'],['tulip mix','тюльпан мікс'],['bush chrysanthemum','хризантема кущова'],['baby spinach','шпинат бейбі'],['fresh cilantro','кінза свіжа'],['peppermint',"м'ята перцева"],['passionfruit','маракуя'],['golden physalis','фізаліс золотий'],['carambola','карамбола'],['dragon fruit','пітахая'],['hass avocado','авокадо хасс']].forEach(([en,ua],i)=>{ m[en]=CATS_KEY[i]; m[ua]=CATS_KEY[i]; });
  return m;
})();
const CAT_EMOJI = { vegetables:'🥦', fruits:'🍓', flowers:'🌸', greens:'🌿', exotic:'🥭', other:'📦' };
const CAT_COL   = { vegetables:'#4ade80', fruits:'#fb923c', flowers:'#f472b6', greens:'#86efac', exotic:'#a78bfa', other:'#94a3b8' };
const PRICE_LOOKUP = {'cherry tomato':48,'томат черрі':48,'dutch cucumber':28,'огірок голландський':28,'red rose holland':65,'троянда червона':65,'sochi strawberry':90,'полуниця сочинська':90,'sweet pepper':42,'перець солодкий':42,'fresh basil':35,'базилік свіжий':35,'lemon tree':320,'лимонне дерево':320,'white orchid':280,'орхідея біла':280,'fresh broccoli':55,'броколі свіжа':55,'isabella grape':75,'виноград ізабелла':75,'sunflower bouquet':120,'букет соняшників':120,'arugula mix':38,'мікс руколи':38,'garden raspberry':110,'малина садова':110,'large blueberry':130,'чорниця велика':130,'nectarine peach':95,'нектарин персик':95,'tulip mix':85,'тюльпан мікс':85,'bush chrysanthemum':95,'хризантема кущова':95,'baby spinach':42,'шпинат бейбі':42,'fresh cilantro':28,'кінза свіжа':28,'peppermint':30,"м'ята перцева":30,'passionfruit':160,'маракуя':160,'golden physalis':145,'фізаліс золотий':145,'carambola':140,'карамбола':140,'dragon fruit':190,'пітахая':190,'hass avocado':95,'авокадо хасс':95};

/* ── Translations ── */
const LBL = {
  ua: { back:'← Назад', title:'Особистий кабінет', overview:'Огляд', orders:'Замовлення', analytics:'Аналітика', addresses:'Адреси', chat:'Чат з менеджером', contact:'Контакти', settings:'Налаштування', logout:'Вийти', totalOrders:'Замовлень', totalSpent:'Витрачено', bonusPoints:'Бонусні бали', avgOrder:'Середній чек', memberSince:'Учасник з', allStatuses:'Всі статуси', filterAll:'Всі', noOrders:'Замовлень ще немає', chatPlaceholder:'Напишіть повідомлення...', send:'Відправити', chatOnline:'Менеджер онлайн', chatOffline:'Відп. протягом 1–2 год', chatGreet:'Привіт! Чим можемо допомогти? 🌿', addAddr:'+ Додати адресу', save:'Зберегти', cancel:'Скасувати', edit:'Редагувати', saved:'Збережено!', name:"Ім'я", phone:'Телефон', email:'Email', contactTitle:'Зв\'яжіться з нами', spendByCat:'Витрати по категоріях', spendByDay:'Активність (30 днів)', topProducts:'Топ товарів', noData:'Замовте першим — тут з\'явиться аналітика', loginTitle:'Увійдіть для доступу до кабінету', loginBtn:'Увійти через Google' },
  ru: { back:'← Назад', title:'Личный кабинет', overview:'Обзор', orders:'Заказы', analytics:'Аналитика', addresses:'Адреса', chat:'Чат с менеджером', contact:'Контакты', settings:'Настройки', logout:'Выйти', totalOrders:'Заказов', totalSpent:'Потрачено', bonusPoints:'Бонусные баллы', avgOrder:'Средний чек', memberSince:'Участник с', allStatuses:'Все статусы', filterAll:'Все', noOrders:'Заказов пока нет', chatPlaceholder:'Напишите сообщение...', send:'Отправить', chatOnline:'Менеджер онлайн', chatOffline:'Ответим в течение 1–2 ч', chatGreet:'Привет! Чем можем помочь? 🌿', addAddr:'+ Добавить адрес', save:'Сохранить', cancel:'Отмена', edit:'Редактировать', saved:'Сохранено!', name:'Имя', phone:'Телефон', email:'Email', contactTitle:'Свяжитесь с нами', spendByCat:'Расходы по категориям', spendByDay:'Активность (30 дней)', topProducts:'Топ товаров', noData:'Сделайте заказ — здесь появится аналитика', loginTitle:'Войдите для доступа к кабинету', loginBtn:'Войти через Google' },
  en: { back:'← Back', title:'My Account', overview:'Overview', orders:'Orders', analytics:'Analytics', addresses:'Addresses', chat:'Chat with Manager', contact:'Contacts', settings:'Settings', logout:'Sign Out', totalOrders:'Orders', totalSpent:'Spent', bonusPoints:'Bonus Points', avgOrder:'Avg Order', memberSince:'Member since', allStatuses:'All statuses', filterAll:'All', noOrders:'No orders yet', chatPlaceholder:'Type a message...', send:'Send', chatOnline:'Manager online', chatOffline:'Reply within 1–2 h', chatGreet:'Hello! How can we help? 🌿', addAddr:'+ Add address', save:'Save', cancel:'Cancel', edit:'Edit', saved:'Saved!', name:'Name', phone:'Phone', email:'Email', contactTitle:'Contact Us', spendByCat:'Spending by category', spendByDay:'Activity (30 days)', topProducts:'Top products', noData:'Place an order — analytics will appear here', loginTitle:'Sign in to access your account', loginBtn:'Sign in with Google' },
};

/* ── Utility: calc order total in current currency ── */
function calcTotal(o, rate) {
  if (o.items_text) {
    return o.items_text.split(',').reduce((s, part) => {
      const m = part.trim().match(/^(.+?)\s×(\d+)$/);
      if (!m) return s;
      return s + Math.round((PRICE_LOOKUP[m[1].trim().toLowerCase()] || 0) * rate) * parseInt(m[2]);
    }, 0);
  }
  return o.total || 0;
}

/* ── SVG icons for Account tabs ── */
function AccIco({ k, size = 15 }) {
  const a = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const w = { width: size, height: size, display: 'inline-block', flexShrink: 0, verticalAlign: 'middle' };
  const s = ch => <svg viewBox="0 0 24 24" {...a} style={w}>{ch}</svg>;
  switch (k) {
    case 'overview':  return s(<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>);
    case 'orders':   return s(<><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></>);
    case 'analytics':return s(<><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></>);
    case 'addresses':return s(<><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></>);
    case 'chat':     return s(<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>);
    case 'contact':  return s(<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 2 1.72c.14.7.29 1.38.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.81a16 16 0 0 0 6 6l.9-.9a2 2 0 0 1 2.11-.45c1.43.41 2.11.56 2.81.7A2 2 0 0 1 22 16.92z"/>);
    case 'settings': return s(<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>);
    default: return null;
  }
}

/* ───────────────────────────────────────────────
   SUB-COMPONENT: Analytics charts panel
─────────────────────────────────────────────── */
/* Local YYYY-MM-DD key — avoids UTC midnight timezone shift for users in UTC+2/+3 */
function fmtLocalDate(d) {
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

function AnalyticsPanel({ orders, cur, lang }) {
  const lbl  = LBL[lang] || LBL.en;
  const rate = cur.rate;
  const sym  = cur.symbol;

  const [hovBar,  setHovBar]  = useState(null);
  const [hovCat,  setHovCat]  = useState(null);
  const [hovProd, setHovProd] = useState(null);

  /* Spending by category */
  const catSpend = useMemo(() => {
    const acc = {};
    orders.forEach(o => {
      if (!o.items_text) return;
      o.items_text.split(',').forEach(part => {
        const m = part.trim().match(/^(.+?)\s×(\d+)$/);
        if (!m) return;
        const name = m[1].trim(), qty = parseInt(m[2]);
        const pr   = PRICE_LOOKUP[name.toLowerCase()] || 0;
        const cat  = PROD_CAT_MAP[name.toLowerCase()] || 'other';
        acc[cat]   = (acc[cat] || 0) + Math.round(pr * rate) * qty;
      });
    });
    return Object.entries(acc).sort((a,b)=>b[1]-a[1]);
  }, [orders, rate]);

  /* Top products */
  const topProds = useMemo(() => {
    const acc = {};
    orders.forEach(o => {
      if (!o.items_text) return;
      o.items_text.split(',').forEach(part => {
        const m = part.trim().match(/^(.+?)\s×(\d+)$/);
        if (!m) return;
        const name = m[1].trim(), qty = parseInt(m[2]);
        const pr   = PRICE_LOOKUP[name.toLowerCase()] || 0;
        if (!acc[name]) acc[name] = { total:0, qty:0, cat:PROD_CAT_MAP[name.toLowerCase()]||'other' };
        acc[name].total += Math.round(pr * rate) * qty;
        acc[name].qty   += qty;
      });
    });
    return Object.entries(acc).map(([n,d])=>({name:n,...d})).sort((a,b)=>b.total-a.total).slice(0,8);
  }, [orders, rate]);

  /* Last 30 days — with per-day qty (units purchased) for candlestick */
  const last30 = useMemo(() => {
    const result = [];
    const today = new Date(); today.setHours(0,0,0,0);
    const byDay = {};
    orders.forEach(o => {
      if (!o.created_at) return;
      const k = fmtLocalDate(new Date(o.created_at));
      if (!byDay[k]) byDay[k] = { total:0, count:0, qty:0 };
      byDay[k].total += calcTotal(o, rate);
      byDay[k].count++;
      if (o.items_text) {
        o.items_text.split(',').forEach(part => {
          const m = part.trim().match(/^(.+?)\s×(\d+)$/);
          if (m) byDay[k].qty += parseInt(m[2]);
        });
      }
    });
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const k = fmtLocalDate(d);
      result.push({
        date:  k,
        label: d.toLocaleDateString(lang==='en'?'en-US':'ru-RU',{day:'numeric',month:'short'}),
        total: byDay[k]?.total || 0,
        count: byDay[k]?.count || 0,
        qty:   byDay[k]?.qty   || 0,
      });
    }
    return result;
  }, [orders, rate, lang]);

  const isEmpty        = orders.length === 0;
  const totalCatSpend  = catSpend.reduce((s,c)=>s+c[1],0) || 1;
  const maxProd        = topProds[0]?.total || 1;

  /* Build candlestick data — open = prev day qty, close = today qty */
  const candles = last30.map((d, i) => {
    const prevQty = i > 0 ? last30[i-1].qty : d.qty;
    const open    = prevQty;
    const close   = d.qty;
    const isUp    = close >= open;
    const wick    = Math.max(1, d.count);
    const high    = Math.max(open, close) + wick;
    const low     = Math.max(0, Math.min(open, close) - Math.floor(wick / 2));
    return { ...d, open, close, high, low, isUp };
  });
  const maxH = Math.max(...candles.map(c => c.high), 1);

  /* ── Use LAST ACTIVE day for header KPIs, not blindly 'today' ── */
  let activeIdx = 29;
  for (let i = 29; i >= 0; i--) {
    if (candles[i].qty > 0 || candles[i].count > 0) { activeIdx = i; break; }
  }
  const activeC       = candles[activeIdx];
  const prevC         = activeIdx > 0 ? candles[activeIdx - 1] : candles[0];
  const isReallyToday = activeC.date === fmtLocalDate(new Date());
  const diffQty       = activeC.qty - prevC.qty;
  const diffPct       = prevC.qty > 0 ? ((diffQty / prevC.qty) * 100).toFixed(1) : activeC.qty > 0 ? '100.0' : '0.0';
  const activeUp      = diffQty >= 0;

  /* Terminal design tokens */
  const T = '#0b0f0c';          /* panel bg */
  const G = '#00e676';          /* green up */
  const R = '#ff5252';          /* red down */
  const W = '#ddeedd';          /* primary text */
  const D = 'rgba(180,210,180,0.38)'; /* dim */
  const BD = 'rgba(0,230,118,0.16)';  /* border */
  const GRID_C = 'rgba(0,230,118,0.08)';

  const PANEL = {
    background: T,
    borderRadius: 18,
    border: `1px solid ${BD}`,
    fontFamily: 'monospace',
    overflow: 'hidden',
  };

  if (isEmpty) return (
    <div style={{ ...PANEL, textAlign:'center', padding:'60px 24px', color: D }}>
      <div style={{ fontSize:48, marginBottom:14 }}>📊</div>
      <div style={{ fontSize:14, letterSpacing:'.5px' }}>{lbl.noData}</div>
    </div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:18 }}>

      {/* ── TICKER HEADER ── */}
      <div style={{ ...PANEL, padding:'20px 24px' }}>
        {/* Terminal title bar */}
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:18 }}>
          <span style={{ width:10, height:10, borderRadius:'50%', background:'#ff5f57', display:'inline-block' }}/>
          <span style={{ width:10, height:10, borderRadius:'50%', background:'#ffbd2e', display:'inline-block' }}/>
          {/* Live pulse dot */}
          <span style={{ width:10, height:10, borderRadius:'50%', background:'#28c840', display:'inline-block',
            boxShadow:'0 0 0 0 rgba(40,200,64,0.7)',
            animation:'pulse-dot 1.8s ease-in-out infinite' }}/>
          <span style={{ fontSize:10, color:D, letterSpacing:'2px', textTransform:'uppercase', marginLeft:8 }}>
            ⬡ PRODUCT FLOW TERMINAL
            {isReallyToday
              ? <span style={{ color:G, marginLeft:8 }}>● LIVE · {activeC.label}</span>
              : <span style={{ color:'#ffbd2e', marginLeft:8 }}>◎ LAST ACTIVE · {activeC.label}</span>}
          </span>
        </div>

        {/* KPI row */}
        <div style={{ display:'flex', gap:0, flexWrap:'wrap' }}>
          {/* Volume */}
          <div style={{ flex:'1 1 160px', padding:'0 20px 0 0', borderRight:`1px solid ${BD}`, marginRight:20 }}>
            <div style={{ fontSize:9, color:D, letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:6 }}>
              {isReallyToday
                ? (lang==='ua'?'Обʼєм сьогодні':lang==='ru'?'Объём сегодня':'Volume Today')
                : (lang==='ua'?'Обʼєм за день':lang==='ru'?'Объём за день':'Volume / Day')}
            </div>
            <div style={{ display:'flex', alignItems:'baseline', gap:10 }}>
              <span style={{ fontSize:30, fontWeight:700, color:W, letterSpacing:'-1px' }}>×{activeC.qty}</span>
              {parseFloat(diffPct) !== 0 && (
                <span style={{ fontSize:13, color: activeUp ? G : R, fontWeight:700 }}>
                  {activeUp ? '▲' : '▼'} {Math.abs(diffQty)} ({activeUp?'+':''}{diffPct}%)
                </span>
              )}
            </div>
          </div>
          {/* Revenue */}
          <div style={{ flex:'1 1 140px', padding:'0 20px 0 0', borderRight:`1px solid ${BD}`, marginRight:20 }}>
            <div style={{ fontSize:9, color:D, letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:6 }}>
              {isReallyToday
                ? (lang==='ua'?'Виручка сьогодні':lang==='ru'?'Выручка сегодня':'Revenue Today')
                : (lang==='ua'?'Виручка за день':lang==='ru'?'Выручка за день':'Revenue / Day')}
            </div>
            <div style={{ fontSize:22, fontWeight:700, color:W }}>{sym}{activeC.total.toLocaleString()}</div>
          </div>
          {/* Orders */}
          <div style={{ flex:'1 1 120px', padding:'0 20px 0 0', borderRight:`1px solid ${BD}`, marginRight:20 }}>
            <div style={{ fontSize:9, color:D, letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:6 }}>
              {lang==='ua'?'Замовлень':lang==='ru'?'Заказов':'Orders'}
            </div>
            <div style={{ fontSize:22, fontWeight:700, color:W }}>{activeC.count}</div>
          </div>
          {/* Status badge */}
          <div style={{ flex:'1 1 120px', display:'flex', alignItems:'center', justifyContent:'flex-start' }}>
            <div style={{
              display:'inline-flex', alignItems:'center', gap:8,
              background: activeUp ? 'rgba(0,230,118,0.1)' : 'rgba(255,82,82,0.1)',
              border: `1px solid ${activeUp ? 'rgba(0,230,118,0.35)' : 'rgba(255,82,82,0.35)'}`,
              borderRadius:100, padding:'8px 18px',
            }}>
              <span style={{ fontSize:18 }}>{activeUp ? '📈' : '📉'}</span>
              <span style={{ fontSize:12, fontWeight:700, color: activeUp ? G : R, letterSpacing:'1px' }}>
                {activeUp
                  ? (lang==='ua'?'ПРОФІЦИТ':lang==='ru'?'ПРОФИЦИТ':'SURPLUS')
                  : (lang==='ua'?'ДЕФІЦИТ':lang==='ru'?'ДЕФИЦИТ':'DEFICIT')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── CANDLESTICK CHART ── */}
      <div style={{ ...PANEL, padding:'18px 20px 14px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
          <div style={{ fontSize:9, letterSpacing:'2px', color:D, textTransform:'uppercase' }}>
            {lang==='ua'?'Добовий обʼєм товару · 30 днів':lang==='ru'?'Суточный объём товара · 30 дней':'Daily Product Volume · 30 Days'}
          </div>
          <div style={{ display:'flex', gap:14, fontSize:9, color:D }}>
            <span style={{ color:G }}>▲ {lang==='ua'?'більше':lang==='ru'?'больше':'more'}</span>
            <span style={{ color:R }}>▼ {lang==='ua'?'менше':lang==='ru'?'меньше':'less'}</span>
          </div>
        </div>

        <svg viewBox="0 0 700 170" style={{ width:'100%', height:'auto', display:'block', overflow:'visible' }}
          onMouseLeave={() => setHovBar(null)}
          onMouseMove={e => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x    = (e.clientX - rect.left) / rect.width * 700;
            setHovBar(Math.min(29, Math.max(0, Math.floor(x / (700/30)))));
          }}>

          {/* Horizontal grid */}
          {[0, 25, 50, 75, 100].map(pct => {
            const y = 10 + (1 - pct/100) * 105;
            return (
              <g key={pct}>
                <line x1={0} y1={y} x2={700} y2={y} stroke={GRID_C} strokeWidth={1}/>
                {pct > 0 && <text x={696} y={y+3} textAnchor="end" fill={D} fontSize={6} fontFamily="monospace">{Math.round(maxH * pct / 100)}</text>}
              </g>
            );
          })}

          {/* Volume separator line */}
          <line x1={0} y1={123} x2={700} y2={123} stroke={BD} strokeWidth={0.8}/>
          <text x={696} y={121} textAnchor="end" fill={D} fontSize={6} fontFamily="monospace">vol</text>

          {candles.map((c, i) => {
            const colW    = 700 / 30;
            const bw      = colW * 0.52;
            const bx      = i * colW + colW * 0.24;
            const cx      = bx + bw / 2;
            const isH     = hovBar === i;
            const isToday = c.date === fmtLocalDate(new Date());
            const color   = c.total > 0 ? (c.isUp ? G : R) : BD;
            const colorFd = c.total > 0 ? (c.isUp ? 'rgba(0,230,118,0.35)' : 'rgba(255,82,82,0.32)') : 'rgba(0,230,118,0.1)';

            /* Scale to chart rows: candles 10→115, volume 125→158 */
            const sy  = v => 10 + (1 - Math.min(v, maxH) / maxH) * 105;
            const oy  = sy(c.open);
            const cy2 = sy(c.close);
            const hy  = sy(c.high);
            const ly  = sy(c.low);
            const bodyTop = Math.min(oy, cy2);
            const bodyH   = Math.max(Math.abs(oy - cy2), 1.5);

            /* Volume bar */
            const volH = c.qty > 0 ? Math.max(2, (c.qty / maxH) * 30) : 1.5;
            const volY = 158 - volH;

            return (
              <g key={i}>
                {/* Column hover bg */}
                {isH && <rect x={i*colW} y={6} width={colW} height={154} fill="rgba(0,230,118,0.05)" rx={2}/>}
                {isToday && !isH && <rect x={i*colW} y={6} width={colW} height={154} fill="rgba(0,230,118,0.03)" rx={2}/>}

                {/* Upper wick */}
                {c.total > 0 && <line x1={cx} y1={hy} x2={cx} y2={bodyTop} stroke={colorFd} strokeWidth={1.5}/>}
                {/* Lower wick */}
                {c.total > 0 && <line x1={cx} y1={bodyTop + bodyH} x2={cx} y2={ly} stroke={colorFd} strokeWidth={1.5}/>}

                {/* Candle body */}
                <rect x={bx} y={bodyTop} width={bw} height={bodyH}
                  fill={isH ? color : colorFd}
                  rx={1.5}
                  style={{ transition:'fill .12s' }}/>
                {/* Today indicator ring */}
                {isToday && <rect x={bx-1} y={bodyTop-1} width={bw+2} height={bodyH+2}
                  fill="none" stroke={color} strokeWidth="1" rx={2} opacity={0.7}/>}

                {/* Volume bar */}
                <rect x={bx} y={volY} width={bw} height={volH}
                  fill={c.total > 0 ? (c.isUp ? 'rgba(0,230,118,0.25)' : 'rgba(255,82,82,0.2)') : 'rgba(0,230,118,0.07)'}
                  rx={1}/>

                {/* Date labels */}
                {(i===0||i===14||i===29) &&
                  <text x={cx} y={168} textAnchor="middle" fill={D} fontSize={7} fontFamily="monospace">{c.label}</text>}

                {/* Hover tooltip */}
                {isH && c.total > 0 && (() => {
                  const tx = i > 22 ? bx - 96 : bx + bw + 5;
                  const ty = bodyTop > 60 ? bodyTop - 68 : bodyTop + bodyH + 5;
                  return (
                    <g>
                      <rect x={tx} y={ty} width={90} height={64} fill="#0d160e"
                        stroke={c.isUp ? 'rgba(0,230,118,0.45)' : 'rgba(255,82,82,0.4)'}
                        strokeWidth={1} rx={6}/>
                      <text x={tx+8} y={ty+14} fill={color} fontSize={8} fontWeight={700} fontFamily="monospace">{c.label}</text>
                      <text x={tx+8} y={ty+27} fill={W} fontSize={8} fontFamily="monospace">
                        ×{c.qty} {c.isUp ? '▲' : '▼'} {lang==='ua'?'одиниць':lang==='ru'?'единиц':'units'}
                      </text>
                      <text x={tx+8} y={ty+40} fill={W} fontSize={8} fontFamily="monospace">{sym}{c.total.toLocaleString()}</text>
                      <text x={tx+8} y={ty+53} fill={D} fontSize={7} fontFamily="monospace">
                        {c.count} {lang==='ua'?'зам.':lang==='ru'?'зак.':'ord.'} · {c.isUp
                          ? (lang==='ua'?'ПРОФІЦИТ':lang==='ru'?'ПРОФИЦИТ':'SURPLUS')
                          : (lang==='ua'?'ДЕФІЦИТ':lang==='ru'?'ДЕФИЦИТ':'DEFICIT')}
                      </text>
                    </g>
                  );
                })()}
              </g>
            );
          })}
        </svg>
      </div>

      {/* ── CATEGORY ALLOCATION ── */}
      <div style={{ ...PANEL, padding:'18px 22px' }}>
        <div style={{ fontSize:9, letterSpacing:'2px', color:D, textTransform:'uppercase', marginBottom:16 }}>{lbl.spendByCat}</div>
        {catSpend.map(([cat, total], i) => {
          const pct = Math.round(total / totalCatSpend * 100);
          const col = CAT_COL[cat] || CAT_COL.other;
          const isH = hovCat === i;
          return (
            <div key={cat} style={{ marginBottom:11 }}
              onMouseEnter={() => setHovCat(i)} onMouseLeave={() => setHovCat(null)}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5, alignItems:'center' }}>
                <span style={{ fontSize:12, color:isH?W:'#90b898', display:'flex', alignItems:'center', gap:7, transition:'color .18s' }}>
                  <span>{CAT_EMOJI[cat]||'📦'}</span>
                  <span style={{ textTransform:'capitalize', fontWeight:600 }}>{cat}</span>
                </span>
                <span style={{ fontSize:12, fontFamily:'monospace', color:isH?col:D, fontWeight:700, transition:'color .18s' }}>
                  {sym}{total.toLocaleString()} <span style={{ fontWeight:400, opacity:.55 }}>({pct}%)</span>
                </span>
              </div>
              <div style={{ height:4, borderRadius:2, background:'rgba(0,230,118,0.1)', overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${pct}%`, background:col, borderRadius:2, opacity:isH?1:0.55, transition:'width .5s, opacity .18s' }}/>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── TOP PRODUCTS TICKER ── */}
      {topProds.length > 0 && (
        <div style={{ ...PANEL, padding:'18px 22px' }}>
          <div style={{ fontSize:9, letterSpacing:'2px', color:D, textTransform:'uppercase', marginBottom:16 }}>{lbl.topProducts}</div>
          {topProds.map((p, i) => {
            const pct  = Math.round(p.total / maxProd * 100);
            const col  = CAT_COL[p.cat] || CAT_COL.other;
            const isH  = hovProd === i;
            const isUp2 = pct >= 50;
            return (
              <div key={p.name} style={{ marginBottom:10 }}
                onMouseEnter={() => setHovProd(i)} onMouseLeave={() => setHovProd(null)}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4, alignItems:'center' }}>
                  <span style={{ fontSize:12, color:isH?W:'#90b898', display:'flex', alignItems:'center', gap:8, transition:'color .18s' }}>
                    <span style={{ fontSize:9, background:isH?col:'rgba(0,230,118,0.18)', color:isH?'#fff':D, borderRadius:100, padding:'2px 7px', fontWeight:700 }}>{i+1}</span>
                    <span>{p.name}</span>
                    <span style={{ fontSize:10, color: isUp2 ? G : R }}>{isUp2 ? '▲' : '▼'}</span>
                  </span>
                  <span style={{ fontSize:11, fontFamily:'monospace', color:isH?W:D, fontWeight:700, transition:'color .18s' }}>
                    {sym}{p.total.toLocaleString()} · <span style={{ color: isUp2 ? G : R }}>×{p.qty}</span>
                  </span>
                </div>
                <div style={{ height:3, borderRadius:2, background:'rgba(0,230,118,0.1)', overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${pct}%`, background:isH?col:'rgba(0,230,118,0.3)', borderRadius:2, transition:'width .5s' }}/>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────────────────────────────
   SUB-COMPONENT: Manager Chat (with AI fallback)
─────────────────────────────────────────────── */
function ManagerChat({ lang, profile }) {
  const lbl = LBL[lang] || LBL.en;

  // Initial greeting from AI or manager
  const initMsg = { id:1, from: AI_IS_AVAILABLE ? 'ai' : 'manager', text: lbl.chatGreet, time: new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) };

  const [messages,  setMessages]  = useState(() => {
    const sid = sessionStorage.getItem('bionerika_sid');
    if (sid) {
      const saved = lsGetMsgs(sid);
      if (saved.length > 0) return saved;
    }
    return [initMsg];
  });
  const [input,     setInput]     = useState('');
  const [sending,   setSending]   = useState(false);
  const [aiTyping,  setAiTyping]  = useState(false);
  const [offset,    setOffset]    = useState(0);
  const msgsContainerRef = useRef(null);

  // Persist session ID across tab reloads
  const sessionId = useRef((() => {
    let sid = sessionStorage.getItem('bionerika_sid');
    if (!sid) { sid = Date.now().toString(36).slice(-6).toUpperCase(); sessionStorage.setItem('bionerika_sid', sid); }
    return sid;
  })());
  const hasNotified = useRef(false);

  // Scroll to bottom on new messages — only inside the chat box, not the page
  useEffect(() => {
    if (msgsContainerRef.current) {
      msgsContainerRef.current.scrollTop = msgsContainerRef.current.scrollHeight;
    }
  }, [messages, aiTyping]);

  // Save messages to localStorage so ManagerPage can see them
  useEffect(() => {
    if (messages.length > 1) {
      lsSaveMsgs(sessionId.current, messages);
      const lastMsg = messages[messages.length - 1];
      lsUpsertSession(sessionId.current, profile?.name || 'Guest', lastMsg.text);
    }
  }, [messages, profile?.name]);

  // Poll Telegram for manager replies (only when TG is configured)
  useEffect(() => {
    if (AI_IS_AVAILABLE) return; // AI mode — no need to poll Telegram
    const iv = setInterval(async () => {
      const updates = await tgGetUpdates(offset);
      if (!updates.length) return;
      const newOffset = updates[updates.length - 1].update_id + 1;
      setOffset(newOffset);
      const myTag = `[${sessionId.current}]`;
      updates.forEach(u => {
        const text = u.message?.text;
        if (!text || text.includes(myTag) || text.startsWith('💬')) return;
        const msg = { id: Date.now() + Math.random(), from: 'manager', text, time: new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) };
        setMessages(prev => [...prev, msg]);
      });
    }, 4000);
    return () => clearInterval(iv);
  }, [offset]);

  // Poll localStorage for manager replies from ManagerPage
  useEffect(() => {
    const iv = setInterval(() => {
      const key   = `bionerika_reply_${sessionId.current}`;
      const raw   = localStorage.getItem(key);
      if (!raw) return;
      try {
        const reply = JSON.parse(raw);
        // Deduplicate using timestamp
        setMessages(prev => {
          if (prev.some(m => m._ts === reply.ts)) return prev;
          return [...prev, { id: Date.now() + Math.random(), from:'manager', text: reply.text, time: reply.time, _ts: reply.ts }];
        });
        localStorage.removeItem(key); // consume the reply
      } catch {}
    }, 2500);
    return () => clearInterval(iv);
  }, []);

  const handleAIResponse = useCallback((userText) => {
    const delay = 1200 + Math.random() * 1800;
    setAiTyping(true);
    setTimeout(() => {
      setMessages(prev => {
        const responseText = getAIResponse(userText, lang, prev);
        const aiMsg = lsAddMessage(sessionId.current, 'ai', responseText);
        return [...prev, aiMsg];
      });
      setAiTyping(false);
    }, delay);
  }, [lang]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setSending(true);

    const msg = lsAddMessage(sessionId.current, 'client', text);
    setMessages(prev => [...prev, msg]);
    lsUpsertSession(sessionId.current, profile?.name || 'Guest', text);

    if (AI_IS_AVAILABLE) {
      // AI mode — respond locally
      handleAIResponse(text);
    } else {
      // Telegram mode — forward to manager
      try {
        if (!hasNotified.current) {
          hasNotified.current = true;
          await notifyNewChat({ sessionId: `${sessionId.current} (${profile?.name || 'Guest'})`, message: text });
        } else {
          await forwardMessage({ message: text, sessionId: sessionId.current });
        }
      } catch {}
    }
    setSending(false);
  };

  const isWorkHours = new Date().getHours() >= 8 && new Date().getHours() < 20;
  const agentName = AI_IS_AVAILABLE ? 'Оля · AI Assisstant' : 'Bionerika Manager';
  const agentStatusTxt = AI_IS_AVAILABLE
    ? (lang === 'ua' ? 'AI-асистент онлайн' : lang === 'ru' ? 'AI-ассистент онлайн' : 'AI assistant online')
    : (isWorkHours ? lbl.chatOnline : lbl.chatOffline);

  return (
    <div style={{ display:'flex', flexDirection:'column', height:620, background:'transparent', borderRadius:'var(--radius)', border:'1px solid var(--border)', overflow:'hidden' }}>

      {/* Chat header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 20px', background:'var(--chat-head-bg)', backdropFilter:'blur(18px)', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
        <div style={{ width:40, height:40, borderRadius:'50%', background:'linear-gradient(135deg, var(--moss), var(--forest))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>🌿</div>
        <div>
          <div style={{ fontSize:14, fontWeight:700, color:'var(--dark)', fontFamily:'var(--sans)' }}>{agentName}</div>
          <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:2 }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background: AI_IS_AVAILABLE ? '#c9922a' : (isWorkHours ? '#4ade80' : '#9ca3af'), display:'block', animation:'blink 2.2s infinite' }}/>
            <span style={{ fontSize:10, color: AI_IS_AVAILABLE ? '#f5c871' : (isWorkHours ? '#86efac' : '#9ca3af') }}>
              {agentStatusTxt}
            </span>
          </div>
        </div>
        <div style={{ marginLeft:'auto', display:'flex', flexDirection:'column', alignItems:'flex-end', gap:3 }}>
          <span style={{ fontSize:9, color:'rgba(244,239,228,0.2)', fontFamily:'monospace' }}>#{sessionId.current}</span>
          <span style={{ fontSize:9, padding:'2px 7px', borderRadius:100, background: AI_IS_AVAILABLE ? 'rgba(201,146,42,0.2)' : 'rgba(74,222,128,0.15)', color: AI_IS_AVAILABLE ? '#c9922a' : '#4ade80', fontWeight:700, letterSpacing:'.06em', textTransform:'uppercase', border: `1px solid ${AI_IS_AVAILABLE ? 'rgba(201,146,42,0.3)' : 'rgba(74,222,128,0.25)'}` }}>
            {AI_IS_AVAILABLE ? 'AI MODE' : 'LIVE'}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div ref={msgsContainerRef} style={{ flex:1, overflowY:'auto', padding:'18px 20px', display:'flex', flexDirection:'column', gap:10, scrollbarWidth:'thin', scrollbarColor:'var(--sage) transparent',
        background:'var(--chat-bg)',
      }}>
        <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:.35}} @keyframes typeBounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}`}</style>
        {messages.map(msg => {
          const isUser = msg.from === 'client' || msg.from === 'user';
          const isAI   = msg.from === 'ai';
          return (
            <div key={msg.id} style={{ display:'flex', alignItems:'flex-end', gap:8, justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
              {!isUser && (
                <div style={{ width:28, height:28, borderRadius:'50%', background: isAI ? 'linear-gradient(135deg,#c9922a22,#c9922a44)' : 'var(--dark)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, flexShrink:0, border: isAI ? '1px solid #c9922a44' : 'none' }}>
                  {isAI ? '🤖' : '🌿'}
                </div>
              )}
              <div style={{ maxWidth:'74%' }}>
                <div style={{
                  padding:'10px 14px', fontSize:13, lineHeight:1.55, boxShadow:'0 1px 4px rgba(0,0,0,.07)',
                  borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: isUser ? 'var(--forest)' : isAI ? 'var(--parchment)' : 'var(--white,#fdfcf8)',
                  color: isUser ? 'var(--parchment)' : 'var(--dark)',
                  border: isUser ? 'none' : '1px solid var(--border)',
                }}>{msg.text}</div>
                <div style={{ fontSize:10, color:'var(--muted)', marginTop:3, textAlign: isUser ? 'right' : 'left' }}>
                  {isAI && <span style={{ color:'#c9922a', marginRight:4 }}>✦ AI</span>}{msg.time}
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {aiTyping && (
          <div style={{ display:'flex', alignItems:'flex-end', gap:8 }}>
            <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,#c9922a22,#c9922a44)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, border:'1px solid #c9922a44' }}>🤖</div>
            <div style={{ display:'flex', gap:4, alignItems:'center', padding:'12px 16px', background:'var(--parchment)', borderRadius:'16px 16px 16px 4px', border:'1px solid var(--border)' }}>
              {[0,1,2].map(i => <span key={i} style={{ width:6, height:6, borderRadius:'50%', background:'var(--muted)', display:'block', animation:`typeBounce 1.2s infinite ${i*0.2}s` }}/>)}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ display:'flex', gap:8, padding:'10px 14px', borderTop:'1px solid var(--border)', background:'var(--white,#fdfcf8)', flexShrink:0 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && !aiTyping && sendMessage()}
          placeholder={lbl.chatPlaceholder}
          disabled={aiTyping}
          style={{ flex:1, padding:'10px 16px', borderRadius:100, border:'1.5px solid var(--border)', fontSize:13, fontFamily:'var(--sans)', outline:'none', background:'var(--cream)', color:'var(--dark)', transition:'border-color .2s' }}
        />
        <button onClick={sendMessage} disabled={sending || !input.trim() || aiTyping}
          style={{ padding:'10px 18px', borderRadius:100, border:'none', background: (input.trim() && !aiTyping) ? 'var(--forest)' : 'var(--border)', color: (input.trim() && !aiTyping) ? 'var(--cream)' : 'var(--muted)', fontFamily:'var(--sans)', fontSize:13, fontWeight:700, cursor: (input.trim() && !aiTyping) ? 'pointer' : 'default', transition:'background .2s, color .2s' }}>
          {sending ? '…' : lbl.send}
        </button>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────
   SUB-COMPONENT: Contact buttons
─────────────────────────────────────────────── */
function ContactPanel({ lang }) {
  const lbl = LBL[lang] || LBL.en;
  const contacts = [
    { icon:'📞', label:'Телефон / Phone', value:'+380 (44) 123-45-67', action:() => window.open('tel:+380441234567'), color:'#4a7c59', bg:'rgba(74,124,89,0.08)' },
    { icon:'✉️', label:'Email', value:'info@bionerika.com', action:() => window.open('mailto:info@bionerika.com'), color:'#2d6e9e', bg:'rgba(45,110,158,0.08)' },
    { icon:'💬', label:'Telegram', value:'@bionerika_support', action:() => window.open('https://t.me/bionerika_support'), color:'#2ca5e0', bg:'rgba(44,165,224,0.08)' },
    { icon:'📱', label:'WhatsApp', value:'+380 (44) 123-45-67', action:() => window.open('https://wa.me/380441234567'), color:'#25d366', bg:'rgba(37,211,102,0.08)' },
    { icon:'🕐', label: lang==='ua'?'Графік роботи':lang==='ru'?'График работы':'Working hours', value: lang==='ua'?'Пн–Пт 8:00–19:00 · Сб 9:00–17:00':lang==='ru'?'Пн–Пт 8:00–19:00 · Сб 9:00–17:00':'Mon–Fri 8:00–19:00 · Sat 9:00–17:00', action:null, color:'#6b7c6b', bg:'rgba(107,124,107,0.06)' },
    { icon:'📍', label: lang==='ua'?'Адреса офісу':lang==='ru'?'Адрес офиса':'Office address', value: lang==='ua'?'вул. Теплична, 1, Київ':lang==='ru'?'ул. Тепличная, 1, Киев':'1 Greenhouse St, Kyiv', action:() => window.open('https://maps.google.com/?q=Kyiv'), color:'#b85c3a', bg:'rgba(184,92,58,0.07)' },
  ];

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      <div style={{ fontSize:11, fontWeight:700, letterSpacing:'1px', color:'rgba(26,46,26,0.45)', textTransform:'uppercase', marginBottom:8, fontFamily:'monospace' }}>{lbl.contactTitle}</div>
      {contacts.map((c, i) => (
        <div key={i}
          onClick={c.action||undefined}
          style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 18px', borderRadius:14, background:c.bg, border:`1px solid ${c.color}22`, cursor:c.action?'pointer':'default', transition:'box-shadow .2s, transform .15s' }}
          onMouseEnter={e => { if(c.action){e.currentTarget.style.boxShadow=`0 4px 18px ${c.color}22`;e.currentTarget.style.transform='translateY(-1px)';} }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow='none';e.currentTarget.style.transform='none'; }}>
          <span style={{ fontSize:22, flexShrink:0 }}>{c.icon}</span>
          <div>
            <div style={{ fontSize:11, color:'rgba(26,46,26,0.45)', marginBottom:2, fontWeight:600, textTransform:'uppercase', letterSpacing:'.5px' }}>{c.label}</div>
            <div style={{ fontSize:14, color:c.color, fontWeight:600 }}>{c.value}</div>
          </div>
          {c.action && <span style={{ marginLeft:'auto', color:`${c.color}99`, fontSize:18 }}>→</span>}
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN EXPORT: AccountPage
═══════════════════════════════════════════════════════════════ */
export default function AccountPage({ lang = 'en', cur, onPage }) {
  const lbl  = LBL[lang] || LBL.en;
  const sym  = cur?.symbol || '$';
  const rate = cur?.rate   || 1;

  const [profile, setProfile]     = useState(() => loadProfile());
  const [sbUser, setSbUser]       = useState(null);
  const [orders, setOrders]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState('overview');
  const [editMode, setEditMode]   = useState(false);
  const [editForm, setEditForm]   = useState({});
  const [saveMsg, setSaveMsg]     = useState('');
  const [newAddr, setNewAddr]     = useState('');
  const [orderFilter, setOrderFilter] = useState('all');
  const [expandedOrder, setExpandedOrder] = useState(null);

  /* Load auth session & data + real-time orders subscription */
  useEffect(() => {
    setLoading(true);
    let realtimeSub = null;

    async function init() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { setLoading(false); return; }
        setSbUser(session.user);
        const meta = session.user.user_metadata || {};
        let dbProfile = await sbGetProfile(session.user.id);
        const merged = {
          uid:    session.user.id,
          name:   dbProfile?.name   || meta.full_name || meta.name || 'User',
          email:  session.user.email,
          avatar: dbProfile?.avatar || meta.avatar_url || meta.picture || null,
          level:  dbProfile?.level  || 'Bronze',
          points: dbProfile?.points || 0,
          createdAt: session.user.created_at,
          addresses: dbProfile?.addresses || [],
          transactions: dbProfile?.transactions || [],
        };
        saveProfile(merged); setProfile(merged);
        const dbOrders = await sbGetOrders(session.user.id);
        setOrders(Array.isArray(dbOrders) ? dbOrders : []);

        /* ── Real-time: re-fetch orders on any INSERT/UPDATE/DELETE ── */
        realtimeSub = supabase
          .channel('orders-rt-' + session.user.id)
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: `uid=eq.${session.user.id}`,
          }, async () => {
            try {
              const fresh = await sbGetOrders(session.user.id);
              setOrders(Array.isArray(fresh) ? fresh : []);
            } catch {}
          })
          .subscribe();
      } catch {}
      setLoading(false);
    }

    init();

    return () => {
      if (realtimeSub) supabase.removeChannel(realtimeSub);
    };
  }, []);

  const totalSpent = useMemo(() => orders.reduce((s, o) => s + calcTotal(o, rate), 0), [orders, rate]);
  const avgOrder   = orders.length ? Math.round(totalSpent / orders.length) : 0;

  const filteredOrders = useMemo(() => {
    if (orderFilter === 'all') return orders;
    return orders.filter(o => (o.status||'pending') === orderFilter);
  }, [orders, orderFilter]);

  const levelColor = { Bronze:'#cd7f32', Silver:'#aaa', Gold:'#f5c518' };
  const levelIcon  = { Bronze:'🥉', Silver:'🥈', Gold:'🥇' };

  const doLogout = async () => {
    await sbSignOut();
    clearProfile(); setProfile(null); setSbUser(null); setOrders([]);
    onPage && onPage('home');
  };

  const doSaveEdit = async () => {
    const updated = { ...profile, ...editForm };
    saveProfile(updated); setProfile(updated);
    if (sbUser) await sbUpsertProfile(sbUser.id, { name: updated.name, phone: updated.phone });
    setEditMode(false); setSaveMsg(lbl.saved);
    setTimeout(() => setSaveMsg(''), 2500);
  };

  const doAddAddress = async () => {
    if (!newAddr.trim()) return;
    const addr = { id: Date.now(), label: lang==='ua'?'Дім':lang==='ru'?'Дом':'Home', address: newAddr, isDefault: false };
    const updated = { ...profile, addresses: [...(profile.addresses||[]), addr] };
    saveProfile(updated); setProfile(updated);
    if (sbUser) await sbUpsertProfile(sbUser.id, { addresses: updated.addresses });
    setNewAddr('');
  };

  const doRemoveAddress = useCallback(async (id) => {
    const updated = { ...profile, addresses: (profile.addresses||[]).filter(a => a.id !== id) };
    saveProfile(updated); setProfile(updated);
    if (sbUser) await sbUpsertProfile(sbUser.id, { addresses: updated.addresses });
  }, [profile, sbUser]);

  const TABS = [
    { k:'overview',  ico:<AccIco k="overview"/>,  l:lbl.overview  },
    { k:'orders',    ico:<AccIco k="orders"/>,     l:lbl.orders    },
    { k:'analytics', ico:<AccIco k="analytics"/>,  l:lbl.analytics },
    { k:'addresses', ico:<AccIco k="addresses"/>,  l:lbl.addresses },
    { k:'chat',      ico:<AccIco k="chat"/>,        l:lbl.chat      },
    { k:'contact',   ico:<AccIco k="contact"/>,    l:lbl.contact   },
    { k:'settings',  ico:<AccIco k="settings"/>,   l:lbl.settings  },
  ];

  /* ── Not logged in ── */
  if (loading) return (
    <div style={{ minHeight:'100vh', background:'var(--cream)', display:'flex', alignItems:'center', justifyContent:'center', paddingTop:'var(--nav-h)' }}>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:16 }}>
        <div style={{ width:40, height:40, border:'3px solid rgba(20,26,20,0.1)', borderTopColor:'var(--moss)', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  if (!profile) return (
    <div style={{ minHeight:'100vh', background:'var(--cream)', display:'flex', alignItems:'center', justifyContent:'center', paddingTop:'var(--nav-h)', padding:'var(--nav-h) 20px 40px' }}>
      <div style={{ maxWidth:420, width:'100%', background:'var(--white,#fdfcf8)', borderRadius:24, padding:'48px 36px', boxShadow:'0 12px 48px rgba(26,46,26,0.12)', textAlign:'center' }}>
        <div style={{ fontSize:56, marginBottom:16 }}>🌿</div>
        <h2 style={{ fontFamily:'var(--serif)', fontSize:28, color:'var(--dark)', marginBottom:10 }}>{lbl.loginTitle}</h2>
        <p style={{ fontSize:14, color:'#6b7c6b', marginBottom:28, lineHeight:1.6 }}>
          {lang==='ua'?'Увійдіть через Google, щоб бачити свої замовлення, аналітику та спілкуватися з менеджером.':lang==='ru'?'Войдите через Google, чтобы видеть заказы, аналитику и общаться с менеджером.':'Sign in with Google to view your orders, analytics and chat with a manager.'}
        </p>
        <button onClick={sbSignInWithGoogle}
          style={{ width:'100%', padding:'14px 16px', borderRadius:12, border:'1.5px solid #dadce0', background:'#fff', display:'flex', alignItems:'center', gap:12, cursor:'pointer', fontFamily:'var(--sans)', fontSize:15, fontWeight:500, color:'#3c4043', boxShadow:'0 1px 3px rgba(0,0,0,.1)', transition:'box-shadow .2s' }}
          onMouseEnter={e=>e.currentTarget.style.boxShadow='0 3px 10px rgba(0,0,0,.15)'}
          onMouseLeave={e=>e.currentTarget.style.boxShadow='0 1px 3px rgba(0,0,0,.1)'}>
          <svg width="20" height="20" viewBox="0 0 24 24" style={{flexShrink:0}}>
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          {lbl.loginBtn}
          <span style={{marginLeft:'auto',fontSize:12,color:'#80868b'}}>🔒 OAuth 2.0</span>
        </button>
      </div>
    </div>
  );

  const initials = (profile.name||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();

  /* ── Logged in ── */
  return (
    <div style={{ minHeight:'100vh', background:'var(--cream)', paddingTop:'var(--nav-h)' }}>
      <div style={{ maxWidth:1080, margin:'0 auto', padding:'32px 20px 64px' }}>

        {/* Back button */}
        <button onClick={() => onPage && onPage('home')}
          style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, color:'var(--muted)', padding:'0 0 18px', fontFamily:'var(--sans)', display:'flex', alignItems:'center', gap:6, transition:'color .2s' }}
          onMouseEnter={e=>e.currentTarget.style.color='var(--forest)'}
          onMouseLeave={e=>e.currentTarget.style.color='var(--muted)'}>
          ← {lang==='ua'?'На головну':lang==='ru'?'На главную':'Home'}
        </button>

        {/* ── HERO HEADER ── */}
        <div style={{ background:'linear-gradient(135deg,rgba(4,16,6,0.55) 0%,rgba(14,44,16,0.45) 50%,rgba(26,68,28,0.35) 100%), url(https://images.unsplash.com/photo-1501004318641-b39e6451bec6?w=1400&q=80&fit=crop) center/cover no-repeat', borderRadius:24, padding:'32px 36px', marginBottom:28, display:'flex', alignItems:'center', gap:24, flexWrap:'wrap', boxShadow:'var(--s2)' }}>
          {/* Avatar */}
          <div style={{ width:80, height:80, borderRadius:'50%', border:'3px solid rgba(255,255,255,0.2)', overflow:'hidden', flexShrink:0, background:'rgba(255,255,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            {profile.avatar
              ? <img src={profile.avatar} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} referrerPolicy="no-referrer"/>
              : <span style={{ fontSize:28, color:'rgba(255,255,255,0.8)', fontWeight:700 }}>{initials}</span>
            }
          </div>
          {/* Info */}
          <div style={{ flex:1, minWidth:200 }}>
            <div style={{ fontSize:22, fontWeight:700, color:'#fff', marginBottom:4, fontFamily:'var(--serif)' }}>{profile.name}</div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,0.65)', marginBottom:10 }}>{profile.email}</div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <span style={{ fontSize:11, padding:'3px 10px', borderRadius:100, background:levelColor[profile.level]+'22', color:levelColor[profile.level], border:`1px solid ${levelColor[profile.level]}44`, fontWeight:700 }}>
                {levelIcon[profile.level]||'🥉'} {profile.level}
              </span>
              <span style={{ fontSize:11, padding:'3px 10px', borderRadius:100, background:'rgba(255,255,255,0.08)', color:'rgba(240,236,227,0.7)', border:'1px solid rgba(255,255,255,0.12)' }}>
                ⭐ {profile.points} points
              </span>
              {profile.createdAt && (
                <span style={{ fontSize:11, padding:'3px 10px', borderRadius:100, background:'rgba(255,255,255,0.06)', color:'rgba(240,236,227,0.45)' }}>
                  {lbl.memberSince} {new Date(profile.createdAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
          {/* KPIs */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, minWidth:280 }}>
            {[
              { l:lbl.totalOrders, v:orders.length },
              { l:lbl.totalSpent,  v:`${sym}${totalSpent.toLocaleString()}` },
              { l:lbl.avgOrder,    v:`${sym}${avgOrder.toLocaleString()}` },
            ].map((s,i) => (
              <div key={i} style={{ textAlign:'center' }}>
                <div style={{ fontSize:22, fontWeight:700, color:'#fff', fontFamily:'var(--serif)', letterSpacing:'-0.5px' }}>{s.v}</div>
                <div style={{ fontSize:10, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'.8px', fontFamily:'var(--sans)' }}>{s.l}</div>
              </div>
            ))}
          </div>
          {/* Logout */}
          <button onClick={doLogout}
            style={{ padding:'8px 16px', borderRadius:10, border:'1px solid rgba(255,255,255,0.18)', background:'rgba(255,255,255,0.07)', color:'rgba(240,236,227,0.65)', fontSize:12, cursor:'pointer', fontFamily:'var(--sans)', flexShrink:0, transition:'background .2s' }}
            onMouseEnter={e=>e.currentTarget.style.background='rgba(220,38,38,0.2)'}
            onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.07)'}>
            🚪 {lbl.logout}
          </button>
        </div>

        {/* ── TAB NAVIGATION ── */}
        <div style={{ display:'flex', gap:4, marginBottom:24, overflowX:'auto', paddingBottom:4, scrollbarWidth:'none' }}>
          {TABS.map(tb => (
            <button key={tb.k} onClick={() => setTab(tb.k)}
              style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 18px', borderRadius:100, border:'none', cursor:'pointer', fontFamily:'var(--sans)', fontSize:13, fontWeight:500, whiteSpace:'nowrap', flexShrink:0, transition:'background .2s, color .2s, box-shadow .2s',
                background: tab===tb.k ? 'var(--dark)' : 'rgba(20,26,20,0.06)',
                color:      tab===tb.k ? 'var(--cream)' : 'var(--muted)',
                boxShadow:  tab===tb.k ? 'var(--s0)' : 'none',
              }}>
              <span>{tb.ico}</span><span>{tb.l}</span>
            </button>
          ))}
        </div>

        {/* ══════ OVERVIEW ══════ */}
        {tab === 'overview' && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:20 }}>
            {/* Recent orders */}
            <div style={{ background:'var(--white,#fdfcf8)', borderRadius:'var(--radius)', padding:'22px', border:'1px solid var(--border)', gridColumn:'1/-1', boxShadow:'var(--s0)' }}>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:'1px', color:'var(--muted)', textTransform:'uppercase', marginBottom:16, fontFamily:'monospace' }}>
                {lang==='ua'?'ОСТАННІ ЗАМОВЛЕННЯ':lang==='ru'?'ПОСЛЕДНИЕ ЗАКАЗЫ':'RECENT ORDERS'}
              </div>
              {orders.length === 0 ? (
                <div style={{ textAlign:'center', padding:'24px 0', color:'var(--muted)' }}>
                  <div style={{ fontSize:36, marginBottom:8 }}>📦</div>
                  <div style={{ fontSize:13 }}>{lbl.noOrders}</div>
                  <button onClick={() => onPage&&onPage('order')} style={{ marginTop:14, padding:'8px 20px', borderRadius:10, border:'none', background:'var(--dark)', color:'var(--cream)', cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:'var(--sans)' }}>
                    {lang==='ua'?'Оформити замовлення':lang==='ru'?'Оформить заказ':'Place an order'}
                  </button>
                </div>
              ) : orders.slice(0, 5).map((o, i) => (
                <div key={o.id||i} style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 0', borderBottom:i<4?'1px solid var(--border)':'none' }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:'rgba(26,46,26,0.07)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>📦</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'var(--dark)', fontFamily:'monospace' }}>{o.order_number||o.id||'#…'}</div>
                    <div style={{ fontSize:11, color:'var(--muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{o.items_text||'—'}</div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:'var(--dark)', fontFamily:'monospace' }}>{o.currency_symbol||sym}{(o.total||0).toLocaleString()}</div>
                    <div style={{ fontSize:10, color: o.status==='done'?'#4a7c59':o.status==='process'?'#c47a3a':'#6b7c6b' }}>
                      {o.status==='done'?'✅':o.status==='process'?'🔄':'⏳'} {o.status||'pending'}
                    </div>
                  </div>
                </div>
              ))}
              {orders.length > 5 && (
                <button onClick={() => setTab('orders')} style={{ width:'100%', marginTop:12, padding:'8px', borderRadius:10, border:'1px solid var(--border)', background:'transparent', color:'var(--muted)', fontSize:12, cursor:'pointer', fontFamily:'var(--sans)' }}>
                  {lang==='ua'?`+ ще ${orders.length-5} замовлень`:lang==='ru'?`+ ещё ${orders.length-5} заказов`:`+ ${orders.length-5} more orders`}
                </button>
              )}
            </div>
            {/* Quick contact */}
            <div style={{ background:'var(--white,#fdfcf8)', borderRadius:'var(--radius)', padding:'22px', border:'1px solid var(--border)', boxShadow:'var(--s0)' }}>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:'1px', color:'var(--muted)', textTransform:'uppercase', marginBottom:16, fontFamily:'monospace' }}>
                {lang==='ua'?'ШВИДКИЙ КОНТАКТ':lang==='ru'?'БЫСТРЫЙ КОНТАКТ':'QUICK CONTACT'}
              </div>
              {[
                { ico:'📞', l:'+380 (44) 123-45-67', href:'tel:+380441234567', col:'#4a7c59' },
                { ico:'💬', l:'@bionerika_support', href:'https://t.me/bionerika_support', col:'#2ca5e0' },
                { ico:'✉️', l:'info@bionerika.com', href:'mailto:info@bionerika.com', col:'#2d6e9e' },
              ].map((c, i) => (
                <a key={i} href={c.href} target="_blank" rel="noreferrer"
                  style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 0', borderBottom:i<2?'1px solid var(--border)':'none', textDecoration:'none', color:'inherit', transition:'color .2s' }}
                  onMouseEnter={e=>e.currentTarget.style.color=c.col} onMouseLeave={e=>e.currentTarget.style.color='inherit'}>
                  <span style={{ fontSize:18 }}>{c.ico}</span>
                  <span style={{ fontSize:13, fontWeight:500 }}>{c.l}</span>
                  <span style={{ marginLeft:'auto', opacity:.3, fontSize:12 }}>→</span>
                </a>
              ))}
              <button onClick={() => setTab('chat')} style={{ width:'100%', marginTop:14, padding:'10px', borderRadius:10, border:'none', background:'var(--dark)', color:'var(--cream)', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'var(--sans)', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                💬 {lbl.chat}
              </button>
            </div>
            {/* Loyalty */}
            <div style={{ background:'var(--white,#fdfcf8)', borderRadius:'var(--radius)', padding:'22px', border:'1px solid var(--border)', boxShadow:'var(--s0)' }}>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:'1px', color:'var(--muted)', textTransform:'uppercase', marginBottom:16, fontFamily:'monospace' }}>
                {lang==='ua'?'ПРОГРАМА ЛОЯЛЬНОСТІ':lang==='ru'?'ПРОГРАММА ЛОЯЛЬНОСТИ':'LOYALTY PROGRAM'}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:18 }}>
                <span style={{ fontSize:36 }}>{levelIcon[profile.level]||'🥉'}</span>
                <div>
                  <div style={{ fontSize:22, fontWeight:700, color:levelColor[profile.level], fontFamily:'monospace' }}>{profile.level}</div>
                  <div style={{ fontSize:11, color:'var(--muted)' }}>{profile.points} points total</div>
                </div>
              </div>
              {[['Bronze','Silver',1500],['Silver','Gold',5000]].map(([from,to,need]) => (
                profile.level === from && (
                  <div key={from}>
                    <div style={{ fontSize:11, color:'var(--muted)', marginBottom:6 }}>
                      {lang==='ua'?`До рівня ${to}:`:lang==='ru'?`До уровня ${to}:`:`To ${to}:`} {Math.max(0, need - profile.points)} points
                    </div>
                    <div style={{ height:6, borderRadius:3, background:'rgba(26,46,26,0.08)', overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${Math.min(100, Math.round(profile.points/need*100))}%`, background:levelColor[to]||levelColor.Bronze, borderRadius:3, transition:'width .5s' }}/>
                    </div>
                  </div>
                )
              ))}
              {profile.level === 'Gold' && <div style={{ fontSize:13, color:'#f5c518', fontWeight:600 }}>🏆 Maximum level reached!</div>}
            </div>
          </div>
        )}

        {/* ══════ ORDERS ══════ */}
        {tab === 'orders' && (
          <div>
            <div style={{ display:'flex', gap:6, marginBottom:18, flexWrap:'wrap' }}>
              {['all','pending','process','done','cancelled'].map(st => (
                <button key={st} onClick={() => setOrderFilter(st)}
                  style={{ padding:'6px 14px', borderRadius:100, border:'none', cursor:'pointer', fontFamily:'var(--sans)', fontSize:11, fontWeight:700, transition:'background .2s',
                    background: orderFilter===st ? 'var(--dark)' : 'rgba(20,26,20,0.07)',
                    color:      orderFilter===st ? 'var(--cream)' : 'var(--muted)',
                  }}>
                  {st==='all' ? (lang==='ua'?'Всі':lang==='ru'?'Все':'All') : st==='done' ? '✅ Done' : st==='process' ? '🔄 Processing' : st==='pending' ? '⏳ Pending' : '❌ Cancelled'}
                  {st !== 'all' && ` (${orders.filter(o=>(o.status||'pending')===st).length})`}
                </button>
              ))}
            </div>
            {filteredOrders.length === 0 ? (
              <div style={{ textAlign:'center', padding:'48px', color:'var(--muted)' }}>
                <div style={{ fontSize:48, marginBottom:12 }}>📭</div>
                <div>{lbl.noOrders}</div>
              </div>
            ) : filteredOrders.map((o, i) => (
              <div key={o.id||i} style={{ background:'var(--white,#fdfcf8)', borderRadius:14, border:'1px solid var(--border)', marginBottom:10, overflow:'hidden' }}>
                <div style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 18px', cursor:'pointer' }}
                  onClick={() => setExpandedOrder(expandedOrder===o.id?null:o.id)}>
                  <div style={{ fontSize:20 }}>📦</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:'var(--dark)', fontFamily:'monospace' }}>{o.order_number||o.id||'#—'}</div>
                    <div style={{ fontSize:11, color:'var(--muted)' }}>{o.created_at ? new Date(o.created_at).toLocaleDateString() : '—'}</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:15, fontWeight:700, color:'var(--dark)', fontFamily:'monospace' }}>{o.currency_symbol||sym}{(o.total||0).toLocaleString()}</div>
                    <div style={{ fontSize:11, color: o.status==='done'?'#4a7c59':o.status==='process'?'#c47a3a':'#6b7c6b', fontWeight:600 }}>
                      {o.status==='done'?'✅ Done':o.status==='process'?'🔄 Processing':o.status==='cancelled'?'❌ Cancelled':'⏳ Pending'}
                    </div>
                  </div>
                  <span style={{ color:'var(--muted)', transition:'transform .2s', display:'block', transform:expandedOrder===o.id?'rotate(180deg)':'rotate(0deg)' }}>▼</span>
                </div>
                {expandedOrder === o.id && (
                  <div style={{ padding:'0 18px 16px', borderTop:'1px solid var(--border)' }}>
                    <div style={{ marginTop:12, fontSize:12, color:'var(--muted)', lineHeight:1.8 }}>
                      {(o.items_text||'').split(',').map((item,ii) => (
                        <div key={ii} style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom:ii < (o.items_text||'').split(',').length-1 ? '1px solid var(--border)' : 'none' }}>
                          <span>{item.trim()}</span>
                        </div>
                      ))}
                    </div>
                    {o.client_name && (
                      <div style={{ marginTop:10, fontSize:12, color:'var(--muted)', display:'flex', gap:16, flexWrap:'wrap' }}>
                        {o.client_name    && <span>👤 {o.client_name}</span>}
                        {o.client_phone   && <span>📞 {o.client_phone}</span>}
                        {o.client_address && <span>📍 {o.client_address}</span>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ══════ ANALYTICS ══════ */}
        {tab === 'analytics' && <AnalyticsPanel orders={orders} cur={cur} lang={lang}/>}

        {/* ══════ ADDRESSES ══════ */}
        {tab === 'addresses' && (
          <div style={{ maxWidth:560 }}>
            {(profile.addresses||[]).length === 0 && (
              <div style={{ textAlign:'center', padding:'32px', color:'var(--muted)' }}>
                <div style={{ fontSize:36, marginBottom:8 }}>📍</div>
                <div style={{ fontSize:13 }}>{lang==='ua'?'Адрес ще немає':lang==='ru'?'Адресов пока нет':'No addresses yet'}</div>
              </div>
            )}
            {(profile.addresses||[]).map(a => (
              <div key={a.id} style={{ background:'var(--white,#fdfcf8)', borderRadius:14, border:'1px solid var(--border)', padding:'14px 18px', marginBottom:10, display:'flex', alignItems:'center', gap:12 }}>
                <span style={{ fontSize:20 }}>📍</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'var(--dark)' }}>{a.label}</div>
                  <div style={{ fontSize:12, color:'var(--muted)' }}>{a.address}</div>
                </div>
                {a.isDefault && <span style={{ fontSize:10, padding:'2px 8px', borderRadius:100, background:'var(--dark)', color:'var(--cream)' }}>✓ Default</span>}
                <button onClick={() => doRemoveAddress(a.id)}
                  style={{ width:28, height:28, borderRadius:8, border:'1px solid #fca5a5', background:'transparent', color:'#dc2626', cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', transition:'background .2s' }}
                  onMouseEnter={e=>e.currentTarget.style.background='#fee2e2'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>×</button>
              </div>
            ))}
            <div style={{ display:'flex', gap:8, marginTop:16 }}>
              <input value={newAddr} onChange={e => setNewAddr(e.target.value)} onKeyDown={e => e.key==='Enter'&&doAddAddress()}
                placeholder={lang==='ua'?'Нова адреса...':lang==='ru'?'Новый адрес...':'New address...'}
                style={{ flex:1, padding:'10px 14px', borderRadius:10, border:'1.5px solid var(--border)', fontSize:13, fontFamily:'var(--sans)', outline:'none' }}/>
              <button onClick={doAddAddress} style={{ padding:'10px 18px', borderRadius:10, border:'none', background:'var(--dark)', color:'var(--cream)', cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:'var(--sans)' }}>+</button>
            </div>
          </div>
        )}

        {/* ══════ CHAT ══════ */}
        {tab === 'chat' && (
          <div>
            <ManagerChat lang={lang} profile={profile}/>
            <p style={{ fontSize:11, color:'var(--muted)', marginTop:10, textAlign:'center', lineHeight:1.7 }}>
              {AI_IS_AVAILABLE
                ? (lang==='ua'?'🤖 Зараз відповідає AI-асистент Оля. Для зв\'язку з живим менеджером налаштуйте Telegram бота.':lang==='ru'?'🤖 Сейчас отвечает AI-ассистент Оля. Для связи с менеджером настройте Telegram бота.':'🤖 AI assistant Olya is handling messages. Configure Telegram bot to connect with a live manager.')
                : (lang==='ua'?'💬 Повідомлення надходять менеджеру в Telegram. Відповідь швидка протягом робочих годин.':lang==='ru'?'💬 Сообщения поступают менеджеру в Telegram. Ответ быстрый в рабочие часы.':'💬 Messages are forwarded to the manager via Telegram. Quick replies during business hours.')}
            </p>
          </div>
        )}

        {/* ══════ CONTACT ══════ */}
        {tab === 'contact' && (
          <div style={{ maxWidth:560 }}>
            <ContactPanel lang={lang}/>
          </div>
        )}

        {/* ══════ SETTINGS ══════ */}
        {tab === 'settings' && (
          <div style={{ maxWidth:480 }}>
            <div style={{ background:'var(--white,#fdfcf8)', borderRadius:18, border:'1px solid var(--border)', overflow:'hidden' }}>
              <div style={{ padding:'20px 22px', borderBottom:'1px solid var(--border)', background:'var(--parchment)' }}>
                <div style={{ fontSize:11, fontWeight:700, letterSpacing:'1px', color:'var(--muted)', textTransform:'uppercase', fontFamily:'monospace' }}>
                  {lang==='ua'?'ОСОБИСТІ ДАНІ':lang==='ru'?'ЛИЧНЫЕ ДАННЫЕ':'PERSONAL DATA'}
                </div>
              </div>
              <div style={{ padding:'22px' }}>
                {saveMsg && <div style={{ background:'#dcfce7', border:'1px solid #4ade80', borderRadius:10, padding:'10px 14px', fontSize:13, color:'#16a34a', marginBottom:16 }}>✅ {saveMsg}</div>}

                {!editMode ? (
                  <>
                    {[['👤', lbl.name, profile.name||'—'], ['📧', lbl.email, profile.email||'—'], ['📞', lbl.phone, profile.phone||'—']].map(([ico,label,val],i) => (
                      <div key={label} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 0', borderBottom:i<2?'1px solid var(--border)':'none' }}>
                        <span style={{ fontSize:18, flexShrink:0 }}>{ico}</span>
                        <div>
                          <div style={{ fontSize:10, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.8px', fontWeight:600 }}>{label}</div>
                          <div style={{ fontSize:14, color:'var(--dark)', fontWeight:500 }}>{val}</div>
                        </div>
                      </div>
                    ))}
                    <div style={{ marginTop:14, display:'flex', gap:10 }}>
                      <button onClick={() => { setEditForm({ name:profile.name||'', phone:profile.phone||'' }); setEditMode(true); }}
                        style={{ flex:1, padding:'10px', borderRadius:10, border:'none', background:'var(--dark)', color:'var(--cream)', cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:'var(--sans)' }}>
                        ✏️ {lbl.edit}
                      </button>
                      <button onClick={doLogout}
                        style={{ flex:1, padding:'10px', borderRadius:10, border:'1.5px solid #fca5a5', background:'transparent', color:'#dc2626', cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:'var(--sans)' }}>
                        🚪 {lbl.logout}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {[['name',lbl.name,'text'],[`phone`,lbl.phone,'tel']].map(([key,label,type]) => (
                      <div key={key} style={{ marginBottom:14 }}>
                        <label style={{ fontSize:12, fontWeight:600, color:'var(--muted)', display:'block', marginBottom:5 }}>{label}</label>
                        <input type={type} value={editForm[key]||''} onChange={e => setEditForm(f=>({...f,[key]:e.target.value}))}
                          style={{ width:'100%', padding:'10px 14px', borderRadius:10, border:'1.5px solid var(--border)', fontSize:13, fontFamily:'var(--sans)', outline:'none', background:'var(--white,#fdfcf8)', color:'var(--dark)' }}/>
                      </div>
                    ))}
                    <div style={{ display:'flex', gap:10 }}>
                      <button onClick={doSaveEdit} style={{ flex:1, padding:'10px', borderRadius:10, border:'none', background:'var(--dark)', color:'var(--cream)', cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:'var(--sans)' }}>💾 {lbl.save}</button>
                      <button onClick={()=>setEditMode(false)} style={{ flex:1, padding:'10px', borderRadius:10, border:'1.5px solid var(--border)', background:'transparent', color:'var(--muted)', cursor:'pointer', fontSize:13, fontFamily:'var(--sans)' }}>{lbl.cancel}</button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Supabase UID */}
            <div style={{ marginTop:16, padding:'14px 18px', background:'var(--white,#fdfcf8)', borderRadius:14, border:'1px solid var(--border)' }}>
              <div style={{ fontSize:10, color:'var(--muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.8px', marginBottom:4 }}>Supabase UID</div>
              <div style={{ fontFamily:'monospace', fontSize:11, color:'var(--muted)', wordBreak:'break-all' }}>{profile.uid||'local-only'}</div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
