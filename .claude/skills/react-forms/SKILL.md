---
name: react-forms
description: Создаёт формы и модальные окна в React для проекта Goal Navigator. Реализует controlled-компоненты, клиентскую валидацию, inline-ошибки, модалки с createPortal, focus trap, закрытие по Escape/клику вне, loading-состояния. Используй когда нужно создать форму, добавить модальное окно, сделать модалку, форму добавления/редактирования, валидацию ввода, input/select/checkbox компоненты.
allowed-tools: Read, Grep, Glob, Edit, Write
---

# React Forms — Формы и модальные окна

Скилл для создания форм и модальных окон в проекте Goal Navigator. Следует установленным паттернам проекта.

## Когда использовать

- Создание форм ввода данных (создание/редактирование сущностей)
- Модальные окна (modal, dialog) с формами
- Валидация пользовательского ввода
- Этап 5 из `plans/003-upcoming-page.md` (Форма добавления задачи)
- Формы создания целей, вех, действий
- Любые input, select, checkbox, radio компоненты

## Инструкции

### Шаг 1: Изучи существующий код

Перед созданием формы прочитай:

1. **Существующие формы** — `frontend/src/components/` — `GoalCreateForm.tsx`, `MilestoneCreateForm.tsx`, `MilestoneClosureDialog.tsx`
2. **UI-компоненты** — `frontend/src/components/ui/` — `Input.tsx`, `Button.tsx`, `Card.tsx`, `Field.tsx`
3. **Типы** — `frontend/src/types/` — интерфейсы данных
4. **API-функции** — `frontend/src/lib/api.ts` — существующие вызовы

### Шаг 2: Определи интерфейсы данных

Создай TypeScript-интерфейсы для данных формы и ошибок:

```tsx
interface FormData {
  title: string;
  type: 'recurring' | 'one-time';
  date: string;
  milestoneId: string;
  weekdays: number[];
}

interface FormErrors {
  title?: string;
  milestoneId?: string;
  weekdays?: string;
  submit?: string;  // Ошибка при отправке
}
```

**Правила:**
- `FormData` — все поля формы с их типами
- `FormErrors` — все поля опциональные (string | undefined)
- Всегда добавляй `submit?: string` для ошибок API

### Шаг 3: Создай состояние формы

Используй `useState` для каждого аспекта формы:

```tsx
const [data, setData] = useState<FormData>({
  title: '',
  type: 'one-time',
  date: initialDate || '',
  milestoneId: '',
  weekdays: [],
});
const [errors, setErrors] = useState<FormErrors>({});
const [isSubmitting, setIsSubmitting] = useState(false);
```

**Правила проекта:**
- Состояние может быть единым объектом `data` или отдельными `useState` для каждого поля — в проекте используются оба подхода
- Для простых форм (3-5 полей) — отдельные `useState` (как в `GoalCreateForm.tsx`)
- Для сложных форм — единый объект `data`
- `errors` — всегда объект `Record<string, string>` или типизированный интерфейс
- `isSubmitting` — обязательный флаг для блокировки кнопки

### Шаг 4: Реализуй валидацию

Создай функцию `validateForm` / `validate`:

```tsx
const validateForm = useCallback((): boolean => {
  const newErrors: Record<string, string> = {};

  if (!title.trim()) {
    newErrors.title = 'Введите название';
  }

  if (!milestoneId) {
    newErrors.milestoneId = 'Выберите веху';
  }

  if (data.type === 'recurring' && data.weekdays.length === 0) {
    newErrors.weekdays = 'Выберите хотя бы один день';
  }

  // Валидация дат
  if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
    newErrors.endDate = 'Дата окончания должна быть позже даты начала';
  }

  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
}, [title, milestoneId, data.type, data.weekdays, startDate, endDate]);
```

**Типы валидации:**
- `required` — `if (!value.trim())` для строк, `if (!value)` для select
- `date range` — `new Date(start) > new Date(end)`
- `array min length` — `arr.length === 0`
- `conditional` — `if (type === 'recurring' && weekdays.length === 0)`
- Для вложенных элементов (вехи, действия) — ключи `${prefix}_${tempId}_${field}`

### Шаг 5: Реализуй отправку

```tsx
const handleSubmit = useCallback(async (e: React.FormEvent) => {
  e.preventDefault();
  if (!validateForm()) return;

  setIsSubmitting(true);

  try {
    await onSubmit(formattedData);
    handleClose(); // Сброс формы + onClose()
  } catch (error) {
    setErrors({
      submit: error instanceof Error ? error.message : 'Ошибка сохранения'
    });
  } finally {
    setIsSubmitting(false);
  }
}, [validateForm, onSubmit, handleClose]);
```

**Правила:**
- `e.preventDefault()` — всегда первой строкой
- Валидация перед отправкой
- `setIsSubmitting(true)` перед `try`
- В `catch` — записать ошибку в `errors.submit`
- В `finally` — `setIsSubmitting(false)`
- При успехе — `handleClose()` (сброс + закрытие)

### Шаг 6: Создай JSX формы

Используй UI-компоненты проекта:

```tsx
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

return (
  <form onSubmit={handleSubmit}>
    <div className="space-y-6">
      {/* Текстовое поле */}
      <div>
        <label className="block text-sm font-semibold text-app-text mb-2">
          Название
        </label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Введите название"
          className={errors.title ? 'border-app-danger' : ''}
        />
        {errors.title && (
          <p className="mt-1 text-sm text-app-danger">{errors.title}</p>
        )}
      </div>

      {/* Поле с датой */}
      <div>
        <label className="block text-sm font-semibold text-app-text mb-2">
          <Calendar size={14} className="inline mr-1" />
          Дата
        </label>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={`date-input ${errors.date ? 'border-app-danger' : ''}`}
        />
        {errors.date && (
          <p className="mt-1 text-sm text-app-danger">{errors.date}</p>
        )}
      </div>

      {/* Ошибка отправки */}
      {errors.submit && (
        <div className="p-4 bg-app-danger/10 rounded-2xl">
          <p className="text-sm text-app-danger font-medium">{errors.submit}</p>
        </div>
      )}
    </div>

    {/* Кнопки */}
    <div className="flex gap-3">
      <Button type="button" variant="secondary" onClick={handleClose} className="flex-1">
        Отмена
      </Button>
      <Button type="submit" disabled={isSubmitting} className="flex-1">
        {isSubmitting ? 'Сохранение...' : 'Сохранить'}
      </Button>
    </div>
  </form>
);
```

**CSS-классы проекта:**
- Лейбл: `block text-sm font-semibold text-app-text mb-2`
- Ошибка поля: `mt-1 text-sm text-app-danger`
- Ошибка input: className `border-app-danger`
- Ошибка отправки: `p-4 bg-app-danger/10 rounded-2xl`
- Группа полей: `space-y-6`
- Сетка полей: `grid grid-cols-1 sm:grid-cols-2 gap-4`
- Кнопки: `flex gap-3` с `flex-1` на каждой кнопке

### Шаг 7: Оберни в модальное окно

Для модальных форм используй паттерн проекта:

```tsx
interface ModalFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: FormData) => Promise<void>;
}

export default function ModalForm({ isOpen, onClose, onSubmit }: ModalFormProps) {
  // ... состояние и логика формы ...

  const resetForm = useCallback(() => {
    setTitle('');
    setErrors({});
    // ... сброс остальных полей
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />

      {/* Модальное окно */}
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card
          variant="elevated"
          className="relative w-full max-w-2xl bg-app-surface animate-spring-in max-h-[90vh] flex flex-col"
        >
          {/* Заголовок */}
          <div className="flex items-center justify-between p-6 border-b border-app-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-app-accent/10 rounded-xl flex items-center justify-center">
                <Icon size={22} className="text-app-accent" />
              </div>
              <h2 className="text-xl font-bold text-app-text">Заголовок</h2>
            </div>
            <button
              onClick={handleClose}
              className="w-10 h-10 rounded-full hover:bg-app-surfaceMuted flex items-center justify-center transition-colors"
            >
              <X size={20} className="text-app-textMuted" />
            </button>
          </div>

          {/* Форма */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Поля формы */}
            </div>

            {/* Кнопки действий (прибиты к низу) */}
            <div className="p-6 border-t border-app-border flex gap-3 bg-app-surfaceMuted">
              <Button type="button" variant="secondary" onClick={handleClose} className="flex-1">
                Отмена
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? 'Создание...' : 'Создать'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
```

**Структура модалки проекта:**
- `fixed inset-0 z-50` — полноэкранный оверлей
- Backdrop: `bg-black/50 backdrop-blur-sm` с `onClick={handleClose}`
- Контент: `Card variant="elevated"` с `max-w-2xl max-h-[90vh]`
- Заголовок: иконка в цветном круге + текст + кнопка закрытия (X)
- Тело формы: `overflow-y-auto` для скролла
- Кнопки: прибиты к низу с `border-t` и `bg-app-surfaceMuted`

### Шаг 8: Добавь Escape для закрытия (опционально)

Если модалка не использует `AnimatePresence` из framer-motion:

```tsx
useEffect(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') handleClose();
  };

  if (isOpen) {
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
  }

  return () => {
    document.removeEventListener('keydown', handleEscape);
    document.body.style.overflow = '';
  };
}, [isOpen, handleClose]);
```

**Примечание:** В текущих формах проекта (`GoalCreateForm`, `MilestoneCreateForm`) закрытие по Escape не реализовано — добавляй при необходимости.

## Паттерны вложенных элементов

Для форм с динамическими списками (вехи, действия):

```tsx
// Тип с временным ID
interface ItemForm extends ItemCreate {
  tempId: string;
}

// CRUD для списка
const addItem = useCallback(() => {
  setItems(prev => [...prev, { tempId: crypto.randomUUID(), title: '', ...defaults }]);
}, []);

const updateItem = useCallback((tempId: string, updates: Partial<ItemForm>) => {
  setItems(prev => prev.map(i => i.tempId === tempId ? { ...i, ...updates } : i));
}, []);

const removeItem = useCallback((tempId: string) => {
  setItems(prev => prev.filter(i => i.tempId !== tempId));
}, []);

// Валидация — ключи с tempId
items.forEach(item => {
  if (!item.title.trim()) {
    newErrors[`item_${item.tempId}_title`] = 'Введите название';
  }
});
```

## Conditional rendering полей

Для полей, которые зависят от значения других:

```tsx
{/* Дни недели — только для регулярных */}
{data.type === 'recurring' && (
  <div>
    <label>Дни недели</label>
    <div className="flex gap-1.5 flex-wrap">
      {WEEKDAY_NAMES.map((name, idx) => {
        const day = idx + 1;
        const isSelected = data.weekdays.includes(day);
        return (
          <button
            key={day}
            type="button"
            onClick={() => toggleWeekday(day)}
            className={`w-10 h-10 rounded-xl text-sm font-semibold transition-all ${
              isSelected
                ? 'bg-app-success text-white shadow-ios'
                : 'bg-white text-app-textMuted border border-app-border hover:border-app-success'
            }`}
          >
            {name}
          </button>
        );
      })}
    </div>
  </div>
)}
```

## UI-компоненты проекта

Всегда импортируй из `@/components/ui/`:

| Компонент | Путь | Использование |
|-----------|------|---------------|
| `Input` | `@/components/ui/Input` | Текстовые поля, даты |
| `Button` | `@/components/ui/Button` | Кнопки (primary, secondary, ghost, danger) |
| `Card` | `@/components/ui/Card` | Контейнер модалки (variant="elevated") |
| `Field` | `@/components/ui/Field` | Обёртка поля с лейблом |

**Button variants:** `primary` (синяя), `secondary` (серая), `ghost` (прозрачная), `danger` (красная)
**Button sizes:** `sm`, `md`, `lg`

## Иконки

Используй `lucide-react`:

```tsx
import { X, Plus, Trash2, Calendar, Target, Flag, Repeat, CircleDot, AlertCircle, Loader2 } from 'lucide-react';
```

- `X` — кнопка закрытия
- `Plus` — кнопка добавления
- `Trash2` — кнопка удаления
- `Calendar` — поля с датами
- `Loader2` с `className="animate-spin"` — индикатор загрузки

## Чего этот скилл НЕ делает

- Не занимается сложной стилизацией — используй `brandbook-stylist`
- Не реализует drag & drop — используй `dnd-kanban`
- Не создаёт API-эндпоинты — используй `fastapi-crud`
- Не управляет глобальным состоянием (Redux, Zustand)
- Не реализует API-логику (только вызывает переданные `onSubmit`)
