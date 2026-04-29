<template>
    <div
        ref="tagWrapRef"
        class="input-tag-wrap"
        role="group"
        :aria-label="t('tagInputAria')"
        @click="focusTagInput"
    >
        <span v-for="(tag, idx) in modelValue" :key="tag + idx" class="input-tag-pill">
            <span class="input-tag-pill-text">{{ tag }}</span>
            <button
                type="button"
                class="input-tag-remove"
                :aria-label="t('removeTagAria')"
                @click.prevent.stop="removeTag(tag)"
            >
                ×
            </button>
        </span>
        <input
            ref="tagInputRef"
            v-model="tagInputVal"
            type="text"
            class="input-tag-inner"
            :placeholder="placeholder"
            :maxlength="maxLength"
            autocomplete="off"
            @keydown="onTagKeydown"
            @input="onTagInput"
            @blur="onTagBlur"
        />
    </div>
</template>

<script setup>
import { ref, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps({
    modelValue: { type: Array, default: () => [] },
    maxTags: { type: Number, default: 3 },
    maxLength: { type: Number, default: 16 },
    placeholder: { type: String, default: '' }
});
const emit = defineEmits(['update:modelValue']);

const { t } = useI18n();

const tagInputVal = ref('');
const tagInputRef = ref(null);
const tagWrapRef = ref(null);

function focusTagInput() {
    tagInputRef.value?.focus();
}

function removeTag(tag) {
    const idx = props.modelValue.indexOf(tag);
    if (idx !== -1) {
        const next = props.modelValue.slice();
        next.splice(idx, 1);
        emit('update:modelValue', next);
    }
    nextTick(() => tagInputRef.value?.focus());
}

function addTag(val) {
    const t0 = String(val || '').trim().slice(0, props.maxLength);
    if (!t0) return;
    if (props.modelValue.length >= props.maxTags) return;
    if (props.modelValue.indexOf(t0) === -1) {
        emit('update:modelValue', [...props.modelValue, t0]);
    }
}

function commitTagInput(e) {
    const raw = tagInputVal.value;
    const trimmed = raw.trim();
    if (!trimmed) {
        if (e && (e.key === ',' || e.key === '，' || e.key === ' ' || e.code === 'Space')) e.preventDefault();
        return;
    }
    if (props.modelValue.length >= props.maxTags) {
        if (e && e.key === 'Tab') return;
        if (e && (e.key === 'Enter' || e.key === ',' || e.key === '，' || e.key === ' ' || e.code === 'Space'))
            e.preventDefault();
        return;
    }
    if (e) e.preventDefault();
    addTag(raw);
    tagInputVal.value = '';
}

function onTagKeydown(e) {
    if (e.key === 'Enter') {
        commitTagInput(e);
        return;
    }
    if (e.key === ' ' || e.code === 'Space') {
        commitTagInput(e);
        return;
    }
    if (e.key === 'Tab' && tagInputRef.value && tagInputRef.value.value.trim()) {
        commitTagInput(e);
        return;
    }
    if (e.key === ',' || e.key === '，') {
        commitTagInput(e);
        return;
    }
    if (e.key === 'Backspace' && tagInputRef.value && tagInputRef.value.value === '' && props.modelValue.length) {
        const next = props.modelValue.slice();
        next.pop();
        emit('update:modelValue', next);
    }
}

function onTagInput() {
    const v = tagInputVal.value;
    if (/[,，\s]/.test(v)) {
        const segs = v
            .split(/[,，\s]+/)
            .map((s) => s.trim())
            .filter(Boolean);
        const trailing = /[,，\s]$/.test(v);
        if (!trailing && segs.length) {
            segs.slice(0, -1).forEach((p) => addTag(p));
            tagInputVal.value = segs[segs.length - 1] || '';
        } else {
            segs.forEach((p) => addTag(p));
            tagInputVal.value = '';
        }
    }
}

function onTagBlur() {
    const t0 = tagInputVal.value.trim();
    if (t0) {
        addTag(t0);
        tagInputVal.value = '';
    }
}

defineExpose({ focus: focusTagInput });
</script>

<style scoped>
.input-tag-wrap {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 8px;
    min-height: 32px;
    padding: 1px 11px;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    background: #fff;
    transition:
        border-color 0.2s,
        box-shadow 0.2s;
}
.input-tag-wrap:hover {
    border-color: #c0c4cc;
}
.input-tag-wrap:focus-within {
    border-color: #409eff;
    outline: none;
    box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}
.input-tag-pill {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    height: 24px;
    padding: 0 8px;
    font-size: 12px;
    line-height: 22px;
    color: #909399;
    background: #f4f4f5;
    border: 1px solid #e9e9eb;
    border-radius: 4px;
}
.input-tag-pill .input-tag-pill-text {
    margin-right: 2px;
}
.input-tag-pill .input-tag-remove {
    padding: 0;
    margin: 0;
    width: 14px;
    height: 14px;
    border: none;
    background: transparent;
    color: #909399;
    cursor: pointer;
    border-radius: 50%;
    font-size: 12px;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition:
        color 0.2s,
        background 0.2s;
}
.input-tag-pill .input-tag-remove:hover {
    color: #409eff;
    background: #ecf5ff;
}
.input-tag-inner {
    flex: 1;
    min-width: 80px;
    height: 30px;
    padding: 0 4px;
    border: none;
    font-size: 14px;
    outline: none;
    background: transparent;
}
</style>
