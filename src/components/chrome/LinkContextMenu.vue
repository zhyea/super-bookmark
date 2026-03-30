<template>
    <Teleport to="body">
        <div
            id="linkContextMenu"
            class="link-context-menu"
            :class="{ 'link-context-menu-visible': visible }"
            :style="menuStyle"
            aria-hidden="true"
        >
            <button type="button" class="link-context-menu-item" data-action="delete" @click.stop="onDelete">
                {{ t('ctxDelete') }}
            </button>
        </div>
    </Teleport>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { BookmarkMaintenance } from '../../services/bookmarkMaintenance.js';
import { appRuntime } from '../../services/appRuntime.js';

const { t } = useI18n();

const visible = ref(false);
const posX = ref(0);
const posY = ref(0);
const bookmarkId = ref('');

const menuStyle = computed(() => ({
    left: posX.value + 'px',
    top: posY.value + 'px'
}));

function hide() {
    visible.value = false;
}

function show(clientX, clientY, id) {
    bookmarkId.value = id || '';
    posX.value = clientX;
    posY.value = clientY;
    visible.value = true;
}

function onDelete() {
    const id = bookmarkId.value;
    if (!id) {
        hide();
        return;
    }
    const lg = appRuntime.bookmarkLinksGridGetter ? appRuntime.bookmarkLinksGridGetter() : null;
    const item = lg && lg.querySelector('.link-item[data-bookmark-id="' + id + '"]');
    if (item) item.style.animation = 'fadeOut 0.3s ease forwards';
    BookmarkMaintenance.deleteBookmark(id, function () {
        appRuntime.bookmarkRefreshKeepView?.();
    });
    hide();
}

function onDocClick() {
    hide();
}

onMounted(() => {
    document.addEventListener('click', onDocClick);
});

onUnmounted(() => {
    document.removeEventListener('click', onDocClick);
});

defineExpose({ show, hide });
</script>
