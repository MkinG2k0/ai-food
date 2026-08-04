# Quick Task 260803-wue: вход по Telegram через Auth.js с моками без бэка - Context

**Gathered:** 2026-08-03
**Status:** Ready for planning

<domain>
## Task Boundary

Добавить вход через Telegram в стиле Auth.js (клиентский слой + моки, без бэкенда). Реальный Auth.js/Telegram provider подключится позже, когда появится сервер.

</domain>

<decisions>
## Implementation Decisions

### Экран входа
- Отдельная страница `/login` с mock-кнопкой входа (и местом под Telegram Login Widget позже)

### Обязательность логина
- Логин **не обязателен** — приложение работает без сессии (как сейчас)

### Редирект после входа
- После успешного входа → Home `/`

### Данные mock-сессии
- Минимум в формате, совместимом с Auth.js/Telegram: `id`, `name`, `username`, `photo_url` (+ внутренний `telegramId` при необходимости)

### Выход
- Кнопка «Выйти» в Settings (`/settings`)

### Telegram / BotFather
- Domain Login Widget уже задан: `ai-food-mobile.vercel.app`
- Bot token / username для реального виджета **пока нет** — только моки
- Не переключать на OIDC в этой задаче (legacy Login Widget domain уже настроен)

### Claude's Discretion
- FSD: feature `auth` (или `telegram-auth`) — Zustand persist session + UI
- Не ставить полный `next-auth`/`@auth/*` пакет без сервера — тонкий mock-слой с API-shape под будущий Auth.js
- Показать в Settings аватар/имя, если залогинен; иначе ссылку «Войти»
- Env-заготовки: `VITE_TELEGRAM_BOT_USERNAME`, `VITE_AUTH_MOCK=true` (документировать в комментарии/.env.example если создаём)

</decisions>

<specifics>
## Specific Ideas

- Скрин BotFather: Login Widget domain = `ai-food-mobile.vercel.app`
- Пользователь явно: моки без бэка сейчас

</specifics>

<canonical_refs>
## Canonical References

- Auth.js Telegram provider (будущий бэк): https://authjs.dev
- Telegram Login Widget domain: `ai-food-mobile.vercel.app`
- Existing routes: `src/app/router.tsx`
- Settings: `src/pages/settings/ui/SettingsPage.tsx` (уже есть упоминание Telegram)

</canonical_refs>
