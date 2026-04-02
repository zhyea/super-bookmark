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

      <button type="button" class="simple-home-btn" :aria-label="homeAria" :title="homeAria" @click="goHome">
      <svg
          class="simple-nav-icon"
          width="256"
          height="256"
          viewBox="0 0 256 256"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          focusable="false"
      >
        <path
            d="M156 80V32L248 128L156 224V176C88 176 40 198 8 248C24 176 64 104 156 80Z"
            fill="#2D2D39"
        />
      </svg>
      </button>
    </div>
  </div>
</template>

<script setup>
import {computed, onMounted, provide, reactive} from 'vue';
import {useI18n} from 'vue-i18n';
import SimpleSearchBox from './components/layout/SimpleSearchBox.vue';
import SettingsPanel from './components/settings/SettingsPanel.vue';
import {appRuntime} from './services/appRuntime.js';
import {BookmarkManagerSettings} from './services/settings.js';

const {t} = useI18n();

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

const homeAria = computed(() => t('simpleGoHome'));

function goHome() {
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
      window.location.href = chrome.runtime.getURL('index.html');
    } else {
      window.location.href = 'index.html';
    }
  } catch {
    window.location.href = 'index.html';
  }
}
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

.simple-home-btn {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 640;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid #e0e0e0;
  background: #ffffff;
  box-shadow: 0 2px 12px #00000026;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #595959;
  opacity: 0.5;
  transition: transform 0.2s, box-shadow 0.2s;
  padding: 0;
}

.simple-home-btn:hover {
  box-shadow: 0 4px 16px #00000033;
  transform: translateY(-1px);
}

.simple-nav-icon {
  width: 22px;
  height: 22px;
}
</style>

