# 极简课表

移动端优先的课表 App：按天查看课程与自定义日程，支持一门课挂多个上课时间段、按开学日期自动推算周次、JSON 备份的导出与导入，并通过 Capacitor 打包成 Android 应用。

技术栈是 **Svelte 5（runes）+ TypeScript + Vite + Capacitor**。没有后端、没有账号，所有数据存在设备的 localStorage 里。

## 功能

- **按天课表** —— 主页只显示选中那天的课程与日程。左右滑动列表，或按住底部周条拖拽，都能切换日期；切换带方向性动画，拖拽周条时每切一天给一次轻微振动反馈。
- **多时间段课程** —— 一门课可以挂多个「星期 + 起止节次」时间段（例如周二 9~12 节 + 周四 3~4 节）。同一天有多个时间段时，按各自节次排序、各显示一张卡片。
- **学期周次** —— 在设置里填「第一周周一的日期」，App 自动推算今天属于第几周；课程只在自己的 `startWeek`~`endWeek` 范围内出现。
- **自定义日程** —— 挂在具体日期上，时间可填可不填（不填即「全天」）。
- **导入导出** —— 导出为 JSON 文件（Android 写入 Documents 目录），导入时可选「合并」或「覆盖」。

## 环境要求

- Node ≥ 22.12（Vite 8 与 Capacitor CLI 8 的要求）
- 包管理器用 bun 或 npm 均可，仓库里提交的是 `bun.lock`
- 打包 Android 需要 Android Studio / Android SDK

## 常用命令

| 命令 | 作用 |
| --- | --- |
| `bun install` | 安装依赖 |
| `bun run dev` | 启动开发服务器（监听 `0.0.0.0`，局域网内手机可直接访问调试） |
| `bun run build` | 生产构建，产物在 `dist/` |
| `bun run preview` | 本地预览构建产物 |
| `bun run check` | 类型检查：`svelte-check` + `tsc`。本仓库没有测试框架，这是唯一的自动化校验 |

注意 `bun run build` 只跑 `vite build`，**不包含类型检查**，改完代码请单独跑一次 `bun run check`。

## Android 打包

```bash
bun run build
npx cap sync android
npx cap open android          # 或 cd android && ./gradlew assembleDebug
```

应用 ID 为 `com.oscar.schedule`，配置在 `capacitor.config.ts`。`cap sync` 会把 `dist/` 拷贝进 `android/app/src/main/assets/public/`，因此每次改完前端都要重新 sync 一次。

## 目录结构

```
src/
├── main.ts                      # 挂载入口
├── App.svelte                   # 组装壳：主页⇄设置页的切换与过渡、全局样式
├── components/                  # 所有 UI 组件，各自带 scoped 样式
│   ├── HomePage.svelte          #   主页组装：头部 + 当天列表 + 悬浮按钮 + 底部周条
│   ├── HomeHeader.svelte        #   「第 N 周 · 周几」与日期副标题
│   ├── DaySchedule.svelte       #   当天卡片列表 + 左右滑动手势
│   ├── CourseCard.svelte        #   课程卡片
│   ├── EventCard.svelte         #   日程卡片
│   ├── WeekBar.svelte           #   底部周条：点击/拖拽选日 + 触感反馈
│   ├── Fab.svelte               #   右下角悬浮添加按钮
│   ├── TopActions.svelte        #   右上角「编辑 / 作息说明」入口
│   ├── AddModal.svelte          #   添加/编辑 Bottom Sheet（课程⇄日程标签切换）
│   ├── CourseForm.svelte        #   课程表单（含多时间段编辑）
│   ├── EventForm.svelte         #   日程表单
│   ├── InfoModal.svelte         #   作息时间弹窗
│   └── SettingsPage.svelte      #   设置页：开学日期、课程/日程管理、导入导出
└── lib/
    ├── constants.ts             # 作息表、星期、色板，以及全部 TS 类型
    ├── domain/                  # 纯函数领域逻辑
    │   ├── course.ts            #   按周/天筛选课程、初始表单
    │   ├── event.ts             #   按日期筛选日程、初始表单
    │   └── backup.ts            #   备份的构造与合并/覆盖策略
    ├── stores/                  # Svelte 5 runes 共享状态（*.svelte.ts）
    │   ├── timetable.svelte.ts  #   课表数据 + CRUD + localStorage 持久化
    │   ├── view.svelte.ts       #   当前周/今天/选中日 + hash 路由原语
    │   ├── modal.svelte.ts      #   弹窗开关、编辑目标、表单草稿
    │   └── navigation.ts        #   页面跳转 + popstate / Android 物理返回键
    ├── utils/                   # 纯函数工具
    │   ├── date.ts              #   日期格式化、周次与星期换算
    │   ├── id.ts                #   id 生成
    │   └── validate.ts          #   课程 / 日程 / 备份 JSON 校验
    └── styles/
        ├── card.css             # 课程卡片与日程卡片共享的全局样式
        └── form.css             # 两个表单共享的全局样式
```

## 架构

### 分层与数据流

四层，依赖方向是单向的：

1. `utils/` 与 `domain/` 是**纯函数**，不 import store、不碰 DOM，可以脱离 Svelte 单独测试。
2. `stores/*.svelte.ts` 用 `$state` 持有跨组件共享的状态，并负责持久化与副作用（localStorage、history、alert、Capacitor）。
3. 组件只做渲染与事件绑定，业务计算一律调用 `lib/` 里的函数。
4. 数据流：组件事件 → store 动作 → 状态更新 → `$derived` 重算 → 重新渲染。

要跨组件共享且需要持久化的状态放 `stores/`；只在单个组件里用的状态（滑动手势、周条 scrub、动画起点）就地放在组件内，例如 `DaySchedule.svelte` 和 `WeekBar.svelte`。

### Svelte 5 的几个坑

- **派生数据不能从模块导出。** `$derived` 只能出现在组件或 `.svelte.ts` 的实例作用域里。因此筛选结果在 `HomePage.svelte` 中用 `$derived` 调用 domain 纯函数计算，而不是放在 store 里。
- **调用纯函数时要把状态显式当参数传进去。** 例如 `getTargetDateInfo(view.selectedDayOfWeek - view.todayDayOfWeek, timetable.semesterStartDate)`，`semesterStartDate` 必须传参，否则依赖追踪不到它的变化，改了开学日期课表不刷新。
- `stores/` 下的文件名必须以 `.svelte.ts` 结尾，否则 runes 不生效。

### 样式

组件内的 `<style>` 是 scoped 的，父组件样式不会命中子组件元素。只有真正跨组件共享的类才抽到 `lib/styles/*.css`（普通 CSS import，全局生效，class 名与拆分前保持一致）。`:global(html/body)` 和 `.app-container` 留在 `App.svelte`。

有两处**不要动**的约束，都是真机踩出来的：

- `.page` 不能加 `overflow: hidden` —— 底部周条用左右各 `-20px` 通栏贴边，页面盒子只有 20~340，会把周条两侧裁掉（圆角被切平）。通栏部分交给 `.app-container` 在视口边缘裁剪。
- 不要给 `html`/`body` 加 `overscroll-behavior: none` —— 真机实测会让内部滚动区域（`.course-list`、`.page-settings`）的回弹一起消失。

### 持久化

localStorage 四个 key：

| Key | 内容 |
| --- | --- |
| `courses` | 课程数组的 JSON |
| `events` | 日程数组的 JSON |
| `semester_start` | 开学第一周周一的日期，未设置时默认 `2026-03-02` |
| `modal_mode` | 添加弹窗上次停留的标签页（`course` / `event`） |

`courses` / `events` 的读取带 `try/catch` 兜底为空数组，避免坏数据导致白屏。首次启动（`courses` 为空）会写入一门示范课程。

### 备份格式

```json
{
  "version": 1,
  "exportTime": "2026-09-18T02:00:00.000Z",
  "semesterStartDate": "2026-03-02",
  "courseList": [],
  "eventList": []
}
```

导入策略（`lib/domain/backup.ts`）：

- **合并** —— 现有与导入的课程/日程都保留，导入项重新生成 id；**不改**开学日期。
- **覆盖** —— 课程整份替换；文件里带 `eventList` 才替换日程，否则保留现有日程；开学日期以文件为准。

校验只要求 `courseList` 是数组，因此旧版备份（没有 `eventList`）也能正常导入。

### 路由与返回键

用 hash 路由，把视图状态序列化进浏览器历史：`#/`（主页）、`#/add`、`#/settings`、`#/settings/edit`。

`popstate` 与 Capacitor 的物理返回键共用同一套状态还原逻辑，逐层关闭：**信息弹窗 → 添加弹窗 → 设置页 → （Android）退出应用**。这块与物理返回键强耦合，必须整体放在 `lib/stores/navigation.ts` 的 `initHistoryNavigation()` 里，由 `App.svelte` 在 `onMount` 中调用，不要拆散。

## 数据模型

定义都在 `src/lib/constants.ts`。

**Course** —— `id`、`name`、`credit?`、`assessment?`、`startWeek`、`endWeek`、`location`、`teacher`、`color`，以及 `schedules: ScheduleSlot[]`，其中 `ScheduleSlot` 是 `{ dayOfWeek, startPeriod, endPeriod }`（`dayOfWeek` 1~7 对应周一到周日，节次 1~12）。`credit` 与 `assessment` 可选，是为了兼容示范课程和旧版备份。

**EventItem** —— `id`、`content`、`date`（`YYYY-MM-DD`）、`startTime`、`endTime`、`note`、`color`。`startTime` / `endTime` 同时为空表示全天。

排序：同一天的课程按 `startPeriod` 升序，日程按 `startTime` 字符串升序（全天日程排最前）。

## 交互细节

- **列表滑动切天**（`DaySchedule.svelte`）：水平位移超过 10px 且大于垂直位移才判定为滑动，松手位移超过 50px 才真正切天，否则回弹原位。
- **周条拖拽**（`WeekBar.svelte`）：用 pointer 事件，水平移动超过 8px 判定为 scrub 后才 `setPointerCapture` —— 这样单纯的轻触不会被捕获，子元素的 `click` 和位移动画能正常触发。scrub 时按 x 坐标映射到第几天，每切一天触发一次 `Haptics.impact(Light)`。
- **触感降级**：`Haptics.impact()` 在浏览器走 Capacitor 的 web 实现，不支持振动 API 的浏览器会 reject，代码里直接忽略 —— 触感只是锦上添花，失败不影响功能。

## 已知限制

- 作息表（12 节的起止时间）是写死的，改 `src/lib/constants.ts` 里的 `PERIOD_TIMETABLE`。
- 数据只存本机 localStorage，没有账号与云同步；换设备靠「导出备份 → 导入还原」，清理浏览器数据会丢失。
- 没有测试框架，回归靠 `bun run check` + 手工冒烟（切日、滑动、增删改课程与日程、改开学日期、导入导出、浏览器后退、Android 返回键）。
- `svelte-check` 目前有 27 条 a11y 告警（`label` 未关联控件、可点击 `div` 缺少 role 等），是拆分前就存在的遗留问题，不影响运行。

## 附注

`split_plan.md` 是 v4 拆分重构的计划稿，其中引用的文件行号指向拆分前的 1818 行 `App.svelte`，已经失效，仅作历史参考。
