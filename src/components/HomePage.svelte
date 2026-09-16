<script lang="ts">
  import { WEEK_DAYS } from '../lib/constants';
  import { getCoursesForDay } from '../lib/domain/course';
  import { getEventsForDate } from '../lib/domain/event';
  import { formatChineseDateLabel, getSelectedDateStr, getTargetDateInfo } from '../lib/utils/date';
  import { timetable } from '../lib/stores/timetable.svelte';
  import { view } from '../lib/stores/view.svelte';
  import { openEditCourse, openEditEvent } from '../lib/stores/modal.svelte';
  import DaySchedule from './DaySchedule.svelte';
  import HomeHeader from './HomeHeader.svelte';

  // —— 响应式筛选/派生数据（调用 lib 纯函数）——
  // 注意：startDateStr 必须作为显式参数传入，否则 Svelte 无法追踪
  // semesterStartDate 的变化，会导致修改开学日期后课表不刷新
  const selectedInfo = $derived(
    getTargetDateInfo(view.selectedDayOfWeek - view.todayDayOfWeek, timetable.semesterStartDate)
  );
  const selectedDateStr = $derived(getSelectedDateStr(view.selectedDayOfWeek, view.todayDayOfWeek));
  const selectedDateLabel = $derived(formatChineseDateLabel(selectedDateStr));
  const displayCourses = $derived(
    getCoursesForDay(timetable.courseList, view.currentWeek, view.selectedDayOfWeek)
  );
  const displayEvents = $derived(getEventsForDate(timetable.eventList, selectedDateStr));
</script>

<HomeHeader
  week={selectedInfo.week}
  dayLabel={WEEK_DAYS[selectedInfo.dayOfWeek - 1]}
  dateLabel={selectedDateLabel}
/>

<DaySchedule
  courses={displayCourses}
  events={displayEvents}
  oneditcourse={openEditCourse}
  oneditevent={openEditEvent}
/>
