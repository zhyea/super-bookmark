<template>
    <div class="search-container">
        <div class="search-box">
            <span class="search-icon">🔍</span>
            <input
                id="searchInput"
                type="text"
                class="search-input"
                :placeholder="t('searchPlaceholder')"
                :aria-label="t('searchPlaceholder')"
                :value="modelValue"
                @input="$emit('update:modelValue', $event.target.value)"
            />
            <button id="searchBtn" type="button" class="search-btn" @click="$emit('search')">{{ t('searchBtn') }}</button>
        </div>
    </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

defineProps({
    modelValue: { type: String, default: '' }
});
defineEmits(['update:modelValue', 'search']);
</script>
