---
name: dnd-kanban
description: Реализует drag & drop функциональность с @dnd-kit для Kanban-досок и сортируемых списков в проекте Goal Navigator. Настраивает DndContext, sensors, draggable/droppable элементы, DragOverlay. Используй когда нужно добавить drag and drop, перетаскивание, сделать draggable, реализовать dnd-kit, работать с Kanban-доской, сортировать элементы перетаскиванием, переносить карточки между колонками.
---

# DnD Kanban — Drag & Drop с @dnd-kit

Скилл для реализации drag & drop функциональности в проекте Goal Navigator с использованием библиотеки @dnd-kit.

## Когда использовать

- Добавление drag & drop в компоненты
- Создание сортируемых списков (sortable)
- Перенос элементов между контейнерами (Kanban-колонки)
- Работа с компонентами в `frontend/src/components/kanban/`
- Этап 4 из `plans/003-upcoming-page.md` (Frontend — Drag & Drop)
- Перенос задач между днями на странице "Ближайшие дни"

## Инструкции

### Шаг 1: Проверь зависимости

Прочитай `frontend/package.json` и проверь наличие пакетов:

```
@dnd-kit/core
@dnd-kit/sortable
@dnd-kit/utilities
```

Если отсутствуют, установи:

```bash
cd frontend && npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

### Шаг 2: Изучи существующий код

Перед добавлением dnd прочитай:

1. **Kanban-компоненты** — `frontend/src/components/kanban/` — текущая структура
2. **Типы** — `frontend/src/types/` — интерфейсы данных (TaskView и т.д.)
3. **API-функции** — `frontend/src/lib/api.ts` — существующие вызовы API
4. **Существующий dnd** — поищи `useDraggable`, `useDroppable`, `DndContext` в проекте

### Шаг 3: Настрой DndContext в KanbanBoard

Оберни Kanban-доску в `DndContext` — это корневой провайдер drag & drop.

```tsx
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';

function KanbanBoard() {
  const [activeTask, setActiveTask] = useState<TaskView | null>(null);

  // Sensors: pointer с порогом 8px (чтобы клик не считался drag), + keyboard
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = (event: DragStartEvent) => {
    const task = findTaskById(event.active.id);
    setActiveTask(task ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const taskId = active.id;
      const newDate = over.id; // id droppable-зоны = дата колонки
      // 1. Оптимистично обновить локальный state
      // 2. Вызвать PUT /api/tasks/{id}/reschedule
      // 3. При ошибке — откатить state, показать toast
    }

    setActiveTask(null);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {columns.map((day) => (
        <DayColumn key={day.date} day={day} />
      ))}

      <DragOverlay dropAnimation={null}>
        {activeTask && <TaskCard task={activeTask} isDragging />}
      </DragOverlay>
    </DndContext>
  );
}
```

**Важно:**
- `closestCenter` — оптимальный алгоритм для Kanban (колонки расположены рядом)
- `dropAnimation={null}` — отключить анимацию возврата (мы управляем state вручную)
- `activationConstraint: { distance: 8 }` — предотвращает случайный drag при клике

### Шаг 4: Настрой useDroppable в DayColumn

Каждая колонка-день — droppable-зона. Используй дату как `id`.

```tsx
import { useDroppable } from '@dnd-kit/core';

interface DayColumnProps {
  day: { date: string; tasks: TaskView[] };
}

function DayColumn({ day }: DayColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: day.date, // "2026-02-06"
  });

  return (
    <div
      ref={setNodeRef}
      className={`day-column ${isOver ? 'day-column--over' : ''}`}
      style={{
        // Подсветка при наведении draggable
        ...(isOver && { borderColor: 'var(--accent-primary)', opacity: 1 }),
      }}
    >
      <DayHeader date={day.date} />
      {day.tasks.map((task) => (
        <TaskCard key={task.id} task={task} />
      ))}
    </div>
  );
}
```

**Подсветка drop-зоны:**
- `isOver` — `true` когда draggable-элемент находится над этой зоной
- Добавь CSS-класс `day-column--over` с визуальной обратной связью
- Используй `borderColor`, `boxShadow` или `background` для индикации

### Шаг 5: Настрой useDraggable в TaskCard

Каждая карточка задачи — draggable-элемент.

```tsx
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

interface TaskCardProps {
  task: TaskView;
  isDragging?: boolean; // для DragOverlay
}

const TaskCard = React.memo(function TaskCard({ task, isDragging }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging: isBeingDragged } =
    useDraggable({
      id: task.id,
      data: { task }, // передаём данные задачи для использования в handleDragEnd
    });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isBeingDragged ? 0.5 : 1, // оригинал полупрозрачный при drag
    cursor: 'grab',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`task-card ${isDragging ? 'task-card--dragging' : ''}`}
      {...listeners}
      {...attributes}
      aria-roledescription="Перетаскиваемая задача"
    >
      <TaskCheckbox task={task} />
      <span>{task.title}</span>
      <MilestoneBadge title={task.milestone_title} />
    </div>
  );
});
```

**Важно:**
- `React.memo` — оптимизация, чтобы не перерисовывать все карточки при drag
- `{...listeners}` — навешивает обработчики pointer/keyboard событий
- `{...attributes}` — навешивает aria-атрибуты для accessibility
- `opacity: 0.5` на оригинале, пока DragOverlay показывает превью
- `data: { task }` — передаёт данные через dnd context (доступны в `event.active.data.current`)

### Шаг 6: Создай DragOverlay

DragOverlay рендерится в портале поверх всего UI — это "призрак" элемента при перетаскивании.

```tsx
// В KanbanBoard (внутри DndContext):
<DragOverlay dropAnimation={null}>
  {activeTask && <TaskCard task={activeTask} isDragging />}
</DragOverlay>
```

**Зачем DragOverlay:**
- Элемент рендерится вне DOM-дерева Kanban → нет ограничений `overflow: hidden`
- Плавное следование за курсором
- Можно стилизовать иначе (тень, масштаб)

**Стили для isDragging:**
```css
.task-card--dragging {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  transform: rotate(2deg);
  cursor: grabbing;
}
```

### Шаг 7: Обработай перенос (API-интеграция)

В `handleDragEnd` реализуй оптимистичное обновление:

```tsx
const handleDragEnd = async (event: DragEndEvent) => {
  const { active, over } = event;
  setActiveTask(null);

  if (!over || active.id === over.id) return;

  const taskId = String(active.id);
  const task = active.data.current?.task as TaskView;
  const newDate = String(over.id);
  const oldDate = task.date;

  if (oldDate === newDate) return;

  // 1. Оптимистичное обновление state
  moveTaskInState(taskId, oldDate, newDate);

  try {
    // 2. Вызов API
    await rescheduleTask(taskId, {
      type: task.type,
      old_date: oldDate,
      new_date: newDate,
      log_id: task.log_id,
    });
  } catch (error) {
    // 3. Откат при ошибке
    moveTaskInState(taskId, newDate, oldDate);
    toast.error('Не удалось перенести задачу');
  }
};
```

### Шаг 8: Добавь Sortable (опционально)

Если нужна сортировка внутри колонки (изменение порядка задач):

```tsx
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// В DayColumn:
<SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
  {tasks.map((task) => (
    <SortableTaskCard key={task.id} task={task} />
  ))}
</SortableContext>

// SortableTaskCard:
function SortableTaskCard({ task }: { task: TaskView }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} />
    </div>
  );
}
```

**Когда использовать Sortable:**
- Если нужен порядок задач внутри дня
- Если есть API для сохранения порядка (`sort_order`)
- Для текущего MVP достаточно обычного draggable (перенос между колонками)

## Accessibility (a11y)

Обязательные атрибуты:

```tsx
// На draggable-элементе (через {...attributes}):
// - role="button"
// - tabIndex={0}
// - aria-roledescription="Перетаскиваемая задача"
// - aria-describedby — ID инструкции

// Кастомные aria-описания:
<DndContext
  accessibility={{
    announcements: {
      onDragStart({ active }) {
        return `Начато перетаскивание задачи ${active.data.current?.task?.title}`;
      },
      onDragOver({ active, over }) {
        if (over) {
          return `Задача ${active.data.current?.task?.title} над колонкой ${over.id}`;
        }
        return '';
      },
      onDragEnd({ active, over }) {
        if (over) {
          return `Задача ${active.data.current?.task?.title} перенесена на ${over.id}`;
        }
        return `Перетаскивание отменено`;
      },
    },
  }}
>
```

## Структура файлов Kanban

```
frontend/src/components/kanban/
├── KanbanBoard.tsx    # DndContext, sensors, handleDragStart/End, DragOverlay
├── DayColumn.tsx      # useDroppable, isOver подсветка, список задач
├── TaskCard.tsx       # useDraggable, React.memo, aria-атрибуты
└── DragOverlay.tsx    # (опционально) отдельный компонент превью
```

## CSS-классы для drag-состояний

Скилл добавляет только структурные классы. Стилизацию выполняет `brandbook-stylist`.

```css
/* Оригинал при перетаскивании */
.task-card[data-dragging='true'] {
  opacity: 0.5;
}

/* Превью в DragOverlay */
.task-card--dragging {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  transform: rotate(2deg);
  cursor: grabbing;
}

/* Колонка при наведении draggable */
.day-column--over {
  border-color: var(--accent-primary);
  background: var(--glass-bg-hover);
}
```

## Оптимизация рендеринга

1. **React.memo** на `TaskCard` — перерисовывается только при изменении props
2. **useMemo** для списка задач в колонке — фильтрация/сортировка
3. **useCallback** для `handleDragStart`, `handleDragEnd` — стабильные ссылки
4. **id как примитив** — `useDraggable({ id: task.id })`, не объект

```tsx
const TaskCard = React.memo(function TaskCard({ task, isDragging }: Props) {
  // ...
});

// В KanbanBoard:
const handleDragStart = useCallback((event: DragStartEvent) => {
  // ...
}, [tasks]);

const handleDragEnd = useCallback(async (event: DragEndEvent) => {
  // ...
}, [tasks, moveTaskInState]);
```

## Чего этот скилл НЕ делает

- Не стилизует компоненты (только структурные классы типа `.dragging`, `.over`) — используй `brandbook-stylist`
- Не создаёт API-эндпоинты — используй `fastapi-crud`
- Не реализует бизнес-логику приложения (какие задачи можно переносить, ограничения)
- Не управляет глобальным state (только подсказывает интерфейс для интеграции)
