<script lang="ts">
  import { WEEK_DAYS } from '../lib/constants';

  let { selectedDay, todayDay, onselect }: { selectedDay: number; todayDay: number; onselect: (day: number, animate?: boolean) => void } = $props();

  let isScrubbing = $state(false);

  function handleBarScrub(e: TouchEvent | PointerEvent) {
    if (!isScrubbing) return;
    const bar = e.currentTarget as HTMLElement;
    const rect = bar.getBoundingClientRect();
    const t = 'touches' in e ? e.touches[0] : e;
    const x = t.clientX - rect.left;
    const idx = Math.floor((x / rect.width) * 7) + 1;
    onselect(idx, false);
  }
</script>

<footer class="bottom-week-bar"
    ontouchstart={(e) => { isScrubbing = true; handleBarScrub(e); }}
    ontouchmove={handleBarScrub}
    ontouchend={() => isScrubbing = false}
    ontouchcancel={() => isScrubbing = false}
    onpointerdown={(e) => { isScrubbing = true; handleBarScrub(e); }}
    onpointermove={handleBarScrub}
    onpointerup={() => isScrubbing = false}
    onpointercancel={() => isScrubbing = false}
    onpointerleave={() => isScrubbing = false}
  >
    {#each WEEK_DAYS as day, idx}
      {@const dayNum = idx + 1}
      <button
        class="week-chip"
        class:active={selectedDay === dayNum}
        class:today={dayNum === todayDay}
        onclick={() => onselect(dayNum)}
      >
        <span class="chip-label">{dayNum === todayDay ? '今天' : day}</span>
      </button>
    {/each}
  </footer>

<style>
  .bottom-week-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
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
