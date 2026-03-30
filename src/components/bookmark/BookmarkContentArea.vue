<template>
    <div id="contentArea">
        <div v-show="!state.initialized" id="loading" class="loading">{{ t('loading') }}</div>
        <div
            v-show="state.initialized && (!state.navData.length || !secondary)"
            id="emptyState"
            class="empty-state"
        >
            <p>{{ t('emptyState') }}</p>
        </div>
        <div v-show="state.initialized && state.navData.length && secondary" id="categoryPanel">
            <h2 id="categoryTitle" class="category-title" style="display: none"></h2>
            <div id="tagBarOuter" ref="tagBarOuterRef" class="tag-bar-outer">
                <button
                    id="tagBarPrev"
                    ref="tagBarPrevRef"
                    type="button"
                    class="tag-bar-arrow tag-bar-arrow-left"
                    :aria-label="t('tagLeft')"
                    :title="t('tagLeft')"
                ></button>
                <div id="tagBar" ref="tagBarRef" class="tag-bar">
                    <span
                        class="tag-pill"
                        :class="{ active: selectedTag === null }"
                        data-tag=""
                        @click="selectTag(null)"
                        >{{ t('tagAll') }}</span
                    >
                    <span
                        v-for="name in scopeTags"
                        :key="name"
                        class="tag-pill"
                        :class="{ active: selectedTag === name }"
                        :data-tag="name"
                        @click="selectTag(name)"
                        >{{ name }}</span
                    >
                </div>
                <button
                    id="tagBarNext"
                    ref="tagBarNextRef"
                    type="button"
                    class="tag-bar-arrow tag-bar-arrow-right"
                    :aria-label="t('tagRight')"
                    :title="t('tagRight')"
                ></button>
            </div>
            <div
                id="linksGrid"
                ref="linksGridRef"
                class="links-grid"
                :style="{ gridTemplateColumns: gridTemplate }"
            >
                <LinkCard
                    v-for="b in bookmarkList"
                    :key="`${b.id}-${state.contentVersion}`"
                    :bookmark="b"
                    :secondary="secondary"
                    @delete="onDeleteCard"
                    @edit="onEditCard"
                />
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed, inject, watch, onMounted, onUnmounted, ref, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import LinkCard from './LinkCard.vue';
import * as H from '../../utils/bookmarkRenderHelpers.js';
import { appRuntime } from '../../services/appRuntime.js';

const { t } = useI18n();
const emit = defineEmits(['edit', 'delete']);
const tagBarRef = ref(null);
const tagBarOuterRef = ref(null);
const tagBarPrevRef = ref(null);
const tagBarNextRef = ref(null);
const linksGridRef = ref(null);

const bookmarkCore = inject('bookmarkCore');
if (!bookmarkCore) throw new Error('bookmarkCore missing');
const { state, searchTerm } = bookmarkCore;

const primary = computed(() => H.getCurrentPrimary(state));
const secondary = computed(() => H.getCurrentSecondary(state));

const selectedTag = computed({
    get: () => state.selectedTag,
    set: (v) => {
        state.selectedTag = v;
    }
});

const scopeTags = computed(() => {
    void state.contentVersion;
    if (!secondary.value) return [];
    return H.getCurrentScopeTags(state, secondary.value);
});

const bookmarkList = computed(() => {
    void state.contentVersion;
    return H.getFilteredBookmarks(state, searchTerm.value);
});

function selectTag(tag) {
    state.selectedTag = tag;
}

function effectiveColumns(containerW) {
    const cols = appRuntime.settings?.columns ?? 3;
    const w = containerW || 300;
    return Math.min(cols, Math.max(1, Math.floor(w / 240)));
}

const gridTemplate = ref('repeat(3, minmax(240px, 1fr))');

function updateGridCols() {
    const el = linksGridRef.value;
    const w = el && el.parentElement ? el.parentElement.clientWidth : 300;
    const ec = effectiveColumns(w);
    gridTemplate.value = `repeat(${ec}, minmax(240px, 1fr))`;
}

function updateTagBarArrows() {
    const tagBar = tagBarRef.value;
    const tagBarOuter = tagBarOuterRef.value;
    const tagBarPrev = tagBarPrevRef.value;
    const tagBarNext = tagBarNextRef.value;
    if (!tagBar || !tagBarOuter) return;
    let maxScroll = tagBar.scrollWidth - tagBar.clientWidth;
    let overflow = maxScroll > 6;
    tagBarOuter.classList.toggle('tag-bar-overflow', overflow);
    if (tagBarPrev) {
        tagBarPrev.classList.remove('tag-bar-arrow-visible');
        tagBarPrev.classList.remove('tag-bar-arrow-disabled');
    }
    if (tagBarNext) {
        tagBarNext.classList.remove('tag-bar-arrow-visible');
        tagBarNext.classList.remove('tag-bar-arrow-disabled');
    }
    if (!overflow) return;
    let left = tagBar.scrollLeft;
    let canLeft = left > 2;
    let canRight = left < maxScroll - 2;
    if (tagBarPrev) {
        tagBarPrev.classList.toggle('tag-bar-arrow-visible', canLeft);
        tagBarPrev.classList.toggle('tag-bar-arrow-disabled', !canLeft);
    }
    if (tagBarNext) {
        tagBarNext.classList.toggle('tag-bar-arrow-visible', canRight);
        tagBarNext.classList.toggle('tag-bar-arrow-disabled', !canRight);
    }
}

watch(
    [
        () => state.navData,
        () => state.currentPrimaryIndex,
        () => state.currentSecondaryId,
        () => state.currentSideId,
        () => state.selectedTag,
        () => searchTerm.value
    ],
    () => {
        updateGridCols();
        nextTick(() => updateTagBarArrows());
    }
);

watch(scopeTags, () => nextTick(() => updateTagBarArrows()));

let ro;
let tagBarRo;
onMounted(() => {
    updateGridCols();
    ro = new ResizeObserver(() => updateGridCols());
    if (linksGridRef.value) ro.observe(linksGridRef.value);
    window.addEventListener('resize', updateGridCols);

    const tagBar = tagBarRef.value;
    const tagBarPrev = tagBarPrevRef.value;
    const tagBarNext = tagBarNextRef.value;
    const tagBarOuter = tagBarOuterRef.value;
    if (tagBar && tagBarPrev && tagBarNext) {
        function tagBarScrollStep() {
            return Math.max(120, Math.floor(tagBar.clientWidth * 0.55));
        }
        tagBarPrev.addEventListener('click', function () {
            if (this.classList.contains('tag-bar-arrow-disabled')) return;
            tagBar.scrollBy({ left: -tagBarScrollStep(), behavior: 'smooth' });
        });
        tagBarNext.addEventListener('click', function () {
            if (this.classList.contains('tag-bar-arrow-disabled')) return;
            tagBar.scrollBy({ left: tagBarScrollStep(), behavior: 'smooth' });
        });
        tagBar.addEventListener(
            'scroll',
            function () {
                updateTagBarArrows();
            },
            { passive: true }
        );
        if (typeof ResizeObserver !== 'undefined') {
            tagBarRo = new ResizeObserver(function () {
                updateTagBarArrows();
            });
            tagBarRo.observe(tagBar);
            if (tagBarOuter) tagBarRo.observe(tagBarOuter);
        }
    }
    nextTick(() => updateTagBarArrows());
});
onUnmounted(() => {
    if (ro && linksGridRef.value) ro.unobserve(linksGridRef.value);
    if (tagBarRo && tagBarRef.value) tagBarRo.unobserve(tagBarRef.value);
    window.removeEventListener('resize', updateGridCols);
});

function onDeleteCard(id) {
    emit('delete', id);
}

function onEditCard(ev) {
    const el = ev && ev.currentTarget && ev.currentTarget.closest ? ev.currentTarget.closest('.link-item') : null;
    if (el) emit('edit', el);
}
</script>
