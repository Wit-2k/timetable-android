<script lang="ts">
  import { WEEK_DAYS } from '../lib/constants';
  import type { CourseDraft } from '../lib/constants';
  import { addScheduleSlot, removeScheduleSlot } from '../lib/stores/modal.svelte';
  import '../lib/styles/form.css';

  let { course = $bindable() }: { course: CourseDraft } = $props();
</script>

<div class="modal-body">
  <div class="form-group">
    <label for="course-name">课程名称 *</label>
    <input id="course-name" type="text" bind:value={course.name} class="input" />
  </div>

  <div class="form-row">
    <div class="form-group credit-field">
      <label for="course-credit">学分</label>
      <input id="course-credit" type="number" step="0.5" min="0" placeholder="0.5 的整数倍" bind:value={course.credit} class="input" />
    </div>
    <div class="form-group flex-1">
      <label for="course-assessment">考核方式</label>
      <select id="course-assessment" bind:value={course.assessment} class="select">
        <option value="考试">考试</option>
        <option value="考查">考查</option>
        <option value="未知">未知</option>
      </select>
    </div>
  </div>

  <div class="form-row">
    <div class="form-group flex-1">
      <label for="course-start-week">起始周</label>
      <input id="course-start-week" type="number" min="1" max="30" bind:value={course.startWeek} class="input" />
    </div>
    <div class="form-group flex-1">
      <label for="course-end-week">结束周</label>
      <input id="course-end-week" type="number" min="1" max="30" bind:value={course.endWeek} class="input" />
    </div>
  </div>

  <div class="form-row">
    <div class="form-group flex-1">
      <label for="course-location">教室地点</label>
      <input id="course-location" type="text" bind:value={course.location} class="input" />
    </div>
    <div class="form-group flex-1">
      <label for="course-teacher">任课老师</label>
      <input id="course-teacher" type="text" bind:value={course.teacher} class="input" />
    </div>
  </div>

  <!-- 动态上课时间段（支持一周多次课） -->
  <div class="form-group">
    <div class="schedule-title-bar">
      <!-- 整组时间段的小标题：不对应单个控件，所以用 span 而不是 label -->
      <span class="group-label">上课时间（支持多段）</span>
      <button class="text-btn" onclick={addScheduleSlot}>+ 添加时间段</button>
    </div>

    {#each course.schedules as slot, i}
      <div class="schedule-box">
        <select bind:value={slot.dayOfWeek} class="select">
          {#each WEEK_DAYS as day, idx}
            <option value={idx + 1}>{day}</option>
          {/each}
        </select>

        <div class="period-selects">
          <span>第</span>
          <input type="number" min="1" max="12" bind:value={slot.startPeriod} class="input num" />
          <span>~</span>
          <input type="number" min="1" max="12" bind:value={slot.endPeriod} class="input num" />
          <span>节</span>
        </div>

        {#if course.schedules.length > 1}
          <button class="del-slot-btn" onclick={() => removeScheduleSlot(i)}>✕</button>
        {/if}
      </div>
    {/each}
  </div>
</div>

<style>
  .credit-field {
    flex: 1 1 0;
    min-width: 0;
    max-width: 130px;
  }

  .schedule-title-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .text-btn {
    border: none;
    background: none;
    color: #4f46e5;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
  }
  .schedule-box {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #f1f5f9;
    padding: 8px 10px;
    border-radius: 10px;
    margin-bottom: 6px;
    width: 100%;
    box-sizing: border-box;
  }
  .schedule-box .select {
    width: auto;
    flex: 0 0 76px;
  }
  .period-selects {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 13px;
    color: #475569;
    flex: 1;
    min-width: 0;
  }
  .period-selects .input.num {
    width: 44px; /* 节次输入框宽度固定 */
    flex: 0 0 44px;
    padding: 8px 4px;
    text-align: center;
  }
  .del-slot-btn {
    background: none;
    border: none;
    color: #ef4444;
    font-size: 14px;
    margin-left: auto;
    cursor: pointer;
  }
</style>
