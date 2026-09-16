import { PALETTE } from '../constants';
import type { BackupData, Course, CourseDraft, EventDraft, EventItem } from '../constants';
import { applyBackup } from '../domain/backup';
import type { ImportMode } from '../domain/backup';
import { makeId } from '../utils/id';

const DEMO_COURSE: Course = {
  id: 'c1',
  name: '大数据与人工智能',
  startWeek: 1,
  endWeek: 16,
  location: '教1-437',
  teacher: '李学识',
  color: PALETTE[0],
  schedules: [
    { dayOfWeek: 2, startPeriod: 9, endPeriod: 12 }, // 周二第 9~12 节
    { dayOfWeek: 4, startPeriod: 3, endPeriod: 4 }   // 示范：周四第 3~4 节
  ]
};

// 坏数据的 localStorage JSON 会导致白屏，这里兜底为空列表
function loadList<T>(key: string): T[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

// 2. 本地持久化状态：开学第一周周一的日期、课程总库、日程总库
export const timetable = $state({
  semesterStartDate: localStorage.getItem('semester_start') || '2026-03-02',
  courseList: loadList<Course>('courses'),
  eventList: loadList<EventItem>('events')
});

if (timetable.courseList.length === 0) {
  timetable.courseList = [DEMO_COURSE];
}

export function saveData() {
  localStorage.setItem('courses', JSON.stringify(timetable.courseList));
  localStorage.setItem('events', JSON.stringify(timetable.eventList));
  localStorage.setItem('semester_start', timetable.semesterStartDate);
}

export function addCourse(draft: CourseDraft) {
  timetable.courseList = [...timetable.courseList, { ...draft, id: makeId() }];
  saveData();
}

export function updateCourse(id: string, draft: CourseDraft) {
  timetable.courseList = timetable.courseList.map(c => (c.id === id ? { ...draft, id } : c));
  saveData();
}

export function removeCourse(id: string) {
  timetable.courseList = timetable.courseList.filter(c => c.id !== id);
  saveData();
}

export function addEvent(draft: EventDraft) {
  timetable.eventList = [...timetable.eventList, { ...draft, id: makeId() }];
  saveData();
}

export function updateEvent(id: string, draft: EventDraft) {
  timetable.eventList = timetable.eventList.map(e => (e.id === id ? { ...draft, id } : e));
  saveData();
}

export function removeEvent(id: string) {
  timetable.eventList = timetable.eventList.filter(e => e.id !== id);
  saveData();
}

export function importData(data: BackupData, mode: ImportMode) {
  const outcome = applyBackup(
    { courses: timetable.courseList, events: timetable.eventList },
    data,
    mode
  );
  timetable.courseList = outcome.courses;
  timetable.eventList = outcome.events;
  if (outcome.semesterStartDate) {
    timetable.semesterStartDate = outcome.semesterStartDate;
  }
  saveData();
}
