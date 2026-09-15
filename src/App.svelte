<script lang="ts">
  import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
  import { Share } from "@capacitor/share";

  // 1. 预设每天 1~12 节的具体作息时间
  const PERIOD_TIMETABLE = {
    1:  { start: "08:30", end: "09:15" },
    2:  { start: "09:20", end: "10:05" },
    3:  { start: "10:25", end: "11:10" },
    4:  { start: "11:15", end: "12:00" },
    5:  { start: "13:50", end: "14:35" },
    6:  { start: "14:40", end: "15:25" },
    7:  { start: "15:30", end: "16:15" },
    8:  { start: "16:30", end: "17:15" },
    9:  { start: "17:20", end: "18:05" },
    10: { start: "18:30", end: "19:15" },
    11: { start: "19:20", end: "20:05" },
    12: { start: "20:10", end: "20:55" }
  };

  const WEEK_DAYS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
  const PALETTE = ["#4f46e5", "#059669", "#d97706", "#7c3aed", "#e11d48", "#0284c7"];

  // 2. 本地持久化状态：开学第一周周一的日期、课程总库
  let semesterStartDate = localStorage.getItem('semester_start') || "2026-03-02";
  let courseList = JSON.parse(localStorage.getItem('courses') || '[]');

  // 如果第一次使用，塞入你的这门示范课程
  if (courseList.length === 0) {
    courseList = [
      {
        id: "c1",
        name: "大数据与人工智能",
        startWeek: 1,
        endWeek: 16,
        location: "教1-437",
        teacher: "李学识",
        color: PALETTE[0],
        schedules: [
          { dayOfWeek: 2, startPeriod: 9, endPeriod: 12 }, // 周二第 9~12 节
          { dayOfWeek: 4, startPeriod: 3, endPeriod: 4 }   // 示范：周四第 3~4 节
        ]
      }
    ];
  }

  // 保存到本地
  function saveData() {
    localStorage.setItem('courses', JSON.stringify(courseList));
    localStorage.setItem('semester_start', semesterStartDate);
  }

  function handleSemesterStartChange() {
    saveData();
    calculateCurrentTime();
    // selectedInfo/displayCourses 已通过响应式依赖 semesterStartDate 自动重算，
    // 这里再强制触发布局刷新，兼容部分 Android WebView 日期控件只触发 input 的情况
    semesterStartDate = semesterStartDate;
  }

  // 3. 计算当前是第几周、周几
  let currentWeek = 1;
  let currentDayOfWeek = 1; // 1代表周一，7代表周日

    // 视图切换：0 代表今天，1 代表明天
  let viewOffset = 0;

  // 计算当前查看的日期的 周次(1~30) 和 星期几(1~7)
  // 注意：startDateStr 必须作为显式参数传入，否则 Svelte 无法追踪
  // semesterStartDate 的变化，会导致修改开学日期后课表不刷新
  function getTargetDateInfo(offsetDays = 0, startDateStr = semesterStartDate) {
    const target = new Date();
    target.setDate(target.getDate() + offsetDays);

    const jsDay = target.getDay();
    const dayOfWeek = jsDay === 0 ? 7 : jsDay;

    const start = new Date(startDateStr + "T00:00:00");
    const diffTime = target.getTime() - start.getTime();
    let week = 1;
    if (diffTime >= 0) {
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      week = Math.floor(diffDays / 7) + 1;
    }

    return { week, dayOfWeek };
  }

  // 响应式跟踪当前选中的是哪天
  // 必须把 semesterStartDate 写进依赖，否则修改开学日期后不会重算
  $: selectedInfo = getTargetDateInfo(viewOffset, semesterStartDate);

  // 将之前的 todayCourses 改为支持切换天数的响应式数据
  $: displayCourses = courseList
    .flatMap(course => {
      if (selectedInfo.week < course.startWeek || selectedInfo.week > course.endWeek) return [];
      
      const slots = course.schedules.filter(s => s.dayOfWeek === selectedInfo.dayOfWeek);
      return slots.map(slot => ({
        ...course,
        slot,
        timeText: getTimeRange(slot.startPeriod, slot.endPeriod)
      }));
    })
    .sort((a, b) => a.slot.startPeriod - b.slot.startPeriod);

  function calculateCurrentTime() {
    const now = new Date();
    // 转换为周一为起始（JS原生 0 是周日）
    const jsDay = now.getDay();
    currentDayOfWeek = jsDay === 0 ? 7 : jsDay;

    const start = new Date(semesterStartDate + "T00:00:00");
    const diffTime = now.getTime() - start.getTime();
    if (diffTime < 0) {
      currentWeek = 1;
    } else {
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      currentWeek = Math.floor(diffDays / 7) + 1;
    }
  }

  calculateCurrentTime();

  // 根据开始和结束节次获取具体时间文字，如 "18:30 - 21:50"
  function getTimeRange(startP, endP) {
    const s = PERIOD_TIMETABLE[startP]?.start || "未知";
    const e = PERIOD_TIMETABLE[endP]?.end || "未知";
    return `${s} - ${e}`;
  }

  // 4. 响应式计算：筛选出“今天”需要上的课程列表，并按早晚排序
  $: todayCourses = courseList
    .flatMap(course => {
      // 判断本周在不在课程周次范围内
      if (currentWeek < course.startWeek || currentWeek > course.endWeek) return [];
      
      // 找出今天有哪些时间段上这门课
      const todaySlots = course.schedules.filter(s => s.dayOfWeek === currentDayOfWeek);
      return todaySlots.map(slot => ({
        ...course,
        slot,
        timeText: getTimeRange(slot.startPeriod, slot.endPeriod)
      }));
    })
    .sort((a, b) => a.slot.startPeriod - b.slot.startPeriod);

  // 5. 模态框及表单状态
  let isAddModalOpen = false;
  let isSettingsOpen = false;

  // 新课程的表单对象结构
  let newCourse = getInitialForm();

    // 标记当前是否处于编辑模式，以及正在编辑的课程 ID
  let editingCourseId: string | null = null;

  // 打开编辑课程
  function openEditCourse(course) {
    editingCourseId = course.id;
    // 深拷贝数据到表单中，避免直接污染原数组
    newCourse = JSON.parse(JSON.stringify(course));
    isAddModalOpen = true;
  }

  // 打开新增课程（重置状态）
  function openAddCourse() {
    editingCourseId = null;
    newCourse = getInitialForm();
    isAddModalOpen = true;
  }

  function getInitialForm() {
    return {
      name: "",
      credit: 2,
      startWeek: 1,
      endWeek: 16,
      location: "",
      teacher: "",
      color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
      schedules: [
        { dayOfWeek: 1, startPeriod: 1, endPeriod: 2 }
      ]
    };
  }

  function addScheduleSlot() {
    newCourse.schedules = [
      ...newCourse.schedules,
      { dayOfWeek: 1, startPeriod: 1, endPeriod: 2 }
    ];
  }

  function removeScheduleSlot(index) {
    if (newCourse.schedules.length > 1) {
      newCourse.schedules = newCourse.schedules.filter((_, i) => i !== index);
    }
  }

    // 删除指定课程（支持通过传入 ID 或直接删除当前正在编辑的课程）
  function deleteCourse(id) {
    const targetId = id || editingCourseId;
    if (!targetId) return;

    if (confirm("确定要删除这门课程吗？此操作无法撤销。")) {
      courseList = courseList.filter(c => c.id !== targetId);
      saveData();
      
      // 如果当前正开着弹窗，删完顺手关闭弹窗
      if (isAddModalOpen) {
        isAddModalOpen = false;
        editingCourseId = null;
      }
    }
  }

  function handleSaveCourse() {
    if (!newCourse.name.trim()) {
      alert("请输入课程名称");
      return;
    }

    if (editingCourseId) {
      // 修改已有课程
      courseList = courseList.map(c => c.id === editingCourseId ? { ...newCourse } : c);
    } else {
      // 新增课程
      courseList = [
        ...courseList,
        {
          ...newCourse,
          id: Date.now().toString()
        }
      ];
    }

    saveData();
    isAddModalOpen = false;
    newCourse = getInitialForm();
    editingCourseId = null;
  }

     // 导出课程文件：先落盘（落盘成功即算导出成功），再可选调起分享面板
  // Android 16 上 Share 插件只接受 file:// 地址，且部分 ROM 无应用可处理 json，
  // 因此分享失败不再视为导出失败，文件本身已保存在手机上
  let exportStatus = '';
  let exportJsonPreview = '';
  async function copyExportJson() {
    try {
      await navigator.clipboard.writeText(exportJsonPreview);
      exportStatus = '已复制到剪贴板，可粘贴保存为 .json 文件。';
    } catch (e: any) {
      exportStatus = '自动复制失败，请长按下方文本手动复制。' + (e?.message ? `（${e.message}）` : '');
    }
  }
  async function exportCourses() {
    exportStatus = '导出中，请稍候…';
    exportJsonPreview = '';
    try {
    const backupData = {
      version: 1,
      exportTime: new Date().toISOString(),
      semesterStartDate,
      courseList
    };

    const fileName = `timetable_backup_${new Date().toISOString().slice(0, 10)}.json`;
    const jsonString = JSON.stringify(backupData, null, 2);

    // 桌面端：优先使用系统“另存为”选择器
    const showSavePicker = (window as any).showSaveFilePicker;
    if (typeof showSavePicker === 'function') {
      try {
        const handle = await showSavePicker({
          suggestedName: fileName,
          types: [{
            description: 'JSON 文件',
            accept: { 'application/json': ['.json'] }
          }]
        });
        const writable = await handle.createWritable();
        await writable.write('\uFEFF' + jsonString);
        await writable.close();
        exportStatus = `已保存到你选择的目录（${fileName}）`;
        alert('课表已成功保存到指定目录！');
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        console.warn('showSaveFilePicker 失败，尝试原生方案:', err);
      }
    }

    // 原生落盘：依次尝试 Documents（文件管理可见）→ Cache（一定可写）
    exportStatus = '正在保存…';
    const failures: string[] = [];
    let savedUri: string | null = null;
    let savedDir = '';
    for (const dir of [Directory.Documents, Directory.Cache]) {
      try {
        const fileResult = await Filesystem.writeFile({
          path: fileName,
          data: jsonString,
          directory: dir,
          encoding: Encoding.UTF8
        });
        savedUri = fileResult.uri;
        savedDir = dir;
        break;
      } catch (e: any) {
        failures.push(`${dir}: ${e?.message || e}`);
      }
    }

    if (!savedUri) {
      exportStatus = '保存失败';
      exportJsonPreview = jsonString;
      alert('导出失败，写入手机存储失败，已在下方显示课表原文，可手动复制保存：\n' + failures.join('\n'));
      return;
    }

    // 落盘已成功，先告知用户文件确切位置
    const locationText = savedDir === Directory.Documents
      ? `文件已保存到手机 Documents 目录，文件名为 ${fileName}，请到文件管理中查看。`
      : `Documents 目录不可写，文件已保存到应用缓存（${savedUri}），可通过下方分享按钮发送。`;
    exportStatus = locationText;

    // 分享为可选项：仅 file:// 地址可分享，且用户取消不算失败
    if (savedUri.startsWith('file:')) {
      try {
        await Share.share({
          title: '保存课表文件',
          text: `课表备份 ${fileName}`,
          files: [savedUri],
          dialogTitle: '请选择保存位置或应用'
        });
      } catch (e: any) {
        console.warn('分享面板未完成（文件本身已保存）:', e?.message || e);
      }
    } else {
      console.warn('返回的 uri 不是 file://，跳过分享:', savedUri);
    }

    alert(locationText + (savedUri ? `\n\n完整路径：${savedUri}` : ''));
    } catch (e: any) {
      const msg = e?.message || String(e);
      exportStatus = '导出异常：' + msg;
      alert('导出异常：' + msg);
    }
  }

  // 导入文件逻辑
  let fileInputRef;

  function triggerImport() {
    fileInputRef.click(); // 触发隐藏的文件选择框
  }

  function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);

        // 基础格式校验
        if (!data.courseList || !Array.isArray(data.courseList)) {
          alert("导入失败：文件格式不符合课表数据规范！");
          return;
        }

        const isAppend = confirm("数据解析成功！\n点击【确定】合并现有课表，点击【取消】完全覆盖现有课表。");

        if (isAppend) {
          // 合并（给导入的课程重新生成唯一 id，防止冲突）
          const importedCourses = data.courseList.map(c => ({
            ...c,
            id: Date.now().toString() + Math.random().toString(36).substr(2, 4)
          }));
          courseList = [...courseList, ...importedCourses];
        } else {
          // 覆盖
          courseList = data.courseList;
          if (data.semesterStartDate) {
            semesterStartDate = data.semesterStartDate;
          }
        }

        saveData();
        calculateCurrentTime();
        alert("导入课表成功！");
      } catch (err) {
        alert("导入失败：解析 JSON 文件出错！");
      } finally {
        event.target.value = ""; // 重置 input 允许重复选同一文件
      }
    };
    reader.readAsText(file);
  }
</script>

<div class="app-container">
  <!-- 顶部标题栏 -->
    <header class="header">
    <div class="header-left">
      <!-- 动态显示查看的是第几周、周几 -->
      <span class="sub-title">第 {selectedInfo.week} 周 · {WEEK_DAYS[selectedInfo.dayOfWeek - 1]}</span>
      <div class="title-row">
        <h1 class="main-title">{viewOffset === 0 ? '今日课程' : '明日课程'}</h1>
        <!-- 今天 / 明天 切换胶囊 -->
        <div class="segmented-control">
          <button class="seg-btn" class:active={viewOffset === 0} on:click={() => viewOffset = 0}>今天</button>
          <button class="seg-btn" class:active={viewOffset === 1} on:click={() => viewOffset = 1}>明天</button>
        </div>
      </div>
    </div>
    <button class="settings-btn" on:click={() => isSettingsOpen = !isSettingsOpen} aria-label="设置">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
      </svg>
    </button>
  </header>

  <!-- 开学日期快捷设置抽屉（可折叠） -->
  {#if isSettingsOpen}
    <div class="settings-card">
      <label class="label">第一周周一的日期：</label>
      <input type="date" bind:value={semesterStartDate} on:change={handleSemesterStartChange} on:input={handleSemesterStartChange} class="input" />
    </div>
    <div class="manage-box">
      <div class="manage-title">所有课程管理 ({courseList.length})</div>
      {#each courseList as course (course.id)}
        <div class="manage-item">
          <div class="manage-info">
            <span class="manage-name">{course.name}</span>
            <span class="manage-sub">第 {course.startWeek}~{course.endWeek} 周</span>
          </div>
          <div class="manage-actions">
            <button class="edit-btn" on:click={() => openEditCourse(course)}>编辑</button>
            <button class="del-btn" on:click={() => deleteCourse(course.id)}>删除</button>
          </div>
        </div>
      {/each}
    </div>
        <!-- 隐藏的文件选择 input -->
    <input 
      type="file" 
      accept=".json,application/json" 
      bind:this={fileInputRef} 
      on:change={handleFileImport} 
      style="display: none;" 
    />

    <!-- 导入导出卡片 -->
    <div class="backup-box">
      <div class="manage-title">数据备份与迁移</div>
      <div class="backup-actions">
        <button class="backup-btn" on:click={exportCourses}>
          导出课表 (JSON)
        </button>
        <button class="backup-btn" on:click={triggerImport}>
          导入课表文件
        </button>
      </div>
      {#if exportStatus}
        <div class="export-status">{exportStatus}</div>
      {/if}
      {#if exportJsonPreview}
        <textarea class="export-preview" readonly rows="6" value={exportJsonPreview}></textarea>
        <button class="backup-btn" on:click={copyExportJson}>复制课表原文</button>
      {/if}
    </div>
  {/if}

  <!-- 今日课程列表 -->
    <main class="course-list">
    {#if displayCourses.length === 0}
      <div class="empty-state">
        <p>🎉 {viewOffset === 0 ? '今天' : '明天'}没有课程安排，好好休息吧！</p>
      </div>
    {:else}
      {#each displayCourses as item (item.id + item.slot.startPeriod + viewOffset)}
        <div class="course-card" on:click={() => openEditCourse(item)}>
          <!-- 内部卡片内容完全保持你之前写好的样式不变 -->
          <div class="color-stripe" style="background-color: {item.color};"></div>
          <div class="card-content">
            <div class="card-header">
              <h2 class="course-name">{item.name}</h2>
              {#if item.credit}
                <span class="credit-badge">{item.credit} 学分</span>
              {/if}
            </div>
            <div class="card-details">
              <div class="detail-item time">
                <span class="period-text">第 {item.slot.startPeriod}~{item.slot.endPeriod} 节</span>
                <span class="dot">·</span>
                <span class="time-range">{item.timeText}</span>
              </div>
              <div class="detail-item meta">
                <span>{item.location || "未安排地点"}</span>
                <span class="dot">·</span>
                <span>{item.teacher || "无教师"}</span>
              </div>
            </div>
          </div>
        </div>
      {/each}
    {/if}
  </main>

  <!-- 悬浮添加按钮 (Floating Action Button) -->
  <button class="fab" on:click={openAddCourse}>
    <span>＋</span>
  </button>
</div>

<!-- 添加课程的 Bottom Sheet 弹窗 -->
{#if isAddModalOpen}
  <div class="modal-overlay" on:click={() => isAddModalOpen = false}>
    <div class="modal-content" on:click|stopPropagation>
      <div class="modal-header">
        <h2>{editingCourseId ? '修改课程' : '添加新课程'}</h2>
        <button class="close-btn" on:click={() => isAddModalOpen = false}>✕</button>
      </div>

      <div class="modal-body">
        <div class="form-group">
          <label>课程名称 *</label>
          <input type="text" placeholder="例如：大数据与人工智能" bind:value={newCourse.name} class="input" />
        </div>

        <div class="form-group flex-1">
            <label>学分</label>
            <input type="number" step="0.5" min="0" placeholder="例如 2 或 3.5" bind:value={newCourse.credit} class="input" />
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label>起始周</label>
            <input type="number" min="1" max="30" bind:value={newCourse.startWeek} class="input" />
          </div>
          <div class="form-group flex-1">
            <label>结束周</label>
            <input type="number" min="1" max="30" bind:value={newCourse.endWeek} class="input" />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label>教室地点</label>
            <input type="text" placeholder="教1-437" bind:value={newCourse.location} class="input" />
          </div>
          <div class="form-group flex-1">
            <label>任课老师</label>
            <input type="text" placeholder="李学识" bind:value={newCourse.teacher} class="input" />
          </div>
        </div>

        <!-- 动态上课时间段（支持一周多次课） -->
        <div class="form-group">
          <div class="schedule-title-bar">
            <label>上课时间（支持多段）</label>
            <button class="text-btn" on:click={addScheduleSlot}>+ 添加时间段</button>
          </div>

          {#each newCourse.schedules as slot, i}
            <div class="schedule-box">
              <select bind:value={slot.dayOfWeek} class="select">
                {#each WEEK_DAYS as day, idx}
                  <option value={idx + 1}>{day}</option>
                {/each}
              </select>

              <div class="period-selects">
                <span>第</span>
                <input type="number" min="1" max="12" bind:value={slot.startPeriod} class="input num" />
                <span>~</span>
                <input type="number" min="1" max="12" bind:value={slot.endPeriod} class="input num" />
                <span>节</span>
              </div>

              {#if newCourse.schedules.length > 1}
                <button class="del-slot-btn" on:click={() => removeScheduleSlot(i)}>✕</button>
              {/if}
            </div>
          {/each}
        </div>
      </div>

      <div class="modal-footer">
        {#if editingCourseId}
          <button class="btn-delete-modal" on:click={() => deleteCourse(editingCourseId)}>删除课程</button>
        {/if}
        <button class="btn-cancel" on:click={() => isAddModalOpen = false}>取消</button>
        <button class="btn-primary" on:click={handleSaveCourse}>保存</button>
      </div>
    </div>
  </div>
{/if}

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    background-color: #f8fafc;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    -webkit-tap-highlight-color: transparent;
    user-select: none;
    -webkit-user-select: none;
  }

  .app-container {
    min-height: 100vh;
    box-sizing: border-box;
    padding: calc(env(safe-area-inset-top, 20px) + 16px) 20px calc(env(safe-area-inset-bottom, 20px) + 80px);
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    margin-top: 12px;
  }
  .header-left {
    display: flex;
    flex-direction: column;
    align-items: flex-start; /* 关键：强制左侧容器内所有子元素（副标题、主标题行）严格靠左 */
    text-align: left;
  }
  .sub-title {
    display: block;
    text-align: left;
    margin: 0;
    padding-left: 2px; /* 微微对齐大标题的首字笔画 */
    font-size: 13px;
    font-weight: 600;
    color: #64748b;
    letter-spacing: 0.5px;
  }
  .main-title {
    margin: 2px 0 0 0;
    font-size: 26px;
    font-weight: 800;
    color: #0f172a;
  }

  .settings-btn {
    background: transparent; /* 去除白色底块 */
    border: none;             /* 去除外边框 */
    box-shadow: none;        /* 去除阴影 */
    color: #0f172a;          /* 原生高级深黑色 */
    padding: 8px;
    border-radius: 50%;      /* 纯圆手势热区 */
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.15s ease, opacity 0.15s ease;
    -webkit-tap-highlight-color: transparent;
  }

  .settings-btn svg {
    width: 25px;
    height: 25px;
  }

  /* 原生点按手感反馈：微缩 + 微透明 */
  .settings-btn:active {
    transform: scale(0.92);
    opacity: 0.7;
  }

  .settings-card {
    background: #ffffff;
    padding: 14px 16px;
    border-radius: 14px;
    margin-bottom: 16px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.03);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .course-list {
    display: flex;
    flex-direction: column;
    gap: 14px;
    margin-top: 30px;
  }

  .course-card {
    display: flex;
    background: #ffffff;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 3px 12px rgba(15, 23, 42, 0.04);
  }
  .color-stripe {
    width: 6px;
    flex-shrink: 0;
  }
  .card-content {
    flex: 1;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 10px;
  }
  .course-name {
    margin: 0;
    font-size: 17px;
    font-weight: 700;
    color: #1e293b;
  }
  .credit-badge {
    font-size: 13px;
    font-weight: 700;
    color: #4f46e5;
    background: #eef2ff;
    padding: 3px 8px;
    border-radius: 8px;
    flex-shrink: 0;
    white-space: nowrap;
  }
  .time-range {
    font-size: 14px;
    font-weight: 700;
    color: #0f172a; /* 让时间字体更醒目深黑 */
  }
  .card-details .meta {
    font-size: 13px;
    color: #64748b;
    display: flex;
    gap: 6px;
  }
  .detail-item.time {
    display: flex;
    align-items: center;
    gap: 6px;
    text-align: left;
    margin-bottom: 5px;
  }
  .period-text {
    font-size: 13px;
    font-weight: 600;
    color: #64748b;
  }
  .empty-state {
    text-align: center;
    padding: 60px 0;
    color: #94a3b8;
    font-size: 15px;
  }

  /* 悬浮 + 号按钮 (FAB) */
  .fab {
    position: fixed;
    right: 24px;
    bottom: calc(env(safe-area-inset-bottom, 20px) + 24px);
    width: 56px;
    height: 56px;
    border-radius: 28px;
    background-color: #0f172a;
    color: #ffffff;
    font-size: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    box-shadow: 0 6px 16px rgba(15, 23, 42, 0.25);
    cursor: pointer;
    transition: transform 0.1s ease;
  }
  .fab:active {
    transform: scale(0.9);
  }

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
  .close-btn {
    border: none;
    background: none;
    font-size: 18px;
    color: #94a3b8;
    cursor: pointer;
  }
  .modal-body {
    overflow-y: auto;
    overflow-x: hidden; /* 禁止横向滚动 */
    display: flex;
    flex-direction: column;
    gap: 14px;
    width: 100%;
    box-sizing: border-box;
  }

  .form-group {
    display: flex;
    flex-direction: column;    
    gap: 6px;
    width: 100%;
    box-sizing: border-box;
  }
  .form-group label {
    font-size: 12px;
    font-weight: 600;
    color: #64748b;
    text-align: left;
  }
  .form-row {
    display: flex;
    gap: 12px;
    width: 100%;
    box-sizing: border-box;
  }
  .flex-1 { 
    flex: 1 1 0; 
    min-width: 0;
  }

  .input, .select {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    font-size: 14px;
    background: #f8fafc;
    box-sizing: border-box;
    outline: none;
  }
  .input:focus, .select:focus {
    border-color: #4f46e5;
    background: #fff;
  }
  .input.num {
    width: 48px;
    text-align: center;
  }

  .schedule-title-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .text-btn {
    border: none;
    background: none;
    color: #4f46e5;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
  }
  .schedule-box {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #f1f5f9;
    padding: 8px 10px;
    border-radius: 10px;
    margin-bottom: 6px;
    width: 100%;
    box-sizing: border-box;
  }
  .schedule-box .select {
    width: auto;
    flex: 0 0 76px;
  }
  .period-selects {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 13px;
    color: #475569;
    flex: 1;
    min-width: 0;
  }
  .period-selects .input.num {
    width: 44px; /* 节次输入框宽度固定 */
    flex: 0 0 44px;
    padding: 8px 4px;
    text-align: center;
  }
  .del-slot-btn {
    background: none;
    border: none;
    color: #ef4444;
    font-size: 14px;
    margin-left: auto;
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
    /* 课程管理列表样式 */
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
    /* 编辑弹窗底部的删除按钮 */
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

    /* 备份与导入导出样式 */
  .backup-box {
    background: #ffffff;
    border-radius: 14px;
    padding: 12px 16px;
    margin-bottom: 16px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .backup-actions {
    display: flex;
    gap: 10px;
  }
  .backup-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 10px;
    border: 1px solid #e2e8f0;
    background: #f8fafc;
    color: #1e293b;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
  }
  .backup-btn:active {
    background: #e2e8f0;
  }
  .export-status {
    font-size: 12px;
    color: #475569;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 8px 10px;
    word-break: break-all;
    text-align: left;
  }
  .export-preview {
    width: 100%;
    box-sizing: border-box;
    font-size: 11px;
    font-family: monospace;
    background: #0f172a;
    color: #e2e8f0;
    border-radius: 8px;
    padding: 8px 10px;
    user-select: text;
    -webkit-user-select: text;
  }
    /* 标题行与今天/明天切换胶囊 */
  .title-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 4px;
  }

  .segmented-control {
    display: flex;
    background: #e2e8f0;
    padding: 3px;
    border-radius: 12px;
  }

  .seg-btn {
    border: none;
    background: transparent;
    padding: 4px 12px;
    border-radius: 9px;
    font-size: 13px;
    font-weight: 600;
    color: #64748b;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .seg-btn.active {
    background: #ffffff;
    color: #0f172a;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  }
</style>