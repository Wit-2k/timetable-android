<script lang="ts">
  import { onMount } from 'svelte';
  import { cubicOut } from 'svelte/easing';

  import './lib/styles/form.css';
  import { calculateCurrentTime, view } from './lib/stores/view.svelte';
  import { initHistoryNavigation } from './lib/stores/navigation';
  import AddModal from './components/AddModal.svelte';
  import HomePage from './components/HomePage.svelte';
  import InfoModal from './components/InfoModal.svelte';
  import SettingsPage from './components/SettingsPage.svelte';

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
  {#if view.currentTab === "home"}
    <div class="page page-home" in:zoom out:zoom>
      <HomePage />
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
  :global(html), :global(body)  {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    background-color: #f8fafc;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    -webkit-tap-highlight-color: transparent;
    user-select: none;
    -webkit-user-select: none;
    overflow: hidden;
  }

  .app-container {
    /* 两个页面容器叠放在同一网格单元，过渡期间新旧页面自然重叠。
       行高锁定为视口高度（minmax 下限给 0，内容再高也不会把行撑开），
       页面内部（home 的 course-list、settings 的 page-settings）才有可滚动的高度上限，
       容器自身只负责裁剪 */
    display: grid;
    grid-template-rows: minmax(0, 1fr);
    height: 100dvh;
    box-sizing: border-box;
    padding: calc(env(safe-area-inset-top, 20px) + 16px) 20px 0;
    overflow: hidden;
  }

  .page {
    grid-area: 1 / 1;
    min-width: 0;
    min-height: 0;
    /* 不能加 overflow: hidden —— WeekBar 用左右各 -20px 通栏贴边，
       页面盒子只有 20~340，会把周条两侧裁掉（chip 圆角被切平）。
       通栏部分交给 .app-container（0~360）在视口边缘裁剪；
       页面高度由上面的网格行 + 这里的 min-height: 0 决定，不依赖 overflow */
  }
</style>
