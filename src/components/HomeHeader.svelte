<script lang="ts">
  let { week, dayLabel, dateLabel }: { week: number; dayLabel: string; dateLabel: string } = $props();
</script>

<header class="header">
  <div class="header-left">
    <h1 class="main-title">第 {week} 周 · {dayLabel}</h1>
    <span class="sub-title">
      {dateLabel}
    </span>
  </div>
</header>

<style>
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    margin-top: 12px;
  }
  .header-left {
    display: flex;
    flex-direction: column;
    align-items: flex-start; /* 关键：强制左侧容器内所有子元素（副标题、主标题行）严格靠左 */
    text-align: left;
  }
  .sub-title {
    display: block;
    text-align: left;
    margin: 0;
    padding-left: 2px; /* 微微对齐大标题的首字笔画 */
    font-size: 14px;
    font-weight: 600;
    color: #64748b;
    letter-spacing: 0.5px;
    margin-top: 8px;
  }
  .main-title {
    margin: 2px 0 0 0;
    font-size: 22px;
    font-weight: 800;
    color: #0f172a;
    letter-spacing: -0.5px;
  }
</style>
