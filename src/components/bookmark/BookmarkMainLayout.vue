<template>
  <div class="container">
    <header id="bookmarkHeader" class="header">
      <PrimaryNavBar
        :nav-data="state.navData"
        :current-primary-index="state.currentPrimaryIndex"
        @select="onSelectPrimary"
      />
      <SecondaryNavBar
        :secondaries="secondaries"
        :current-secondary-id="state.currentSecondaryId"
        @select="onSelectSecondary"
      />
      <SearchBar v-model="searchInputRaw" @search="onSearchImmediate" />
    </header>

    <div class="main-content" :class="{ 'sidebar-hidden': !hasSidebar }">
      <aside class="sidebar" :aria-label="t('sidebarAria')">
        <div id="sideSection" class="sidebar-section">
          <SideNavList :sides="sides" :current-side-id="state.currentSideId" @select="onSelectSide" />
        </div>
      </aside>

      <main id="contentMain" class="content">
        <BookmarkContentArea @edit="onEditCard" @delete="onDeleteCard" />
      </main>
    </div>

    <footer class="footer">
      <div class="footer-content">
        <p>{{ t('footer') }}</p>
      </div>
    </footer>

    <BookmarkEditModal ref="bookmarkEditModalRef" />

    <Teleport to="body">
      <LinkContextMenu ref="linkContextMenuRef" />
      <ScrollFloatButton ref="scrollFloatRef" />
    </Teleport>
  </div>
</template>

<script setup>
import { computed, reactive, ref, provide, watch, onMounted, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import PrimaryNavBar from '../nav/PrimaryNavBar.vue';
import SecondaryNavBar from '../nav/SecondaryNavBar.vue';
import SideNavList from '../nav/SideNavList.vue';
import SearchBar from '../layout/SearchBar.vue';
import BookmarkContentArea from './BookmarkContentArea.vue';
import BookmarkEditModal from '../edit/BookmarkEditModal.vue';
import LinkContextMenu from '../chrome/LinkContextMenu.vue';
import ScrollFloatButton from '../chrome/ScrollFloatButton.vue';
import { appRuntime } from '../../services/appRuntime.js';
import { getCurrentPrimary, getCurrentSecondary } from '../../utils/bookmarkRenderHelpers.js';
import { initBookmarkPage } from '../../composables/useBookmarkPage.js';

const { t } = useI18n();

const state = reactive({
  navData: [],
  currentPrimaryIndex: 0,
  currentSecondaryId: null,
  currentSideId: null,
  selectedTag: null,
  initialized: false,
  contentVersion: 0
});

const searchInputRaw = ref('');
const searchTerm = ref('');
let debounceTimer;

watch(searchInputRaw, (v) => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    searchTerm.value = String(v || '').trim();
  }, 300);
});

provide('bookmarkCore', { state, searchTerm });

const secondaries = computed(() => {
  const p = getCurrentPrimary(state);
  return (p && p.secondaries) || [];
});

const currentSecondary = computed(() => getCurrentSecondary(state));

const sides = computed(() => {
  const sec = currentSecondary.value;
  return (sec && sec.sides) || [];
});

const hasSidebar = computed(() => sides.value.length > 1);

const bookmarkPageApi = ref(null);
const bookmarkEditModalRef = ref(null);
const linkContextMenuRef = ref(null);
const scrollFloatRef = ref(null);

function setCurrentSideFromSecondary() {
  const secondary = getCurrentSecondary(state);
  if (secondary && secondary.sides && secondary.sides.length) {
    state.currentSideId = secondary.sides[0].id;
  } else {
    state.currentSideId = null;
  }
}

function onSelectPrimary(i) {
  state.currentPrimaryIndex = i;
  const primary = state.navData[i];
  if (!primary || !primary.secondaries || !primary.secondaries.length) return;
  state.currentSecondaryId = primary.secondaries[0].id;
  setCurrentSideFromSecondary();
  state.selectedTag = null;
}

function onSelectSecondary(id) {
  state.currentSecondaryId = id;
  setCurrentSideFromSecondary();
  state.selectedTag = null;
}

function onSelectSide(id) {
  state.currentSideId = id;
  state.selectedTag = null;
}

function onSearchImmediate() {
  clearTimeout(debounceTimer);
  searchTerm.value = String(searchInputRaw.value || '').trim();
}

function onEditCard(el) {
  bookmarkPageApi.value?.openEditForItem?.(el);
}

function onDeleteCard(id) {
  bookmarkPageApi.value?.deleteBookmark?.(id);
}

onMounted(() => {
  try {
    const params = new URLSearchParams(window.location.search);
    const bm = params.get('bookmarkSearch');
    if (bm != null && bm !== '') {
      searchInputRaw.value = bm;
      searchTerm.value = bm.trim();
      const u = new URL(window.location.href);
      u.searchParams.delete('bookmarkSearch');
      const clean = u.pathname + (u.search || '') + (u.hash || '');
      history.replaceState({}, '', clean);
    }
  } catch {
    /* ignore */
  }
  nextTick(() => {
    appRuntime.openBookmarkEditModal = (linkItem, context) => {
      bookmarkEditModalRef.value?.open(linkItem, context);
    };
    appRuntime.linkContextMenu = {
      show: (clientX, clientY, bookmarkId) =>
        linkContextMenuRef.value?.show(clientX, clientY, bookmarkId),
      hide: () => linkContextMenuRef.value?.hide()
    };
    appRuntime.scrollFloat = {
      update: () => scrollFloatRef.value?.updateVisibility()
    };
    bookmarkPageApi.value = initBookmarkPage({ state, searchTerm });
  });
});

</script>

<style scoped>
.container {
  position: relative;
  z-index: 1;
}
</style>
