<script lang="ts">
  import type { Course, EventItem } from '../lib/constants';
  import type { DisplayCourse } from '../lib/domain/course';
  import { selectDay, view } from '../lib/stores/view.svelte';
  import CourseCard from './CourseCard.svelte';
  import EventCard from './EventCard.svelte';

  let {
    courses,
    events,
    oneditcourse,
    oneditevent
  }: {
    courses: DisplayCourse[];
    events: EventItem[];
    oneditcourse: (course: Course) => void;
    oneditevent: (ev: EventItem) => void;
  } = $props();

  // —— 左右滑动手势（内聚于本组件）——
  let dragOffsetX = $state(0);
  let isDragging = $state(false);
  let swipeStartX = $state(0);
  let swipeStartY = $state(0);

  function pointFrom(e: TouchEvent | MouseEvent) {
    return 'touches' in e ? e.touches[0] : e;
  }

  function handleSwipeStart(e: TouchEvent | MouseEvent) {
    const t = pointFrom(e);
    swipeStartX = t.clientX;
    swipeStartY = t.clientY;
    isDragging = false;
    dragOffsetX = 0;
  }

  function handleSwipeMove(e: TouchEvent | MouseEvent) {
    if (swipeStartX === 0 && dragOffsetX === 0) return;
    const t = pointFrom(e);
    const dx = t.clientX - swipeStartX;
    const dy = t.clientY - swipeStartY;
    if (!isDragging && Math.abs(dx) < 10) return;
    if (!isDragging && Math.abs(dx) < Math.abs(dy)) return;
    isDragging = true;
    dragOffsetX = dx;
  }

  function handleSwipeEnd() {
    if (!isDragging) {
      dragOffsetX = 0;
      swipeStartX = 0;
      return;
    }
    let changed = false;
    if (dragOffsetX < -50) changed = selectDay(view.selectedDayOfWeek + 1);
    else if (dragOffsetX > 50) changed = selectDay(view.selectedDayOfWeek - 1);
    dragOffsetX = 0;
    swipeStartX = 0;
    if (changed) requestAnimationFrame(() => { isDragging = false; });
    else isDragging = false;
  }
</script>

<main class="course-list" class:dragging={isDragging}
  ontouchstart={handleSwipeStart}
  ontouchmove={handleSwipeMove}
  ontouchend={handleSwipeEnd}
  ontouchcancel={handleSwipeEnd}
  onmousedown={handleSwipeStart}
  onmousemove={handleSwipeMove}
  onmouseup={handleSwipeEnd}
  onmouseleave={handleSwipeEnd}
  style="transform: translateX({dragOffsetX}px);"
>
  {#key view.selectedDayOfWeek}
    <div class="day-page"
      class:from-right={view.slideDir > 0}
      class:from-left={view.slideDir < 0}
      class:fade-only={view.slideDir === 0}
    >
      {#if courses.length === 0 && events.length === 0}
        <div class="empty-state">
          <p>今天没有课，好好休息吧！</p>
        </div>
      {:else}
        {#each courses as item (item.id + item.slot.startPeriod + view.selectedDayOfWeek)}
          <CourseCard item={item} onedit={oneditcourse} />
        {/each}
        {#each events as ev (ev.id)}
          <EventCard ev={ev} onedit={oneditevent} />
        {/each}
      {/if}
    </div>
  {/key}
</main>

<style>
  .course-list {
    display: flex;
    flex-direction: column;
    gap: 14px;
    margin-top: 30px;
    /* 给右下角悬浮按钮留出净空（Fab 高 60px + 8px 间距）：
       否则滚到底时最后一张卡片的下沿会被 Fab 压住，且无法再滚开 */
    padding-bottom: 75px;
    /* 主页的滚动区域：只有卡片列表滚动，头部、Fab、底部周条保持不动 */
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    /* 与 overflow-y 搭配后 x 轴会被算成 auto，显式关掉以免左右滑动手势触发横向滚动 */
    overflow-x: hidden;
    /* 保留本区域的回弹、且不向页面传导（contain）。
       不要给 html/body 加 overscroll-behavior: none —— 真机实测那样会让
       内部滚动区域的回弹一起消失 */
    overscroll-behavior-y: contain;
    scrollbar-width: none;
    touch-action: pan-y;
    transition: transform 0.2s ease;
    will-change: transform;
  }

  .course-list::-webkit-scrollbar {
    display: none;
  }

  .course-list.dragging {
    transition: none;
  }

  .day-page {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .day-page.from-right {
    animation: page-in-right 0.22s ease;
  }

  .day-page.from-left {
    animation: page-in-left 0.22s ease;
  }

  .day-page.fade-only {
    animation: page-fade-in 0.18s ease-out forwards;
    will-change: opacity;
  }

  @keyframes page-fade-in {
    from {
      opacity: 0.3;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes page-in-right {
    from {
      opacity: 0;
      transform: translateX(48px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes page-in-left {
    from {
      opacity: 0;
      transform: translateX(-48px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  .empty-state {
    text-align: center;
    padding: 60px 0;
    color: #94a3b8;
    font-size: 15px;
  }
</style>
