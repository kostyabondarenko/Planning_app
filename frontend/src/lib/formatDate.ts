const MONTH_SHORT = [
  'янв', 'фев', 'мар', 'апр', 'мая', 'июн',
  'июл', 'авг', 'сен', 'окт', 'ноя', 'дек',
];

const MONTH_FULL = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

/**
 * Форматирует дату в короткий формат: "15 янв 2026"
 * Для текущего года год не показывается: "15 янв"
 */
export function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + (dateStr.includes('T') ? '' : 'T00:00:00'));
  const day = d.getDate();
  const month = MONTH_SHORT[d.getMonth()];
  const year = d.getFullYear();
  const currentYear = new Date().getFullYear();
  if (year !== currentYear) {
    return `${day} ${month} ${year}`;
  }
  return `${day} ${month}`;
}

/**
 * Форматирует дату в полный формат: "15 января 2026"
 * Для текущего года год не показывается: "15 января"
 */
export function formatDateFull(dateStr: string): string {
  const d = new Date(dateStr + (dateStr.includes('T') ? '' : 'T00:00:00'));
  const day = d.getDate();
  const month = MONTH_FULL[d.getMonth()];
  const year = d.getFullYear();
  const currentYear = new Date().getFullYear();
  if (year !== currentYear) {
    return `${day} ${month} ${year}`;
  }
  return `${day} ${month}`;
}

/**
 * Умное округление процента прогресса.
 * - Длинные вехи (>30 дней): до десятков (40%, 50%)
 * - Короткие: до единиц (45%, 67%)
 * - Без десятичных (45.5% → 46%)
 * - 0% → 0, 100% → 100
 */
export function roundProgress(progress: number, durationDays?: number): number {
  const clamped = Math.max(0, Math.min(progress, 100));
  if (clamped === 0 || clamped === 100) return clamped;
  if (durationDays && durationDays > 30) {
    return Math.round(clamped / 10) * 10;
  }
  return Math.round(clamped);
}

/**
 * Вычисляет длительность вехи в днях
 */
export function getMilestoneDurationDays(startDate: string, endDate: string): number {
  const start = new Date(startDate + (startDate.includes('T') ? '' : 'T00:00:00'));
  const end = new Date(endDate + (endDate.includes('T') ? '' : 'T00:00:00'));
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Форматирует дату для заголовка Kanban-колонки: "6 февраля" или "6 февраля 2027"
 */
export function formatDayColumnDate(date: Date): string {
  const day = date.getDate();
  const month = MONTH_FULL[date.getMonth()];
  const year = date.getFullYear();
  const currentYear = new Date().getFullYear();
  if (year !== currentYear) {
    return `${day} ${month} ${year}`;
  }
  return `${day} ${month}`;
}
