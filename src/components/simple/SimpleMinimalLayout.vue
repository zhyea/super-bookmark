<template>
  <div class="simple-root">
    <div class="simple-bg-overlay" aria-hidden="true" :style="overlayLayerStyle" />

    <div class="simple-root-content">
      <div class="simple-search-anchor">
        <SimpleSearchBox />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, inject } from 'vue';
import SimpleSearchBox from '../layout/SimpleSearchBox.vue';

const simpleUi = inject('simpleUi');
if (!simpleUi) throw new Error('simpleUi missing (provided by App)');

/** 背景色/图透明度由 settings.js 写入 #page-bg-backdrop；此处仅保留可选背景模糊，不再叠暗色层以免与内容混淆 */
const overlayLayerStyle = computed(() => {
  const blur = Math.max(0, Math.min(32, Number(simpleUi.overlayBlurPx) || 0));
  const bf = blur > 0 ? `blur(${blur}px)` : 'none';
  return {
    backgroundColor: 'transparent',
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
