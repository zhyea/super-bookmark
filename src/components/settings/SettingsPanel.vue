<template>
    <div class="settings-vue-root">
        <button
            type="button"
            class="settings-toggle"
            :aria-label="t('settingsAria')"
            @click.stop="panelOpen = !panelOpen"
        >
            <span class="settings-toggle-breadcrumb" aria-hidden="true"></span>
        </button>
        <aside
            class="settings-panel"
            :class="{ 'settings-panel-open': panelOpen }"
            @click.stop
            aria-labelledby="settings-panel-heading"
        >
            <div id="settings-panel-heading" class="settings-panel-title">{{ t('settingsTitle') }}</div>
            <div class="settings-panel-title-accent" aria-hidden="true"></div>
            <div class="settings-mode-group" role="group" aria-label="页面模式">
                <button
                    type="button"
                    class="settings-mode-btn"
                    :class="{ 'settings-mode-btn--active': uiMode === 'simple' }"
                    @click.stop="setUiMode('simple')"
                >
                    极简模式
                </button>
                <button
                    type="button"
                    class="settings-mode-btn"
                    :class="{ 'settings-mode-btn--active': uiMode === 'default' }"
                    @click.stop="setUiMode('default')"
                >
                    默认模式
                </button>
                <button
                    type="button"
                    class="settings-mode-btn"
                    :class="{ 'settings-mode-btn--active': uiMode === 'edit' }"
                    @click.stop="setUiMode('edit')"
                >
                    编辑模式
                </button>
            </div>
            <div ref="panelContentRef" class="settings-panel-content" @scroll.passive="onPanelScroll">
                <div class="settings-section">
                    <div class="settings-section-title">{{ t('settingsGroupGeneral') }}</div>
                    <div class="settings-row settings-row-inline">
                        <span class="settings-label">{{ t('settingsLang') }}</span>
                        <div class="settings-btns">
                            <select
                                id="settingsLocale"
                                v-model="localeModel"
                                class="settings-locale-select"
                                :aria-label="t('settingsLang')"
                                @change="onLocaleChange"
                                @click.stop
                            >
                                <option v-for="code in localeCodes" :key="code" :value="code">
                                    {{ t(LANG_KEYS[code] || 'langEn') }}
                                </option>
                            </select>
                        </div>
                    </div>
                    <div v-if="uiMode !== 'simple'" class="settings-row settings-row-inline">
                        <span class="settings-label">{{ t('settingsNightTheme') }}</span>
                        <div class="settings-btns settings-switch-row">
                            <label class="settings-switch" :title="t('settingsNightTheme')">
                                <input
                                    id="settingsNightThemeSwitch"
                                    v-model="themeDark"
                                    type="checkbox"
                                    @change="onThemeToggle"
                                />
                                <span class="settings-switch-slider"></span>
                            </label>
                        </div>
                    </div>
                    <div class="settings-row settings-row-inline">
                        <span class="settings-label">{{ t('settingsNewTab') }}</span>
                        <div class="settings-btns settings-switch-row">
                            <label class="settings-switch" :title="t('settingsNewTab')">
                                <input id="settingsReplaceNewTabSwitch" v-model="replaceNewTab" type="checkbox" @change="applySettings" />
                                <span class="settings-switch-slider"></span>
                            </label>
                        </div>
                    </div>
                    <div v-if="uiMode !== 'simple'" class="settings-row settings-row-inline">
                        <span class="settings-label">{{ t('settingsShowOverviewAllNav') }}</span>
                        <div class="settings-btns settings-switch-row">
                            <label class="settings-switch" :title="t('settingsShowOverviewAllNav')">
                                <input
                                    id="settingsShowOverviewAllNavSwitch"
                                    v-model="showOverviewNav"
                                    type="checkbox"
                                    @change="onShowOverviewNavChange"
                                />
                                <span class="settings-switch-slider"></span>
                            </label>
                        </div>
                    </div>
                </div>

                <div class="settings-section">
                    <div class="settings-section-title">{{ t('settingsGroupView') }}</div>
                    <div v-if="uiMode !== 'simple'" class="settings-row">
                        <span class="settings-label">{{ t('settingsColumns') }}</span>
                        <div class="settings-btns">
                            <button
                                v-for="n in [3, 4, 5]"
                                :key="n"
                                type="button"
                                class="settings-btn"
                                :class="{ active: columns === n, disabled: columnDisabled(n) }"
                                :disabled="columnDisabled(n)"
                                :title="columnDisabled(n) ? t('settingsColumnDisabled') : ''"
                                @click="setColumn(n)"
                            >
                                {{ n }}
                            </button>
                        </div>
                    </div>
                    <div v-if="uiMode !== 'simple'" class="settings-row settings-row-range">
                        <div class="settings-range-label">{{ t('settingsWidth') }}：{{ contentWidthPercent }}%</div>
                        <input
                            v-model.number="contentWidthPercent"
                            type="range"
                            class="settings-range-input"
                            :min="CONTENT_WIDTH_PERCENT_MIN"
                            :max="CONTENT_WIDTH_PERCENT_MAX"
                            step="1"
                            :aria-valuemin="CONTENT_WIDTH_PERCENT_MIN"
                            :aria-valuemax="CONTENT_WIDTH_PERCENT_MAX"
                            :aria-valuenow="contentWidthPercent"
                            :aria-label="t('settingsWidth')"
                            @input="onContentWidthPercentInput"
                        />
                    </div>
                    <div class="settings-row">
                        <span class="settings-label">{{ t('settingsBg') }}</span>
                        <div class="settings-btns settings-bg-row">
                            <button
                                v-for="(c, idx) in BACKGROUND_COLORS"
                                :key="c.value"
                                type="button"
                                class="settings-btn settings-bg-swatch"
                                :class="{
                                    active: !useCustomBg && normalizeHex(pickerValue) === normalizeHex(c.value),
                                    'settings-bg-dark': c.value === '#2d2d2d'
                                }"
                                :data-setting="'backgroundColor'"
                                :data-value="c.value"
                                :style="{ backgroundColor: c.value }"
                                :title="t(BGK[idx] || 'bgpBlue')"
                                @click="pickPreset(c.value)"
                            ></button>
                            <button
                                type="button"
                                class="settings-btn settings-bg-swatch settings-bg-custom"
                                :class="{ active: useCustomBg }"
                                data-setting="backgroundColor"
                                data-value="custom"
                                :title="t('bgPickTitle')"
                                :aria-label="t('bgPickAria')"
                                @click="openCustomPicker"
                            ></button>
                            <input
                                id="settingsBgColorPicker"
                                ref="colorPickerRef"
                                v-model="pickerValue"
                                type="color"
                                class="settings-color-picker"
                                :aria-label="t('bgPickAria')"
                                @input="onPickerInput"
                                @change="onPickerChange"
                            />
                        </div>
                    </div>
                    <div class="settings-row">
                        <span class="settings-label">{{ t('settingsBgImg') }}</span>
                        <div class="settings-btns settings-bg-image-row">
                            <input
                                id="settingsBackgroundImage"
                                ref="bgFileRef"
                                type="file"
                                accept="image/*"
                                class="settings-file-input"
                                style="display: none"
                                @change="onBgFile"
                            />
                            <button type="button" class="settings-btn" id="settingsUploadBgBtn" @click="openBgFilePicker">
                                {{ t('chooseImg') }}
                            </button>
                            <button
                                type="button"
                                class="settings-btn"
                                :class="{ disabled: !hasBgImageEffective }"
                                :disabled="!hasBgImageEffective"
                                id="settingsClearBgBtn"
                                @click="clearBgImage"
                            >
                                {{ t('clear') }}
                            </button>
                        </div>
                    </div>
                    <div v-if="uiMode !== 'simple'" class="settings-row settings-row-range">
                        <div class="settings-range-label">{{ t('settingsBgTransparency') }}：{{ backgroundTransparencyLocal }}%</div>
                        <input
                            v-model.number="backgroundTransparencyLocal"
                            type="range"
                            class="settings-range-input"
                            min="0"
                            max="100"
                            step="1"
                            aria-valuemin="0"
                            aria-valuemax="100"
                            :aria-valuenow="backgroundTransparencyLocal"
                            :aria-label="t('settingsBgTransparency')"
                            @input="onBackgroundTransparencyInput"
                        />
                    </div>
                    <div v-if="uiMode !== 'simple'" class="settings-row settings-row-range">
                        <div class="settings-range-label">{{ t('settingsContentTransparency') }}：{{ contentChromeTransparencyLocal }}%</div>
                        <input
                            v-model.number="contentChromeTransparencyLocal"
                            type="range"
                            class="settings-range-input"
                            min="0"
                            max="100"
                            step="1"
                            aria-valuemin="0"
                            aria-valuemax="100"
                            :aria-valuenow="contentChromeTransparencyLocal"
                            :aria-label="t('settingsContentTransparency')"
                            @input="onContentChromeTransparencyInput"
                        />
                    </div>
                    <div v-if="uiMode === 'simple'" class="settings-row settings-row-inline settings-simple-text-color-row">
                        <span class="settings-label">{{ t('settingsSimpleBookmarkCardTextColor') }}</span>
                        <div class="settings-btns settings-bg-row settings-simple-text-color-btns">
                            <button
                                type="button"
                                class="settings-btn settings-bg-swatch settings-bg-custom"
                                data-setting="simpleBookmarkCardTextColor"
                                data-value="custom"
                                :title="t('settingsSimpleBookmarkCardTextColorPick')"
                                :aria-label="t('settingsSimpleBookmarkCardTextColorPick')"
                                @click="openSimpleBookmarkTextColorPicker"
                            ></button>
                            <input
                                id="settingsSimpleBookmarkCardTextColor"
                                ref="simpleBookmarkTextColorPickerRef"
                                v-model="simpleBookmarkCardTextColorLocal"
                                type="color"
                                class="settings-color-picker"
                                :aria-label="t('settingsSimpleBookmarkCardTextColorPick')"
                                @input="onSimpleBookmarkCardTextColorPick"
                            />
                        </div>
                    </div>
                </div>

                <div v-if="uiMode === 'simple'" class="settings-section">
                    <div class="settings-section-title">搜索框</div>
                    <div class="settings-row settings-row-range">
                        <div class="settings-range-label">搜索框大小：{{ simpleSearchScaleLocal }}%</div>
                        <input
                            v-model.number="simpleSearchScaleLocal"
                            type="range"
                            min="80"
                            max="140"
                            step="1"
                            class="settings-range-input"
                            @input="onSimpleSearchScaleInput"
                        />
                    </div>
                    <div class="settings-row settings-row-range">
                        <div class="settings-range-label">搜索框不透明度：{{ simpleSearchOpacityLocal }}%</div>
                        <input
                            v-model.number="simpleSearchOpacityLocal"
                            type="range"
                            min="10"
                            max="100"
                            step="1"
                            class="settings-range-input"
                            @input="persistSimpleSearchAppearancePanel"
                        />
                    </div>
                    <div class="settings-row settings-row-range">
                        <div class="settings-range-label">背景遮罩透明度：{{ simpleOverlayOpacityLocal }}%</div>
                        <input
                            v-model.number="simpleOverlayOpacityLocal"
                            type="range"
                            min="0"
                            max="100"
                            step="1"
                            class="settings-range-input"
                            @input="persistSimpleSearchAppearancePanel"
                        />
                    </div>
                    <div class="settings-row settings-row-range">
                        <div class="settings-range-label">背景遮罩模糊：{{ simpleOverlayBlurLocal }}px</div>
                        <input
                            v-model.number="simpleOverlayBlurLocal"
                            type="range"
                            min="0"
                            max="32"
                            step="1"
                            class="settings-range-input"
                            @input="persistSimpleSearchAppearancePanel"
                        />
                    </div>
                    <div class="settings-row settings-row-range">
                        <div class="settings-range-label">搜索框圆角：{{ simpleSearchRadiusLocal }}px</div>
                        <input
                            v-model.number="simpleSearchRadiusLocal"
                            type="range"
                            min="0"
                            max="40"
                            step="1"
                            class="settings-range-input"
                            @input="persistSimpleSearchAppearancePanel"
                        />
                    </div>
                </div>

                <div class="settings-section">
                    <div class="settings-section-title">{{ t('settingsGroupManage') }}</div>
                    <div class="settings-row">
                        <span class="settings-label">{{ t('settingsVisibleRoots') }}</span>
                        <div class="settings-btns settings-root-btns">
                            <button
                                v-for="b in rootButtons"
                                :key="b.key"
                                type="button"
                                class="settings-btn settings-root-toggle"
                                :class="{ active: b.active }"
                                :data-root-key="b.key"
                                :aria-pressed="b.active ? 'true' : 'false'"
                                @click.stop="toggleRoot(b.key)"
                            >
                                {{ b.label }}
                            </button>
                        </div>
                    </div>
                    <div class="settings-row">
                        <span class="settings-label">{{ t('settingsFolderManage') }}</span>
                        <div class="settings-btns">
                            <button type="button" class="settings-btn" id="settingsOpenBookmarkManager" @click.stop="openBookmarkManager">
                                {{ t('openBookmarkManager') }}
                            </button>
                        </div>
                    </div>
                </div>

                <div class="settings-section">
                    <div class="settings-section-title">{{ t('settingsGroupBackup') }}</div>
                    <div class="settings-row">
                        <span class="settings-label">{{ t('settingsBackupActions') }}</span>
                        <div class="settings-btns settings-backup-btns">
                            <button type="button" class="settings-btn" id="settingsBackupRestoreDefault" @click.stop="backupRestoreDefault">
                                {{ t('backupRestoreDefault') }}
                            </button>
                            <button type="button" class="settings-btn" id="settingsBackupExport" @click.stop="backupExport">
                                {{ t('backupExport') }}
                            </button>
                            <button type="button" class="settings-btn" id="settingsBackupImport" @click.stop="backupImportClick">
                                {{ t('backupImport') }}
                            </button>
                            <input
                                id="settingsBackupFile"
                                ref="backupFileRef"
                                type="file"
                                accept=".zhx,application/json"
                                style="display: none"
                                aria-hidden="true"
                                @change="backupImportFile"
                            />
                        </div>
                    </div>
                </div>

                <div class="settings-section settings-section-about">
                    <div class="settings-section-title">{{ t('settingsGroupAbout') }}</div>
                    <div class="settings-row settings-row-help">
                        <a href="#" class="settings-help-link" id="settingsOpenGuide" @click.prevent.stop="openGuide">{{ t('helpLink') }}</a>
                    </div>
                </div>
            </div>
        </aside>
    </div>
</template>

<script setup>
import { ref, computed, inject, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import {
    CONTENT_WIDTH_PERCENT_MIN,
    CONTENT_WIDTH_PERCENT_MAX,
    BACKGROUND_COLORS,
    maxColumnsForContentWidthPercent,
    clampContentWidthPercent,
    LANG_KEYS,
    DEFAULT_BGK
} from '../../services/settingsConstants.js';
import { normalizeHex, normalizeBookmarkCardTextColor, presetMatchesColor } from '../../services/settingsUtils.js';
import { appRuntime } from '../../services/appRuntime.js';
import { effectiveGridColumnCount, GRID_CARD_MIN_PX } from '../../utils/bookmarkRenderHelpers.js';

/** 兼容层 i18n（与 legacyI18n 挂载一致） */
function legacyI18n() {
    return typeof window !== 'undefined' ? window.BookmarkManagerI18n : null;
}

/** 设置模块（main 已挂 window，此处集中访问避免散落） */
function settingsModule() {
    return typeof window !== 'undefined' ? window.BookmarkManagerSettings : null;
}

function persistSettings(partial) {
    settingsModule()?.saveSettings(partial);
}

function applyLayout() {
    settingsModule()?.applyContentWidthAndBackground();
}

/** 合并到下一帧再应用布局，避免 range 连续 input 时同步重排打断拖动；取消未执行的帧并只跑最后一次 */
let layoutEffectsRafId = null;
function scheduleLayoutEffects() {
    if (layoutEffectsRafId !== null) {
        cancelAnimationFrame(layoutEffectsRafId);
    }
    layoutEffectsRafId = requestAnimationFrame(() => {
        layoutEffectsRafId = null;
        applyLayout();
        applyLinksGridTemplate();
    });
}

function bookmarkManager() {
    return typeof window !== 'undefined' ? window.BookmarkManager : null;
}

const props = defineProps({
    linksGrid: { type: [Object, HTMLElement], default: null }
});

const { t } = useI18n();

const BGK = computed(() => {
    const L = legacyI18n();
    return (L && L.BG_PRESET_KEYS) || DEFAULT_BGK;
});

const localeCodes = computed(() => {
    const L = legacyI18n();
    return (L && L.CODES) || ['zh', 'en'];
});

const simpleUiInjected = inject('simpleUi', null);

const panelOpen = ref(false);
const panelContentRef = ref(null);
const colorPickerRef = ref(null);
const simpleBookmarkTextColorPickerRef = ref(null);
const bgFileRef = ref(null);
const backupFileRef = ref(null);

let scrollHideTimer = null;
function onPanelScroll() {
    const el = panelContentRef.value;
    if (!el) return;
    el.classList.add('settings-scrollbar--visible');
    if (scrollHideTimer) clearTimeout(scrollHideTimer);
    scrollHideTimer = setTimeout(() => {
        scrollHideTimer = null;
        if (el) el.classList.remove('settings-scrollbar--visible');
    }, 1200);
}

const s = () => appRuntime.settings || {};
const localeModel = ref('zh');
const themeDark = ref(false);
const editModeOn = ref(false);
const simpleModeOn = ref(false);
const simpleSearchScaleLocal = ref(100);
const simpleSearchOpacityLocal = ref(100);
const simpleOverlayOpacityLocal = ref(0);
const simpleOverlayBlurLocal = ref(0);
const simpleSearchRadiusLocal = ref(32);
const simpleBookmarkCardTextColorLocal = ref('#1f2937');

/** 极简搜索条：rAF 合并 simple-search-ui-updated；storage 短防抖；appRuntime 在各自 input 内立即写入 */
let simpleSearchUiRafId = null;
let simpleScaleStorageTimer = null;
let simpleAppearStorageTimer = null;

function scheduleSimpleSearchUiRefresh() {
    if (simpleSearchUiRafId !== null) cancelAnimationFrame(simpleSearchUiRafId);
    simpleSearchUiRafId = requestAnimationFrame(() => {
        simpleSearchUiRafId = null;
        window.dispatchEvent(new CustomEvent('simple-search-ui-updated'));
    });
}

function flushDebouncedSimplePersist() {
    if (simpleScaleStorageTimer !== null) {
        clearTimeout(simpleScaleStorageTimer);
        simpleScaleStorageTimer = null;
        const sv = Math.max(80, Math.min(140, Math.round(Number(simpleSearchScaleLocal.value) || 100)));
        persistSettings({ simpleSearchScale: sv });
    }
    if (simpleAppearStorageTimer !== null) {
        clearTimeout(simpleAppearStorageTimer);
        simpleAppearStorageTimer = null;
        const searchOp = Math.max(10, Math.min(100, Math.round(Number(simpleSearchOpacityLocal.value) || 100)));
        const o = Math.max(0, Math.min(100, Math.round(Number(simpleOverlayOpacityLocal.value) || 0)));
        const b = Math.max(0, Math.min(32, Math.round(Number(simpleOverlayBlurLocal.value) || 0)));
        const raw = Number(simpleSearchRadiusLocal.value);
        const r = Math.max(0, Math.min(40, Number.isFinite(raw) ? Math.round(raw) : 32));
        persistSettings({
            simpleSearchOpacity: searchOp,
            simpleOverlayOpacity: o,
            simpleOverlayBlurPx: b,
            simpleSearchBorderRadiusPx: r
        });
    }
}

const replaceNewTab = ref(false);
const showOverviewNav = ref(false);
const backgroundTransparencyLocal = ref(0);
const contentChromeTransparencyLocal = ref(0);
const contentWidthPercent = ref(100);
const viewportW = ref(typeof window !== 'undefined' ? window.innerWidth : 1200);
const columns = ref(3);
const pickerValue = ref('#e8f4fc');
const useCustomBg = ref(false);
const rootButtons = ref([]);

const maxCols = computed(() => maxColumnsForContentWidthPercent(contentWidthPercent.value, viewportW.value));

const uiMode = computed(() => {
    if (simpleModeOn.value) return 'simple';
    if (editModeOn.value) return 'edit';
    return 'default';
});

function columnDisabled(n) {
    return n > maxCols.value;
}

const hasBgImageEffective = computed(() => {
    return !!(s().backgroundImage) || s().disableDefaultBg !== true;
});

watch(panelOpen, (open) => {
    if (!open) flushDebouncedSimplePersist();
});

function syncSimpleSearchFieldsFromRuntime() {
    const w = s();
    simpleSearchScaleLocal.value =
        Number.isFinite(Number(w.simpleSearchScale)) && Number(w.simpleSearchScale) >= 80 && Number(w.simpleSearchScale) <= 140
            ? Number(w.simpleSearchScale)
            : 100;
    {
        const rawOp = Number(w.simpleSearchOpacity);
        if (Number.isFinite(rawOp) && rawOp >= 0 && rawOp <= 100) {
            simpleSearchOpacityLocal.value = Math.max(10, Math.min(100, Math.round(rawOp)));
        } else {
            simpleSearchOpacityLocal.value = 100;
        }
    }
    simpleOverlayOpacityLocal.value =
        Number.isFinite(Number(w.simpleOverlayOpacity)) && Number(w.simpleOverlayOpacity) >= 0 && Number(w.simpleOverlayOpacity) <= 100
            ? Math.round(Number(w.simpleOverlayOpacity))
            : 0;
    simpleOverlayBlurLocal.value =
        Number.isFinite(Number(w.simpleOverlayBlurPx)) && Number(w.simpleOverlayBlurPx) >= 0 && Number(w.simpleOverlayBlurPx) <= 32
            ? Math.round(Number(w.simpleOverlayBlurPx))
            : 0;
    simpleSearchRadiusLocal.value =
        Number.isFinite(Number(w.simpleSearchBorderRadiusPx)) &&
        Number(w.simpleSearchBorderRadiusPx) >= 0 &&
        Number(w.simpleSearchBorderRadiusPx) <= 40
            ? Math.round(Number(w.simpleSearchBorderRadiusPx))
            : 32;
    simpleBookmarkCardTextColorLocal.value = normalizeBookmarkCardTextColor(w.simpleBookmarkCardTextColor);
    if (simpleUiInjected) {
        simpleUiInjected.overlayOpacity = simpleOverlayOpacityLocal.value;
        simpleUiInjected.overlayBlurPx = simpleOverlayBlurLocal.value;
        simpleUiInjected.searchBorderRadiusPx = simpleSearchRadiusLocal.value;
        simpleUiInjected.searchOpacity = simpleSearchOpacityLocal.value;
        simpleUiInjected.bookmarkCardTextColor = simpleBookmarkCardTextColorLocal.value;
    }
}

function syncFromAppRuntime() {
    const w = s();
    const L = legacyI18n();
    localeModel.value = L && L.normalizeLocale ? L.normalizeLocale(w.locale || 'zh') : 'zh';
    themeDark.value = w.theme === 'dark';
    editModeOn.value = !!w.showActions;
    simpleModeOn.value = !!w.useSimplePage;
    replaceNewTab.value = !!w.replaceDefaultNewTab;
    showOverviewNav.value = !!w.showOverviewAllNav;
    contentWidthPercent.value = clampContentWidthPercent(w.contentWidthPercent ?? 100);
    let c = [3, 4, 5].includes(parseInt(w.columns, 10)) ? parseInt(w.columns, 10) : 3;
    const mc = maxColumnsForContentWidthPercent(contentWidthPercent.value, viewportW.value);
    if (c > mc) c = mc;
    columns.value = c;
    const nh = normalizeHex(w.backgroundColor);
    pickerValue.value = nh;
    useCustomBg.value = !presetMatchesColor(nh);
    {
        const tr = Number(w.backgroundTransparency);
        if (Number.isFinite(tr) && tr >= 0 && tr <= 100) {
            backgroundTransparencyLocal.value = Math.round(tr);
        } else {
            const op = Number(w.backgroundOpacity);
            backgroundTransparencyLocal.value =
                Number.isFinite(op) && op >= 0 && op <= 100 ? Math.round(100 - op) : 0;
        }
    }
    {
        const ct = Number(w.contentChromeTransparency);
        contentChromeTransparencyLocal.value =
            Number.isFinite(ct) && ct >= 0 && ct <= 100 ? Math.round(ct) : 0;
    }
    syncSimpleSearchFieldsFromRuntime();
}

function onBackgroundTransparencyInput() {
    const v = Math.max(0, Math.min(100, Math.round(Number(backgroundTransparencyLocal.value) || 0)));
    backgroundTransparencyLocal.value = v;
    persistSettings({ backgroundTransparency: v });
    scheduleLayoutEffects();
}

function onContentChromeTransparencyInput() {
    const v = Math.max(0, Math.min(100, Math.round(Number(contentChromeTransparencyLocal.value) || 0)));
    contentChromeTransparencyLocal.value = v;
    persistSettings({ contentChromeTransparency: v });
    scheduleLayoutEffects();
}

function onSimpleSearchScaleInput() {
    const v = Math.max(80, Math.min(140, Math.round(Number(simpleSearchScaleLocal.value) || 100)));
    simpleSearchScaleLocal.value = v;
    if (!appRuntime.settings) appRuntime.settings = {};
    appRuntime.settings.simpleSearchScale = v;
    scheduleSimpleSearchUiRefresh();
    clearTimeout(simpleScaleStorageTimer);
    simpleScaleStorageTimer = setTimeout(() => {
        simpleScaleStorageTimer = null;
        const sv = Math.max(80, Math.min(140, Math.round(Number(simpleSearchScaleLocal.value) || 100)));
        persistSettings({ simpleSearchScale: sv });
    }, 120);
}

function openSimpleBookmarkTextColorPicker() {
    nextTick(() => simpleBookmarkTextColorPickerRef.value?.click());
}

function onSimpleBookmarkCardTextColorPick() {
    const hex = normalizeBookmarkCardTextColor(simpleBookmarkCardTextColorLocal.value);
    simpleBookmarkCardTextColorLocal.value = hex;
    if (simpleUiInjected) {
        simpleUiInjected.bookmarkCardTextColor = hex;
    }
    persistSettings({ simpleBookmarkCardTextColor: hex });
    window.dispatchEvent(new CustomEvent('simple-search-ui-updated'));
}

function persistSimpleSearchAppearancePanel() {
    const searchOp = Math.max(10, Math.min(100, Math.round(Number(simpleSearchOpacityLocal.value) || 100)));
    const o = Math.max(0, Math.min(100, Math.round(Number(simpleOverlayOpacityLocal.value) || 0)));
    const b = Math.max(0, Math.min(32, Math.round(Number(simpleOverlayBlurLocal.value) || 0)));
    const raw = Number(simpleSearchRadiusLocal.value);
    const r = Math.max(0, Math.min(40, Number.isFinite(raw) ? Math.round(raw) : 32));
    simpleSearchOpacityLocal.value = searchOp;
    simpleOverlayOpacityLocal.value = o;
    simpleOverlayBlurLocal.value = b;
    simpleSearchRadiusLocal.value = r;
    if (simpleUiInjected) {
        simpleUiInjected.searchOpacity = searchOp;
        simpleUiInjected.overlayOpacity = o;
        simpleUiInjected.overlayBlurPx = b;
        simpleUiInjected.searchBorderRadiusPx = r;
    }
    if (!appRuntime.settings) appRuntime.settings = {};
    Object.assign(appRuntime.settings, {
        simpleSearchOpacity: searchOp,
        simpleOverlayOpacity: o,
        simpleOverlayBlurPx: b,
        simpleSearchBorderRadiusPx: r
    });
    scheduleSimpleSearchUiRefresh();
    clearTimeout(simpleAppearStorageTimer);
    simpleAppearStorageTimer = setTimeout(() => {
        simpleAppearStorageTimer = null;
        const so = Math.max(10, Math.min(100, Math.round(Number(simpleSearchOpacityLocal.value) || 100)));
        const o2 = Math.max(0, Math.min(100, Math.round(Number(simpleOverlayOpacityLocal.value) || 0)));
        const b2 = Math.max(0, Math.min(32, Math.round(Number(simpleOverlayBlurLocal.value) || 0)));
        const raw2 = Number(simpleSearchRadiusLocal.value);
        const r2 = Math.max(0, Math.min(40, Number.isFinite(raw2) ? Math.round(raw2) : 32));
        persistSettings({
            simpleSearchOpacity: so,
            simpleOverlayOpacity: o2,
            simpleOverlayBlurPx: b2,
            simpleSearchBorderRadiusPx: r2
        });
    }, 120);
}

function setUiMode(mode) {
    if (mode === 'simple') {
        simpleModeOn.value = true;
        editModeOn.value = false;
        persistSettings({ useSimplePage: true, showActions: false });
    } else if (mode === 'default') {
        simpleModeOn.value = false;
        editModeOn.value = false;
        persistSettings({ useSimplePage: false, showActions: false });
    } else if (mode === 'edit') {
        simpleModeOn.value = false;
        editModeOn.value = true;
        persistSettings({ useSimplePage: false, showActions: true });
    }
    document.body.classList.toggle('hide-card-actions', !editModeOn.value);
    applyLayout();
}

function applyLinksGridTemplate() {
    const lg = props.linksGrid;
    if (lg && lg.parentElement) {
        const w = lg.parentElement.clientWidth;
        const effectiveCols = effectiveGridColumnCount(w, columns.value);
        lg.style.gridTemplateColumns = `repeat(${effectiveCols}, minmax(${GRID_CARD_MIN_PX}px, 1fr))`;
    }
}

function onContentWidthPercentInput() {
    const v = clampContentWidthPercent(contentWidthPercent.value);
    if (v !== contentWidthPercent.value) contentWidthPercent.value = v;
    const mc = maxColumnsForContentWidthPercent(v, viewportW.value);
    let col = columns.value;
    if (col > mc) {
        col = mc;
        columns.value = col;
    }
    persistSettings({ contentWidthPercent: v, columns: col });
    scheduleLayoutEffects();
}

function applySettings() {
    const L = legacyI18n();
    const p = clampContentWidthPercent(contentWidthPercent.value);
    contentWidthPercent.value = p;
    let col = columns.value;
    const mc = maxColumnsForContentWidthPercent(p, viewportW.value);
    if (col > mc) {
        col = mc;
        columns.value = col;
    }
    const bg = normalizeHex(pickerValue.value);
    const loc = L && L.normalizeLocale ? L.normalizeLocale(localeModel.value) : localeModel.value;
    persistSettings({
        showActions: !!editModeOn.value,
        columns: col,
        contentWidthPercent: p,
        backgroundColor: bg,
        backgroundTransparency: Math.max(0, Math.min(100, Math.round(Number(backgroundTransparencyLocal.value) || 0))),
        contentChromeTransparency: Math.max(0, Math.min(100, Math.round(Number(contentChromeTransparencyLocal.value) || 0))),
        backgroundImage: s().backgroundImage || '',
        disableDefaultBg: s().disableDefaultBg === true,
        replaceDefaultNewTab: !!replaceNewTab.value,
        locale: loc
    });
    document.body.classList.toggle('hide-card-actions', !editModeOn.value);
    applyLayout();
    applyLinksGridTemplate();
}

function onThemeToggle() {
    persistSettings({ theme: themeDark.value ? 'dark' : 'light' });
    document.body.classList.toggle('theme-dark', themeDark.value);
    applyLayout();
}

function setColumn(n) {
    if (columnDisabled(n)) return;
    columns.value = n;
    applySettings();
}

function pickPreset(hex) {
    useCustomBg.value = false;
    pickerValue.value = normalizeHex(hex);
    applySettings();
}

function openCustomPicker() {
    useCustomBg.value = true;
    nextTick(() => colorPickerRef.value?.click());
}

function onPickerInput() {
    useCustomBg.value = true;
    persistSettings({ backgroundColor: normalizeHex(pickerValue.value) });
    scheduleLayoutEffects();
}

function onPickerChange() {
    useCustomBg.value = true;
    applySettings();
}

/** 背景图文件大小上限（与 chrome.storage 容量兼顾） */
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
    reader.onload = () => {
        const dataUrl = reader.result;
        persistSettings({ backgroundImage: dataUrl, disableDefaultBg: false });
        applyLayout();
    };
    reader.readAsDataURL(file);
    e.target.value = '';
}

function clearBgImage() {
    persistSettings({ backgroundImage: '', disableDefaultBg: true });
    applyLayout();
}

function loadRootButtons() {
    const BM = bookmarkManager();
    if (typeof chrome === 'undefined' || !chrome.bookmarks || !chrome.bookmarks.getTree || !BM) return;
    chrome.bookmarks.getTree(function (tree) {
        const roots = tree && tree[0] && tree[0].children ? tree[0].children : [];
        const folders = roots.filter(function (n) {
            return !n.url && n.children;
        });
        const vr = BM.normalizeVisibleRoots(s().visibleRoots);
        const seen = { bar: false, other: false, mobile: false };
        const btns = [];
        for (let i = 0; i < folders.length; i++) {
            const node = folders[i];
            const rk = BM.classifyBuiltinRoot(node);
            if (!rk || seen[rk]) continue;
            seen[rk] = true;
            btns.push({
                key: rk,
                label: node.title || '',
                active: vr[rk] !== false
            });
        }
        btns.push({
            key: 'others',
            label: t('settingsRootOthers'),
            active: vr.others !== false
        });
        rootButtons.value = btns;
    });
}

function toggleRoot(key) {
    const BM = bookmarkManager();
    if (!BM) return;
    const base = s().visibleRoots || BM.DEFAULT_VISIBLE_ROOTS;
    const next = {
        bar: !!base.bar,
        other: !!base.other,
        mobile: !!base.mobile,
        others: !!base.others
    };
    if (next[key]) {
        const cnt = (next.bar ? 1 : 0) + (next.other ? 1 : 0) + (next.mobile ? 1 : 0) + (next.others ? 1 : 0);
        if (cnt <= 1) return;
        next[key] = false;
    } else {
        next[key] = true;
    }
    const norm = BM.normalizeVisibleRoots(next);
    persistSettings({ visibleRoots: norm });
    rootButtons.value = rootButtons.value.map((b) => ({
        ...b,
        active: norm[b.key] !== false
    }));
    window.dispatchEvent(new CustomEvent('bookmark-visible-roots-changed'));
}

function openBookmarkManager() {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
        chrome.tabs.create({ url: 'chrome://bookmarks/' });
    }
}

function openGuide() {
    panelOpen.value = false;
    try {
        if (typeof chrome !== 'undefined' && chrome.tabs && chrome.runtime && chrome.runtime.getURL) {
            chrome.tabs.create({ url: chrome.runtime.getURL('guide.html') });
        } else {
            window.open('guide.html', '_blank', 'noopener');
        }
    } catch (err) {
        window.open('guide.html', '_blank', 'noopener');
    }
}

function backupRestoreDefault(ev) {
    const BB = window.BookmarkBackup;
    if (!BB) return;
    if (!confirm(t('backupConfirmRestore'))) return;
    BB.restoreFactoryDefaults(function (err) {
        if (err) {
            alert(t('backupFail') + (err.message || String(err)));
            return;
        }
        alert(t('backupRestoreDone'));
        const Settings = settingsModule();
        const L = legacyI18n();
        if (Settings) {
            // 重新从 storage 读取默认设置，更新应用与抽屉，但不关闭抽屉
            Settings.loadSettings(() => {
                syncFromAppRuntime();
                applyLayout();
                if (L && L.applyMainPageStatic) L.applyMainPageStatic();
                window.dispatchEvent(new CustomEvent('bookmark-visible-roots-changed'));
                window.dispatchEvent(new CustomEvent('bookmark-locale-changed'));
                // 与 saveSettings 一致，让 App 根组件同步 useSimplePage（恢复默认后应回到默认/编辑布局）
                window.dispatchEvent(new CustomEvent('bookmark-settings-saved'));
            });
        }
    });
}

function backupExport(ev) {
    const BB = window.BookmarkBackup;
    if (!BB) return;
    const pwd = prompt(t('backupPwdExport'), '');
    if (pwd === null) return;
    BB.exportBackupToFile(pwd, 'super-bookmark-backup', function (err) {
        if (err) {
            alert(t('backupFail') + (err.message || String(err)));
            return;
        }
        alert(t('backupExportDone'));
    });
}

function backupImportClick() {
    if (backupFileRef.value) {
        backupFileRef.value.value = '';
        backupFileRef.value.click();
    }
}

function backupImportFile(e) {
    const BB = window.BookmarkBackup;
    if (!BB) return;
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (!confirm(t('backupConfirmImport'))) {
        e.target.value = '';
        return;
    }
    const pwd = prompt(t('backupPwdImport'), '');
    if (pwd === null) {
        e.target.value = '';
        return;
    }
    BB.importBackupFromFile(f, pwd, function (err) {
        e.target.value = '';
        if (err) {
            if (err.message === 'DECRYPT_FAIL') alert(t('backupWrongPwd'));
            else alert(t('backupFail') + (err.message || String(err)));
            return;
        }
        alert(t('backupImportDone'));
        location.reload();
    });
}

function onShowOverviewNavChange() {
    persistSettings({ showOverviewAllNav: !!showOverviewNav.value });
    window.dispatchEvent(new CustomEvent('bookmark-overview-nav-changed'));
}

function onLocaleChange() {
    const L = legacyI18n();
    const v = L && L.normalizeLocale ? L.normalizeLocale(localeModel.value) : localeModel.value;
    if (L && L.setLocale) L.setLocale(v);
    persistSettings({ locale: v });
    nextTick(() => {
        if (L && L.applyMainPageStatic) L.applyMainPageStatic();
        window.dispatchEvent(new CustomEvent('bookmark-locale-changed'));
    });
}

/** 仅在按下起点在设置区域外时关抽屉；用 document click 会在 range 拖出面板后松开时误关并打断拖动 */
function onDocPointerDownOutside(event) {
    if (event.button !== 0 && event.button !== undefined) return;
    const el = event.target;
    if (el && typeof el.closest === 'function' && el.closest('.settings-vue-root')) return;
    panelOpen.value = false;
}

function onViewportResize() {
    viewportW.value = window.innerWidth;
}

onMounted(() => {
    syncFromAppRuntime();
    loadRootButtons();
    applyLayout();
    document.addEventListener('pointerdown', onDocPointerDownOutside);
    window.addEventListener('resize', onViewportResize);
});

onUnmounted(() => {
    document.removeEventListener('pointerdown', onDocPointerDownOutside);
    window.removeEventListener('resize', onViewportResize);
    if (scrollHideTimer) clearTimeout(scrollHideTimer);
    if (layoutEffectsRafId !== null) {
        cancelAnimationFrame(layoutEffectsRafId);
        layoutEffectsRafId = null;
    }
    if (simpleSearchUiRafId !== null) {
        cancelAnimationFrame(simpleSearchUiRafId);
        simpleSearchUiRafId = null;
    }
    flushDebouncedSimplePersist();
});

function openBgFilePicker() {
    bgFileRef.value?.click();
}

</script>
