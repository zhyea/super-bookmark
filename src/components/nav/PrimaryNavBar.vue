<template>
    <nav v-if="navData.length > 1" id="primaryNavWrap" class="nav primary-nav-wrap" :aria-label="t('navPrimaryAria')">
        <ul id="primaryNav" class="nav-list">
            <li v-for="(p, i) in navData" :key="String(p.folderId)" class="nav-item">
                <a
                    href="#"
                    class="primary-nav-item"
                    :data-primary-index="i"
                    :data-folder-id="String(p.folderId)"
                    :class="{ active: i === currentPrimaryIndex }"
                    @click.prevent="$emit('select', i)"
                    >{{ p.title }}</a
                >
            </li>
        </ul>
    </nav>
</template>

<script setup>
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

defineProps({
    navData: { type: Array, default: () => [] },
    currentPrimaryIndex: { type: Number, default: 0 }
});
defineEmits(['select']);
</script>
