<script lang="ts">
  import { Haptics, ImpactStyle } from '@capacitor/haptics';
  import { WEEK_DAYS } from '../lib/constants';

  let { selectedDay, todayDay, onselect }: { selectedDay: number; todayDay: number; onselect: (day: number, animate?: boolean) => void } = $props();

  let isDown = false;
  let isScrubbing = false; // 本次交互是否已经触发滑动
  let startX = 0;
  let startY = 0;
  let pointerId = -1;
  let barElement: HTMLElement | null = $state(null);

  // 记录最后一次选中的天，避免在同一个按键内重复触发 onselect
  let lastSelectedIdx = -1;

  function handlePointerDown(e: PointerEvent) {
    isDown = true;
    startX = e.clientX;
    startY = e.clientY;
    pointerId = e.pointerId;
    isScrubbing = false;
    lastSelectedIdx = selectedDay;
  }

  function handlePointerMove(e: PointerEvent) {
    if (!isDown) return;

    if (!isScrubbing) {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      // 水平移动超过 8px 且水平距离大于垂直距离，判定为滑动选择（scrubbing）
      if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
        isScrubbing = true;

        // 判定为滑动选择后，才开始捕获指针，这样可以确保单纯的点击/轻触不会被捕获，
        // 从而让子元素的点击事件（onclick）和标准位移动画能被正常触发
        const bar = barElement || (e.currentTarget as HTMLElement);
        if (bar) {
          try {
            bar.setPointerCapture(pointerId);
          } catch (err) {
            console.error('setPointerCapture failed:', err);
          }
        }
      }
    }

    if (isScrubbing) {
      const bar = barElement || (e.currentTarget as HTMLElement);
      if (!bar) return;
      const rect = bar.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pos = Math.max(0, Math.min(6.999, (x / rect.width) * 7));
      const idx = Math.floor(pos) + 1;

      if (idx !== lastSelectedIdx) {
        lastSelectedIdx = idx;
        // 传递 animate=false 告诉 DaySchedule 执行它的跟手渐显
        onselect(idx, false);

        // 连续滑动切天：每切一天触发一次轻微物理触感（振动）。
        // impact 返回 Promise，Web 端不支持时表现为 reject，触感只是锦上添花，忽略即可
        Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
      }
    }
  }

  function handlePointerUp(e: PointerEvent) {
    if (!isDown) return;
    isDown = false;

    const bar = barElement || (e.currentTarget as HTMLElement);
    if (bar && pointerId !== -1 && isScrubbing) {
      try {
        bar.releasePointerCapture(pointerId);
      } catch (err) {}
    }

    isScrubbing = false;
    pointerId = -1;
  }
</script>

<footer class="bottom-week-bar"
    bind:this={barElement}
    onpointerdown={handlePointerDown}
    onpointermove={handlePointerMove}
    onpointerup={handlePointerUp}
    onpointercancel={handlePointerUp}
  >
    {#each WEEK_DAYS as day, idx}
      {@const dayNum = idx + 1}
      <button
        class="week-chip"
        class:active={selectedDay === dayNum}
        class:today={dayNum === todayDay}
        onclick={() => onselect(dayNum, true)}
      >
        <span class="chip-label">{dayNum === todayDay ? '今天' : day}</span>
      </button>
    {/each}
  </footer>

<style>
  .bottom-week-bar {
    position: absolute;
    /* 贴住 root 底边（root 已铺满页面容器），安全区由自身 padding 兜住 */
    bottom: 0;
    left: -20px;
    right: -20px;
    background: rgba(255, 255, 255, 0.92);
    backdrop-filter: blur(12px);
    border-top: 1px solid #e2e8f0;
    padding: 8px 12px calc(env(safe-area-inset-bottom, 10px) + 8px);
    display: flex;
    justify-content: space-between;
    gap: 4px;
    z-index: 60;
    touch-action: none;
    cursor: grab;
  }

  .week-chip {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 8px 0;
    border: none;
    background: transparent;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .chip-label {
    font-size: 12px;
    font-weight: 600;
    color: #64748b;
  }

  .week-chip.today .chip-label {
    color: #0f172a;
    font-weight: 700;
  }
  .week-chip.today:not(.active) .chip-label {
    text-decoration: underline;
    text-underline-offset: 3px;
    text-decoration-thickness: 1.5px;
  }

  .week-chip.active {
    background: #0f172a;
  }
  .week-chip.active .chip-label {
    color: #ffffff;
    font-weight: 700;
    text-decoration: none;
  }
  .week-chip.active.today {
    background: #eef2ff;
  }
  .week-chip.active.today .chip-label {
    color: #4338ca;
  }
</style>
