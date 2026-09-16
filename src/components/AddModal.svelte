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

  // Bottom Sheet 贴底抽屉滑入/滑出：按弹窗自身高度的百分比位移，进出共用同一曲线
  function slideUp(node: HTMLElement, { duration = 300 }: { duration?: number } = {}) {
    return {
      duration,
      easing: cubicOut,
      css: (t: number) => `transform: translateY(${(1 - t) * 100}%);`
    };
  }
</script>

<!-- 添加课程/日程的 Bottom Sheet 弹窗 -->
{#if modal.isAddModalOpen}
  <div class="modal-overlay" transition:fade={{ duration: 200 }} onclick={closeModal}>
    <div class="modal-content" transition:slideUp onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <h2>{modal.editingCourseId ? '修改课程' : modal.editingEventId ? '修改日程' : modal.modalMode === 'course' ? '添加新课程' : '添加新日程'}</h2>
        <button class="close-btn" onclick={closeModal}>✕</button>
      </div>

      {#if !modal.editingCourseId && !modal.editingEventId}
        <div class="modal-tabs">
          <button class="tab-btn" class:active={modal.modalMode === 'course'} onclick={() => switchModalMode('course')}>课程</button>
          <button class="tab-btn" class:active={modal.modalMode === 'event'} onclick={() => switchModalMode('event')}>自定义日程</button>
        </div>
      {/if}

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
