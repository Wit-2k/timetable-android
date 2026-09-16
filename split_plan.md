技术栈：**Svelte 5 + TypeScript + Vite + Capacitor（Android）**，无测试框架，校验命令是 `bun run check`（svelte-check）。下面是基于对 [App.svelte](file:///d:/WebDev/timetable/src/App.svelte) 全文分析后的重构计划。

---

# App.svelte 拆分重构计划

## 一、现状盘点（1818 行）

| 区块         | 行号范围                                                     | 内容                                                     |
| ------------ | ------------------------------------------------------------ | -------------------------------------------------------- |
| 常量         | [L7-L23](file:///d:/WebDev/timetable/src/App.svelte#L7-L23)  | 作息表、星期、色板                                       |
| 数据与持久化 | [L26-L52](file:///d:/WebDev/timetable/src/App.svelte#L26-L52) | courseList / eventList / semesterStartDate + saveData    |
| 日期周次计算 | [L55-L81](file:///d:/WebDev/timetable/src/App.svelte#L55-L81) | calculateCurrentTime、getTimeRange、getTargetDateInfo 等 |
| 派生数据     | [L84-L95](file:///d:/WebDev/timetable/src/App.svelte#L84-L95)、[L300-L304](file:///d:/WebDev/timetable/src/App.svelte#L300-L304) | displayCourses、displayEvents 筛选排序                   |
| 路由/返回栈  | [L185-L298](file:///d:/WebDev/timetable/src/App.svelte#L185-L298) | hash 路由、popstate、Capacitor 物理返回键                |
| 手势         | [L306-L362](file:///d:/WebDev/timetable/src/App.svelte#L306-L362) | 课程列表左右滑动、底部周条 scrub                         |
| CRUD 与弹窗  | [L364-L510](file:///d:/WebDev/timetable/src/App.svelte#L364-L510) | 打开/保存/删除课程与日程、表单草稿                       |
| 导入导出     | [L512-L596](file:///d:/WebDev/timetable/src/App.svelte#L512-L596) | Filesystem 导出、JSON 导入合并                           |
| 模板         | L599-L984                                                    | 首页 / 设置页 / 添加弹窗 / 作息弹窗                      |
| 样式         | L986-L1818                                                   | 约 830 行 scoped CSS                                     |

## 二、目标结构

```
src/
├── lib/
│   ├── constants.ts              # PERIOD_TIMETABLE、WEEK_DAYS、PALETTE + TS 类型定义
│   ├── utils/
│   │   ├── date.ts               # 纯函数：日期/周次
│   │   ├── id.ts                 # 纯函数：makeId（替换 Date.now()+substr 写法）
│   │   └── validate.ts           # 纯函数：课程/日程校验、备份 JSON 校验
│   ├── domain/
│   │   ├── course.ts             # 纯函数：课程筛选、初始表单
│   │   ├── event.ts              # 纯函数：日程筛选、初始表单
│   │   └── backup.ts             # 纯函数：导入合并逻辑 + IO 薄封装（导出）
│   ├── stores/                   # Svelte 5 runes 共享状态（必须 *.svelte.ts）
│   │   ├── timetable.svelte.ts   # 课程/日程/开学日期 + CRUD + saveData
│   │   ├── view.svelte.ts        # 当前周、今天、选中日、滑动方向、selectDay
│   │   └── modal.svelte.ts       # 弹窗开关、编辑目标 id、表单草稿
│   └── styles/form.css           # 表单共享样式（.input/.select/.form-group 等）
├── components/
│   ├── TopActions.svelte         # 右上角 编辑/说明 按钮
│   ├── HomePage.svelte           # 首页聚合层
│   ├── HomeHeader.svelte         # 第X周·周X + 日期
│   ├── DaySchedule.svelte        # 滑动手势容器 + 空状态 + 卡片列表
│   ├── CourseCard.svelte
│   ├── EventCard.svelte
│   ├── WeekBar.svelte            # 底部周条（chips + scrub 手势）
│   ├── Fab.svelte
│   ├── SettingsPage.svelte       # 设置页 + 隐藏 file input + 导入导出
│   ├── AddModal.svelte           # 底部抽屉弹窗外壳 + 模式 tabs
│   ├── CourseForm.svelte         # 课程表单（含多时间段编辑）
│   ├── EventForm.svelte
│   └── InfoModal.svelte          # 作息时间表弹窗
└── App.svelte                    # ≈100 行薄壳
```

## 三、纯函数提取清单（Phase 1 核心产出）

| 目标函数                                                  | 来源                                                         | 说明                                                         |
| --------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| `getTimeRange(startP, endP)`                              | [L77-L81](file:///d:/WebDev/timetable/src/App.svelte#L77-L81) | 依赖常量，完全纯                                             |
| `formatDateStr(d)`                                        | [L124-L126](file:///d:/WebDev/timetable/src/App.svelte#L124-L126) | —                                                            |
| `getSelectedDateStr(selected, today)`                     | [L128-L132](file:///d:/WebDev/timetable/src/App.svelte#L128-L132) | —                                                            |
| `getTargetDateInfo(offsetDays, startDateStr)`             | [L159-L175](file:///d:/WebDev/timetable/src/App.svelte#L159-L175) | ⚠️ 保留“startDateStr 必须显式传参”的语义（原注释强调过 Svelte 追踪问题） |
| `formatChineseDateLabel(dateStr)`                         | [L179-L183](file:///d:/WebDev/timetable/src/App.svelte#L179-L183) | 从 selectedDateLabel 派生中抽出                              |
| `getCoursesForDay(list, week, day)`                       | [L84-L95](file:///d:/WebDev/timetable/src/App.svelte#L84-L95) | displayCourses 的核心逻辑，最值得单测                        |
| `getEventsForDate(list, dateStr)`                         | [L300-L304](file:///d:/WebDev/timetable/src/App.svelte#L300-L304) | —                                                            |
| `getInitialCourseForm()` / `getInitialEventForm(dateStr)` | [L108-L122](file:///d:/WebDev/timetable/src/App.svelte#L108-L122)、[L134-L145](file:///d:/WebDev/timetable/src/App.svelte#L134-L145) | 随机取色使其非严格纯，可接受或注入 rng                       |
| `validateEvent(ev): string \| null`                       | [L473-L489](file:///d:/WebDev/timetable/src/App.svelte#L473-L489) | 纯函数返回错误信息，`alert` 留在 UI 层                       |
| `validateCourse(course)`                                  | [L444-L448](file:///d:/WebDev/timetable/src/App.svelte#L444-L448) | 同上                                                         |
| `mergeBackup(current, parsed): ApplyResult`               | [L544-L596](file:///d:/WebDev/timetable/src/App.svelte#L544-L596) | 合并/覆盖决策逻辑抽纯，FileReader/Filesystem IO 留在组件     |
| `makeId()`                                                | [L459](file:///d:/WebDev/timetable/src/App.svelte#L459)、[L498](file:///d:/WebDev/timetable/src/App.svelte#L498)、[L565](file:///d:/WebDev/timetable/src/App.svelte#L565) | 顺带把废弃的 `substr` 换成 `slice`                           |

## 四、状态模块划分（Svelte 5 runes）

用 `*.svelte.ts` 文件 + `$state`/`$derived` 实现跨组件共享状态（Svelte 5 的惯用法，替代旧 writable store）：

1. **timetable.svelte.ts** — 三个持久化字段 + `saveData()` + `addCourse/updateCourse/deleteCourse/addEvent/updateEvent/deleteEvent/importData()`。localStorage 读取加 try/catch（当前 [L27-L28](file:///d:/WebDev/timetable/src/App.svelte#L27-L28) 裸 `JSON.parse`，坏数据会白屏）。
2. **view.svelte.ts** — currentWeek / todayDayOfWeek / selectedDayOfWeek / slideDir + `calculateCurrentTime()` + `selectDay()`。
3. **modal.svelte.ts** — isAddModalOpen / isInfoOpen / modalMode / editingCourseId / editingEventId / newCourse / newEvent 草稿 + openAdd/openEdit/switchMode/close 等动作。
4. **导航逻辑** — `viewHash/pushView/goSettings/goHome/openModal/closeModal/openInfo/closeInfo` + `onMount` 内的 popstate 监听与 Capacitor 返回键（[L250-L298](file:///d:/WebDev/timetable/src/App.svelte#L250-L298)）**整体封装为一个 `initHistoryNavigation()` 并返回清理函数**，由 App.svelte 的 onMount 调用。⚠️ 这块与物理返回键强耦合，不要拆散。

## 五、组件拆分清单

| 组件                   | 承接内容（行号）      | 接口约定（Svelte 5）                                         |
| ---------------------- | --------------------- | ------------------------------------------------------------ |
| TopActions             | L601-L618             | props: `showEdit`；回调: `onEdit` / `onInfo`                 |
| HomeHeader             | L627-L634             | props: `week` / `dayLabel` / `dateLabel`                     |
| CourseCard             | L654-L683             | props: `item`；回调: `onedit`                                |
| EventCard              | L684-L709             | props: `ev`；回调: `onedit`                                  |
| DaySchedule            | L636-L713             | 手势状态（dragOffsetX 等）内聚于此；接收 courses/events + 回调；`{#key selectedDayOfWeek}` 和 slideDir 动画随迁 |
| WeekBar                | L726-L748             | scrub 状态内聚；props: `selectedDay` / `todayDay`；回调: `onselect` |
| Fab                    | L716-L724             | 回调: `onadd`                                                |
| SettingsPage           | L751-L813             | 导入导出与隐藏 file input 内聚；编辑/删除走 store 动作       |
| AddModal               | L819-L955             | 外壳 + tabs + footer；表单草稿绑定 CourseForm/EventForm      |
| CourseForm / EventForm | L834-L907 / L916-L943 | 用 `$bindable` 绑定草稿对象                                  |
| InfoModal              | L957-L984             | 自包含，直接读常量                                           |

## 六、CSS 拆分要点（最大的坑）

Svelte 样式是**组件级 scoped**，父组件样式不会命中子组件元素。策略：

- 各组件带走自己的样式，**class 名保持不变**，避免选择器失配。
- `.form-group/.form-row/.input/.select/.flex-1` 等两套表单共用的样式 → 抽到 `lib/styles/form.css`，在 AddModal 中全局引入（普通 CSS import，不 scoped）。
- `:global(body)` 和 `.app-container` 留在 App.svelte。

## 七、执行步骤（每步独立可验证）

**Phase 0 · 基线**：建 git 分支；跑通 `npm run check` + `npm run build`；记录手工冒烟清单（切日/滑动/增删改课程与日程/改开学日期/导入导出/浏览器后退/Android 返回键）。

**Phase 1 · 纯函数提取**（纯搬家，零行为变化）：
1. `constants.ts` + Course/ScheduleSlot/EventItem/BackupData 类型
2. `utils/date.ts`、`utils/id.ts`、`utils/validate.ts`
3. `domain/course.ts`、`domain/event.ts`、`domain/backup.ts`
4. App.svelte 改为调用：`$derived` 内改为调 `getCoursesForDay(...)` 等
✅ 验证：check + build + 冒烟

**Phase 2 · 状态模块**：
5. `view.svelte.ts` → 6. `timetable.svelte.ts` → 7. `modal.svelte.ts` → 8. `initHistoryNavigation()`
✅ 验证重点：数据持久化、hash 路由、物理返回键逐层关闭（信息弹窗 → 添加弹窗 → 设置页 → 退出）

**Phase 3 · 组件拆分**（每拆一个 check 一次，顺序由简到繁）：
9. InfoModal → 10. TopActions → 11. Fab → 12. HomeHeader → 13. WeekBar → 14. CourseCard/EventCard → 15. DaySchedule → 16. HomePage → 17. SettingsPage → 18. AddModal + CourseForm/EventForm

**Phase 4 · 收尾**：
19. 删除 App.svelte 死样式/死代码，最终 check + build
20. （可选）引入 vitest，为周次计算、课程筛选、校验、导入合并写单测

## 八、顺手修复项（拆分过程中发现的问题，建议一并处理）

1. [L685](file:///d:/WebDev/timetable/src/App.svelte#L685)：event 卡片内联样式 `background-color: #fff)` 有多余括号，是无效值。
2. [L27-L28](file:///d:/WebDev/timetable/src/App.svelte#L27-L28)：localStorage 裸 `JSON.parse` 无容错。
3. [L565](file:///d:/WebDev/timetable/src/App.svelte#L565)、[L571](file:///d:/WebDev/timetable/src/App.svelte#L571)：`substr` 已废弃，换 `slice`。

---

**预期效果**：App.svelte 从 1818 行缩到约 100 行的组装壳；日期/筛选/校验逻辑变成可独立测试的纯函数；每个 UI 区块可独立修改而不互相牵连。