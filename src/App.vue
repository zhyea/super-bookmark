<template>
  <template v-if="layoutReady">
    <SimpleMinimalLayout v-if="useSimplePage" />
    <BookmarkMainLayout v-else />
    <!-- 与布局同级常驻，切换极简/默认时抽屉状态不丢失 -->
    <div class="settings-wrap">
      <SettingsPanel :links-grid="settingsLinksGrid" />
    </div>
  </template>
</template>

<script setup>
import { ref, reactive, provide, onMounted, onUnmounted } from 'vue';
import SimpleMinimalLayout from './components/simple/SimpleMinimalLayout.vue';
import BookmarkMainLayout from './components/bookmark/BookmarkMainLayout.vue';
import SettingsPanel from './components/settings/SettingsPanel.vue';
import { appRuntime } from './services/appRuntime.js';
import { BookmarkManagerSettings } from './services/settings.js';
import { normalizeBookmarkCardTextColor } from './services/settingsUtils.js';

/** 在 loadSettings 完成前不挂载布局，避免极简/完整模式误判导致首屏闪烁 */
const layoutReady = ref(false);
const useSimplePage = ref(false);

/** 主书签页 #linksGrid，极简模式为 null；由 BookmarkContentArea 注册 */
const settingsLinksGrid = ref(null);
provide('registerSettingsLinksGrid', (el) => {
  settingsLinksGrid.value = el;
});

/** 极简页搜索框与设置内「搜索框」滑块共用 */
const simpleUi = reactive({
  overlayOpacity: 0,
  overlayBlurPx: 0,
  searchBorderRadiusPx: 32,
  searchOpacity: 100,
  bookmarkCardTextColor: '#1f2937'
});
provide('simpleUi', simpleUi);

function syncSimpleUiFromRuntime() {
  const s = appRuntime.settings;
  if (!s) return;
  simpleUi.overlayOpacity = s.simpleOverlayOpacity;
  simpleUi.overlayBlurPx = s.simpleOverlayBlurPx;
  simpleUi.searchBorderRadiusPx = s.simpleSearchBorderRadiusPx;
  simpleUi.searchOpacity = (function () {
    const v = Number(s.simpleSearchOpacity);
    if (!Number.isFinite(v) || v < 0 || v > 100) return 100;
    return Math.max(10, Math.min(100, Math.round(v)));
  })();
  simpleUi.bookmarkCardTextColor = normalizeBookmarkCardTextColor(s.simpleBookmarkCardTextColor);
}

function syncMode() {
  useSimplePage.value = !!(appRuntime.settings && appRuntime.settings.useSimplePage);
}

function onSettingsSaved() {
  syncMode();
  syncSimpleUiFromRuntime();
}

onMounted(() => {
  BookmarkManagerSettings.loadSettings(() => {
    syncMode();
    syncSimpleUiFromRuntime();
    layoutReady.value = true;
  });
  window.addEventListener('bookmark-settings-saved', onSettingsSaved);
});

onUnmounted(() => {
  window.removeEventListener('bookmark-settings-saved', onSettingsSaved);
});
</script>
