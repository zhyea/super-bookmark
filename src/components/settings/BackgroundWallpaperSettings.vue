<template>
  <div class="background-wallpaper-settings">
    <div class="settings-section">
      <div class="settings-section-title">{{ t('settingsGroupBackground') }}</div>
      <div class="settings-row settings-bg-wallpaper-row">
        <span class="settings-label">{{ t('settingsBgImg') }}</span>
        <button type="button" class="settings-bg-thumb-btn" :aria-label="t('wallpaperThumbOpenAria')"
                @click="openWallpaperSub">
          <img v-if="bgThumbSrc" :src="bgThumbSrc" alt="" class="settings-bg-thumb-img"/>
          <span v-else class="settings-bg-thumb-empty">{{ t('wallpaperThumbEmpty') }}</span>
        </button>
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
          <div class="settings-section-title">{{ t('wallpaperSectionLocal') }}</div>
          <div class="settings-row">
            <div class="settings-btns settings-bg-image-row">
              <input
                  id="wallpaperSettingsBackgroundFile"
                  ref="bgFileRef"
                  type="file"
                  accept="image/*"
                  class="settings-file-input"
                  style="display: none"
                  @change="onBgFile"
              />
              <button type="button" class="settings-btn" id="wallpaperSettingsUploadBgBtn" @click="openBgFilePicker">
                {{ t('chooseImg') }}
              </button>
              <button
                  type="button"
                  class="settings-btn"
                  :class="{ disabled: !hasBgImageEffective }"
                  :disabled="!hasBgImageEffective"
                  id="wallpaperSettingsClearBgBtn"
                  @click="clearBgImage"
              >
                {{ t('clear') }}
              </button>
            </div>
          </div>
        </div>
        <div class="settings-section">
          <div class="settings-section-title">{{ t('wallpaperSourceListTitle') }}</div>
          <div class="settings-wallpaper-source-grid">
            <button
                v-for="pid in WALLPAPER_REMOTE_IDS"
                :key="pid"
                type="button"
                class="settings-wallpaper-source-card"
                :class="{ active: selectedRemoteId === pid }"
                @click="selectAndPreviewSource(pid)"
            >
              <span class="settings-wallpaper-source-name">{{ t('wallpaperProv_' + pid) }}</span>
              <span class="settings-wallpaper-source-preview-hint">{{ t('wallpaperPreviewHint') }}</span>
            </button>
          </div>
          <div class="settings-row">
            <button type="button" class="settings-btn" :disabled="wallpaperApplying"
                    @click="applySelectedRemoteWallpaper">
              {{ wallpaperApplying ? t('wallpaperSourceApplying') : t('wallpaperSourceApply') }}
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
                :disabled="!wallpaperAutoRotateLocal"
                @input="onWallpaperRotateMinutesInput"
            />
          </div>
          <div class="settings-row">
            <div class="settings-range-label">{{ t('wallpaperRotatePickSources') }}</div>
            <div class="settings-wallpaper-rotate-grid">
              <label v-for="pid in WALLPAPER_REMOTE_IDS" :key="'r-' + pid" class="settings-wallpaper-check">
                <input
                    type="checkbox"
                    :checked="rotateSourceChecked(pid)"
                    :disabled="!wallpaperAutoRotateLocal"
                    @change="toggleRotateSource(pid, $event)"
                />
                <span>{{ t('wallpaperProv_' + pid) }}</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </aside>

    <WallpaperPreviewDialog
        :open="wallpaperPreviewOpen"
        :provider-id="previewProviderId"
        @close="closeSourcePreview"
        @apply-image="applyPreviewImage"
    />
  </div>
</template>

<script setup>
import {computed, onMounted, ref, watch} from 'vue';
import {useI18n} from 'vue-i18n';
import {appRuntime} from '../../services/appRuntime.js';
import {WALLPAPER_REMOTE_IDS, fetchWallpaperByProvider} from '../../services/wallpaperProviders.js';
import {normalizeWallpaperRotateSourceIdsForSave} from '../../services/wallpaperRotation.js';
import WallpaperPreviewDialog from './WallpaperPreviewDialog.vue';

const {t} = useI18n();

const props = defineProps({
  /** 主设置抽屉是否打开；关闭时收起子抽屉与预览，避免再次打开仍处于子层 */
  mainPanelOpen: {type: Boolean, default: true}
});

const wallpaperSubOpen = ref(false);
const wallpaperPreviewOpen = ref(false);
const previewProviderId = ref('bing');
const wallpaperApplying = ref(false);
const selectedRemoteId = ref('bing');
const wallpaperAutoRotateLocal = ref(false);
const wallpaperRotateMinutesLocal = ref(30);
const wallpaperRotateIdsLocal = ref(WALLPAPER_REMOTE_IDS.slice());
const defaultBgAssetUrl = ref('');
const bgFileRef = ref(null);

function settingsModule() {
  return typeof window !== 'undefined' ? window.BookmarkManagerSettings : null;
}

function persistSettings(partial) {
  settingsModule()?.saveSettings(partial);
}

function applyLayout() {
  settingsModule()?.applyContentWidthAndBackground();
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
}

function openWallpaperSub() {
  syncWallpaperSubFromRuntime();
  wallpaperSubOpen.value = true;
}

function closeWallpaperSub() {
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

async function applySelectedRemoteWallpaper() {
  const id = selectedRemoteId.value;
  if (WALLPAPER_REMOTE_IDS.indexOf(id) === -1) return;
  wallpaperApplying.value = true;
  try {
    const dataUrl = await fetchWallpaperByProvider(id);
    persistSettings({
      backgroundImage: dataUrl,
      wallpaperProvider: id,
      disableDefaultBg: false
    });
    applyLayout();
  } catch (_e) {
    alert(t('wallpaperSourceFail'));
  } finally {
    wallpaperApplying.value = false;
  }
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

function rotateSourceChecked(pid) {
  return wallpaperRotateIdsLocal.value.indexOf(pid) !== -1;
}

function toggleRotateSource(pid, ev) {
  const on = ev.target.checked;
  let next = wallpaperRotateIdsLocal.value.slice();
  if (on) {
    if (next.indexOf(pid) === -1) next.push(pid);
  } else {
    const i = next.indexOf(pid);
    if (i !== -1) next.splice(i, 1);
  }
  if (!next.length) next = WALLPAPER_REMOTE_IDS.slice();
  wallpaperRotateIdsLocal.value = next;
  persistSettings({wallpaperRotateSourceIds: normalizeWallpaperRotateSourceIdsForSave(next)});
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
    persistSettings({
      backgroundImage: reader.result,
      disableDefaultBg: false,
      wallpaperProvider: 'custom',
      wallpaperAutoRotate: false
    });
    applyLayout();
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}

function clearBgImage() {
  persistSettings({
    backgroundImage: '',
    disableDefaultBg: true,
    wallpaperProvider: 'none',
    wallpaperAutoRotate: false
  });
  applyLayout();
}

function openBgFilePicker() {
  bgFileRef.value?.click();
}

watch(
    () => props.mainPanelOpen,
    (open) => {
      if (!open) {
        wallpaperSubOpen.value = false;
        wallpaperPreviewOpen.value = false;
      }
    }
);

onMounted(() => {
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
    try {
      defaultBgAssetUrl.value = chrome.runtime.getURL('assets/imgs/default_bg.jpg');
    } catch (_e) {
      defaultBgAssetUrl.value = '';
    }
  }
  syncWallpaperSubFromRuntime();
});
</script>

<style scoped>
.settings-bg-wallpaper-row .settings-bg-thumb-btn {
  display: block;
  width: 100%;
  max-width: 168px;
  aspect-ratio: 16 / 9;
  padding: 0;
  border: 1px solid #d1d5db;
  border-radius: 8px;
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

.settings-bg-thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.settings-bg-thumb-empty {
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
  width: min(396px, 92vw);
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
  align-items: flex-start;
  gap: 4px;
  padding: 10px 10px 12px;
  text-align: left;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fff;
  cursor: pointer;
  font-size: 13px;
  color: #374151;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.settings-wallpaper-source-card:hover {
  border-color: #93c5fd;
}

.settings-wallpaper-source-card.active {
  border-color: #4f9dff;
  box-shadow: 0 0 0 1px #4f9dff44;
}

.settings-wallpaper-source-name {
  font-weight: 600;
}

.settings-wallpaper-source-preview-hint {
  font-size: 11px;
  color: #9ca3af;
}

.settings-wallpaper-rotate-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.settings-wallpaper-check {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #374151;
  cursor: pointer;
}

.settings-wallpaper-check input {
  flex-shrink: 0;
}
</style>
