<script lang="ts">
  import type { EventItem } from '../lib/constants';
  import '../lib/styles/card.css';

  let { ev, onedit }: { ev: EventItem; onedit: (ev: EventItem) => void } = $props();

  // 同 CourseCard：整张卡片是一个按钮，键盘用 Enter / 空格激活
  function activateOnKey(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onedit(ev);
    }
  }
</script>

<div class="course-card event-card" role="button" tabindex="0"
  onclick={() => onedit(ev)}
  onkeydown={activateOnKey}
  style="background-color: #fff; border-color: color-mix(in oklch, {ev.color} 22%, #ffffff);"
>
  <div class="card-content">
    <div class="card-header">
      <h2 class="course-name">{ev.content}</h2>
    </div>
    <div class="card-details">
      <div class="detail-item time">
        {#if ev.startTime && ev.endTime}
          <span class="time-range">{ev.startTime} - {ev.endTime}</span>
        {:else}
          <span class="time-range">全天</span>
        {/if}
      </div>
      {#if ev.note}
        <div class="detail-item meta">
          <span>{ev.note}</span>
        </div>
      {/if}
    </div>
  </div>
  <div class="badge-group">
    <span class="event-badge">日程</span>
  </div>
</div>

<style>
  .event-badge {
    font-size: 13px;
    font-weight: 700;
    color: #059669;
    background: #ecfdf5;
    padding: 3px 8px;
    border-radius: 8px;
    flex-shrink: 0;
    white-space: nowrap;
  }
</style>
