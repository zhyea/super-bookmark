<template>
    <div ref="dropdownRef" class="folder-dropdown" id="edit-folder-dropdown">
        <button
            type="button"
            id="edit-folder-trigger"
            class="folder-dropdown-trigger"
            aria-haspopup="listbox"
            :aria-expanded="folderOpen ? 'true' : 'false'"
            @click.prevent.stop="folderOpen = !folderOpen"
        >
            {{ currentPathDisplay }}
        </button>
        <div
            id="edit-folder-panel"
            class="folder-dropdown-panel"
            :class="{ open: folderOpen }"
            role="listbox"
            :aria-label="t('folderPanelAria')"
        >
            <div id="edit-folder-tree" class="folder-tree">
                <div
                    v-for="row in folderRows"
                    :key="row.id"
                    class="folder-tree-item"
                    :class="{ selected: isFolderRowSelected(row) }"
                    :data-id="row.id"
                    :style="{ paddingLeft: row.depth * 16 + 10 + 'px' }"
                    @click.stop="selectFolder(row)"
                >
                    {{ row.pathDisplay }}
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps({
    modelValue: { type: String, default: '' },
    folderRows: { type: Array, default: () => [] }
});
const emit = defineEmits(['update:modelValue']);

const { t } = useI18n();

const folderOpen = ref(false);
const dropdownRef = ref(null);

const currentPathDisplay = computed(() => {
    const pick = t('folderPick');
    for (let r = 0; r < props.folderRows.length; r++) {
        const row = props.folderRows[r];
        if (
            row.id === props.modelValue ||
            (String(props.modelValue).indexOf('_direct') >= 0 &&
                row.id === String(props.modelValue).replace(/_direct$/, ''))
        ) {
            return row.pathDisplay;
        }
    }
    return pick;
});

function isFolderRowSelected(row) {
    return (
        row.id === props.modelValue ||
        (String(props.modelValue).indexOf('_direct') >= 0 &&
            row.id === String(props.modelValue).replace(/_direct$/, ''))
    );
}

function selectFolder(row) {
    emit('update:modelValue', row.id);
    folderOpen.value = false;
}

function onOutsideClick(e) {
    if (dropdownRef.value && !dropdownRef.value.contains(e.target)) {
        folderOpen.value = false;
    }
}

watch(
    () => folderOpen.value,
    (v) => {
        if (v) {
            document.addEventListener('click', onOutsideClick);
        } else {
            document.removeEventListener('click', onOutsideClick);
        }
    }
);

onUnmounted(() => {
    document.removeEventListener('click', onOutsideClick);
});
</script>

<style scoped>
.folder-dropdown {
    position: relative;
}
.folder-dropdown-trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #e8e8e8;
    border-radius: 4px;
    background: #fff;
    font-size: 14px;
    color: #333;
    cursor: pointer;
    text-align: left;
}
.folder-dropdown-trigger:hover {
    border-color: #c0c4cc;
}
.folder-dropdown-trigger::after {
    content: '';
    width: 0;
    height: 0;
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
    border-top: 5px solid #909399;
    margin-left: 8px;
    flex-shrink: 0;
}
.folder-dropdown-panel {
    display: none;
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    margin-top: 4px;
    max-height: 200px;
    overflow-y: auto;
    border: 1px solid #e8e8e8;
    border-radius: 4px;
    padding: 8px;
    background: #fff;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
    z-index: 10;
}
.folder-dropdown-panel.open {
    display: block;
}
.folder-tree-item {
    padding: 6px 10px;
    cursor: pointer;
    border-radius: 4px;
    font-size: 13px;
}
.folder-tree-item:hover {
    background: #e6f7ff;
}
.folder-tree-item.selected {
    background: #bae7ff;
    color: #0050b3;
}
</style>
