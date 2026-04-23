# Green Region — Email Server

Express + Nodemailer backend для отправки заявок с сайта на почту.

## Быстрый старт

### 1. Установить зависимости
```bash
cd server
npm install
```

### 2. Настроить .env
```bash
cp .env.example .env
```
Открыть `.env` и заполнить:

```env
SMTP_USER=ваша_почта@gmail.com
SMTP_PASS=xxxx_xxxx_xxxx_xxxx   # App Password (см. ниже)
MANAGER_EMAIL=aleksandrsmisko63@gmail.com
PORT=3001
```

### 3. Как получить Gmail App Password

> ⚠️ Обычный пароль от Gmail не подойдёт — нужен App Password.

1. Зайти на https://myaccount.google.com/security
2. Включить **2-Step Verification** (если не включена)
3. Найти **"App passwords"** → создать новый → выбрать **Mail**
4. Скопировать 16-значный код (без пробелов) в `SMTP_PASS`

### 4. Запустить сервер
```bash
# Обычный запуск:
npm start

# Режим разработки (авторестарт):
npm run dev
```

Сервер запустится на `http://localhost:3001`

---

## API Endpoints

### POST `/api/order`
Отправляет заказ менеджеру + подтверждение клиенту.

**Body:**
```json
{
  "categories": ["Vegetables", "Flowers"],
  "products": [{ "name": "Cherry tomato", "priceLabel": "320 ₽/кг" }],
  "volume": "50",
  "frequency": "Weekly",
  "client": {
    "name": "Иван Иванов",
    "email": "client@example.com",
    "phone": "+7 900 000-00-00",
    "company": "ООО Ромашка",
    "address": "Москва, ул. Ленина, 1"
  }
}
```

### POST `/api/contact`
Отправляет сообщение из формы обратной связи.

**Body:**
```json
{
  "name": "Иван",
  "email": "ivan@example.com",
  "phone": "+7 900 000-00-00",
  "company": "ООО Ромашка",
  "subject": "Wholesale cooperation",
  "message": "Здравствуйте, хочу обсудить оптовое сотрудничество..."
}
```

### GET `/api/health`
Проверка работоспособности сервера.

---

## Запуск фронтенда + сервера одновременно

В корне проекта (`greenregion/`):
```bash
# Терминал 1 — фронтенд
npm run dev

# Терминал 2 — сервер
cd server && npm start
```

---

## Переменные окружения для фронтенда

Создать файл `.env` в корне React-проекта:
```env
VITE_API_URL=http://localhost:3001
```
На продакшне заменить на реальный URL сервера.
