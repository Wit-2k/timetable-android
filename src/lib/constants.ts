export interface ScheduleSlot {
  dayOfWeek: number;
  startPeriod: number;
  endPeriod: number;
}

export interface Course {
  id: string;
  name: string;
  /** 可选：示范课程与旧版备份 JSON 中可能没有此字段 */
  credit?: number;
  /** 可选：示范课程与旧版备份 JSON 中可能没有此字段 */
  assessment?: string;
  startWeek: number;
  endWeek: number;
  location: string;
  teacher: string;
  color: string;
  schedules: ScheduleSlot[];
}

export interface EventItem {
  id: string;
  content: string;
  date: string;
  startTime: string;
  endTime: string;
  note: string;
  color: string;
}

export interface CourseDraft extends Omit<Course, 'id'> {
  id?: string;
}

export interface EventDraft extends Omit<EventItem, 'id'> {
  id?: string;
}

export interface BackupData {
  version?: number;
  exportTime?: string;
  semesterStartDate?: string;
  courseList: Course[];
  eventList?: EventItem[];
}

export const PERIOD_TIMETABLE: Record<number, { start: string; end: string }> = {
  1:  { start: "08:30", end: "09:15" },
  2:  { start: "09:20", end: "10:05" },
  3:  { start: "10:25", end: "11:10" },
  4:  { start: "11:15", end: "12:00" },
  5:  { start: "13:50", end: "14:35" },
  6:  { start: "14:40", end: "15:25" },
  7:  { start: "15:30", end: "16:15" },
  8:  { start: "16:30", end: "17:15" },
  9:  { start: "17:20", end: "18:05" },
  10: { start: "18:30", end: "19:15" },
  11: { start: "19:20", end: "20:05" },
  12: { start: "20:10", end: "20:55" }
};

export const WEEK_DAYS: string[] = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

export const PALETTE: string[] = ["#9AA5B1", "#7D8CA3", "#8CA6A3", "#A3B18A", "#A89BB8", "#B5838D", "#C9ADA7", "#B8C4C9"];
