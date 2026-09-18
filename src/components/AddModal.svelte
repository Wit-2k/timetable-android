<script lang="ts">
  import {
    closeModal,
    deleteCourse,
    deleteEvent,
    modal,
    saveCourse,
    saveEvent,
    switchModalMode
  } from '../lib/stores/modal.svelte';
  import { fade } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import CourseForm from './CourseForm.svelte';
  import EventForm from './EventForm.svelte';

  // 面板切换动画的两个起点：旧面板高度、滑入方向。
  // 只在过渡函数里读取，不需要响应式
  let panelFromHeight = 0;
  let panelX = 0;
  let panelEl: HTMLElement | null = $state(null);

  // 课程标签在左、日程标签在右：切换时新面板从目标标签所在的一侧滑入
  function switchTab(mode: 'course' | 'event') {
    if (mode === modal.modalMode) return;
    panelFromHeight = panelEl?.offsetHeight ?? 0;
    panelX = mode === 'event' ? 12 : -12;
    switchModalMode(mode);
  }

  // Bottom Sheet 贴底抽屉滑入/滑出：按弹窗自身高度的百分比位移，进出共用同一曲线
  function slideUp(node: HTMLElement, { duration = 300 }: { duration?: number } = {}) {
    return {
      duration,
      easing: cubicOut,
      css: (t: number) => `transform: translateY(${(1 - t) * 100}%);`
    };
  }

  // 面板进场：淡入 + 从切换方向滑入，高度从旧面板高度平滑过渡到新面板高度，
  // 这样抽屉不会在切换瞬间突然变高/变矮。
  // 首次打开时 panelFromHeight 为 0（不做高度过渡，也不叠加横向位移）；
  // 过渡结束后 Svelte 会清掉这些内联样式，高度回到 auto
  function panelIn(node: HTMLElement, { duration = 240 }: { duration?: number } = {}) {
    const to = node.offsetHeight; // 新面板的自然高度（内容超高时已是 85vh 截断后的高度）
    const from = panelFromHeight;
    panelFromHeight = 0; // 用完即清，避免下次打开弹窗时误用上一次切换的高度
    const animateHeight = from > 0 && Math.abs(to - from) > 1;
    return {
      duration,
      easing: cubicOut,
      css: (t: number) => {
        const height = animateHeight ? from + (to - from) * t : to;
        return `height: ${height}px; overflow: hidden; opacity: ${t}; transform: translateX(${(1 - t) * panelX}px);`;
      }
    };
  }
</script>

<!-- 添加课程/日程的 Bottom Sheet 弹窗 -->
{#if modal.isAddModalOpen}
  <!-- 点遮罩关闭只是给鼠标/触摸的顺手操作：键盘用户有「✕」和「取消」两个真实按钮可达，
       而遮罩本身不该有可访问语义，所以不为它补 role/tabindex，相关告警在此忽略 -->
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="modal-overlay" transition:fade={{ duration: 200 }}
    onclick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
    <div class="modal-content" transition:slideUp>
      <div class="modal-header">
        <h2>{modal.editingCourseId ? '修改课程' : modal.editingEventId ? '修改日程' : modal.modalMode === 'course' ? '添加新课程' : '添加新日程'}</h2>
        <button class="close-btn" onclick={closeModal}>✕</button>
      </div>

      {#if !modal.editingCourseId && !modal.editingEventId}
        <div class="modal-tabs">
          <button class="tab-btn" class:active={modal.modalMode === 'course'} onclick={() => switchTab('course')}>课程</button>
          <button class="tab-btn" class:active={modal.modalMode === 'event'} onclick={() => switchTab('event')}>自定义日程</button>
        </div>
      {/if}

      <!-- 按当前标签重建面板：新面板淡入、按切换方向滑入，并把旧面板高度过渡到新高度
           （旧面板不做出场，避免两块面板同时占位） -->
      {#key modal.modalMode}
        <div class="mode-panel" bind:this={panelEl} in:panelIn>
          {#if modal.modalMode === 'course'}
            <CourseForm bind:course={modal.newCourse} />

            <div class="modal-footer">
              {#if modal.editingCourseId}
                <button class="btn-delete-modal" onclick={() => deleteCourse(modal.editingCourseId)}>删除课程</button>
              {/if}
              <button class="btn-cancel" onclick={closeModal}>取消</button>
              <button class="btn-primary" onclick={saveCourse}>保存</button>
            </div>
          {:else}
            <EventForm bind:event={modal.newEvent} />

            <div class="modal-footer">
              {#if modal.editingEventId}
                <button class="btn-delete-modal" onclick={() => deleteEvent(modal.editingEventId)}>删除日程</button>
              {/if}
              <button class="btn-cancel" onclick={closeModal}>取消</button>
              <button class="btn-primary" onclick={saveEvent}>保存</button>
            </div>
          {/if}
        </div>
      {/key}
    </div>
  </div>
{/if}

<style>
  /* 模态框样式（移动端贴底抽屉） */
  .modal-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(15, 23, 42, 0.4);
    backdrop-filter: blur(2px);
    display: flex;
    justify-content: center;
    align-items: flex-end;
    z-index: 100;
  }

  .modal-content {
    background: #ffffff;
    width: 100%;
    max-width: 500px;
    border-radius: 24px 24px 0 0;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    padding: 20px;
    box-sizing: border-box; /* 关键：防撑爆 */
    padding-bottom: calc(env(safe-area-inset-bottom, 20px) + 20px);
    overflow: hidden; /* 防止内部子元素横向溢出 */
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .modal-header h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
  }

  .modal-tabs {
    display: flex;
    background: #f1f5f9;
    border-radius: 12px;
    padding: 4px;
    gap: 4px;
    margin-bottom: 16px;
  }

  /* 「表单 + 底部按钮」的动画载体：让两者作为整体切换。
     min-height: 0 是关键——否则内容超高时这一层不会收缩，
     内层 .modal-body 就拿不到可滚动的高度 */
  .mode-panel {
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .tab-btn {
    flex: 1;
    border: none;
    background: transparent;
    padding: 8px;
    border-radius: 9px;
    font-size: 14px;
    font-weight: 600;
    color: #64748b;
    cursor: pointer;
  }

  .tab-btn.active {
    background: #ffffff;
    color: #0f172a;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.1);
  }

  .close-btn {
    border: none;
    background: none;
    font-size: 18px;
    color: #94a3b8;
    cursor: pointer;
  }

  .modal-footer {
    display: flex;
    gap: 12px;
    margin-top: 16px;
  }

  .btn-primary {
    flex: 2;
    background: #0f172a;
    color: #ffffff;
    border: none;
    padding: 12px;
    border-radius: 12px;
    font-weight: 600;
    cursor: pointer;
  }

  .btn-cancel {
    flex: 1;
    background: #f1f5f9;
    color: #475569;
    border: none;
    padding: 12px;
    border-radius: 12px;
    font-weight: 600;
    cursor: pointer;
  }

  .btn-delete-modal {
    flex: 1;
    background: #fef2f2;
    color: #ef4444;
    border: 1px solid #fee2e2;
    padding: 12px;
    border-radius: 12px;
    font-weight: 600;
    cursor: pointer;
  }
</style>
