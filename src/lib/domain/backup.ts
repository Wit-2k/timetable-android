import type { BackupData, Course, EventItem } from '../constants';
import { makeImportId } from '../utils/id';

export type ImportMode = 'merge' | 'replace';

export interface TimetableData {
  courses: Course[];
  events: EventItem[];
}

export interface ImportOutcome extends TimetableData {
  semesterStartDate: string | null;
}

export function applyBackup(current: TimetableData, data: BackupData, mode: ImportMode): ImportOutcome {
  if (mode === 'merge') {
    const importedCourses = data.courseList.map(c => ({ ...c, id: makeImportId() }));
    const importedEvents = (data.eventList && Array.isArray(data.eventList))
      ? data.eventList.map(e => ({ ...e, id: makeImportId() }))
      : [];
    return {
      courses: [...current.courses, ...importedCourses],
      events: [...current.events, ...importedEvents],
      semesterStartDate: null
    };
  }
  return {
    courses: data.courseList,
    events: (data.eventList && Array.isArray(data.eventList)) ? data.eventList : current.events,
    semesterStartDate: data.semesterStartDate || null
  };
}

export function buildBackup(semesterStartDate: string, courses: Course[], events: EventItem[]): { data: BackupData; fileName: string } {
  return {
    data: {
      version: 1,
      exportTime: new Date().toISOString(),
      semesterStartDate,
      courseList: courses,
      eventList: events
    },
    fileName: `课表备份_${new Date().toISOString().slice(0, 10)}.json`
  };
}
