<template>
  <Teleport to="body">
    <div v-if="open" class="simple-drawer-backdrop" @click.self="emit('close')"></div>
    <aside v-if="open" class="simple-drawer" :aria-label="t('simpleUiDrawerTitle')">
      <div class="simple-drawer-head">
        <span class="simple-drawer-title">{{ t('simpleUiDrawerTitle') }}</span>
        <button type="button" class="simple-drawer-close" :aria-label="t('simpleUiClose')" @click="emit('close')">×</button>
      </div>
      <div class="simple-drawer-tabs">
        <button type="button" class="simple-tab-btn" :class="{ active: activeTab === 'default' }" @click="emit('update:activeTab', 'default')">{{ t('simpleUiTabDefault') }}</button>
        <button type="button" class="simple-tab-btn" :class="{ active: activeTab === 'custom' }" @click="emit('update:activeTab', 'custom')">{{ t('simpleUiTabCustom') }}</button>
      </div>
      <div class="simple-drawer-body">
        <template v-if="activeTab === 'default'">
          <div class="simple-drawer-module">
            <div class="simple-drawer-module-title">{{ t('simpleUiBuiltinEngines') }}</div>
            <div class="simple-drawer-module-list">
              <div v-for="eng in catalog" :key="eng.key" class="simple-drawer-row">
                <img class="simple-drawer-icon" :src="engineIconPath(eng.key)" :alt="eng.label" />
                <span class="simple-drawer-label">{{ eng.label }}</span>
                <button
                  type="button"
                  :class="['simple-drawer-switch', { 'simple-drawer-switch--on': quickKeys.includes(eng.key) }]"
                  role="switch"
                  :aria-checked="quickKeys.includes(eng.key)"
                  :aria-label="t('simpleUiEngineQuickBar', { name: eng.label })"
                  :disabled="quickKeys.includes(eng.key) && quickKeys.length <= 1"
                  @click="emit('toggle-engine', eng.key)"
                />
              </div>
            </div>
          </div>
        </template>

        <template v-else>
          <div class="simple-drawer-module">
            <div class="simple-drawer-module-title">{{ editingCustomKey ? t('simpleUiEditEngineTitle') : t('simpleUiAddEngineTitle') }}</div>
            <input v-model.trim="customForm.name" class="custom-input" :placeholder="t('simpleUiNamePh')" @input="emit('clear-form-error')" />
            <div class="form-subtitle">{{ t('simpleUiUrlHint') }}</div>
            <textarea
              v-model.trim="customForm.urlTemplate"
              class="custom-textarea"
              :placeholder="t('simpleUiUrlPh')"
              @input="emit('custom-url-input')"
              @blur="emit('custom-url-blur')"
            ></textarea>
            <p v-if="customFormError" class="custom-form-error" role="alert">{{ customFormError }}</p>

            <div class="custom-form-actions">
              <button type="button" class="custom-submit-btn" @click="emit('submit-custom')">
                {{ editingCustomKey ? t('simpleUiBtnSave') : t('simpleUiBtnAdd') }}
              </button>
              <button v-if="editingCustomKey" type="button" class="custom-cancel-btn" @click="emit('cancel-edit')">{{ t('simpleUiCancelEdit') }}</button>
            </div>
          </div>

          <div v-if="customEngines.length" class="simple-drawer-module">
            <div class="simple-drawer-module-title">{{ t('simpleUiCustomEnginesTitle') }}</div>
            <div
              v-for="eng in customEngines"
              :key="eng.key"
              class="simple-drawer-row simple-drawer-row-custom"
              :class="{ 'simple-drawer-row-editing': editingCustomKey === eng.key }"
            >
              <span class="simple-drawer-label">{{ eng.name }}</span>
              <button
                type="button"
                :class="['simple-drawer-switch', { 'simple-drawer-switch--on': quickKeys.includes(eng.key) }]"
                role="switch"
                :aria-checked="quickKeys.includes(eng.key)"
                :aria-label="t('simpleUiEngineQuickBar', { name: eng.name })"
                :disabled="quickKeys.includes(eng.key) && quickKeys.length <= 1"
                @click="emit('toggle-engine', eng.key)"
              />
              <button type="button" class="custom-edit-btn" @click="emit('start-edit', eng)">{{ t('simpleUiEdit') }}</button>
              <button type="button" class="custom-remove-btn" @click="emit('remove-engine', eng.key)">{{ t('simpleUiDelete') }}</button>
            </div>
          </div>
        </template>
      </div>
    </aside>
  </Teleport>
</template>

<script setup>
import { useI18n } from 'vue-i18n';
import { engineIconPath } from '../../services/simpleSearchEngines.js';

const { t } = useI18n();

const props = defineProps({
  open: { type: Boolean, default: false },
  activeTab: { type: String, default: 'default' },
  catalog: { type: Array, default: () => [] },
  quickKeys: { type: Array, default: () => [] },
  customEngines: { type: Array, default: () => [] },
  customForm: { type: Object, default: () => ({ name: '', urlTemplate: '' }) },
  editingCustomKey: { type: String, default: null },
  customFormError: { type: String, default: '' }
});

const emit = defineEmits([
  'update:activeTab',
  'close',
  'toggle-engine',
  'submit-custom',
  'cancel-edit',
  'start-edit',
  'remove-engine',
  'clear-form-error',
  'custom-url-input',
  'custom-url-blur'
]);
</script>

<style scoped>
.simple-drawer-backdrop { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.35); z-index: 900; }
.simple-drawer { position: fixed; top: 0; right: 0; width: min(390px, 94vw); height: 100vh; background: #f3f4f6; box-shadow: -8px 0 24px #0000001a; z-index: 901; display: flex; flex-direction: column; }
.simple-drawer-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 14px; border-bottom: 1px solid #dbe6f1; background: #fff; }
.simple-drawer-title { font-size: 15px; font-weight: 700; color: #374151; margin: 0; }
.simple-drawer-close { border: none; background: transparent; font-size: 24px; line-height: 1; cursor: pointer; color: #6b7280; padding: 4px 8px; }
.simple-drawer-tabs { display: flex; background: #fff; border-bottom: none; }
.simple-tab-btn {
  flex: 1;
  border: none;
  background: #fff;
  padding: 10px 0;
  cursor: pointer;
  color: #666;
  border-bottom: 1px solid transparent;
  box-sizing: border-box;
}
.simple-tab-btn.active { color: #222; font-weight: 600; border-bottom-color: #93c5fd; }
.simple-drawer-body { flex: 1; overflow-y: auto; padding: 12px; }
.simple-drawer-scale { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px; margin-bottom: 10px; }
.simple-drawer-scale-label { font-size: 14px; color: #374151; margin-bottom: 8px; }
.simple-drawer-range { width: 100%; }
.simple-drawer-row { display: flex; align-items: center; gap: 12px; padding: 12px 10px; margin-bottom: 8px; background: #fff; border-radius: 12px; border: 1px solid #e5e7eb; }
.simple-drawer-icon { width: 24px; height: 24px; object-fit: contain; flex-shrink: 0; }
.simple-drawer-label { flex: 1; font-size: 15px; color: #374151; }
.simple-drawer-switch {
  position: relative;
  width: 44px;
  height: 24px;
  flex-shrink: 0;
  border: none;
  border-radius: 999px;
  background: #d1d5db;
  cursor: pointer;
  padding: 0;
  transition: background 0.2s;
}
.simple-drawer-switch::after {
  content: '';
  position: absolute;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  top: 3px;
  left: 3px;
  box-shadow: 0 1px 2px #00000033;
  transition: transform 0.2s;
}
.simple-drawer-switch--on { background: #4f9dff; }
.simple-drawer-switch--on::after { transform: translateX(20px); }
.simple-drawer-switch:disabled { opacity: 0.45; cursor: not-allowed; }
.simple-drawer-switch:focus-visible { box-shadow: 0 0 0 2px #4f9dff66; }
.custom-form-error { margin: 8px 0 0; font-size: 13px; color: #b91c1c; }
.custom-form-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 0;
  padding: 12px 12px 8px;
  margin-bottom: 12px;
}
.form-title { font-size: 16px; color: #333; margin-bottom: 10px; }
.form-subtitle { font-size: 14px; color: #444; margin: 10px 0 6px; }
.custom-input,
.custom-textarea {
  width: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 8px 10px;
  box-sizing: border-box;
  font-size: 14px;
  font-family: inherit;
  color: #374151;
  background: #fff;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.custom-input::placeholder,
.custom-textarea::placeholder {
  color: #9ca3af;
}
.custom-input:focus,
.custom-textarea:focus {
  outline: none;
  color: #374151;
  border-color: #4285f4;
  box-shadow: 0 0 0 2px rgba(66, 133, 244, 0.2);
}
.custom-textarea { min-height: 74px; resize: vertical; }
.custom-form-actions { margin-top: 10px; display: flex; flex-direction: column; gap: 8px; }
.custom-submit-btn {
  width: 100%;
  border: 1px solid #e8e8e8;
  background: #f5f5f5;
  color: #595959;
  border-radius: 4px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.2s, color 0.2s, border-color 0.2s;
}

.custom-submit-btn:hover {
  background: #e8e8e8;
  color: #262626;
}

.custom-cancel-btn {
  width: 100%;
  border: 1px solid #e8e8e8;
  background: #f5f5f5;
  color: #595959;
  border-radius: 4px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.2s, color 0.2s, border-color 0.2s;
}

.custom-cancel-btn:hover {
  background: #e8e8e8;
  color: #262626;
}
.simple-drawer-row-custom { flex-wrap: wrap; }
.simple-drawer-row-editing { border-color: #93c5fd; box-shadow: 0 0 0 1px #93c5fd; }
.custom-edit-btn { border: none; background: #e5e7eb; color: #374151; border-radius: 6px; padding: 5px 10px; cursor: pointer; font-size: 12px; }
.custom-remove-btn { border: none; background: #ef4444; color: #fff; border-radius: 6px; padding: 5px 10px; cursor: pointer; font-size: 12px; }

.simple-drawer-module {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 0;
  padding: 12px 12px 8px;
  margin-bottom: 12px;
}

.simple-drawer-module-title {
  font-size: 15px;
  font-weight: 700;
  color: #374151;
  margin-bottom: 12px;
}

.simple-drawer-module-control + .simple-drawer-module-control {
  margin-top: 12px;
}

.simple-drawer-module-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
