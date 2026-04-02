<template>
  <div ref="wrapRef" class="simple-search-wrap" :style="wrapScaleStyle">
    <div class="simple-search-input-shell" :style="searchShellStyle">
      <button type="button" class="engine-trigger-btn" :aria-expanded="showQuickPanel" aria-haspopup="true" @click.stop="toggleQuickPanel">
        <span class="engine-icon-wrap">
          <img v-if="currentEngineMeta.type === 'img'" class="engine-icon" :src="currentEngineMeta.src" :alt="currentEngineLabel" />
          <span
            v-else
            class="engine-custom-icon"
            :style="{
              backgroundColor: currentEngineMeta.bg || '#e5e7eb',
              color: currentEngineMeta.textColor || '#fff'
            }"
          >{{ currentEngineMeta.text }}</span>
        </span>
        <span class="engine-caret">▾</span>
      </button>
      <div class="simple-search-input-wrap">
        <input
          v-model.trim="keyword"
          type="text"
          class="simple-search-input"
          @keydown.enter.prevent="submitSearch()"
          @input="onKeywordInput"
          @focus="onSearchInputFocus"
          @blur="onSearchInputBlur"
        />
        <ul
          v-show="
            bookmarkSuggestVisible &&
              bookmarkSuggestions.length &&
              bookmarkResultCards.length === 0
          "
          class="bookmark-suggest-list"
          role="listbox"
          @mousedown.prevent
        >
          <li v-for="b in bookmarkSuggestions" :key="b.id" role="option">
            <button type="button" class="bookmark-suggest-item" @mousedown.prevent="pickBookmarkSuggestion(b)">
              {{ b.title }}
            </button>
          </li>
        </ul>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="bookmarkMode && bookmarkResultCards.length"
        class="bookmark-result-block"
        :style="bookmarkResultPositionStyle"
      >
        <button
          v-for="b in bookmarkResultCards"
          :key="b.id"
          type="button"
          class="bookmark-crystal-card"
          :style="bookmarkCrystalCardTextStyle"
          @click="openBookmarkUrl(b.url)"
        >
          {{ b.title }}
        </button>
      </div>
    </Teleport>

    <div v-show="showQuickPanel" class="quick-panel" :style="quickPanelCombinedStyle">
      <button type="button" class="quick-item" title="书签搜索" @click="selectBookmarkMode">
        <span class="quick-icon-img-wrap">
          <img class="quick-icon-img" :src="bookmarkQuickPanelIconUrl()" alt="" />
        </span>
        <span class="quick-label">书签</span>
      </button>
      <button v-for="key in quickKeys" :key="key" type="button" class="quick-item" @click="selectEngineFromBar(key)">
        <span class="quick-icon-img-wrap">
          <img
            v-if="engineIconMeta(key).type === 'img' && !quickIconFailed[key]"
            class="quick-icon-img"
            :src="engineIconMeta(key).src"
            :alt="labelForKey(key)"
            @error="() => onQuickIconError(key)"
          />
          <span v-else class="quick-icon-fallback" :style="quickFallbackStyle(key)">{{ quickFallbackText(key) }}</span>
        </span>
        <span class="quick-label">{{ labelForKey(key) }}</span>
      </button>
      <button type="button" class="quick-item" @click="openDrawer">
        <span class="quick-icon" aria-hidden="true">＋</span>
        <span class="quick-label">添加</span>
      </button>
    </div>

    <Teleport to="body">
      <div v-if="drawerOpen" class="simple-drawer-backdrop" @click.self="closeDrawer"></div>
      <aside v-if="drawerOpen" class="simple-drawer" aria-label="搜索设置">
        <div class="simple-drawer-head">
          <span class="simple-drawer-title">搜索设置</span>
          <button type="button" class="simple-drawer-close" aria-label="关闭" @click="closeDrawer">×</button>
        </div>
        <div class="simple-drawer-tabs">
          <button type="button" class="simple-tab-btn" :class="{ active: activeTab === 'default' }" @click="activeTab = 'default'">默认</button>
          <button type="button" class="simple-tab-btn" :class="{ active: activeTab === 'custom' }" @click="activeTab = 'custom'">自定义</button>
        </div>
        <div class="simple-drawer-body">
          <template v-if="activeTab === 'default'">
            <div class="simple-drawer-module">
              <div class="simple-drawer-module-title">默认可用搜索引擎</div>
              <div class="simple-drawer-module-list">
                <div v-for="eng in catalog" :key="eng.key" class="simple-drawer-row">
                  <img class="simple-drawer-icon" :src="engineIconPath(eng.key)" :alt="eng.label" />
                  <span class="simple-drawer-label">{{ eng.label }}</span>
                  <button
                    type="button"
                    :class="['simple-drawer-switch', { 'simple-drawer-switch--on': quickKeys.includes(eng.key) }]"
                    role="switch"
                    :aria-checked="quickKeys.includes(eng.key)"
                    :aria-label="`${eng.label} 在快捷栏显示`"
                    :disabled="quickKeys.includes(eng.key) && quickKeys.length <= 1"
                    @click="toggleEngineSwitch(eng.key)"
                  />
                </div>
              </div>
            </div>
          </template>

          <template v-else>
            <div class="simple-drawer-module">
              <div class="simple-drawer-module-title">{{ editingCustomKey ? '编辑搜索引擎' : '添加搜索引擎' }}</div>
              <input v-model.trim="customForm.name" class="custom-input" placeholder="名称" @input="clearFormError" />
              <div class="form-subtitle">网址（用%s代替搜索字词，图标由网址自动获取 favicon）</div>
              <textarea
                v-model.trim="customForm.urlTemplate"
                class="custom-textarea"
                placeholder="https://example.com/search?q=%s"
                @input="onCustomUrlTemplateInput"
                @blur="onCustomUrlTemplateBlur"
              ></textarea>
              <p v-if="customFormError" class="custom-form-error" role="alert">{{ customFormError }}</p>

              <div class="custom-form-actions">
                <button type="button" class="custom-submit-btn" @click="submitCustomForm">
                  {{ editingCustomKey ? '保存修改' : '添加搜索引擎' }}
                </button>
                <button v-if="editingCustomKey" type="button" class="custom-cancel-btn" @click="cancelEditCustom">取消编辑</button>
              </div>
            </div>

            <div v-if="customEngines.length" class="simple-drawer-module">
              <div class="simple-drawer-module-title">自定义搜索引擎</div>
              <div
                v-for="eng in customEngines"
                :key="eng.key"
                class="simple-drawer-row simple-drawer-row-custom"
                :class="{ 'simple-drawer-row-editing': editingCustomKey === eng.key }"
              >
                <span class="simple-drawer-label">{{ eng.name }}</span>
                <button
                  type="button"
                  :class="['simple-drawer-switch', { 'simple-drawer-switch--on': quickKeys.includes(eng.key) }]"
                  role="switch"
                  :aria-checked="quickKeys.includes(eng.key)"
                  :aria-label="`${eng.name} 在快捷栏显示`"
                  :disabled="quickKeys.includes(eng.key) && quickKeys.length <= 1"
                  @click="toggleEngineSwitch(eng.key)"
                />
                <button type="button" class="custom-edit-btn" @click="startEditCustomEngine(eng)">编辑</button>
                <button type="button" class="custom-remove-btn" @click="removeCustomEngine(eng.key)">删除</button>
              </div>
            </div>
          </template>
        </div>
      </aside>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, inject, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { appRuntime } from '../../services/appRuntime.js';
import { BookmarkManager } from '../../services/bookmarks.js';
import { BookmarkManagerSettings } from '../../services/settings.js';
import { normalizeBookmarkCardTextColor } from '../../services/settingsUtils.js';
import {
  SIMPLE_ENGINE_CATALOG,
  DEFAULT_SIMPLE_QUICK_ENGINE_KEYS,
  bookmarkQuickPanelIconUrl,
  engineIconPath,
  inferHostFromUrlTemplate,
  expandSimpleCustomUrlTemplate,
  normalizeCustomEngines,
  normalizeQuickEngineKeys
} from '../../services/simpleSearchEngines.js';

const catalog = SIMPLE_ENGINE_CATALOG;
const activeTab = ref('default');
const keyword = ref('');
const engineKey = ref('baidu');
const quickKeys = ref([...DEFAULT_SIMPLE_QUICK_ENGINE_KEYS]);
const customEngines = ref([]);
const drawerOpen = ref(false);
const showQuickPanel = ref(false);
const wrapRef = ref(null);
const searchScale = ref(100);
const quickIconFailed = reactive({});
const customForm = reactive({
  name: '',
  urlTemplate: ''
});
const editingCustomKey = ref(null);
const customFormError = ref('');
let customUrlExpandTimer = null;

const simpleUi = inject('simpleUi', null);

const bookmarkMode = ref(false);
const flatBookmarks = ref([]);
const bookmarkResultCards = ref([]);
const bookmarkSuggestVisible = ref(false);
let bookmarkSuggestBlurTimer = null;
const bookmarkResultPositionStyle = ref({});

function isUsableBookmarkUrl(url) {
  const s = String(url || '').trim();
  if (!s) return false;
  const low = s.toLowerCase();
  if (low.startsWith('javascript:') || low.startsWith('data:')) return false;
  return true;
}

function flattenFromChromeTree(tree) {
  const map = new Map();
  function walk(nodes) {
    if (!nodes || !nodes.length) return;
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (n.url != null && n.id != null && isUsableBookmarkUrl(n.url)) {
        const u = String(n.url).trim();
        const id = String(n.id);
        map.set(id, { id, title: String(n.title || '').trim() || u, url: u });
      }
      if (n.children && n.children.length) walk(n.children);
    }
  }
  walk(tree);
  return [...map.values()];
}

function flattenNavBookmarks(navData) {
  const map = new Map();
  function add(b) {
    if (!b || b.id == null) return;
    const u = String(b.url || '').trim();
    if (!isUsableBookmarkUrl(u)) return;
    const id = String(b.id);
    map.set(id, { id, title: String(b.title || '').trim() || u, url: u });
  }
  for (const p of navData || []) {
    for (const sec of p.secondaries || []) {
      if (sec.isOverviewAll) {
        for (const b of sec.bookmarks || []) add(b);
        if (sec.overviewGroups) {
          for (const g of sec.overviewGroups) {
            for (const b of g.bookmarks || []) add(b);
          }
        }
      } else if (sec.sides && sec.sides.length) {
        for (const side of sec.sides) {
          for (const b of side.bookmarks || []) add(b);
        }
      } else {
        for (const b of sec.bookmarks || []) add(b);
      }
    }
  }
  return [...map.values()];
}

function loadFlatBookmarks() {
  if (typeof chrome !== 'undefined' && chrome.bookmarks && typeof chrome.bookmarks.getTree === 'function') {
    try {
      chrome.bookmarks.getTree((tree) => {
        if (chrome.runtime && chrome.runtime.lastError) {
          tryLoadBookmarksFromNavData();
          return;
        }
        flatBookmarks.value = flattenFromChromeTree(tree);
      });
      return;
    } catch {
      /* fall through */
    }
  }
  tryLoadBookmarksFromNavData();
}

function tryLoadBookmarksFromNavData() {
  if (!BookmarkManager || typeof BookmarkManager.fetchNavData !== 'function') return;
  BookmarkManager.fetchNavData((navData) => {
    flatBookmarks.value = flattenNavBookmarks(navData);
  });
}

function bookmarkMatchesQuery(b, q) {
  if (!q) return false;
  const t = (b.title || '').toLowerCase();
  const u = (b.url || '').toLowerCase();
  return t.includes(q) || u.includes(q);
}

function allEngines() {
  return [
    ...catalog.map((e) => ({ ...e, isCustom: false })),
    ...customEngines.value.map((e) => ({ ...e, isCustom: true, label: e.name, url: e.urlTemplate }))
  ];
}

function getEngineByKeyLocal(key) {
  return allEngines().find((e) => e.key === key) || allEngines()[0];
}

function syncFromSettings() {
  const s = appRuntime.settings || {};
  customEngines.value = normalizeCustomEngines(s.simpleCustomEngines);
  const customKeys = customEngines.value.map((e) => e.key);
  quickKeys.value = normalizeQuickEngineKeys(s.simpleQuickEngines, customKeys);
  searchScale.value = Number.isFinite(Number(s.simpleSearchScale)) ? Number(s.simpleSearchScale) : 100;
  if (simpleUi) {
    simpleUi.overlayOpacity = s.simpleOverlayOpacity;
    simpleUi.overlayBlurPx = s.simpleOverlayBlurPx;
    simpleUi.searchBorderRadiusPx = s.simpleSearchBorderRadiusPx;
    {
      const v = Number(s.simpleSearchOpacity);
      simpleUi.searchOpacity =
        Number.isFinite(v) && v >= 0 && v <= 100 ? Math.max(10, Math.min(100, Math.round(v))) : 100;
    }
    simpleUi.bookmarkCardTextColor = normalizeBookmarkCardTextColor(s.simpleBookmarkCardTextColor);
  }
  if (!quickKeys.value.includes(engineKey.value)) {
    engineKey.value = quickKeys.value[0];
  }
}

function persistSettings() {
  BookmarkManagerSettings.saveSettings({
    simpleQuickEngines: [...quickKeys.value],
    simpleCustomEngines: customEngines.value.map((e) => ({
      id: e.id,
      name: e.name,
      urlTemplate: e.urlTemplate
    }))
  });
}

function onDocumentPointerDown(e) {
  const el = wrapRef.value;
  if (el && !el.contains(e.target)) {
    bookmarkSuggestVisible.value = false;
  }
  if (!showQuickPanel.value) return;
  if (el && !el.contains(e.target)) showQuickPanel.value = false;
}

function onKeywordInput() {
  if (bookmarkMode.value) {
    bookmarkResultCards.value = [];
    bookmarkSuggestVisible.value = true;
  }
}

function onSearchInputFocus() {
  if (bookmarkMode.value) bookmarkSuggestVisible.value = true;
}

function onSearchInputBlur() {
  clearTimeout(bookmarkSuggestBlurTimer);
  bookmarkSuggestBlurTimer = setTimeout(() => {
    bookmarkSuggestVisible.value = false;
  }, 180);
}

function pickBookmarkSuggestion(b) {
  keyword.value = b.title;
  bookmarkResultCards.value = [];
  bookmarkSuggestVisible.value = false;
}

function selectBookmarkMode() {
  bookmarkMode.value = true;
  showQuickPanel.value = false;
  bookmarkResultCards.value = [];
  bookmarkSuggestVisible.value = !!keyword.value.trim();
  if (!flatBookmarks.value.length) loadFlatBookmarks();
}

function openBookmarkUrl(url) {
  if (url) window.open(url, '_blank', 'noopener,noreferrer');
}

function runBookmarkTitleSearch() {
  const q = keyword.value.trim().toLowerCase();
  if (!q) {
    bookmarkResultCards.value = [];
    return;
  }
  bookmarkResultCards.value = flatBookmarks.value.filter((b) => bookmarkMatchesQuery(b, q));
  bookmarkSuggestVisible.value = false;
}

function onSimpleSearchUiUpdated() {
  syncFromSettings();
  nextTick(() => updateBookmarkResultPosition());
}

onMounted(() => {
  document.addEventListener('pointerdown', onDocumentPointerDown, true);
  window.addEventListener('simple-search-ui-updated', onSimpleSearchUiUpdated);
  loadFlatBookmarks();
  BookmarkManagerSettings.loadSettings(() => syncFromSettings());

  // 结果卡片脱离 anchor 后需要固定定位；根据输入框位置动态计算。
  updateBookmarkResultPosition();
  window.addEventListener('resize', updateBookmarkResultPosition);
  window.addEventListener('scroll', updateBookmarkResultPosition, true);
});

onUnmounted(() => {
  document.removeEventListener('pointerdown', onDocumentPointerDown, true);
  window.removeEventListener('simple-search-ui-updated', onSimpleSearchUiUpdated);
  clearTimeout(bookmarkSuggestBlurTimer);
  clearTimeout(customUrlExpandTimer);

  window.removeEventListener('resize', updateBookmarkResultPosition);
  window.removeEventListener('scroll', updateBookmarkResultPosition, true);
});

function updateBookmarkResultPosition() {
  if (!wrapRef.value) return;
  const rect = wrapRef.value.getBoundingClientRect();
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const width = Math.max(320, Math.min(1200, vw - 48));
  const top = Math.max(0, Math.min(rect.bottom + 12, vh - 10));
  bookmarkResultPositionStyle.value = {
    position: 'fixed',
    left: '50%',
    transform: 'translateX(-50%)',
    top: `${top}px`,
    width: `${width}px`,
    zIndex: 60
  };
}

watch(
  () => [bookmarkMode.value, bookmarkResultCards.value.length],
  async ([mode, len]) => {
    if (!mode || !len) return;
    await nextTick();
    updateBookmarkResultPosition();
  }
);

const currentEngine = computed(() => getEngineByKeyLocal(engineKey.value));
const currentEngineLabel = computed(() => {
  if (bookmarkMode.value) return '书签';
  return currentEngine.value.label || currentEngine.value.name || '搜索';
});
const currentEngineMeta = computed(() => {
  if (bookmarkMode.value) {
    return { type: 'img', src: bookmarkQuickPanelIconUrl(), text: '', bg: '' };
  }
  return engineIconMeta(engineKey.value);
});

const bookmarkSuggestions = computed(() => {
  if (!bookmarkMode.value) return [];
  const q = keyword.value.trim().toLowerCase();
  if (!q) return [];
  // 输入框下方提示选项最多 5 个
  return flatBookmarks.value.filter((b) => bookmarkMatchesQuery(b, q)).slice(0, 5);
});
const bookmarkCrystalCardTextStyle = computed(() => ({
  color: simpleUi ? normalizeBookmarkCardTextColor(simpleUi.bookmarkCardTextColor) : '#1f2937'
}));

const wrapScaleStyle = computed(() => {
  const scale = Math.max(80, Math.min(140, searchScale.value)) / 100;
  const op = simpleUi
    ? Math.max(10, Math.min(100, Number(simpleUi.searchOpacity))) / 100
    : 1;
  return {
    transform: `scale(${scale})`,
    opacity: op
  };
});
const quickGridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${2 + quickKeys.value.length}, minmax(0, 1fr))`
}));

function clampSearchBorderRadiusPx(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 32;
  return Math.max(0, Math.min(40, Math.round(n)));
}

const searchShellStyle = computed(() => {
  const r = simpleUi ? clampSearchBorderRadiusPx(simpleUi.searchBorderRadiusPx) : 32;
  return { borderRadius: `${r}px` };
});

const quickPanelCombinedStyle = computed(() => {
  const rMain = simpleUi ? clampSearchBorderRadiusPx(simpleUi.searchBorderRadiusPx) : 32;
  const rPanel = Math.max(0, Math.round((rMain * 26) / 32));
  return {
    ...quickGridStyle.value,
    borderRadius: `${rPanel}px`
  };
});

watch(quickKeys, () => {
  if (!quickKeys.value.includes(engineKey.value)) engineKey.value = quickKeys.value[0];
});

watch(bookmarkMode, (v) => {
  if (!v) {
    bookmarkResultCards.value = [];
    bookmarkSuggestVisible.value = false;
  }
});

watch(keyword, (v) => {
  if (bookmarkMode.value && !String(v || '').trim()) {
    bookmarkResultCards.value = [];
  }
});

function labelForKey(key) {
  const eng = getEngineByKeyLocal(key);
  return eng.label || eng.name || '搜索';
}

function engineIconMeta(key) {
  const eng = getEngineByKeyLocal(key);
  if (!eng || !eng.isCustom) {
    return { type: 'img', src: engineIconPath(key), text: '', bg: '' };
  }
  const domain = inferHostFromUrlTemplate(eng.urlTemplate);
  if (domain) {
    return {
      type: 'img',
      src: `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(domain)}`,
      text: '',
      bg: ''
    };
  }
  return {
    type: 'text',
    src: '',
    text: (eng.name || 'S').charAt(0).toUpperCase(),
    bg: '#e5e7eb',
    textColor: '#374151'
  };
}

function onQuickIconError(key) {
  quickIconFailed[key] = true;
}

function quickFallbackStyle(key) {
  const m = engineIconMeta(key);
  const bg = m.bg || (m.type === 'text' ? '#e5e7eb' : '#ff4d3a');
  return {
    backgroundColor: bg,
    color: m.textColor || (bg === '#e5e7eb' ? '#374151' : '#fff')
  };
}

function quickFallbackText(key) {
  const m = engineIconMeta(key);
  if (m.text) return m.text;
  return (labelForKey(key) || 'S').charAt(0).toUpperCase();
}

function toggleQuickPanel() {
  showQuickPanel.value = !showQuickPanel.value;
  if (showQuickPanel.value) {
    bookmarkResultCards.value = [];
    bookmarkSuggestVisible.value = false;
  }
}

function selectEngineFromBar(key) {
  bookmarkMode.value = false;
  engineKey.value = key;
  showQuickPanel.value = false;
}

function buildSearchUrl(eng, q) {
  const encoded = encodeURIComponent(q);
  const base = String(eng.url || '').trim();
  if (base.includes('%s')) {
    return base.replace(/%s/g, encoded);
  }
  // 内置引擎 URL 以「参数名=」结尾时直接拼接关键词，避免误加 &q= 导致丢词
  if (/=$/.test(base)) {
    return base + encoded;
  }
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}q=${encoded}`;
}

function submitSearch() {
  if (!keyword.value) return;
  if (bookmarkMode.value) {
    runBookmarkTitleSearch();
    showQuickPanel.value = false;
    return;
  }
  const eng = getEngineByKeyLocal(engineKey.value);
  const url = buildSearchUrl(eng, keyword.value);
  window.open(url, '_blank');
  showQuickPanel.value = false;
}

function openDrawer() {
  showQuickPanel.value = false;
  drawerOpen.value = true;
}

function closeDrawer() {
  drawerOpen.value = false;
  cancelEditCustom();
}

function resetCustomForm() {
  customForm.name = '';
  customForm.urlTemplate = '';
  editingCustomKey.value = null;
  customFormError.value = '';
}

function cancelEditCustom() {
  resetCustomForm();
}

function startEditCustomEngine(eng) {
  editingCustomKey.value = eng.key;
  customForm.name = eng.name;
  customForm.urlTemplate = eng.urlTemplate;
  customFormError.value = '';
}

function toggleEngine(key, checked) {
  let next = [...quickKeys.value];
  if (checked) {
    if (!next.includes(key)) next.push(key);
  } else {
    if (next.length <= 1) return;
    next = next.filter((k) => k !== key);
  }
  quickKeys.value = normalizeQuickEngineKeys(next, customEngines.value.map((e) => e.key));
  persistSettings();
}

function toggleEngineSwitch(key) {
  const on = quickKeys.value.includes(key);
  toggleEngine(key, !on);
}

function clearFormError() {
  customFormError.value = '';
}

function onCustomUrlTemplateInput() {
  clearFormError();
  clearTimeout(customUrlExpandTimer);
  customUrlExpandTimer = setTimeout(() => {
    customUrlExpandTimer = null;
    const t = String(customForm.urlTemplate || '').trim();
    if (!t || t.includes('%s')) return;
    if (t.includes('/') || t.includes('?')) return;
    if (!/^[\w.-]+\.[a-zA-Z]{2,}$/.test(t)) return;
    const next = expandSimpleCustomUrlTemplate(t);
    if (next && next !== t) customForm.urlTemplate = next;
  }, 350);
}

function onCustomUrlTemplateBlur() {
  clearTimeout(customUrlExpandTimer);
  customUrlExpandTimer = null;
  const t = String(customForm.urlTemplate || '').trim();
  if (!t) return;
  const next = expandSimpleCustomUrlTemplate(t);
  if (next && next !== t) customForm.urlTemplate = next;
}

function normalizeUrlTemplateInput(raw) {
  let urlTemplate = String(raw || '').trim();
  if (!urlTemplate) return '';
  if (!urlTemplate.includes('%s')) urlTemplate += urlTemplate.includes('?') ? '&q=%s' : '?q=%s';
  return urlTemplate;
}

function submitCustomForm() {
  const name = customForm.name.trim();
  const rawUrl = customForm.urlTemplate.trim();
  const missing = [];
  if (!name) missing.push('名称');
  if (!rawUrl) missing.push('网址');
  if (missing.length) {
    customFormError.value = `请填写：${missing.join('、')}`;
    return;
  }
  customFormError.value = '';
  const urlTemplate = normalizeUrlTemplateInput(customForm.urlTemplate);
  if (!urlTemplate) {
    customFormError.value = '请填写有效的网址';
    return;
  }

  if (editingCustomKey.value) {
    const idx = customEngines.value.findIndex((e) => e.key === editingCustomKey.value);
    if (idx === -1) {
      resetCustomForm();
      return;
    }
    const prev = customEngines.value[idx];
    const key = editingCustomKey.value;
    customEngines.value[idx] = {
      ...prev,
      name,
      urlTemplate
    };
    delete quickIconFailed[key];
    persistSettings();
    resetCustomForm();
    return;
  }

  const id = `c_${Date.now()}`;
  const item = {
    id,
    key: `custom:${id}`,
    name,
    urlTemplate
  };
  customEngines.value.push(item);
  if (!quickKeys.value.includes(item.key)) quickKeys.value.push(item.key);
  persistSettings();
  resetCustomForm();
}

function removeCustomEngine(key) {
  customEngines.value = customEngines.value.filter((e) => e.key !== key);
  quickKeys.value = quickKeys.value.filter((k) => k !== key);
  if (!quickKeys.value.length) quickKeys.value = [...DEFAULT_SIMPLE_QUICK_ENGINE_KEYS];
  if (engineKey.value === key) engineKey.value = quickKeys.value[0];
  if (editingCustomKey.value === key) resetCustomForm();
  persistSettings();
}
</script>

<style scoped>
.simple-search-wrap { width: min(760px, calc(100vw - 48px)); position: relative; transform-origin: top center; }
.simple-search-input-shell { height: 64px; background: #fff; display: flex; align-items: center; padding: 0 16px; }
.simple-search-input-wrap { position: relative; flex: 1; min-width: 0; align-self: stretch; display: flex; align-items: center; }
.bookmark-suggest-list {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% + 6px);
  z-index: 40;
  margin: 0;
  padding: 6px 0;
  list-style: none;
  max-height: 280px;
  overflow-y: auto;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 28px #00000026;
  border: 1px solid #e5e7eb;
}
.bookmark-suggest-item {
  display: block;
  width: 100%;
  text-align: left;
  border: none;
  background: transparent;
  padding: 10px 14px;
  font-size: 15px;
  color: #1f2937;
  cursor: pointer;
}
.bookmark-suggest-item:hover { background: #f3f4f6; }
.bookmark-result-block {
  margin-top: 12px;
  width: 100%;
  display: grid;
  /* 用 1fr 让列可以继续自动分裂；再用卡片 max-width 控制视觉最大宽度 */
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 12px;
  max-height: min(50vh, 440px);
  overflow-y: auto;
  justify-content: center;
  align-content: start;
  padding-right: 2px;
}
.bookmark-crystal-card {
  border: 1px solid rgba(255, 255, 255, 0.45);
  background: rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-radius: 14px;
  padding: 12px 16px;
  font-size: 15px;
  color: #1f2937;
  text-align: left;
  cursor: pointer;
  width: 100%;
  max-width: 599px;
  justify-self: center;
  box-sizing: border-box;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.35);
  transition: background 0.15s, box-shadow 0.15s;
}
.bookmark-crystal-card:hover {
  background: rgba(255, 255, 255, 0.28);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.45);
}
.engine-trigger-btn { display: flex; align-items: center; gap: 2px; margin-right: 10px; border: none; background: transparent; color: #333; cursor: pointer; padding: 0 6px; border-radius: 8px; }
.engine-trigger-btn:hover { background: #f3f4f6; }
.engine-icon-wrap { width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; }
.engine-icon { width: 20px; height: 20px; object-fit: contain; }
.engine-custom-icon { width: 22px; height: 22px; border-radius: 6px; color: #fff; font-size: 12px; display: inline-flex; align-items: center; justify-content: center; }
.engine-caret { opacity: 0.7; font-size: 12px; }
.simple-search-input { border: none; outline: none; background: transparent; color: #2b2b2b; width: 100%; font-size: 17px; }
.quick-panel { position: absolute; left: 0; right: 0; top: calc(100% + 10px); z-index: 30; background: #fff; min-height: 120px; display: grid; box-shadow: 0 8px 24px #00000022; overflow: hidden; }
.quick-item { border: none; border-right: 1px solid #ececec; background: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; cursor: pointer; padding: 12px 6px; }
.quick-item:last-child { border-right: none; }
.quick-icon { font-size: 28px; line-height: 1; color: #3a3a44; }
.quick-icon-img-wrap { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; }
.quick-icon-img { width: 28px; height: 28px; object-fit: contain; }
.quick-icon-fallback { width: 24px; height: 24px; border-radius: 6px; color: #fff; font-size: 12px; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; }
.quick-label { font-size: 14px; color: #555; }
.simple-drawer-backdrop { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.35); z-index: 900; }
.simple-drawer { position: fixed; top: 0; right: 0; width: min(390px, 94vw); height: 100vh; background: #f3f4f6; box-shadow: -8px 0 24px #0000001a; z-index: 901; display: flex; flex-direction: column; }
.simple-drawer-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 14px; border-bottom: 1px solid #dbe6f1; background: #fff; }
.simple-drawer-title { font-size: 15px; font-weight: 700; color: #374151; margin: 0; }
.simple-drawer-close { border: none; background: transparent; font-size: 24px; line-height: 1; cursor: pointer; color: #6b7280; padding: 4px 8px; }
.simple-drawer-tabs { display: flex; background: #fff; border-bottom: none; }
.simple-tab-btn {
  flex: 1;
  border: none;
  background: #fff;
  padding: 10px 0;
  cursor: pointer;
  color: #666;
  border-bottom: 1px solid transparent;
  box-sizing: border-box;
}
.simple-tab-btn.active { color: #222; font-weight: 600; border-bottom-color: #93c5fd; }
.simple-drawer-body { flex: 1; overflow-y: auto; padding: 12px; }
.simple-drawer-scale { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px; margin-bottom: 10px; }
.simple-drawer-scale-label { font-size: 14px; color: #374151; margin-bottom: 8px; }
.simple-drawer-range { width: 100%; }
.simple-drawer-row { display: flex; align-items: center; gap: 12px; padding: 12px 10px; margin-bottom: 8px; background: #fff; border-radius: 12px; border: 1px solid #e5e7eb; }
.simple-drawer-icon { width: 24px; height: 24px; object-fit: contain; flex-shrink: 0; }
.simple-drawer-label { flex: 1; font-size: 15px; color: #374151; }
.simple-drawer-switch {
  position: relative;
  width: 44px;
  height: 24px;
  flex-shrink: 0;
  border: none;
  border-radius: 999px;
  background: #d1d5db;
  cursor: pointer;
  padding: 0;
  transition: background 0.2s;
}
.simple-drawer-switch::after {
  content: '';
  position: absolute;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  top: 3px;
  left: 3px;
  box-shadow: 0 1px 2px #00000033;
  transition: transform 0.2s;
}
.simple-drawer-switch--on { background: #4f9dff; }
.simple-drawer-switch--on::after { transform: translateX(20px); }
.simple-drawer-switch:disabled { opacity: 0.45; cursor: not-allowed; }
.simple-drawer-switch:focus-visible { box-shadow: 0 0 0 2px #4f9dff66; }
.custom-form-error { margin: 8px 0 0; font-size: 13px; color: #b91c1c; }
.custom-form-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 0;
  padding: 12px 12px 8px;
  margin-bottom: 12px;
}
.form-title { font-size: 16px; color: #333; margin-bottom: 10px; }
.form-subtitle { font-size: 14px; color: #444; margin: 10px 0 6px; }
.custom-input,
.custom-textarea {
  width: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 8px 10px;
  box-sizing: border-box;
  font-size: 14px;
  font-family: inherit;
  color: #374151;
  background: #fff;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.custom-input::placeholder,
.custom-textarea::placeholder {
  color: #9ca3af;
}
.custom-input:focus,
.custom-textarea:focus {
  outline: none;
  color: #374151;
  border-color: #4285f4;
  box-shadow: 0 0 0 2px rgba(66, 133, 244, 0.2);
}
.custom-textarea { min-height: 74px; resize: vertical; }
.custom-form-actions { margin-top: 10px; display: flex; flex-direction: column; gap: 8px; }
.custom-submit-btn {
  width: 100%;
  border: 1px solid #e8e8e8;
  background: #f5f5f5;
  color: #595959;
  border-radius: 4px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.2s, color 0.2s, border-color 0.2s;
}

.custom-submit-btn:hover {
  background: #e8e8e8;
  color: #262626;
}

.custom-cancel-btn {
  width: 100%;
  border: 1px solid #e8e8e8;
  background: #f5f5f5;
  color: #595959;
  border-radius: 4px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.2s, color 0.2s, border-color 0.2s;
}

.custom-cancel-btn:hover {
  background: #e8e8e8;
  color: #262626;
}
.simple-drawer-row-custom { flex-wrap: wrap; }
.simple-drawer-row-editing { border-color: #93c5fd; box-shadow: 0 0 0 1px #93c5fd; }
.custom-edit-btn { border: none; background: #e5e7eb; color: #374151; border-radius: 6px; padding: 5px 10px; cursor: pointer; font-size: 12px; }
.custom-remove-btn { border: none; background: #ef4444; color: #fff; border-radius: 6px; padding: 5px 10px; cursor: pointer; font-size: 12px; }

.simple-drawer-module {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 0;
  padding: 12px 12px 8px;
  margin-bottom: 12px;
}

.simple-drawer-module-title {
  font-size: 15px;
  font-weight: 700;
  color: #374151;
  margin-bottom: 12px;
}

.simple-drawer-module-control + .simple-drawer-module-control {
  margin-top: 12px;
}

.simple-drawer-module-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
