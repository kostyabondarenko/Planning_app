---
name: pwa-nextjs
description: Настраивает PWA (Progressive Web App) в Next.js 16 App Router для проекта Goal Navigator. Создаёт manifest.webmanifest, настраивает Metadata API (appleWebApp, icons, viewport), добавляет safe-area через env(safe-area-inset-*), iOS-специфичные квирки (status-bar-style, apple-mobile-web-app-capable), viewport-fit=cover для iPhone с notch, генерирует иконки 192/512/180/maskable. Используй когда нужно сделать приложение устанавливаемым на iPhone/Android, добавить «Добавить на главный экран», исправить safe-area, пройти Lighthouse Installable, настроить splash и theme-color.
---

# PWA для Next.js 16 App Router

Скилл для превращения фронтенда Goal Navigator в PWA с поддержкой установки на iOS 16.4+ (Safari) и Android Chrome.

## Контекст проекта

### Ключевые файлы

| Файл | Назначение |
|------|-----------|
| `frontend/public/manifest.webmanifest` | Web App Manifest — определяет имя, иконки, цвета, display mode |
| `frontend/public/icons/` или `frontend/public/` | PNG-иконки (192, 512, 180 apple-touch, maskable-512) |
| `frontend/src/app/layout.tsx` | `metadata` и `viewport` экспорты (Next.js 16 Metadata API) |
| `frontend/src/app/globals.css` | CSS-переменные для safe-area и их применение |

### Стек и ограничения

- **Next.js 16.1** App Router + TypeScript
- **Tailwind CSS 4** + CSS-переменные brandbook (`--bg-primary`, `--accent-primary`, ...)
- Цвета PWA (`theme_color`, `background_color`) должны соответствовать brandbook: светлая тема `#FFFBF7` / `#E8A87C`
- Этот скилл **НЕ покрывает**: service worker (офлайн — отдельный план), адаптивную вёрстку (скилл `mobile-responsive`)

## Инструкции

### Шаг 1: manifest.webmanifest

Файл `frontend/public/manifest.webmanifest` (не `.json` — правильный MIME-тип для PWA):

```json
{
  "name": "Goal Navigator",
  "short_name": "Goals",
  "description": "Управление целями с вехами и регулярными действиями",
  "start_url": "/dashboard",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#FFFBF7",
  "theme_color": "#E8A87C",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

**Важно:**
- `start_url: "/dashboard"` — приложение после установки открывается сразу на дашборде, минуя лендинг
- `scope: "/"` — PWA охватывает весь сайт
- `display: "standalone"` — fullscreen без адресной строки (для iOS 16.4+ можно `"fullscreen"`)
- Разделяй иконки `any` и `maskable` (не `"any maskable"` на одной — у maskable должна быть safe-зона 10% по краям)

### Шаг 2: Metadata API в layout.tsx

В `frontend/src/app/layout.tsx`:

```typescript
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Goal Navigator',
  description: 'Управление целями с вехами и регулярными действиями',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Goals',
    statusBarStyle: 'black-translucent', // контент едет под статусбар — работает с viewportFit: cover
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: '#E8A87C',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover', // критично для safe-area на iPhone с notch
};
```

**Почему `statusBarStyle: 'black-translucent'`:**
- iOS: статусбар прозрачный, контент рендерится под ним
- Обязательно в паре с `viewportFit: 'cover'` и `padding-top: env(safe-area-inset-top)` — иначе контент залезет под notch

**Почему `maximumScale: 1`:** запрещает пользовательский zoom — стандарт для мобильных приложений. Если нужна доступность — убрать.

### Шаг 3: Safe-area в globals.css

В `frontend/src/app/globals.css` в `:root`:

```css
:root {
  /* ... brandbook-переменные ... */

  --safe-top: env(safe-area-inset-top);
  --safe-bottom: env(safe-area-inset-bottom);
  --safe-left: env(safe-area-inset-left);
  --safe-right: env(safe-area-inset-right);
}
```

Применение на `html` или `body`:

```css
html {
  padding:
    env(safe-area-inset-top)
    env(safe-area-inset-right)
    env(safe-area-inset-bottom)
    env(safe-area-inset-left);
}
```

**Для fixed-элементов** (bottom nav, FAB):

```css
.bottom-nav {
  position: fixed;
  bottom: 0;
  padding-bottom: var(--safe-bottom);
}

.fab {
  bottom: calc(16px + var(--safe-bottom));
}
```

**НЕ применяй padding дважды** — либо на `html`, либо на fixed-элементах индивидуально.

### Шаг 4: Иконки

Требуемые размеры:

| Файл | Размер | Назначение |
|------|--------|-----------|
| `favicon.svg` | vector | Современные браузеры |
| `favicon-32x32.png` | 32×32 | Таб браузера |
| `favicon-16x16.png` | 16×16 | Таб браузера (маленький) |
| `apple-touch-icon.png` | 180×180 | iOS home screen |
| `icon-192.png` | 192×192 | Android / манифест |
| `icon-512.png` | 512×512 | Android / splash |
| `icon-maskable-512.png` | 512×512 | Android adaptive (с safe-зоной 10%) |

**Maskable icon:** полезное содержимое (логотип) должно занимать центральный круг диаметром 80% от стороны. Остальное — фон (не прозрачный!). Android кропает форму под тему устройства (круг/квадрат/сквиркл).

**Генерация:** если нет дизайн-ассетов, используй простую карточку с буквой «G» на `--accent-primary` (`#E8A87C`) — соответствует brandbook.

### Шаг 5: Проверка

1. **Build+Start** (dev-mode некорректно отдаёт манифест):
   ```bash
   cd frontend && npm run build && npm run start
   ```

2. **Chrome DevTools** → Application → Manifest:
   - Поля читаются без ошибок
   - Иконки показываются превьюшками
   - «Installability» — нет warnings

3. **Lighthouse** → PWA:
   - Installable: ✅
   - `start_url` отвечает 200

4. **iPhone (реальная проверка):**
   - Открыть сайт в Safari (нужен HTTPS — после плана 015 деплоя)
   - Поделиться → «На экран Домой»
   - Иконка появилась, имя «Goals»
   - Запуск — fullscreen, без адресной строки
   - Контент не залезает под notch и home indicator

## iOS-специфичные квирки

1. **Нет splash из манифеста.** iOS игнорирует `background_color` для splash — показывает белый/чёрный экран с иконкой. Для кастомного splash нужны отдельные PNG на каждое разрешение iPhone и `<link rel="apple-touch-startup-image">` для каждого. Для MVP — пропустить.

2. **Manifest обновляется только при переустановке.** После изменения `manifest.webmanifest` пользователь должен удалить и заново добавить на экран Домой. В dev — очищать «Website Data» в настройках Safari.

3. **`display: "fullscreen"` не работает** в iOS Safari — всегда `"standalone"`. Если важен fullscreen — оставить `standalone` и положиться на safe-area.

4. **Navigation links за пределами `scope`** открываются в обычном Safari, не в PWA. Все ссылки должны быть в пределах `scope: "/"`.

5. **`apple-mobile-web-app-capable`** — устаревший мета-тег, но iOS всё ещё его уважает. Next.js Metadata API генерирует его через `appleWebApp.capable: true` — дополнительно прописывать в `<head>` не нужно.

## Чеклист

- [ ] `manifest.webmanifest` с name/short_name/icons/theme_color
- [ ] Иконки 192, 512, 180 apple-touch, maskable-512 в `public/`
- [ ] `metadata.manifest` ссылается на `/manifest.webmanifest`
- [ ] `appleWebApp.statusBarStyle: 'black-translucent'`
- [ ] `viewport.viewportFit: 'cover'`
- [ ] CSS-переменные `--safe-top/bottom/left/right` в `:root`
- [ ] Safe-area padding применён (на html или на fixed-элементах)
- [ ] `theme_color` и `background_color` соответствуют brandbook
- [ ] Chrome DevTools Manifest — без ошибок
- [ ] Lighthouse PWA Installable ✅
- [ ] `npm run build` проходит без warnings

## Антипаттерны

- **Не используй `manifest.json`** — хотя работает, правильный MIME-тип выдаётся только для `.webmanifest`. Lighthouse предупреждает.
- **Не ставь `"any maskable"` на одной иконке** — либо иконка с safe-зоной (maskable), либо без (any). Смешение даёт кроп логотипа на Android.
- **Не забывай `viewportFit: 'cover'`** — без него `env(safe-area-inset-*)` возвращает 0 на iOS.
- **Не применяй safe-area padding и на html, и на элементах** — получишь двойной отступ.
- **Не хардкодь `theme_color` в нескольких местах** — держи в одной переменной, синхронизируй с brandbook.
- **Не меняй `start_url` на защищённую страницу без учёта редиректа на /login** — PWA откроется на странице, которая сразу редиректит, что создаёт мигание. Либо сделай `start_url: "/"`, либо убедись что `/dashboard` корректно редиректит на логин без артефактов.
