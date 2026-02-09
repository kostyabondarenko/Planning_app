 План: Применение Brandbook-стилей + удаление страницы "День" + навигация из Календаря

 Контекст

 Сейчас brandbook-стили (CSS-переменные --glass-bg, --text-primary, --accent-primary и т.д.) применены только на странице Календарь. Остальные страницы
 (Цели, Ближайшие дни, детали цели) используют Tailwind-токены iOS-стиля (bg-app-bg, text-app-accent и т.д.), которые не соответствуют brandbook.

 Также есть страница "День" (/dashboard/daily), которая не нужна — её удаляем.

 Нужна поддержка светлой/тёмной темы через data-theme атрибут, переключатель тем и передача выбранной даты из Календаря в "Ближайшие дни".

 ---
 Шаг 0: Система тем (ThemeProvider)

 Файлы:
 - Создать frontend/src/lib/ThemeProvider.tsx — React Context + Provider
 - Изменить frontend/src/app/layout.tsx — обернуть приложение в ThemeProvider

 Что делает:
 - Читает тему из localStorage (ключ theme)
 - По умолчанию — auto (по времени суток: 7-19 = light, иначе dark)
 - Устанавливает data-theme на <html>
 - Экспортирует useTheme() хук с { theme, setTheme }

 ---
 Шаг 1: Обновить globals.css — переключить Tailwind-токены на brandbook

 Файл: frontend/src/app/globals.css

 Что делает:
 - В секции @theme заменить iOS-токены на brandbook-значения:
   - --color-app-bg → var(--bg-primary) / #FFFBF7
   - --color-app-surface → var(--bg-tertiary) / #FFFFFF
   - --color-app-text → var(--text-primary) / #2D2A26
   - --color-app-textMuted → var(--text-secondary) / #6B645B
   - --color-app-accent → var(--accent-primary) / #E8A87C
   - --color-app-border → использовать --border-medium
   - --color-app-success → var(--accent-success)
   - --color-app-danger → var(--accent-error)
   - и т.д.
 - Добавить [data-theme="dark"] переопределения для всех Tailwind-токенов (фиолетово-бирюзовые тона из brandbook dark)
 - Подключить шрифт Plus Jakarta Sans вместо Inter
 - Обновить body стили — фон var(--bg-primary), цвет var(--text-primary), декоративные blur-круги из brandbook

 ---
 Шаг 2: Обновить компоненты UI на brandbook-стиль

 Button (frontend/src/components/ui/Button.tsx)

 - Primary: background: var(--gradient-warm), color: var(--text-inverse), hover с shadow-lift
 - Secondary: glass-стиль (--glass-bg, --glass-border)
 - Ghost: без изменений, адаптировать цвета

 Card (frontend/src/components/ui/Card.tsx)

 - Заменить на glass-card стиль: background: var(--glass-bg), backdrop-filter, border: 1px solid var(--glass-border), border-radius: var(--radius-xl)
 - Hover: translateY(-4px), shadow-lift, glass-border-hover

 ---
 Шаг 3: Обновить Layout (навигация)

 Файл: frontend/src/app/dashboard/layout.tsx

 Что делает:
 - Удалить NavLink на /dashboard/daily (страницу "День")
 - Navbar: glass-стиль (--glass-bg, backdrop-filter: var(--blur-md), --glass-border)
 - Логотип: gradient-text (--gradient-warm / --gradient-primary для dark)
 - Активная ссылка: gradient background (--gradient-warm)
 - Добавить кнопку переключения темы (солнце/луна)

 ---
 Шаг 4: Стилизовать страницу "Цели"

 Файл: frontend/src/app/dashboard/page.tsx

 Что делает:
 - Фон страницы: var(--bg-primary)
 - Заголовок "Мои Цели": использовать brandbook типографику (font-weight 700, letter-spacing -0.02em)
 - Карточки целей: glass-card стиль с hover-эффектом lift
 - Прогресс-бар: var(--gradient-warm)
 - Пустое состояние: gradient-круги с brandbook цветами
 - Кнопка "Создать цель": var(--gradient-warm), hover glow

 ---
 Шаг 5: Стилизовать страницу "Ближайшие дни" (Kanban)

 Файлы:
 - frontend/src/components/kanban/KanbanBoard.tsx
 - frontend/src/components/kanban/DayColumn.tsx
 - frontend/src/components/kanban/TaskCard.tsx
 - frontend/src/app/globals.css (kanban CSS)

 Что делает:
 - Заменить Tailwind kanban-токены на brandbook CSS-переменные
 - Day columns: glass-card стиль
 - Today column: border: 2px solid var(--kanban-accent-color), glow shadow
 - Task cards: glass стиль с hover lift
 - Checkbox: brandbook accent-success цвет
 - Days selector: glass стиль
 - Принимать ?date=YYYY-MM-DD query param и начинать доску с этой даты

 ---
 Шаг 6: Стилизовать страницу "Деталь цели"

 Файл: frontend/src/app/dashboard/goal/[id]/page.tsx

 Что делает:
 - Header gradient: var(--gradient-aurora) вместо iOS purple
 - Карточки статистик: glass стиль
 - Прогресс-бары: var(--gradient-warm)
 - Milestone карточки: glass стиль
 - Кнопки: brandbook кнопки

 ---
 Шаг 7: Удалить страницу "День"

 Что делает:
 - Удалить директорию frontend/src/app/dashboard/daily/
 - Убрать NavLink из layout (уже в шаге 3)

 ---
 Шаг 8: Навигация из Календаря → Ближайшие дни с датой

 Файлы:
 - frontend/src/components/calendar/DayDetailsPanel.tsx — уже передаёт ?date=selectedDate ✓
 - frontend/src/components/kanban/KanbanBoard.tsx — читать searchParams.get('date') и начинать с этой даты

 Что делает:
 - В KanbanBoard: вместо всегда начинать с today, если есть ?date=YYYY-MM-DD, начинать массив дат с указанной даты
 - Оборачиваем UpcomingPage в <Suspense> для поддержки useSearchParams

 ---
 Шаг 9: Стилизовать формы (GoalCreateForm, MilestoneCreateForm)

 Файлы:
 - frontend/src/components/GoalCreateForm.tsx
 - frontend/src/components/MilestoneCreateForm.tsx

 Что делает:
 - Модальные окна: glass-card стиль с backdrop blur
 - Inputs: var(--glass-bg), var(--glass-border), focus ring с accent-primary
 - Кнопки: brandbook стиль

 ---
 Порядок выполнения

 1. ThemeProvider + подключение шрифта Plus Jakarta Sans
 2. globals.css — переключить токены на brandbook + dark theme
 3. UI-компоненты (Button, Card)
 4. Layout (навигация + переключатель тем + удаление "День")
 5. Удалить /dashboard/daily
 6. Страница "Цели"
 7. Страница "Деталь цели"
 8. Страница "Ближайшие дни" (Kanban) + приём даты из Календаря
 9. Формы

 ---
 Проверка

 1. npm run dev — приложение запускается без ошибок
 2. Светлая тема: тёплые персиковые тона, glass-эффекты
 3. Тёмная тема: фиолетово-бирюзовые акценты, тёмные фоны
 4. Переключатель тем в навигации работает
 5. Страница "День" недоступна (404)
 6. Навигация не содержит ссылку "День"
 7. На Календаре: нажатие "Перейти к задачам" → переход на Ближайшие дни, начиная с выбранной даты
 8. Все страницы визуально соответствуют brandbook