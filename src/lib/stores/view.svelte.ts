import { jsDayToWeekDay } from '../utils/date';
import { timetable } from './timetable.svelte';

export type Tab = 'home' | 'settings';

// 3. 计算当前是第几周、周几
export const view = $state({
  currentTab: 'home' as Tab,
  currentWeek: 1,
  todayDayOfWeek: 1, // 1代表周一，7代表周日
  selectedDayOfWeek: 1,
  slideDir: 0
});

export function calculateCurrentTime() {
  const now = new Date();
  view.todayDayOfWeek = jsDayToWeekDay(now.getDay());
  view.selectedDayOfWeek = view.todayDayOfWeek; // 默认选中今天

  const start = new Date(timetable.semesterStartDate + 'T00:00:00');
  const diffTime = now.getTime() - start.getTime();
  if (diffTime < 0) {
    view.currentWeek = 1;
  } else {
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    view.currentWeek = Math.floor(diffDays / 7) + 1;
  }
}

export function selectDay(n: number, animate = true): boolean {
  n = Math.max(1, Math.min(7, n));
  if (n === view.selectedDayOfWeek) return false;
  view.slideDir = animate ? (n > view.selectedDayOfWeek ? 1 : -1) : 0;
  view.selectedDayOfWeek = n;
  return true;
}

// —— hash 路由原语：把视图状态序列化进浏览器历史 ——
export function viewHash(tab: Tab, modalOpen: boolean): string {
  if (modalOpen) return tab === 'settings' ? '#/settings/edit' : '#/add';
  return tab === 'settings' ? '#/settings' : '#/';
}

export function pushView(tab: Tab, modalOpen: boolean) {
  try {
    history.pushState({ tab, modal: modalOpen }, '', viewHash(tab, modalOpen));
  } catch {}
}

// 说明：selectedInfo/selectedDateStr/displayCourses 等派生数据不放在本模块，
// Svelte 5 不允许从模块导出 $derived，由 App.svelte 的 $derived 调用 domain 纯函数计算。
