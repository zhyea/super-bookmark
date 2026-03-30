<template>
    <ul v-if="sides.length > 1" id="sideNavList" class="sidebar-list">
        <li v-for="sd in sides" :key="String(sd.id)" class="sidebar-item">
            <a
                href="#"
                class="side-nav-item"
                :data-side-id="String(sd.id)"
                :class="{ active: String(sd.id) === String(currentSideId) }"
                @click.prevent="$emit('select', sd.id)"
                >{{ displayTitle(sd) }}</a
            >
        </li>
    </ul>
</template>

<script setup>
import { useI18n } from 'vue-i18n';
import { navDisplayTitle } from '../../utils/bookmarkRenderHelpers.js';

const { t } = useI18n();

defineProps({
    sides: { type: Array, default: () => [] },
    currentSideId: { type: [String, Number, null], default: null }
});
defineEmits(['select']);

function displayTitle(sd) {
    return navDisplayTitle(sd, t);
}
</script>
