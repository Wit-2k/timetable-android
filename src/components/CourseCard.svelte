<script lang="ts">
  import type { Course } from '../lib/constants';
  import type { DisplayCourse } from '../lib/domain/course';
  import '../lib/styles/card.css';

  let { item, onedit }: { item: DisplayCourse; onedit: (course: Course) => void } = $props();

  // 整张卡片就是「编辑这门课」的入口：用 role="button" 补上按钮语义，
  // 并按按钮的约定响应 Enter / 空格
  function activateOnKey(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onedit(item);
    }
  }
</script>

<div class="course-card" role="button" tabindex="0"
  onclick={() => onedit(item)}
  onkeydown={activateOnKey}
  style="background-color: #fff; border-color: color-mix(in srgb, {item.color} 22%, #ffffff);"
>
  <div class="card-content">
    <div class="card-header">
      <h2 class="course-name">{item.name}</h2>
    </div>

    <div class="card-details">
      <div class="detail-item time">
        <span class="period-text">第 {item.slot.startPeriod}~{item.slot.endPeriod} 节</span>
        <span class="dot">·</span>
        <span class="time-range">{item.timeText}</span>
      </div>
      <div class="detail-item meta">
        <span>{item.location || "未安排地点"}</span>
        <span class="dot">·</span>
        <span>{item.teacher || "无教师"}</span>
      </div>
    </div>
  </div>
  <div class="badge-group">
    {#if item.credit}
      <span class="credit-badge">{item.credit} 学分</span>
    {/if}
    {#if item.assessment && item.assessment !== '未知'}
      <span class="assess-badge" class:exam={item.assessment === '考试'} class:quiz={item.assessment === '考查'}>{item.assessment}</span>
    {/if}
  </div>
</div>

<style>
  .credit-badge {
    font-size: 13px;
    font-weight: 700;
    color: #4f46e5;
    background: #eef2ff;
    padding: 3px 8px;
    border-radius: 8px;
    flex-shrink: 0;
    white-space: nowrap;
  }

  .assess-badge {
    font-size: 13px;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 8px;
    flex-shrink: 0;
    white-space: nowrap;
  }

  .assess-badge.exam {
    color: #c36218;
    background: #fef3c7;
  }

  .assess-badge.quiz {
    color: #2563eb;
    background: #dbeafe;
  }
</style>
