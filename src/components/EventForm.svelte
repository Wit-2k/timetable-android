<script lang="ts">
  import type { EventDraft } from '../lib/constants';
  import '../lib/styles/form.css';

  let { event = $bindable() }: { event: EventDraft } = $props();
</script>

<div class="modal-body">
  <div class="form-group">
    <label for="event-content">内容 *</label>
    <input id="event-content" type="text" bind:value={event.content} placeholder="例如：去图书馆还书" class="input" />
  </div>

  <div class="form-group">
    <label for="event-date">日期 *</label>
    <input id="event-date" type="date" bind:value={event.date} class="input" />
  </div>

  <div class="form-row">
    <div class="form-group flex-1">
      <label for="event-start-time">开始时间（可选）</label>
      <input id="event-start-time" type="time" bind:value={event.startTime} class="input" />
    </div>
    <div class="form-group flex-1">
      <label for="event-end-time">结束时间（可选）</label>
      <input id="event-end-time" type="time" bind:value={event.endTime} class="input" />
    </div>
  </div>

  <div class="form-group">
    <label for="event-note">备注</label>
    <textarea id="event-note" bind:value={event.note} placeholder="补充说明（可选）" class="input textarea" rows="3"></textarea>
  </div>
</div>
