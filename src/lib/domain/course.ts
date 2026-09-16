import { PALETTE } from '../constants';
import type { Course, CourseDraft, ScheduleSlot } from '../constants';
import { getTimeRange } from '../utils/date';

export interface DisplayCourse extends Course {
  slot: ScheduleSlot;
  timeText: string;
}

export function getCoursesForDay(courseList: Course[], week: number, day: number): DisplayCourse[] {
  return courseList
    .flatMap((course): DisplayCourse[] => {
      if (week < course.startWeek || week > course.endWeek) return [];
      const slots = course.schedules.filter(s => s.dayOfWeek === day);
      return slots.map(slot => ({
        ...course,
        slot,
        timeText: getTimeRange(slot.startPeriod, slot.endPeriod)
      }));
    })
    .sort((a, b) => a.slot.startPeriod - b.slot.startPeriod);
}

export function getInitialCourseForm(): CourseDraft {
  return {
    name: "",
    credit: 2,
    assessment: "未知",
    startWeek: 1,
    endWeek: 16,
    location: "",
    teacher: "",
    color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
    schedules: [
      { dayOfWeek: 1, startPeriod: 1, endPeriod: 2 }
    ]
  };
}
