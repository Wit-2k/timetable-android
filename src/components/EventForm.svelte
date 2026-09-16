<script lang="ts">
  import type { EventDraft } from '../lib/constants';
  import '../lib/styles/form.css';

  let { event = $bindable() }: { event: EventDraft } = $props();
</script>

<div class="modal-body">
  <div class="form-group">
    <label>内容 *</label>
    <input type="text" bind:value={event.content} placeholder="例如：去图书馆还书" class="input" />
  </div>

  <div class="form-group">
    <label>日期 *</label>
    <input type="date" bind:value={event.date} class="input" />
  </div>

  <div class="form-row">
    <div class="form-group flex-1">
      <label>开始时间（可选）</label>
      <input type="time" bind:value={event.startTime} class="input" />
    </div>
    <div class="form-group flex-1">
      <label>结束时间（可选）</label>
      <input type="time" bind:value={event.endTime} class="input" />
    </div>
  </div>

  <div class="form-group">
    <label>备注</label>
    <textarea bind:value={event.note} placeholder="补充说明（可选）" class="input textarea" rows="3"></textarea>
  </div>
</div>
