import { PALETTE } from '../constants';
import type { EventDraft, EventItem } from '../constants';
import { formatDateStr } from '../utils/date';

export function getEventsForDate(eventList: EventItem[], dateStr: string): EventItem[] {
  return eventList
    .filter(e => e.date === dateStr)
    .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
}

export function getInitialEventForm(dateStr?: string): EventDraft {
  const t = new Date();
  const todayStr = formatDateStr(t);
  return {
    content: "",
    date: dateStr || todayStr,
    startTime: "",
    endTime: "",
    note: "",
    color: PALETTE[Math.floor(Math.random() * PALETTE.length)]
  };
}
