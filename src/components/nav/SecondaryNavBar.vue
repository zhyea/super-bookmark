<template>
    <nav class="nav nav-secondary" :aria-label="t('navSecondaryAria')">
        <ul id="secondaryNav" class="nav-list">
            <li v-for="s in secondaries" :key="String(s.id)" class="nav-item">
                <a
                    href="#"
                    class="secondary-nav-item"
                    :data-secondary-id="String(s.id)"
                    :class="{ active: String(s.id) === String(currentSecondaryId) }"
                    @click.prevent="$emit('select', s.id)"
                    >{{ displayTitle(s) }}</a
                >
            </li>
        </ul>
    </nav>
</template>

<script setup>
import { useI18n } from 'vue-i18n';
import { navDisplayTitle } from '../../utils/bookmarkRenderHelpers.js';

const { t } = useI18n();

defineProps({
    secondaries: { type: Array, default: () => [] },
    currentSecondaryId: { type: [String, Number], default: null }
});
defineEmits(['select']);

function displayTitle(s) {
    return navDisplayTitle(s, t);
}
</script>
