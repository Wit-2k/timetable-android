<script lang="ts">
  let { onadd }: { onadd: () => void } = $props();
</script>

<!-- 悬浮添加按钮 (Floating Action Button) -->
<div class="fab-group">
  <button class="fab fab-add" onclick={onadd} aria-label="添加课程或日程">
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-plus">
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M12 5l0 14" />
      <path d="M5 12l14 0" />
    </svg>
  </button>
</div>

<style>
  /* 右下角悬浮按钮容器（避开底部周条） */
  .fab-group {
    position: absolute;
    right: 10px;
    bottom: calc(env(safe-area-inset-bottom, 20px) + 80px);
    z-index: 50;
  }

  /* 悬浮球通用底座 */
  .fab {
    width: 60px;
    height: 60px;
    border-radius: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }

  .fab:active {
    transform: scale(0.9);
  }

  /* 经典深黑加号按钮 */
  .fab-add {
    background-color: #0f172a;
    color: #ffffff;
    font-size: 26px;
    box-shadow: 0 6px 16px rgba(15, 23, 42, 0.25);
  }
</style>
