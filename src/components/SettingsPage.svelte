<script lang="ts">
  import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

  import { validateBackupData } from '../lib/utils/validate';
  import { buildBackup } from '../lib/domain/backup';
  import { importData, saveData, timetable } from '../lib/stores/timetable.svelte';
  import { calculateCurrentTime } from '../lib/stores/view.svelte';
  import { deleteCourse, deleteEvent, openEditCourse, openEditEvent } from '../lib/stores/modal.svelte';
  import { goHome } from '../lib/stores/navigation';

  // —— 开学日期变更 ——
  function handleSemesterStartChange() {
    // bind:value 已在 input 事件中更新 semesterStartDate，
    // 依赖它的 selectedInfo / displayCourses 会自动重算，这里只需落盘并重算当前周次
    saveData();
    calculateCurrentTime();
  }

  // —— 导入导出（IO 留在本组件）——
  let fileInputRef = $state<HTMLInputElement>();

  function triggerImport() {
    fileInputRef?.click(); // 触发隐藏的文件选择框
  }

  async function exportCourses() {
    const { data, fileName } = buildBackup(timetable.semesterStartDate, timetable.courseList, timetable.eventList);
    const jsonString = JSON.stringify(data, null, 2);
    try {
      const result = await Filesystem.writeFile({
        path: fileName,
        data: jsonString,
        directory: Directory.Documents,
        encoding: Encoding.UTF8
      });
      let fullPath = decodeURIComponent(result.uri).replace(/^file:\/\//, '');
      // 弹窗显示绝对物理路径
      alert(`✅ 导出成功！\n\n完整保存路径：\n${fullPath}`);
    } catch (e) {
      alert('保存失败：' + (e instanceof Error ? e.message : String(e)));
    }
  }

  function handleFileImport(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const raw = e.target?.result;
        if (typeof raw !== 'string') throw new Error('non-text file');
        const backup = validateBackupData(JSON.parse(raw));

        if (!backup) {
          alert("导入失败：文件格式不符合课表数据规范！");
          return;
        }

        const isAppend = confirm("数据解析成功！\n点击【确定】合并现有课表，点击【取消】完全覆盖现有课表。");
        importData(backup, isAppend ? 'merge' : 'replace');
        calculateCurrentTime();
        alert("导入课表成功！");
      } catch {
        alert("导入失败：解析 JSON 文件出错！");
      } finally {
        input.value = ""; // 重置 input 允许重复选同一文件
      }
    };
    reader.readAsText(file);
  }
</script>

<div class="page-settings">
  <input
    type="file"
    accept=".json, application/json"
    bind:this={fileInputRef}
    onchange={handleFileImport}
    style="display: none;"
  />
  <header class="header settings-header">
      <button class="back-btn" onclick={goHome} aria-label="返回课表">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <h1 class="main-title">编辑</h1>
  </header>

  <div class="settings-card">
    <label class="label">本学期第一周周一的日期</label>
    <input
      type="date"
      bind:value={timetable.semesterStartDate}
      onchange={handleSemesterStartChange}
      class="input"
    />
  </div>

  <div class="manage-box">
    <div class="manage-title">所有已添加课程 ({timetable.courseList.length})</div>
    {#each timetable.courseList as course (course.id)}
      <div class="manage-item">
        <div class="manage-info">
          <span class="manage-name">{course.name}</span>
          <span class="manage-sub">第 {course.startWeek}~{course.endWeek} 周 · {course.credit || 0} 学分{#if course.assessment && course.assessment !== '未知'} · {course.assessment}{/if}</span>
        </div>
        <div class="manage-actions">
          <button class="edit-btn" onclick={() => openEditCourse(course)}>编辑</button>
          <button class="del-btn" onclick={() => deleteCourse(course.id)}>删除</button>
        </div>
      </div>
    {/each}
  </div>

  <div class="manage-box">
    <div class="manage-title">所有自定义日程 ({timetable.eventList.length})</div>
    {#each timetable.eventList as ev (ev.id)}
      <div class="manage-item">
        <div class="manage-info">
          <span class="manage-name">{ev.content}</span>
          <span class="manage-sub">{ev.date} · {#if ev.startTime && ev.endTime}{ev.startTime}-{ev.endTime}{:else}全天{/if}</span>
        </div>
        <div class="manage-actions">
          <button class="edit-btn" onclick={() => openEditEvent(ev)}>编辑</button>
          <button class="del-btn" onclick={() => deleteEvent(ev.id)}>删除</button>
        </div>
      </div>
    {/each}
  </div>

  <div class="quick-backup-bar">
    <button class="quick-btn" onclick={exportCourses}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
      <span>导出备份</span>
    </button>
    <button class="quick-btn" onclick={triggerImport}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
      <span>导入还原</span>
    </button>
  </div>
</div>

<style>
  .page-settings {
    display: flex;
    flex-direction: column;
    gap: 16px;
    /* 高度锁定为 App 页面容器的高度，内容超出一屏时在本区域内滚动 */
    height: 100%;
    box-sizing: border-box;
    padding-bottom: calc(env(safe-area-inset-bottom, 20px) + 80px);
    overflow-y: auto;
    /* 保留本区域的回弹、且不向页面传导（contain）。
       不要给 html/body 加 overscroll-behavior: none —— 真机实测那样会让
       内部滚动区域的回弹一起消失 */
    overscroll-behavior-y: contain;
    scrollbar-width: none;
  }

  .page-settings::-webkit-scrollbar {
    display: none;
  }

  /* 与 HomeHeader 同源的头部样式（两页各自渲染 <header class="header">） */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    margin-top: 12px;
  }
  .main-title {
    margin: 0;
    font-size: 22px;
    font-weight: 800;
    color: #0f172a;
    letter-spacing: -0.5px;
  }

  .settings-header {
    display: flex;
    align-items: center;
    justify-content: flex-start; /* 靠左排列 */
    gap: 8px; /* 箭头与标题的间距 */
    margin-bottom: 20px;
  }

  .back-btn {
    background: transparent;
    border: none;
    color: #0f172a; /* 纯黑 */
    padding: 6px;
    margin-left: -6px; /* 抵消内边距，使箭头物理边缘与下方卡片完美左对齐 */
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform 0.15s ease, opacity 0.15s ease;
    -webkit-tap-highlight-color: transparent;
  }
  .back-btn svg {
    width: 24px;
    height: 24px;
  }
  /* 点按反馈：原生微缩微透 */
  .back-btn:active {
    transform: scale(0.9);
    opacity: 0.6;
  }

  .quick-backup-bar {
    display: flex;
    gap: 10px;
    margin-top: -10px;
  }

  .quick-btn {
    height: 40px;
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 8px 12px;
    font-size: 12px;
    font-weight: 600;
    color: #475569;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.03);
    cursor: pointer;
  }
  .quick-btn:active {
    background: #f1f5f9;
  }
  .quick-btn svg {
    width: 14px;
    height: 14px;
  }

  .settings-card {
    background: #ffffff;
    padding: 14px 16px;
    border-radius: 14px;
    margin-bottom: 16px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.03);
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .settings-card .label {
    display: block;
  }

  .manage-box {
    background: #ffffff;
    border-radius: 14px;
    padding: 12px 16px;
    margin-bottom: 16px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .manage-title {
    font-size: 13px;
    font-weight: 700;
    color: #475569;
    border-bottom: 1px solid #f1f5f9;
    padding-bottom: 8px;
  }
  .manage-item {
    display: flex;
    justify-content: space-between;
    align-items: flex-start; /* 关键：顶部对齐，防止按钮被挤到中间 */
    padding: 8px 0;
    border-bottom: 1px solid #f8fafc;
    gap: 12px; /* 给文字和按钮留出固定安全间距 */
  }

  .manage-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start; /* 关键：强制内部所有子元素（名字和周次）靠左对齐 */
    gap: 4px;
  }

  .manage-name {
    font-size: 14px;
    font-weight: 600;
    color: #1e293b;
    line-height: 1.4; /* 优化换行后的行高 */
    text-align: left;  /* 确保换行后始终左对齐 */
    word-break: break-all;
  }

  .manage-sub {
    font-size: 12px;
    color: #94a3b8;
    text-align: left; /* 确保自身文字靠左 */
  }

  .manage-actions {
    display: flex;
    gap: 6px;
    flex-shrink: 0; /* 关键：绝对禁止按钮被挤压变窄 */
    margin-top: 2px; /* 让按钮与第一行文字基线对齐 */
  }
  .edit-btn {
    padding: 4px 10px;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    background: #f8fafc;
    color: #3b82f6;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
  }
  .del-btn {
    padding: 4px 10px;
    border-radius: 8px;
    border: 1px solid #fee2e2;
    background: #fef2f2;
    color: #ef4444;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
  }
</style>
