<script lang="ts">
  import { onMount } from 'svelte';
  import { cubicOut } from 'svelte/easing';
  import { fade } from 'svelte/transition';

  import './lib/styles/form.css';
  import { calculateCurrentTime, selectDay, view } from './lib/stores/view.svelte';
  import { modal, openAddCourse, openInfo } from './lib/stores/modal.svelte';
  import { goSettings, initHistoryNavigation } from './lib/stores/navigation';
  import AddModal from './components/AddModal.svelte';
  import Fab from './components/Fab.svelte';
  import HomePage from './components/HomePage.svelte';
  import InfoModal from './components/InfoModal.svelte';
  import SettingsPage from './components/SettingsPage.svelte';
  import TopActions from './components/TopActions.svelte';
  import WeekBar from './components/WeekBar.svelte';

  // 主页⇄设置页的方向性过渡：主页缩放淡出、设置页从右侧滑入；
  // css 关于 t 对称，in/out 共用同一函数即得到"倒放"的返回效果
  function zoom(node: HTMLElement, { duration = 250 }: { duration?: number } = {}) {
    return {
      duration,
      easing: cubicOut,
      css: (t: number) => `transform: scale(${0.96 + 0.04 * t}); opacity: ${t};`
    };
  }

  function slideX(node: HTMLElement, { duration = 280 }: { duration?: number } = {}) {
    return {
      duration,
      easing: cubicOut,
      css: (t: number) => `transform: translateX(${(1 - t) * 100}%);`
    };
  }

  calculateCurrentTime();
  onMount(() => initHistoryNavigation());
</script>

<div class="app-container">
  <!-- 顶部按钮组只属于主页；淡入淡出与 Fab/周条一致 -->
  {#if view.currentTab === "home" && !modal.isAddModalOpen && !modal.editingCourseId && !modal.editingEventId}
    <div transition:fade={{ duration: 200 }}>
      <TopActions onEdit={goSettings} onInfo={openInfo} />
    </div>
  {/if}
  {#if view.currentTab === "home"}
    <div class="page page-home" in:zoom out:zoom>
      <HomePage />
    </div>
    <!-- Fab/WeekBar 是 fixed 定位，必须放在带 transform 的过渡容器外：
         transform 会让容器成为 fixed 后代的包含块，动画期间它们就会错位、
         结束后才跳回原位。这里只做整体淡入淡出，位置始终锚定视口。 -->
    <div class="home-chrome" transition:fade={{ duration: 200 }}>
      <Fab onadd={openAddCourse} />
      <WeekBar
        selectedDay={view.selectedDayOfWeek}
        todayDay={view.todayDayOfWeek}
        onselect={selectDay}
      />
    </div>
  {:else}
    <div class="page page-settings" in:slideX out:slideX>
      <SettingsPage />
    </div>
  {/if}
</div>


<AddModal />
<!-- 作息时间表弹窗 -->
<InfoModal />

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    background-color: #f8fafc;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    -webkit-tap-highlight-color: transparent;
    user-select: none;
    -webkit-user-select: none;
    /* 页面滑动过渡期间防止出现横向滚动条 */
    overflow-x: hidden;
  }

  .app-container {
    /* 两个页面容器叠放在同一网格单元，过渡期间新旧页面自然重叠 */
    display: grid;
    min-height: 100vh;
    box-sizing: border-box;
    padding: calc(env(safe-area-inset-top, 20px) + 16px) 20px calc(env(safe-area-inset-bottom, 20px) + 80px);
  }

  .page {
    grid-area: 1 / 1;
    min-width: 0;
  }
</style>
