# План: PWA-основа для запуска на iPhone

## Общее описание

Превратить текущий Next.js фронтенд в **PWA (Progressive Web App)** — с возможностью «Добавить на главный экран» в Safari на iPhone. После установки приложение запускается в fullscreen, с собственной иконкой, без адресной строки браузера.

Этот план — **только PWA-обвязка**: манифест, иконки, iOS meta-теги, viewport. Адаптация UI под мобильный экран — в плане 017.

---

## Входящие требования

1. PWA устанавливается через Safari («Поделиться» → «На экран "Домой"») **один раз**
2. После установки — fullscreen, своя иконка, название «Goal Navigator»
3. Поддержка iOS 16.4+ (Safari) и Android Chrome
4. Работа только онлайн (service worker для офлайна — план 018)
5. Правильный viewport: без горизонтальной прокрутки, учёт safe-area (notch, home indicator)

---

## Промпт для запуска плана

```
Выполни план plans/014-mobile-pwa-base.md.

Используй скиллы: brandbook-stylist

Нужно создать скилл pwa-nextjs (см. раздел «Необходимые скиллы» в плане) — 
если его ещё нет, сначала создай через /skill-writer по промпту из плана, 
затем используй для настройки.
```

---

## План реализации

### Этап 1: Манифест и иконки

**Файлы:**
- `frontend/public/manifest.webmanifest`
- `frontend/public/icons/` — PNG-иконки 192, 512, 180 (apple-touch), 1024
- `frontend/public/icons/maskable-512.png` — с safe-зоной для Android

**Манифест:**
```json
{
  "name": "Goal Navigator",
  "short_name": "Goals",
  "description": "Управление целями с вехами и регулярными действиями",
  "start_url": "/dashboard",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#0f0f12",
  "theme_color": "#0f0f12",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

**Иконки:** сгенерировать из существующего логотипа/favicon. Если логотипа нет — простой градиентный кружок с буквой «G» в стиле brandbook (использовать CSS-переменную `--accent-color`).

### Этап 2: iOS meta-теги и viewport

В `frontend/src/app/layout.tsx` добавить в `metadata` (Next.js 16 Metadata API):

```typescript
export const metadata: Metadata = {
  title: 'Goal Navigator',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Goals',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    apple: '/icons/apple-touch-180.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#0f0f12',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover', // обязательно для safe-area на iPhone с notch
};
```

### Этап 3: Safe-area (notch, home indicator)

В `globals.css` подключить safe-area-inset:

```css
:root {
  --safe-top: env(safe-area-inset-top);
  --safe-bottom: env(safe-area-inset-bottom);
  --safe-left: env(safe-area-inset-left);
  --safe-right: env(safe-area-inset-right);
}

body {
  padding-top: var(--safe-top);
  padding-bottom: var(--safe-bottom);
}
```

Для fixed-элементов (bottom navigation, FAB) — учитывать `--safe-bottom`.

### Этап 4: Splash screen для iOS (опционально)

iOS не поддерживает splash из манифеста — нужны отдельные PNG-прелоадеры под каждое разрешение iPhone. Можно пропустить в первой версии — iOS покажет белый/чёрный фон с иконкой.

Если делать — сгенерировать через [pwa-asset-generator](https://github.com/elegantapp/pwa-asset-generator) и добавить `<link rel="apple-touch-startup-image">`.

### Этап 5: Базовая проверка PWA

1. `npm run build && npm run start` (dev-mode некорректно отдаёт манифест)
2. Открыть в Chrome DevTools → Application → Manifest — проверить, что манифест валиден
3. Lighthouse audit → Installable

---

## Результат

- [ ] `manifest.webmanifest` с иконками
- [ ] Иконки 192/512/maskable/180 сгенерированы
- [ ] iOS meta-теги в layout.tsx
- [ ] Safe-area переменные в globals.css
- [ ] `viewport-fit=cover` включён
- [ ] Lighthouse: Installable = true

---

## Зависимости

- Не зависит от других планов
- **Блокер для проверки на iPhone:** нужен HTTPS — план 015 (деплой)

---

## Необходимые скиллы

### Существующие
- `brandbook-stylist` — для стилизации иконок

### Нужно создать: `pwa-nextjs`

Скилл для настройки PWA в Next.js 16 App Router.

**Промпт для /skill-writer:**
```
Создай скилл pwa-nextjs для проекта Goal Navigator.

Скилл должен помогать с:
1. Созданием manifest.webmanifest с правильными полями для iOS и Android
2. Настройкой Metadata API Next.js 16 (appleWebApp, icons, viewport)
3. Safe-area через env(safe-area-inset-*) в globals.css
4. Viewport-fit=cover для iPhone с notch
5. Генерацией иконок (указание размеров: 192, 512, 180 apple-touch, 1024, maskable)
6. iOS-специфичными квирками: status-bar-style, apple-mobile-web-app-capable
7. Проверкой через Lighthouse (Installable критерий)

Контекст:
- Next.js 16.1 App Router
- TypeScript
- Tailwind CSS 4
- Стили через CSS-переменные (brandbook)

Скилл НЕ должен покрывать:
- Service worker (отдельный скилл в будущем для офлайна)
- Адаптивную вёрстку (отдельный скилл mobile-responsive)
```
