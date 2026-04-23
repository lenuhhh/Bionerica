import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useTheme } from './contexts/ThemeContext.jsx';
import {
  supabase,
  signInWithGoogle as sbSignInWithGoogle,
  signOut        as sbSignOut,
  getSession     as sbGetSession,
  getProfile     as sbGetProfile,
  upsertProfile  as sbUpsertProfile,
  getOrders      as sbGetOrders,
  insertOrder    as sbInsertOrder,
  getAllOrders        as sbGetAllOrders,
  subscribeAllOrders  as sbSubscribeOrders,
} from './services/supabase.js';
import ProfileDrawer, { loadProfile, saveProfile, clearProfile } from './components/ProfileDrawer/ProfileDrawer.jsx';
import AccountPage from './pages/AccountPage/AccountPage.jsx';
import ManagerPage from './pages/ManagerPage/ManagerPage.jsx';

import { sendManagerOrder, sendClientOrder } from './services/emailService.js';

/* ======================================================================
   CURRENCY
====================================================================== */
const CURRENCY = {
  en: { symbol: '$',  rate: 0.011, label: 'USD' },
  ua: { symbol: '₴',  rate: 0.41,  label: 'UAH' },
  ru: { symbol: '₴',  rate: 0.41,  label: 'UAH' },
};

/* ======================================================================
   TRANSLATIONS
====================================================================== */
const T = {
  en: {
    nav_home:'Home', nav_catalog:'Catalog', nav_delivery:'Delivery', nav_wholesale:'Analytics',
    nav_blog:'Blog', nav_about:'About', nav_contact:'Contact', nav_cta:'Place Order',
    nav_order:'Order',
    hero_eyebrow:'Bionerica Agency', hero_h1a:'Fresh', hero_h1b:'produce', hero_h1c:'straight from us',
    hero_cta1:'Place Order', hero_cta2:'Browse Catalog',
    hero_s1n:'8,400+', hero_s1l:'m² greenhouses', hero_s2n:'12,000+', hero_s2l:'happy clients',
    hero_s3n:'15', hero_s3l:'years experience',
    hero_fc1l:'Delivery', hero_fc1v:'from 1 day', hero_fc2l:'Rating', hero_fc2v:'4.9 / 5.0',
    hero_organic:'100% organic',
    ticker:['100% Organic','Delivery nationwide','8,400 m² greenhouses','12,000+ clients','Freshness guaranteed','No pesticides','Flowers in stock','Strawberries now'],
    srv:[['truck','Same-day delivery','Across the country. Freshness guaranteed.'],['leaf','100% Organic','No pesticides or GMOs. Certified.'],['greenhouse','Direct from greenhouse','Cut on dispatch day.'],['box','Wholesale & retail','Flexible terms for business.']],
    prod_eyebrow:'Assortment', prod_title:'Popular', prod_italic:'Products',
    prod_link:'Full Catalog >', prod_add:'+ Add', prod_viewing:'viewing',
    cats:[{k:'all',l:'All'},{k:'vegetables',l:'Vegetables'},{k:'fruits',l:'Fruits'},{k:'flowers',l:'Flowers'},{k:'greens',l:'Greens'},{k:'exotic',l:'Exotic'}],
    bento_title:'Our', bento_italic:'collections',
    bento:[{tag:'Greenhouses',title:'Veggies\n& greens',cta:'Browse >'},{tag:'Bestsellers',title:'Tomatoes & peppers',cta:'Buy >'},{tag:'Flowers',title:'Bouquets',cta:'Choose >'},{tag:'Fruits',title:'Exotic',cta:'Open >'},{tag:'Berries',title:'Fresh berries',cta:'Order >'}],
    how_eyebrow:'Process', how_title:'From seed', how_italic:'to table',
    how_steps:[['sprout','Sowing','Premium seeds selected by agronomists'],['drop','Care','Automated irrigation and organic fertilizers'],['thermometer','Ripening','Microclimate control 24/7 in 12 greenhouses'],['box','Packing','Careful packing in eco-friendly containers'],['truck','Delivery','Freshness from greenhouse to your door']],
    adv_eyebrow:'Advantages', adv_title:'Why choose', adv_italic:'us',
    adv:[['leaf','Organic','No chemicals or pesticides. Only natural fertilizers.'],['truck','Fast','Delivery within 24 hours.'],['trophy','Quality','Three-stage inspection of every batch.'],['briefcase','Wholesale','Special prices for business from 50 kg.'],['flask','Lab','Own quality control laboratory.'],['recycle','Eco','Biodegradable packaging, 0% plastic.']],
    stats_band:[['8,400','m² greenhouses'],['25+','crop varieties'],['340+','corp. clients'],['15','years exp.']],
    blog_eyebrow:'Blog', blog_title:'News &', blog_italic:'articles',
    blog:[{cat:'Agronomy',title:'How we grow tomatoes without pesticides',date:'March 5, 2025',read:'5 min'},{cat:'Season',title:'Strawberries in greenhouses — first harvest 2025',date:'March 1, 2025',read:'3 min'},{cat:'Flowers',title:'Holland roses: how to spot premium quality',date:'Feb 25, 2025',read:'4 min'}],
    blog_read:'Read >',
    test_eyebrow:'Reviews', test_title:'What our', test_italic:'clients say',
    test:[{name:'Andrew K.',role:'Restaurant Chef',emoji:'person',text:'3 years with Bionerika Agency. Consistent quality, precise delivery. Best tomatoes on the market.',stars:5},{name:'Marina S.',role:'Cafe Owner',emoji:'person',text:'Ordered flowers for a wedding — everything fresh and beautiful. Highly recommend!',stars:5},{name:'Dmitry V.',role:'Retail Customer',emoji:'person',text:'Buy strawberries every week. Juicy, sweet — nothing like store-bought. Kids love it.',stars:5}],
    del_eyebrow:'Delivery', del_title:'How we', del_italic:'deliver',
    del_sub:'Own fleet of 8 refrigerated trucks. Delivery across Ukraine and CIS.',
    del_zones:[{zone:'Kyiv',time:'Same day',price:'from $5',min:'from $15'},{zone:'Kyiv region',time:'1–2 days',price:'from $8',min:'from $30'},{zone:'All Ukraine',time:'2–5 days',price:'by rate',min:'from $50'},{zone:'Wholesale (50+ kg)',time:'By agreement',price:'Free',min:'from $250'}],
    del_faq:[['How is the product packaged?','We use insulated containers and gel cooling packs. Flowers are transported in special boxes with water.'],['Can I track my order?','Yes! After dispatch you will receive an SMS with a tracking link for real-time status.'],['What if the product arrives damaged?','We guarantee 100% replacement or refund within 24 hours. Just take a photo and contact us.'],['Is there free delivery?','Free delivery in Kyiv for orders over $50. For wholesale clients — over $250.']],
    del_hours:'Mon–Sat: 8:00–20:00 · Sun: 9:00–18:00',
    del_faq_title:'Delivery FAQ',
    del_zone_title:'Delivery zones & times',
    del_zone_h:['Zone','Time','Cost','Min. order'],
    ws_eyebrow:'Wholesale', ws_title:'Solutions for', ws_italic:'business',
    ws_sub:'Orders from 50 kg. Personal manager. Flexible payment and delivery terms.',
    ws_tiers:[{name:'Start',min:'50–100 kg',disc:'−10%',perks:['Personal manager','Weekly deliveries','Electronic invoices']},{name:'Partner',min:'100–500 kg',disc:'−15%',perks:['Priority delivery','Flexible schedule','Individual pricing','Tasting samples']},{name:'Premium',min:'500+ kg',disc:'from −20%',perks:['Dedicated warehouse','Own vehicle','Supply contract','Exclusive varieties','OEM labeling']}],
    ws_clients:'Our partners',
    ws_form_title:'Request price list',
    ws_name:'Your name', ws_company:'Company', ws_email:'Email', ws_phone:'Phone',
    ws_volume:'Approx. volume (kg/week)', ws_send:'Send request >', ws_ok:'Request sent! We will contact you within 2 hours.',
    ws_tier_best:'Popular',
    bp_eyebrow:'Journal', bp_title:'Green', bp_italic:'Lab',
    bp_sub:'Agronomic knowledge, storage tips and season news.',
    bp_read:'Read article >', bp_all:'All articles',
    bp_cats:['All','Agronomy','Season','Flowers','Recipes','Tips'],
    bp_posts:[
      {cat:'Agronomy',emoji:'sprout',title:'How we grow tomatoes without pesticides',desc:'Secrets of organic farming: bio-preparations, predator insects and closed water cycle.',date:'March 5, 2025',read:'5 min',tags:['tomatoes','organic']},
      {cat:'Season',emoji:'berry',title:'Strawberries in greenhouses — first harvest 2025',desc:'New variety "Alba" ready to ship. How we achieved 18 t/ha yield.',date:'March 1, 2025',read:'3 min',tags:['strawberry','season']},
      {cat:'Flowers',emoji:'flower',title:'Holland roses: how to spot premium quality',desc:'5 signs of a quality cut flower. What to look for when buying wholesale.',date:'Feb 25, 2025',read:'4 min',tags:['roses','flowers']},
      {cat:'Recipes',emoji:'leaf',title:'10 microgreen salads for restaurants',desc:"Our clients' chefs share original recipes with our greens.",date:'Feb 20, 2025',read:'6 min',tags:['recipes','greens']},
      {cat:'Tips',emoji:'bulb',title:'How to keep fresh greens for 2 weeks',desc:'Proper packaging and temperature regime will multiply freshness several times.',date:'Feb 14, 2025',read:'4 min',tags:['storage','tips']},
      {cat:'Agronomy',emoji:'flask',title:'Hydroponics vs soil: our 5-year experiment',desc:'Comparing yield, taste and production costs of two methods.',date:'Feb 8, 2025',read:'8 min',tags:['hydroponics','agronomy']},
    ],
    ab_eyebrow:'About', ab_title:'Bionerica', ab_italic:'Agency',
    ab_story_ey:'Our story', ab_story_title:'From a small greenhouse', ab_story_it:'greenhouse',
    ab_p1:"In 2010, the company's founders built their first experimental greenhouse of 200 m². The idea was simple: grow vegetables to Western quality standards and sell directly to restaurants.",
    ab_p2:'Five years later, the company expanded to seven greenhouses, adding a flower division. Today — 8,400 m² of modern greenhouses, own logistics park, and 340+ regular corporate clients.',
    ab_stats:[['12+','years on market'],['8,400','m² greenhouses'],['340+','clients'],['25+','crop varieties']],
    ab_team_ey:'Team', ab_team_title:'People behind', ab_team_it:'the harvest',
    ab_team:[
      {photo:'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=550&fit=crop&crop=top&q=80',name:'Alexey Zelentsov',role:'Founder & CEO',desc:'20 years in agribusiness. Advocate of organic farming.'},
      {photo:'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=550&fit=crop&crop=top&q=80',name:'Elena Morozova',role:'Chief Agronomist',desc:'PhD. Greenhouse technologies & hydroponics.'},
      {photo:'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=550&fit=crop&crop=top&q=80',name:'Sergey Kuznetsov',role:'Commercial Director',desc:'Partnerships and wholesale development.'},
      {photo:'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=550&fit=crop&crop=top&q=80',name:'Natalia Tsvetkova',role:'Floral Director',desc:'Floral division. Member of Florists Union.'},
    ],
    ab_val_ey:'Values', ab_val_title:'What drives', ab_val_it:'us',
    ab_vals:[{i:'sprout',t:'Eco-friendly',d:'Biodegradable packaging, 0% plastic, renewable energy.'},{i:'handshake',t:'Honesty',d:'Transparent prices, real ingredients, honest delivery times.'},{i:'trophy',t:'Quality',d:'Every batch goes through a three-stage inspection.'}],
    ab_cert:'Certificates & Awards',
    ab_certs:['IFOAM Organic Certificate 2024','Green Business Eco-label 2024','Best Restaurant Supplier 2023','Forbes Agro — Top 10 2023'],
    con_eyebrow:'Contact', con_title:'Contacts &', con_italic:'support',
    con_info:[{i:'pin',l:'Address',v:'Kyiv region, Brovary, Teplichna St, 1'},{i:'phone',l:'Phone',v:'+380 96 912 7464'},{i:'mail',l:'Email',v:'hello@bionerika.agency'},{i:'clock',l:'Working hours',v:'Mon–Fri 8:00–19:00'}],
    con_form:'Write to us', con_name:'Name *', con_email:'Email *', con_msg:'Message *',
    con_msg_ph:'Your message...', con_send:'Send >', con_ok_title:'Sent!', con_ok_text:'We will reply shortly.',
    con_map_title:'Find us on map',
    ord_eyebrow:'Checkout', ord_title:'Your', ord_italic:'order',
    ord_s1:'Cart', ord_s2:'Contacts', ord_s4:'Done',
    ord_empty:'Cart is empty', ord_empty_sub:'Add products from the catalog',
    ord_go_cat:'Browse catalog', ord_check:'Checkout >', ord_back:'< Back', ord_next:'Next >',
    ord_name:'Name *', ord_email:'Email *', ord_phone:'Phone *', ord_company:'Company',
    ord_address:'Delivery address *', ord_comment:'Comment',
    ord_total:'Total', ord_delivery_cost:'Delivery', ord_free:'Free',
    ord_promo:'Promo code', ord_promo_ph:'Enter promo code', ord_promo_apply:'Apply',
    ord_promo_ok:'10% discount applied!', ord_promo_err:'Promo code not found',
    ord_send:'Send order >', ord_sent_title:'Order placed!', ord_sent_sub:"We'll contact you at",
    cart_title:'Cart', cart_empty:'Cart is empty', cart_empty_sub:'Add products from catalog',
    cart_checkout:'Checkout >', cart_total:'Total', cart_viewing:'viewing',
    sr_ph:'Search products...', sr_no:'No results for', sr_found:'Found',
    sr_hint:'Try: tomato, rose, strawberry',
    chat_greet:"Hi! I'm a Bionerika Agency manager. Ask your question — I'll reply within a minute.",
    chat_ph:'Type a message...', chat_online:'● Manager online',
    chat_quick:['Delivery today?','Wholesale prices?','How to order?','Working hours?'],
    foot_desc:'Modern greenhouse complex. Organic vegetables, fruits and flowers all year round.',
    foot_nav:'Navigation', foot_cats:'Products', foot_nl:'Newsletter',
    foot_nl_desc:'Weekly news and deals', foot_nl_ph:'your@email.com', foot_nl_ok:'✓ Subscribed!',
    foot_nl_btn:'>',
    foot_copy:'© 2025 Bionerika Agency. All rights reserved.',
    foot_privacy:'Privacy', foot_terms:'Terms',
    products:[
      {name:'Cherry Tomato',      origin:'Greenhouse #2 — Organic', badge:'HIT',  pr:320, badgeT:'hit'},
      {name:'Dutch Cucumber',     origin:'Greenhouse #1 — Organic', badge:'FRESH',pr:180, badgeT:'fresh'},
      {name:'Red Rose Holland',   origin:'Flower House #4 — Premium',badge:'TOP', pr:89,  badgeT:'top'},
      {name:'Sochi Strawberry',   origin:'Greenhouse #5 — Premium', badge:'NEW',  pr:450, badgeT:'new'},
      {name:'Sweet Pepper',       origin:'Greenhouse #3 — Organic', badge:'HIT',  pr:280, badgeT:'hit'},
      {name:'Fresh Basil',        origin:'Greenhouse #2 — Organic', badge:'FRESH',pr:120, badgeT:'fresh'},
      {name:'Lemon Tree',         origin:'Flower House #1 — Exotic',badge:'NEW',  pr:1200,badgeT:'new'},
      {name:'White Orchid',       origin:'Flower House #3 — Premium',badge:'TOP', pr:750, badgeT:'top'},
      {name:'Fresh Broccoli',     origin:'Greenhouse #4 — Organic', badge:'FRESH',pr:200, badgeT:'fresh'},
      {name:'Isabella Grape',     origin:'Greenhouse #6 — Premium', badge:'HIT',  pr:380, badgeT:'hit'},
      {name:'Sunflower Bouquet',  origin:'Flower House #2 — Fresh', badge:'NEW',  pr:350, badgeT:'new'},
      {name:'Arugula Mix',        origin:'Greenhouse #1 — Organic', badge:'FRESH',pr:160, badgeT:'fresh'},
      {name:'Garden Raspberry',   origin:'Greenhouse #3 — Organic', badge:'TOP',  pr:520, badgeT:'top'},
      {name:'Large Blueberry',    origin:'Greenhouse #2 — Organic', badge:'FRESH',pr:680, badgeT:'fresh'},
      {name:'Nectarine Peach',    origin:'Greenhouse #6 — Premium', badge:'HIT',  pr:390, badgeT:'hit'},
      {name:'Tulip Mix',          origin:'Flower House #1 — Fresh', badge:'FRESH',pr:65,  badgeT:'fresh'},
      {name:'Bush Chrysanthemum', origin:'Flower House #4 — Fresh', badge:'HIT',  pr:120, badgeT:'hit'},
      {name:'Baby Spinach',       origin:'Greenhouse #3 — Organic', badge:'TOP',  pr:140, badgeT:'top'},
      {name:'Fresh Cilantro',     origin:'Greenhouse #2 — Organic', badge:'FRESH',pr:100, badgeT:'fresh'},
      {name:'Peppermint',         origin:'Greenhouse #1 — Organic', badge:'HIT',  pr:90,  badgeT:'hit'},
      {name:'Passionfruit',       origin:'Greenhouse #6 — Exotic',  badge:'HIT',  pr:890, badgeT:'hit'},
      {name:'Golden Physalis',    origin:'Greenhouse #5 — Exotic',  badge:'NEW',  pr:650, badgeT:'new'},
      {name:'Carambola',          origin:'Greenhouse #6 — Exotic',  badge:'TOP',  pr:720, badgeT:'top'},
      {name:'Dragon Fruit',       origin:'Greenhouse #5 — Exotic',  badge:'NEW',  pr:980, badgeT:'new'},
      {name:'Hass Avocado',       origin:'Greenhouse #4 — Organic', badge:'HIT',  pr:420, badgeT:'hit'},
    ],
    unit_kg:'$/kg', unit_pc:'$/pc',
    trust_title:'Ready to order?', trust_sub:'Contact us or place an order online right now',
    trust_cta1:'Place Order', trust_cta2:'Contact Us',
  },
  ua: {
    nav_home:'Головна', nav_catalog:'Каталог', nav_delivery:'Доставка', nav_wholesale:'Аналітика',
    nav_blog:'Блог', nav_about:'Про нас', nav_contact:'Контакти', nav_cta:'Оформити замовлення',
    nav_order:'Замовлення',
    hero_eyebrow:'Bionerica Agency', hero_h1a:'Свіжі', hero_h1b:'продукти', hero_h1c:'прямо від нас',
    hero_sub:'Власні теплиці, квіти та фрукти цілий рік. Без хімії. Доставка по всій Україні.',
    hero_cta1:'Оформити замовлення', hero_cta2:'Переглянути каталог',
    hero_s1n:'8 400+', hero_s1l:'м² теплиць', hero_s2n:'12 000+', hero_s2l:'задоволених клієнтів',
    hero_s3n:'15', hero_s3l:'років досвіду',
    hero_fc1l:'Доставка', hero_fc1v:'від 1 дня', hero_fc2l:'Рейтинг', hero_fc2v:'4.9 / 5.0',
    hero_organic:'100% органіка',
    ticker:['100% Органіка','Доставка по Україні','Теплиці 8 400 м²','12 000+ клієнтів','Свіжість гарантована','Без пестицидів','Квіти в наявності','Полуниця зараз'],
    srv:[['truck','Доставка від 1 дня','По всій Україні. Свіжість гарантована.'],['leaf','100% Органіка','Без пестицидів та ГМО. Сертифіковано.'],['greenhouse','Прямо з теплиці','Зрізано в день відправлення.'],['box','Опт і роздріб','Гнучкі умови для бізнесу.']],
    prod_eyebrow:'Асортимент', prod_title:'Популярні', prod_italic:'товари',
    prod_link:'Весь каталог >', prod_add:'+ Додати', prod_viewing:'переглядає',
    cats:[{k:'all',l:'Всі'},{k:'vegetables',l:'Овочі'},{k:'fruits',l:'Фрукти'},{k:'flowers',l:'Квіти'},{k:'greens',l:'Зелень'},{k:'exotic',l:'Екзотика'}],
    bento_title:'Наші', bento_italic:'колекції',
    bento:[{tag:'Теплиці',title:'Овочі та зелень',cta:'Переглянути >'},{tag:'Хіти',title:'Томати та перці',cta:'Купити >'},{tag:'Квіти',title:'Букети',cta:'Обрати >'},{tag:'Фрукти',title:'Екзотика',cta:'Відкрити >'},{tag:'Ягоди',title:'Свіжі ягоди',cta:'Замовити >'}],
    how_eyebrow:'Процес', how_title:'Від насіння', how_italic:'до столу',
    how_steps:[['sprout','Посів','Відбір кращих сортів насіння агрономами'],['drop','Догляд','Автоматизований полив та органічні добрива'],['thermometer','Дозрівання','Контроль мікроклімату 24/7 у 12 теплицях'],['box','Пакування','Акуратне пакування в екологічну тару'],['truck','Доставка','Свіжість від теплиці до вашого столу']],
    adv_eyebrow:'Переваги', adv_title:'Чому обирають', adv_italic:'нас',
    adv:[['leaf','Органіка','Без хімії та пестицидів. Тільки натуральні добрива.'],['truck','Швидко','Доставка до 24 годин по Україні.'],['trophy','Якість','Трьохетапний контроль кожної партії.'],['briefcase','Опт','Спеціальні ціни для бізнесу від 50 кг.'],['flask','Лабораторія','Власна лабораторія контролю якості.'],['recycle','Еко','Біорозкладна упаковка, 0% пластику.']],
    stats_band:[['8 400','м² теплиць'],['25+','видів культур'],['340+','корп. клієнтів'],['15','років досвіду']],
    blog_eyebrow:'Блог', blog_title:'Новини та', blog_italic:'статті',
    blog:[{cat:'Агрономія',title:'Як ми вирощуємо томати без пестицидів',date:'5 березня 2025',read:'5 хв'},{cat:'Сезон',title:'Полуниця у теплиці — перший урожай 2025',date:'1 березня 2025',read:'3 хв'},{cat:'Квіти',title:'Троянди Holland: як розпізнати преміум якість',date:'25 лютого 2025',read:'4 хв'}],
    blog_read:'Читати >',
    test_eyebrow:'Відгуки', test_title:'Що кажуть', test_italic:'клієнти',
    test:[{name:'Андрій К.',role:'Шеф-кухар ресторану',emoji:'person',text:'Співпрацюємо з Bionerika Agency вже 3 роки. Стабільна якість, точна доставка. Найкращі томати на ринку.',stars:5},{name:'Марина С.',role:'Власниця кафе',emoji:'person',text:'Замовляла квіти на весілля — все свіже і прекрасне. Рекомендую від щирого серця. Дякую!',stars:5},{name:'Дмитро В.',role:'Приватний покупець',emoji:'person',text:'Купую полуницю щотижня. Соковита, солодка, не те що у супермаркеті. Діти у захваті.',stars:5}],
    del_eyebrow:'Доставка', del_title:'Як ми', del_italic:'доставляємо',
    del_sub:'Власний автопарк з 8 рефрижераторів. Доставка по Україні та країнах СНД.',
    del_zones:[{zone:'Київ',time:'В день замовлення',price:'від 150 ₴',min:'від 500 ₴'},{zone:'Київська обл.',time:'1–2 дні',price:'від 250 ₴',min:'від 1 000 ₴'},{zone:'Вся Україна',time:'2–5 днів',price:'за тарифом',min:'від 2 000 ₴'},{zone:'Опт (50+ кг)',time:'за домовленістю',price:'Безкоштовно',min:'від 6 000 ₴'}],
    del_faq:[['Як упаковується товар?','Використовуємо термоізольовані контейнери та гелеві охолоджуючі пакети. Квіти перевозяться у спеціальних коробах з водою.'],['Чи можна відстежити доставку?','Так! Після відправлення ви отримаєте SMS з посиланням на відстеження у реальному часі.'],['Що робити якщо товар прийшов пошкодженим?','Гарантуємо 100% заміну або повернення коштів протягом 24 годин. Просто сфотографуйте і зверніться до нас.'],['Чи є безкоштовна доставка?','Безкоштовна доставка по Києву для замовлень від 2 500 ₴. Для оптових клієнтів — від 6 000 ₴.']],
    del_hours:'Пн–Сб: 8:00–20:00 · Нд: 9:00–18:00',
    del_faq_title:'Часті запитання про доставку',
    del_zone_title:'Зони та терміни доставки',
    del_zone_h:['Зона','Термін','Вартість','Мін. замовлення'],
    ws_eyebrow:'Оптові продажі', ws_title:'Рішення для', ws_italic:'бізнесу',
    ws_sub:'Замовлення від 50 кг. Персональний менеджер. Гнучкі умови оплати та доставки.',
    ws_tiers:[{name:'Старт',min:'50–100 кг',disc:'−10%',perks:['Персональний менеджер','Щотижневі поставки','Електронні накладні']},{name:'Партнер',min:'100–500 кг',disc:'−15%',perks:['Пріоритетна доставка','Гнучкий графік','Індивідуальне ціноутворення','Дегустаційні зразки']},{name:'Преміум',min:'500+ кг',disc:'від −20%',perks:['Виділений склад','Власний транспорт','Договір поставки','Ексклюзивні сорти','Маркування OEM']}],
    ws_clients:'Наші партнери',
    ws_form_title:'Запросити прайс-лист',
    ws_name:"Ваше ім'я", ws_company:'Компанія', ws_email:'Email', ws_phone:'Телефон',
    ws_volume:'Приблизний обсяг (кг/тижд)', ws_send:'Надіслати запит >', ws_ok:"Запит надіслано! Зв'яжемося протягом 2 годин.",
    ws_tier_best:'Популярний',
    bp_eyebrow:'Журнал', bp_title:'Зелена', bp_italic:'Лабораторія',
    bp_sub:'Агрономічні знання, поради зі зберігання та сезонні новини.',
    bp_read:'Читати статтю >', bp_all:'Всі статті',
    bp_cats:['Всі','Агрономія','Сезон','Квіти','Рецепти','Поради'],
    bp_posts:[
      {cat:'Агрономія',emoji:'sprout',title:'Як ми вирощуємо томати без пестицидів',desc:'Секрети органічного землеробства: біопрепарати, комахи-хижаки та замкнений водний цикл.',date:'5 березня 2025',read:'5 хв',tags:['томати','органіка']},
      {cat:'Сезон',emoji:'berry',title:'Полуниця у теплиці — перший урожай 2025',desc:'Новий сорт «Альба» готовий до відправлення. Як ми досягли врожайності 18 т/га.',date:'1 березня 2025',read:'3 хв',tags:['полуниця','сезон']},
      {cat:'Квіти',emoji:'flower',title:'Троянди Holland: як розпізнати преміум якість',desc:'5 ознак якісного зрізаного квітки. На що звертати увагу при оптовій закупівлі.',date:'25 лютого 2025',read:'4 хв',tags:['троянди','квіти']},
      {cat:'Рецепти',emoji:'leaf',title:'10 салатів з мікрозелені для ресторанів',desc:'Шеф-кухарі наших клієнтів діляться авторськими рецептами з нашою зеленню.',date:'20 лютого 2025',read:'6 хв',tags:['рецепти','зелень']},
      {cat:'Поради',emoji:'bulb',title:'Як зберегти свіжу зелень 2 тижні',desc:'Правильне пакування та температурний режим збільшать свіжість у кілька разів.',date:'14 лютого 2025',read:'4 хв',tags:['зберігання','поради']},
      {cat:'Агрономія',emoji:'flask',title:'Гідропоніка vs ґрунт: наш 5-річний експеримент',desc:'Порівнюємо врожайність, смак та виробничі витрати двох методів.',date:'8 лютого 2025',read:'8 хв',tags:['гідропоніка','агрономія']},
    ],
    ab_eyebrow:'Про компанію', ab_title:'Bionerica', ab_italic:'Agency',
    ab_sub:'Сучасний тепличний комплекс у передмісті. 15 років вирощування органічної продукції.',
    ab_story_ey:'Наша історія', ab_story_title:'Від маленької теплиці', ab_story_it:'теплиці',
    ab_p1:"У 2010 році засновники компанії збудували першу експериментальну теплицю площею 200 м². Ідея була проста: вирощувати овочі за стандартами якості Західної Європи та продавати безпосередньо ресторанам.",
    ab_p2:"За п'ять років компанія розширилась до семи теплиць, додавши квітковий напрямок. Сьогодні — 8 400 м² сучасних теплиць, власний логістичний парк та 340+ постійних корпоративних клієнтів.",
    ab_stats:[['12+','років на ринку'],['8 400','м² теплиць'],['340+','клієнтів'],['25+','видів культур']],
    ab_team_ey:'Команда', ab_team_title:'Люди за', ab_team_it:'урожаєм',
    ab_team:[
      {photo:'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=550&fit=crop&crop=top&q=80',name:'Олексій Зеленцов',role:'Засновник і CEO',desc:'20 років в агробізнесі. Прихильник органічного землеробства.'},
      {photo:'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=550&fit=crop&crop=top&q=80',name:'Олена Морозова',role:'Головний агроном',desc:'Кандидат наук. Тепличні технології та гідропоніка.'},
      {photo:'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=550&fit=crop&crop=top&q=80',name:'Сергій Кузнєцов',role:'Комерційний директор',desc:'Партнерства та розвиток оптових продажів.'},
      {photo:'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=550&fit=crop&crop=top&q=80',name:'Наталія Цвєткова',role:'Директор квіткового напрямку',desc:'Квітковий відділ. Член Спілки флористів.'},
    ],
    ab_val_ey:'Цінності', ab_val_title:'Що нас', ab_val_it:'рухає',
    ab_vals:[{i:'sprout',t:'Екологічність',d:'Біорозкладна упаковка, 0% пластику, відновлювана енергія.'},{i:'handshake',t:'Чесність',d:'Прозорі ціни, справжній склад, реальні терміни доставки.'},{i:'trophy',t:'Якість',d:'Кожна партія проходить трьохетапний контроль.'}],
    ab_cert:'Сертифікати та нагороди',
    ab_certs:['Органічний сертифікат IFOAM 2024','Еко-мітка Зеленого бізнесу 2024','Найкращий постачальник ресторанів 2023','Forbes Agro — Топ-10 2023'],
    con_eyebrow:"Зв'язок", con_title:'Контакти та', con_italic:'підтримка',
    con_info:[{i:'pin',l:'Адреса',v:'Київська область, м. Бровари, вул. Теплична, 1'},{i:'phone',l:'Телефон',v:'+380 96 912 7464'},{i:'mail',l:'Email',v:'hello@bionerika.agency'},{i:'clock',l:'Години роботи',v:'Пн–Пт 8:00–19:00'}],
    con_form:'Написати нам', con_name:"Ім'я *", con_email:'Email *', con_msg:'Повідомлення *',
    con_msg_ph:'Ваше повідомлення...', con_send:'Надіслати >', con_ok_title:'Надіслано!', con_ok_text:'Відповімо найближчим часом.',
    con_map_title:'Знайти нас на карті',
    ord_eyebrow:'Оформлення', ord_title:'Ваше', ord_italic:'замовлення',
    ord_s1:'Кошик', ord_s2:'Контакти', ord_s4:'Готово',
    ord_empty:'Кошик порожній', ord_empty_sub:'Додайте товари з каталогу',
    ord_go_cat:'До каталогу', ord_check:'Оформити >', ord_back:'< Назад', ord_next:'Далі >',
    ord_name:"Ім'я *", ord_email:'Email *', ord_phone:'Телефон *', ord_company:'Компанія',
    ord_address:'Адреса доставки *', ord_comment:'Коментар',
    ord_total:'Разом', ord_delivery_cost:'Доставка', ord_free:'Безкоштовно',
    ord_promo:'Промокод', ord_promo_ph:'Введіть промокод', ord_promo_apply:'Застосувати',
    ord_promo_ok:'Знижку 10% застосовано!', ord_promo_err:'Промокод не знайдено',
    ord_send:'Надіслати замовлення >', ord_sent_title:'Замовлення прийнято!', ord_sent_sub:"Зв'яжемося з вами за",
    cart_title:'Кошик', cart_empty:'Кошик порожній', cart_empty_sub:'Додайте продукти з каталогу',
    cart_checkout:'Оформити >', cart_total:'Разом', cart_viewing:'переглядає',
    sr_ph:'Пошук товарів...', sr_no:'Нічого не знайдено за запитом', sr_found:'Знайдено',
    sr_hint:'Спробуйте: томат, троянда, полуниця',
    chat_greet:"Привіт! Я менеджер Bionerika Agency. Задайте питання — відповім протягом хвилини.",
    chat_ph:'Написати повідомлення...', chat_online:'● Менеджер онлайн',
    chat_quick:['Доставка сьогодні?','Оптові ціни?','Як замовити?','Години роботи?'],
    foot_desc:'Сучасний тепличний комплекс. Органічні овочі, фрукти та квіти цілий рік.',
    foot_nav:'Навігація', foot_cats:'Продукти', foot_nl:'Розсилка',
    foot_nl_desc:'Щотижневі новини та знижки', foot_nl_ph:'your@email.com', foot_nl_ok:'Підписано!',
    foot_nl_btn:'>',
    foot_copy:'© 2025 Bionerika Agency. Всі права захищені.',
    foot_privacy:'Конфіденційність', foot_terms:'Умови',
    products:[
      {name:'Томат черрі',         origin:'Теплиця №2 — Органіка',  badge:'ХІТ',      pr:320, badgeT:'hit'},
      {name:'Огірок голландський', origin:'Теплиця №1 — Органіка',  badge:'СВІЖИЙ',   pr:180, badgeT:'fresh'},
      {name:'Троянда червона',     origin:'Квітник №4 — Преміум',   badge:'ТОП',      pr:89,  badgeT:'top'},
      {name:'Полуниця сочинська',  origin:'Теплиця №5 — Преміум',   badge:'НОВИНКА',  pr:450, badgeT:'new'},
      {name:'Перець солодкий',     origin:'Теплиця №3 — Органіка',  badge:'ХІТ',      pr:280, badgeT:'hit'},
      {name:'Базилік свіжий',      origin:'Теплиця №2 — Органіка',  badge:'СВІЖИЙ',   pr:120, badgeT:'fresh'},
      {name:'Лимонне дерево',      origin:'Квітник №1 — Екзотика',  badge:'НОВИНКА',  pr:1200,badgeT:'new'},
      {name:'Орхідея біла',        origin:'Квітник №3 — Преміум',   badge:'ТОП',      pr:750, badgeT:'top'},
      {name:'Броколі свіжа',       origin:'Теплиця №4 — Органіка',  badge:'СВІЖИЙ',   pr:200, badgeT:'fresh'},
      {name:'Виноград Ізабелла',   origin:'Теплиця №6 — Преміум',   badge:'ХІТ',      pr:380, badgeT:'hit'},
      {name:'Букет соняшників',    origin:'Квітник №2 — Свіжий',    badge:'НОВИНКА',  pr:350, badgeT:'new'},
      {name:'Мікс руколи',         origin:'Теплиця №1 — Органіка',  badge:'СВІЖИЙ',   pr:160, badgeT:'fresh'},
      {name:'Малина садова',       origin:'Теплиця №3 — Органіка',  badge:'ТОП',      pr:520, badgeT:'top'},
      {name:'Чорниця велика',      origin:'Теплиця №2 — Органіка',  badge:'СВІЖИЙ',   pr:680, badgeT:'fresh'},
      {name:'Нектарин персик',     origin:'Теплиця №6 — Преміум',   badge:'ХІТ',      pr:390, badgeT:'hit'},
      {name:'Тюльпан мікс',        origin:'Квітник №1 — Свіжий',    badge:'СВІЖИЙ',   pr:65,  badgeT:'fresh'},
      {name:'Хризантема кущова',   origin:'Квітник №4 — Свіжий',    badge:'ХІТ',      pr:120, badgeT:'hit'},
      {name:'Шпинат бейбі',        origin:'Теплиця №3 — Органіка',  badge:'ТОП',      pr:140, badgeT:'top'},
      {name:'Кінза свіжа',         origin:'Теплиця №2 — Органіка',  badge:'СВІЖИЙ',   pr:100, badgeT:'fresh'},
      {name:"М'ята перцева",       origin:'Теплиця №1 — Органіка',  badge:'ХІТ',      pr:90,  badgeT:'hit'},
      {name:'Маракуя',             origin:'Теплиця №6 — Екзотика',  badge:'ХІТ',      pr:890, badgeT:'hit'},
      {name:'Фізаліс золотий',     origin:'Теплиця №5 — Екзотика',  badge:'НОВИНКА',  pr:650, badgeT:'new'},
      {name:'Карамбола',           origin:'Теплиця №6 — Екзотика',  badge:'ТОП',      pr:720, badgeT:'top'},
      {name:'Пітахая',             origin:'Теплиця №5 — Екзотика',  badge:'НОВИНКА',  pr:980, badgeT:'new'},
      {name:'Авокадо Хасс',        origin:'Теплиця №4 — Органіка',  badge:'ХІТ',      pr:420, badgeT:'hit'},
    ],
    unit_kg:'₴/кг', unit_pc:'₴/шт',
    trust_title:'Готові зробити замовлення?', trust_sub:"Зв'яжіться з нами або оформте замовлення онлайн прямо зараз",
    trust_cta1:'Оформити замовлення', trust_cta2:"Зв'язатися з нами",
  },
};

/* ======================================================================
   PRODUCT IMAGES & CATS
====================================================================== */
const IMGS = [
  'https://images.unsplash.com/photo-1582284540020-8acbe03f4924?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1589621316382-008455b857cd?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1490750967868-88df5691cc99?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1587486937303-4a51e99f12e7?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1566800571969-d9ea3e5a9de1?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1537640538966-79f369143f8f?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1498557850523-fd3d118b962e?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1529410096176-b4df0c2fa24e?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1516912481808-3406841bd33c?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1562440499-64c9a111f713?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1628556270448-4d4e4148e1b1?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1628556270448-4d4e4148e1b1?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1604495772376-9657f0035809?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1555474952-c1f98e3f4e4c?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1517282009859-f000ec3b26fe?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=400&h=300&fit=crop',
];
const CATS_KEY = ['vegetables','vegetables','flowers','fruits','vegetables','greens','exotic','flowers','vegetables','fruits','flowers','greens','fruits','fruits','fruits','flowers','flowers','greens','greens','greens','exotic','exotic','exotic','exotic','fruits'];

/* Maps lowercased product names (EN + UA) → CATS_KEY category for real order analytics */
const PROD_CAT_MAP = (() => {
  const m = {};
  [
    ['cherry tomato','томат черрі'],
    ['dutch cucumber','огірок голландський'],
    ['red rose holland','троянда червона'],
    ['sochi strawberry','полуниця сочинська'],
    ['sweet pepper','перець солодкий'],
    ['fresh basil','базилік свіжий'],
    ['lemon tree','лимонне дерево'],
    ['white orchid','орхідея біла'],
    ['fresh broccoli','броколі свіжа'],
    ['isabella grape','виноград ізабелла'],
    ['sunflower bouquet','букет соняшників'],
    ['arugula mix','мікс руколи'],
    ['garden raspberry','малина садова'],
    ['large blueberry','чорниця велика'],
    ['nectarine peach','нектарин персик'],
    ['tulip mix','тюльпан мікс'],
    ['bush chrysanthemum','хризантема кущова'],
    ['baby spinach','шпинат бейбі'],
    ['fresh cilantro','кінза свіжа'],
    ['peppermint',"м'ята перцева"],
    ['passionfruit','маракуя'],
    ['golden physalis','фізаліс золотий'],
    ['carambola','карамбола'],
    ['dragon fruit','пітахая'],
    ['hass avocado','авокадо хасс'],
  ].forEach(([en, ua], i) => { m[en] = CATS_KEY[i]; m[ua] = CATS_KEY[i]; });
  return m;
})();
function parseItemsCat(itemsText) {
  const counts = {};
  if (!itemsText) return counts;
  itemsText.split(',').forEach(part => {
    const match = part.trim().match(/^(.+?)\s×(\d+)$/);
    if (!match) return;
    const cat = PROD_CAT_MAP[match[1].trim().toLowerCase()] || 'other';
    counts[cat] = (counts[cat] || 0) + (parseInt(match[2], 10) || 1);
  });
  return counts;
}

/* Price lookup: lowercase product name → base UAH price (used for per-category spend) */
const PRICE_MAP = {};
[...T.en.products, ...T.ua.products].forEach(p => { PRICE_MAP[p.name.toLowerCase()] = p.pr; });

/* Parse items_text → { category: amountUAH } — currency-agnostic storage */
function parseCatAmts(itemsText) {
  const res = {};
  if (!itemsText) return res;
  itemsText.split(',').forEach(part => {
    const m = part.trim().match(/^(.+?)\s×(\d+)$/);
    if (!m) return;
    const name = m[1].trim(), qty = parseInt(m[2], 10) || 1;
    const pr   = PRICE_MAP[name.toLowerCase()] || 0;
    const cat  = PROD_CAT_MAP[name.toLowerCase()] || 'other';
    res[cat]   = (res[cat] || 0) + pr * qty;
  });
  return res;
}

/* ── Smart AI responses for floating chat ──────────────────────── */
const CHAT_AI = {
  greet:{
    ua:['Привіт! 😊 Я асистент Bionerika, допоможу з будь-яким питанням!','Вітаю! Bionerika — свіжа продукція від виробника 🌿 Як можу допомогти?','Доброго дня! Запитуйте про ціни, доставку чи асортимент — відповім миттєво 🌱'],
    en:['Hello! 😊 I\'m the Bionerika assistant, happy to help!','Hi! Bionerika — fresh produce direct from growers 🌿 How can I help?','Good day! Ask me about prices, delivery or products — instant replies 🌱'],
  },
  delivery:{
    ua:['Доставка щодня, включаючи вихідні 🚚 Київ — до 10:00 ранку. Безкоштовно від 2000 грн. Уточніть місто?','Власний транспорт по всій Україні 🛵 Київ — наступний день або день-у-день. Регіони — 1–3 дні. Є самовивіз!','Замовляйте до 15:00 — доставимо наступного ранку 🌿 Мін. замовлення 500 грн. Який у вас район?'],
    en:['Delivery every day incl. weekends 🚚 Kyiv — by 10 AM. Free from 2000 UAH. What\'s your city?','Own fleet across Ukraine 🛵 Kyiv — next day or same-day. Regions — 1-3 days. Self-pickup also!','Order before 3 PM — delivered next morning 🌿 Min order 500 UAH. Which district?'],
  },
  price:{
    ua:['Ціни від виробника без посередників 💚 Овочі від 28 грн/кг, фрукти від 75. Для опту (від 20 кг) знижки 10–30%. Що цікавить?','Актуальні ціни в каталозі 🌿 Черрі-томат 48 грн/кг, огірок 28, полуниця 90. Яку позицію розглядаєте?','Прайс залежить від сезону і обсягу 📋 Для великих замовлень менеджер розрахує персональну ціну!'],
    en:['Direct-from-grower prices 💚 Vegetables from 28 UAH/kg, fruits from 75. Wholesale (20kg+) 10-30% off. What interests you?','Current prices in the catalog 🌿 Cherry tomato 48 UAH/kg, cucumber 28, strawberry 90. Which product?','Prices vary by season and volume 📋 For large orders a manager will calculate a personal price!'],
  },
  order:{
    ua:['Замовити легко! 🛒 Перейдіть до каталогу або напишіть, що потрібно — допоможу оформити. Відповідь за 30 хвилин.','Напишіть список: що і в якій кількості 📋 Передамо менеджеру і підтвердимо за 30 хв!','Кілька варіантів: 1️⃣ Каталог → кошик 2️⃣ Написати список тут 3️⃣ Зателефонувати. Який зручніший?'],
    en:['Easy to order! 🛒 Go to the catalog or tell me what you need — I\'ll help. Reply in 30 min.','Write your list: what and how much 📋 I\'ll pass it to the manager, confirmed in 30 min!','A few ways: 1️⃣ Catalog → cart 2️⃣ Write list here 3️⃣ Call manager. Which is most convenient?'],
  },
  wholesale:{
    ua:['Оптові умови від 20 кг 📦 Знижка 10%, від 50 кг — 15%, від 100 кг — 20–30%. Персональний менеджер. Яка ваша потреба?','Для ресторанів, готелів і магазинів — спеціальні умови 🤝 Щоденні поставки, усі документи. Розкажіть про бізнес!','Оптові поставки щодня або за графіком 🌿 Персональний менеджер, відтермінування платежу. Який обсяг?'],
    en:['Wholesale from 20 kg 📦 10% off, 50kg+ — 15%, 100kg+ — 20-30%. Personal manager. What\'s your volume?','For restaurants, hotels and stores — special terms 🤝 Daily deliveries, full docs. Tell us about your business!','Wholesale daily or scheduled 🌿 Personal manager, deferred payment. What volume are you looking for?'],
  },
  product:{
    ua:['Асортимент Bionerika 🌿 🍅 томати · 🥒 огірки · 🍓 ягоди · 🌸 квіти · 🥭 екзотика · 🥦 зелень. Щоденні оновлення! Що шукаєте?','Все свіже від перевірених фермерів 🥦 Покажіть у каталозі або напишіть назву — перевіримо наявність!','Широкий вибір сезонних і постійних позицій 🌱 Яка категорія вас цікавить?'],
    en:['Bionerika range 🌿 🍅 tomatoes · 🥒 cucumbers · 🍓 berries · 🌸 flowers · 🥭 exotic · 🥦 greens. Daily updates! What are you looking for?','All fresh from verified growers 🥦 Browse catalog or tell me the name — we\'ll check stock!','Wide seasonal and year-round selection 🌱 Which category interests you?'],
  },
  quality:{
    ua:['Якість — наш пріоритет 🌱 Без ГМО, власна лабораторія. Якщо щось не так — замінюємо безкоштовно!','Контроль від поля до доставки 🌿 Сертифікати на запит. Будь-яка проблема — вирішуємо впродовж 1 дня.'],
    en:['Quality is our priority 🌱 No GMO, own lab. If anything\'s wrong — free replacement!','Control from field to delivery 🌿 Certificates on request. Any issue resolved within 1 day.'],
  },
  hours:{
    ua:['Графік роботи: Пн–Пт 8:00–19:00, Сб 9:00–17:00 ⏰ Замовлення приймаємо онлайн цілодобово!','Офіс працює Пн–Пт з 8 до 19, Сб з 9 до 17 ⏰ Замовляйте у будь-який час — менеджер передзвонить вранці.'],
    en:['Working hours: Mon–Fri 8 AM–7 PM, Sat 9 AM–5 PM ⏰ Online orders accepted 24/7!','Office: Mon–Fri 8–19, Sat 9–17 ⏰ Order anytime — manager will call you in the morning.'],
  },
  thanks:{
    ua:['Будь ласка! 😊 Якщо ще є питання — я тут!','Радо! Звертайтесь будь-коли 🌿','Не за що! Чим ще можу допомогти?'],
    en:['You\'re welcome! 😊 Feel free to ask anything!','My pleasure! Reach out anytime 🌿','No problem! What else can I help with?'],
  },
  fallback:{
    ua:['Дякую за питання! 😊 Уточніть, будь ласка — про що саме: 📦 асортимент, 🚚 доставку, 💰 ціни чи оформлення?','Bionerika — свіжі овочі, фрукти та квіти від виробника 🌸 Про що розповісти докладніше?','Рада допомогти! Яка тема цікавить: ціни, доставка, асортимент чи оптові умови? 🌿'],
    en:['Thanks for your message! 😊 Could you clarify — about: 📦 products, 🚚 delivery, 💰 prices or an order?','Bionerika — fresh veg, fruit and flowers direct from growers 🌸 What would you like to know?','Happy to help! Prices, delivery, products or wholesale? 🌿'],
  },
};

function chatCategory(text) {
  const t = text.toLowerCase();
  if (/^(привіт|hello|hi\b|hey|вітаю|доброго|добрий|добр|howdy|good morning)/i.test(t)) return 'greet';
  if (/(дякую|спасибо|thanks|thank you|дяку)/i.test(t)) return 'thanks';
  if (/(години\s|годин\b|schedule|hours|розклад|графік|working hours|коли\sвідчин|режим роботи)/i.test(t)) return 'hours';
  if (/(доставк|delivery|shipping|привез|кур'єр|ship\b|самовивіз|pickup|коли привез)/i.test(t)) return 'delivery';
  if (/(опт\b|оптов|wholesale|ресторан|готел|партнер|bulk|b2b|магазин)/i.test(t)) return 'wholesale';
  if (/(ціна|цен|price|прайс|скільки|сколько|discount|знижк|вартість|\bcost\b)/i.test(t)) return 'price';
  if (/(замов|order|купити|купить|cart|кошик|оформ)/i.test(t)) return 'order';
  if (/(якість|quality|гмо|gmo|свіже|сертиф|орган|натурал)/i.test(t)) return 'quality';
  if (/(асортимент|товар|product|овоч|фрукт|квіт|зелен|томат|огірок|ягод|наявн|catalog|каталог)/i.test(t)) return 'product';
  return 'fallback';
}

function chatGetReply(text, lang, history) {
  const cat  = chatCategory(text);
  const l    = lang === 'en' ? 'en' : 'ua';
  const pool = (CHAT_AI[cat] || CHAT_AI.fallback)[l] || (CHAT_AI[cat] || CHAT_AI.fallback).ua || [];
  const recent = (history || []).filter(m => m.from === 'bot' || m.from === 'ai').slice(-3).map(m => m.text);
  const avail  = pool.filter(r => !recent.includes(r));
  const chosen = avail.length > 0 ? avail : pool;
  return chosen[Math.floor(Math.random() * chosen.length)] || '😊 Радо допоможу! Уточніть ваше питання.';
}

/* ======================================================================
   CSS
====================================================================== */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;0,700;1,600;1,700&family=Jost:wght@300;400;500;600&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --forest:#1e4020;--moss:#2e5e30;--sage:#5a864a;--lime:#8ab050;
  --cream:#f6f2ea;--parchment:#eee8d8;--terracotta:#c06b3a;--gold:#c9922a;
  --dark:#141a14;--text:#38463a;--muted:#8a9e8a;--white:#fdfcf8;
  --foot-bg:#0d1610;
  --border:rgba(30,64,32,.13);--radius:14px;
  --s0:0 4px 20px rgba(20,50,22,.08);--s1:0 12px 40px rgba(20,50,22,.13);--s2:0 30px 70px rgba(20,50,22,.17);
  --ease:cubic-bezier(.23,1,.32,1);--spring:cubic-bezier(.34,1.56,.64,1);
  --nav-h:68px;--serif:'Cormorant Garamond',Georgia,serif;--sans:'Jost',sans-serif;
  --chat-head-bg:rgba(244,239,228,0.97);
  --chat-bg: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Ccircle cx='30' cy='30' r='1.5' fill='%2364963c' fill-opacity='0.15'/%3E%3Ccircle cx='0' cy='0' r='1.5' fill='%2364963c' fill-opacity='0.15'/%3E%3Ccircle cx='60' cy='0' r='1.5' fill='%2364963c' fill-opacity='0.15'/%3E%3Ccircle cx='0' cy='60' r='1.5' fill='%2364963c' fill-opacity='0.15'/%3E%3Ccircle cx='60' cy='60' r='1.5' fill='%2364963c' fill-opacity='0.15'/%3E%3C/svg%3E") repeat center / 60px 60px, linear-gradient(160deg,#f2ede3 0%,#e8f0e2 100%);
}
/* ── Dark theme: charcoal bg, cream text, green accents only ── */
[data-theme="dark"]{
  --forest:#1e5828;--moss:#256a32;--sage:#3a6a44;--lime:#7aaa40;
  --cream:#1a1a1a;--parchment:#1e1e1e;--terracotta:#c07050;--gold:#b89030;
  --dark:#e8e4da;--text:#c8c4ba;--muted:#6a6a62;--white:#111111;
  --foot-bg:#060c07;
  --border:rgba(255,255,255,0.08);
  --chat-head-bg:rgba(17,17,17,0.97);
  --chat-bg: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Ccircle cx='30' cy='30' r='1.5' fill='%237aaa40' fill-opacity='0.1'/%3E%3Ccircle cx='0' cy='0' r='1.5' fill='%237aaa40' fill-opacity='0.1'/%3E%3Ccircle cx='60' cy='0' r='1.5' fill='%237aaa40' fill-opacity='0.1'/%3E%3Ccircle cx='0' cy='60' r='1.5' fill='%237aaa40' fill-opacity='0.1'/%3E%3Ccircle cx='60' cy='60' r='1.5' fill='%237aaa40' fill-opacity='0.1'/%3E%3C/svg%3E") repeat center / 60px 60px, linear-gradient(160deg,#0b1510 0%,#0f1c13 100%);
  --s0:0 4px 20px rgba(0,0,0,.40);--s1:0 12px 40px rgba(0,0,0,.50);--s2:0 30px 70px rgba(0,0,0,.60);
  color-scheme:dark;
}
[data-theme="dark"] body{background:#111111;color:var(--text)}
[data-theme="dark"] .nav{background:rgba(17,17,17,.97)!important;border-color:rgba(255,255,255,.07)!important}
[data-theme="dark"] .nav.s{background:rgba(13,13,13,.99)!important;box-shadow:0 1px 0 rgba(255,255,255,.06)}
/* stats band: charcoal instead of bright green */
[data-theme="dark"] .sb{background:#1a1a1a;border-top:1px solid rgba(255,255,255,.06);border-bottom:1px solid rgba(255,255,255,.06)}
[data-theme="dark"] .sb-n{color:#88cc98}
[data-theme="dark"] .sb-l{color:rgba(220,216,204,.82)}
[data-theme="dark"] .sb-i{border-color:rgba(255,255,255,.07)}
/* marquee: very dark, not green */
[data-theme="dark"] .mq{background:#161616}
[data-theme="dark"] .mq-item{color:rgba(200,196,186,.55)}
/* sections */
[data-theme="dark"] .sec-alt,.tst-sec{background:#161616}
[data-theme="dark"] .blog-c,.tst-c,.c-card,.p-card,.card{background:#1e1e1e!important;border-color:rgba(255,255,255,.08)!important}
[data-theme="dark"] .blog-t,.tst-t{color:var(--dark)}
[data-theme="dark"] .blog-cat{background:rgba(106,170,122,.10);color:#6aaa7a}
/* nav elements */
[data-theme="dark"] .mob{background:#111111}
[data-theme="dark"] .mob-lnk{color:var(--dark);border-color:rgba(255,255,255,.08)}
[data-theme="dark"] .mob-top{border-color:rgba(255,255,255,.08)}
[data-theme="dark"] .logo-ico{background:#1e1e1e;box-shadow:inset 0 0 0 1px rgba(255,255,255,.1)}
[data-theme="dark"] .ib,[data-theme="dark"] .cart-btn{border-color:rgba(255,255,255,.14)!important;color:var(--dark)!important;background:transparent!important}
[data-theme="dark"] .ib:hover,[data-theme="dark"] .cart-btn:hover{background:#2a2a2a!important;border-color:rgba(255,255,255,.22)!important}
[data-theme="dark"] .lsw{background:#1e1e1e;border-color:rgba(255,255,255,.1)}
[data-theme="dark"] .lb{color:var(--muted)}
[data-theme="dark"] .lb.on{background:#2e2e2e;color:var(--dark)}
[data-theme="dark"] .nav-cta{background:#2a2a2a;color:var(--dark);border:1px solid rgba(255,255,255,.14)}
[data-theme="dark"] .nav-cta:hover{background:#383838}
[data-theme="dark"] .tsw{background:#1e1e1e;border-color:rgba(255,255,255,.1)}
[data-theme="dark"] .tb{color:var(--muted)}
[data-theme="dark"] .ta{background:#2e2e2e!important;color:var(--dark)!important}
/* search */
[data-theme="dark"] .sr-box{background:#1e1e1e;border:1px solid rgba(255,255,255,.1)}
[data-theme="dark"] .sr-row{border-color:rgba(255,255,255,.08)}
[data-theme="dark"] .sr-input{color:var(--dark);background:transparent}
/* buttons */
[data-theme="dark"] .btn{background:var(--forest);color:#fff;border:none}
[data-theme="dark"] .btn:hover{background:var(--moss)}
[data-theme="dark"] .btn-o{color:rgba(90,190,110,.9);border-color:rgba(90,190,110,.35)}
[data-theme="dark"] .btn-o:hover{background:rgba(30,88,40,.3);color:rgba(100,210,120,1)}
/* hs (how it works) icons */
[data-theme="dark"] .hs-ico{background:#1e1e1e;border-color:rgba(255,255,255,.1);color:#6aaa7a}
/* catalog */
[data-theme="dark"] .ct{background:#1e1e1e;border-color:rgba(255,255,255,.1);color:var(--text)}
[data-theme="dark"] .ct:hover,.ct.on{background:#2e2e2e;color:var(--dark);border-color:rgba(255,255,255,.2)}
/* page-header cream — light bg stays light in dark mode, force dark text */
[data-theme="dark"] .ph-cream{color:#111111}
[data-theme="dark"] .ph-cream .ph-h1{color:#111111}
[data-theme="dark"] .ph-cream .ph-h1 em{color:var(--forest)}
[data-theme="dark"] .ph-cream .sub{color:#444444}
/* hero — light bg stays light in dark mode, force dark text */
[data-theme="dark"] .hero{background:linear-gradient(148deg,#d8e6d0 0%,#eae5d8 50%,#cce0c5 100%)}
[data-theme="dark"] .hero-h1{color:#111111}
[data-theme="dark"] .hero-h1 em{color:#1e4020}
[data-theme="dark"] .hero-sub{color:#333333}
[data-theme="dark"] .stn{color:#1e4020}
[data-theme="dark"] .stl{color:#444444}
[data-theme="dark"] .hero-ey{color:#1e4020;background:rgba(30,64,32,.12);border-color:rgba(30,64,32,.28)}
[data-theme="dark"] .fc{background:#fff;color:#111}
[data-theme="dark"] .fc-v{color:#1e4020}
[data-theme="dark"] .fc-l{color:#555}
/* strip / services — dark bg in dark mode → white text */
[data-theme="dark"] .srv-tt{color:#f0ece2}
[data-theme="dark"] .srv-sb{color:rgba(220,215,200,.65)}
[data-theme="dark"] .srv-ico{color:#7aaa50}
/* chat: bot bubble is white bg → always black text */
[data-theme="dark"] .cb.bot{color:#111111}
[data-theme="dark"] .chat-msgs{background:#f0ede6}
[data-theme="dark"] .chat-inp{color:#111111}
[data-theme="dark"] .chat-inp::placeholder{color:#888}
/* ── Profile drawer dark mode ── */
[data-theme="dark"] .prof-dr{background:#141414}
[data-theme="dark"] .prof-tabs{background:#1c1c1c;border-bottom-color:rgba(255,255,255,.1)}
[data-theme="dark"] .prof-tab{color:rgba(255,255,255,.38)}
[data-theme="dark"] .prof-tab:hover{color:rgba(255,255,255,.75)}
[data-theme="dark"] .prof-tab.on{color:#fff;border-bottom-color:var(--lime)}
[data-theme="dark"] .prof-body{background:#141414}
[data-theme="dark"] .prof-card{background:#1e1e1e!important;border-color:rgba(255,255,255,.07)!important}
[data-theme="dark"] .prof-addr-card{background:#1e1e1e!important;border-color:rgba(255,255,255,.07)!important}
[data-theme="dark"] .prof-stat{background:#1e1e1e!important;border-color:rgba(255,255,255,.07)!important}
[data-theme="dark"] .prof-order-total{color:#fff}
[data-theme="dark"] .prof-stat-n{color:#fff}
[data-theme="dark"] .prof-wish-price{color:#fff}
[data-theme="dark"] .prof-sect-title{color:rgba(255,255,255,.45)}
[data-theme="dark"] .prof-login-title{color:#fff}
[data-theme="dark"] .prof-order-id{color:rgba(255,255,255,.9)}
[data-theme="dark"] .prof-addr-main{color:rgba(255,255,255,.9)}

html{font-size:16px;scroll-behavior:smooth}
body{font-family:var(--sans);background:var(--white);color:var(--text);overflow-x:hidden;line-height:1.75;word-break:break-word;overflow-wrap:break-word}
img{display:block;max-width:100%;height:auto}
button,a{font-family:var(--sans)}
::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:var(--parchment)}::-webkit-scrollbar-thumb{background:var(--sage);border-radius:4px}

/* - PAGE TRANSITION - */
.page-wrap{animation:pgIn .45s var(--ease) both}
@keyframes pgIn{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}

/* - CURSOR - */
.cur-dot{width:8px;height:8px;background:var(--forest);border-radius:50%;position:fixed;z-index:99999;pointer-events:none;transform:translate(-50%,-50%);transition:width .25s,height .25s,background .2s}
.cur-ring{width:34px;height:34px;border:1.5px solid var(--sage);border-radius:50%;position:fixed;z-index:99998;pointer-events:none;transform:translate(-50%,-50%);transition:width .3s,height .3s,border-color .2s,opacity .2s}
.cur-dot.hov{width:14px;height:14px;background:var(--terracotta)}
.cur-ring.hov{width:52px;height:52px;border-color:var(--terracotta);opacity:.6}

/* - PRELOADER - */
.pl{position:fixed;inset:0;z-index:99999;background:var(--cream);display:flex;align-items:center;justify-content:center;transition:opacity .7s,visibility .7s}
.pl.out{opacity:0;visibility:hidden}
.pl-inner{text-align:center}
.pl-leaf{width:64px;height:64px;margin:0 auto 18px;animation:spinIn .9s var(--spring) both}
@keyframes spinIn{from{opacity:0;transform:scale(0) rotate(-90deg)}to{opacity:1;transform:scale(1) rotate(0)}}
.pl-brand{font-family:var(--serif);font-size:30px;font-weight:700;color:var(--forest);animation:fadeUp .6s .3s both}
.pl-bar{width:200px;height:2px;background:var(--border);border-radius:2px;overflow:hidden;margin:20px auto 0}
.pl-fill{height:100%;background:var(--forest);border-radius:2px;animation:plFill 1.4s ease-out forwards}
@keyframes plFill{from{width:0}to{width:100%}}

/* - MARQUEE - */
.mq{background:var(--forest);padding:11px 0;overflow:hidden;width:100%}
.mq-track{display:flex;width:max-content;animation:mq 36s linear infinite;will-change:transform}
.mq-track:hover{animation-play-state:paused}
@keyframes mq{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
.mq-item{display:flex;align-items:center;gap:12px;padding:0 28px;color:var(--lime);font-size:11px;font-weight:500;letter-spacing:1.8px;text-transform:uppercase;white-space:nowrap;flex-shrink:0}
.mq-dot{width:4px;height:4px;background:var(--terracotta);border-radius:50%;flex-shrink:0}
@keyframes pulse-dot{0%{box-shadow:0 0 0 0 rgba(40,200,64,0.7)}70%{box-shadow:0 0 0 6px rgba(40,200,64,0)}100%{box-shadow:0 0 0 0 rgba(40,200,64,0)}}

/* - NAVBAR - */
.nav{position:fixed;top:0;inset-inline:0;z-index:1000;height:var(--nav-h);background:rgba(244,239,228,.95);backdrop-filter:blur(18px);border-bottom:1px solid var(--border);transition:box-shadow .3s,background .3s}
.nav.s{box-shadow:var(--s0);background:rgba(244,239,228,.98)}
.nav-in{max-width:1380px;margin:0 auto;height:100%;display:flex;align-items:center;justify-content:space-between;padding:0 36px;gap:0}
.logo{display:flex;align-items:center;gap:10px;color:var(--dark);font-weight:500;font-size:17px;background:none;border:none;cursor:pointer;flex-shrink:0;transition:opacity .2s}
.logo-text{font-family:var(--serif);font-size:22px;font-weight:700;letter-spacing:.01em;color:var(--dark)}
.logo:hover{opacity:.8}
.logo-ico{width:36px;height:36px;background:var(--dark);border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:transform .3s var(--spring)}
.logo:hover .logo-ico{transform:rotate(-8deg) scale(1.08)}
.nav-links{flex:1;display:flex;align-items:center;justify-content:center;gap:20px;min-width:0;padding-bottom:3px}
.nl{font-size:13px;color:var(--text);font-weight:400;cursor:pointer;position:relative;background:none;border:none;padding:0;transition:color .3s cubic-bezier(.4,0,.2,1);white-space:nowrap}
.nl::after{content:'';position:absolute;bottom:-3px;left:0;right:0;height:1.5px;background:var(--dark);transform:scaleX(0);transition:transform .35s cubic-bezier(.4,0,.2,1);transform-origin:left}
.nl:hover::after,.nl.on::after{transform:scaleX(1)}
.nl.on{font-weight:500}
.nav-r{display:flex;align-items:center;gap:6px;flex-shrink:0}
.tsw{display:flex;flex-direction:row;flex-wrap:nowrap;gap:2px;background:var(--cream);border-radius:100px;padding:3px;border:1px solid var(--border);flex-shrink:0}
.tb{display:flex;align-items:center;gap:5px;padding:5px 10px;border-radius:100px;border:none;background:transparent;font-family:var(--sans);font-size:11px;font-weight:600;color:var(--muted);cursor:pointer;transition:all .25s cubic-bezier(.4,0,.2,1);white-space:nowrap;flex-shrink:0}
.tb:hover{color:var(--dark)}
.ta{background:var(--dark)!important;color:#fff!important}
[data-theme="dark"] .tsw{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.15)}
[data-theme="dark"] .tb{color:rgba(255,255,255,.55)}
[data-theme="dark"] .tb:hover{color:#fff}
[data-theme="dark"] .ta{background:rgba(255,255,255,.18)!important;color:#fff!important}
.blink{width:6px;height:6px;border-radius:50%;background:#4ade80;animation:blink 2s infinite;flex-shrink:0}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
.lsw{display:flex;flex-direction:row;flex-wrap:nowrap;gap:2px;background:var(--cream);border-radius:100px;padding:3px;border:1px solid var(--border);flex-shrink:0}
.lb{padding:5px 10px;border-radius:100px;border:none;background:transparent;font-family:var(--sans);font-size:11px;font-weight:600;color:var(--muted);cursor:pointer;transition:all .25s cubic-bezier(.4,0,.2,1);white-space:nowrap;flex-shrink:0}
.lb.on{background:var(--dark);color:#fff}
.ib{width:36px;height:36px;border-radius:50%;border:1.5px solid var(--border);background:transparent;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--dark);transition:all .3s cubic-bezier(.4,0,.2,1);flex-shrink:0;will-change:transform}
.ib:hover{background:var(--dark);color:#fff;border-color:var(--dark);transform:scale(1.08)}
.cart-btn{position:relative;width:36px;height:36px;border-radius:50%;border:1.5px solid var(--border);background:transparent;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--dark);transition:all .3s cubic-bezier(.4,0,.2,1);flex-shrink:0;will-change:transform}
.cart-btn:hover{background:var(--dark);color:#fff;border-color:var(--dark)}
.cbadge{position:absolute;top:-5px;right:-5px;background:#e05c2a;color:#fff;border-radius:50%;width:18px;height:18px;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;border:2px solid var(--white);animation:pop .25s var(--spring)}
@keyframes pop{from{transform:scale(0)}to{transform:scale(1)}}
.nav-cta{background:var(--dark);color:#fff;padding:9px 18px;border-radius:100px;font-size:13px;font-weight:500;cursor:pointer;transition:background .3s cubic-bezier(.4,0,.2,1),transform .3s cubic-bezier(.4,0,.2,1),box-shadow .3s cubic-bezier(.4,0,.2,1);border:none;white-space:nowrap;will-change:transform}
.nav-cta:hover{background:var(--moss);transform:translateY(-2px);box-shadow:var(--s0)}
.hbg{display:none;flex-direction:column;gap:5px;cursor:pointer;padding:6px;background:none;border:none;flex-shrink:0}
.hbg span{display:block;width:22px;height:2px;background:var(--dark);border-radius:2px;transition:all .35s cubic-bezier(.4,0,.2,1)}
.h1o{transform:translateY(7px) rotate(45deg)}
.h2o{opacity:0}
.h3o{transform:translateY(-7px) rotate(-45deg)}

/* - MOBILE MENU - */
.mob{position:fixed;top:var(--nav-h);inset-inline:0;bottom:0;background:var(--white);z-index:999;padding:28px 24px;flex-direction:column;gap:6px;overflow-y:auto;transform:translateX(-100%);transition:transform .35s var(--ease),visibility .35s;display:flex;visibility:hidden}
.mob.open{transform:translateX(0);visibility:visible}
.mob-top{display:flex;align-items:center;justify-content:space-between;padding-bottom:18px;border-bottom:1px solid var(--border);margin-bottom:6px}
.mob-lnk{font-size:28px;font-family:var(--serif);color:var(--dark);font-weight:500;padding:10px 0;border-bottom:1px solid var(--border);background:none;border-top:none;border-left:none;border-right:none;text-align:left;width:100%;cursor:pointer;transition:color .3s cubic-bezier(.4,0,.2,1),padding-left .3s cubic-bezier(.4,0,.2,1);display:flex;justify-content:space-between;align-items:center}
.mob-lnk:hover{color:var(--moss);padding-left:8px}
.mob-lnk span{font-size:14px;opacity:.4}
.mob-pill{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--moss);font-weight:500;padding:14px 0 6px}
.mob-cta{margin-top:14px;background:var(--dark);color:#fff;text-align:center;padding:14px;border-radius:100px;font-size:15px;font-weight:500;cursor:pointer;border:none;width:100%;transition:background .3s cubic-bezier(.4,0,.2,1)}
.mob-cta:hover{background:var(--moss)}

/* - SEARCH - */
.sr-ov{position:fixed;inset:0;z-index:1099;background:rgba(0,0,0,0);pointer-events:none;transition:background .3s}
.sr-ov.on{background:rgba(0,0,0,.45);pointer-events:all}
.sr-box{position:fixed;top:80px;left:50%;transform:translateX(-50%) translateY(-24px) scale(.97);z-index:1100;width:min(620px,96vw);background:var(--white);border-radius:22px;box-shadow:var(--s2);opacity:0;pointer-events:none;transition:opacity .3s,transform .3s}
.sr-box.on{opacity:1;transform:translateX(-50%) translateY(0) scale(1);pointer-events:all}
.sr-row{display:flex;align-items:center;gap:12px;padding:16px 20px;border-bottom:1px solid var(--border)}
.sr-input{flex:1;border:none;outline:none;font-family:var(--sans);font-size:16px;color:var(--dark);background:transparent}
.sr-input::placeholder{color:var(--muted)}
.sr-esc{font-size:11px;color:var(--muted);background:var(--parchment);border:none;border-radius:6px;padding:4px 8px;cursor:pointer}
.sr-list{max-height:380px;overflow-y:auto;padding:8px}
.sr-no{text-align:center;padding:36px;color:var(--muted);font-size:14px}
.sr-hint{font-size:11px;text-align:center;color:var(--muted);padding:10px;letter-spacing:.5px}
.sr-meta{font-size:11px;color:var(--muted);padding:8px 12px;font-weight:500;text-transform:uppercase;letter-spacing:1px}
.sr-itm{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:12px;cursor:pointer;transition:background .15s;background:none;border:none;width:100%;text-align:left}
.sr-itm:hover{background:var(--cream)}
.sr-img{width:52px;height:52px;border-radius:10px;object-fit:cover;flex-shrink:0;transition:transform .2s}
.sr-itm:hover .sr-img{transform:scale(1.05)}
.sr-nm{font-size:14px;font-weight:600;color:var(--dark)}
.sr-or{font-size:11px;color:var(--muted);margin-top:2px}
.sr-pr{font-family:var(--serif);font-size:16px;font-weight:600;color:var(--forest);margin-left:auto;white-space:nowrap}

/* - CART DRAWER - */
.dr-ov{position:fixed;inset:0;z-index:1099;background:rgba(0,0,0,0);pointer-events:none;transition:background .3s}
.dr-ov.on{background:rgba(0,0,0,.38);pointer-events:all}
.dr{position:fixed;top:0;right:0;bottom:0;z-index:1100;width:440px;max-width:100vw;background:var(--white);box-shadow:-8px 0 40px rgba(0,0,0,.15);display:flex;flex-direction:column;transform:translateX(100%);transition:transform .38s var(--ease)}
.dr.on{transform:translateX(0)}
.dr-head{display:flex;align-items:center;justify-content:space-between;padding:20px 24px 16px;border-bottom:1px solid var(--border)}
.dr-ttl{font-family:var(--serif);font-size:24px;font-weight:600;color:var(--dark);display:flex;align-items:center;gap:10px}
.dr-cnt{background:var(--dark);color:#fff;border-radius:100px;padding:2px 10px;font-size:13px;font-family:var(--sans);font-weight:600;animation:pop .2s var(--spring)}
.dr-x{background:none;border:none;cursor:pointer;color:var(--muted);font-size:18px;transition:color .2s,transform .2s;padding:4px;line-height:1}
.dr-x:hover{color:var(--dark);transform:rotate(90deg)}
.dr-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;text-align:center;padding:36px}
.dr-empty-ico{font-size:60px;opacity:.25;animation:float 4s ease-in-out infinite}
.dr-empty-t{font-family:var(--serif);font-size:22px;color:var(--dark)}
.dr-empty-s{font-size:13px;color:var(--muted)}
.dr-items{flex:1;overflow-y:auto;padding:14px 22px;display:flex;flex-direction:column;gap:12px}
.ci{display:flex;gap:12px;align-items:flex-start;background:var(--cream);border-radius:14px;padding:12px;border:1px solid var(--border);animation:slideRight .3s var(--ease) both;transition:transform .2s}
.ci:hover{transform:translateX(-4px)}
@keyframes slideRight{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
.ci-img{width:62px;height:62px;border-radius:10px;object-fit:cover;flex-shrink:0}
.ci-info{flex:1;min-width:0}
.ci-nm{font-weight:600;font-size:13px;color:var(--dark);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ci-pr{font-size:12px;color:var(--muted);margin-top:1px}
.ci-ctrl{display:flex;align-items:center;gap:6px;margin-top:8px}
.cq{width:26px;height:26px;border-radius:50%;border:1.5px solid var(--border);background:transparent;font-size:15px;cursor:pointer;color:var(--dark);display:flex;align-items:center;justify-content:center;transition:all .2s;line-height:1}
.cq:hover{background:var(--dark);color:#fff;border-color:var(--dark)}
.cn{font-weight:700;font-size:14px;min-width:18px;text-align:center}
.cr{background:none;border:none;cursor:pointer;color:#ccc;transition:color .2s;padding:3px;display:flex;margin-left:4px}
.cr:hover{color:#e05c2a}
.ci-tot{font-family:var(--serif);font-size:17px;font-weight:600;color:var(--dark);flex-shrink:0}
.dr-foot{border-top:1px solid var(--border);padding:18px 22px;background:var(--white)}
.dr-tot-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}
.dr-tot-l{font-size:14px;color:var(--muted)}
.dr-tot-v{font-family:var(--serif);font-size:28px;font-weight:700;color:var(--dark)}
.dr-btn{width:100%;justify-content:center;font-size:15px;padding:14px}

/* - BUTTONS - */
.btn{display:inline-flex;align-items:center;gap:8px;background:var(--forest);color:var(--cream);border:none;padding:14px 30px;border-radius:50px;font-size:15px;font-weight:500;cursor:pointer;transition:all .3s var(--ease);font-family:var(--sans);white-space:nowrap;text-decoration:none}
.btn:hover{background:var(--moss);transform:translateY(-3px);box-shadow:var(--s1)}
.btn:active{transform:translateY(-1px)}
.btn-o{background:transparent;color:var(--forest);border:1.5px solid var(--forest);padding:13px 28px;border-radius:50px;font-size:15px;font-weight:500;cursor:pointer;transition:all .3s var(--ease);font-family:var(--sans);display:inline-flex;align-items:center;gap:8px}
.btn-o:hover{background:var(--forest);color:var(--cream);transform:translateY(-3px)}
.btn-w{background:#fff;color:var(--forest);padding:14px 30px;border-radius:50px;font-size:15px;font-weight:500;cursor:pointer;border:none;transition:all .3s var(--ease);white-space:nowrap}
.btn-w:hover{background:var(--lime);transform:translateY(-3px)}
.btn-ow{background:transparent;color:#fff;border:1.5px solid rgba(255,255,255,.5);padding:13px 28px;border-radius:50px;font-size:15px;font-weight:500;cursor:pointer;transition:all .3s;font-family:var(--sans)}
.btn-ow:hover{background:rgba(255,255,255,.12);border-color:#fff;transform:translateY(-2px)}

/* - LAYOUT - */
.section{padding:100px 0}
.wrap{max-width:1380px;margin:0 auto;padding:0 36px}
.ey{display:inline-block;font-size:11px;font-weight:600;letter-spacing:2.5px;text-transform:uppercase;color:var(--moss);margin-bottom:10px}
.h2{font-family:var(--serif);font-size:clamp(36px,4vw,58px);font-weight:700;line-height:1.05;color:var(--dark);margin-bottom:14px}
.h2 em{font-style:italic;color:var(--moss)}
.sub{font-size:16px;color:var(--muted);line-height:1.8;max-width:520px}

/* - HERO - */
.hero{min-height:100vh;background:linear-gradient(148deg,#e0ead8 0%,#f4efe4 50%,#d6eacf 100%);display:flex;align-items:center;padding:calc(var(--nav-h)+56px) 0 72px;position:relative;overflow:hidden}
.hero::before{content:'';position:absolute;inset:0;background:url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%233a6b3b' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");opacity:1;pointer-events:none}
.hero-in{max-width:1380px;margin:0 auto;display:flex;align-items:center;gap:60px;padding:0 36px;width:100%}
.hero-ct{flex:1;max-width:580px}
.hero-ey{display:inline-flex;align-items:center;gap:8px;background:rgba(122,158,122,.13);border:1px solid rgba(122,158,122,.26);padding:6px 18px;border-radius:50px;font-size:12px;font-weight:600;color:var(--moss);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:28px;animation:fadeUp .7s .1s both}
.hero-h1{font-family:var(--serif);font-size:clamp(50px,6.5vw,92px);font-weight:700;line-height:.93;color:var(--dark);margin-bottom:22px;animation:fadeUp .7s .2s both}
.hero-h1 em{font-style:italic;color:var(--moss)}
.hero-sub{font-size:16px;line-height:1.85;color:var(--muted);max-width:460px;margin-bottom:38px;animation:fadeUp .7s .3s both}
.hero-btns{display:flex;gap:14px;flex-wrap:wrap;animation:fadeUp .7s .4s both}
.hero-stats{display:flex;gap:36px;margin-top:52px;flex-wrap:wrap;animation:fadeUp .7s .5s both}
.stn{font-family:var(--serif);font-size:36px;font-weight:700;color:var(--forest);line-height:1}
.stl{font-size:12px;color:var(--muted);margin-top:4px}
.h-img-wrap{position:relative;width:clamp(280px,36vw,480px)}
.h-hero-img{width:100%;height:auto;display:block;border-radius:36px}
.hero-vis{flex:1;display:flex;justify-content:center;align-items:center;position:relative;padding:20px 56px 20px 56px;animation:fadeUp .7s .3s both}
.fc{position:absolute;background:var(--white);border-radius:18px;padding:10px 16px;box-shadow:0 8px 32px rgba(30,61,31,.16);display:flex;align-items:center;gap:10px;font-size:12px;font-weight:500;white-space:nowrap}
.fc1{top:10%;right:-28px;animation:blobFloat 5s 1s ease-in-out infinite}
.fc2{bottom:10%;left:-28px;animation:blobFloat 4.5s .5s ease-in-out infinite}
.fc-ico{width:32px;height:32px;border-radius:10px;background:linear-gradient(135deg,#e8f5e9,#c8e6c9);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;transition:transform .3s var(--spring)}
.fc-l{font-size:10px;color:var(--muted);line-height:1.3}
.fc-v{color:var(--forest);font-weight:700;font-size:13px;line-height:1.3}

/* - SERVICES STRIP - */
.strip{border-block:1px solid var(--border);padding:54px 0;background:var(--white)}
.srv-g{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.srv-i{display:flex;gap:14px;align-items:flex-start;padding:20px;border-radius:var(--radius);transition:background .3s,transform .3s}
.srv-i:hover{background:var(--cream);transform:translateY(-3px)}
.srv-ico{width:32px;height:32px;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:var(--forest);transition:transform .35s var(--spring)}
.srv-i:hover .srv-ico{transform:scale(1.25) rotate(-6deg)}
.srv-tt{font-size:14px;font-weight:600;color:var(--dark);margin-bottom:3px}
.srv-sb{font-size:12px;color:var(--muted);line-height:1.6}

/* - PRODUCTS - */
.pr-sec{background:var(--white)}
.pr-hd{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:40px;flex-wrap:wrap;gap:18px}
.cat-tabs{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:26px}
.ct{padding:8px 18px;border-radius:50px;font-size:13px;font-weight:500;border:1.5px solid var(--border);background:transparent;color:var(--muted);cursor:pointer;transition:all .22s;font-family:var(--sans)}
.ct:hover,.ct.on{background:var(--forest);color:#fff;border-color:var(--forest)}
.val{font-size:13px;color:var(--moss);font-weight:500;cursor:pointer;background:none;border:none;transition:color .2s}
.val:hover{color:var(--forest)}
.pgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:22px}
.pc{background:var(--white);border-radius:20px;overflow:hidden;border:1px solid var(--border);display:flex;flex-direction:column;transition:transform .4s var(--ease),box-shadow .4s;animation:fadeUp .5s ease both}
.pc:hover{transform:translateY(-10px);box-shadow:var(--s2)}
.pc-img{aspect-ratio:4/3;position:relative;overflow:hidden;background:#f0ece3}
.pc-img img{width:100%;height:100%;object-fit:cover;transition:transform .5s ease}
.pc:hover .pc-img img{transform:scale(1.08)}
.badge{position:absolute;top:11px;left:11px;padding:4px 10px;border-radius:100px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#fff;backdrop-filter:blur(4px)}
.bh{background:rgba(196,122,58,.9)}.bf{background:rgba(74,124,89,.9)}.bt{background:rgba(122,74,156,.9)}.bn{background:rgba(196,92,38,.9)}
.vb{position:absolute;bottom:9px;right:9px;display:flex;align-items:center;gap:5px;background:rgba(0,0,0,.55);color:#fff;border-radius:100px;padding:4px 9px;font-size:10px;backdrop-filter:blur(6px)}
.pc-inf{padding:13px 15px 15px;display:flex;flex-direction:column;flex:1}
.pc-nm{font-size:14px;font-weight:600;color:var(--dark);line-height:1.3;margin-bottom:2px}
.pc-or{font-size:11px;color:var(--muted);margin-bottom:6px}
.pc-stars{color:var(--gold);font-size:11px;letter-spacing:1px;margin-bottom:8px}
.pc-ft{display:flex;align-items:center;justify-content:space-between;gap:7px;margin-top:auto}
.pc-pr{font-family:var(--serif);font-size:19px;font-weight:600;color:var(--dark);white-space:nowrap}
.pc-un{font-size:11px;color:var(--muted);margin-left:2px}
.add-btn{background:transparent;border:1.5px solid var(--border);color:var(--dark);padding:6px 12px;border-radius:100px;font-size:12px;font-weight:500;cursor:pointer;transition:all .2s;font-family:var(--sans);display:flex;align-items:center;gap:4px}
.add-btn:hover{background:var(--dark);color:#fff;border-color:var(--dark);transform:scale(1.05)}
.add-btn.ok{background:#4ade80;color:#fff;border-color:#4ade80;animation:pop .25s var(--spring)}
.qc{display:flex;align-items:center;gap:5px;background:var(--dark);border-radius:100px;padding:3px 6px}
.qb{width:24px;height:24px;border-radius:50%;border:none;background:rgba(255,255,255,.14);color:#fff;font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .15s;line-height:1}
.qb:hover{background:rgba(255,255,255,.3)}
.qn{font-size:13px;font-weight:700;color:#fff;min-width:17px;text-align:center}
.qi{width:38px;background:transparent;border:none;outline:none;color:#fff;font-size:13px;font-weight:700;text-align:center;font-family:var(--sans);-moz-appearance:textfield;padding:0}
.qi::-webkit-outer-spin-button,.qi::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
.qi-unit{font-size:10px;color:rgba(255,255,255,.5);font-family:var(--sans);white-space:nowrap;margin-left:-2px}

/* - HOW WE WORK - */
.how-sec{background:var(--cream)}
.how-steps{display:flex;gap:0;margin-top:56px;position:relative}
.how-steps::before{content:'';position:absolute;top:36px;left:calc(10% + 36px);right:calc(10% + 36px);height:1.5px;background:linear-gradient(90deg,var(--border),var(--sage),var(--border))}
.hs{flex:1;display:flex;flex-direction:column;align-items:center;text-align:center;padding:0 12px;animation:fadeUp .6s ease both}
.hs-ico{width:72px;height:72px;border-radius:50%;background:var(--white);border:2px solid var(--border);display:flex;align-items:center;justify-content:center;color:var(--forest);margin-bottom:18px;position:relative;z-index:1;transition:transform .35s var(--spring),border-color .3s,box-shadow .3s}
.hs:hover .hs-ico{transform:scale(1.15) translateY(-5px);border-color:var(--sage);box-shadow:var(--s0)}
.hs-t{font-size:15px;font-weight:600;color:var(--dark);margin-bottom:6px}
.hs-d{font-size:12px;color:var(--muted);line-height:1.6;max-width:140px}

/* - BENTO - */
.bento-sec{background:var(--parchment)}
.bento-g{display:grid;grid-template-columns:repeat(12,1fr);gap:16px;margin-top:52px}
.bc{border-radius:24px;overflow:hidden;position:relative;cursor:pointer;transition:transform .4s var(--ease),box-shadow .4s}
.bc:hover{transform:scale(1.025);box-shadow:var(--s2)}
.bc1{grid-column:span 5;grid-row:span 2;min-height:460px}
.bc2{grid-column:span 4;min-height:220px}
.bc3{grid-column:span 3;min-height:220px}
.bc4{grid-column:span 4;min-height:220px}
.bc5{grid-column:span 3;min-height:220px}
.bc-bg{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.25);transition:transform .5s var(--ease)}
.bc:hover .bc-bg{transform:scale(1.1) rotate(3deg)}
.bc-ov{position:absolute;inset:0;background:linear-gradient(to top,rgba(20,26,20,.8) 0%,transparent 55%)}
.bc-ct{position:absolute;bottom:0;left:0;right:0;padding:22px;color:#fff;transform:translateY(6px);transition:transform .4s var(--ease)}
.bc:hover .bc-ct{transform:translateY(0)}
.bc-tag{font-size:10px;font-weight:700;letter-spacing:1.8px;text-transform:uppercase;color:var(--lime);margin-bottom:4px}
.bc-ttl{font-family:var(--serif);font-size:22px;font-weight:700;line-height:1.1;white-space:pre-line}
.bc1 .bc-ttl{font-size:32px}
.bc-cta{display:inline-flex;align-items:center;gap:5px;margin-top:7px;font-size:12px;font-weight:500;color:var(--lime);opacity:0;transition:opacity .3s .1s;transform:translateX(-6px);transition:opacity .3s .1s,transform .3s .1s}
.bc:hover .bc-cta{opacity:1;transform:translateX(0)}
.bg1{background:linear-gradient(135deg,#2a5e2a,#4a8a4a)}
.bg2{background:linear-gradient(135deg,#8b2e12,#c06b3a)}
.bg3{background:linear-gradient(135deg,#5a2370,#9b59b6)}
.bg4{background:linear-gradient(135deg,#8b6a00,#c9922a)}
.bg5{background:linear-gradient(135deg,#3d0e2b,#8e2559)}

/* - ADV - */
.adv-g{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:52px}
.adv-c{padding:30px 26px;border-radius:20px;border:1px solid var(--border);background:var(--white);transition:transform .35s var(--ease),box-shadow .35s,border-color .3s;position:relative;overflow:hidden}
.adv-c::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(184,216,122,.0) 0%,rgba(184,216,122,.06) 100%);opacity:0;transition:opacity .3s}
.adv-c:hover{transform:translateY(-7px);box-shadow:var(--s1);border-color:var(--sage)}
.adv-c:hover::before{opacity:1}
.adv-ico{width:40px;height:40px;display:flex;align-items:center;justify-content:center;color:var(--forest);margin-bottom:14px;transition:transform .3s var(--spring)}
.adv-c:hover .adv-ico{transform:scale(1.2) rotate(-8deg)}
.adv-tt{font-family:var(--serif);font-size:21px;font-weight:700;margin-bottom:8px;color:var(--dark)}
.adv-tx{font-size:13px;color:var(--muted);line-height:1.75}

/* - STATS BAND - */
.sb{background:var(--forest);padding:56px 0}
.sb-g{display:grid;grid-template-columns:repeat(4,1fr);gap:0}
.sb-i{text-align:center;padding:20px 10px;border-right:1px solid rgba(255,255,255,.1);animation:countUp .6s ease both}
.sb-i:last-child{border-right:none}
.sb-n{font-family:var(--serif);font-size:52px;font-weight:700;color:var(--lime);line-height:1}
.sb-l{font-size:13px;color:rgba(255,255,255,.6);margin-top:6px}
@keyframes countUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}

/* - BLOG - */
.blog-g{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:52px}
.blog-c{border-radius:20px;overflow:hidden;background:var(--white);border:1px solid var(--border);transition:transform .35s var(--ease),box-shadow .35s;cursor:pointer}
.blog-c:hover{transform:translateY(-8px);box-shadow:var(--s1)}
.blog-img{height:180px;display:flex;align-items:center;justify-content:center;font-size:72px;transition:transform .4s var(--ease)}
.blog-c:hover .blog-img{transform:scale(1.06)}
.blog-bod{padding:20px 22px 22px}
.blog-cat{display:inline-block;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--moss);background:rgba(122,158,122,.12);border-radius:100px;padding:3px 10px;margin-bottom:10px}
.blog-t{font-family:var(--serif);font-size:19px;font-weight:700;color:var(--dark);line-height:1.2;margin-bottom:8px}
.blog-meta{font-size:11px;color:var(--muted);display:flex;gap:10px;align-items:center}
.blog-rd{margin-left:auto;font-size:12px;font-weight:500;color:var(--moss);cursor:pointer;border:none;background:none;transition:color .2s,transform .2s;white-space:nowrap}
.blog-rd:hover{color:var(--forest);transform:translateX(3px)}

/* - TESTIMONIALS - */
.tst-sec{background:var(--cream)}
.tst-g{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:52px}
.tst-c{background:var(--white);border-radius:22px;padding:28px;border:1px solid var(--border);transition:transform .35s var(--ease),box-shadow .35s;position:relative;overflow:hidden}
.tst-c::after{content:'?';position:absolute;top:-10px;right:16px;font-size:120px;color:rgba(184,216,122,.15);font-family:var(--serif);line-height:1;pointer-events:none}
.tst-c:hover{transform:translateY(-8px);box-shadow:var(--s1)}
.tst-stars{color:var(--gold);font-size:14px;letter-spacing:2px;margin-bottom:12px}
.tst-tx{font-size:14px;line-height:1.8;color:var(--muted);font-style:italic;margin-bottom:20px}
.tst-au{display:flex;align-items:center;gap:12px}
.tst-av{width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,var(--sage),var(--forest));display:flex;align-items:center;justify-content:center;color:#fff}
.tst-nm{font-weight:600;font-size:14px}
.tst-ro{font-size:11px;color:var(--muted)}

/* - TRUST CTA - */
.trust-sec{background:linear-gradient(135deg,var(--forest),var(--moss));padding:80px 0;text-align:center;position:relative;overflow:hidden}
.trust-sec::before{content:'';position:absolute;inset:0;background:url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.04' fill-rule='evenodd'%3E%3Ccircle cx='40' cy='40' r='36'/%3E%3C/g%3E%3C/svg%3E");pointer-events:none}
.trust-h{font-family:var(--serif);font-size:clamp(32px,4vw,54px);font-weight:700;color:#fff;margin-bottom:14px;animation:fadeUp .6s both}
.trust-s{font-size:16px;color:rgba(255,255,255,.75);margin-bottom:36px;animation:fadeUp .6s .1s both}
.trust-bt{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;animation:fadeUp .6s .2s both}

/* - FOOTER - */
.foot{background:var(--foot-bg);color:rgba(255,255,255,.7);padding:80px 0 0}
.foot-g{display:grid;grid-template-columns:1.5fr 1fr 1fr 1.3fr;gap:48px;margin-bottom:56px}
.foot-logo{display:flex;align-items:center;gap:10px;color:var(--lime);font-family:var(--serif);font-weight:700;font-size:20px;margin-bottom:14px;cursor:pointer;background:none;border:none;transition:opacity .2s}
.foot-logo:hover{opacity:.8}
.foot-li{width:34px;height:34px;background:rgba(255,255,255,.1);border-radius:8px;display:flex;align-items:center;justify-content:center}
.foot-desc{font-size:13px;line-height:1.85;color:rgba(255,255,255,.45);max-width:240px}
.soc{display:flex;gap:9px;margin-top:20px}
.sb-ico{width:36px;height:36px;border-radius:50%;border:1px solid rgba(255,255,255,.14);background:transparent;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.6);transition:all .25s;cursor:pointer}
.sb-ico:hover{background:var(--moss);border-color:var(--moss);transform:translateY(-3px) scale(1.1)}
.foot-h{font-size:14px;font-weight:600;color:#fff;margin-bottom:16px}
.fl{display:block;font-size:13px;padding:4px 0;color:rgba(255,255,255,.45);cursor:pointer;transition:color .2s,transform .2s;background:none;border:none;text-align:left;font-family:var(--sans)}
.fl:hover{color:var(--lime);transform:translateX(5px)}
.nl-sub{display:flex;margin-top:12px}
.nl-in{flex:1;padding:10px 14px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:10px 0 0 10px;color:#fff;font-family:var(--sans);font-size:13px;outline:none}
.nl-in::placeholder{color:rgba(255,255,255,.3)}
.nl-btn{padding:10px 16px;background:var(--moss);color:#fff;border:none;border-radius:0 10px 10px 0;font-size:15px;cursor:pointer;transition:background .2s}
.nl-btn:hover{background:var(--sage)}
.foot-bot{border-top:1px solid rgba(255,255,255,.08);padding:20px 0;display:flex;justify-content:space-between;align-items:center;font-size:12px;color:rgba(255,255,255,.28);flex-wrap:wrap;gap:10px}
.foot-bot button{background:none;border:none;color:rgba(255,255,255,.35);cursor:pointer;font-size:12px;font-family:var(--sans);transition:color .2s}
.foot-bot button:hover{color:var(--lime)}

/* - SCROLL TOP - */
/* - FAB STACK (scroll-top + chat, fixed bottom-right) - */
.fab-stack{position:fixed;bottom:24px;right:24px;z-index:600;display:flex;flex-direction:column;align-items:center;gap:10px}
.stt{position:relative;width:46px;height:46px;border-radius:50%;background:var(--forest);color:var(--lime);border:none;cursor:pointer;box-shadow:0 4px 18px rgba(30,61,31,.30),0 0 0 2.5px rgba(255,255,255,.75);opacity:0;pointer-events:none;transform:scale(.65);transition:opacity .3s,transform .3s;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.stt.v{opacity:1;pointer-events:all;transform:scale(1)}
.stt:hover{background:var(--moss);transform:scale(1.07)}

/* - CHAT - */
.chat-fab{position:relative;width:54px;height:54px;border-radius:50%;background:var(--forest);color:#fff;border:none;cursor:pointer;box-shadow:0 6px 22px rgba(30,61,31,.4),0 0 0 2.5px rgba(255,255,255,.9),0 0 0 5px rgba(30,61,31,.15);display:flex;align-items:center;justify-content:center;font-size:21px;transition:all .3s var(--spring);flex-shrink:0}
.chat-fab:hover{background:var(--moss);transform:scale(1.08);box-shadow:0 10px 32px rgba(30,61,31,.5),0 0 0 2.5px rgba(255,255,255,.95),0 0 0 6px rgba(30,61,31,.25)}
.chat-dot{position:absolute;top:-2px;right:-2px;width:14px;height:14px;background:#e05c2a;border-radius:50%;border:2px solid var(--white);animation:pop .3s var(--spring)}
.chat-win{position:absolute;bottom:68px;right:0;z-index:600;width:340px;max-height:520px;background:#fff;border-radius:22px;box-shadow:var(--s2);display:flex;flex-direction:column;overflow:hidden;animation:slideUp .3s var(--ease)}
@keyframes slideUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
.chat-hd{background:var(--forest);padding:14px 16px;display:flex;align-items:center;gap:11px}
.chat-av{width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;font-size:19px}
.chat-nm{font-weight:600;color:#fff;font-size:14px}
.chat-st{font-size:11px;color:rgba(255,255,255,.65)}
.chat-cx{margin-left:auto;background:none;border:none;cursor:pointer;color:rgba(255,255,255,.65);font-size:18px;line-height:1;transition:color .2s,transform .2s}
.chat-cx:hover{color:#fff;transform:rotate(90deg)}
.chat-msgs{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:9px;background:#f8f6f0}
.cb{max-width:82%;padding:9px 13px;border-radius:14px;font-size:13px;line-height:1.55}
.cb.bot{background:#fff;color:var(--text);border-radius:4px 14px 14px 14px;box-shadow:0 1px 4px rgba(0,0,0,.07);align-self:flex-start;animation:slideRight .25s var(--ease)}
.cb.usr{background:var(--forest);color:#fff;border-radius:14px 4px 14px 14px;align-self:flex-end;animation:slideLeft .25s var(--ease)}
@keyframes slideLeft{from{opacity:0;transform:translateX(12px)}to{opacity:1;transform:translateX(0)}}
.chat-qw{padding:7px 11px;display:flex;gap:5px;flex-wrap:wrap;border-top:1px solid var(--border);background:#fff}
.cqb{padding:5px 11px;border-radius:100px;background:rgba(74,124,89,.1);border:1px solid rgba(74,124,89,.2);color:var(--moss);font-size:11px;font-weight:500;cursor:pointer;transition:all .2s;font-family:var(--sans)}
.cqb:hover{background:var(--forest);color:#fff;border-color:var(--forest)}
.chat-inp-row{display:flex;border-top:1px solid var(--border);background:#fff}
.chat-inp{flex:1;padding:11px 14px;border:none;outline:none;font-family:var(--sans);font-size:13px;background:transparent;color:var(--dark)}
.chat-snd{padding:10px 14px;background:var(--forest);border:none;color:#fff;cursor:pointer;font-size:16px;transition:background .2s}
.chat-snd:hover{background:var(--moss)}
.td{display:flex;gap:4px;align-items:center;padding:6px 0}
.td span{width:6px;height:6px;border-radius:50%;background:var(--muted);animation:td 1.2s infinite}
.td span:nth-child(2){animation-delay:.2s}
.td span:nth-child(3){animation-delay:.4s}
@keyframes td{0%,100%{opacity:.3;transform:scale(1)}50%{opacity:1;transform:scale(1.3)}}

/* - PAGES: PAGE HEADER - */
.ph-forest{
  background:
    linear-gradient(135deg,rgba(20,50,22,.88) 0%,rgba(34,74,36,.82) 100%),
    url('https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?w=1600&q=75&fit=crop') center/cover no-repeat;
  padding:clamp(52px,8vw,80px) 0;color:#fff
}
.ph-cream{background:linear-gradient(150deg,#e0ead8,#f4efe4,#d6eacf);padding:clamp(52px,8vw,80px) 0}
.ph-h1{font-family:var(--serif);font-size:clamp(38px,5vw,68px);font-weight:700;color:inherit;line-height:1.05;margin-bottom:12px}
.ph-h1 em{font-style:italic}

/* - DELIVERY PAGE - */
.dz-table{width:100%;border-collapse:collapse;border-radius:16px;overflow:hidden;box-shadow:var(--s0);table-layout:fixed}
.dz-table th{background:var(--forest);color:#fff;padding:14px 18px;text-align:left;font-size:13px;font-weight:600;letter-spacing:.5px;word-break:break-word}
.dz-table td{padding:14px 18px;font-size:14px;border-bottom:1px solid var(--border);word-break:break-word}
.dz-table tr:last-child td{border-bottom:none}
.dz-table tr:nth-child(even) td{background:var(--cream)}
.dz-table tr:hover td{background:rgba(184,216,122,.1)}
.faq-item{border:1px solid var(--border);border-radius:14px;overflow:hidden;margin-bottom:10px;transition:box-shadow .2s}
.faq-item:hover{box-shadow:var(--s0)}
.faq-q{display:flex;justify-content:space-between;align-items:center;padding:18px 22px;cursor:pointer;font-weight:600;font-size:15px;background:var(--white);transition:background .2s}
.faq-q:hover{background:var(--cream)}
.faq-a{padding:0 22px 18px;font-size:14px;color:var(--muted);line-height:1.8;background:var(--white)}
.faq-ico{font-size:18px;transition:transform .3s var(--ease);color:var(--sage)}
.faq-ico.op{transform:rotate(45deg)}

/* - WHOLESALE TIERS - */
.tier-g{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:48px}
.tier{border:2px solid var(--border);border-radius:24px;padding:32px 28px;background:var(--white);transition:transform .35s var(--ease),box-shadow .35s,border-color .3s;position:relative}
.tier.best{border-color:var(--forest);transform:scale(1.03)}
.tier:hover{transform:scale(1.04);box-shadow:var(--s1)}
.tier.best:hover{transform:scale(1.05)}
.tier-badge{position:absolute;top:-13px;left:50%;transform:translateX(-50%);background:var(--forest);color:#fff;border-radius:100px;padding:4px 18px;font-size:11px;font-weight:700;letter-spacing:.5px;white-space:nowrap}
.tier-nm{font-family:var(--serif);font-size:28px;font-weight:700;color:var(--dark);margin-bottom:6px}
.tier-min{font-size:13px;color:var(--muted);margin-bottom:16px}
.tier-disc{font-family:var(--serif);font-size:48px;font-weight:700;color:var(--forest);line-height:1;margin-bottom:22px}
.tier-perk{display:flex;align-items:center;gap:9px;padding:7px 0;font-size:13px;border-bottom:1px solid var(--border)}
.tier-perk:last-child{border-bottom:none}
.tier-perk::before{content:'?';color:var(--moss);font-weight:700;flex-shrink:0}

/* - BLOG PAGE - */
.bp-g{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;margin-top:48px}
.bp-c{border-radius:22px;overflow:hidden;background:var(--white);border:1px solid var(--border);transition:transform .35s var(--ease),box-shadow .35s;cursor:pointer}
.bp-c:hover{transform:translateY(-8px);box-shadow:var(--s1)}
.bp-img{height:200px;display:flex;align-items:center;justify-content:center;font-size:80px;transition:transform .4s}
.bp-c:hover .bp-img{transform:scale(1.08)}
.bp-body{padding:22px}
.bp-cat-tag{font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--moss);background:rgba(122,158,122,.12);border-radius:100px;padding:3px 10px;display:inline-block;margin-bottom:10px}
.bp-ttl{font-family:var(--serif);font-size:20px;font-weight:700;color:var(--dark);line-height:1.2;margin-bottom:8px}
.bp-desc{font-size:13px;color:var(--muted);line-height:1.7;margin-bottom:14px}
.bp-meta{display:flex;align-items:center;gap:10px;font-size:11px;color:var(--muted)}
.bp-tags{display:flex;gap:6px;margin-top:12px;flex-wrap:wrap}
.bp-tag{background:var(--cream);border-radius:100px;padding:3px 10px;font-size:11px;color:var(--muted);border:1px solid var(--border)}
.bp-rd{margin-left:auto;font-size:12px;font-weight:500;color:var(--moss);border:none;background:none;cursor:pointer;transition:color .2s,transform .2s}
.bp-rd:hover{color:var(--forest);transform:translateX(4px)}

/* - ABOUT PAGE - */
.ab-split{display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:center}
.ab-img{border-radius:28px;height:380px;overflow:hidden;box-shadow:var(--s1);flex-shrink:0}
.ab-stats-g{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin:56px 0}
.ab-sc{text-align:center;background:var(--white);border-radius:18px;padding:28px 16px;border:1px solid var(--border);transition:transform .35s var(--ease)}
.ab-sc:hover{transform:translateY(-6px);box-shadow:var(--s0)}
.ab-sn{font-family:var(--serif);font-size:42px;font-weight:700;color:var(--dark);line-height:1}
.ab-sl{font-size:12px;color:var(--muted);margin-top:5px}
.tm-g{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;margin-top:48px}
.tm-c{border-radius:22px;overflow:hidden;border:1px solid var(--border);text-align:center;padding-bottom:22px;transition:transform .35s var(--ease),box-shadow .35s}
.tm-c:hover{transform:translateY(-7px);box-shadow:var(--s1)}
.tm-av{height:300px;overflow:hidden;background:#d4d4d4;transition:transform .35s}
.tm-c:hover .tm-av{transform:scale(1.05)}
.tm-nm{font-family:var(--serif);font-size:18px;font-weight:700;margin:12px 8px 3px}
.tm-ro{font-size:11px;color:var(--moss);font-weight:500;margin-bottom:7px}
.tm-dc{font-size:12px;color:var(--muted);line-height:1.6;margin:0 12px}
.val-g{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:48px}
.val-c{background:var(--white);border-radius:20px;padding:28px;border:1px solid var(--border);transition:transform .35s var(--ease)}
.val-c:hover{transform:translateY(-5px);box-shadow:var(--s0)}
.cert-list{display:flex;flex-direction:column;gap:10px;margin-top:24px}
.cert-row{background:var(--cream);border-radius:12px;padding:14px 18px;font-size:14px;border:1px solid var(--border);display:flex;align-items:center;gap:10px;transition:transform .2s}
.cert-row:hover{transform:translateX(6px)}

/* - CONTACT PAGE - */
.con-split{display:grid;grid-template-columns:1fr 1.4fr;gap:56px;align-items:start}
.con-info-c{display:flex;flex-direction:column;gap:16px}
.con-ii{display:flex;gap:14px;align-items:flex-start;padding:18px 20px;border-radius:16px;border:1px solid var(--border);background:var(--cream);transition:transform .25s}
.con-ii:hover{transform:translateX(6px)}
.con-ico{width:44px;height:44px;border-radius:12px;background:var(--forest);color:var(--lime);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.con-form-box{background:var(--white);border-radius:24px;padding:clamp(24px,4vw,40px);border:1px solid var(--border);box-shadow:var(--s0)}
.inp{width:100%;padding:12px 15px;border-radius:12px;border:1.5px solid var(--border);background:var(--cream);font-family:var(--sans);font-size:14px;outline:none;transition:border-color .2s,box-shadow .2s;color:var(--dark);box-sizing:border-box}
.inp:focus{border-color:var(--sage);box-shadow:0 0 0 3px rgba(122,158,122,.14)}
.inp::placeholder{color:var(--muted);opacity:1}
.map-ph{height:280px;background:linear-gradient(135deg,#c5e8b5,#72a86e);border-radius:20px;display:flex;align-items:center;justify-content:center;color:var(--forest);margin-top:36px;border:1px solid var(--border);animation:float 4s ease-in-out infinite}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}

/* - PROFILE DRAWER - */
.prof-ov{position:fixed;inset:0;z-index:1099;background:rgba(0,0,0,0);pointer-events:none;transition:background .3s}
.prof-ov.on{background:rgba(0,0,0,.42);pointer-events:all}
.prof-dr{position:fixed;top:0;right:0;bottom:0;z-index:1100;width:480px;max-width:100vw;background:var(--white);box-shadow:-8px 0 48px rgba(0,0,0,.16);display:flex;flex-direction:column;transform:translateX(100%);transition:transform .38s var(--ease)}
.prof-dr.on{transform:translateX(0)}
.prof-head{background:linear-gradient(160deg,rgba(15,40,17,.82) 0%,rgba(28,64,30,.76) 100%),url('https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&q=70&fit=crop') center/cover no-repeat;padding:28px 24px 22px;flex-shrink:0;position:relative;overflow:hidden}
.prof-head::before{content:'';position:absolute;top:-40px;right:-40px;width:180px;height:180px;border-radius:50%;background:rgba(255,255,255,.05)}
.prof-head::after{content:'';position:absolute;bottom:-30px;left:-20px;width:140px;height:140px;border-radius:50%;background:rgba(255,255,255,.03)}
.prof-av{width:68px;height:68px;border-radius:50%;background:rgba(255,255,255,.15);border:2.5px solid rgba(255,255,255,.35);display:flex;align-items:center;justify-content:center;font-size:30px;margin-bottom:12px;cursor:pointer;transition:transform .3s var(--spring)}
.prof-av:hover{transform:scale(1.08)}
.prof-nm{font-family:var(--serif);font-size:22px;font-weight:700;color:#fff;line-height:1.1;margin-bottom:3px}
.prof-em{font-size:12px;color:rgba(255,255,255,.68)}
.prof-badges{display:flex;gap:7px;margin-top:12px;flex-wrap:wrap}
.prof-badge{display:inline-flex;align-items:center;gap:5px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.28);border-radius:100px;padding:4px 10px;font-size:11px;color:#fff;font-weight:500;backdrop-filter:blur(4px)}
.prof-tabs{display:flex;border-bottom:1px solid var(--border);background:var(--cream);flex-shrink:0}
.prof-tab{flex:1;padding:13px 8px;border:none;background:transparent;font-family:var(--sans);font-size:12px;font-weight:600;color:var(--muted);cursor:pointer;transition:all .2s;border-bottom:2.5px solid transparent;display:flex;flex-direction:column;align-items:center;gap:4px}
.prof-tab:hover{color:var(--dark)}
.prof-tab.on{color:var(--forest);border-bottom-color:var(--forest)}
.prof-tab-ico{display:flex;align-items:center;justify-content:center;width:20px;height:20px}
.prof-body{flex:1;overflow-y:auto;padding:20px}
.prof-sect{margin-bottom:24px}
.prof-sect-title{font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:1.2px;margin-bottom:12px;display:flex;align-items:center;gap:6px}
.prof-card{background:var(--cream);border-radius:16px;border:1px solid var(--border);padding:16px;margin-bottom:10px;transition:transform .2s,box-shadow .2s}
.prof-card:hover{transform:translateY(-2px);box-shadow:var(--s0)}
.prof-order-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px}
.prof-order-id{font-size:12px;font-weight:700;color:var(--dark)}
.prof-order-date{font-size:11px;color:var(--muted)}
.prof-order-status{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:600;border-radius:100px;padding:3px 10px}
.status-done{background:#dcfce7;color:#16a34a}
.status-pending{background:#fef9c3;color:#92400e}
.status-process{background:#dbeafe;color:#1d4ed8}
.prof-order-items{font-size:12px;color:var(--muted);line-height:1.7;margin-bottom:8px}
.prof-order-total{font-family:var(--serif);font-size:18px;font-weight:700;color:var(--forest)}
.prof-addr-card{display:flex;gap:12px;align-items:flex-start;padding:14px;background:var(--cream);border-radius:14px;border:1px solid var(--border);margin-bottom:10px;cursor:pointer;transition:border-color .2s}
.prof-addr-card:hover,.prof-addr-card.def{border-color:var(--sage)}
.prof-addr-ico{width:38px;height:38px;border-radius:10px;background:var(--forest);color:var(--lime);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0}
.prof-addr-text{flex:1}
.prof-addr-main{font-size:14px;font-weight:600;color:var(--dark);margin-bottom:2px}
.prof-addr-sub{font-size:12px;color:var(--muted)}
.prof-stat-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px}
.prof-stat{background:var(--cream);border-radius:14px;border:1px solid var(--border);padding:16px;text-align:center}
.prof-stat-n{font-family:var(--serif);font-size:26px;font-weight:700;color:var(--forest);line-height:1}
.prof-stat-l{font-size:11px;color:var(--muted);margin-top:4px}
.prof-form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px}
.prof-wish-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.prof-wish-card{border-radius:14px;overflow:hidden;border:1px solid var(--border);transition:transform .2s,box-shadow .2s;cursor:pointer}
.prof-wish-card:hover{transform:translateY(-4px);box-shadow:var(--s1)}
.prof-wish-img{height:90px;overflow:hidden}
.prof-wish-img img{width:100%;height:100%;object-fit:cover}
.prof-wish-info{padding:10px}
.prof-wish-name{font-size:12px;font-weight:600;color:var(--dark);margin-bottom:2px}
.prof-wish-price{font-family:var(--serif);font-size:15px;font-weight:700;color:var(--forest)}
.prof-login-box{text-align:center;padding:36px 20px}
.prof-login-ico{font-size:64px;margin-bottom:16px}
.prof-login-title{font-family:var(--serif);font-size:26px;font-weight:700;color:var(--dark);margin-bottom:8px}
.prof-login-sub{font-size:14px;color:var(--muted);line-height:1.7;margin-bottom:24px}
.prof-oauth-btn{width:100%;padding:12px 16px;border-radius:12px;border:1.5px solid var(--border);background:var(--white);display:flex;align-items:center;gap:12px;cursor:pointer;font-family:var(--sans);font-size:14px;font-weight:500;color:var(--dark);transition:all .2s;margin-bottom:10px}
.prof-oauth-btn:hover{border-color:var(--sage);background:var(--cream);transform:translateX(4px)}
.prof-oauth-ico{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
.prof-divider{display:flex;align-items:center;gap:12px;margin:16px 0;font-size:12px;color:var(--muted)}
.prof-divider::before,.prof-divider::after{content:'';flex:1;height:1px;background:var(--border)}
.prof-email-form{display:flex;flex-direction:column;gap:10px}
.prof-x{position:absolute;top:16px;right:16px;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.30);border-radius:50%;width:32px;height:32px;cursor:pointer;color:#fff;font-size:16px;display:flex;align-items:center;justify-content:center;transition:background .2s,transform .2s;z-index:1}
.prof-x:hover{background:rgba(255,255,255,.32);transform:rotate(90deg)}
.prof-empty{text-align:center;padding:32px 16px;color:var(--muted)}
.prof-empty-ico{font-size:48px;opacity:.3;margin-bottom:10px}
.prof-empty-text{font-size:14px;line-height:1.6}
.prof-tag-lvl{display:inline-block;padding:2px 9px;border-radius:100px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px}
.lvl-bronze{background:#fde68a;color:#92400e}
.lvl-silver{background:#e2e8f0;color:#475569}
.lvl-gold{background:linear-gradient(135deg,#fbbf24,#d97706);color:#fff}

/* - PROFILE NAV ICON - */
.prof-nav-btn{width:36px;height:36px;border-radius:50%;border:1.5px solid var(--border);background:transparent;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--dark);transition:all .2s;flex-shrink:0;position:relative}
.prof-nav-btn:hover{background:var(--dark);color:#fff;border-color:var(--dark)}
.prof-nav-btn.logged{border-color:var(--moss);background:rgba(58,107,59,.08)}
.prof-nav-btn.logged:hover{background:var(--forest);border-color:var(--forest);color:#fff}
.prof-nav-dot{position:absolute;bottom:-2px;right:-2px;width:10px;height:10px;background:#4ade80;border-radius:50%;border:2px solid var(--white)}

.loading-spin{width:18px;height:18px;border:2px solid var(--border);border-top-color:var(--forest);border-radius:50%;animation:spin .7s linear infinite;flex-shrink:0}
@keyframes spin{to{transform:rotate(360deg)}}
.steps{display:flex;align-items:center;justify-content:center;gap:0;margin-bottom:44px}
.step-dot{display:flex;flex-direction:column;align-items:center}
.step-circle{width:46px;height:46px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;transition:all .4s;border:2.5px solid var(--border);color:var(--muted);background:var(--white)}
.step-circle.done{background:var(--forest);border-color:var(--forest);color:#fff}
.step-circle.cur{background:var(--moss);border-color:var(--moss);color:#fff;animation:stepPulse .6s var(--spring)}
@keyframes stepPulse{from{transform:scale(.7)}to{transform:scale(1)}}
@keyframes termPulse{0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(34,197,94,0.7)}70%{opacity:.85;box-shadow:0 0 0 5px rgba(34,197,94,0)}}
@keyframes kpiFlash{0%{background:rgba(74,222,128,0.22);transform:scale(1.018)}80%{background:rgba(74,222,128,0.04);transform:scale(1)}100%{background:transparent;transform:scale(1)}}
@keyframes feedIn{from{opacity:0;transform:translateX(-14px)}to{opacity:1;transform:none}}
.step-lbl{font-size:10px;margin-top:5px;color:var(--muted);text-align:center;white-space:nowrap}
.step-lbl.done,.step-lbl.cur{color:var(--forest);font-weight:600}
.step-line{width:60px;height:2.5px;background:var(--border);margin:0 2px 18px;transition:background .4s}
.step-line.done{background:var(--forest)}
.ord-box{background:var(--white);border-radius:24px;padding:clamp(22px,4vw,40px);border:1px solid var(--border);box-shadow:var(--s0)}
.promo-row{display:flex;gap:0;margin-top:10px}
.promo-in{flex:1;padding:10px 14px;border:1.5px solid var(--border);border-radius:10px 0 0 10px;font-family:var(--sans);font-size:14px;outline:none;transition:border-color .2s;background:var(--cream)}
.promo-in:focus{border-color:var(--sage)}
.promo-btn{padding:10px 16px;background:var(--moss);color:#fff;border:none;border-radius:0 10px 10px 0;cursor:pointer;font-size:13px;font-weight:500;transition:background .2s;font-family:var(--sans)}
.promo-btn:hover{background:var(--forest)}
.ord-item{display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:14px;background:var(--cream);border:1px solid var(--border)}
.ord-item-img{width:50px;height:50px;border-radius:8px;object-fit:cover}
.ord-item-nm{font-weight:600;font-size:13px;color:var(--dark)}
.ord-item-pr{font-size:12px;color:var(--muted)}
.ord-item-tot{font-family:var(--serif);font-size:16px;font-weight:600;margin-left:auto;white-space:nowrap}
.sent-success{text-align:center;padding:clamp(40px,6vw,72px) 20px}
.sent-ico{font-size:80px;margin-bottom:20px;animation:bounceIn .7s var(--spring)}
@keyframes bounceIn{from{opacity:0;transform:scale(0.3)}to{opacity:1;transform:scale(1)}}
.sent-h{font-family:var(--serif);font-size:clamp(28px,4vw,46px);font-weight:700;color:var(--forest);margin-bottom:10px}
.sent-s{font-size:16px;color:var(--muted);max-width:420px;margin:0 auto}

/* - ANIMATE ON SCROLL (JS-added class) - */
@keyframes fadeUp{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}
.reveal{opacity:0;transform:translateY(28px);transition:opacity .65s var(--ease),transform .65s var(--ease)}
.reveal.in{opacity:1;transform:translateY(0)}

/* - MEDIA - */
@media(max-width:1280px){
  .nav-in{padding:0 20px}
  .nav-links{gap:14px}
  .nl{font-size:12px}
}
@media(max-width:1100px){
  .pgrid{grid-template-columns:repeat(3,1fr)}
  .adv-g{grid-template-columns:repeat(3,1fr)}
  .bento-g{grid-template-columns:repeat(6,1fr)}
  .bc1{grid-column:span 6;min-height:260px}
  .bc2,.bc3{grid-column:span 3;min-height:200px}
  .bc4,.bc5{grid-column:span 3;min-height:200px}
  .tier-g{grid-template-columns:1fr}
  .tier.best{transform:scale(1)}
  .ab-split{grid-template-columns:1fr}
  .con-split{grid-template-columns:1fr}
  .foot-g{grid-template-columns:1fr 1fr;gap:36px}
  .tsw{display:none}
  .nav-links{gap:10px}
  .nl{font-size:12px}
  .nav-cta{padding:8px 14px;font-size:12px}
  .tm-g{grid-template-columns:repeat(2,1fr)}
  .tm-av{height:260px}
  .ab-stats-g{grid-template-columns:repeat(2,1fr)}
}
@media(max-width:900px){
  .nav-links,.nav-r{display:none}
  .hbg{display:flex}
  .pgrid{grid-template-columns:repeat(2,1fr);gap:14px}
  .blog-g,.tst-g,.bp-g{grid-template-columns:1fr}
  .adv-g{grid-template-columns:repeat(2,1fr)}
  .srv-g{grid-template-columns:repeat(2,1fr)}
  .sb-g{grid-template-columns:repeat(2,1fr)}
  .sb-i{border-right:none;border-bottom:1px solid rgba(255,255,255,.1)}
  .sb-i:nth-child(odd){border-right:1px solid rgba(255,255,255,.1)}
  .bento-g{grid-template-columns:1fr 1fr;gap:10px}
  .bc1{grid-column:span 2;min-height:220px}
  .bc2,.bc3,.bc4,.bc5{grid-column:span 1;min-height:170px}
  .hero-in{flex-direction:column;gap:36px;text-align:center;align-items:center;padding:0 20px}
  .hero-ct{max-width:100%}
  .hero-sub{margin:0 auto 32px}
  .hero-btns{justify-content:center}
  .hero-stats{justify-content:center;gap:26px}
  .hero-vis{max-width:320px}
  .h-img-wrap{width:250px}
  .fc1{right:-14px}
  .fc2{left:-14px}
  .how-steps{flex-direction:column;align-items:center;gap:24px}
  .how-steps::before{display:none}
  .hs{flex-direction:row;text-align:left;gap:18px}
  .hs-ico{flex-shrink:0}
  .wrap{padding:0 20px}
  .section{padding:72px 0}
  .chat-win{right:0;width:calc(100vw - 56px);max-width:340px}
  .chat-fab{width:50px;height:50px;font-size:19px}
  .stt{width:42px;height:42px}
  .fab-stack{bottom:18px;right:18px;gap:9px}
  .dr{width:100%;max-width:100vw}
  .foot-g{grid-template-columns:1fr;gap:28px}
  .tm-g{grid-template-columns:repeat(2,1fr)}
  .tm-av{height:240px}
  .ab-img{height:300px;border-radius:20px}
}
@media(max-width:600px){
  .pgrid{grid-template-columns:repeat(2,1fr);gap:10px}
  .adv-g{grid-template-columns:1fr}
  .bento-g{grid-template-columns:1fr;gap:8px}
  .bc1,.bc2,.bc3,.bc4,.bc5{grid-column:span 1;min-height:160px}
  .blog-g,.bp-g{grid-template-columns:1fr}
  .hero-btns{flex-direction:column;align-items:center}
  .hero-btns .btn,.hero-btns .btn-o{width:100%;justify-content:center}
  .trust-bt{flex-direction:column;align-items:center}
  .trust-bt .btn-w,.trust-bt .btn-ow{width:100%;justify-content:center}
  .steps{gap:0;flex-wrap:nowrap;overflow:hidden}
  .step-line{width:30px}
  .section{padding:56px 0}
  .wrap{padding:0 16px}
  .tm-g{grid-template-columns:1fr}
  .tm-av{height:280px}
  .ab-img{height:220px;border-radius:14px}
  .ab-sn{font-size:32px}
  .ab-stats-g{grid-template-columns:repeat(2,1fr)}
  .tier-g{grid-template-columns:1fr}
  .val-g{grid-template-columns:1fr}
}
@media(max-width:420px){
  .pgrid{grid-template-columns:1fr}
  .h-img-wrap{width:200px}
  .fc{padding:7px 10px;font-size:11px}
  .fc-ico{width:26px;height:26px;font-size:13px}
  .fc1{right:8px}
  .fc2{left:8px}
  .tm-g{grid-template-columns:1fr}
  .tm-av{height:250px}
  .ab-img{height:180px;border-radius:12px}
  .ab-sn{font-size:26px}
  .logo-text{font-size:18px}
}
`;

/* ======================================================================
   HELPERS
====================================================================== */
const fmt = (rub, cur) => `${cur.symbol}${Math.round(rub * cur.rate).toLocaleString()}`;
const bcls = t => ({ hit:'bh', fresh:'bf', top:'bt', new:'bn' }[t] || 'bh');

/* -- Intersection Observer hook -- */
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal');
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); } });
    }, { threshold: 0.1 });
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  });
}

/* ======================================================================
   CUSTOM CURSOR
====================================================================== */
function Cursor() {
  const d = useRef(null), r = useRef(null);
  useEffect(() => {
    if ('ontouchstart' in window) return;
    let mx = -100, my = -100, rx = -100, ry = -100, raf;
    const move = e => { mx = e.clientX; my = e.clientY; d.current.style.transform = `translate(${mx}px,${my}px) translate(-50%,-50%)`; };
    const lerp = (a, b, t) => a + (b - a) * t;
    const anim = () => { rx = lerp(rx, mx, .11); ry = lerp(ry, my, .11); r.current.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`; raf = requestAnimationFrame(anim); };
    const on = () => { d.current.classList.add('hov'); r.current.classList.add('hov'); };
    const off = () => { d.current.classList.remove('hov'); r.current.classList.remove('hov'); };
    const bind = () => document.querySelectorAll('a,button,[role=button],input,textarea,select').forEach(el => { el.addEventListener('mouseenter', on); el.addEventListener('mouseleave', off); });
    window.addEventListener('mousemove', move);
    document.body.style.cursor = 'none';
    raf = requestAnimationFrame(anim); bind();
    const obs = new MutationObserver(bind);
    obs.observe(document.body, { childList: true, subtree: true });
    return () => { window.removeEventListener('mousemove', move); cancelAnimationFrame(raf); obs.disconnect(); document.body.style.cursor = ''; };
  }, []);
  if (typeof window !== 'undefined' && 'ontouchstart' in window) return null;
  return <><div ref={d} className="cur-dot"/><div ref={r} className="cur-ring"/></>;
}

/* ======================================================================
   PRELOADER
====================================================================== */
function Preloader({ onDone }) {
  const [ph, setPh] = useState('in');
  useEffect(() => {
    const t1 = setTimeout(() => setPh('out'), 1600);
    const t2 = setTimeout(() => onDone(), 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);
  if (ph === 'gone') return null;
  return (
    <div className={`pl${ph === 'out' ? ' out' : ''}`}>
      <div className="pl-inner">
        <div className="pl-leaf">
          <svg viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="32" r="30" stroke="#2d4a2d" strokeWidth="1.5"/>
            <path d="M32 8C18 8 10 18 10 28c0 8 4 14 10 18M32 8c14 0 22 10 22 20 0 8-4 14-10 18M32 8v40M18 18c4 3 9 8 14 14M46 18c-4 3-9 8-14 14" stroke="#8fba8f" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div className="pl-brand">Bionerica Agency</div>
        <div className="pl-bar"><div className="pl-fill"/></div>
      </div>
    </div>
  );
}

/* ======================================================================
   SVG ICON COMPONENT
====================================================================== */
function Ico({ k, size = 22 }) {
  const a = { fill:'none', stroke:'currentColor', strokeWidth:1.7, strokeLinecap:'round', strokeLinejoin:'round' };
  const w = { width:size, height:size, display:'inline-block', flexShrink:0, verticalAlign:'middle' };
  const s = ch => <svg viewBox="0 0 24 24" {...a} style={w}>{ch}</svg>;
  switch(k) {
    case 'truck':       return s(<><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></>);
    case 'leaf':        return s(<><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></>);
    case 'greenhouse':  return s(<><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><rect x="9" y="12" width="6" height="10"/></>);
    case 'box':         return s(<><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></>);
    case 'sprout':      return s(<><path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-9"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/><path d="M14.1 6a7 7 0 0 1 1.4 3c-1.9.5-3.4.2-4.6-.8-1.1-1-1.9-2.8-1.6-5.3 2.9.5 4 2 4.8 3.1z"/></>);
    case 'drop':        return s(<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>);
    case 'thermometer': return s(<path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/>);
    case 'trophy':      return s(<><path d="M7 4H4a1 1 0 0 0-1 1v2a5 5 0 0 0 5 5h1M17 4h3a1 1 0 0 1 1 1v2a5 5 0 0 1-5 5h-1M12 17v4M8 21h8"/><path d="M7 4h10v8a5 5 0 0 1-10 0V4z"/></>);
    case 'briefcase':   return s(<><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></>);
    case 'flask':       return s(<><path d="M10 2v7.31L5.72 21h12.56L14 9.31V2"/><path d="M8.5 2h7"/><path d="M7 16h10"/></>);
    case 'recycle':     return s(<><polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 0 1 3.51 15"/></>);
    case 'star':        return s(<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>);
    case 'clock':       return s(<><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>);
    case 'pin':         return s(<><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></>);
    case 'phone':       return s(<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 2 1.72c.14.7.29 1.38.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.81a16 16 0 0 0 6 6l.9-.9a2 2 0 0 1 2.11-.45c1.43.41 2.11.56 2.81.7A2 2 0 0 1 22 16.92z"/>);
    case 'mail':        return s(<><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22 6 12 13 2 6"/></>);
    case 'home':        return s(<><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>);
    case 'calendar':    return s(<><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>);
    case 'timer':       return s(<><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M9 2h6"/></>);
    case 'map':         return s(<><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></>);
    case 'snowflake':   return s(<><line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/><line x1="19.07" y1="4.93" x2="4.93" y2="19.07"/></>);
    case 'road':        return s(<><line x1="10" y1="3" x2="7" y2="21"/><line x1="14" y1="3" x2="17" y2="21"/><line x1="9.5" y1="9" x2="14.5" y2="9"/><line x1="8.5" y1="15" x2="15.5" y2="15"/></>);
    case 'person':      return s(<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>);
    case 'flower':      return s(<><circle cx="12" cy="12" r="3"/><path d="M12 2a2.5 2.5 0 0 0-2.5 2.5v2a2.5 2.5 0 0 0 5 0V4.5A2.5 2.5 0 0 0 12 2z"/><path d="M22 12a2.5 2.5 0 0 0-2.5-2.5h-2a2.5 2.5 0 0 0 0 5h2A2.5 2.5 0 0 0 22 12z"/><path d="M12 22a2.5 2.5 0 0 0 2.5-2.5v-2a2.5 2.5 0 0 0-5 0v2A2.5 2.5 0 0 0 12 22z"/><path d="M2 12a2.5 2.5 0 0 0 2.5 2.5h2a2.5 2.5 0 0 0 0-5h-2A2.5 2.5 0 0 0 2 12z"/></>);
    case 'tomato':      return s(<><circle cx="12" cy="13" r="8"/><path d="M12 5v4"/><path d="M10 7c.67-.33 1.33-.5 2-.5s1.33.17 2 .5"/></>);
    case 'berry':       return s(<><circle cx="8" cy="15" r="4.5"/><circle cx="16" cy="15" r="4.5"/><circle cx="12" cy="9" r="4.5"/><path d="M12 4.5V3"/></>);
    case 'lemon':       return s(<><ellipse cx="12" cy="12" rx="9.5" ry="6.5" transform="rotate(-15 12 12)"/><line x1="12" y1="5.8" x2="12" y2="3"/></>);
    case 'bulb':        return s(<><line x1="9" y1="18" x2="15" y2="18"/><line x1="10" y1="21" x2="14" y2="21"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14z"/></>);
    case 'award':       return s(<><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></>);
    case 'chart':       return s(<><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></>);
    case 'card':        return s(<><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></>);
    case 'settings':    return s(<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>);
    case 'handshake':   return s(<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>);
    case 'chat':        return s(<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>);
    case 'camera':      return s(<><rect x="3" y="7" width="18" height="13" rx="2"/><circle cx="12" cy="13" r="4"/><path d="M8 7V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/></>);
    case 'send':        return s(<><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></>);
    case 'share':       return s(<><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></>);
    default: return null;
  }
}

/* ======================================================================
   SEARCH
====================================================================== */
function Search({ open, onClose, t, cur, onPage }) {
  const [q, setQ] = useState('');
  const ref = useRef(null);
  useEffect(() => { if (open) { setQ(''); setTimeout(() => ref.current?.focus(), 80); } }, [open]);
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open]);
  const res = useMemo(() => {
    if (q.length < 2) return [];
    const lq = q.toLowerCase();
    return (t.products || []).filter((p, i) => {
      const nm = p.name.toLowerCase();
      const or = p.origin.toLowerCase();
      return nm.includes(lq) || or.includes(lq) || CATS_KEY[i]?.includes(lq);
    }).slice(0, 9);
  }, [q, t]);
  const idx = p => t.products.indexOf(p);
  return (
    <>
      <div className={`sr-ov${open ? ' on' : ''}`} onClick={onClose}/>
      <div className={`sr-box${open ? ' on' : ''}`}>
        <div className="sr-row">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input ref={ref} className="sr-input" value={q} onChange={e => setQ(e.target.value)} placeholder={t.sr_ph}/>
          {q && <button style={{background:'none',border:'none',cursor:'pointer',color:'var(--muted)',fontSize:16}} onClick={() => setQ('')}>×</button>}
          <button className="sr-esc" onClick={onClose}>Esc</button>
        </div>
        <div className="sr-list">
          {q.length < 2 ? (
            <div className="sr-hint">{t.sr_hint}</div>
          ) : res.length === 0 ? (
            <div className="sr-no"><svg style={{display:'inline',marginRight:8,opacity:.4}} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>{t.sr_no} «{q}»</div>
          ) : (
            <>
              <div className="sr-meta">{t.sr_found}: {res.length}</div>
              {res.map((p, i) => (
                <button key={i} className="sr-itm" onClick={() => { onPage('catalog'); onClose(); }}>
                  <img src={IMGS[idx(p)]} alt="" className="sr-img"/>
                  <div>
                    <div className="sr-nm">{p.name}</div>
                    <div className="sr-or">{p.origin}</div>
                  </div>
                  <div className="sr-pr">{fmt(p.pr, cur)}</div>
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </>
  );
}

/* ======================================================================
   CART DRAWER
====================================================================== */
function CartDrawer({ open, onClose, cart, setCart, t, cur, onPage }) {
  const items = useMemo(() =>
    Object.entries(cart).filter(([,q]) => q > 0).map(([id, qty]) => {
      const p = t.products[+id];
      return p ? { p, idx: +id, qty } : null;
    }).filter(Boolean), [cart, t]);
  const total = items.reduce((s, { p, qty }) => s + Math.round(p.pr * cur.rate) * qty, 0);
  const setQ = (id, qty) => setCart(c => qty <= 0 ? (({ [id]: _, ...r }) => r)(c) : { ...c, [id]: qty });
  const total_qty = Object.values(cart).reduce((s, v) => s + v, 0);
  return (
    <>
      <div className={`dr-ov${open ? ' on' : ''}`} onClick={onClose}/>
      <div className={`dr${open ? ' on' : ''}`}>
        <div className="dr-head">
          <div className="dr-ttl">{t.cart_title}{total_qty > 0 && <span className="dr-cnt">{total_qty}</span>}</div>
          <button className="dr-x" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        {items.length === 0 ? (
          <div className="dr-empty">
            <div className="dr-empty-ico" style={{display:'flex',alignItems:'center',justifyContent:'center',color:'var(--sage)'}}>
              <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            </div>
            <div className="dr-empty-t">{t.cart_empty}</div>
            <div className="dr-empty-s">{t.cart_empty_sub}</div>
          </div>
        ) : (
          <>
            <div className="dr-items">
              {items.map(({ p, idx: id, qty }, i) => (
                <div key={id} className="ci" style={{ animationDelay: `${i * 0.05}s` }}>
                  <img src={IMGS[id]} alt="" className="ci-img"/>
                  <div className="ci-info">
                    <div className="ci-nm">{p.name}</div>
                    <div className="ci-pr">{fmt(p.pr, cur)}</div>
                    <div className="ci-ctrl">
                      <button className="cq" onClick={() => setQ(id, qty - 1)}>−</button>
                      <span className="cn">{qty}</span>
                      <button className="cq" onClick={() => setQ(id, qty + 1)}>+</button>
                      <button className="cr" onClick={() => setQ(id, 0)}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                      </button>
                    </div>
                  </div>
                  <div className="ci-tot">{cur.symbol}{(Math.round(p.pr * cur.rate) * qty).toLocaleString()}</div>
                </div>
              ))}
            </div>
            <div className="dr-foot">
              <div className="dr-tot-row">
                <span className="dr-tot-l">{t.cart_total}</span>
                <span className="dr-tot-v">{cur.symbol}{total.toLocaleString()}</span>
              </div>
              <button className="btn dr-btn" onClick={() => { onPage('order'); onClose(); }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><polyline points="9 12 11 14 15 10"/></svg>
                {t.cart_checkout}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

/* ======================================================================
   CHAT
====================================================================== */
function Chat({ t, lang, userEmail = '', userName = '' }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([]);
  const [inp, setInp] = useState('');
  const [typing, setTyping] = useState(false);
  const [showQ, setShowQ] = useState(true);
  const [unread, setUnread] = useState(0);
  const msgsRef     = useRef(null);
  const sidRef      = useRef(null);
  const lastMgrTsRef = useRef(0);

  /* Persist a session ID so manager can reply */
  useEffect(() => {
    const stored = localStorage.getItem('bionerika_float_sid');
    if (stored) {
      sidRef.current = stored;
    } else {
      const sid = 'chat_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      try { localStorage.setItem('bionerika_float_sid', sid); } catch {}
      sidRef.current = sid;
    }
  }, []);

  useEffect(() => { setMsgs([{ from: 'bot', text: t.chat_greet }]); setShowQ(true); }, [t]);
  useEffect(() => {
    if (msgsRef.current) {
      msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
    }
  }, [msgs, typing]);

  /* Poll for real manager replies every 2.5 s while open */
  useEffect(() => {
    if (!open) return;
    const sid = sidRef.current;
    if (!sid) return;
    const iv = setInterval(() => {
      try {
        const raw = localStorage.getItem(`bionerika_reply_${sid}`);
        if (!raw) return;
        const r = JSON.parse(raw);
        if (r && r.ts && r.ts > lastMgrTsRef.current) {
          lastMgrTsRef.current = r.ts;
          setMsgs(m => [...m, { from: 'manager', text: r.text, time: r.time }]);
          localStorage.removeItem(`bionerika_reply_${sid}`);
        }
      } catch {}
    }, 2500);
    return () => clearInterval(iv);
  }, [open]);

  /* Save message to shared localStorage so ManagerPage can see it */
  const saveToLS = (from, text) => {
    const sid = sidRef.current;
    if (!sid) return;
    try {
      const key  = `bionerika_msgs_${sid}`;
      const arr  = JSON.parse(localStorage.getItem(key) || '[]');
      const time = new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
      arr.push({ id: Date.now() + Math.random(), from, text, time });
      localStorage.setItem(key, JSON.stringify(arr.slice(-100)));
      /* Upsert the session entry */
      const sessions = JSON.parse(localStorage.getItem('bionerika_sessions') || '[]');
      const idx = sessions.findIndex(s => s.id === sid);
      const resolvedName = userName || userEmail || (lang === 'ua' ? 'Гість (чат)' : 'Guest (chat)');
      const unread = (from === 'client') ? ((idx >= 0 ? sessions[idx].unread : 0) + 1) : 0;
      const entry = { id: sid, name: resolvedName, lastMsg: text, time: Date.now(), unread };
      if (idx >= 0) { sessions[idx] = { ...sessions[idx], name: resolvedName, lastMsg: text, time: Date.now(), unread }; }
      else { sessions.unshift(entry); }
      localStorage.setItem('bionerika_sessions', JSON.stringify(sessions.slice(0, 50)));
    } catch {}
  };

  const send = txt => {
    if (!txt.trim()) return;
    setShowQ(false); setInp('');
    setMsgs(m => [...m, { from: 'usr', text: txt }]);
    saveToLS('client', txt);
    setTyping(true);
    setTimeout(() => {
      const reply = chatGetReply(txt, lang, msgs);
      setTyping(false);
      setMsgs(m => [...m, { from: 'bot', text: reply }]);
      saveToLS('ai', reply);
    }, 900 + Math.random() * 800);
  };
  return (
    <>
      <button className="chat-fab" onClick={() => { setOpen(o => !o); if (!open) setUnread(0); }} style={{position:'relative'}}>
        {open
          ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          : <Ico k="chat" size={22}/>}
        {!open && unread > 0 && <span className="chat-dot" style={{background:'#ef4444'}}>{unread}</span>}
        {!open && unread === 0 && <span className="chat-dot"/>}
      </button>
      {open && (
        <div className="chat-win">
          <div className="chat-hd">
            <div className="chat-av"><Ico k="leaf" size={20}/></div>
            <div><div className="chat-nm">Bionerika AI chat</div><div className="chat-st">{t.chat_online}</div></div>
            <button className="chat-cx" onClick={() => setOpen(false)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div className="chat-msgs" ref={msgsRef}>
            {msgs.map((m, i) => {
              const isManager = m.from === 'manager';
              return (
                <div key={i} className={`cb ${m.from === 'usr' ? 'usr' : 'bot'}`}>
                  {isManager && (
                    <span style={{ display:'block', fontSize:10, opacity:.6, marginBottom:3 }}>
                      👤 {lang === 'ua' ? 'Менеджер' : 'Manager'}
                    </span>
                  )}
                  {m.text}
                </div>
              );
            })}
            {typing && <div className="cb bot"><div className="td"><span/><span/><span/></div></div>}
          </div>
          {showQ && (
            <div className="chat-qw">
              {(t.chat_quick || []).map((q, i) => <button key={i} className="cqb" onClick={() => send(q)}>{q}</button>)}
            </div>
          )}
          <div className="chat-inp-row">
            <input className="chat-inp" value={inp} onChange={e => setInp(e.target.value)} placeholder={t.chat_ph} onKeyDown={e => e.key === 'Enter' && send(inp)}/>
            <button className="chat-snd" onClick={() => send(inp)}><Ico k="send" size={16}/></button>
          </div>
        </div>
      )}
    </>
  );
}

/* ======================================================================
   NAVBAR
====================================================================== */
function Navbar({ t, lang, setLang, cart, scrolled, onCart, onSearch, onPage, page, onProfile, profileLogged, isManager }) {
  const { theme, toggleTheme } = useTheme();
  const [mob, setMob] = useState(false);
  const totalQ = Object.values(cart).reduce((s, v) => s + v, 0);
  const links = [
    { k: 'home', l: t.nav_home },
    { k: 'catalog', l: t.nav_catalog },
    { k: 'delivery', l: t.nav_delivery },
    { k: 'wholesale', l: t.nav_wholesale },
    { k: 'blog', l: t.nav_blog },
    { k: 'about', l: t.nav_about },
    { k: 'contact', l: t.nav_contact },
  ];
  useEffect(() => { document.body.style.overflow = mob ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [mob]);
  const go = k => { onPage(k); setMob(false); };
  const CartIco = () => (
    <button className="cart-btn" onClick={() => { onCart(); setMob(false); }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
      {totalQ > 0 && <span className="cbadge">{totalQ}</span>}
    </button>
  );
  return (
    <>
      <nav className={`nav${scrolled ? ' s' : ''}`}>
        <div className="nav-in">
          <button className="logo" onClick={() => go('home')}>
            <div className="logo-ico">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8fba8f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C6 2 3 7 3 12c0 3 1.5 5.5 4 7M12 2c6 0 9 5 9 10 0 3-1.5 5.5-4 7M12 2v20M7 7c2 1 4 3 5 5M17 7c-2 1-4 3-5 5"/></svg>
            </div>
            <span className="logo-text">Bionerika</span>
          </button>
          <div className="nav-links">
            {links.map(({ k, l }) => (
              <button key={k} className={`nl${page === k ? ' on' : ''}`} onClick={() => go(k)}>{l}</button>
            ))}
            {isManager && (
              <button onClick={() => go('manager')} style={{
                fontFamily:'var(--serif,Cormorant Garamond)', fontSize:15, fontWeight:600, fontStyle:'italic',
                letterSpacing:'.03em', cursor:'pointer', background:'none', border:'none',
                padding:'3px 12px', borderRadius:100,
                color: page==='manager' ? 'var(--forest,#1e3d1f)' : 'var(--moss,#3a6b3b)',
                boxShadow: page==='manager' ? 'inset 0 0 0 1.5px var(--moss,#3a6b3b)' : 'inset 0 0 0 1px rgba(58,107,59,.35)',
                display:'flex', alignItems:'center', gap:5,
                transition:'box-shadow .25s, color .25s, background .25s',
              }}
              onMouseEnter={e=>{e.currentTarget.style.background='rgba(58,107,59,.08)';e.currentTarget.style.boxShadow='inset 0 0 0 1.5px var(--moss,#3a6b3b)'}}
              onMouseLeave={e=>{e.currentTarget.style.background='none';e.currentTarget.style.boxShadow=page==='manager'?'inset 0 0 0 1.5px var(--moss,#3a6b3b)':'inset 0 0 0 1px rgba(58,107,59,.35)'}}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
                {lang==='ua'?'Менеджер':lang==='ru'?'Менеджер':'Manager'}
              </button>
            )}
          </div>
          <div className="nav-r">
            <div className="tsw">
              <button className={`tb${theme==='light'?' ta':''}`} onClick={()=>theme!=='light'&&toggleTheme()} title="День">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                День
              </button>
              <button className={`tb${theme==='dark'?' ta':''}`} onClick={()=>theme!=='dark'&&toggleTheme()} title="Ніч">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                Ніч
              </button>
            </div>
            <div className="lsw">
              {['EN','UA'].map(l => <button key={l} className={`lb${lang.toUpperCase() === l ? ' on' : ''}`} onClick={() => setLang(l.toLowerCase())}>{l}</button>)}
            </div>
            <button className="ib" onClick={onSearch}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>
            <button className={`prof-nav-btn${profileLogged?' logged':''}`} onClick={onProfile} title={lang==='ru'?'Мой аккаунт':lang==='ua'?'Мій акаунт':'My Account'}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
              {profileLogged && <span className="prof-nav-dot"/>}
            </button>
            <CartIco/>
            <button className="nav-cta" onClick={() => go('order')}>{t.nav_cta}</button>
          </div>
          <button className="hbg" onClick={() => setMob(o => !o)}>
            <span className={mob ? 'h1o' : ''}/><span className={mob ? 'h2o' : ''}/><span className={mob ? 'h3o' : ''}/>
          </button>
        </div>
      </nav>
      <div className={`mob${mob ? ' open' : ''}`}>
        <div className="mob-top">
          <div className="lsw">{['EN','UA'].map(l => <button key={l} className={`lb${lang.toUpperCase() === l ? ' on' : ''}`} onClick={() => setLang(l.toLowerCase())}>{l}</button>)}</div>
          <div style={{display:'flex',gap:8}}>
            <button className="ib" onClick={() => { onSearch(); setMob(false); }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>
            <button className={`prof-nav-btn${profileLogged?' logged':''}`} onClick={()=>{onProfile();setMob(false);}}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              {profileLogged && <span className="prof-nav-dot"/>}
            </button>
            <CartIco/>
          </div>
        </div>
        {links.map(({ k, l }) => (
          <button key={k} className="mob-lnk" onClick={() => go(k)}>{l}<span>{'>'}</span></button>
        ))}
        {isManager && (
          <button className="mob-lnk" onClick={() => go('manager')} style={{ display:'flex', alignItems:'center', gap:6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14M19.07 4.93A10 10 0 0 0 4.93 4.93M14.12 9.88a3 3 0 0 0-4.24 4.24"/></svg>
            {lang==='ua'?'Менеджер':'Manager'}<span>{'>'}</span>
          </button>
        )}
        <div className="tsw" style={{marginBottom:4}}>
          <button className={`tb${theme==='light'?' ta':''}`} onClick={()=>theme!=='light'&&toggleTheme()}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            День
          </button>
          <button className={`tb${theme==='dark'?' ta':''}`} onClick={()=>theme!=='dark'&&toggleTheme()}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            Ніч
          </button>
        </div>
        <button className="mob-cta" onClick={() => go('order')}>{t.nav_cta}</button>
      </div>
    </>
  );
}

/* ======================================================================
   PRODUCT CARD
====================================================================== */
function PCard({ p, idx, t, cur, cart, setCart, delay = 0 }) {
  const [added, setAdded] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const qty = cart[idx] || 0;
  const isPc = CATS_KEY[idx] === 'flowers' || CATS_KEY[idx] === 'exotic';
  const minQ = isPc ? 1 : 2;
  const maxQ = isPc ? 99 : 200;
  const unit = isPc ? t.unit_pc : t.unit_kg;
  const setQ = (id, q) => {
    const clamped = Math.max(minQ, Math.min(maxQ, Math.round(q)));
    setCart(c => ({ ...c, [id]: clamped }));
  };
  const remove = (id) => setCart(c => (({ [id]: _, ...r }) => r)(c));
  const add = () => { setCart(c => ({ ...c, [idx]: minQ })); setAdded(true); setTimeout(() => setAdded(false), 1200); };
  const views = idx % 3 === 0 ? 3 + (idx % 5) : 0;
  return (
    <div className="pc" style={{ animationDelay: `${delay}s` }}>
      <div className="pc-img">
        <span className={`badge ${bcls(p.badgeT)}`}>{p.badge}</span>
        <img src={IMGS[idx]} alt={p.name} loading="lazy"/>
        {views > 0 && <div className="vb"><span className="blink"/>{views} {t.prod_viewing}</div>}
      </div>
      <div className="pc-inf">
        <div className="pc-nm">{p.name}</div>
        <div className="pc-or">{p.origin}</div>
        <div className="pc-stars">{'★★★★★'}</div>
        <div className="pc-ft">
          <div>
            <span className="pc-pr">{fmt(p.pr, cur)}</span>
            <span className="pc-un">{unit}</span>
          </div>
          {qty === 0 ? (
            <button className={`add-btn${added ? ' ok' : ''}`} onClick={add}>
              {added
                ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                : <>{t.prod_add}</>}
            </button>
          ) : (
            <div className="qc">
              <button className="qb" onClick={() => { if (qty <= minQ) remove(idx); else setQ(idx, qty - 1); }}>−</button>
              <input
                className="qi"
                type="number"
                min={minQ}
                max={maxQ}
                value={inputVal !== '' ? inputVal : qty}
                onFocus={() => setInputVal(String(qty))}
                onChange={e => setInputVal(e.target.value)}
                onBlur={() => {
                  const v = parseInt(inputVal, 10);
                  if (!isNaN(v)) {
                    if (v < minQ) remove(idx);
                    else setQ(idx, v);
                  }
                  setInputVal('');
                }}
                onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
              />
              <span className="qi-unit">{unit}</span>
              <button className="qb" onClick={() => setQ(idx, qty + 1)}>+</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ======================================================================
   FOOTER
====================================================================== */
function Footer({ t, onPage }) {
  const [email, setEmail] = useState('');
  const [ok, setOk] = useState(false);
  const navLinks = [
    { k: 'home', l: t.nav_home }, { k: 'catalog', l: t.nav_catalog },
    { k: 'delivery', l: t.nav_delivery }, { k: 'wholesale', l: t.nav_wholesale },
    { k: 'blog', l: t.nav_blog }, { k: 'about', l: t.nav_about }, { k: 'contact', l: t.nav_contact },
  ];
  return (
    <footer className="foot">
      <div className="wrap">
        <div className="foot-g">
          <div>
            <button className="foot-logo" onClick={() => onPage('home')}>
              <div className="foot-li"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8fba8f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C6 2 3 7 3 12c0 3 1.5 5.5 4 7M12 2c6 0 9 5 9 10 0 3-1.5 5.5-4 7M12 2v20M7 7c2 1 4 3 5 5M17 7c-2 1-4 3-5 5"/></svg></div>
              Bionerika Agency
            </button>
            <p className="foot-desc">{t.foot_desc}</p>
            <div className="soc">
              {[
                <svg key="fb" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>,
                <svg key="ig" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>,
                <svg key="yt" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.97C18.88 4 12 4 12 4s-6.88 0-8.59.45A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="currentColor" stroke="none"/></svg>,
                <svg key="tg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13"/><path d="M22 2L15 22 11 13 2 9l20-7z"/></svg>
              ].map((icon, i) => <button key={i} className="sb-ico">{icon}</button>)}
            </div>
          </div>
          <div>
            <div className="foot-h">{t.foot_nav}</div>
            {navLinks.map(({ k, l }) => <button key={k} className="fl" onClick={() => onPage(k)}>{l}</button>)}
          </div>
          <div>
            <div className="foot-h">{t.foot_cats}</div>
            {(t.cats || []).filter(c => c.k !== 'all').map(c => (
              <button key={c.k} className="fl" onClick={() => onPage('catalog')}>{c.l}</button>
            ))}
          </div>
          <div>
            <div className="foot-h">{t.foot_nl}</div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,.4)', lineHeight: 1.75, marginBottom: 8 }}>{t.foot_nl_desc}</p>
            {ok ? (
              <div style={{ color: 'var(--lime)', fontSize: 14, padding: '10px 0' }}>{t.foot_nl_ok}</div>
            ) : (
              <div className="nl-sub">
                <input className="nl-in" placeholder={t.foot_nl_ph} value={email} onChange={e => setEmail(e.target.value)} type="email"/>
                <button className="nl-btn" onClick={async () => { if (!email) return; await sendEmail("newsletter", { email }); setOk(true); }}>{t.foot_nl_btn}</button>
              </div>
            )}
          </div>
        </div>
        <div className="foot-bot">
          <span>{t.foot_copy}</span>
          <div style={{ display: 'flex', gap: 14 }}>
            <button className="fl" style={{ padding: 0 }}>{t.foot_privacy}</button>
            <button className="fl" style={{ padding: 0 }}>{t.foot_terms}</button>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ======================================================================
   PAGE: HOME
====================================================================== */
function Home({ t, cur, cart, setCart, onPage }) {
  const [cat, setCat] = useState('all');
  useReveal();
  const filtered = (t.products || []).filter((_, i) => cat === 'all' || CATS_KEY[i] === cat);

  return (
    <div className="page-wrap">
      {/* TICKER */}
      <div className="mq">
        <div className="mq-track">
          {[...(t.ticker || []), ...(t.ticker || [])].map((item, i) => (
            <div key={i} className="mq-item">{item}<span className="mq-dot"/></div>
          ))}
        </div>
      </div>

      {/* HERO */}
      <section className="hero">
        <div className="hero-in">
          <div className="hero-ct">
            <div className="hero-ey"><Ico k="leaf" size={14}/> {t.hero_eyebrow}</div>
            <h1 className="hero-h1">{t.hero_h1a}<br/><em>{t.hero_h1b}</em><br/>{t.hero_h1c}</h1>
            <p className="hero-sub">{t.hero_sub}</p>
            <div className="hero-btns">
              <button className="btn" onClick={() => onPage('order')}>{t.hero_cta1}</button>
              <button className="btn-o" onClick={() => onPage('catalog')}>{t.hero_cta2}</button>
            </div>
            <div className="hero-stats">
              {[[t.hero_s1n, t.hero_s1l],[t.hero_s2n, t.hero_s2l],[t.hero_s3n, t.hero_s3l]].map(([n, l]) => (
                <div key={l}><div className="stn">{n}</div><div className="stl">{l}</div></div>
              ))}
            </div>
          </div>
          <div className="hero-vis">
            <div className="h-img-wrap">
              <img className="h-hero-img" src="https://images.unsplash.com/photo-1543362906-acfc16c67564?w=560&h=620&fit=crop&crop=center" alt="" />
              <div className="fc fc1">
                <span className="fc-ico"><Ico k="truck" size={18}/></span>
                <div><div className="fc-l">{t.hero_fc1l}</div><div className="fc-v">{t.hero_fc1v}</div></div>
              </div>
              <div className="fc fc2">
                <span className="fc-ico"><Ico k="star" size={18}/></span>
                <div><div className="fc-l">{t.hero_fc2l}</div><div className="fc-v">{t.hero_fc2v}</div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES STRIP */}
      <div className="strip">
        <div className="wrap">
          <div className="srv-g">
            {(t.srv || []).map(([ico, tt, sb]) => (
              <div key={tt} className="srv-i">
                <div className="srv-ico"><Ico k={ico} size={22}/></div>
                <div><div className="srv-tt">{tt}</div><div className="srv-sb">{sb}</div></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PRODUCTS */}
      <section className="section pr-sec">
        <div className="wrap">
          <div className="pr-hd">
            <div className="reveal">
              <span className="ey">{t.prod_eyebrow}</span>
              <h2 className="h2">{t.prod_title} <em>{t.prod_italic}</em></h2>
            </div>
            <button className="val" onClick={() => onPage('catalog')}>{t.prod_link}</button>
          </div>
          <div className="cat-tabs">
            {(t.cats || []).map(c => (
              <button key={c.k} className={`ct${cat === c.k ? ' on' : ''}`} onClick={() => setCat(c.k)}>{c.l}</button>
            ))}
          </div>
          <div className="pgrid">
            {filtered.slice(0, 12).map((p, i) => {
              const origIdx = (t.products || []).indexOf(p);
              return <PCard key={origIdx} p={p} idx={origIdx} t={t} cur={cur} cart={cart} setCart={setCart} delay={i * 0.04}/>;
            })}
          </div>
        </div>
      </section>

      {/* HOW WE WORK */}
      <section className="section how-sec">
        <div className="wrap">
          <div className="reveal" style={{ textAlign: 'center', marginBottom: 0 }}>
            <span className="ey">{t.how_eyebrow}</span>
            <h2 className="h2">{t.how_title} <em>{t.how_italic}</em></h2>
          </div>
          <div className="how-steps">
            {(t.how_steps || []).map(([ico, title, desc], i) => (
              <div key={title} className="hs reveal" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="hs-ico"><Ico k={ico} size={28}/></div>
                <div><div className="hs-t">{title}</div><div className="hs-d">{desc}</div></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BENTO */}
      <section className="section bento-sec">
        <div className="wrap">
          <div className="reveal">
            <span className="ey">{t.prod_eyebrow}</span>
            <h2 className="h2">{t.bento_title} <em>{t.bento_italic}</em></h2>
          </div>
          <div className="bento-g">
            {[['bc1 bg1','leaf'],['bc2 bg2','tomato'],['bc3 bg3','flower'],['bc4 bg4','lemon'],['bc5 bg5','berry']].map(([cls, ico], i) => {
              const b = (t.bento || [])[i] || {};
              return (
                <div key={cls} className={`bc ${cls}`} onClick={() => onPage('catalog')}>
                  <div className="bc-bg"><Ico k={ico} size={110}/></div>
                  <div className="bc-ov"/>
                  <div className="bc-ct">
                    <div className="bc-tag">{b.tag}</div>
                    <div className="bc-ttl">{b.title}</div>
                    <div className="bc-cta">{b.cta}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ADVANTAGES */}
      <section className="section" style={{ background: 'var(--parchment)' }}>
        <div className="wrap">
          <div className="reveal">
            <span className="ey">{t.adv_eyebrow}</span>
            <h2 className="h2">{t.adv_title} <em>{t.adv_italic}</em></h2>
          </div>
          <div className="adv-g">
            {(t.adv || []).map(([ico, tt, tx], i) => (
              <div key={tt} className="adv-c reveal" style={{ animationDelay: `${i * 0.08}s` }}>
                <div className="adv-ico"><Ico k={ico} size={28}/></div>
                <div className="adv-tt">{tt}</div>
                <div className="adv-tx">{tx}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS BAND */}
      <div className="sb">
        <div className="wrap">
          <div className="sb-g">
            {(t.stats_band || []).map(([n, l], i) => (
              <div key={l} className="sb-i reveal" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="sb-n">{n}</div>
                <div className="sb-l">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BLOG */}
      <section className="section">
        <div className="wrap">
          <div className="pr-hd reveal">
            <div><span className="ey">{t.blog_eyebrow}</span><h2 className="h2">{t.blog_title} <em>{t.blog_italic}</em></h2></div>
            <button className="val" onClick={() => onPage('blog')}>{t.bp_all} {'>'}</button>
          </div>
          <div className="blog-g">
            {(t.blog || []).map((b, i) => (
              <div key={i} className="blog-c reveal" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="blog-img" style={{ background: ['linear-gradient(135deg,#c5e8b5,#72a86e)', 'linear-gradient(135deg,#f9c5b5,#e06b3a)', 'linear-gradient(135deg,#d9c5f9,#9b59b6)'][i] }}>
                  {['', '', ''][i]}
                </div>
                <div className="blog-bod">
                  <span className="blog-cat">{b.cat}</span>
                  <div className="blog-t">{b.title}</div>
                  <div className="blog-meta">
                    <span>{b.date}</span><span>·</span><span>{b.read}</span>
                    <button className="blog-rd" onClick={() => onPage('blog')}>{t.blog_read}</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="section tst-sec">
        <div className="wrap">
          <div className="reveal" style={{ textAlign: 'center' }}>
            <span className="ey">{t.test_eyebrow}</span>
            <h2 className="h2">{t.test_title} <em>{t.test_italic}</em></h2>
          </div>
          <div className="tst-g">
            {(t.test || []).map((item, i) => (
              <div key={i} className="tst-c reveal" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="tst-stars">{'?'.repeat(item.stars)}</div>
                <div className="tst-tx">"{item.text}"</div>
                <div className="tst-au">
                  <div className="tst-av"><Ico k={item.emoji || 'person'} size={22}/></div>
                  <div><div className="tst-nm">{item.name}</div><div className="tst-ro">{item.role}</div></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRUST CTA */}
      <section className="trust-sec">
        <div className="wrap">
          <h2 className="trust-h">{t.trust_title}</h2>
          <p className="trust-s">{t.trust_sub}</p>
          <div className="trust-bt">
            <button className="btn-w" onClick={() => onPage('order')}>{t.trust_cta1}</button>
            <button className="btn-ow" onClick={() => onPage('contact')}>{t.trust_cta2}</button>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ======================================================================
   PAGE: CATALOG
====================================================================== */
function Catalog({ t, cur, cart, setCart, lang = 'en' }) {
  const [cat, setCat] = useState('all');
  const [sort, setSort] = useState('def');
  useReveal();
  const filtered = useMemo(() => {
    let list = (t.products || []).map((p, i) => ({ p, i })).filter(({ i }) => cat === 'all' || CATS_KEY[i] === cat);
    if (sort === 'asc') list.sort((a, b) => a.p.pr - b.p.pr);
    if (sort === 'desc') list.sort((a, b) => b.p.pr - a.p.pr);
    return list;
  }, [cat, sort, t]);
  return (
    <div className="page-wrap">
      <div className="ph-forest" style={{ paddingTop: 'calc(var(--nav-h) + clamp(40px,6vw,60px))' }}>
        <div className="wrap">
          <span className="ey" style={{ color: 'var(--lime)' }}>{t.prod_eyebrow}</span>
          <h1 className="ph-h1" style={{ color: '#fff' }}>{t.prod_title} <em style={{ color: 'var(--lime)' }}>{t.prod_italic}</em></h1>
          <p style={{ color: 'rgba(255,255,255,.65)', fontSize: 15, marginTop: 8 }}>{(t.products || []).length} {lang==='ua'?'товарів':lang==='ru'?'товаров':'products'}</p>
        </div>
      </div>
      <div style={{ background: 'var(--cream)', borderBottom: '1px solid var(--border)', padding: '16px 0', position: 'sticky', top: 'var(--nav-h)', zIndex: 50 }}>
        <div className="wrap" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div className="cat-tabs" style={{ margin: 0 }}>
            {(t.cats || []).map(c => <button key={c.k} className={`ct${cat === c.k ? ' on' : ''}`} onClick={() => setCat(c.k)}>{c.l}</button>)}
          </div>
          <select value={sort} onChange={e => setSort(e.target.value)} style={{ padding: '8px 14px', borderRadius: 50, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--muted)', fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 500, cursor: 'pointer', outline: 'none' }}>
            <option value="def">{lang==='ua'?'За замовчуванням':lang==='ru'?'По умолчанию':'Default'}</option>
            <option value="asc">{lang==='ua'?'Ціна ^':lang==='ru'?'Цена ^':'Price ^'}</option>
            <option value="desc">{lang==='ua'?'Ціна v':lang==='ru'?'Цена v':'Price v'}</option>
          </select>
        </div>
      </div>
      <div className="section" style={{ background: 'var(--white)' }}>
        <div className="wrap">
          <div className="pgrid">
            {filtered.map(({ p, i }, idx) => <PCard key={i} p={p} idx={i} t={t} cur={cur} cart={cart} setCart={setCart} delay={idx * 0.03}/>)}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ======================================================================
   PAGE: DELIVERY
====================================================================== */
function Delivery({ t, lang = 'en' }) {
  const [openFaq, setOpenFaq] = useState(null);
  useReveal();
  return (
    <div className="page-wrap">
      <div className="ph-forest" style={{ paddingTop: 'calc(var(--nav-h) + clamp(40px,6vw,60px))' }}>
        <div className="wrap">
          <span className="ey" style={{ color: 'var(--lime)' }}>{t.del_eyebrow}</span>
          <h1 className="ph-h1" style={{ color: '#fff' }}>{t.del_title} <em style={{ color: 'var(--lime)' }}>{t.del_italic}</em></h1>
          <p style={{ color: 'rgba(255,255,255,.65)', fontSize: 15, marginTop: 8 }}>{t.del_sub}</p>
        </div>
      </div>
      <section className="section">
        <div className="wrap">
          {/* Zones table */}
          <div className="reveal" style={{ marginBottom: 56 }}>
            <span className="ey">{t.del_zone_title}</span>
            <div style={{ overflowX: 'auto', marginTop: 20 }}>
            <table className="dz-table">
              <thead><tr>{(t.del_zone_h || []).map(h => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {(t.del_zones || []).map((z, i) => (
                  <tr key={i}><td>{z.zone}</td><td><strong>{z.time}</strong></td><td style={{ color: 'var(--moss)', fontWeight: 600 }}>{z.price}</td><td>{z.min}</td></tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
          {/* How it works visual */}
          <div className="reveal" style={{ marginBottom: 56 }}>
            <span className="ey">{t.how_eyebrow}</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 16, marginTop: 28 }}>
              {(lang==='ua'
                ? [['','Пакування'],['','Охолодження'],['','Завантаження'],['','У дорозі'],['','До вас!']]
                : lang==='ru'
                ? [['','Упаковка'],['','Охлаждение'],['','Загрузка'],['','В пути'],['','К вам!']]
                : [['','Packing'],['','Cooling'],['','Loading'],['','On the way'],['','To you!']]
              ).map(([ico,l]) => (
                <div key={l} style={{ textAlign:'center', background:'var(--cream)', borderRadius:16, padding:'24px 12px', border:'1px solid var(--border)' }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>{ico}</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
          {/* FAQ */}
          <div className="reveal">
            <span className="ey">{t.del_faq_title}</span>
            <div style={{ marginTop: 24 }}>
              {(t.del_faq || []).map(([q, a], i) => (
                <div key={i} className="faq-item">
                  <div className="faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                    <span>{q}</span>
                    <span className={`faq-ico${openFaq === i ? ' op' : ''}`}>+</span>
                  </div>
                  {openFaq === i && <div className="faq-a">{a}</div>}
                </div>
              ))}
            </div>
          </div>
          {/* Hours banner */}
          <div className="reveal" style={{ marginTop: 48, background: 'linear-gradient(135deg,var(--forest),var(--moss))', borderRadius: 24, padding: '28px 32px', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ color: '#fff' }}><Ico k="truck" size={40}/></div>
            <div>
              <div style={{ color: 'rgba(255,255,255,.6)', fontSize: 12, fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>{lang==='ua'?'Графік доставки':lang==='ru'?'График доставки':'Delivery schedule'}</div>
              <div style={{ color: '#fff', fontSize: 20, fontWeight: 600 }}>{t.del_hours}</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ======================================================================
   PAGE: WHOLESALE — with trading-terminal order-flow chart
====================================================================== */

/* Seeded PRNG so demo chart looks consistent (Mulberry32) */
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Build candlestick data from REAL orders only — zero fake/PRNG candles.
   Days with no real orders are skipped entirely so the chart stays honest.
   open  = previous real-day close (or same as close for the very first candle)
   close = that day's total revenue
   high/low = tight 1% wicks (we only have daily totals, not tick data)
   vol   = order count that day                                               */
function buildChartData(days, realByDay) {
  const data = [];
  const todayStart = new Date(); todayStart.setHours(0,0,0,0);
  let prevClose = null;
  for (let i = days - 1; i >= 0; i--) {
    const d   = new Date(todayStart);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    const rDay = realByDay[key];
    if (!rDay || rDay.count === 0) continue; // skip days without real orders
    const close  = rDay.total;
    const open   = prevClose !== null ? prevClose : close;
    const wRng   = Math.max(close * 0.008, Math.abs(close - open) * 0.08);
    const high   = Math.max(open, close) + wRng;
    const low    = Math.max(0, Math.min(open, close) - wRng);
    prevClose    = close;
    data.push({
      date: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
      o: Math.round(open), h: Math.round(high), l: Math.round(low), c: Math.round(close),
      v: rDay.count, real: true,
    });
  }
  return data;
}

/* Monthly aggregation for 6M / 1Y: only months with ≥1 real order day */
function buildMonthlyData(numMonths, rawByDay) {
  const data  = [];
  const today = new Date();
  let prevClose = null;
  for (let m = numMonths - 1; m >= 0; m--) {
    const start = new Date(today.getFullYear(), today.getMonth() - m, 1);
    const year  = start.getFullYear();
    const month = start.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dayTotals = [], dayCounts = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      if (rawByDay[key] && rawByDay[key].count > 0) {
        dayTotals.push(rawByDay[key].total);
        dayCounts.push(rawByDay[key].count);
      }
    }
    if (dayTotals.length === 0) continue; // skip months with zero real orders
    const close = dayTotals[dayTotals.length - 1];
    const open  = prevClose !== null ? prevClose : dayTotals[0];
    const high  = Math.max(...dayTotals) * 1.01;
    const low   = Math.max(0, Math.min(...dayTotals) * 0.99);
    const vol   = dayCounts.reduce((a, b) => a + b, 0);
    prevClose   = close;
    data.push({
      date: start.toLocaleDateString('en', { month: 'short', year: '2-digit' }),
      o: Math.round(open), h: Math.round(high), l: Math.round(low), c: Math.round(close),
      v: vol, real: true,
    });
  }
  return data;
}

function Wholesale({ t, lang = 'en', cur }) {
  /* normalize any stored order total into the current display currency */
  const normAmt = (total, sym) => {
    if (!total) return 0;
    const symRate = { '$': CURRENCY.en.rate, '₴': CURRENCY.ua.rate };
    // Default to UAH when symbol is missing — safest assumption for this Ukrainian store
    const srcRate = (sym && sym in symRate) ? symRate[sym] : CURRENCY.ua.rate;
    return srcRate === cur.rate ? +total : Math.round((+total / srcRate) * cur.rate);
  };

  const [form, setForm]               = useState({ name:'', company:'', email:'', phone:'', volume:'' });
  const [sent, setSent]               = useState(false);
  const [globalStats, setGlobalStats] = useState(null);
  const [rawByDay, setRawByDay]       = useState({});
  const [hovered, setHovered]         = useState(null);
  const [period, setPeriod]           = useState(10); // default = last 10 days
  const [activity, setActivity]       = useState([]);
  const [flashGen, setFlashGen]       = useState(0);
  const [lastTs, setLastTs]           = useState(null);
  const [secAgo, setSecAgo]           = useState('');
  const [rtStatus, setRtStatus]       = useState('sync'); // 'sync' | 'live' | 'poll'
  const [rlsBlocked, setRlsBlocked]   = useState(false);
  const [catStats, setCatStats]       = useState({});
  const [lastOrder, setLastOrder]     = useState(null);
  const [orderList, setOrderList]     = useState([]); // individual order totals ≥ $5, sorted asc
  const [chartView, setChartView]     = useState('candle'); // 'candle' | 'dist'
  const [hovDist, setHovDist]         = useState(null);
  const [hovDay, setHovDay]           = useState(null);   // hovered index in Panel 2 chart
  const [hovDaySvgY, setHovDaySvgY]   = useState(0);     // cursor Y in SVG coords for tooltip
  const [dailyCatAmt, setDailyCatAmt] = useState({}); // { 'YYYY-MM-DD': { cat: amtUAH } }
  const [buyerStats, setBuyerStats]   = useState({}); // { uid: { n, revenue } }
  const [hovPanel, setHovPanel]       = useState(null); // 1 | 2 | null
  const [hovKpi, setHovKpi]           = useState(null); // 0-3 | null
  const prevCountRef                  = useRef(null);
  useReveal();

  /* ── initial bulk load ── */
  useEffect(() => {
    (async () => {
      let orders = [];
      try { orders = await sb.getAllOrders(); } catch (e) {
        console.error('[Wholesale] getAllOrders error:', e);
      }
      if (orders.length === 0) {
        console.warn('[Wholesale] No orders returned from Supabase.\n' +
          'If orders exist, RLS is blocking access.\n' +
          'Fix: run the SQL from src/services/supabase.js (see getAllOrders comment).');
        setRlsBlocked(true);
      } else {
        setRlsBlocked(false);
      }
      prevCountRef.current = orders.length; // set BEFORE async setState so polling sees correct count
      const byDay = {};
      const uids  = new Set();
      orders.forEach(o => {
        if (!o.created_at) return;
        const key = o.created_at.split('T')[0];
        if (!byDay[key]) byDay[key] = { total:0, count:0 };
        byDay[key].total += normAmt(o.total, o.currency_symbol);
        byDay[key].count++;
        if (o.uid) uids.add(o.uid);
      });
      const total   = orders.length;
      const revenue = orders.reduce((s, o) => s + normAmt(o.total, o.currency_symbol), 0);
      const buyers  = uids.size;
      const avg     = total > 0 ? Math.round(revenue / total) : 0;
      const today   = new Date().toISOString().split('T')[0];
      const yest    = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const tV = byDay[today]?.total || 0;
      const yV = byDay[yest]?.total  || 0;
      const chg = yV > 0 ? +((tV - yV) / yV * 100).toFixed(2) : 0;
      setRawByDay(byDay);
      setGlobalStats({ total, revenue, buyers, avg, chg });
      // Build category stats from items_text in each order
      const catC = {}; let latestO = null;
      orders.forEach(o => {
        if (o.items_text) {
          Object.entries(parseItemsCat(o.items_text)).forEach(([cat, qty]) => {
            catC[cat] = (catC[cat] || 0) + qty;
          });
          if (!latestO || new Date(o.created_at) > new Date(latestO.created_at)) latestO = o;
        }
      });
      setCatStats(catC);
      if (latestO) setLastOrder({ id: latestO.order_number || '—', items: latestO.items_text || '', ts: new Date(latestO.created_at).getTime() });
      setOrderList(orders
        .filter(o => o.created_at && normAmt(o.total, o.currency_symbol) >= 5)
        .map(o => ({
          id:   o.order_number || ('#' + String(o.id || Math.random().toString(36).slice(2,7)).toUpperCase()),
          amt:  normAmt(o.total, o.currency_symbol),
          ts:   new Date(o.created_at).getTime(),
          date: o.created_at.split('T')[0],
          items: o.items_text || '',
          status: o.status || 'done',
        }))
        .sort((a, b) => a.ts - b.ts)
      );
      // Build per-day per-category spending (UAH base, no currency conversion)
      const catAmtByDay = {};
      orders.forEach(o => {
        if (!o.items_text || !o.created_at) return;
        const key = o.created_at.split('T')[0];
        Object.entries(parseCatAmts(o.items_text)).forEach(([cat, uah]) => {
          if (!catAmtByDay[key]) catAmtByDay[key] = {};
          catAmtByDay[key][cat] = (catAmtByDay[key][cat] || 0) + uah;
        });
      });
      setDailyCatAmt(catAmtByDay);
      // Build per-buyer analytics (who ordered how much)
      const byBuyer = {};
      orders.forEach(o => {
        if (!o.uid) return;
        const a = normAmt(o.total, o.currency_symbol);
        if (!byBuyer[o.uid]) byBuyer[o.uid] = { n: 0, revenue: 0 };
        byBuyer[o.uid].n++;
        byBuyer[o.uid].revenue += a;
      });
      setBuyerStats(byBuyer);
      // prevCountRef already set above (before setters) so polling doesn't re-process these orders
    })();
  }, []);

  /* ── merge a single new order into existing state ── */
  const handleNewOrder = useCallback((order) => {
    const key = (order.created_at || new Date().toISOString()).split('T')[0];
    const amt = normAmt(order.total, order.currency_symbol);
    setRawByDay(prev => {
      const d = prev[key] || { total:0, count:0 };
      return { ...prev, [key]: { total: d.total + amt, count: d.count + 1 } };
    });
    setGlobalStats(prev => {
      if (!prev) return prev;
      const nr = prev.revenue + amt;
      const nt = prev.total + 1;
      return { ...prev, total: nt, revenue: nr, avg: Math.round(nr / nt) };
    });
    setActivity(prev => [{
      id:  order.order_number || ('#' + Math.random().toString(36).slice(2, 8).toUpperCase()),
      amt, ts: Date.now(),
    }, ...prev].slice(0, 7));
    setLastTs(Date.now());
    setFlashGen(g => g + 1);
    setBuyerStats(prev => {
      if (!order.uid) return prev;
      const b = prev[order.uid] || { n: 0, revenue: 0 };
      return { ...prev, [order.uid]: { n: b.n + 1, revenue: b.revenue + amt } };
    });
    if (amt >= 5) setOrderList(prev => [...prev, {
      id:   order.order_number || ('#' + Math.random().toString(36).slice(2, 8).toUpperCase()),
      amt,  ts: Date.now(), date: key,
      items: order.items_text || '',
      status: order.status || 'pending',
    }]);
    if (order.items_text) {
      setCatStats(prev => {
        const next = { ...prev };
        Object.entries(parseItemsCat(order.items_text)).forEach(([cat, qty]) => {
          next[cat] = (next[cat] || 0) + qty;
        });
        return next;
      });
      setLastOrder({ id: order.order_number || ('#'+Math.random().toString(36).slice(2,8).toUpperCase()), items: order.items_text, ts: Date.now() });
      setDailyCatAmt(prev => {
        const amts = parseCatAmts(order.items_text);
        const next = { ...prev };
        Object.entries(amts).forEach(([cat, uah]) => {
          if (!next[key]) next[key] = {};
          next[key] = { ...next[key], [cat]: (next[key][cat] || 0) + uah };
        });
        return next;
      });
    }
  }, []);

  /* ── realtime subscription (Supabase) + polling fallback every 20 s ── */
  useEffect(() => {
    /* If no RT event arrives within 6 s, switch indicator to 'poll' */
    const syncTimer = setTimeout(() => setRtStatus(s => s === 'sync' ? 'poll' : s), 6000);

    /* Supabase Realtime — requires Replication enabled for 'orders' table */
    let rtUnsub = () => {};
    try {
      rtUnsub = sb.subscribeOrders(order => {
        setRtStatus('live');
        handleNewOrder(order);
      });
    } catch (_) { setRtStatus('poll'); }

    /* Universal polling fallback — works even without Realtime */
    const poll = setInterval(async () => {
      try {
        const orders = await sb.getAllOrders();
        const pc = prevCountRef.current;
        if (pc === null) {
          // First successful poll after failed initial load — bootstrap everything
          prevCountRef.current = orders.length;
          return;
        }
        if (orders.length > pc) {
          // New orders are at the end (sorted ASC by created_at)
          orders.slice(pc).forEach(handleNewOrder);
          prevCountRef.current = orders.length;
        }
      } catch (_) {}
    }, 10000); // every 10 s

    return () => { rtUnsub(); clearInterval(poll); clearTimeout(syncTimer); };
  }, [handleNewOrder]);

  /* ── "X s ago" ticker ── */
  useEffect(() => {
    if (!lastTs) return;
    const iv = setInterval(() => {
      const s = Math.round((Date.now() - lastTs) / 1000);
      setSecAgo(s < 60 ? `${s}s ago` : `${Math.round(s / 60)}m ago`);
    }, 1000);
    return () => clearInterval(iv);
  }, [lastTs]);

  /* ── chart data ── */
  // Compute span from the very first real order to today (for ALL mode)
  const allRealKeys = Object.keys(rawByDay).filter(k => rawByDay[k].count > 0).sort();
  const allSpanDays = allRealKeys.length > 0
    ? Math.max(1, Math.ceil((Date.now() - new Date(allRealKeys[0]).getTime()) / 86400000) + 1)
    : 1;
  const isMonthly     = period >= 182;
  const effectiveDays = period === 0 ? allSpanDays : period;
  const chartData = useMemo(
    () => isMonthly
      ? buildMonthlyData(period >= 365 ? 12 : 6, rawByDay)
      : buildChartData(effectiveDays, rawByDay),
    [period, rawByDay, effectiveDays]
  );
  const chartEmpty = chartData.length === 0;

  /* ── per-order price spectrum (filtered by period) ── */
  const filteredOrders = useMemo(() => {
    if (!orderList.length) return [];
    if (period === 0) return orderList;
    const cutoff = new Date(Date.now() - period * 86400000).toISOString().split('T')[0];
    return orderList.filter(o => o.date >= cutoff);
  }, [orderList, period]);

  /* ── SVG layout constants ── */
  const VBW = 1100, VBH = 340;
  const ML = 68, MR = 14, MT = 16, MB = 28;
  const PH = 210, VG = 14, VOLH = 56;
  const plotW   = VBW - ML - MR;
  const pricY2  = MT + PH;
  const volY1   = pricY2 + VG;
  const volY2   = volY1 + VOLH;
  const allH    = chartData.map(d => d.h), allL = chartData.map(d => d.l);
  const pMax    = chartData.length > 0 ? Math.max(...allH) * 1.025 : 100;
  const pMin    = chartData.length > 0 ? Math.max(0, Math.min(...allL) * 0.975) : 0;
  const pRng    = (pMax - pMin) || 1;
  const maxVol  = Math.max(...chartData.map(d => d.v)) || 1;
  const slot    = plotW / Math.max(chartData.length, 1);
  const bw      = Math.max(3, slot * 0.62);
  const py      = p => MT + (pMax - p) / pRng * PH;
  const cx      = i => ML + i * slot + slot / 2;
  const vy      = v => volY2 - (v / maxVol) * VOLH;
  const gridPs  = Array.from({ length: 5 }, (_, i) => pMin + (i / 4) * pRng);
  const gs      = globalStats || { total:'…', revenue:'…', buyers:'…', avg:'…', chg: 0 };
  const chgUp   = gs.chg >= 0;
  const hov     = hovered !== null ? chartData[hovered] : null;
  const fmtM    = n => {
    const sym = cur?.symbol || '$';
    return typeof n === 'number' ? (n >= 1000 ? sym + (n / 1000).toFixed(1) + 'k' : sym + n) : n;
  };
  const periods = [{ v:0, l:'ALL' }, { v:10, l:'10D' }, { v:7, l:'1W' }, { v:14, l:'2W' }, { v:30, l:'1M' }, { v:90, l:'3M' }, { v:182, l:'6M' }, { v:365, l:'1Y' }];

  /* ── real category stats derived from parsed order items_text ── */
  const catTotal = Object.values(catStats).reduce((s, v) => s + v, 0);
  const realCats = [
    { key:'vegetables', name:lang==='ua'?'Овочі':lang==='ru'?'Овощи':'Vegetables', col:'#4ade80' },
    { key:'fruits',     name:lang==='ua'?'Фрукти':lang==='ru'?'Фрукты':'Fruits',   col:'#fb923c' },
    { key:'flowers',    name:lang==='ua'?'Квіти':lang==='ru'?'Цветы':'Flowers',    col:'#f472b6' },
    { key:'greens',     name:lang==='ua'?'Зелень':lang==='ru'?'Зелень':'Greens',   col:'#a3e635' },
    { key:'exotic',     name:lang==='ua'?'Екзотик':lang==='ru'?'Экзотик':'Exotic', col:'#818cf8' },
  ].map(c => ({
    ...c,
    count: catStats[c.key] || 0,
    pct:   catTotal > 0 ? +((catStats[c.key] || 0) / catTotal * 100).toFixed(1) : 0,
  }));
  /* ── status indicator ── */
  const rtDot = rtStatus === 'live'
    ? { col:'#22c55e', label:'LIVE',     anim:'termPulse 2s ease-in-out infinite' }
    : rtStatus === 'poll'
    ? { col:'#f59e0b', label:'POLLING',  anim:'none' }
    : { col:'#60a5fa', label:'SYNC',     anim:'termPulse 1s ease-in-out infinite' };

  const todayKey   = new Date().toISOString().split('T')[0];
  const todayCount = rawByDay[todayKey]?.count || 0;

  /* ── monthly dynamics — last 6 months (for Panel 1) ── */
  const monthlyData = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 6 }, (_, mi) => {
      const d        = new Date(today.getFullYear(), today.getMonth() - (5 - mi), 1);
      const yr       = d.getFullYear(), mo = d.getMonth();
      const daysInMo = new Date(yr, mo + 1, 0).getDate();
      let orders = 0, revenue = 0;
      const cats = {};
      for (let day = 1; day <= daysInMo; day++) {
        const key = `${yr}-${String(mo+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        if (rawByDay[key]) { orders += rawByDay[key].count; revenue += rawByDay[key].total; }
        Object.entries(dailyCatAmt[key] || {}).forEach(([cat, uah]) => { cats[cat] = (cats[cat]||0) + uah; });
      }
      return { label: d.toLocaleDateString('en', { month: 'short' }), orders, revenue, cats };
    });
  }, [rawByDay, dailyCatAmt]);

  /* ── last 10 days per-category spending (for Panel 2) ── */
  const last10Days = useMemo(() => {
    const today = new Date(); today.setHours(0,0,0,0);
    return Array.from({ length: 10 }, (_, i) => {
      const d   = new Date(today); d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const cats = dailyCatAmt[key] || {};
      const totalUAH = Object.values(cats).reduce((s, v) => s + v, 0);
      return {
        key, isToday: i === 0, totalUAH, cats,
        label: d.toLocaleDateString(lang==='ua'||lang==='ru'?'ru-RU':'en-US', { day:'numeric', month:'short' }),
        orders: rawByDay[key]?.count || 0,
      };
    });
  }, [dailyCatAmt, rawByDay, lang]);

  return (
    <div className="page-wrap">
      <div className="ph-cream" style={{ paddingTop:'calc(var(--nav-h) + clamp(40px,6vw,60px))' }}>
        <div className="wrap">
          <span className="ey">{t.ws_eyebrow}</span>
          <h1 className="ph-h1">{t.ws_title} <em>{t.ws_italic}</em></h1>
          <p className="sub" style={{ marginTop:8 }}>{t.ws_sub}</p>
        </div>
      </div>

      <section className="section">
        <div className="wrap">

          {/* ═══════════════════════════════════════
              RECENT ORDERS — HORIZONTAL SCROLL
          ═══════════════════════════════════════ */}
          {orderList.length > 0 && (() => {
            const reversed  = [...orderList].reverse().slice(0, 40);
            const yestKey2  = new Date(Date.now() - 86400000).toISOString().split('T')[0];
            const todayAmt2 = rawByDay[todayKey]?.total || 0;
            const yestAmt2  = rawByDay[yestKey2]?.total || 0;
            const dayTrend  = todayAmt2 > yestAmt2 ? 'up' : todayAmt2 < yestAmt2 && yestAmt2 > 0 ? 'down' : 'flat';
            const dayPct    = yestAmt2 > 0 ? Math.abs(Math.round((todayAmt2 - yestAmt2) / yestAmt2 * 100)) : null;
            return (
              <div className="reveal" style={{ marginBottom:28 }}>
                {/* header */}
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14, flexWrap:'wrap' }}>
                  <span style={{ fontSize:15, fontWeight:700, color:'#1a2e1a', letterSpacing:'.2px' }}>
                    {lang==='ua'?'Замовлення':lang==='ru'?'Заказы':'Orders'}
                  </span>
                  {/* day-over-day trend badge */}
                  <span style={{
                    display:'inline-flex', alignItems:'center', gap:5, padding:'4px 12px',
                    borderRadius:20, fontSize:12, fontWeight:700,
                    background: dayTrend==='up'?'rgba(74,124,89,0.1)':dayTrend==='down'?'rgba(184,92,58,0.1)':'rgba(26,46,26,0.06)',
                    color:       dayTrend==='up'?'#4a7c59':dayTrend==='down'?'#b85c3a':'#6b7c6b',
                    border:     `1px solid ${dayTrend==='up'?'rgba(74,124,89,0.25)':dayTrend==='down'?'rgba(184,92,58,0.22)':'rgba(26,46,26,0.12)'}`,
                  }}>
                    <span style={{ fontSize:11 }}>{dayTrend==='up'?'▲':dayTrend==='down'?'▼':'—'}</span>
                    <span>{dayPct !== null ? `${dayPct}% ${lang==='ua'?'за добу':lang==='ru'?'за сутки':'24h'}` : (lang==='ua'?'сьогодні':lang==='ru'?'сегодня':'today')}</span>
                  </span>
                  <span style={{ fontSize:12, color:'rgba(26,46,26,0.4)', fontFamily:'monospace', marginLeft:'auto' }}>
                    {orderList.length} {lang==='ua'?'всього':lang==='ru'?'всего':'total'}
                  </span>
                </div>
                {/* horizontal scroll row */}
                <div style={{
                  display:'flex', gap:12, overflowX:'auto', paddingBottom:10,
                  scrollbarWidth:'thin', scrollbarColor:'rgba(26,46,26,0.15) transparent',
                  WebkitOverflowScrolling:'touch',
                }}>
                  {reversed.map((o, i) => {
                    const prevAmt2  = reversed[i + 1]?.amt;
                    const cardTrend = prevAmt2 !== undefined ? (o.amt > prevAmt2 ? 'up' : o.amt < prevAmt2 ? 'down' : 'flat') : 'flat';
                    const statusCol = o.status === 'done' ? '#4a7c59' : o.status === 'process' ? '#c47a3a' : '#6b7c6b';
                    const statusLabel = o.status === 'done'
                      ? (lang==='ua'?'Виконано':lang==='ru'?'Выполнен':'Done')
                      : o.status === 'process'
                      ? (lang==='ua'?'В процесі':lang==='ru'?'В процессе':'Processing')
                      : (lang==='ua'?'Очікує':lang==='ru'?'Ожидает':'Pending');
                    const isNew = (Date.now() - o.ts) < 120000; // < 2 min
                    return (
                      <div key={`${o.id}-${i}`} style={{
                        minWidth:172, maxWidth:172, background:'#fff', borderRadius:16,
                        padding:'14px 16px', flexShrink:0, cursor:'default',
                        border: isNew ? '1.5px solid rgba(74,124,89,0.45)' : '1px solid #e2ddd5',
                        boxShadow: isNew ? '0 0 0 3px rgba(74,124,89,0.08)' : '0 2px 12px rgba(26,46,26,0.05)',
                        transition:'transform .18s ease, box-shadow .18s ease',
                        animation: isNew ? 'feedIn 0.4s ease-out' : 'none',
                      }}
                        onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow='0 10px 28px rgba(26,46,26,0.13)'; }}
                        onMouseLeave={e=>{ e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow=isNew?'0 0 0 3px rgba(74,124,89,0.08)':'0 2px 12px rgba(26,46,26,0.05)'; }}
                      >
                        {/* top: order id + trend icon */}
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                          <span style={{ fontSize:10, color:'rgba(26,46,26,0.4)', fontFamily:'monospace', fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:110 }}>{o.id}</span>
                          <span style={{
                            fontSize:11, fontWeight:800, lineHeight:1, flexShrink:0,
                            color: cardTrend==='up'?'#4a7c59': cardTrend==='down'?'#b85c3a':'rgba(26,46,26,0.2)',
                          }}>{cardTrend==='up'?'▲':cardTrend==='down'?'▼':'—'}</span>
                        </div>
                        {/* amount */}
                        <div style={{ fontSize:22, fontWeight:700, color:'#1a2e1a', fontFamily:'monospace', letterSpacing:'-0.5px', lineHeight:1.1, marginBottom:5 }}>
                          {fmtM(o.amt)}
                        </div>
                        {/* items preview */}
                        {o.items ? (
                          <div style={{ fontSize:10, color:'#6b7c6b', marginBottom:7, lineHeight:1.38,
                            display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                            {o.items}
                          </div>
                        ) : <div style={{ marginBottom:7 }}/>}
                        {/* date + status */}
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                          <span style={{ fontSize:10, color:'rgba(26,46,26,0.3)', fontFamily:'monospace' }}>{o.date}</span>
                          <span style={{ fontSize:9, fontWeight:700, color:statusCol, letterSpacing:'.4px', textTransform:'uppercase' }}>{statusLabel}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* ═══════════════════════════════════════
              PANEL 1 — ORDER FLOW CANDLESTICK TERMINAL
          ═══════════════════════════════════════ */}
          <div className="reveal"
            onMouseEnter={() => setHovPanel(1)} onMouseLeave={() => setHovPanel(null)}
            style={{
              background:'#f7f4ee', borderRadius:24, overflow:'hidden',
              border: hovPanel===1 ? '1px solid #b8b2a6' : '1px solid #d4cfc6',
              boxShadow: hovPanel===1 ? '0 18px 56px rgba(26,46,26,0.16)' : '0 6px 36px rgba(26,46,26,0.08)',
              transition: 'box-shadow 0.35s ease, border-color 0.3s ease',
              marginBottom:20,
            }}>
            {/* title bar */}
            <div style={{ display:'flex', alignItems:'center', flexWrap:'wrap', gap:10, padding:'12px 22px', borderBottom:'1px solid #e2ddd5', background:'#ede9e0' }}>
              <div style={{ display:'flex', gap:6 }}>
                {['#ff5f57','#febc2e','#28c840'].map(c=><span key={c} style={{ width:11,height:11,borderRadius:'50%',background:c,display:'block' }}/>)}
              </div>
              <span style={{ color:'rgba(26,46,26,0.5)', fontSize:11, fontFamily:'monospace', letterSpacing:'1.2px', textTransform:'uppercase' }}>BIONERIKA · ORDER FLOW ANALYTICS</span>
              <span style={{ display:'flex', alignItems:'center', gap:5 }}>
                <span style={{ width:7,height:7,borderRadius:'50%',background:rtDot.col,display:'block',animation:rtDot.anim }}/>
                <span style={{ fontSize:10,color:rtDot.col,fontWeight:700,letterSpacing:'1px' }}>{rtDot.label}</span>
              </span>
              {todayCount>0&&<span style={{ fontSize:10,color:'rgba(26,46,26,0.4)',fontFamily:'monospace' }}>{todayCount} {lang==='ua'?'замовл. сьогодні':lang==='ru'?'заказов сегодня':'orders today'}</span>}
              <div style={{ display:'flex', gap:3, marginLeft:'auto', flexWrap:'wrap' }}>
                {periods.map(p=>(
                  <button key={p.v} onClick={()=>setPeriod(p.v)} style={{
                    padding:'3px 9px', borderRadius:6, border:'none', cursor:'pointer',
                    fontSize:11, fontFamily:'monospace', fontWeight:700,
                    background:period===p.v?'rgba(74,124,89,0.14)':'rgba(26,46,26,0.05)',
                    color:period===p.v?'#4a7c59':'#6b7c6b',
                    transition:'background 0.2s ease, color 0.18s ease',
                  }}>{p.l}</button>
                ))}
              </div>
            </div>

            {/* 4-column KPI strip */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', borderBottom:'1px solid #e2ddd5' }}>
              {[
                { lbl:lang==='ua'?'ВСЬОГО ЗАМОВЛЕНЬ':lang==='ru'?'ВСЕГО ЗАКАЗОВ':'TOTAL ORDERS',     val:gs.total,        sub:(typeof gs.chg==='number'&&Math.abs(gs.chg)<1000)?`${chgUp?'+':''}${gs.chg}% 24h`:chgUp?'↑ 24h':'↓ 24h', up:chgUp },
                { lbl:lang==='ua'?'ЗАГАЛЬНА ВИРУЧКА':lang==='ru'?'ОБЩАЯ ВЫРУЧКА':'TOTAL REVENUE',    val:fmtM(gs.revenue),sub:'', up:null },
                { lbl:lang==='ua'?'УНІКАЛЬНІ ПОКУПЦІ':lang==='ru'?'УНИКАЛЬНЫХ ПОКУПАТЕЛЕЙ':'UNIQUE BUYERS', val:gs.buyers, sub:'', up:null },
                { lbl:lang==='ua'?'СЕРЕДНІЙ ЧЕК':lang==='ru'?'СРЕДНИЙ ЧЕК':'AVG. ORDER',             val:fmtM(gs.avg),    sub:chgUp?'↑ trending':'↓ falling', up:chgUp },
              ].map((s,i)=>(
                <div key={i}
                  onMouseEnter={()=>setHovKpi(i)} onMouseLeave={()=>setHovKpi(null)}
                  style={{ padding:'18px 20px', borderRight:i<3?'1px solid #e2ddd5':'none', position:'relative', overflow:'hidden', background:hovKpi===i?'#f0ece3':'#fff', transition:'background 0.22s ease', cursor:'default' }}>
                  {flashGen>0&&<span key={`kf${i}-${flashGen}`} style={{ position:'absolute',inset:0,pointerEvents:'none',animation:'kpiFlash 0.9s ease-out forwards' }}/>}
                  <div style={{ fontSize:10,color:'rgba(26,46,26,0.42)',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:5,position:'relative' }}>{s.lbl}</div>
                  <div style={{ fontSize:28,fontWeight:700,color:'#1a2e1a',lineHeight:1.15,fontFamily:'monospace',letterSpacing:'-0.5px',position:'relative' }}>{s.val}</div>
                  {s.sub && (
                    <div style={{ display:'inline-flex', alignItems:'center', gap:4, marginTop:5, padding:'2px 8px', borderRadius:20, position:'relative',
                      background: s.up===null ? 'transparent' : s.up ? 'rgba(74,124,89,0.1)' : 'rgba(184,92,58,0.1)',
                      border: s.up===null ? 'none' : `1px solid ${s.up?'rgba(74,124,89,0.22)':'rgba(184,92,58,0.22)'}`,
                    }}>
                      {s.up !== null && <span style={{ fontSize:11, lineHeight:1 }}>{s.up ? '▲' : '▼'}</span>}
                      <span style={{ fontSize:11, fontWeight:700, color:s.up===null?'#6b7c6b':s.up?'#4a7c59':'#b85c3a' }}>{s.sub}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* TODAY accurate row — reads directly from rawByDay for precision */}
            {rawByDay[todayKey] && (
              <div style={{ display:'flex', alignItems:'center', flexWrap:'wrap', gap:20, padding:'9px 22px', borderBottom:'1px solid #e2ddd5', background:'rgba(74,124,89,0.05)' }}>
                <span style={{ fontSize:9, fontWeight:700, letterSpacing:'1.1px', color:'rgba(74,124,89,0.8)', fontFamily:'monospace', textTransform:'uppercase', flexShrink:0 }}>
                  {lang==='ua'?'СЬОГОДНІ':lang==='ru'?'СЕГОДНЯ':'TODAY'} · {todayKey}
                </span>
                <span style={{ fontSize:20, fontWeight:700, color:'#1a2e1a', fontFamily:'monospace', letterSpacing:'-0.5px' }}>
                  {fmtM(rawByDay[todayKey].total)}
                </span>
                <span style={{ fontSize:12, color:'#6b7c6b', fontFamily:'monospace' }}>
                  {rawByDay[todayKey].count} {lang==='ua'?'замовл.':lang==='ru'?'зак.':'order'}{rawByDay[todayKey].count !== 1 && lang==='en' ? 's' : ''}
                </span>
                {rawByDay[todayKey].count > 1 && (
                  <span style={{ fontSize:11, color:'#4a7c59', fontFamily:'monospace' }}>
                    avg {fmtM(Math.round(rawByDay[todayKey].total / rawByDay[todayKey].count))}
                  </span>
                )}
                {typeof gs.revenue === 'number' && gs.revenue > 0 && (
                  <span style={{ fontSize:11, color:'rgba(26,46,26,0.35)', fontFamily:'monospace', marginLeft:'auto' }}>
                    {Math.round(rawByDay[todayKey].total / gs.revenue * 100)}% {lang==='ua'?'від заг.виручки':lang==='ru'?'от общей выручки':'of total revenue'}
                  </span>
                )}
              </div>
            )}

            {/* RLS warning */}
            {rlsBlocked&&(
              <div style={{ padding:'10px 22px',background:'rgba(245,158,11,0.08)',borderTop:'1px solid rgba(245,158,11,0.18)',display:'flex',alignItems:'flex-start',gap:10 }}>
                <span style={{ color:'#f59e0b',fontSize:14,flexShrink:0,marginTop:1 }}>⚠</span>
                <div>
                  <div style={{ fontSize:11,color:'#f59e0b',fontFamily:'monospace',fontWeight:700,marginBottom:3 }}>
                    {lang==='ua'?'SUPABASE RLS БЛОКУЄ ДОСТУП — виконай SQL один раз:':lang==='ru'?'SUPABASE RLS БЛОКИРУЕТ ДОСТУП — выполни SQL один раз:':'SUPABASE RLS BLOCKS ACCESS — run SQL once:'}
                  </div>
                  <div style={{ fontSize:10,color:'rgba(155,82,10,0.85)',fontFamily:'monospace',background:'rgba(26,46,26,0.06)',border:'1px solid rgba(245,158,11,0.2)',borderRadius:6,padding:'6px 10px',lineHeight:1.7 }}>
                    CREATE POLICY &quot;anon_analytics_read&quot; ON public.orders FOR SELECT USING (true);
                  </div>
                </div>
              </div>
            )}

            {/* ── ORDER PRICE SPECTRUM — each order = one bar ── */}
            <div style={{ position:'relative', cursor:'crosshair', background:'#f5f1e9' }} onMouseLeave={()=>setHovered(null)}>
              {filteredOrders.length === 0 ? (
                <div style={{ padding:'40px 22px', textAlign:'center' }}>
                  <svg viewBox="0 0 1100 260" style={{ width:'100%', height:260, display:'block' }}>
                    <text x={550} y={115} textAnchor="middle" fill="rgba(26,46,26,0.2)" fontSize={14} fontFamily="monospace">
                      {lang==='ua'?'Немає замовлень за обраний період':lang==='ru'?'Нет заказов за выбранный период':'No orders for the selected period'}
                    </text>
                    <text x={550} y={138} textAnchor="middle" fill="rgba(26,46,26,0.12)" fontSize={11} fontFamily="monospace">
                      {lang==='ua'?'Кожне замовлення — окремий блок':lang==='ru'?'Каждый заказ — отдельный блок':'Each order will appear as its own bar'}
                    </text>
                  </svg>
                </div>
              ) : (() => {
                /* ── period-aware chart mode ── */
                const chartMode =
                  period === 0    ? (allSpanDays > 90 ? 'monthly' : allSpanDays > 14 ? 'daily' : 'orders')
                  : period >= 182 ? 'monthly'
                  : period >= 30  ? 'daily'
                  : 'orders';

                /* build display bars based on mode */
                let display;
                if (chartMode === 'orders') {
                  /* individual orders — up to 120 most recent */
                  display = filteredOrders.slice(-120).map(o => ({ label:o.id, amt:o.amt, count:1, id:o.id, date:o.date }));
                } else if (chartMode === 'daily') {
                  /* one bar per day — sum of all orders that day */
                  const byDay = {};
                  filteredOrders.forEach(o => {
                    if (!byDay[o.date]) byDay[o.date] = { total:0, count:0 };
                    byDay[o.date].total += o.amt; byDay[o.date].count++;
                  });
                  display = Object.entries(byDay).sort(([a],[b])=>a.localeCompare(b))
                    .map(([date, d]) => ({ label:date.slice(5), amt:d.total, count:d.count, date }));
                } else {
                  /* one bar per month — sum of all orders that month */
                  const byMonth = {};
                  filteredOrders.forEach(o => {
                    const mk = o.date.slice(0,7);
                    if (!byMonth[mk]) byMonth[mk] = { total:0, count:0 };
                    byMonth[mk].total += o.amt; byMonth[mk].count++;
                  });
                  const mNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                  display = Object.entries(byMonth).sort(([a],[b])=>a.localeCompare(b))
                    .map(([mk, d]) => { const [y,m]=mk.split('-'); return { label:`${mNames[+m-1]}'${y.slice(2)}`, amt:d.total, count:d.count, date:mk }; });
                }

                const n        = display.length;
                const amts     = display.map(o => o.amt);
                const maxAmt   = Math.max(...amts);
                const minAmt   = Math.min(...amts);
                const avgAmt   = Math.round(amts.reduce((s,v) => s+v, 0) / n);
                /* SVG layout */
                const OW=1100, OH=310, OML=68, OMR=82, OMT=22, OMB=28, OPH=242;
                const oPlotW = OW - OML - OMR;
                const oslot  = oPlotW / Math.max(n, 1);
                const obw    = Math.max(4, Math.min(36, oslot * 0.72));
                const oBot   = OMT + OPH;
                const oTop   = maxAmt * 1.1 || 1;
                const opy    = v => oBot - (v / oTop) * OPH;
                const ocx    = i => OML + i * oslot + oslot / 2;
                /* bar color: orders=price-tier (green→red), daily/monthly=volume (green=high) */
                const barCol = amt => {
                  const rng = maxAmt - minAmt;
                  const t   = rng > 0 ? (amt - minAmt) / rng : 0.5;
                  if (chartMode === 'orders') {
                    if (t < 0.33) return '#4a7c59';
                    if (t < 0.67) return '#c47a3a';
                    return '#b85c3a';
                  }
                  if (t > 0.67) return '#4a7c59';
                  if (t > 0.33) return '#c47a3a';
                  return '#b85c3a';
                };
                /* 5 grid price levels */
                const gridAmts = Array.from({length:5}, (_,i) => Math.round(oTop * i / 4));
                return (
                  <svg
                    viewBox={`0 0 ${OW} ${OH}`}
                    style={{ width:'100%', height:'auto', display:'block', maxHeight:380 }}
                    onMouseMove={e => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const svgX = (e.clientX - rect.left) / rect.width * OW;
                      const idx  = Math.min(n-1, Math.max(0, Math.floor((svgX - OML) / oslot)));
                      setHovered(svgX >= OML && svgX <= OML + oPlotW ? idx : null);
                    }}
                  >
                    <defs>
                      <style>{`
                        .spec-xhair { transition: transform 0.09s ease; }
                        .spec-tt    { transition: transform 0.09s ease; }
                      `}</style>
                      <clipPath id="specClip"><rect x={OML} y={OMT} width={oPlotW} height={OPH+OMB}/></clipPath>
                    </defs>

                    {/* grid */}
                    {gridAmts.map((g, gi) => {
                      const gy = opy(g);
                      return (
                        <g key={gi}>
                          <line x1={OML} y1={gy} x2={OW-OMR} y2={gy} stroke="rgba(26,46,26,0.07)" strokeWidth="1" strokeDasharray="3 8"/>
                          <text x={OML-6} y={gy+4} textAnchor="end" fill="#6b7c6b" fontSize="11" fontFamily="monospace">
                            {cur?.symbol||'$'}{g>=1000?(g/1000).toFixed(1)+'k':g}
                          </text>
                        </g>
                      );
                    })}

                    {/* HIGH reference line + label */}
                    <line x1={OML} y1={opy(maxAmt)} x2={OW-OMR} y2={opy(maxAmt)} stroke="rgba(74,124,89,0.55)" strokeWidth="1" strokeDasharray="4 6"/>
                    <rect x={OW-OMR+3} y={opy(maxAmt)-11} width={76} height={20} fill="rgba(74,124,89,0.12)" rx="4"/>
                    <text x={OW-OMR+8} y={opy(maxAmt)+4} fill="#4a7c59" fontSize="10" fontWeight="bold" fontFamily="monospace">
                      H {cur?.symbol||'$'}{maxAmt>=1000?(maxAmt/1000).toFixed(1)+'k':maxAmt}
                    </text>

                    {/* LOW reference line + label */}
                    {minAmt < maxAmt && (
                      <>
                        <line x1={OML} y1={opy(minAmt)} x2={OW-OMR} y2={opy(minAmt)} stroke="rgba(184,92,58,0.5)" strokeWidth="1" strokeDasharray="4 6"/>
                        <rect x={OW-OMR+3} y={opy(minAmt)-11} width={76} height={20} fill="rgba(184,92,58,0.1)" rx="4"/>
                        <text x={OW-OMR+8} y={opy(minAmt)+4} fill="#b85c3a" fontSize="10" fontWeight="bold" fontFamily="monospace">
                          L {cur?.symbol||'$'}{minAmt>=1000?(minAmt/1000).toFixed(1)+'k':minAmt}
                        </text>
                      </>
                    )}

                    {/* AVG reference line + label */}
                    {n > 1 && (
                      <>
                        <line x1={OML} y1={opy(avgAmt)} x2={OW-OMR} y2={opy(avgAmt)} stroke="rgba(196,122,58,0.45)" strokeWidth="1" strokeDasharray="2 5"/>
                        <text x={OW-OMR+8} y={opy(avgAmt)+4} fill="#c47a3a" fontSize="10" fontFamily="monospace">
                          Ø {cur?.symbol||'$'}{avgAmt>=1000?(avgAmt/1000).toFixed(1)+'k':avgAmt}
                        </text>
                      </>
                    )}

                    {/* chart mode badge */}
                    <rect x={OML} y={OMT} width={chartMode==='orders'?74:chartMode==='daily'?66:86} height={16} fill="rgba(26,46,26,0.07)" rx="4"/>
                    <text x={OML+6} y={OMT+11} fill="rgba(26,46,26,0.4)" fontSize="9" fontFamily="monospace" fontWeight="bold" letterSpacing="0.8">
                      {chartMode==='orders'
                        ? (lang==='ua'?'ЗАМОВЛЕННЯ':lang==='ru'?'ЗАКАЗЫ':'ORDERS')
                        : chartMode==='daily'
                          ? (lang==='ua'?'ПО ДНЯХ':lang==='ru'?'ПО ДНЯМ':'BY DAY')
                          : (lang==='ua'?'ПО МІСЯЦЯХ':lang==='ru'?'ПО МЕСЯЦАМ':'MONTHLY')}
                    </text>

                    {/* order / daily / monthly bars */}
                    {display.map((o, i) => {
                      const col    = barCol(o.amt);
                      const bx     = ocx(i) - obw / 2;
                      const barTop = opy(o.amt);
                      const barH   = oBot - barTop;
                      const isLast = i === n - 1;
                      const isHov  = hovered === i;
                      return (
                        <g key={`${o.label}-${i}`} clipPath="url(#specClip)">
                          <rect
                            x={bx} y={barTop} width={obw} height={barH} rx="2"
                            fill={col}
                            style={{ fillOpacity: isHov ? 1 : isLast ? 0.92 : 0.7, transition: 'fill-opacity 0.12s ease' }}
                          />
                          {/* glow ring on latest bar */}
                          {isLast && (
                            <rect x={bx-1} y={barTop-1} width={obw+2} height={barH+1}
                              fill="none" stroke={col} strokeOpacity="0.45" strokeWidth="1.5" rx="3"/>
                          )}
                          {/* inline label if bar is wide enough */}
                          {obw >= 20 && (
                            <text x={ocx(i)} y={barTop-5} textAnchor="middle" fill={col} fontSize="9" fontFamily="monospace" opacity="0.7">
                              {cur?.symbol||'$'}{o.amt>=1000?(o.amt/1000).toFixed(1)+'k':o.amt}
                            </text>
                          )}
                          {/* date/period label every N bars */}
                          {(i===0 || i===n-1 || n<=10 || i%Math.max(1,Math.round(n/8))===0) && (
                            <text x={ocx(i)} y={OH-4} textAnchor="middle" fill="#8a9e8a" fontSize="10" fontFamily="monospace">
                              {o.label}
                            </text>
                          )}
                        </g>
                      );
                    })}

                    {/* crosshair + tooltip on hover */}
                    {hovered !== null && display[hovered] && (() => {
                      const o   = display[hovered];
                      const ox  = ocx(hovered);
                      const ty  = Math.min(Math.max(OMT + 4, opy(o.amt) - 16), OH - 90 - OMB);
                      const tx  = hovered > n * 0.65 ? ox - 162 : ox + 12;
                      const col = barCol(o.amt);
                      const pct = chartMode === 'orders'
                        ? Math.round((filteredOrders.filter(x => x.amt <= o.amt).length / filteredOrders.length) * 100)
                        : null;
                      const avgUnit = o.count > 0 ? Math.round(o.amt / o.count) : 0;
                      return (
                        <>
                          {/* crosshair — slides horizontally in SVG units */}
                          <g className="spec-xhair" transform={`translate(${ox}, 0)`}>
                            <line x1={0} y1={OMT} x2={0} y2={oBot} stroke="rgba(26,46,26,0.18)" strokeWidth="1" strokeDasharray="3 5"/>
                          </g>
                          {/* tooltip — positioned in SVG units, transitions smoothly */}
                          <g className="spec-tt" transform={`translate(${tx}, ${ty})`}>
                            <rect x={0} y={0} width={152} height={84} fill="#1e2e1e" stroke={col} strokeOpacity="0.5" strokeWidth="1" rx="8"/>
                            <text x={10} y={17} fill={col} fontSize="11" fontWeight="bold" fontFamily="monospace">
                              {chartMode === 'orders' ? o.id : o.label}
                            </text>
                            <text x={10} y={35} fill="#f0ece3" fontSize="15" fontWeight="bold" fontFamily="monospace">
                              {cur?.symbol||'$'}{o.amt>=1000?(o.amt/1000).toFixed(2)+'k':o.amt}
                            </text>
                            <text x={10} y={51} fill="rgba(240,236,227,0.5)" fontSize="10" fontFamily="monospace">
                              {chartMode === 'orders'
                                ? o.date
                                : `${o.count} ${lang==='ua'?'замовл.':lang==='ru'?'зак.':'orders'}`}
                            </text>
                            <text x={10} y={67} fill="rgba(240,236,227,0.38)" fontSize="10" fontFamily="monospace">
                              {chartMode === 'orders'
                                ? `${lang==='ua'?'топ':lang==='ru'?'топ':'top'} ${100-pct}% · #${hovered+1}/${n}`
                                : `avg ${cur?.symbol||'$'}${avgUnit>=1000?(avgUnit/1000).toFixed(1)+'k':avgUnit}`}
                            </text>
                            <rect x={128} y={57} width={14} height={14} fill={col} fillOpacity="0.25" rx="3"/>
                            <rect x={128} y={57} width={14} height={14} fill="none" stroke={col} strokeOpacity="0.6" strokeWidth="1" rx="3"/>
                          </g>
                        </>
                      );
                    })()}
                  </svg>
                );
              })()}
            </div>

            {/* live feed */}
            <div style={{ borderTop:'1px solid #e2ddd5',background:'#ede9e0',padding:'10px 22px',display:'flex',alignItems:'center',gap:14,minHeight:44,overflow:'hidden' }}>
              <span style={{ fontSize:9,color:rtDot.col,fontWeight:700,letterSpacing:'1.2px',whiteSpace:'nowrap',textTransform:'uppercase',opacity:.9 }}>LIVE FEED</span>
              <div style={{ flex:1,display:'flex',gap:8,alignItems:'center',overflowX:'hidden' }}>
                {activity.length===0?(
                  <span style={{ fontSize:11,color:'rgba(26,46,26,0.3)',fontFamily:'monospace' }}>
                    {lang==='ua'?'Очікуємо нові замовлення...':lang==='ru'?'Ожидаем новые заказы...':'Waiting for orders...'}
                  </span>
                ):activity.map((a,ai)=>{
                  const secs=Math.round((Date.now()-a.ts)/1000);
                  const tLabel=secs<4?(lang==='ua'?'щойно':lang==='ru'?'только что':'just now'):secs<60?`${secs}s`:`${Math.round(secs/60)}m`;
                  const isNew=secs<4;
                  return(
                    <span key={`${a.id}-${ai}`} style={{
                      display:'flex',alignItems:'center',gap:5,flexShrink:0,
                      background:isNew?'rgba(74,124,89,0.1)':'rgba(26,46,26,0.05)',
                      border:`1px solid ${isNew?'rgba(74,124,89,0.35)':'#d4cfc6'}`,
                      borderRadius:6,padding:'4px 10px',fontSize:11,fontFamily:'monospace',
                      color:isNew?'#4a7c59':'#6b7c6b',
                      animation:ai===0&&isNew?'feedIn 0.35s ease-out':'none',
                      transition:'background .6s, border-color .6s, color .6s',
                    }}>
                      📦 {a.id} · {cur?.symbol||'$'}{a.amt} · {tLabel}
                    </span>
                  );
                })}
              </div>
              {lastTs&&<span style={{ fontSize:10,color:'rgba(26,46,26,0.3)',fontFamily:'monospace',whiteSpace:'nowrap',marginLeft:'auto',flexShrink:0 }}>↻ {secAgo}</span>}
            </div>

            {/* last order banner */}
            {lastOrder&&(
              <div style={{ padding:'7px 22px',borderTop:'1px solid rgba(74,124,89,0.15)',background:'rgba(74,124,89,0.05)',display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',overflow:'hidden' }}>
                <span style={{ fontSize:9,color:'rgba(74,124,89,0.7)',fontWeight:700,letterSpacing:'1.2px',textTransform:'uppercase',whiteSpace:'nowrap',fontFamily:'monospace',flexShrink:0 }}>
                  {lang==='ua'?'ОСТАННЄ:':lang==='ru'?'ПОСЛЕДНЕЕ:':'LAST:'}
                </span>
                <span style={{ fontSize:10,color:'rgba(26,46,26,0.5)',fontFamily:'monospace',whiteSpace:'nowrap',flexShrink:0 }}>{lastOrder.id}</span>
                {lastOrder.items&&lastOrder.items.split(',').map((item,i)=>(
                  <span key={i} style={{ background:'rgba(74,124,89,0.09)',border:'1px solid rgba(74,124,89,0.22)',borderRadius:4,padding:'2px 7px',fontSize:10,color:'#4a7c59',fontFamily:'monospace',whiteSpace:'nowrap' }}>
                    {item.trim()}
                  </span>
                ))}
              </div>
            )}

            {/* legend */}
            <div style={{ display:'flex',alignItems:'center',flexWrap:'wrap',gap:18,padding:'12px 22px',borderTop:'1px solid #e2ddd5', background:'#faf8f4' }}>
              {[
                {c:'#4a7c59', l:lang==='ua'?'Низька ціна':lang==='ru'?'Низкая цена':'Low price'},
                {c:'#c47a3a', l:lang==='ua'?'Середня ціна':lang==='ru'?'Средняя цена':'Mid price'},
                {c:'#b85c3a', l:lang==='ua'?'Висока ціна':lang==='ru'?'Высокая цена':'High price'},
              ].map(({c,l})=>(
                <div key={l} style={{ display:'flex',alignItems:'center',gap:7 }}>
                  <span style={{ width:10,height:10,borderRadius:2,background:c,display:'block' }}/>
                  <span style={{ fontSize:11,color:'#6b7c6b' }}>{l}</span>
                </div>
              ))}
              {[{stroke:'#4a7c59',l:'HIGH'},{stroke:'#b85c3a',l:'LOW'},{stroke:'#c47a3a',l:'AVG Ø'}].map(({stroke,l})=>(
                <div key={l} style={{ display:'flex',alignItems:'center',gap:7 }}>
                  <svg width={18} height={10}><line x1={0} y1={5} x2={18} y2={5} stroke={stroke} strokeWidth="1.5" strokeDasharray="4 3"/></svg>
                  <span style={{ fontSize:11,color:'#6b7c6b' }}>{l}</span>
                </div>
              ))}
              <div style={{ marginLeft:'auto',fontSize:10,color:'rgba(26,46,26,0.3)',fontFamily:'monospace' }}>
                {lang==='ua'?'Кожне замовлення · окремий блок · реальний час':lang==='ru'?'Каждый заказ · отдельный блок · реальное время':'Each order · individual bar · real-time'}
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════
              BUYER ANALYTICS PANEL
          ═══════════════════════════════════════ */}
          {Object.keys(buyerStats).length > 0 && (
            <div className="reveal" style={{
              background:'#f7f4ee', borderRadius:24, overflow:'hidden',
              border:'1px solid #d4cfc6', marginBottom:20,
              boxShadow:'0 4px 24px rgba(26,46,26,0.07)',
              transition:'box-shadow 0.35s ease',
            }}>
              <div style={{ padding:'12px 22px', borderBottom:'1px solid #e2ddd5', background:'#ede9e0', display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ display:'flex', gap:6 }}>
                  {['#ff5f57','#febc2e','#28c840'].map(c => <span key={c} style={{ width:11, height:11, borderRadius:'50%', background:c, display:'block' }}/>)}
                </div>
                <span style={{ color:'rgba(26,46,26,0.5)', fontSize:11, fontFamily:'monospace', letterSpacing:'1.2px', textTransform:'uppercase' }}>BIONERIKA · {lang==='ua'?'АНАЛІТИКА ПОКУПЦІВ':lang==='ru'?'АНАЛИТИКА ПОКУПАТЕЛЕЙ':'BUYER ANALYTICS'}</span>
                <span style={{ fontSize:11, color:'rgba(26,46,26,0.4)', fontFamily:'monospace', marginLeft:'auto' }}>
                  {Object.keys(buyerStats).length} {lang==='ua'?'унікальних покупців':lang==='ru'?'уникальных покупателей':'unique buyers'}
                </span>
              </div>
              <div style={{ padding:'18px 22px', display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(210px,1fr))', gap:12 }}>
                {Object.entries(buyerStats)
                  .sort((a, b) => b[1].revenue - a[1].revenue)
                  .map(([uid, st], i) => {
                    const rank = i + 1;
                    const clr  = rank === 1 ? '#c47a3a' : rank === 2 ? '#6b7c6b' : rank === 3 ? '#8a7a5a' : '#4a7c59';
                    const pct  = typeof gs.revenue === 'number' && gs.revenue > 0
                      ? Math.round(st.revenue / gs.revenue * 100) : 0;
                    return (
                      <div key={uid} style={{
                        display:'flex', alignItems:'center', gap:12,
                        padding:'12px 16px', background:'rgba(26,46,26,0.06)',
                        borderRadius:12, border:'1px solid #e2ddd5',
                        transition:'background 0.22s ease, box-shadow 0.22s ease',
                      }}
                        onMouseEnter={e=>{ e.currentTarget.style.background='rgba(26,46,26,0.13)'; e.currentTarget.style.boxShadow='0 2px 14px rgba(26,46,26,0.12)'; }}
                        onMouseLeave={e=>{ e.currentTarget.style.background='rgba(26,46,26,0.06)'; e.currentTarget.style.boxShadow='none'; }}
                      >
                        <div style={{ width:36, height:36, borderRadius:'50%', background:clr, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:13, fontWeight:700, color:'#fff', fontFamily:'monospace' }}>
                          {rank}
                        </div>
                        <div style={{ minWidth:0, flex:1 }}>
                          <div style={{ fontSize:9, color:'rgba(26,46,26,0.38)', fontFamily:'monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', letterSpacing:'0.5px' }}>
                            ID···{uid.slice(-8).toUpperCase()}
                          </div>
                          <div style={{ fontSize:18, fontWeight:700, color:'#1a2e1a', fontFamily:'monospace', letterSpacing:'-0.5px', lineHeight:1.2 }}>{fmtM(st.revenue)}</div>
                          <div style={{ fontSize:10, color:'#6b7c6b', fontFamily:'monospace', marginTop:2 }}>
                            {st.n} {lang==='ua'?'замовл.':lang==='ru'?'зак.':'order'}{st.n !== 1 && lang==='en' ? 's' : ''}
                            {pct > 0 ? ` · ${pct}%` : ''}
                          </div>
                        </div>
                      </div>
                    );
                  })
                }
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════
              PANEL 2 — DAILY SPEND MONITOR · LAST 10 DAYS
          ═══════════════════════════════════════ */}
          <div className="reveal"
            onMouseEnter={() => setHovPanel(2)} onMouseLeave={() => { setHovPanel(null); setHovDay(null); }}
            style={{
              background:'#f7f4ee', borderRadius:24, overflow:'hidden',
              border: hovPanel===2 ? '1px solid #b8b2a6' : '1px solid #d4cfc6',
              boxShadow: hovPanel===2 ? '0 18px 56px rgba(26,46,26,0.16)' : '0 6px 36px rgba(26,46,26,0.08)',
              transition: 'box-shadow 0.35s ease, border-color 0.3s ease',
              marginBottom:48,
            }}>
            {/* Title bar */}
            <div style={{ display:'flex', alignItems:'center', flexWrap:'wrap', gap:12, padding:'14px 22px', borderBottom:'1px solid #e2ddd5', background:'#ede9e0' }}>
              <div style={{ display:'flex', gap:6 }}>
                {['#ff5f57','#febc2e','#28c840'].map(c => <span key={c} style={{ width:11, height:11, borderRadius:'50%', background:c, display:'block' }}/>)}
              </div>
              <span style={{ color:'rgba(26,46,26,0.5)', fontSize:11, fontFamily:'monospace', letterSpacing:'1.2px', textTransform:'uppercase' }}>
                BIONERIKA · {lang==='ua'?'ЩОДЕННИЙ МОНІТОРИНГ · ОСТАННІ 10 ДНІВ':lang==='ru'?'ЕЖЕДНЕВНЫЙ МОНИТОРИНГ · ПОСЛЕДНИЕ 10 ДНЕЙ':'DAILY SPEND MONITOR · LAST 10 DAYS'}
              </span>
              <span style={{ display:'flex', alignItems:'center', gap:5 }}>
                <span style={{ width:7, height:7, borderRadius:'50%', background:rtDot.col, display:'block', animation:rtDot.anim }}/>
                <span style={{ fontSize:10, color:rtDot.col, fontWeight:700, letterSpacing:'1px' }}>{rtDot.label}</span>
              </span>
              {todayCount > 0 && (
                <span style={{ fontSize:10, color:'rgba(26,46,26,0.4)', fontFamily:'monospace', marginLeft:'auto' }}>
                  {todayCount} {lang==='ua'?'замовл. сьогодні':lang==='ru'?'заказов сегодня':'orders today'}
                </span>
              )}
            </div>

            {/* ── 10-DAY STACKED CATEGORY BAR CHART ── */}
            <div style={{ position:'relative', cursor:'crosshair', background:'#f5f1e9' }} onMouseLeave={()=>{ setHovDay(null); setHovDaySvgY(0); }}>
              {(() => {
                const d10display  = [...last10Days].reverse(); // oldest left → today right
                const d10totals   = d10display.map(d => Math.round(d.totalUAH * cur.rate));
                const hasData     = d10totals.some(v => v > 0);
                if (!hasData) return (
                  <div style={{ padding:'40px 22px', textAlign:'center' }}>
                    <svg viewBox="0 0 1100 260" style={{ width:'100%', height:260, display:'block' }}>
                      <text x={550} y={115} textAnchor="middle" fill="rgba(26,46,26,0.2)" fontSize={14} fontFamily="monospace">
                        {lang==='ua'?'Дані за останні 10 днів збираються...':lang==='ru'?'Данные за последние 10 дней накапливаются...':'Data for the last 10 days accumulates here...'}
                      </text>
                    </svg>
                  </div>
                );

                const D10W=1100, D10H=320, D10ML=68, D10MR=92, D10MT=22, D10PH=252, D10MB=28;
                const d10PlotW = D10W - D10ML - D10MR;
                const n        = d10display.length;
                const d10Slot  = d10PlotW / n;
                const d10bw    = d10Slot * 0.68;
                const d10Bot   = D10MT + D10PH;
                const d10maxV  = Math.max(...d10totals) * 1.1 || 1;
                const d10nz    = d10totals.filter(v => v > 0);
                const d10minV  = d10nz.length ? Math.min(...d10nz) : 0;
                const d10avgV  = d10nz.length ? Math.round(d10nz.reduce((s,v)=>s+v,0)/d10nz.length) : 0;
                const d10py    = v => d10Bot - (v / d10maxV) * D10PH;
                const d10cx    = i => D10ML + i * d10Slot + d10Slot / 2;
                const gridLvls = Array.from({length:5}, (_,i) => Math.round(d10maxV * i / 4));

                return (
                  <svg
                    viewBox={`0 0 ${D10W} ${D10H}`}
                    style={{ width:'100%', height:'auto', display:'block', maxHeight:400 }}
                    onMouseMove={e => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const svgX = (e.clientX - rect.left) / rect.width  * D10W;
                      const svgY = (e.clientY - rect.top)  / rect.height * D10H;
                      const idx  = Math.min(n-1, Math.max(0, Math.floor((svgX - D10ML) / d10Slot)));
                      setHovDaySvgY(svgY);
                      setHovDay(svgX >= D10ML && svgX <= D10ML + d10PlotW ? idx : null);
                    }}
                  >
                    <defs>
                      <style>{`.d10-tt { transition: transform 0.09s ease; }`}</style>
                      <clipPath id="d10Clip"><rect x={D10ML} y={D10MT} width={d10PlotW} height={D10PH+D10MB}/></clipPath>
                    </defs>

                    {/* grid */}
                    {gridLvls.map((g, gi) => {
                      const gy = d10py(g);
                      return (
                        <g key={gi}>
                          <line x1={D10ML} y1={gy} x2={D10W-D10MR} y2={gy} stroke="rgba(26,46,26,0.07)" strokeWidth="1" strokeDasharray="3 8"/>
                          <text x={D10ML-6} y={gy+4} textAnchor="end" fill="#6b7c6b" fontSize="11" fontFamily="monospace">
                            {cur?.symbol||'$'}{g>=1000?(g/1000).toFixed(1)+'k':g}
                          </text>
                        </g>
                      );
                    })}

                    {/* HIGH reference */}
                    {d10nz.length > 0 && (() => {
                      const maxTotal = Math.max(...d10totals);
                      const gy = d10py(maxTotal);
                      return (
                        <g>
                          <line x1={D10ML} y1={gy} x2={D10W-D10MR} y2={gy} stroke="rgba(74,124,89,0.55)" strokeWidth="1" strokeDasharray="4 6"/>
                          <rect x={D10W-D10MR+3} y={gy-11} width={86} height={20} fill="rgba(74,124,89,0.12)" rx="4"/>
                          <text x={D10W-D10MR+8} y={gy+4} fill="#4a7c59" fontSize="10" fontWeight="bold" fontFamily="monospace">
                            H {cur?.symbol||'$'}{maxTotal>=1000?(maxTotal/1000).toFixed(1)+'k':maxTotal}
                          </text>
                        </g>
                      );
                    })()}

                    {/* LOW reference */}
                    {d10nz.length > 1 && d10minV < Math.max(...d10totals) && (() => {
                      const gy = d10py(d10minV);
                      return (
                        <g>
                          <line x1={D10ML} y1={gy} x2={D10W-D10MR} y2={gy} stroke="rgba(184,92,58,0.5)" strokeWidth="1" strokeDasharray="4 6"/>
                          <rect x={D10W-D10MR+3} y={gy-11} width={86} height={20} fill="rgba(184,92,58,0.1)" rx="4"/>
                          <text x={D10W-D10MR+8} y={gy+4} fill="#b85c3a" fontSize="10" fontWeight="bold" fontFamily="monospace">
                            L {cur?.symbol||'$'}{d10minV>=1000?(d10minV/1000).toFixed(1)+'k':d10minV}
                          </text>
                        </g>
                      );
                    })()}

                    {/* AVG reference */}
                    {d10avgV > 0 && (() => {
                      const gy = d10py(d10avgV);
                      return (
                        <g>
                          <line x1={D10ML} y1={gy} x2={D10W-D10MR} y2={gy} stroke="rgba(196,122,58,0.45)" strokeWidth="1" strokeDasharray="2 5"/>
                          <text x={D10W-D10MR+8} y={gy+4} fill="#c47a3a" fontSize="10" fontFamily="monospace">
                            Ø {cur?.symbol||'$'}{d10avgV>=1000?(d10avgV/1000).toFixed(1)+'k':d10avgV}
                          </text>
                        </g>
                      );
                    })()}

                    {/* stacked bars per day */}
                    {d10display.map((day, i) => {
                      const total = d10totals[i];
                      if (total === 0) {
                        const isHov = hovDay === i;
                        return (
                          <g key={day.key} clipPath="url(#d10Clip)">
                            {isHov && <line x1={d10cx(i)} y1={D10MT} x2={d10cx(i)} y2={d10Bot} stroke="rgba(26,46,26,0.12)" strokeWidth="1" strokeDasharray="3 5"/>}
                            <text x={d10cx(i)} y={D10H-4} textAnchor="middle" fill="rgba(26,46,26,0.28)" fontSize="10" fontFamily="monospace">{day.label}</text>
                          </g>
                        );
                      }
                      const catEntries = realCats
                        .map(c => ({ ...c, amt: Math.round((day.cats[c.key]||0) * cur.rate) }))
                        .filter(c => c.amt > 0)
                        .sort((a, b) => b.amt - a.amt);
                      const bx     = d10cx(i) - d10bw / 2;
                      const barTop = d10py(total);
                      const barH   = d10Bot - barTop;
                      const isHov  = hovDay === i;
                      const isToday = day.isToday;
                      /* render stacked segments */
                      let segY = barTop;
                      return (
                        <g key={day.key} clipPath="url(#d10Clip)">
                          {/* today highlight */}
                          {isToday && <rect x={bx-3} y={D10MT} width={d10bw+6} height={D10PH} fill="rgba(74,124,89,0.07)" rx="3"/>}
                          {catEntries.map((c, ci) => {
                            const segH = Math.max(1, Math.round((c.amt / total) * barH));
                            const sy   = segY;
                            segY += segH;
                            return (
                              <rect
                                key={ci} x={bx} y={sy} width={d10bw} height={segH}
                                fill={c.col} rx={ci===catEntries.length-1?2:0}
                                style={{ fillOpacity: isHov ? 0.95 : isToday ? 0.85 : 0.65, transition: 'fill-opacity 0.12s ease' }}
                              />
                            );
                          })}
                          {/* top cap glow on hover / today */}
                          {(isHov || isToday) && (
                            <rect x={bx-1} y={barTop-1} width={d10bw+2} height={barH+1}
                              fill="none" stroke={isToday?'#4a7c59':'rgba(26,46,26,0.22)'}
                              strokeOpacity={isHov?0.8:0.35} strokeWidth="1.5" rx="2"/>
                          )}
                          {/* total label above bar */}
                          {(isHov || isToday || d10bw > 52) && (
                            <text x={d10cx(i)} y={barTop-5} textAnchor="middle" fill={isToday?'#4a7c59':'rgba(26,46,26,0.5)'} fontSize="10" fontFamily="monospace">
                              {fmtM(total)}
                            </text>
                          )}
                          {/* date label */}
                          <text x={d10cx(i)} y={D10H-4} textAnchor="middle" fill={isToday?'#4a7c59':'rgba(26,46,26,0.38)'} fontSize="10" fontFamily="monospace">
                            {isToday?(lang==='ua'?'СЬОГОДНІ':lang==='ru'?'СЕГОДНЯ':'TODAY'):day.label}
                          </text>
                          {/* order count */}
                          {day.orders > 0 && d10bw > 30 && (
                            <text x={d10cx(i)} y={D10H-16} textAnchor="middle" fill="rgba(26,46,26,0.28)" fontSize="9" fontFamily="monospace">
                              {day.orders}{lang==='ua'?'зам':lang==='ru'?'зак':'ord'}
                            </text>
                          )}
                          {isHov && <line x1={d10cx(i)} y1={D10MT} x2={d10cx(i)} y2={barTop} stroke="rgba(26,46,26,0.15)" strokeWidth="1" strokeDasharray="3 5"/>}
                        </g>
                      );
                    })}

                    {/* hover tooltip */}
                    {hovDay !== null && d10display[hovDay] && (() => {
                      const day     = d10display[hovDay];
                      const total   = d10totals[hovDay];
                      const ox      = d10cx(hovDay);
                      const catList = realCats
                        .map(c => ({ ...c, amt: Math.round((day.cats[c.key]||0) * cur.rate) }))
                        .filter(c => c.amt > 0)
                        .sort((a, b) => b.amt - a.amt)
                        .slice(0, 4);
                      const ttH     = 36 + catList.length * 18 + (total > 0 ? 22 : 0);
                      const ty      = Math.min(Math.max(D10MT + 4, hovDaySvgY - ttH / 2), D10H - D10MB - ttH - 2);
                      const tx      = hovDay > n * 0.65 ? ox - 172 : ox + 14;
                      return (
                        <g className="d10-tt" transform={`translate(${tx}, ${ty})`}>
                          <rect x={0} y={0} width={162} height={ttH} fill="#1e2e1e" stroke="rgba(74,124,89,0.35)" strokeWidth="1" rx="8"/>
                          <text x={10} y={17} fill={day.isToday?'#7fc47f':'#e8e0d0'} fontSize="11" fontWeight="bold" fontFamily="monospace">
                            {day.isToday?(lang==='ua'?'СЬОГОДНІ':lang==='ru'?'СЕГОДНЯ':'TODAY'):day.label}
                            {day.orders>0?`  ·  ${day.orders}${lang==='ua'?'зам':lang==='ru'?'зак':'ord'}`:''}
                          </text>
                          {total > 0 && (
                            <text x={10} y={34} fill="#fff" fontSize="14" fontWeight="bold" fontFamily="monospace">{fmtM(total)}</text>
                          )}
                          {catList.map((c, ci) => (
                            <g key={ci}>
                              <rect x={10} y={(total>0?48:32)+ci*18-1} width={7} height={7} fill={c.col} rx="1"/>
                              <text x={22} y={(total>0?48:32)+ci*18+6} fill="rgba(255,255,255,0.55)" fontSize="10" fontFamily="monospace">
                                {c.name}  {cur?.symbol||'$'}{c.amt>=1000?(c.amt/1000).toFixed(1)+'k':c.amt}
                              </text>
                            </g>
                          ))}
                          {total === 0 && (
                            <text x={10} y={32} fill="rgba(255,255,255,0.2)" fontSize="11" fontFamily="monospace">
                              {lang==='ua'?'Немає замовлень':lang==='ru'?'Нет заказов':'No orders'}
                            </text>
                          )}
                        </g>
                      );
                    })()}
                  </svg>
                );
              })()}
            </div>

            {/* Category legend */}
            <div style={{ padding:'10px 22px 12px', borderTop:'1px solid #e2ddd5', background:'#faf8f4', display:'flex', gap:14, flexWrap:'wrap', alignItems:'center' }}>
              {realCats.map(c => (
                <div key={c.key} style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ width:9, height:9, borderRadius:2, background:c.col, display:'block', opacity:0.85 }}/>
                  <span style={{ fontSize:10, color:'#6b7c6b', fontFamily:'monospace' }}>{c.name}</span>
                </div>
              ))}
              {[{stroke:'#4a7c59',l:'HIGH'},{stroke:'#b85c3a',l:'LOW'},{stroke:'#c47a3a',l:'AVG Ø'}].map(({stroke,l})=>(
                <div key={l} style={{ display:'flex',alignItems:'center',gap:6 }}>
                  <svg width={16} height={9}><line x1={0} y1={4.5} x2={16} y2={4.5} stroke={stroke} strokeWidth="1.5" strokeDasharray="4 3"/></svg>
                  <span style={{ fontSize:10,color:'#6b7c6b',fontFamily:'monospace' }}>{l}</span>
                </div>
              ))}
              <div style={{ marginLeft:'auto', fontSize:9, color:'rgba(26,46,26,0.3)', fontFamily:'monospace' }}>
                {lang==='ua'?'↻ оновлення кожні 10с':lang==='ru'?'↻ обновление каждые 10с':'↻ refresh every 10s'}
              </div>
            </div>

          </div>

          {/* ── CTA ── */}
          <div className="reveal" style={{ paddingBottom:36 }}>
            {/* Wholesale CTA */}
            <div style={{
              background:'var(--forest)', borderRadius:22, padding:'clamp(22px,4vw,32px)',
              display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:20,
            }}>
              <div>
                <div style={{ fontSize:22, fontWeight:700, color:'#fff', fontFamily:'var(--serif)', marginBottom:8 }}>
                  {lang==='ua'?'Зацікавлені в оптових поставках?':lang==='ru'?'Заинтересованы в оптовых поставках?':'Interested in wholesale supplies?'}
                </div>
                <div style={{ fontSize:14, color:'rgba(255,255,255,0.6)', lineHeight:1.6, maxWidth:420 }}>
                  {lang==='ua'?'Напишіть нам — обговоримо обсяги, ціни та умови поставки персонально.':lang==='ru'?'Напишите нам — обсудим объёмы, цены и условия поставки персонально.':'Write to us — we discuss volumes, pricing and delivery terms personally.'}
                </div>
              </div>
              <div style={{ display:'flex', gap:12, flexShrink:0, flexWrap:'wrap' }}>
                <a href="https://t.me/bionerika_wholesale" target="_blank" rel="noopener noreferrer" style={{
                  padding:'13px 24px', borderRadius:12, background:'rgba(255,255,255,0.1)',
                  border:'1px solid rgba(255,255,255,0.2)', color:'#fff', fontSize:14, fontWeight:600,
                  textDecoration:'none', display:'flex', alignItems:'center', gap:8,
                }}>Telegram →</a>
                <a href="mailto:opt@bionerika.com" style={{
                  padding:'13px 24px', borderRadius:12, background:'#4ade80', color:'#0d1117',
                  fontSize:14, fontWeight:700, textDecoration:'none', display:'flex', alignItems:'center', gap:8,
                }}>{lang==='ua'?'Написати email':lang==='ru'?'Написать email':'Email us'}</a>
              </div>
            </div>

          </div>

        </div>
      </section>
    </div>
  );
}

/* ======================================================================
   PAGE: BLOG
====================================================================== */
function Blog({ t }) {
  const [cat, setCat] = useState('all');
  useReveal();
  const allLabel = (t.bp_cats || [])[0] || 'all';
  const filtered = (t.bp_posts || []).filter(p => cat === allLabel || p.cat === cat);
  return (
    <div className="page-wrap">
      <div className="ph-cream" style={{ paddingTop: 'calc(var(--nav-h) + clamp(40px,6vw,60px))' }}>
        <div className="wrap">
          <span className="ey">{t.bp_eyebrow}</span>
          <h1 className="ph-h1">{t.bp_title} <em>{t.bp_italic}</em></h1>
          <p className="sub" style={{ marginTop: 8 }}>{t.bp_sub}</p>
        </div>
      </div>
      <section className="section">
        <div className="wrap">
          <div className="cat-tabs">
            {(t.bp_cats || []).map(c => <button key={c} className={`ct${cat === c ? ' on' : ''}`} onClick={() => setCat(c)}>{c}</button>)}
          </div>
          <div className="bp-g">
            {filtered.map((post, i) => (
              <div key={i} className="bp-c reveal" style={{ animationDelay: `${i * 0.07}s` }}>
                <div className="bp-img" style={{ background: ['linear-gradient(135deg,#c5e8b5,#72a86e)','linear-gradient(135deg,#fce5d5,#e06b3a)','linear-gradient(135deg,#ddd5fc,#9b59b6)','linear-gradient(135deg,#fcfcd5,#c9922a)','linear-gradient(135deg,#d5f0fc,#3a8ec9)','linear-gradient(135deg,#f0d5fc,#8e2559)'][i % 6], color: 'rgba(255,255,255,0.5)' }}><Ico k={post.emoji || 'leaf'} size={72}/></div>
                <div className="bp-body">
                  <span className="bp-cat-tag">{post.cat}</span>
                  <div className="bp-ttl">{post.title}</div>
                  <div className="bp-desc">{post.desc}</div>
                  <div className="bp-meta">
                    <span><Ico k="clock" size={12}/> {post.date}</span>
                    <span><Ico k="clock" size={12}/> {post.read}</span>
                    <button className="bp-rd">{t.bp_read}</button>
                  </div>
                  <div className="bp-tags">
                    {post.tags.map(tag => <span key={tag} className="bp-tag">#{tag}</span>)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

/* ======================================================================
   PAGE: ABOUT
====================================================================== */
function About({ t }) {
  useReveal();
  return (
    <div className="page-wrap">
      <div className="ph-forest" style={{ paddingTop: 'calc(var(--nav-h) + clamp(40px,6vw,60px))' }}>
        <div className="wrap">
          <span className="ey" style={{ color: 'var(--lime)' }}>{t.ab_eyebrow}</span>
          <h1 className="ph-h1" style={{ color: '#fff' }}>{t.ab_title} <em style={{ color: 'var(--lime)' }}>{t.ab_italic}</em></h1>
          <p style={{ color: 'rgba(255,255,255,.65)', fontSize: 15, marginTop: 8, maxWidth: 540 }}>{t.ab_sub}</p>
        </div>
      </div>
      <section className="section">
        <div className="wrap">
          {/* Story */}
          <div className="ab-split reveal" style={{ marginBottom: 72 }}>
            <div>
              <span className="ey">{t.ab_story_ey}</span>
              <h2 className="h2">{t.ab_story_title} <em>{t.ab_story_it}</em></h2>
              <p style={{ fontSize: 15, color: 'var(--muted)', lineHeight: 1.85, marginBottom: 16 }}>{t.ab_p1}</p>
              <p style={{ fontSize: 15, color: 'var(--muted)', lineHeight: 1.85 }}>{t.ab_p2}</p>
            </div>
            <div className="ab-img">
              <img src="https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=720&h=480&fit=crop&q=80" alt="Greenhouse" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
            </div>
          </div>
          {/* Stats */}
          <div className="ab-stats-g reveal">
            {(t.ab_stats || []).map(([n, l]) => (
              <div key={l} className="ab-sc"><div className="ab-sn">{n}</div><div className="ab-sl">{l}</div></div>
            ))}
          </div>
          {/* Team */}
          <div style={{ marginTop: 72 }}>
            <span className="ey">{t.ab_team_ey}</span>
            <h2 className="h2">{t.ab_team_title} <em>{t.ab_team_it}</em></h2>
            <div className="tm-g">
              {(t.ab_team || []).map((m, i) => (
                <div key={m.name} className="tm-c reveal" style={{ animationDelay: `${i * 0.1}s` }}>
                  <div className="tm-av">
                    {m.photo
                      ? <img src={m.photo} alt={m.name} style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'center top', display:'block' }}/>
                      : <Ico k={m.av || 'person'} size={56}/>}
                  </div>
                  <div className="tm-nm">{m.name}</div>
                  <div className="tm-ro">{m.role}</div>
                  <div className="tm-dc">{m.desc}</div>
                </div>
              ))}
            </div>
          </div>
          {/* Values */}
          <div style={{ marginTop: 72 }}>
            <span className="ey">{t.ab_val_ey}</span>
            <h2 className="h2">{t.ab_val_title} <em>{t.ab_val_it}</em></h2>
            <div className="val-g">
              {(t.ab_vals || []).map((v, i) => (
                <div key={v.t} className="val-c reveal" style={{ animationDelay: `${i * 0.1}s` }}>
                  <div style={{ marginBottom: 16, color: 'var(--forest)' }}><Ico k={v.i} size={38}/></div>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>{v.t}</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.75 }}>{v.d}</div>
                </div>
              ))}
            </div>
          </div>
          {/* Certificates */}
          <div style={{ marginTop: 72 }} className="reveal">
            <span className="ey">{t.ab_cert}</span>
            <div className="cert-list">
              {(t.ab_certs || []).map(c => <div key={c} className="cert-row">{c}</div>)}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ======================================================================
   PAGE: CONTACT
====================================================================== */
function Contact({ t, lang = 'en' }) {
  const [form, setForm] = useState({ name: '', email: '', msg: '' });
  const [sent, setSent] = useState(false);
  useReveal();
  return (
    <div className="page-wrap">
      <div className="ph-forest" style={{ paddingTop: 'calc(var(--nav-h) + clamp(40px,6vw,60px))' }}>
        <div className="wrap">
          <span className="ey" style={{ color: 'var(--lime)' }}>{t.con_eyebrow}</span>
          <h1 className="ph-h1" style={{ color: '#fff' }}>{t.con_title} <em style={{ color: 'var(--lime)' }}>{t.con_italic}</em></h1>
        </div>
      </div>
      <section className="section">
        <div className="wrap">
          <div className="con-split">
            <div className="con-info-c reveal">
              {(t.con_info || []).map(({ i, l, v }) => (
                <div key={l} className="con-ii">
                  <div className="con-ico">{i}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 3 }}>{l}</div>
                    <div style={{ fontSize: 14, color: 'var(--muted)' }}>{v}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="con-form-box reveal">
              {sent ? (
                <div style={{ textAlign: 'center', padding: '36px 0' }}>
                  <div style={{ fontSize: 60, marginBottom: 14 }}>✉</div>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 28, fontWeight: 700, color: 'var(--forest)', marginBottom: 8 }}>{t.con_ok_title}</div>
                  <div style={{ color: 'var(--muted)', fontSize: 15 }}>{t.con_ok_text}</div>
                </div>
              ) : (
                <>
                  <h3 style={{ fontFamily: 'var(--serif)', fontSize: 26, fontWeight: 700, marginBottom: 20 }}>{t.con_form}</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {[
                      [t.con_name, 'name', 'text', lang==='ua'?"Ваше ім'я":lang==='ru'?'Ваше имя':'Your name'],
                      [t.con_email, 'email', 'email', 'email@example.com']
                    ].map(([label, key, type, ph]) => (
                      <div key={key}>
                        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>{label}</label>
                        <input type={type} className="inp" placeholder={ph} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}/>
                      </div>
                    ))}
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>{t.con_msg}</label>
                      <textarea className="inp" rows={4} value={form.msg} placeholder={t.con_msg_ph} onChange={e => setForm(f => ({ ...f, msg: e.target.value }))} style={{ resize: 'vertical' }}/>
                    </div>
                    <button className="btn" style={{ justifyContent: "center" }} onClick={async () => { if (!form.name || !form.email || !form.msg) return; await sendEmail("contact", { name: form.name, email: form.email, message: form.msg }); setSent(true); }}>{t.con_send}</button>
                  </div>
                </>
              )}
            </div>
          </div>
          {/* Google Maps */}
          <div className="reveal">
            <span className="ey" style={{ marginTop: 56, display: 'block' }}>{t.con_map_title}</span>
            <div style={{ borderRadius: 20, overflow: 'hidden', marginTop: 20, border: '1px solid var(--border)', height: 320, position: 'relative' }}>
              <iframe
                title="Bionerica Agency"
                src="https://maps.google.com/maps?q=Бровари+вул+Теплична+1&output=embed&z=15"
                width="100%" height="100%" style={{ border: 0, display: 'block' }}
                allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade"
              />
              <a href="https://maps.app.goo.gl/T2nKpwQU1BaUNhmz5" target="_blank" rel="noreferrer"
                style={{ position: 'absolute', bottom: 14, right: 14, background: 'var(--dark)', color: '#fff', borderRadius: 100, padding: '8px 18px', fontSize: 12, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, boxShadow: 'var(--s0)' }}>
                <Ico k="map" size={14}/> Google Maps
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ProfileDrawer, loadProfile, saveProfile, clearProfile → src/components/ProfileDrawer/ProfileDrawer.jsx */
/* The sb helpers below are still used by Wholesale page in this file */
const sb = {
  signInWithGoogle: sbSignInWithGoogle,
  signOut:          sbSignOut,
  getSession:       sbGetSession,
  getProfile:       sbGetProfile,
  upsertProfile:    sbUpsertProfile,
  getOrders:        sbGetOrders,
  insertOrder:      sbInsertOrder,
  getAllOrders:     sbGetAllOrders,
  subscribeOrders:  sbSubscribeOrders,
};


/* GlobalMarketMini, PersonalChart, ProfileDrawer → src/components/ProfileDrawer/ProfileDrawer.jsx */


/* ======================================================================
   PAGE: ORDER
====================================================================== */
function Order({ t, cur, cart, setCart, lang = 'en' }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(() => {
    const prof = loadProfile();
    return {
      name:    prof?.name    || '',
      email:   prof?.email   || '',
      phone:   prof?.phone   || '',
      company: '',
      address: prof?.addresses?.find(a => a.isDefault)?.address || prof?.address || '',
      comment: ''
    };
  });
  const [sending, setSending] = useState(false);
  const [promo, setPromo] = useState('');
  const [promoRes, setPromoRes] = useState(null); // null | 'ok' | 'err'
  const [sent, setSent] = useState(false);
  const items = useMemo(() =>
    Object.entries(cart).filter(([,q]) => q > 0).map(([id, qty]) => {
      const p = t.products[+id];
      return p ? { p, id: +id, qty } : null;
    }).filter(Boolean), [cart, t]);
  const subtotal = items.reduce((s, { p, qty }) => s + Math.round(p.pr * cur.rate) * qty, 0);
  const discount = promoRes === 'ok' ? Math.round(subtotal * 0.1) : 0;
  const total = subtotal - discount;
  const completeOrder = useCallback(async () => {
    const orderId = '#GR' + Math.floor(100000 + Math.random()*900000);
    const orderData = {
      order_number: orderId,
      items_text: items.map(({p,qty}) => `${p.name} ×${qty}`).join(', '),
      total,
      currency_symbol: cur.symbol,
      status: 'pending',
      created_at: new Date().toISOString(),
    };
    // Save to Supabase if logged in
    const prof = loadProfile();
    if (prof?.uid) {
      try { await sb.insertOrder(prof.uid, orderData); } catch {}
      // Update local points
      const updated = {
        ...prof,
        points: (prof.points||0) + Math.floor(total * 0.05),
        transactions: [{ id:'tx_'+Date.now(), type:'out', name:'Order '+orderId, amount:total, symbol:cur.symbol, date:new Date().toLocaleString() }, ...(prof.transactions||[])],
      };
      updated.level = updated.points>=5000?'Gold':updated.points>=1500?'Silver':'Bronze';
      saveProfile(updated);
    }
    const itemsText = items.map(({p,qty}) => `${p.name} ×${qty}`).join(', ');
    const totalStr  = `${cur.symbol}${total.toLocaleString()}`;
    const emailData = {
      orderId,
      name:    form.name,
      email:   form.email,
      phone:   form.phone,
      address: form.address,
      items:   itemsText,
      total:   totalStr,
      comment: form.comment,
    };
    // Надсилаємо менеджеру
    await sendManagerOrder(emailData);
    // Надсилаємо клієнту
    await sendClientOrder(emailData);
    setCart({});
    setSent(true);
    setSending(false);
  }, [items, total, cur.symbol, setCart, form, lang]);
  const applyPromo = () => {
    if (promo.toUpperCase() === 'GREEN10') setPromoRes('ok');
    else setPromoRes('err');
  };
  if (sent) return (
    <div style={{ paddingTop: 'var(--nav-h)', minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="sent-success">
        <div className="sent-ico" style={{color:'var(--forest)'}}>
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        </div>
        <div className="sent-h">{t.ord_sent_title}</div>
        <p className="sent-s">{t.ord_sent_sub} <strong>{form.email}</strong></p>
      </div>
    </div>
  );
  const steps = [t.ord_s1, t.ord_s2, t.ord_s4];
  return (
    <div className="page-wrap" style={{ paddingTop: 'var(--nav-h)', background: 'var(--cream)', minHeight: '100vh' }}>
      <div className="wrap" style={{ paddingTop: 40, paddingBottom: 80, maxWidth: 820 }}>
        <span className="ey">{t.ord_eyebrow}</span>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(32px,4vw,52px)', fontWeight: 700, color: 'var(--dark)', marginBottom: 32 }}>{t.ord_title} <em style={{ fontStyle: 'italic', color: 'var(--moss)' }}>{t.ord_italic}</em></h1>
        {/* STEPS */}
        <div className="steps">
          {steps.map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center' }}>
              <div className="step-dot">
                <div className={`step-circle${i + 1 < step ? ' done' : i + 1 === step ? ' cur' : ''}`}>{i + 1 < step ? '?' : i + 1}</div>
                <div className={`step-lbl${i + 1 <= step ? (i + 1 < step ? ' done' : ' cur') : ''}`}>{s}</div>
              </div>
              {i < steps.length - 1 && <div className={`step-line${i + 1 < step ? ' done' : ''}`}/>}
            </div>
          ))}
        </div>
        <div className="ord-box">
          {/* STEP 1: Cart review */}
          {step === 1 && (
            <>
              <h3 style={{ fontFamily: 'var(--serif)', fontSize: 24, fontWeight: 700, marginBottom: 20 }}>{t.ord_s1}</h3>
              {items.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--muted)' }}>
                  <div style={{ fontSize: 56, marginBottom: 14, opacity: .3 }}>🛒</div>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 22, marginBottom: 8 }}>{t.ord_empty}</div>
                  <div style={{ fontSize: 14 }}>{t.ord_empty_sub}</div>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 22 }}>
                    {items.map(({ p, id, qty }) => (
                      <div key={id} className="ord-item">
                        <img src={IMGS[id]} alt="" className="ord-item-img"/>
                        <div>
                          <div className="ord-item-nm">{p.name}</div>
                          <div className="ord-item-pr">{fmt(p.pr, cur)}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--dark)', borderRadius: 100, padding: '2px 8px', marginLeft: 'auto', marginRight: 10 }}>
                          <button className="qb" onClick={() => setCart(c => qty - 1 <= 0 ? (({ [id]: _, ...r }) => r)(c) : { ...c, [id]: qty - 1 })}>−</button>
                          <span className="qn">{qty}</span>
                          <button className="qb" onClick={() => setCart(c => ({ ...c, [id]: qty + 1 }))}>+</button>
                        </div>
                        <div className="ord-item-tot">{cur.symbol}{(Math.round(p.pr * cur.rate) * qty).toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                  {/* Promo */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 8 }}>{t.ord_promo}</div>
                    <div className="promo-row">
                      <input className="promo-in" placeholder={t.ord_promo_ph} value={promo} onChange={e => { setPromo(e.target.value); setPromoRes(null); }}/>
                      <button className="promo-btn" onClick={applyPromo}>{t.ord_promo_apply}</button>
                    </div>
                    {promoRes === 'ok' && <div style={{ color: '#4ade80', fontSize: 13, marginTop: 6 }}>{t.ord_promo_ok}</div>}
                    {promoRes === 'err' && <div style={{ color: '#e05c2a', fontSize: 13, marginTop: 6 }}>{t.ord_promo_err}</div>}
                  </div>
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginBottom: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 14 }}>
                      <span style={{ color: 'var(--muted)' }}>{lang==='ua'?'Підсумок':lang==='ru'?'Итого':'Subtotal'}</span><span>{cur.symbol}{subtotal.toLocaleString()}</span>
                    </div>
                    {discount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 14, color: '#4ade80' }}>
                      <span>{lang==='ua'?'Знижка':lang==='ru'?'Скидка':'Discount'}</span><span>−{cur.symbol}{discount.toLocaleString()}</span>
                    </div>}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                      <span style={{ color: 'var(--muted)' }}>{t.ord_delivery_cost}</span><span style={{ color: 'var(--moss)', fontWeight: 600 }}>{t.ord_free}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                      <span style={{ fontWeight: 600, fontSize: 16 }}>{t.ord_total}</span>
                      <span style={{ fontFamily: 'var(--serif)', fontSize: 28, fontWeight: 700, color: 'var(--forest)' }}>{cur.symbol}{total.toLocaleString()}</span>
                    </div>
                  </div>
                  <button className="btn" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setStep(2)}>{t.ord_next}</button>
                </>
              )}
            </>
          )}
          {/* STEP 2: Contacts */}
          {step === 2 && (
            <>
              <h3 style={{ fontFamily: 'var(--serif)', fontSize: 24, fontWeight: 700, marginBottom: 20 }}>{t.ord_s2}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                {[
                  [t.ord_name,'name','text',lang==='ua'?"Ім'я":lang==='ru'?'Имя':'Name'],
                  [t.ord_email,'email','email','Email'],
                  [t.ord_phone,'phone','tel',lang==='ua'?'+380 (___) ___-__-__':lang==='ru'?'+7 (___) ___-__-__':'+38 (___) ___-__-__'],
                  [t.ord_company,'company','text',lang==='ua'?'Компанія':lang==='ru'?'Компания':'Company (optional)']
                ].map(([label, key, type, ph]) => (
                  <div key={key}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>{label}</label>
                    <input type={type} className="inp" placeholder={ph} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}/>
                  </div>
                ))}
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>{t.ord_address}</label>
                <input className="inp" placeholder={lang==='ua'?'вул. Теплична, 1, м. Київ':lang==='ru'?'ул. Тепличная, 1, г. Киев':'1 Example St, City'} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}/>
              </div>
              <div style={{ marginBottom: 22 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>{t.ord_comment}</label>
                <textarea className="inp" rows={3} placeholder={lang==='ua'?'Коментар до замовлення...':lang==='ru'?'Комментарий к заказу...':'Order notes...'} value={form.comment} onChange={e => setForm(f => ({ ...f, comment: e.target.value }))} style={{ resize: 'vertical' }}/>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn-o" onClick={() => setStep(1)}>{t.ord_back}</button>
                <button className="btn" style={{ flex: 1, justifyContent: 'center' }}
                  disabled={sending || !form.name || !form.email || !form.phone}
                  onClick={() => { if (form.name && form.email && form.phone) { setSending(true); completeOrder(); } }}>
                  {sending ? (lang==='ua'?'Надсилаємо...':'Sending...') : t.ord_check}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ======================================================================
   ROOT APP
====================================================================== */
export default function App() {
  const { theme, toggleTheme } = useTheme();
  const [loaded, setLoaded] = useState(false);
  const [lang, setLang] = useState('en');
  const [cart, setCart] = useState({});
  const [page, setPage] = useState('home');
  const [scrolled, setScrolled] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileLogged, setProfileLogged] = useState(() => !!loadProfile());
  const [profileEmail,  setProfileEmail]  = useState(() => loadProfile()?.email || '');
  const root = useRef(null);
  const t = T[lang] || T.en;
  const cur = CURRENCY[lang] || CURRENCY.en;

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const h = () => { setScrolled(el.scrollTop > 20); setShowTop(el.scrollTop > 300); };
    el.addEventListener('scroll', h, { passive: true });
    return () => el.removeEventListener('scroll', h);
  }, []);

  useEffect(() => {
    const h = e => { if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(o => !o); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  /* Reactively sync login state from Supabase (handles OAuth redirect + sign-out) */
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evt, session) => {
      const email = session?.user?.email || '';
      setProfileEmail(email);
      setProfileLogged(!!email);
    });
    return () => subscription.unsubscribe();
  }, []);

  const goPage = useCallback(p => {
    setPage(p);
    root.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const pages = { home: Home, catalog: Catalog, delivery: Delivery, wholesale: Wholesale, blog: Blog, about: About, contact: Contact, order: Order, account: AccountPage, manager: ManagerPage };
  /* Only the dedicated manager email sees the nav link. The founder can still access /manager directly.
     Panel access is gated by MANAGER_EMAILS inside ManagerPage.jsx. */
  const isManager = profileEmail === 'aleksandrsmisko5@gmail.com';
  const PageComp = pages[page] || Home;

  return (
    <div ref={root} style={{ height: '100vh', overflowY: 'auto', overflowX: 'hidden', position: 'relative' }}>
      <style>{CSS}</style>
      <Cursor/>
      {!loaded && <Preloader onDone={() => setLoaded(true)}/>}
      <Navbar t={t} lang={lang} setLang={setLang} cart={cart} scrolled={scrolled} onCart={() => setCartOpen(true)} onSearch={() => setSearchOpen(true)} onPage={goPage} page={page} onProfile={() => setProfileOpen(true)} profileLogged={profileLogged} isManager={isManager}/>
      <Search open={searchOpen} onClose={() => setSearchOpen(false)} t={t} cur={cur} onPage={goPage}/>
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} cart={cart} setCart={setCart} t={t} cur={cur} onPage={goPage}/>
      <ProfileDrawer open={profileOpen} onClose={() => { setProfileOpen(false); const _p = loadProfile(); setProfileLogged(!!_p); setProfileEmail(_p?.email || ''); }} lang={lang} t={t} cur={cur} onPage={goPage}/>
      <main>
        <div key={page} className="page-wrap">
          <PageComp t={t} cur={cur} cart={cart} setCart={setCart} onPage={goPage} lang={lang}/>
        </div>
      </main>
      {page !== 'order' && <Footer t={t} onPage={goPage}/>}
      {/* FAB stack: scroll-top above, chat manager below — aligned center, same column */}
      <div className="fab-stack">
        <button className={`stt${showTop ? ' v' : ''}`} onClick={() => root.current?.scrollTo({ top: 0, behavior: 'smooth' })}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
        </button>
        <Chat t={t} lang={lang} userEmail={profileEmail} userName={loadProfile()?.name || ''}/>
      </div>
    </div>
  );
}