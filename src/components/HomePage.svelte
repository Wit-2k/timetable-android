<script lang="ts">
  import { WEEK_DAYS } from '../lib/constants';
  import { getCoursesForDay } from '../lib/domain/course';
  import { getEventsForDate } from '../lib/domain/event';
  import { formatChineseDateLabel, getSelectedDateStr, getTargetDateInfo } from '../lib/utils/date';
  import { timetable } from '../lib/stores/timetable.svelte';
  import { selectDay, view } from '../lib/stores/view.svelte';
  import { modal, openAddCourse, openEditCourse, openEditEvent, openInfo } from '../lib/stores/modal.svelte';
  import { goSettings } from '../lib/stores/navigation';
  import DaySchedule from './DaySchedule.svelte';
  import Fab from './Fab.svelte';
  import HomeHeader from './HomeHeader.svelte';
  import TopActions from './TopActions.svelte';
  import WeekBar from './WeekBar.svelte';

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

<div class="home-page-root">
  {#if !modal.isAddModalOpen && !modal.editingCourseId && !modal.editingEventId}
    <TopActions onEdit={goSettings} onInfo={openInfo} />
  {/if}

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

  <Fab onadd={openAddCourse} />

  <WeekBar
    selectedDay={view.selectedDayOfWeek}
    todayDay={view.todayDayOfWeek}
    onselect={selectDay}
  />
</div>

<style>
  .home-page-root {
    position: relative;
    box-sizing: border-box;
    /* 铺满 App 容器 padding-top 之后的全部剩余空间（剩余高度交给 course-list 滚动），
       同时作为绝对定位的 WeekBar / Fab 的包含块，高度必须锁死，
       否则课表变长会把这两个元素推出可视区 */
    display: flex;
    flex-direction: column;
    height: 100%;
    /* 给绝对定位在底部的 WeekBar 和 Fab 留出安全距离 */
    padding-bottom: calc(env(safe-area-inset-bottom, 20px) + 80px);
  }
</style>
