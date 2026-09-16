<script lang="ts">
  let { onEdit, onInfo }: { onEdit: () => void; onInfo: () => void } = $props();
</script>

<div class="top-actions">
  <button class="top-btn" onclick={onEdit} aria-label="管理课程">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
      <path d="m15 5 4 4"/>
    </svg>
  </button>
  <button class="top-btn" onclick={onInfo} aria-label="作息时间说明">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="16" x2="12" y2="12"></line>
      <line x1="12" y1="8" x2="12.01" y2="8"></line>
    </svg>
  </button>
</div>

<style>
  .top-actions {
    position: fixed;
    top: calc(env(safe-area-inset-top, 20px) + 28px);
    right: 16px;
    display: flex;
    gap: 2px;
    z-index: 150;
  }

  .top-btn {
    width: 36px;
    height: 36px;
    margin-right: 6px;
    background: transparent;
    border: none;
    color: #0f172a;
    padding: 6px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition: transform 0.15s ease, opacity 0.15s ease;
  }
  .top-btn svg {
    width: 22px;
    height: 22px;
  }
  .top-btn:active {
    transform: scale(0.9);
    opacity: 0.6;
  }
</style>
