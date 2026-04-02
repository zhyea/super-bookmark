<template>
  <div class="simple-root">
    <div class="simple-bg-overlay" aria-hidden="true" :style="overlayLayerStyle" />

    <div class="simple-root-content">
      <div class="settings-wrap">
        <SettingsPanel :links-grid="null"/>
      </div>

      <div class="simple-search-anchor">
        <SimpleSearchBox/>
      </div>
    </div>
  </div>
</template>

<script setup>
import {computed, onMounted, provide, reactive} from 'vue';
import SimpleSearchBox from './components/layout/SimpleSearchBox.vue';
import SettingsPanel from './components/settings/SettingsPanel.vue';
import {appRuntime} from './services/appRuntime.js';
import {BookmarkManagerSettings} from './services/settings.js';

const simpleUi = reactive({
  overlayOpacity: 0,
  overlayBlurPx: 0,
  searchBorderRadiusPx: 32
});

provide('simpleUi', simpleUi);

onMounted(() => {
  const apply = () => {
    const s = appRuntime.settings;
    if (!s) return;
    simpleUi.overlayOpacity = s.simpleOverlayOpacity;
    simpleUi.overlayBlurPx = s.simpleOverlayBlurPx;
    simpleUi.searchBorderRadiusPx = s.simpleSearchBorderRadiusPx;
  };
  apply();
  BookmarkManagerSettings.loadSettings(() => apply());
});

const overlayLayerStyle = computed(() => {
  const a = Math.max(0, Math.min(100, Number(simpleUi.overlayOpacity) || 0)) / 100;
  const blur = Math.max(0, Math.min(32, Number(simpleUi.overlayBlurPx) || 0));
  const bf = blur > 0 ? `blur(${blur}px)` : 'none';
  return {
    backgroundColor: `rgba(0, 0, 0, ${a})`,
    backdropFilter: bf,
    WebkitBackdropFilter: bf
  };
});
</script>

<style scoped>
.simple-root {
  min-height: 100vh;
  position: relative;
  box-sizing: border-box;
}

.simple-bg-overlay {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.simple-root-content {
  position: relative;
  z-index: 1;
  min-height: 100vh;
  padding: 24px 16px;
  box-sizing: border-box;
}

/* 搜索区垂直位置：距屏幕底边 3/5 屏高处（等价于距顶边 2/5 处居中） */
.simple-search-anchor {
  position: absolute;
  left: 0;
  right: 0;
  top: 40%;
  transform: translateY(-50%);
  pointer-events: none;
}

.simple-search-anchor > * {
  pointer-events: auto;
  margin: 0 auto;
}
</style>

