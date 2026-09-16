<script lang="ts">
  import { PERIOD_TIMETABLE } from '../lib/constants';
  import { closeInfo, modal } from '../lib/stores/modal.svelte';
  import { fade } from 'svelte/transition';
  import { backOut } from 'svelte/easing';

  // 居中卡片弹出/缩回：backOut 轻微过冲带来"弹"的手感，缩回沿原路径收小
  function pop(node: HTMLElement, { duration = 250 }: { duration?: number } = {}) {
    return {
      duration,
      easing: backOut,
      css: (t: number) => `transform: scale(${0.85 + 0.15 * t}); opacity: ${Math.min(t, 1)};`
    };
  }
</script>

{#if modal.isInfoOpen}
  <div class="info-overlay" transition:fade={{ duration: 200 }} onclick={closeInfo}>
    <div class="info-card" transition:pop onclick={(e) => e.stopPropagation()}>
      <div class="info-header">
        <h2>作息时间</h2>
        <button class="close-btn" onclick={closeInfo}>✕</button>
      </div>
      <div class="period-table-wrap">
        <table class="period-table">
          <thead>
            <tr>
              <th>节次</th>
              <th>时间</th>
            </tr>
          </thead>
          <tbody>
            {#each Object.entries(PERIOD_TIMETABLE) as [period, time]}
              <tr>
                <td>{period}</td>
                <td>{time.start} - {time.end}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  </div>
{/if}

<style>
  .info-overlay {
    position: fixed;
    top: -40px; left: 0; right: 0; bottom: 0;
    background: rgba(15, 23, 42, 0.4);
    backdrop-filter: blur(2px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    box-sizing: border-box;
    z-index: 200;
  }

  .info-card {
    background: #ffffff;
    width: 100%;
    max-width: 340px;
    max-height: 70vh;
    border-radius: 20px;
    padding: 20px 20px 16px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .info-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .info-header h2 {
    margin: 0;
    font-size: 17px;
    font-weight: 700;
    color: #0f172a;
  }

  .period-table-wrap {
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }

  .period-table {
    width: 100%;
    border-collapse: collapse;
    border-top: 2px solid #0f172a;
    border-bottom: 2px solid #0f172a;
    font-size: 10px;
    margin-bottom: 2px;
  }

  .period-table thead th {
    top: 0;
    background: #ffffff;
    padding: 10px 8px;
    font-weight: 700;
    color: #0f172a;
    text-align: center;
    border-bottom: 1px solid #0f172a;
    z-index: 1;
  }

  .period-table tbody td {
    padding: 9px 8px;
    text-align: center;
    color: #334155;
    border-bottom: 1px solid #f1f5f9;
  }

  .period-table tbody tr:last-child td {
    border-bottom: none;
  }

  .close-btn {
    border: none;
    background: none;
    font-size: 18px;
    color: #94a3b8;
    cursor: pointer;
  }
</style>
