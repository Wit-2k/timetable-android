# 代码阅读指南

这份文档回答的是「先读哪个文件」。和 [README](./README.md) 的分工：README 讲这个 App 是什么、怎么跑起来、数据格式长什么样；这里讲怎么按最短路径把代码读明白。

代码量不大：`src/` 一共约 2500 行（含样式），最大的单文件是 338 行的 `SettingsPage.svelte`。通读用不了一个下午，关键是**按依赖方向读，而不是按目录顺序读**。如果时间很紧，只读下面第一遍的 5 个文件就够了。

## 依赖方向

```
components/  ──→  stores/  ──→  domain/ + utils/  ──→  constants.ts
  （渲染）       （状态+副作用）      （纯函数）        （叶子，不 import 任何东西）
```

`domain/` 和 `utils/` 里没有任何一个文件 import store、碰 DOM、或调用 Svelte 的 API —— 这是刻意的，它们可以脱离 Svelte 单独跑（见文末「不想读代码时怎么验证行为」）。读的时候如果发现 `components/` 里出现了本该在 `domain/` 里的计算逻辑，那多半是写歪了。

## 第一遍：数据长什么样

1. **`src/lib/constants.ts`** —— 先读它，读它就等于读数据库的表结构。`Course` / `EventItem` / `ScheduleSlot` / `BackupData` 都在这里，另外还有作息表 `PERIOD_TIMETABLE`、星期名 `WEEK_DAYS`、色板 `PALETTE`。
   最需要先理解的一点：`Course.schedules` 是**数组**，一门课可以挂多个「星期 + 起止节次」，后面所有「课程展开成卡片」的逻辑都源于它。
   另外 `credit` / `assessment` 是**可选字段**，原因写在注释里：示范课程和旧版备份 JSON 里没有这两个字段。

2. **`src/App.svelte`** —— 89 行的组装壳，只做三件事：主页⇄设置页的方向性过渡、挂两个全局弹窗、放全局样式。看它的 import 列表就知道全局有几块状态、几个组件。

3. **`src/lib/stores/timetable.svelte.ts`** —— 数据源。三个 `$state` 字段（`courseList` / `eventList` / `semesterStartDate`）加 CRUD 和 `saveData()`，示范课程 `DEMO_COURSE` 也在这里，首次启动（`courseList` 为空）时会被塞进去。
   读完问自己一句：一次「添加课程」会写进 localStorage 的哪几个 key？

4. **`src/lib/stores/view.svelte.ts`** —— 「当前第几周、选中哪一天」是怎么算的（`calculateCurrentTime()` 和 `selectDay()`），另外还有 hash 路由的两个原语（`viewHash` / `pushView`）。整个文件 51 行。

5. **`src/components/HomePage.svelte`** —— 主页怎么把上面这些拼起来。这个文件里的 5 个 `$derived` 就是主页的全部数据来源。

剩下 20 来个文件基本都能从这 5 个猜出来。

## 第二遍：跟着一条数据走到屏幕上

这一遍不要按目录顺序读，按调用链读。挑一条链路走到底，比平铺读十个文件有用。

### 追踪题 A：今天这一天的课程是怎么算出来的

这是主线逻辑，建议第一个走通：

```
HomePage.svelte         displayCourses = $derived(getCoursesForDay(...))
  └─ domain/course.ts   getCoursesForDay：按周次筛课程 → 按 dayOfWeek 拆时间段 → 按节次排序
     └─ utils/date.ts   getTimeRange：用节次查作息表，拼出 "10:25 - 12:00"
        └─ constants.ts PERIOD_TIMETABLE
  └─ DaySchedule.svelte {#each} 渲染列表
     └─ CourseCard.svelte  单张卡片
```

`getCoursesForDay` 只做三件事：先用 `startWeek~endWeek` 过滤整门课，再把每门课的 `schedules` 里 `dayOfWeek` 匹配的时间段挑出来，最后按 `startPeriod` 排序。**一门课有几天课就展开成几张卡片**，所以它返回的是 `DisplayCourse`（课程字段 + 单个时间段 + 时间文案），不是 `Course`。

可以在浏览器控制台里直接调它验证（见文末的用法）：

```js
const m = await import('/src/lib/domain/course.ts');
m.getCoursesForDay([{ id: 'x', name: '测试课', startWeek: 1, endWeek: 16, location: '', teacher: '',
  color: '#000', schedules: [{ dayOfWeek: 1, startPeriod: 3, endPeriod: 4 }] }], 1, 1);
// [{ ...课程字段, slot: { dayOfWeek: 1, startPeriod: 3, endPeriod: 4 }, timeText: '10:25 - 12:00' }]
```

### 追踪题 B：点「保存」之后发生了什么

这条链路把四个层次整个串了一遍，是理解本项目分层的最佳样本：

```
AddModal.svelte                点「保存」→ saveCourse
  └─ stores/modal.svelte.ts        先 validateCourse 校验，不通过就 alert 并中断
     └─ stores/timetable.svelte.ts addCourse → 更新 $state + saveData() 落盘
     └─ dismissModalFromHistory()  history.back()，让返回栈自己退一格
        └─ stores/navigation.ts    onPopState 还原状态 → 弹窗关闭
           └─ HomePage.svelte      $derived 自动重算 → 列表刷新
```

两个值得注意的点：**保存不直接关弹窗，而是 `history.back()`**，这样关闭按钮和 Android 返回键走的是同一条路径；**校验失败用 `alert`**，项目里没有独立的错误 UI。

### 追踪题 C：Android 物理返回键为什么能逐层关闭

读 `stores/navigation.ts` 的 `initHistoryNavigation()`，再回头看谁在往历史里 push：

- `stores/view.svelte.ts` 的 `pushView` / `viewHash`，被 `goSettings` 和 `openModal` 调用
- `App.svelte` 在 `onMount` 里调用 `initHistoryNavigation()`，拿到清理函数

「信息弹窗 → 添加弹窗 → 设置页 → 退出应用」这四层顺序就写在 `backButton` 监听的 if-else 里，一眼看完。这块与物理返回键强耦合，**不要拆散**，原因见 README。

## 第三遍：剩下的组件

到这一步主干已经通了，剩下的按「离数据的远近」分组读，每组十有八九能猜出内容：

**主页一组**（`HomePage.svelte` 是父组件，其余由它传 props）

- `HomeHeader.svelte` —— 上一行周次、下一行日期，纯展示
- `DaySchedule.svelte` —— 卡片列表 + 左右滑动手势。手势状态（`dragOffsetX` 等）就地放在组件里，没有上提到 store
- `WeekBar.svelte` —— 底部周条，点击和拖拽选日都走 `onselect`，拖拽时调 Capacitor 触感
- `Fab.svelte` / `TopActions.svelte` —— 两个按钮组，只收回调
- `CourseCard.svelte` / `EventCard.svelte` —— 卡片外观，共享样式在 `lib/styles/card.css`

**弹窗一组**

- `AddModal.svelte` —— 外壳：遮罩、标题、课程/日程标签页、底部按钮，以及两个面板切换时的动画（`panelFromHeight` / `panelX` 这两个变量只为动画服务，不参与渲染）
- `CourseForm.svelte` / `EventForm.svelte` —— 表单，用 `$bindable` 直接绑到 `modal.newCourse` / `modal.newEvent` 上，没有本地副本
- `InfoModal.svelte` —— 作息时间表，自包含，只读常量

**设置页一组**

- `SettingsPage.svelte` —— 最长的文件，但结构很直白：开学日期 + 两个管理列表 + 导入导出。导入导出是唯一直接调 Capacitor Filesystem 的地方，**IO 有意留在组件里**，没有下沉到 store。

## 读的时候要记住的坐标系

这几个概念几乎每个文件都会用到，混了就会看晕：

| 名字 | 含义 |
| --- | --- |
| `view.currentWeek` | **今天**所在的周次，由开学日期推算（`calculateCurrentTime()`） |
| `view.todayDayOfWeek` | **今天**是周几（1~7，周一为 1） |
| `view.selectedDayOfWeek` | 界面上**选中**的是周几（`selectDay()` 修改） |
| `view.slideDir` | 切日动画的方向，0 表示不播放位移动画（拖周条时的跟手渐显） |
| `modal.modalMode` | 添加弹窗停在哪个标签页（course / event），会被持久化 |
| `modal.editingCourseId` / `editingEventId` | 为 `null` 表示新增，有值表示编辑，两者互斥 |

## 五个反直觉的地方

读的时候大概率会在这里卡一下，先看能省点时间：

1. **主页标题的周次不是 `view.currentWeek`。** 而是 `selectedInfo.week`，用「选中日相对今天的偏移」重新算出来的（`getTargetDateInfo`）。所以从周日往右滑到周一，标题会跳到下一周，尽管今天是第 3 周。
2. **列表里的卡片不保证 id 唯一。** 一门课挂了两天，就在两天各显示一张卡片，两张卡片的 `item.id` 完全相同。这就是 `DaySchedule` 里 `{#each}` 的 key 写成 `item.id + item.slot.startPeriod + view.selectedDayOfWeek` 的原因。
3. **编辑表单是深拷贝。** `openEditCourse` 用 `JSON.parse(JSON.stringify(course))` 把课程复制进 `modal.newCourse`，所以编辑时改表单不会污染列表里的原数据；取消时这份草稿不会被写回，下次打开会重新初始化。
4. **设置页的「编辑」也会开弹窗、也会 push 历史。** `openEditCourse` 最终调的是 `openModal()`，所以编辑弹窗同样能被返回键关掉 —— 设置页和弹窗的历史关系是嵌套的。
5. **`HomePage` 里那个三条件的 `{#if}` 有冗余。** `!modal.isAddModalOpen && !modal.editingCourseId && !modal.editingEventId`：因为 `editingXxxId` 有值时 `isAddModalOpen` 必然为真，后两个条件是白写的。留着无害，不用怀疑自己漏了什么状态。

## 改一处要动哪些文件

| 想做的事 | 要改的文件 |
| --- | --- |
| 给课程加一个字段 | `constants.ts`（类型，**建议标可选**）→ `domain/course.ts`（`getInitialCourseForm` 给默认值）→ `CourseForm.svelte`（表单）→ `CourseCard.svelte` / `SettingsPage.svelte`（展示，可选）→ `utils/validate.ts`（要校验的话）。`backup.ts` 不用改，它整体序列化对象；但旧备份里没有这个字段，所以标可选更省事 |
| 改作息时间 | 只改 `constants.ts` 的 `PERIOD_TIMETABLE` —— `getTimeRange` 和 `InfoModal` 都从这里读，一处生效 |
| 增删节次数量 | `PERIOD_TIMETABLE` **和** `CourseForm.svelte` 里两个节次输入框的 `max="12"`（写死的，不在常量里） |
| 加一个新页面 | `view.svelte.ts`（`Tab` 类型 + `viewHash`）→ `navigation.ts`（`goXxx`；另外 `onPopState` 里 `s.tab === 'settings' ? 'settings' : 'home'` 把两个标签页写死了，必须一并改）→ `App.svelte`（过渡分支）→ 新页面组件 |
| 改「合并导入」的策略 | 只改 `domain/backup.ts` 的 `applyBackup`，纯函数，不牵扯 UI |

## 不想读代码时怎么验证行为

- **`bun run check`** —— 唯一的自动化校验（当前 0 errors / 27 条既有 a11y 告警）。
- **直接改 localStorage 再刷新。** 数据在模块初始化时读取，所以在 devtools 里手写 `localStorage.setItem('courses', '[...]')` 然后刷新，就能构造跨周课程、超长备注之类的边界数据，不用改代码。
- **在控制台里直接调纯函数。** dev 模式下可以按 Vite 的模块路径动态 import：

  ```js
  const m = await import('/src/lib/domain/course.ts');
  m.getInitialCourseForm();
  ```

  `domain/` 和 `utils/` 都不依赖 Svelte 运行时，这样试最快。只在 `bun run dev` 下可用（构建产物里模块已经合并了）。
