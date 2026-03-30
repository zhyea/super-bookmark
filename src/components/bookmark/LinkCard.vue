<template>
    <div
        class="link-item"
        :data-bookmark-id="String(bookmark.id)"
        :data-url="bookmark.url || ''"
        :data-icon-color="iconColor"
        draggable="true"
    >
        <a :href="bookmark.url" target="_blank" draggable="false" class="card-link" :title="linkTitle">
            <div class="card-head">
                <div class="card-icon" :style="{ background: iconColor }">
                    <img
                        v-if="favicon"
                        class="card-icon-img"
                        :src="favicon"
                        alt=""
                        referrerpolicy="no-referrer"
                        @load="onImgLoad"
                        @error="onImgErr"
                    />
                    <span class="card-icon-fallback">{{ firstChar }}</span>
                </div>
                <div class="card-body">
                    <span class="card-title">{{ bookmark.title }}</span>
                    <span class="card-url">{{ urlDisplay }}</span>
                </div>
            </div>
        </a>
        <div class="card-tags">
            <span v-for="(tg, i) in userTags" :key="i" class="card-tag">{{ tg }}</span>
        </div>
        <div class="actions">
            <button
                type="button"
                :title="t('cardDelete')"
                :aria-label="t('cardDelete')"
                class="action-delete"
                @click.prevent.stop="emit('delete', bookmark.id)"
            >
                🗑
            </button>
            <button
                type="button"
                :title="t('cardEdit')"
                :aria-label="t('cardEdit')"
                class="action-edit"
                @click.prevent.stop="(e) => emit('edit', e)"
            >
                ✏️
            </button>
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import * as H from '../../utils/bookmarkRenderHelpers.js';

const props = defineProps({
    bookmark: { type: Object, required: true },
    secondary: { type: Object, required: true }
});

const emit = defineEmits(['edit', 'delete']);
const { t } = useI18n();

const firstChar = computed(() => H.getFirstChar(props.bookmark.title));
const iconColor = computed(() => {
    const m = props.secondary._userIconColor;
    return (m && m[props.bookmark.id]) || H.getIconColorForChar(firstChar.value);
});
const favicon = computed(() => H.faviconUrl(props.bookmark.url));
const linkTitle = computed(() => {
    const t0 = props.bookmark.title && props.bookmark.title.trim();
    return t0 || props.bookmark.url;
});
const urlDisplay = computed(() => {
    const u = props.bookmark.url || '';
    return u.replace(/^https?:\/\//, '').replace(/\/$/, '') || u;
});
const userTags = computed(() => {
    const m = props.secondary._userTags;
    return (m && m[props.bookmark.id]) || [];
});

function onImgLoad(e) {
    e.target.classList.add('loaded');
}
function onImgErr(e) {
    e.target.classList.add('error');
}
</script>
