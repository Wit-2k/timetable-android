<script lang="ts">
  import { onMount } from 'svelte';
  import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

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
  const PALETTE = ["#9AA5B1", "#7D8CA3", "#8CA6A3", "#A3B18A", "#A89BB8", "#B5838D", "#C9ADA7", "#B8C4C9"];

  // 2. 本地持久化状态：开学第一周周一的日期、课程总库、日程总库
  let semesterStartDate = $state(localStorage.getItem('semester_start') || "2026-03-02");
  let courseList = $state(JSON.parse(localStorage.getItem('courses') || '[]'));
  let eventList = $state(JSON.parse(localStorage.getItem('events') || '[]'));

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

  function saveData() {
    localStorage.setItem('courses', JSON.stringify(courseList));
    localStorage.setItem('events', JSON.stringify(eventList));
    localStorage.setItem('semester_start', semesterStartDate);
  }

   // 3. 计算当前是第几周、周几
  let currentWeek = $state(1);
  let todayDayOfWeek = $state(1); // 1代表周一，7代表周日
  let selectedDayOfWeek = $state(1);

  function calculateCurrentTime() {
    const now = new Date();
    const jsDay = now.getDay();
    todayDayOfWeek = jsDay === 0 ? 7 : jsDay;
    selectedDayOfWeek = todayDayOfWeek; // 默认选中今天

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

  function getTimeRange(startP, endP) {
    const s = PERIOD_TIMETABLE[startP]?.start || "未知";
    const e = PERIOD_TIMETABLE[endP]?.end || "未知";
    return `${s} - ${e}`;
  }

  // 4. 响应式筛选
  const displayCourses = $derived(
    courseList
    .flatMap(course => {
      if (currentWeek < course.startWeek || currentWeek > course.endWeek) return [];
      const slots = course.schedules.filter(s => s.dayOfWeek === selectedDayOfWeek);
      return slots.map(slot => ({
        ...course,
        slot,
        timeText: getTimeRange(slot.startPeriod, slot.endPeriod)
      }));
    })
    .sort((a, b) => a.slot.startPeriod - b.slot.startPeriod));

  // 5. 页面与模态框状态控制
  let currentTab = $state('home'); // 'home' | 'settings'
  let isAddModalOpen = $state(false);
  let isInfoOpen = $state(false);
  let editingCourseId = $state(null);
  let editingEventId = $state(null);
  let modalMode = $state('course'); // 'course' | 'event'

  let newCourse = $state(getInitialForm());
  let newEvent = $state(getInitialEventForm());

  function getInitialForm() {
    return {
      name: "",
      credit: 2,
      assessment: "未知",
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

  function formatDateStr(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function getSelectedDateStr(selected, today) {
    const t = new Date();
    t.setDate(t.getDate() + (selected - today));
    return formatDateStr(t);
  }

  function getInitialEventForm(dateStr) {
    const t = new Date();
    const todayStr = formatDateStr(t);
    return {
      content: "",
      date: dateStr || todayStr,
      startTime: "",
      endTime: "",
      note: "",
      color: PALETTE[Math.floor(Math.random() * PALETTE.length)]
    };
  }


  function handleSemesterStartChange() {
    saveData();
    calculateCurrentTime();
    // selectedInfo/displayCourses 已通过响应式依赖 semesterStartDate 自动重算，
    // 这里再强制触发布局刷新，兼容部分 Android WebView 日期控件只触发 input 的情况
    semesterStartDate = semesterStartDate;
  }

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

  const selectedInfo = $derived(getTargetDateInfo(selectedDayOfWeek - todayDayOfWeek, semesterStartDate));
  const selectedDateStr = $derived(getSelectedDateStr(selectedDayOfWeek, todayDayOfWeek));
  const selectedDateLabel = $derived.by(() => {
    const parts = selectedDateStr.split('-');
    if (parts.length !== 3) return selectedDateStr;
    return `${Number(parts[1])}月${Number(parts[2])}日`;
  });

  function viewHash(tab, modal) {
    if (modal) return tab === 'settings' ? '#/settings/edit' : '#/add';
    return tab === 'settings' ? '#/settings' : '#/';
  }

  function pushView(tab, modal) {
    try {
      history.pushState({ tab, modal }, '', viewHash(tab, modal));
    } catch {}
  }

  function goSettings() {
    if (currentTab === 'settings' && !isAddModalOpen) return;
    currentTab = 'settings';
    pushView('settings', isAddModalOpen);
  }

  function goHome() {
    try {
      if (history.state && (history.state.tab === 'settings' || history.state.modal)) {
        history.back();
        return;
      }
    } catch {}
    currentTab = 'home';
  }

  function openModal() {
    if (isAddModalOpen) return;
    isAddModalOpen = true;
    pushView(currentTab, true);
  }

  function closeModal() {
    if (!isAddModalOpen) return;
    try {
      if (history.state && history.state.modal) {
        history.back();
        return;
      }
    } catch {}
    isAddModalOpen = false;
    editingCourseId = null;
    editingEventId = null;
  }

  function openInfo() {
    if (isInfoOpen) return;
    isInfoOpen = true;
    try {
      history.pushState({ tab: currentTab, modal: isAddModalOpen, info: true }, '', viewHash(currentTab, isAddModalOpen));
    } catch {}
  }

  function closeInfo() {
    if (!isInfoOpen) return;
    try {
      if (history.state && history.state.info) {
        history.back();
        return;
      }
    } catch {}
    isInfoOpen = false;
  }

  onMount(() => {
    try {
      const hash = window.location.hash;
      if (hash.startsWith('#/settings')) currentTab = 'settings';
      history.replaceState({ tab: currentTab, modal: false, info: false }, '', viewHash(currentTab, false));
    } catch {}
    const onPopState = (e) => {
      const s = e.state;
      if (s && typeof s === 'object') {
        currentTab = s.tab === 'settings' ? 'settings' : 'home';
        const modal = !!s.modal;
        if (isAddModalOpen && !modal) {
          editingCourseId = null;
          editingEventId = null;
        }
        isAddModalOpen = modal;
        isInfoOpen = !!s.info;
      } else {
        currentTab = 'home';
        isAddModalOpen = false;
        isInfoOpen = false;
        editingCourseId = null;
        editingEventId = null;
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  });

  const displayEvents = $derived(
    eventList
      .filter(e => e.date === selectedDateStr)
      .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""))
  );

  let dragOffsetX = $state(0);
  let isDragging = $state(false);
  let swipeStartX = $state(0);
  let swipeStartY = $state(0);
  let isScrubbing = $state(false);
  let slideDir = $state(0);

  function selectDay(n, animate = true) {
    n = Math.max(1, Math.min(7, n));
    if (n === selectedDayOfWeek) return false;
    slideDir = animate ? (n > selectedDayOfWeek ? 1 : -1) : 0;
    selectedDayOfWeek = n;
    return true;
  }

  function handleSwipeStart(e) {
    const t = e.touches ? e.touches[0] : e;
    swipeStartX = t.clientX;
    swipeStartY = t.clientY;
    isDragging = false;
    dragOffsetX = 0;
  }

  function handleSwipeMove(e) {
    if (swipeStartX === 0 && dragOffsetX === 0) return;
    const t = e.touches ? e.touches[0] : e;
    const dx = t.clientX - swipeStartX;
    const dy = t.clientY - swipeStartY;
    if (!isDragging && Math.abs(dx) < 10) return;
    if (!isDragging && Math.abs(dx) < Math.abs(dy)) return;
    isDragging = true;
    dragOffsetX = dx;
  }

  function handleSwipeEnd() {
    if (!isDragging) {
      dragOffsetX = 0;
      swipeStartX = 0;
      return;
    }
    let changed = false;
    if (dragOffsetX < -50) changed = selectDay(selectedDayOfWeek + 1);
    else if (dragOffsetX > 50) changed = selectDay(selectedDayOfWeek - 1);
    dragOffsetX = 0;
    swipeStartX = 0;
    if (changed) requestAnimationFrame(() => { isDragging = false; });
    else isDragging = false;
  }

  function handleBarScrub(e) {
    if (!isScrubbing) return;
    const bar = e.currentTarget;
    const rect = bar.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const idx = Math.floor((x / rect.width) * 7) + 1;
    selectDay(idx, false);
  }

  // 打开编辑课程
  function openEditCourse(course) {
    editingCourseId = course.id;
    editingEventId = null;
    modalMode = 'course';
    newCourse = JSON.parse(JSON.stringify(course));
    openModal();
  }

  function openAddCourse() {
    editingCourseId = null;
    editingEventId = null;
    modalMode = 'course';
    newCourse = getInitialForm();
    newEvent = getInitialEventForm(selectedDateStr);
    openModal();
  }

  function openEditEvent(ev) {
    editingEventId = ev.id;
    editingCourseId = null;
    modalMode = 'event';
    newEvent = JSON.parse(JSON.stringify(ev));
    openModal();
  }

  function switchModalMode(mode) {
    if (editingCourseId || editingEventId) return;
    modalMode = mode;
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
        try {
          if (history.state && history.state.modal) history.back();
        } catch {}
      }
    }
  }

  function deleteEvent(id) {
    const targetId = id || editingEventId;
    if (!targetId) return;

    if (confirm("确定要删除这条日程吗？此操作无法撤销。")) {
      eventList = eventList.filter(e => e.id !== targetId);
      saveData();
      if (isAddModalOpen) {
        isAddModalOpen = false;
        editingEventId = null;
        try {
          if (history.state && history.state.modal) history.back();
        } catch {}
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
    try {
      if (history.state && history.state.modal) history.back();
    } catch {}
  }

  function handleSaveEvent() {
    if (!newEvent.content.trim()) {
      alert("请输入日程内容");
      return;
    }
    if (!newEvent.date) {
      alert("请选择日期");
      return;
    }
    if ((newEvent.startTime && !newEvent.endTime) || (!newEvent.startTime && newEvent.endTime)) {
      alert("开始和结束时间要么都填，要么都不填");
      return;
    }
    if (newEvent.startTime && newEvent.endTime && newEvent.startTime >= newEvent.endTime) {
      alert("结束时间必须晚于开始时间");
      return;
    }

    if (editingEventId) {
      eventList = eventList.map(e => e.id === editingEventId ? { ...newEvent } : e);
    } else {
      eventList = [
        ...eventList,
        {
          ...newEvent,
          id: Date.now().toString()
        }
      ];
    }

    saveData();
    isAddModalOpen = false;
    newEvent = getInitialEventForm(selectedDateStr);
    editingEventId = null;
    try {
      if (history.state && history.state.modal) history.back();
    } catch {}
  }

  async function exportCourses() {
    const backupData = {
      version: 1,
      exportTime: new Date().toISOString(),
      semesterStartDate,
      courseList,
      eventList
    };
    const fileName = `课表备份_${new Date().toISOString().slice(0, 10)}.json`;
    const jsonString = JSON.stringify(backupData, null, 2);
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
      alert("保存失败：" + e.message);
    }
  }

  // 导入文件逻辑
  let fileInputRef = $state();

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
          if (data.eventList && Array.isArray(data.eventList)) {
            const importedEvents = data.eventList.map(e => ({
              ...e,
              id: Date.now().toString() + Math.random().toString(36).substr(2, 4)
            }));
            eventList = [...eventList, ...importedEvents];
          }
        } else {
          // 覆盖
          courseList = data.courseList;
          if (data.eventList && Array.isArray(data.eventList)) {
            eventList = data.eventList;
          }
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
  {#if !isAddModalOpen && !editingCourseId && !editingEventId}
  <div class="top-actions">
    {#if currentTab === "home"}
      <button class="top-btn" onclick={goSettings} aria-label="管理课程">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
          <path d="m15 5 4 4"/>
        </svg>
      </button>
    {/if}
    <button class="top-btn" onclick={openInfo} aria-label="作息时间说明">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
      </svg>
    </button>
  </div>
  {/if}
  <input
    type="file"
    accept=".json, application/json"
    bind:this={fileInputRef}
    onchange={handleFileImport}
    style="display: none;"
  />
  {#if currentTab === "home"}
    <header class="header">
      <div class="header-left">
        <h1 class="main-title">第 {selectedInfo.week} 周 · {WEEK_DAYS[selectedInfo.dayOfWeek - 1]}</h1>
        <span class="sub-title">
          {selectedDateLabel}
        </span>
      </div>      
    </header>

    <main class="course-list" class:dragging={isDragging}
      ontouchstart={handleSwipeStart}
      ontouchmove={handleSwipeMove}
      ontouchend={handleSwipeEnd}
      ontouchcancel={handleSwipeEnd}
      onmousedown={handleSwipeStart}
      onmousemove={handleSwipeMove}
      onmouseup={handleSwipeEnd}
      onmouseleave={handleSwipeEnd}
      style="transform: translateX({dragOffsetX}px);"
    >
    {#key selectedDayOfWeek}
      <div class="day-page" class:from-right={slideDir > 0} class:from-left={slideDir < 0}>
      {#if displayCourses.length === 0 && displayEvents.length === 0}
        <div class="empty-state">
          <p>今天没有课，好好休息吧！</p>
        </div>
      {:else}
        {#each displayCourses as item (item.id + item.slot.startPeriod + selectedDayOfWeek)}
          <div class="course-card" onclick={() => openEditCourse(item)} style="background-color: #fff; border-color: color-mix(in srgb, {item.color} 22%, #ffffff);">
            <div class="card-content">
              <div class="card-header">
                <h2 class="course-name">{item.name}</h2>
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
            <div class="badge-group">
              {#if item.credit}
                <span class="credit-badge">{item.credit} 学分</span>
              {/if}
              {#if item.assessment && item.assessment !== '未知'}
                <span class="assess-badge" class:exam={item.assessment === '考试'} class:quiz={item.assessment === '考查'}>{item.assessment}</span>
              {/if}
            </div>
          </div>
        {/each}
        {#each displayEvents as ev (ev.id)}
          <div class="course-card event-card" onclick={() => openEditEvent(ev)} style="background-color: #fff); border-color: color-mix(in oklch, {ev.color} 22%, #ffffff);">
            <div class="card-content">
              <div class="card-header">
                <h2 class="course-name">{ev.content}</h2>
              </div>
              <div class="card-details">
                <div class="detail-item time">
                  {#if ev.startTime && ev.endTime}
                    <span class="time-range">{ev.startTime} - {ev.endTime}</span>
                  {:else}
                    <span class="time-range">全天</span>
                  {/if}
                </div>
                {#if ev.note}
                  <div class="detail-item meta">
                    <span>{ev.note}</span>
                  </div>
                {/if}
              </div>
            </div>
            <div class="badge-group">
              <span class="event-badge">日程</span>
            </div>
          </div>
        {/each}
      {/if}
      </div>
    {/key}
    </main>

  <!-- 悬浮添加按钮 (Floating Action Button) -->
  <div class="fab-group">
    <button class="fab fab-add" onclick={openAddCourse} aria-label="添加课程或日程">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-plus">
        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
        <path d="M12 5l0 14" />
        <path d="M5 12l14 0" />
      </svg>
    </button>
  </div>

  <footer class="bottom-week-bar"
      ontouchstart={(e) => { isScrubbing = true; handleBarScrub(e); }}
      ontouchmove={handleBarScrub}
      ontouchend={() => isScrubbing = false}
      ontouchcancel={() => isScrubbing = false}
      onpointerdown={(e) => { isScrubbing = true; handleBarScrub(e); }}
      onpointermove={handleBarScrub}
      onpointerup={() => isScrubbing = false}
      onpointercancel={() => isScrubbing = false}
      onpointerleave={() => isScrubbing = false}
    >
      {#each WEEK_DAYS as day, idx}
        {@const dayNum = idx + 1}
        <button 
          class="week-chip" 
          class:active={selectedDayOfWeek === dayNum}
          class:today={dayNum === todayDayOfWeek}
          onclick={() => selectDay(dayNum)}
        >
          <span class="chip-label">{dayNum === todayDayOfWeek ? '今天' : day}</span>
        </button>
      {/each}
    </footer>
  
  {:else}
    <div class="page-settings">
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
          bind:value={semesterStartDate} 
          onchange={() => { saveData(); calculateCurrentTime(); }} 
          class="input" 
        />
      </div>

      <div class="manage-box">
        <div class="manage-title">所有已添加课程 ({courseList.length})</div>
        {#each courseList as course (course.id)}
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
        <div class="manage-title">所有自定义日程 ({eventList.length})</div>
        {#each eventList as ev (ev.id)}
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
  {/if}
</div>


<!-- 添加课程/日程的 Bottom Sheet 弹窗 -->
{#if isAddModalOpen}
  <div class="modal-overlay" onclick={closeModal}>
    <div class="modal-content" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <h2>{editingCourseId ? '修改课程' : editingEventId ? '修改日程' : modalMode === 'course' ? '添加新课程' : '添加新日程'}</h2>
        <button class="close-btn" onclick={closeModal}>✕</button>
      </div>

      {#if !editingCourseId && !editingEventId}
        <div class="modal-tabs">
          <button class="tab-btn" class:active={modalMode === 'course'} onclick={() => switchModalMode('course')}>课程</button>
          <button class="tab-btn" class:active={modalMode === 'event'} onclick={() => switchModalMode('event')}>自定义日程</button>
        </div>
      {/if}

      {#if modalMode === 'course'}
      <div class="modal-body">
        <div class="form-group">
          <label>课程名称 *</label>
          <input type="text" bind:value={newCourse.name} class="input" />
        </div>

        <div class="form-row">
          <div class="form-group credit-field">
            <label>学分</label>
            <input type="number" step="0.5" min="0" placeholder="0.5 的整数倍" bind:value={newCourse.credit} class="input" />
          </div>
          <div class="form-group flex-1">
            <label>考核方式</label>
            <select bind:value={newCourse.assessment} class="select">
              <option value="考试">考试</option>
              <option value="考查">考查</option>
              <option value="未知">未知</option>
            </select>
          </div>
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
            <input type="text" bind:value={newCourse.location} class="input" />
          </div>
          <div class="form-group flex-1">
            <label>任课老师</label>
            <input type="text" bind:value={newCourse.teacher} class="input" />
          </div>
        </div>

        <!-- 动态上课时间段（支持一周多次课） -->
        <div class="form-group">
          <div class="schedule-title-bar">
            <label>上课时间（支持多段）</label>
            <button class="text-btn" onclick={addScheduleSlot}>+ 添加时间段</button>
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
                <button class="del-slot-btn" onclick={() => removeScheduleSlot(i)}>✕</button>
              {/if}
            </div>
          {/each}
        </div>
      </div>

      <div class="modal-footer">
        {#if editingCourseId}
          <button class="btn-delete-modal" onclick={() => deleteCourse(editingCourseId)}>删除课程</button>
        {/if}
        <button class="btn-cancel" onclick={closeModal}>取消</button>
        <button class="btn-primary" onclick={handleSaveCourse}>保存</button>
      </div>
      {:else}
      <div class="modal-body">
        <div class="form-group">
          <label>内容 *</label>
          <input type="text" bind:value={newEvent.content} placeholder="例如：去图书馆还书" class="input" />
        </div>

        <div class="form-group">
          <label>日期 *</label>
          <input type="date" bind:value={newEvent.date} class="input" />
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label>开始时间（可选）</label>
            <input type="time" bind:value={newEvent.startTime} class="input" />
          </div>
          <div class="form-group flex-1">
            <label>结束时间（可选）</label>
            <input type="time" bind:value={newEvent.endTime} class="input" />
          </div>
        </div>

        <div class="form-group">
          <label>备注</label>
          <textarea bind:value={newEvent.note} placeholder="补充说明（可选）" class="input textarea" rows="3"></textarea>
        </div>
      </div>

      <div class="modal-footer">
        {#if editingEventId}
          <button class="btn-delete-modal" onclick={() => deleteEvent(editingEventId)}>删除日程</button>
        {/if}
        <button class="btn-cancel" onclick={closeModal}>取消</button>
        <button class="btn-primary" onclick={handleSaveEvent}>保存</button>
      </div>
      {/if}
    </div>
  </div>
{/if}

{#if isInfoOpen}
  <div class="info-overlay" onclick={closeInfo}>
    <div class="info-card" onclick={(e) => e.stopPropagation()}>
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
    font-size: 14px;
    font-weight: 600;
    color: #64748b;
    letter-spacing: 0.5px;
    margin-top: 8px;
  }
  .main-title {
    margin: 2px 0 0 0;
    font-size: 22px;
    font-weight: 800;
    color: #0f172a;
    letter-spacing: -0.5px;
  }

    /* 右下角悬浮按钮容器（避开底部周条） */
  .fab-group {
    position: fixed;
    right: 30px;
    bottom: calc(env(safe-area-inset-bottom, 20px) + 80px);
    z-index: 50;
  }

  /* 悬浮球通用底座 */
  .fab {
    width: 60px;
    height: 60px;
    border-radius: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }

  .fab:active {
    transform: scale(0.9);
  }

  /* 经典深黑加号按钮 */
  .fab-add {
    background-color: #0f172a;
    color: #ffffff;
    font-size: 26px;
    box-shadow: 0 6px 16px rgba(15, 23, 42, 0.25);
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

  .course-list {
    display: flex;
    flex-direction: column;
    gap: 14px;
    margin-top: 30px;
    touch-action: pan-y;
    transition: transform 0.2s ease;
    will-change: transform;
  }

  .course-list.dragging {
    transition: none;
  }

  .day-page {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .day-page.from-right {
    animation: page-in-right 0.22s ease;
  }

  .day-page.from-left {
    animation: page-in-left 0.22s ease;
  }

  @keyframes page-in-right {
    from {
      opacity: 0;
      transform: translateX(48px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes page-in-left {
    from {
      opacity: 0;
      transform: translateX(-48px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  .course-card {
    position: relative;
    display: flex;
    background: #ffffff;
    border: 1px solid #f1f5f9;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 3px 12px rgba(15, 23, 42, 0.04);
    cursor: pointer;
  }
  .course-card:active {
    transform: scale(0.98);
  }

  .card-content {
    flex: 1;
    padding: 16px;
    padding-right: 96px;
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
    line-height: 1.35;
    flex: 1;
    text-align: left;
    word-break: break-all;
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

  .badge-group {
    position: absolute;
    top: 14px;
    right: 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex-shrink: 0;
    align-items: flex-end;
  }

  .assess-badge {
    font-size: 13px;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 8px;
    flex-shrink: 0;
    white-space: nowrap;
  }

  .assess-badge.exam {
    color: #c36218;
    background: #fef3c7;
  }

  .assess-badge.quiz {
    color: #059669;
    background: #d1fae5;
  }

  .credit-field {
    flex: 1 1 0;
    min-width: 0;
    max-width: 130px;
  }

  .time-range {
    font-size: 14px;
    font-weight: 700;
    color: #0f172a; /* 让时间字体更醒目深黑 */
  }

  .card-details {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
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

  .bottom-week-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: rgba(255, 255, 255, 0.92);
    backdrop-filter: blur(12px);
    border-top: 1px solid #e2e8f0;
    padding: 8px 12px calc(env(safe-area-inset-bottom, 10px) + 8px);
    display: flex;
    justify-content: space-between;
    gap: 4px;
    z-index: 60;
    touch-action: none;
    cursor: grab;
  }

  .week-chip {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 8px 0;
    border: none;
    background: transparent;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .chip-label {
    font-size: 12px;
    font-weight: 600;
    color: #64748b;
  }

  .week-chip.today .chip-label {
    color: #0f172a;
    font-weight: 700;
  }
  .week-chip.today:not(.active) .chip-label {
    text-decoration: underline;
    text-underline-offset: 3px;
    text-decoration-thickness: 1.5px;
  }

  .week-chip.active {
    background: #0f172a;
  }
  .week-chip.active .chip-label {
    color: #ffffff;
    font-weight: 700;
    text-decoration: none;
  }
  .week-chip.active.today {
    background: #eef2ff;
  }
  .week-chip.active.today .chip-label {
    color: #4338ca;
  }

  .page-settings {
    display: flex;
    flex-direction: column;
    gap: 16px;
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

  .info-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
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

  .event-badge {
    font-size: 13px;
    font-weight: 700;
    color: #059669;
    background: #ecfdf5;
    padding: 3px 8px;
    border-radius: 8px;
    flex-shrink: 0;
    white-space: nowrap;
  }

  .input.textarea {
    resize: vertical;
    min-height: 64px;
    font-family: inherit;
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