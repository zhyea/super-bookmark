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
                    <div v-if="uiMode !== 'simple'" class="settings-row">
                        <span class="settings-label">{{ t('settingsWidth') }}</span>
                        <div class="settings-btns">
                            <button
                                v-for="v in CONTENT_WIDTH_VALUES"
                                :key="v"
                                type="button"
                                class="settings-btn"
                                :class="{ active: contentWidth === v }"
                                @click="setContentWidth(v)"
                            >
                                {{ v === 'full' ? t('fullWidth') : v + 'px' }}
                            </button>
                        </div>
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
import { ref, computed, inject, onMounted, onUnmounted, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import {
    CONTENT_WIDTH_VALUES,
    BACKGROUND_COLORS,
    maxColumnsForContentWidth,
    LANG_KEYS,
    DEFAULT_BGK
} from '../../services/settingsConstants.js';
import { normalizeHex, presetMatchesColor } from '../../services/settingsUtils.js';
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
const replaceNewTab = ref(false);
const showOverviewNav = ref(false);
const contentWidth = ref('1200');
const columns = ref(3);
const pickerValue = ref('#e8f4fc');
const useCustomBg = ref(false);
const rootButtons = ref([]);

const maxCols = computed(() => maxColumnsForContentWidth(contentWidth.value));

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
    if (simpleUiInjected) {
        simpleUiInjected.overlayOpacity = simpleOverlayOpacityLocal.value;
        simpleUiInjected.overlayBlurPx = simpleOverlayBlurLocal.value;
        simpleUiInjected.searchBorderRadiusPx = simpleSearchRadiusLocal.value;
        simpleUiInjected.searchOpacity = simpleSearchOpacityLocal.value;
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
    contentWidth.value = w.contentWidth || '1200';
    let c = [3, 4, 5].includes(parseInt(w.columns, 10)) ? parseInt(w.columns, 10) : 3;
    const mc = maxColumnsForContentWidth(contentWidth.value);
    if (c > mc) c = mc;
    columns.value = c;
    const nh = normalizeHex(w.backgroundColor);
    pickerValue.value = nh;
    useCustomBg.value = !presetMatchesColor(nh);
    syncSimpleSearchFieldsFromRuntime();
}

function onSimpleSearchScaleInput() {
    const v = Math.max(80, Math.min(140, Math.round(Number(simpleSearchScaleLocal.value) || 100)));
    simpleSearchScaleLocal.value = v;
    persistSettings({ simpleSearchScale: v });
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
    persistSettings({
        simpleSearchOpacity: searchOp,
        simpleOverlayOpacity: o,
        simpleOverlayBlurPx: b,
        simpleSearchBorderRadiusPx: r
    });
    window.dispatchEvent(new CustomEvent('simple-search-ui-updated'));
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

function applySettings() {
    const L = legacyI18n();
    const cw = contentWidth.value;
    let col = columns.value;
    const mc = maxColumnsForContentWidth(cw);
    if (col > mc) {
        col = mc;
        columns.value = col;
    }
    const bg = normalizeHex(pickerValue.value);
    const loc = L && L.normalizeLocale ? L.normalizeLocale(localeModel.value) : localeModel.value;
    persistSettings({
        showActions: !!editModeOn.value,
        columns: col,
        contentWidth: cw,
        backgroundColor: bg,
        backgroundImage: s().backgroundImage || '',
        disableDefaultBg: s().disableDefaultBg === true,
        replaceDefaultNewTab: !!replaceNewTab.value,
        locale: loc
    });
    document.body.classList.toggle('hide-card-actions', !editModeOn.value);
    applyLayout();
    const lg = props.linksGrid;
    if (lg && lg.parentElement) {
        const w = lg.parentElement.clientWidth;
        const effectiveCols = effectiveGridColumnCount(w, col);
        lg.style.gridTemplateColumns = `repeat(${effectiveCols}, minmax(${GRID_CARD_MIN_PX}px, 1fr))`;
    }
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

function setContentWidth(v) {
    contentWidth.value = v;
    const mc = maxColumnsForContentWidth(v);
    if (columns.value > mc) columns.value = mc;
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
    applyLayout();
}

function onPickerChange() {
    useCustomBg.value = true;
    applySettings();
}

function onBgFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
        const dataUrl = reader.result;
        if (dataUrl.length > 900000) {
            alert(t('imgTooBig'));
            return;
        }
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

function onDocClick() {
    panelOpen.value = false;
}

onMounted(() => {
    syncFromAppRuntime();
    loadRootButtons();
    applyLayout();
    document.addEventListener('click', onDocClick);
});

onUnmounted(() => {
    document.removeEventListener('click', onDocClick);
    if (scrollHideTimer) clearTimeout(scrollHideTimer);
});

function openBgFilePicker() {
    bgFileRef.value?.click();
}

</script>
