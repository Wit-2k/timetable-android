import { PERIOD_TIMETABLE } from '../constants';

export function jsDayToWeekDay(jsDay: number): number {
  return jsDay === 0 ? 7 : jsDay;
}

export function formatDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getSelectedDateStr(selected: number, today: number): string {
  const t = new Date();
  t.setDate(t.getDate() + (selected - today));
  return formatDateStr(t);
}

export function getTargetDateInfo(offsetDays: number, startDateStr: string): { week: number; dayOfWeek: number } {
  const target = new Date();
  target.setDate(target.getDate() + offsetDays);

  const jsDay = target.getDay();
  const dayOfWeek = jsDay === 0 ? 7 : jsDay;

  const start = new Date(startDateStr + "T00:00:00");
  const diffTime = target.getTime() - start.getTime();
  let week = 1;
  if (diffTime >= 0) {
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    week = Math.floor(diffDays / 7) + 1;
  }

  return { week, dayOfWeek };
}

export function formatChineseDateLabel(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${Number(parts[1])}月${Number(parts[2])}日`;
}

export function getTimeRange(startP: number, endP: number): string {
  const s = PERIOD_TIMETABLE[startP]?.start || "未知";
  const e = PERIOD_TIMETABLE[endP]?.end || "未知";
  return `${s} - ${e}`;
}
