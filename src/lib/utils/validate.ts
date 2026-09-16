import type { BackupData, CourseDraft, EventDraft } from '../constants';

export function validateCourse(course: CourseDraft): string | null {
  if (!course.name.trim()) return "请输入课程名称";
  return null;
}

export function validateEvent(ev: EventDraft): string | null {
  if (!ev.content.trim()) return "请输入日程内容";
  if (!ev.date) return "请选择日期";
  if ((ev.startTime && !ev.endTime) || (!ev.startTime && ev.endTime)) {
    return "开始和结束时间要么都填，要么都不填";
  }
  if (ev.startTime && ev.endTime && ev.startTime >= ev.endTime) {
    return "结束时间必须晚于开始时间";
  }
  return null;
}

export function validateBackupData(data: unknown): BackupData | null {
  if (!data || typeof data !== 'object') return null;
  const candidate = data as BackupData;
  if (!candidate.courseList || !Array.isArray(candidate.courseList)) return null;
  return candidate;
}
