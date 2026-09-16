import { App as CapApp } from '@capacitor/app';
import { pushView, view, viewHash } from './view.svelte';
import type { Tab } from './view.svelte';
import { modal, closeModal, closeInfo } from './modal.svelte';

export function goSettings() {
  if (view.currentTab === 'settings' && !modal.isAddModalOpen) return;
  view.currentTab = 'settings';
  pushView('settings', modal.isAddModalOpen);
}

export function goHome() {
  try {
    if (history.state && (history.state.tab === 'settings' || history.state.modal)) {
      history.back();
      return;
    }
  } catch {}
  view.currentTab = 'home';
}

/**
 * hash 路由 + 物理返回键的整体初始化。
 * popstate 与 Capacitor backButton 强耦合（逐层关闭：信息弹窗 → 添加弹窗 → 设置页 → 退出），
 * 必须封装在一起，由 App.svelte 的 onMount 调用；返回清理函数。
 */
export function initHistoryNavigation(): () => void {
  try {
    const hash = window.location.hash;
    if (hash.startsWith('#/settings')) view.currentTab = 'settings';
    history.replaceState({ tab: view.currentTab, modal: false, info: false }, '', viewHash(view.currentTab, false));
  } catch {}

  const onPopState = (e: PopStateEvent) => {
    const s = e.state;
    if (s && typeof s === 'object') {
      view.currentTab = (s.tab === 'settings' ? 'settings' : 'home') as Tab;
      const modalOpen = !!s.modal;
      if (modal.isAddModalOpen && !modalOpen) {
        modal.editingCourseId = null;
        modal.editingEventId = null;
      }
      modal.isAddModalOpen = modalOpen;
      modal.isInfoOpen = !!s.info;
    } else {
      view.currentTab = 'home';
      modal.isAddModalOpen = false;
      modal.isInfoOpen = false;
      modal.editingCourseId = null;
      modal.editingEventId = null;
    }
  };
  window.addEventListener('popstate', onPopState);

  let backListenerHandle: { remove: () => Promise<void> } | null = null;
  CapApp.addListener('backButton', () => {
    if (modal.isInfoOpen) {
      closeInfo();
    } else if (modal.isAddModalOpen) {
      closeModal();
    } else if (view.currentTab === 'settings') {
      goHome();
    } else {
      CapApp.exitApp();
    }
  })
    .then(handle => {
      backListenerHandle = handle;
    })
    .catch(() => {});

  return () => {
    window.removeEventListener('popstate', onPopState);
    if (backListenerHandle) {
      backListenerHandle.remove();
    }
  };
}
