<template>
  <!-- 挂到 body：不受设置抽屉 transform 包含块影响；居中弹窗展示预览，与侧滑抽屉区分 -->
  <Teleport to="body">
    <div
        v-if="open"
        class="settings-wallpaper-preview-mask"
        role="dialog"
        aria-modal="true"
        @pointerdown.stop
    >
      <div class="settings-wallpaper-preview-dialog" @click.stop>
        <div class="settings-wallpaper-preview-head">
          <div class="settings-wallpaper-preview-title">
            {{ t('wallpaperProv_' + providerId) }} · {{ items.length }}
          </div>
          <button
              type="button"
              class="settings-drawer-close-btn"
              :disabled="applyBusy"
              :aria-label="t('simpleUiClose')"
              :title="t('simpleUiClose')"
              @click="emit('close')"
          >
            <span class="settings-drawer-close-icon" aria-hidden="true"></span>
          </button>
        </div>
        <div
            ref="galleryRef"
            class="settings-wallpaper-preview-gallery"
            @scroll.passive="onGalleryScroll"
            @wheel.passive="onGalleryWheel"
            @pointerdown="onGalleryPointerDown"
            @pointerup="onGalleryPointerUp"
            @pointercancel="onGalleryPointerUp"
            @pointerleave="onGalleryPointerLeave"
        >
          <div v-if="initialLoading" class="settings-wallpaper-preview-gallery-cover">
            <div class="settings-wallpaper-preview-loader">
              <span class="settings-wallpaper-pinwheel" aria-hidden="true"></span>
              <span class="settings-wallpaper-preview-loader-text">{{ t('wallpaperPreviewThumbsLoading') }}</span>
            </div>
          </div>
          <TransitionGroup name="wptile" tag="div" class="settings-wallpaper-preview-tile-group">
            <div
                v-for="item in items"
                :key="item.listKey"
                class="settings-wallpaper-preview-tile"
                :title="t('wallpaperProv_' + providerId)"
            >
              <img
                  :src="thumbUrlForPreview(item)"
                  :alt="t('wallpaperProv_' + providerId)"
                  class="settings-wallpaper-preview-image"
                  :class="{ 'settings-wallpaper-preview-image--busy': applyBusy }"
                  draggable="false"
                  @dblclick="onItemDoubleClick(item)"
              />
            </div>
          </TransitionGroup>
          <div v-if="items.length && appendLoadHintShown" class="settings-wallpaper-preview-loadmore">
            <span class="settings-wallpaper-pinwheel settings-wallpaper-pinwheel--sm" aria-hidden="true"></span>
            <span class="settings-wallpaper-preview-loadmore-text">{{ t('wallpaperPreviewThumbsLoading') }}</span>
          </div>
          <div
              v-if="appendTimeoutHint && items.length"
              class="settings-wallpaper-preview-status settings-wallpaper-preview-status-timeout"
              role="status"
          >
            {{ t('wallpaperPreviewAppendTimeout') }}
          </div>
          <div
              v-if="previewError && !isBusy"
              class="settings-wallpaper-preview-status settings-wallpaper-preview-status-error"
          >
            {{ t('wallpaperSourceFail') }}
          </div>
        </div>
        <div class="settings-wallpaper-preview-foot">
          <span class="settings-wallpaper-preview-foot-label">{{ t('wallpaperPreviewJoinRotate') }}</span>
          <label class="settings-switch" :title="t('wallpaperPreviewJoinRotate')">
            <input
                type="checkbox"
                :checked="includeInRotate"
                :disabled="applyBusy"
                @change="onIncludeInRotateChange"
            />
            <span class="settings-switch-slider"></span>
          </label>
        </div>
        <div v-if="applyBusy" class="settings-wallpaper-preview-apply-overlay" @click.stop aria-live="polite">
          <div class="settings-wallpaper-preview-loader settings-wallpaper-preview-loader--on-dark">
            <span class="settings-wallpaper-pinwheel settings-wallpaper-pinwheel--light" aria-hidden="true"></span>
            <span class="settings-wallpaper-preview-loader-text">{{ t('wallpaperPreviewApplyBusy') }}</span>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import {ref, watch, nextTick, computed} from 'vue';
import {useI18n} from 'vue-i18n';
import {fetchWallpaperDataUrlFromUrl} from '../../services/wallpaperProviders.js';
import {fetchWallpaperPreviewPage} from '../../services/wallpaperPreviewService.js';

const props = defineProps({
  open: {type: Boolean, default: false},
  providerId: {type: String, default: 'bing'},
  includeInRotate: {type: Boolean, default: false}
});

const emit = defineEmits(['close', 'apply-image', 'include-in-rotate-change']);

function onIncludeInRotateChange(ev) {
  emit('include-in-rotate-change', !!(ev.target && ev.target.checked));
}

const {t} = useI18n();
const galleryRef = ref(null);
const items = ref([]);
/** 首屏请求是否仍在飞（阻塞分页与双击）；与遮罩展示时间解耦 */
const initialFetchPending = ref(false);
/** 首屏「加载中」遮罩；最多展示 INITIAL_LOADING_HINT_MAX_MS，超时后隐藏但可继续等数据 */
const initialLoading = ref(false);
/** 分页请求是否仍在飞（阻塞触底与双击）；与底部「加载中」文案展示时间解耦 */
const appendFetchPending = ref(false);
/**
 * 底部分页「加载中」是否展示（与 appendFetchPending 解耦：pending 变 false 后延迟收起，避免链式请求与滚动造成频闪）。
 */
const appendLoadHintShown = ref(false);
const isBusy = computed(function () {
  return initialFetchPending.value === true || appendFetchPending.value === true;
});
const previewError = ref(false);
/** 分页加载超时提示 */
const appendTimeoutHint = ref(false);
const hasMore = ref(true);
const page = ref(0);
const applyBusy = ref(false);
/** 为每条预览分配稳定 :key，便于追加批次而不复用旧 vnode */
let listBatchSeq = 0;
/**
 * 每次打开预览或切换图源时递增，用于丢弃过期的异步写入（避免分页加载与 watch 清空/首屏加载交叉导致旧图被整表替换）。
 */
let previewListSession = 0;
/** 单次分页请求代数：超时后自增以丢弃仍在途的响应 */
let appendFetchOpId = 0;
/** 底部分页「加载中」自展示起最长保留时间 */
let appendHintMaxVisibleTimerId = null;
/** pending 结束后延迟隐藏底部「加载中」，合并短时间内的多次起停 */
let appendHintHideDebounceTimerId = null;
/** 首屏遮罩「加载中」最长展示时间（毫秒），与底部分页 loadmore 上限一致 */
let initialLoadHintTimerId = null;

/** 每页缩略图数量（与接口 n / per_page 一致） */
const PAGE_SIZE = 6;
/** 首屏遮罩「加载中」最长展示时间（毫秒） */
const INITIAL_LOADING_HINT_MAX_MS = 3000;
/** 底部分页单次尝试最长等待时间，超时后终止本次加载并提示 */
const APPEND_LOADING_MAX_MS = 5000;
/** 分页结束后延迟隐藏底部「加载中」，避免与下一次触底请求在同一视觉帧内闪灭 */
const APPEND_HINT_HIDE_DEBOUNCE_MS = 160;
/** 距滚动容器底部小于等于该像素时视为触底，触发加载下一页 */
const NEAR_BOTTOM_PX = 32;
/** 判定按下位置在纵向滚动条一带（与 thin 滚动条 + 触控余量） */
const SCROLLBAR_HIT_PX = 20;
/** >0 表示正在 ensureGalleryScrollableOrExhausted 循环内 */
let ensureGalleryDepth = 0;
/** 上一次 scrollTop，用于判断是否为用户主动向下滚动 */
let galleryLastScrollTop = 0;
/** 指针是否在滚动条区域按下（拖动滚动条或点轨道） */
let galleryScrollbarPointerActive = false;

function itemVisualKey(it) {
  return String(it && it.thumbUrl || '') + '\0' + String(it && it.fullUrl || '');
}

function tagListItems(rawItems) {
  listBatchSeq += 1;
  const b = listBatchSeq;
  const pid = props.providerId;
  return rawItems.map(function (it, i) {
    return {
      id: it.id,
      thumbUrl: it.thumbUrl,
      fullUrl: it.fullUrl,
      listKey: pid + '-b' + b + '-' + i + '-' + String(it.id)
    };
  });
}

/**
 * 为每条缩略图生成唯一请求 URL，避免多格共用同一地址时浏览器复用解码/缓存导致「旧格显示成新图」。
 * 双击应用仍使用原始 fullUrl。
 */
function thumbUrlForPreview(item) {
  const u = String(item && item.thumbUrl || '');
  if (!u) return '';
  if (u.indexOf('data:') === 0) return u;
  const token = encodeURIComponent(item.listKey || String(item.id || ''));
  try {
    const url = new URL(u);
    url.searchParams.set('__sbprev', token);
    return url.toString();
  } catch (_e) {
    const sep = u.indexOf('?') >= 0 ? '&' : '?';
    return u + sep + '__sbprev=' + token;
  }
}

function filterTaggedNotInKeySet(tagged, keySet) {
  return tagged.filter(function (it) {
    const k = itemVisualKey(it);
    if (!k || k === '\0') return false;
    if (keySet.has(k)) return false;
    keySet.add(k);
    return true;
  });
}

function clearAppendHintMaxVisibleTimer() {
  if (appendHintMaxVisibleTimerId !== null) {
    clearTimeout(appendHintMaxVisibleTimerId);
    appendHintMaxVisibleTimerId = null;
  }
}

function clearAppendHintHideDebounceTimer() {
  if (appendHintHideDebounceTimerId !== null) {
    clearTimeout(appendHintHideDebounceTimerId);
    appendHintHideDebounceTimerId = null;
  }
}

function clearAllAppendHintTimers() {
  clearAppendHintMaxVisibleTimer();
  clearAppendHintHideDebounceTimer();
}

/** 新分页开始时：立刻显示底部「加载中」，并挂最长可见时间 */
function onAppendFetchStart(sessionAtStart, opIdForAppend) {
  clearAppendHintHideDebounceTimer();
  appendLoadHintShown.value = true;
  clearAppendHintMaxVisibleTimer();
  appendHintMaxVisibleTimerId = setTimeout(function () {
    appendHintMaxVisibleTimerId = null;
    if (previewListSession !== sessionAtStart || appendFetchOpId !== opIdForAppend) return;
    appendLoadHintShown.value = false;
    if (appendFetchPending.value) {
      appendFetchOpId += 1;
      appendFetchPending.value = false;
      appendTimeoutHint.value = true;
    }
  }, APPEND_LOADING_MAX_MS);
}

/** 单次分页 fetch 结束：延迟收起底部「加载中」；若很快又发起新分页，会在 onAppendFetchStart 里取消 */
function scheduleAppendLoadHintHideDebounced() {
  clearAppendHintHideDebounceTimer();
  appendHintHideDebounceTimerId = setTimeout(function () {
    appendHintHideDebounceTimerId = null;
    if (!appendFetchPending.value) {
      appendLoadHintShown.value = false;
      clearAppendHintMaxVisibleTimer();
    }
  }, APPEND_HINT_HIDE_DEBOUNCE_MS);
}

function clearInitialLoadHintTimer() {
  if (initialLoadHintTimerId !== null) {
    clearTimeout(initialLoadHintTimerId);
    initialLoadHintTimerId = null;
  }
}

async function loadPage(reset) {
  /** 首屏 reset 需打断仍在飞的旧请求；仅分页 append 在 busy 时排队跳过 */
  if (!reset && isBusy.value) return;
  if (!reset && hasMore.value !== true) return;
  const sessionAtStart = previewListSession;
  let opIdForAppend = -1;
  /** 本次调用是否走了分页分支（用于 finally 只清理本会话的分页态） */
  let appendOpStarted = false;
  if (reset) {
    clearAllAppendHintTimers();
    clearInitialLoadHintTimer();
    appendTimeoutHint.value = false;
    appendFetchOpId += 1;
    appendFetchPending.value = false;
    appendLoadHintShown.value = false;
    initialFetchPending.value = true;
    initialLoading.value = true;
    initialLoadHintTimerId = setTimeout(function () {
      initialLoadHintTimerId = null;
      if (previewListSession !== sessionAtStart) return;
      initialLoading.value = false;
    }, INITIAL_LOADING_HINT_MAX_MS);
  } else {
    appendOpStarted = true;
    appendFetchOpId += 1;
    opIdForAppend = appendFetchOpId;
    appendTimeoutHint.value = false;
    appendFetchPending.value = true;
    onAppendFetchStart(sessionAtStart, opIdForAppend);
  }
  previewError.value = false;
  try {
    const currentPage = reset ? 0 : page.value;
    const result = await fetchWallpaperPreviewPage(props.providerId, currentPage, PAGE_SIZE);
    if (!props.open || previewListSession !== sessionAtStart) return;
    if (!reset && appendFetchOpId !== opIdForAppend) return;
    const nextItems = Array.isArray(result && result.items) ? result.items : [];
    const tagged = tagListItems(nextItems);
    if (previewListSession !== sessionAtStart) return;
    if (!reset && appendFetchOpId !== opIdForAppend) return;
    if (reset) {
      items.value = tagged;
    } else {
      const keySet = new Set(items.value.map(itemVisualKey));
      const uniqueAppend = filterTaggedNotInKeySet(tagged, keySet);
      if (uniqueAppend.length) {
        items.value = items.value.concat(uniqueAppend);
      }
    }
    hasMore.value = result && result.hasMore === true;
    page.value = currentPage + 1;
  } catch (_e) {
    if ((reset && previewListSession === sessionAtStart) || (!reset && appendFetchOpId === opIdForAppend)) {
      previewError.value = true;
    }
  } finally {
    if (reset && previewListSession === sessionAtStart) {
      clearInitialLoadHintTimer();
      initialFetchPending.value = false;
      initialLoading.value = false;
    } else if (appendOpStarted) {
      clearAppendHintMaxVisibleTimer();
      if (appendFetchOpId === opIdForAppend) {
        appendFetchPending.value = false;
        appendTimeoutHint.value = false;
      }
    }
  }
  if (!reset && appendOpStarted) {
    nextTick(function () {
      if (!appendFetchPending.value) {
        scheduleAppendLoadHintHideDebounced();
      }
    });
  }
}

function isGalleryNearBottom(el) {
  if (!el) return false;
  return el.scrollTop + el.clientHeight >= el.scrollHeight - NEAR_BOTTOM_PX;
}

/** 仅在触底且由滚轮向下或滚动条向下拖动引起时加载下一页（受 isBusy / hasMore 约束） */
function tryAppendNextPageIfNearBottomFromUserScroll() {
  const el = galleryRef.value;
  if (!props.open || !el || isBusy.value || hasMore.value !== true) return;
  if (isGalleryNearBottom(el)) {
    loadPage(false);
  }
}

function syncGalleryScrollBaseline() {
  const el = galleryRef.value;
  galleryLastScrollTop = el ? el.scrollTop : 0;
}

function isEventInVerticalScrollbarZone(ev) {
  const el = galleryRef.value;
  if (!el || !ev) return false;
  const r = el.getBoundingClientRect();
  return ev.clientX >= r.right - SCROLLBAR_HIT_PX;
}

function onGalleryPointerDown(ev) {
  if (!props.open || !galleryRef.value) return;
  if (isEventInVerticalScrollbarZone(ev)) {
    galleryScrollbarPointerActive = true;
  }
}

function onGalleryPointerUp() {
  galleryScrollbarPointerActive = false;
}

function onGalleryPointerLeave(ev) {
  if (!ev.buttons) {
    galleryScrollbarPointerActive = false;
  }
}

let wheelRafId = null;
function onGalleryWheel(ev) {
  if (!ev || ev.deltaY <= 0) return;
  if (wheelRafId !== null) cancelAnimationFrame(wheelRafId);
  wheelRafId = requestAnimationFrame(function () {
    wheelRafId = null;
    tryAppendNextPageIfNearBottomFromUserScroll();
  });
}

function onGalleryScroll() {
  const el = galleryRef.value;
  if (!el) return;
  const prev = galleryLastScrollTop;
  const top = el.scrollTop;
  const scrolledDown = top > prev + 0.5;
  galleryLastScrollTop = top;
  if (!scrolledDown) return;
  if (!galleryScrollbarPointerActive) return;
  tryAppendNextPageIfNearBottomFromUserScroll();
}

/**
 * 首屏或追加后若总高度仍不超过可视高度，无法触发滚动触底；此时自动连续拉取直到出现滚动条或已无更多。
 */
async function ensureGalleryScrollableOrExhausted() {
  ensureGalleryDepth += 1;
  try {
    for (let i = 0; i < 12; i++) {
      await nextTick();
      const el = galleryRef.value;
      if (!props.open || !el || isBusy.value) return;
      if (hasMore.value !== true) return;
      if (el.scrollHeight > el.clientHeight + 6) return;
      await loadPage(false);
    }
  } finally {
    ensureGalleryDepth -= 1;
    if (ensureGalleryDepth === 0) {
      nextTick(syncGalleryScrollBaseline);
    }
  }
}

async function onItemDoubleClick(item) {
  if (!item || !item.fullUrl || applyBusy.value || isBusy.value) return;
  applyBusy.value = true;
  previewError.value = false;
  try {
    const dataUrl = await fetchWallpaperDataUrlFromUrl(item.fullUrl);
    emit('apply-image', {
      providerId: props.providerId,
      dataUrl
    });
  } catch (_e) {
    previewError.value = true;
  } finally {
    applyBusy.value = false;
  }
}

watch(
    () => [props.open, props.providerId],
    ([open]) => {
      previewListSession += 1;
      if (!open) {
        clearAllAppendHintTimers();
        clearInitialLoadHintTimer();
        items.value = [];
        initialFetchPending.value = false;
        initialLoading.value = false;
        appendFetchPending.value = false;
        appendLoadHintShown.value = false;
        appendTimeoutHint.value = false;
        previewError.value = false;
        applyBusy.value = false;
        appendFetchOpId += 1;
        galleryScrollbarPointerActive = false;
        galleryLastScrollTop = 0;
        return;
      }
      items.value = [];
      hasMore.value = true;
      page.value = 0;
      previewError.value = false;
      appendTimeoutHint.value = false;
      galleryScrollbarPointerActive = false;
      galleryLastScrollTop = 0;
      loadPage(true).then(function () {
        nextTick(function () {
          syncGalleryScrollBaseline();
          void ensureGalleryScrollableOrExhausted();
        });
      });
    },
    {immediate: true}
);

</script>

<style scoped>
.settings-wallpaper-preview-mask {
  position: fixed;
  inset: 0;
  z-index: 1100;
  background: rgba(15, 23, 42, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  box-sizing: border-box;
  overflow-y: auto;
}

.settings-wallpaper-preview-dialog {
  position: relative;
  width: 640px;
  max-width: calc(100vw - 32px);
  height: 480px;
  max-height: calc(100vh - 48px);
  background: #f3f4f6;
  display: flex;
  flex-direction: column;
  border-radius: 0;
  overflow: hidden;
  box-shadow: 0 24px 64px rgba(15, 23, 42, 0.35);
  box-sizing: border-box;
}

.settings-wallpaper-preview-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 14px 14px 12px 16px;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
  border-radius: 0;
}

.settings-wallpaper-preview-title {
  font-size: 15px;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
  min-width: 0;
}

.settings-drawer-close-btn {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 0;
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

.settings-wallpaper-preview-loadmore {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  color: #6b7280;
  font-size: 13px;
}

.settings-wallpaper-preview-gallery-cover {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6ee;
  z-index: 2;
}

.settings-wallpaper-preview-loader {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 24px;
  color: #374151;
}

.settings-wallpaper-preview-loader--on-dark {
  color: #e5e7eb;
}

.settings-wallpaper-preview-loader-text {
  font-size: 13px;
}

.settings-wallpaper-preview-gallery {
  flex: 1;
  min-height: 0;
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: 10px;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 12px;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  scrollbar-color: #dddddd transparent;
}

/* 纵向滚动条约为常见 8px 的 1/4；滑块颜色 #DDDDDD */
.settings-wallpaper-preview-gallery::-webkit-scrollbar {
  width: 2px;
}

.settings-wallpaper-preview-gallery::-webkit-scrollbar-track {
  background: transparent;
}

.settings-wallpaper-preview-gallery::-webkit-scrollbar-thumb {
  background: #dddddd;
  border-radius: 1px;
}

.settings-wallpaper-preview-gallery > .settings-wallpaper-preview-tile-group,
.settings-wallpaper-preview-gallery > .settings-wallpaper-preview-loadmore,
.settings-wallpaper-preview-gallery > .settings-wallpaper-preview-status {
  flex: 0 0 100%;
  width: 100%;
  box-sizing: border-box;
}

.settings-wallpaper-preview-tile-group {
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: 10px;
}

.wptile-enter-active {
  transition: opacity 100ms ease-out;
}

.wptile-enter-from {
  opacity: 0;
}

.wptile-enter-to {
  opacity: 1;
}

.settings-wallpaper-preview-tile {
  flex: 0 0 calc((100% - 20px) / 3);
  max-width: calc((100% - 20px) / 3);
  box-sizing: border-box;
  border-radius: 0;
  overflow: hidden;
  background: #e5e7eb;
}

.settings-wallpaper-preview-image {
  width: 100%;
  height: auto;
  display: block;
  vertical-align: middle;
}

.settings-wallpaper-preview-image--busy {
  opacity: 0.55;
  pointer-events: none;
}

.settings-wallpaper-preview-status {
  padding: 16px;
  text-align: center;
  font-size: 13px;
}

.settings-wallpaper-preview-status-error {
  color: #b91c1c;
}

.settings-wallpaper-preview-status-timeout {
  color: #b45309;
}

.settings-wallpaper-preview-foot {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding: 10px 14px 12px 16px;
  background: #fff;
  border-top: 1px solid #e5e7eb;
}

.settings-wallpaper-preview-foot-label {
  font-size: 13px;
  color: #374151;
  line-height: 1.35;
  user-select: none;
}

.settings-wallpaper-preview-apply-overlay {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5;
}

/* 旋转小风车（conic-gradient 圆盘） */
.settings-wallpaper-pinwheel {
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  border-radius: 50%;
  display: inline-block;
  box-sizing: border-box;
  background: conic-gradient(
    from 0deg at 50% 50%,
    #4f9dff 0deg 55deg,
    #93c5fd 55deg 115deg,
    #4f9dff 115deg 175deg,
    #93c5fd 175deg 235deg,
    #4f9dff 235deg 295deg,
    #93c5fd 295deg 360deg
  );
  animation: settings-wallpaper-pinwheel-spin 0.72s linear infinite;
}

.settings-wallpaper-pinwheel--sm {
  width: 18px;
  height: 18px;
}

.settings-wallpaper-pinwheel--light {
  background: conic-gradient(
    from 0deg at 50% 50%,
    #f1f5f9 0deg 55deg,
    #e2e8f0 55deg 115deg,
    #f1f5f9 115deg 175deg,
    #e2e8f0 175deg 235deg,
    #f1f5f9 235deg 295deg,
    #e2e8f0 295deg 360deg
  );
}

@keyframes settings-wallpaper-pinwheel-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
