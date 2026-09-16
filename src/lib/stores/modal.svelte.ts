import type { Course, CourseDraft, EventDraft, EventItem } from '../constants';
import { getInitialCourseForm } from '../domain/course';
import { getInitialEventForm } from '../domain/event';
import { getSelectedDateStr } from '../utils/date';
import { validateCourse, validateEvent } from '../utils/validate';
import { addCourse, addEvent, removeCourse, removeEvent, updateCourse, updateEvent } from './timetable.svelte';
import { pushView, view, viewHash } from './view.svelte';

export type ModalMode = 'course' | 'event';

// 5. 页面与模态框状态控制
export const modal = $state({
  isAddModalOpen: false,
  isInfoOpen: false,
  modalMode: 'course' as ModalMode,
  editingCourseId: null as string | null,
  editingEventId: null as string | null,
  newCourse: getInitialCourseForm() as CourseDraft,
  newEvent: getInitialEventForm() as EventDraft
});

// 模块不能导出 $derived，这里的派生值在动作调用时即时计算即可
function currentSelectedDateStr(): string {
  return getSelectedDateStr(view.selectedDayOfWeek, view.todayDayOfWeek);
}

// 保存/删除后不走 closeModal 的 popstate 路径，而是先改状态再弹回历史
function dismissModalFromHistory() {
  try {
    if (history.state && history.state.modal) history.back();
  } catch {}
}

export function openModal() {
  if (modal.isAddModalOpen) return;
  modal.isAddModalOpen = true;
  pushView(view.currentTab, true);
}

export function closeModal() {
  if (!modal.isAddModalOpen) return;
  try {
    if (history.state && history.state.modal) {
      history.back();
      return;
    }
  } catch {}
  modal.isAddModalOpen = false;
  modal.editingCourseId = null;
  modal.editingEventId = null;
}

export function openInfo() {
  if (modal.isInfoOpen) return;
  modal.isInfoOpen = true;
  try {
    history.pushState(
      { tab: view.currentTab, modal: modal.isAddModalOpen, info: true },
      '',
      viewHash(view.currentTab, modal.isAddModalOpen)
    );
  } catch {}
}

export function closeInfo() {
  if (!modal.isInfoOpen) return;
  try {
    if (history.state && history.state.info) {
      history.back();
      return;
    }
  } catch {}
  modal.isInfoOpen = false;
}

// 打开编辑课程
export function openEditCourse(course: Course) {
  modal.editingCourseId = course.id;
  modal.editingEventId = null;
  modal.modalMode = 'course';
  modal.newCourse = JSON.parse(JSON.stringify(course)) as CourseDraft;
  openModal();
}

export function openAddCourse() {
  modal.editingCourseId = null;
  modal.editingEventId = null;
  modal.modalMode = 'course';
  modal.newCourse = getInitialCourseForm();
  modal.newEvent = getInitialEventForm(currentSelectedDateStr());
  openModal();
}

export function openEditEvent(ev: EventItem) {
  modal.editingEventId = ev.id;
  modal.editingCourseId = null;
  modal.modalMode = 'event';
  modal.newEvent = JSON.parse(JSON.stringify(ev)) as EventDraft;
  openModal();
}

export function switchModalMode(mode: ModalMode) {
  if (modal.editingCourseId || modal.editingEventId) return;
  modal.modalMode = mode;
}

export function addScheduleSlot() {
  modal.newCourse.schedules = [
    ...modal.newCourse.schedules,
    { dayOfWeek: 1, startPeriod: 1, endPeriod: 2 }
  ];
}

export function removeScheduleSlot(index: number) {
  if (modal.newCourse.schedules.length > 1) {
    modal.newCourse.schedules = modal.newCourse.schedules.filter((_, i) => i !== index);
  }
}

export function saveCourse() {
  const error = validateCourse(modal.newCourse);
  if (error) {
    alert(error);
    return;
  }

  if (modal.editingCourseId) {
    // 修改已有课程
    updateCourse(modal.editingCourseId, modal.newCourse);
  } else {
    // 新增课程
    addCourse(modal.newCourse);
  }

  modal.isAddModalOpen = false;
  modal.newCourse = getInitialCourseForm();
  modal.editingCourseId = null;
  dismissModalFromHistory();
}

export function saveEvent() {
  const error = validateEvent(modal.newEvent);
  if (error) {
    alert(error);
    return;
  }

  if (modal.editingEventId) {
    updateEvent(modal.editingEventId, modal.newEvent);
  } else {
    addEvent(modal.newEvent);
  }

  modal.isAddModalOpen = false;
  modal.newEvent = getInitialEventForm(currentSelectedDateStr());
  modal.editingEventId = null;
  dismissModalFromHistory();
}

export function deleteCourse(id?: string | null) {
  const targetId = id || modal.editingCourseId;
  if (!targetId) return;

  if (confirm('确定要删除这门课程吗？此操作无法撤销。')) {
    removeCourse(targetId);

    // 如果当前正开着弹窗，删完顺手关闭弹窗
    if (modal.isAddModalOpen) {
      modal.isAddModalOpen = false;
      modal.editingCourseId = null;
      dismissModalFromHistory();
    }
  }
}

export function deleteEvent(id?: string | null) {
  const targetId = id || modal.editingEventId;
  if (!targetId) return;

  if (confirm('确定要删除这条日程吗？此操作无法撤销。')) {
    removeEvent(targetId);
    if (modal.isAddModalOpen) {
      modal.isAddModalOpen = false;
      modal.editingEventId = null;
      dismissModalFromHistory();
    }
  }
}
