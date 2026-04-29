<template>
  <div class="background-wallpaper-settings">
    <div class="settings-section">
      <div class="settings-section-title">{{ t('settingsGroupBackground') }}</div>
      <div class="settings-row settings-bg-wallpaper-row">
        <div class="settings-bg-wallpaper-thumb-wrap">
          <button
              type="button"
              class="settings-bg-thumb-btn"
              :aria-label="t('wallpaperThumbOpenAria')"
              :title="t('wallpaperThumbChangeHint')"
              @click="openWallpaperSub"
          >
            <span class="settings-bg-thumb-hover-hint" aria-hidden="true">{{ t('wallpaperThumbChangeHint') }}</span>
            <span
                v-if="bgThumbSrc"
                class="settings-bg-thumb-download-btn"
                role="button"
                :aria-label="t('wallpaperPreviewDownload')"
                :title="t('wallpaperPreviewDownload')"
                @click.stop="downloadCurrentWallpaper"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </span>
            <img v-if="bgThumbSrc" :src="bgThumbSrc" alt="" class="settings-bg-thumb-img"/>
            <span v-else class="settings-bg-thumb-empty">{{ t('wallpaperThumbEmpty') }}</span>
          </button>
        </div>
      </div>
    </div>

    <aside
        class="settings-panel settings-panel--wallpaper-sub"
        :class="{ 'settings-panel-open': wallpaperSubOpen }"
        aria-labelledby="settings-wallpaper-sub-heading"
        @click.stop
    >
      <div class="settings-wallpaper-sub-head">
        <div class="settings-wallpaper-sub-toolbar">
          <div id="settings-wallpaper-sub-heading" class="settings-wallpaper-sub-title">{{
              t('wallpaperDrawerTitle')
            }}
          </div>
          <button
              type="button"
              class="settings-drawer-close-btn"
              :aria-label="t('simpleUiClose')"
              :title="t('simpleUiClose')"
              @click="closeWallpaperSub"
          >
            <span class="settings-drawer-close-icon" aria-hidden="true"></span>
          </button>
        </div>
      </div>
      <div class="settings-panel-content settings-wallpaper-sub-content">
        <div class="settings-section">
          <div class="settings-section-title">{{ t('wallpaperSourceListTitle') }}</div>
          <div class="settings-wallpaper-source-grid">
            <input
                id="wallpaperSettingsBackgroundFile"
                ref="bgFileRef"
                type="file"
                accept="image/*"
                class="settings-file-input"
                style="display: none"
                @change="onBgFile"
            />
            <button
                type="button"
                class="settings-wallpaper-source-card settings-wallpaper-source-card--local"
                :class="{ active: currentWallpaperProvider === 'custom' }"
                :aria-label="t('wallpaperProv_local') + '，' + t('chooseImg')"
                :aria-pressed="currentWallpaperProvider === 'custom'"
                @click="openBgFilePicker"
            >
              <div class="settings-wallpaper-source-card-visual" aria-hidden="true">
                <span class="settings-wallpaper-source-card-icon"></span>
              </div>
              <div class="settings-wallpaper-source-card-body">
                <div class="settings-wallpaper-source-card-text">
                  <span class="settings-wallpaper-source-card-title">{{ t('wallpaperProv_local') }}</span>
                  <span class="settings-wallpaper-source-card-desc">{{ t('wallpaperProvDesc_local') }}</span>
                </div>
              </div>
            </button>
            <button
                v-for="pid in WALLPAPER_REMOTE_IDS"
                :key="pid"
                type="button"
                class="settings-wallpaper-source-card"
                :class="['settings-wallpaper-source-card--' + pid, { active: currentWallpaperProvider === pid }]"
                :aria-label="t('wallpaperProv_' + pid) + '，' + t('wallpaperPreviewHint')"
                :aria-pressed="currentWallpaperProvider === pid"
                @click="selectAndPreviewSource(pid)"
            >
              <div class="settings-wallpaper-source-card-visual" aria-hidden="true">
                <span class="settings-wallpaper-source-card-icon"></span>
              </div>
              <div class="settings-wallpaper-source-card-body">
                <div class="settings-wallpaper-source-card-text">
                  <span class="settings-wallpaper-source-card-title">{{ t('wallpaperProv_' + pid) }}</span>
                  <span class="settings-wallpaper-source-card-desc">{{ t('wallpaperProvDesc_' + pid) }}</span>
                </div>
              </div>
            </button>
          </div>
        </div>
        <div class="settings-section">
          <div class="settings-section-title">{{ t('wallpaperRotateSection') }}</div>
          <div class="settings-row settings-row-inline">
            <span class="settings-label">{{ t('wallpaperAutoRotate') }}</span>
            <label class="settings-switch" :title="t('wallpaperAutoRotate')">
              <input v-model="wallpaperAutoRotateLocal" type="checkbox" @change="onWallpaperAutoRotateChange"/>
              <span class="settings-switch-slider"></span>
            </label>
          </div>
          <div class="settings-row settings-row-range">
            <div class="settings-range-label">{{ t('wallpaperRotateMinutes') }}：{{ wallpaperRotateMinutesLocal }}</div>
            <input
                v-model.number="wallpaperRotateMinutesLocal"
                type="range"
                class="settings-range-input"
                min="1"
                max="120"
                step="1"
                :aria-label="t('wallpaperRotateMinutes')"
                @input="onWallpaperRotateMinutesInput"
            />
          </div>
          <div class="settings-row settings-row-range">
            <div class="settings-range-label">{{ t('settingsOverlayTransparency') }}：{{ bgOverlayOpacityLocal }}%</div>
            <input
                v-model.number="bgOverlayOpacityLocal"
                type="range"
                class="settings-range-input"
                min="0"
                max="100"
                step="1"
                aria-valuemin="0"
                aria-valuemax="100"
                :aria-valuenow="bgOverlayOpacityLocal"
                :aria-label="t('settingsOverlayTransparency')"
                @input="onWallpaperBgOverlayInput"
            />
          </div>
          <div class="settings-row settings-row-range">
            <div class="settings-range-label">{{ t('settingsOverlayBlur') }}：{{ bgOverlayBlurLocal }}%</div>
            <input
                v-model.number="bgOverlayBlurLocal"
                type="range"
                class="settings-range-input"
                min="0"
                max="100"
                step="1"
                aria-valuemin="0"
                aria-valuemax="100"
                :aria-valuenow="bgOverlayBlurLocal"
                :aria-label="t('settingsOverlayBlur')"
                @input="onWallpaperBgOverlayInput"
            />
          </div>
          <div class="settings-row">
            <div class="settings-btns settings-bg-image-row">
              <button
                  type="button"
                  class="settings-btn"
                  :class="{ disabled: !hasBgImageEffective }"
                  :disabled="!hasBgImageEffective"
                  id="wallpaperSettingsClearBgBtn"
                  @click="clearBgImage"
              >
                {{ t('wallpaperClearWallpaper') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>

    <WallpaperPreviewDialog
        :open="wallpaperPreviewOpen"
        :provider-id="previewProviderId"
        :include-in-rotate="previewJoinRotateChecked"
        @close="closeSourcePreview"
        @apply-image="applyPreviewImage"
        @include-in-rotate-change="onPreviewIncludeInRotate"
    />
  </div>
</template>

<script setup>
import {computed, inject, onMounted, onUnmounted, ref, watch} from 'vue';
import {useI18n} from 'vue-i18n';
import {appRuntime} from '../../services/appRuntime.js';
import {
  normalizeWallpaperRotateSourceIdsForSave,
  WALLPAPER_CUSTOM_ROTATE_ID,
  WALLPAPER_REMOTE_IDS
} from '../../services/wallpaperProviders.js';
import WallpaperPreviewDialog from './WallpaperPreviewDialog.vue';
import {persistSettings, applyLayout} from '../../utils/chromeBridge.js';

const {t} = useI18n();
const simpleUiInjected = inject('simpleUi', null);

const props = defineProps({
  /** 主设置抽屉是否打开；关闭时收起子抽屉与预览，避免再次打开仍处于子层 */
  mainPanelOpen: {type: Boolean, default: true}
});

const wallpaperSubOpen = ref(false);
const wallpaperPreviewOpen = ref(false);
const previewProviderId = ref('bing');
const selectedRemoteId = ref('bing');
const wallpaperAutoRotateLocal = ref(false);
const wallpaperRotateMinutesLocal = ref(30);
const wallpaperRotateIdsLocal = ref([]);
const bgOverlayOpacityLocal = ref(0);
const bgOverlayBlurLocal = ref(0);
const defaultBgAssetUrl = ref('');
const bgFileRef = ref(null);

let wallpaperOverlayPersistTimer = null;
let wallpaperOverlayLayoutRaf = null;

function scheduleWallpaperBgOverlayLayout() {
  if (wallpaperOverlayLayoutRaf != null) {
    cancelAnimationFrame(wallpaperOverlayLayoutRaf);
  }
  wallpaperOverlayLayoutRaf = requestAnimationFrame(() => {
    wallpaperOverlayLayoutRaf = null;
    applyLayout();
  });
}

function flushWallpaperOverlayPersistTimer() {
  if (wallpaperOverlayPersistTimer != null) {
    clearTimeout(wallpaperOverlayPersistTimer);
    wallpaperOverlayPersistTimer = null;
  }
  const o = Math.max(0, Math.min(100, Math.round(Number(bgOverlayOpacityLocal.value) || 0)));
  const b = Math.max(0, Math.min(100, Math.round(Number(bgOverlayBlurLocal.value) || 0)));
  if (!appRuntime.settings) {
    appRuntime.settings = {};
  }
  Object.assign(appRuntime.settings, {simpleOverlayOpacity: o, simpleOverlayBlurPx: b});
  persistSettings({simpleOverlayOpacity: o, simpleOverlayBlurPx: b});
}

function onWallpaperBgOverlayInput() {
  const o = Math.max(0, Math.min(100, Math.round(Number(bgOverlayOpacityLocal.value) || 0)));
  const b = Math.max(0, Math.min(100, Math.round(Number(bgOverlayBlurLocal.value) || 0)));
  bgOverlayOpacityLocal.value = o;
  bgOverlayBlurLocal.value = b;
  if (!appRuntime.settings) {
    appRuntime.settings = {};
  }
  Object.assign(appRuntime.settings, {simpleOverlayOpacity: o, simpleOverlayBlurPx: b});
  const inj = simpleUiInjected;
  if (inj) {
    inj.overlayOpacity = o;
    inj.overlayBlurPx = b;
  }
  scheduleWallpaperBgOverlayLayout();
  window.dispatchEvent(new CustomEvent('simple-search-ui-updated'));
  clearTimeout(wallpaperOverlayPersistTimer);
  wallpaperOverlayPersistTimer = setTimeout(() => {
    wallpaperOverlayPersistTimer = null;
    const o2 = Math.max(0, Math.min(100, Math.round(Number(bgOverlayOpacityLocal.value) || 0)));
    const b2 = Math.max(0, Math.min(100, Math.round(Number(bgOverlayBlurLocal.value) || 0)));
    persistSettings({simpleOverlayOpacity: o2, simpleOverlayBlurPx: b2});
  }, 120);
}

const s = () => appRuntime.settings || {};

const hasBgImageEffective = computed(() => {
  return !!(s().backgroundImage) || s().disableDefaultBg !== true;
});

const bgThumbSrc = computed(() => {
  const w = s();
  if (w.backgroundImage) return String(w.backgroundImage);
  if (w.disableDefaultBg === true) return '';
  return defaultBgAssetUrl.value || '';
});

/** 当前已应用的图源，用于壁纸卡片高亮（与预览中临时选中的 selectedRemoteId 区分） */
const currentWallpaperProvider = computed(() => {
  const p = s().wallpaperProvider;
  return p == null ? '' : String(p);
});

/** 预览窗「加入轮换」：用 computed 绑定 wallpaperRotateIdsLocal，避免模板内函数调用丢失依赖追踪 */
const previewJoinRotateChecked = computed(() => {
  const pid = previewProviderId.value;
  if (WALLPAPER_REMOTE_IDS.indexOf(pid) === -1) return false;
  const ids = wallpaperRotateIdsLocal.value;
  return Array.isArray(ids) && ids.indexOf(pid) !== -1;
});

function syncWallpaperSubFromRuntime() {
  const w = s();
  if (WALLPAPER_REMOTE_IDS.indexOf(w.wallpaperProvider) !== -1) selectedRemoteId.value = w.wallpaperProvider;
  else selectedRemoteId.value = 'bing';
  wallpaperAutoRotateLocal.value = w.wallpaperAutoRotate === true;
  {
    const rm = Number(w.wallpaperRotateMinutes);
    wallpaperRotateMinutesLocal.value = Number.isFinite(rm) && rm >= 1 && rm <= 120 ? Math.round(rm) : 30;
  }
  wallpaperRotateIdsLocal.value = normalizeWallpaperRotateSourceIdsForSave(w.wallpaperRotateSourceIds);
  bgOverlayOpacityLocal.value =
      Number.isFinite(Number(w.simpleOverlayOpacity)) && Number(w.simpleOverlayOpacity) >= 0 && Number(w.simpleOverlayOpacity) <= 100
          ? Math.round(Number(w.simpleOverlayOpacity))
          : 0;
  bgOverlayBlurLocal.value =
      Number.isFinite(Number(w.simpleOverlayBlurPx)) && Number(w.simpleOverlayBlurPx) >= 0 && Number(w.simpleOverlayBlurPx) <= 100
          ? Math.round(Number(w.simpleOverlayBlurPx))
          : 0;
}

function openWallpaperSub() {
  syncWallpaperSubFromRuntime();
  wallpaperSubOpen.value = true;
}

function closeWallpaperSub() {
  flushWallpaperOverlayPersistTimer();
  wallpaperSubOpen.value = false;
}

function openSourcePreview(pid) {
  previewProviderId.value = pid;
  wallpaperPreviewOpen.value = true;
}

function selectAndPreviewSource(pid) {
  selectedRemoteId.value = pid;
  openSourcePreview(pid);
}

function closeSourcePreview() {
  wallpaperPreviewOpen.value = false;
}

function applyPreviewImage(payload) {
  if (!payload || !payload.dataUrl) return;
  persistSettings({
    backgroundImage: payload.dataUrl,
    wallpaperProvider: payload.providerId || selectedRemoteId.value,
    disableDefaultBg: false,
    wallpaperAutoRotate: false
  });
  applyLayout();
}

function onWallpaperAutoRotateChange() {
  persistSettings({wallpaperAutoRotate: !!wallpaperAutoRotateLocal.value});
}

function onWallpaperRotateMinutesInput() {
  const v = Math.max(1, Math.min(120, Math.round(Number(wallpaperRotateMinutesLocal.value) || 30)));
  wallpaperRotateMinutesLocal.value = v;
  persistSettings({wallpaperRotateMinutes: v});
}

function onPreviewIncludeInRotate(enabled) {
  const pid = previewProviderId.value;
  if (WALLPAPER_REMOTE_IDS.indexOf(pid) === -1) return;
  let next = wallpaperRotateIdsLocal.value.slice();
  if (enabled) {
    if (next.indexOf(pid) === -1) next.push(pid);
  } else {
    const i = next.indexOf(pid);
    if (i !== -1) next.splice(i, 1);
  }
  const normalized = normalizeWallpaperRotateSourceIdsForSave(next);
  wallpaperRotateIdsLocal.value = normalized.slice();
  persistSettings({wallpaperRotateSourceIds: normalized.slice()});
}

const MAX_BG_IMAGE_FILE_BYTES = 3 * 1024 * 1024;

function onBgFile(e) {
  const file = e.target.files && e.target.files[0];
  if (!file || !file.type.startsWith('image/')) return;
  if (file.size > MAX_BG_IMAGE_FILE_BYTES) {
    alert(t('imgTooBig'));
    e.target.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = function () {
    const dataUrl = reader.result;
    const prevIds = normalizeWallpaperRotateSourceIdsForSave(s().wallpaperRotateSourceIds || []);
    const nextIds =
        prevIds.indexOf(WALLPAPER_CUSTOM_ROTATE_ID) !== -1 ? prevIds : prevIds.concat([WALLPAPER_CUSTOM_ROTATE_ID]);
    persistSettings({
      backgroundImage: dataUrl,
      wallpaperCustomDataUrl: dataUrl,
      disableDefaultBg: false,
      wallpaperProvider: 'custom',
      wallpaperAutoRotate: false,
      wallpaperRotateSourceIds: nextIds
    });
    wallpaperRotateIdsLocal.value = nextIds.slice();
    applyLayout();
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}

function clearBgImage() {
  const nextIds = normalizeWallpaperRotateSourceIdsForSave(
      (s().wallpaperRotateSourceIds || []).filter(function (id) {
        return id !== WALLPAPER_CUSTOM_ROTATE_ID;
      })
  );
  persistSettings({
    backgroundImage: '',
    wallpaperCustomDataUrl: '',
    disableDefaultBg: true,
    wallpaperProvider: 'none',
    wallpaperAutoRotate: false,
    wallpaperRotateSourceIds: nextIds
  });
  wallpaperRotateIdsLocal.value = nextIds.slice();
  applyLayout();
}

function openBgFilePicker() {
  bgFileRef.value?.click();
}

async function downloadCurrentWallpaper() {
  const src = bgThumbSrc.value;
  if (!src) return;
  try {
    const res = await fetch(src);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const ext = (blob.type ? blob.type.split('/')[1] : 'jpg') || 'jpg';
    a.download = 'super-bookmark-wallpaper-current.' + ext;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error('[downloadCurrentWallpaper] failed:', e);
  }
}

watch(
    () => props.mainPanelOpen,
    (open) => {
      if (!open) {
        flushWallpaperOverlayPersistTimer();
        wallpaperSubOpen.value = false;
        wallpaperPreviewOpen.value = false;
      }
    }
);

function onBookmarkSettingsSaved() {
  syncWallpaperSubFromRuntime();
}

onMounted(() => {
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
    try {
      defaultBgAssetUrl.value = chrome.runtime.getURL('assets/imgs/default_bg.jpg');
    } catch (_e) {
      defaultBgAssetUrl.value = '';
    }
  }
  syncWallpaperSubFromRuntime();
  if (typeof window !== 'undefined') {
    window.addEventListener('bookmark-settings-saved', onBookmarkSettingsSaved);
  }
});

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('bookmark-settings-saved', onBookmarkSettingsSaved);
  }
  flushWallpaperOverlayPersistTimer();
  if (wallpaperOverlayLayoutRaf != null) {
    cancelAnimationFrame(wallpaperOverlayLayoutRaf);
    wallpaperOverlayLayoutRaf = null;
  }
});
</script>

<style scoped>
.settings-bg-wallpaper-row {
  justify-content: center;
}

.settings-bg-wallpaper-thumb-wrap {
  display: flex;
  justify-content: center;
  width: 100%;
}

.settings-bg-wallpaper-row .settings-bg-thumb-btn {
  position: relative;
  display: block;
  width: 100%;
  max-width: 224px;
  aspect-ratio: 16 / 9;
  padding: 0;
  border: 1px solid #d1d5db;
  border-radius: 0;
  overflow: hidden;
  cursor: pointer;
  background: #e5e7eb;
  box-sizing: border-box;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.settings-bg-wallpaper-row .settings-bg-thumb-btn:hover {
  border-color: #93c5fd;
  box-shadow: 0 0 0 1px #93c5fd66;
}

.settings-bg-thumb-hover-hint {
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: 2;
  transform: translate(-50%, -50%);
  padding: 8px 14px;
  border-radius: 8px;
  background: rgba(17, 24, 39, 0.62);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.3;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.18s ease;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.18);
}

.settings-bg-wallpaper-row .settings-bg-thumb-btn:hover .settings-bg-thumb-hover-hint {
  opacity: 1;
}

.settings-bg-thumb-download-btn {
  position: absolute;
  top: 6px;
  left: 6px;
  z-index: 2;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 4px;
  background: rgba(15, 23, 42, 0.5);
  color: #fff;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  opacity: 0;
  transition: opacity 0.18s ease, background 0.15s;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.settings-bg-wallpaper-row .settings-bg-thumb-btn:hover .settings-bg-thumb-download-btn,
.settings-bg-thumb-download-btn:focus-visible {
  opacity: 1;
}

.settings-bg-thumb-download-btn:hover {
  background: rgba(15, 23, 42, 0.75);
}

.settings-bg-thumb-download-btn svg {
  width: 12px;
  height: 12px;
}

.settings-bg-thumb-img {
  position: relative;
  z-index: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.settings-bg-thumb-empty {
  position: relative;
  z-index: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  min-height: 72px;
  font-size: 12px;
  color: #9ca3af;
  padding: 8px;
  text-align: center;
}

/* 二级抽屉：与主抽屉同宽，fixed 在含 transform 的主面板内铺满 */
.settings-panel.settings-panel--wallpaper-sub {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(420px, 92vw);
  height: 100vh;
  max-height: none;
  z-index: 24;
  padding: 18px 0;
  border-left: 1px solid #dbe6f1;
  box-shadow: -8px 0 24px #00000026;
  transform: translateX(104%);
  transition: opacity 0.2s, visibility 0.2s, transform 0.2s;
}

.settings-panel.settings-panel--wallpaper-sub.settings-panel-open {
  transform: translateX(0);
}

.settings-wallpaper-sub-head {
  flex-shrink: 0;
  background: #f3f4f6;
  border-bottom: 1px solid #e5e7eb;
}

.settings-wallpaper-sub-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 14px 8px 16px;
}

.settings-wallpaper-sub-title {
  font-size: 17px;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
  flex: 1;
  min-width: 0;
}

.settings-drawer-close-btn {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  transition: background 0.15s, color 0.15s;
}

.settings-drawer-close-btn:hover {
  background: #e5e7eb;
  color: #374151;
}

.settings-drawer-close-icon {
  position: relative;
  width: 14px;
  height: 14px;
  display: block;
}

.settings-drawer-close-icon::before,
.settings-drawer-close-icon::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  width: 14px;
  height: 2px;
  background: currentColor;
  border-radius: 1px;
}

.settings-drawer-close-icon::before {
  transform: translate(-50%, -50%) rotate(45deg);
}

.settings-drawer-close-icon::after {
  transform: translate(-50%, -50%) rotate(-45deg);
}

.settings-wallpaper-sub-content {
  padding-top: 4px;
}

.settings-wallpaper-source-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 12px;
}

.settings-wallpaper-source-card {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  padding: 0;
  text-align: left;
  border: 1px solid #e5e7eb;
  border-radius: 0;
  background: #fff;
  cursor: pointer;
  overflow: hidden;
  box-sizing: border-box;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.15s ease;
}

.settings-wallpaper-source-card--bing {
  border-color: #bae6fd;
}

.settings-wallpaper-source-card--unsplash {
  border-color: #ddd6fe;
}

.settings-wallpaper-source-card--local {
  border-color: #cbd5e1;
}

.settings-wallpaper-source-card:hover {
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.08);
}

.settings-wallpaper-source-card--bing.active {
  border-color: #0284c7;
  box-shadow: 0 0 0 2px rgba(2, 132, 199, 0.35);
}

.settings-wallpaper-source-card--unsplash.active {
  border-color: #4f46e5;
  box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.35);
}

.settings-wallpaper-source-card--local.active {
  border-color: #475569;
  box-shadow: 0 0 0 2px rgba(71, 85, 105, 0.35);
}

.settings-wallpaper-source-card-visual {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(80px * 2 / 3);
  flex-shrink: 0;
  position: relative;
}

.settings-wallpaper-source-card--bing .settings-wallpaper-source-card-visual {
  background: linear-gradient(118deg, #0ea5e9 0%, #7dd3fc 42%, #e0f2fe 100%);
}

.settings-wallpaper-source-card--unsplash .settings-wallpaper-source-card-visual {
  background: linear-gradient(112deg, #4f46e5 0%, #a78bfa 38%, #fde68a 100%);
}

.settings-wallpaper-source-card--local .settings-wallpaper-source-card-visual {
  background: linear-gradient(118deg, #64748b 0%, #94a3b8 42%, #e2e8f0 100%);
}

.settings-wallpaper-source-card-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: calc(52px * 2 / 3);
  height: calc(52px * 2 / 3);
  font-size: calc(38px * 2 / 3);
  font-weight: 300;
  line-height: 1;
  color: #fbbf24;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.55);
}

.settings-wallpaper-source-card--bing .settings-wallpaper-source-card-icon::before {
  content: '☀';
  font-size: calc(36px * 2 / 3);
  color: #fff7ed;
}

.settings-wallpaper-source-card--unsplash .settings-wallpaper-source-card-icon::before {
  content: '◫';
  font-size: calc(34px * 2 / 3);
  color: #eef2ff;
}

.settings-wallpaper-source-card--local .settings-wallpaper-source-card-icon::before {
  content: '\21E7';
  font-size: calc(32px * 2 / 3);
  font-weight: 500;
  color: #f8fafc;
}

.settings-wallpaper-source-card-body {
  padding: 10px 10px 12px;
  flex: 1;
  min-height: 0;
}

.settings-wallpaper-source-card--bing .settings-wallpaper-source-card-body {
  background: #f8fafc;
}

.settings-wallpaper-source-card--unsplash .settings-wallpaper-source-card-body {
  background: #faf5ff;
}

.settings-wallpaper-source-card--local .settings-wallpaper-source-card-body {
  background: #f1f5f9;
}

.settings-wallpaper-source-card-text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  width: 100%;
  min-width: 0;
}

.settings-wallpaper-source-card-title {
  font-size: 13px;
  font-weight: 700;
  color: #374151;
  line-height: 1.35;
}

.settings-wallpaper-source-card-desc {
  font-size: 11px;
  font-weight: 400;
  color: #9ca3af;
  line-height: 1.45;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  word-break: break-word;
}

</style>
