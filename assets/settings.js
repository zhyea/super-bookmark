/**
 * 设置模块：依赖 chrome.storage、BookmarkManagerI18n（i18n.js 需先加载）
 */
(function() {
    const SETTINGS_STORAGE_KEY = 'bookmarkManagerSettings';
    const CONTENT_WIDTH_VALUES = ['full', '1200', '960', '800'];
    const BACKGROUND_COLORS = [
        { value: '#e8f4fc' },
        { value: '#e8f5e9' },
        { value: '#f7f5f2' },
        { value: '#f5f5f5' },
        { value: '#ffffff' },
        { value: '#2d2d2d' }
    ];

    function I18n() {
        return window.BookmarkManagerI18n;
    }
    function t(key) {
        var L = I18n();
        return L && L.t ? L.t(key) : key;
    }
    function escAttr(s) {
        return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    }

    function normalizeHex(hex) {
        if (!hex || typeof hex !== 'string') return '#e8f4fc';
        var h = hex.trim();
        if (/^#[0-9a-fA-F]{6}$/.test(h)) return h.toLowerCase();
        return '#e8f4fc';
    }

    function presetMatchesColor(hex) {
        var n = normalizeHex(hex);
        return BACKGROUND_COLORS.some(function(c) { return c.value.toLowerCase() === n; });
    }

    function loadSettings(cb) {
        chrome.storage.local.get(SETTINGS_STORAGE_KEY, function(data) {
            const s = data[SETTINGS_STORAGE_KEY] || {};
            const L = I18n();
            const locale = L && L.normalizeLocale ? L.normalizeLocale(s.locale || (L.detectLocale && L.detectLocale())) : 'zh';
            if (L && L.setLocale) L.setLocale(locale);
            const contentWidth = s.contentWidth && CONTENT_WIDTH_VALUES.includes(s.contentWidth) ? s.contentWidth : '1200';
            const backgroundColor = normalizeHex(s.backgroundColor);
            const backgroundImage = (s.backgroundImage && typeof s.backgroundImage === 'string' && s.backgroundImage.startsWith('data:')) ? s.backgroundImage : '';
            window.__settings = {
                showActions: s.showActions !== false,
                columns: [3, 4, 5].includes(parseInt(s.columns, 10)) ? parseInt(s.columns, 10) : 3,
                contentWidth: contentWidth,
                backgroundColor: backgroundColor,
                backgroundImage: backgroundImage,
                replaceDefaultNewTab: s.replaceDefaultNewTab === true,
                locale: locale
            };
            if (cb) cb(window.__settings);
        });
    }

    function saveSettings(partial) {
        if (!window.__settings) window.__settings = {};
        Object.assign(window.__settings, partial);
        chrome.storage.local.set({ [SETTINGS_STORAGE_KEY]: window.__settings });
    }

    function applyContentWidthAndBackground() {
        const s = window.__settings;
        if (!s) return;
        const container = document.querySelector('.container');
        if (container) {
            CONTENT_WIDTH_VALUES.forEach(function(v) { container.classList.remove('width-' + v); });
            if (s.contentWidth && s.contentWidth !== '1200') container.classList.add('width-' + s.contentWidth);
        }
        if (s.backgroundColor) {
            document.body.style.backgroundColor = s.backgroundColor;
        }
        if (s.backgroundImage) {
            document.body.style.backgroundImage = 'url(' + s.backgroundImage + ')';
            document.body.style.backgroundSize = 'cover';
            document.body.style.backgroundPosition = 'center';
            document.body.style.backgroundRepeat = 'no-repeat';
        } else {
            document.body.style.backgroundImage = '';
            document.body.style.backgroundSize = '';
            document.body.style.backgroundPosition = '';
            document.body.style.backgroundRepeat = '';
        }
    }

    function renderSettingsUI(linksGrid) {
        const L = I18n();
        const BGK = (L && L.BG_PRESET_KEYS) || ['bgpBlue', 'bgpGreen', 'bgpBeige', 'bgpGray', 'bgpWhite', 'bgpDark'];
        const wrap = document.createElement('div');
        wrap.className = 'settings-wrap';
        const showActions = window.__settings.showActions;
        const cols = window.__settings.columns;
        const contentWidth = window.__settings.contentWidth || '1200';
        const backgroundColor = normalizeHex(window.__settings.backgroundColor);
        const hasBackgroundImage = !!(window.__settings.backgroundImage);
        const replaceDefaultNewTab = window.__settings.replaceDefaultNewTab === true;
        const locale = (window.__settings.locale && L && L.normalizeLocale) ? L.normalizeLocale(window.__settings.locale) : 'zh';
        const isPresetActive = presetMatchesColor(backgroundColor);
        const pickerValue = backgroundColor;
        const contentWidthHtml = CONTENT_WIDTH_VALUES.map(function(v) {
            const label = v === 'full' ? t('fullWidth') : v + 'px';
            return '<button type="button" class="settings-btn ' + (contentWidth === v ? 'active' : '') + '" data-setting="contentWidth" data-value="' + v + '">' + label + '</button>';
        }).join('');
        const bgColorHtml = BACKGROUND_COLORS.map(function(c, idx) {
            const isDark = c.value === '#2d2d2d';
            const activeClass = isPresetActive && backgroundColor.toLowerCase() === c.value.toLowerCase() ? 'active' : '';
            const darkClass = isDark ? ' settings-bg-dark' : '';
            const titleKey = BGK[idx] || 'bgpBlue';
            return '<button type="button" class="settings-btn settings-bg-swatch' + darkClass + ' ' + activeClass + '" data-setting="backgroundColor" data-value="' + c.value + '" style="background-color:' + c.value + '" title="' + escAttr(t(titleKey)) + '"></button>';
        }).join('');
        var LANG_KEYS = { zh: 'langZh', 'zh-TW': 'langZhTW', en: 'langEn', es: 'langEs', de: 'langDe', fr: 'langFr', ja: 'langJa', ko: 'langKo' };
        const langOpts = (L && L.CODES) ? L.CODES.map(function(code) {
            var lab = t(LANG_KEYS[code] || 'langEn');
            return '<option value="' + code + '"' + (locale === code ? ' selected' : '') + '>' + escAttr(lab) + '</option>';
        }).join('') : '';

        wrap.innerHTML = `
            <button type="button" class="settings-toggle" aria-label="${escAttr(t('settingsAria'))}">⚙️</button>
            <div class="settings-panel">
                <div class="settings-row">
                    <span class="settings-label">${escAttr(t('settingsLang'))}</span>
                    <div class="settings-btns">
                        <select class="settings-locale-select" id="settingsLocale" aria-label="${escAttr(t('settingsLang'))}">${langOpts}</select>
                    </div>
                </div>
                <div class="settings-row">
                    <span class="settings-label">${escAttr(t('settingsEditMode'))}</span>
                    <div class="settings-btns">
                        <button type="button" class="settings-btn ${showActions ? 'active' : ''}" data-setting="editMode" data-value="on">${escAttr(t('on'))}</button>
                        <button type="button" class="settings-btn ${!showActions ? 'active' : ''}" data-setting="editMode" data-value="off">${escAttr(t('off'))}</button>
                    </div>
                </div>
                <div class="settings-row">
                    <span class="settings-label">${escAttr(t('settingsColumns'))}</span>
                    <div class="settings-btns">
                        <button type="button" class="settings-btn ${cols === 3 ? 'active' : ''}" data-setting="columns" data-value="3">3</button>
                        <button type="button" class="settings-btn ${cols === 4 ? 'active' : ''}" data-setting="columns" data-value="4">4</button>
                        <button type="button" class="settings-btn ${cols === 5 ? 'active' : ''}" data-setting="columns" data-value="5">5</button>
                    </div>
                </div>
                <div class="settings-row">
                    <span class="settings-label">${escAttr(t('settingsWidth'))}</span>
                    <div class="settings-btns">
                        ${contentWidthHtml}
                    </div>
                </div>
                <div class="settings-row">
                    <span class="settings-label">${escAttr(t('settingsBg'))}</span>
                    <div class="settings-btns settings-bg-row">
                        ${bgColorHtml}
                        <label class="settings-color-picker-wrap" title="${escAttr(t('bgPickTitle'))}">
                            <span class="settings-color-picker-label">${escAttr(t('bgPick'))}</span>
                            <input type="color" id="settingsBgColorPicker" class="settings-color-picker" value="${pickerValue}" aria-label="${escAttr(t('bgPickAria'))}">
                        </label>
                    </div>
                </div>
                <div class="settings-row">
                    <span class="settings-label">${escAttr(t('settingsBgImg'))}</span>
                    <div class="settings-btns settings-bg-image-row">
                        <input type="file" accept="image/*" id="settingsBackgroundImage" class="settings-file-input" style="display:none">
                        <button type="button" class="settings-btn" id="settingsUploadBgBtn">${escAttr(t('chooseImg'))}</button>
                        <button type="button" class="settings-btn ${hasBackgroundImage ? '' : 'disabled'}" id="settingsClearBgBtn" ${!hasBackgroundImage ? 'disabled' : ''}>${escAttr(t('clear'))}</button>
                    </div>
                </div>
                <div class="settings-row">
                    <span class="settings-label">${escAttr(t('settingsNewTab'))}</span>
                    <div class="settings-btns">
                        <button type="button" class="settings-btn ${replaceDefaultNewTab ? 'active' : ''}" data-setting="replaceDefaultNewTab" data-value="on">${escAttr(t('on'))}</button>
                        <button type="button" class="settings-btn ${!replaceDefaultNewTab ? 'active' : ''}" data-setting="replaceDefaultNewTab" data-value="off">${escAttr(t('off'))}</button>
                    </div>
                </div>
                <div class="settings-row">
                    <span class="settings-label">${escAttr(t('settingsFolderManage'))}</span>
                    <div class="settings-btns">
                        <button type="button" class="settings-btn" id="settingsOpenBookmarkManager">${escAttr(t('openBookmarkManager'))}</button>
                    </div>
                </div>
                <div class="settings-row settings-row-help">
                    <a href="#" class="settings-help-link" id="settingsOpenGuide">${escAttr(t('helpLink'))}</a>
                </div>
            </div>
        `;
        document.body.appendChild(wrap);
        const toggle = wrap.querySelector('.settings-toggle');
        const panel = wrap.querySelector('.settings-panel');
        const localeSel = wrap.querySelector('#settingsLocale');

        if (localeSel) {
            localeSel.addEventListener('change', function() {
                var v = L && L.normalizeLocale ? L.normalizeLocale(this.value) : 'zh';
                if (L && L.setLocale) L.setLocale(v);
                saveSettings({ locale: v });
                wrap.remove();
                renderSettingsUI(linksGrid);
                if (L && L.applyMainPageStatic) L.applyMainPageStatic();
                window.dispatchEvent(new CustomEvent('bookmark-locale-changed'));
            });
            localeSel.addEventListener('click', function(e) { e.stopPropagation(); });
        }

        toggle.addEventListener('click', function(e) {
            e.stopPropagation();
            panel.classList.toggle('settings-panel-open');
        });
        document.addEventListener('click', function() {
            panel.classList.remove('settings-panel-open');
        });
        panel.addEventListener('click', function(e) { e.stopPropagation(); });

        function getCurrentBackgroundColor() {
            const bgBtn = wrap.querySelector('[data-setting="backgroundColor"].active');
            const picker = wrap.querySelector('#settingsBgColorPicker');
            if (bgBtn) return normalizeHex(bgBtn.dataset.value);
            if (picker && picker.value) return normalizeHex(picker.value);
            return normalizeHex(window.__settings.backgroundColor);
        }

        function applySettings() {
            const editModeOn = wrap.querySelector('[data-setting="editMode"][data-value="on"]').classList.contains('active');
            const showActions = editModeOn;
            const colBtn = wrap.querySelector('[data-setting="columns"].active');
            const columns = colBtn ? parseInt(colBtn.dataset.value, 10) : 3;
            const widthBtn = wrap.querySelector('[data-setting="contentWidth"].active');
            const cw = widthBtn ? widthBtn.dataset.value : '1200';
            const bg = getCurrentBackgroundColor();
            const replaceBtn = wrap.querySelector('[data-setting="replaceDefaultNewTab"][data-value="on"]');
            const replaceDefaultNewTab = replaceBtn && replaceBtn.classList.contains('active');
            const loc = localeSel && L && L.normalizeLocale ? L.normalizeLocale(localeSel.value) : (window.__settings.locale || 'zh');
            saveSettings({
                showActions: showActions,
                columns: columns,
                contentWidth: cw,
                backgroundColor: bg,
                backgroundImage: window.__settings.backgroundImage || '',
                replaceDefaultNewTab: replaceDefaultNewTab,
                locale: loc
            });
            document.body.classList.toggle('hide-card-actions', !showActions);
            applyContentWidthAndBackground();
            if (linksGrid) {
                const w = linksGrid.parentElement ? linksGrid.parentElement.clientWidth : 300;
                const effectiveCols = Math.min(columns, Math.max(1, Math.floor(w / 240)));
                linksGrid.style.gridTemplateColumns = `repeat(${effectiveCols}, minmax(240px, 1fr))`;
            }
        }

        applyContentWidthAndBackground();

        var TOGGLE_SETTINGS = ['editMode', 'columns', 'contentWidth', 'replaceDefaultNewTab'];
        TOGGLE_SETTINGS.forEach(function(name) {
            wrap.querySelectorAll('.settings-btn[data-setting="' + name + '"]').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    wrap.querySelectorAll('.settings-btn[data-setting="' + name + '"]').forEach(function(b) { b.classList.remove('active'); });
                    this.classList.add('active');
                    applySettings();
                });
            });
        });
        wrap.querySelectorAll('.settings-btn[data-setting="backgroundColor"]').forEach(function(btn) {
            btn.addEventListener('click', function() {
                wrap.querySelectorAll('.settings-btn[data-setting="backgroundColor"]').forEach(function(b) { b.classList.remove('active'); });
                this.classList.add('active');
                var picker = wrap.querySelector('#settingsBgColorPicker');
                if (picker) picker.value = normalizeHex(this.dataset.value);
                applySettings();
            });
        });
        var bgPicker = wrap.querySelector('#settingsBgColorPicker');
        if (bgPicker) {
            bgPicker.addEventListener('input', function() {
                wrap.querySelectorAll('.settings-btn[data-setting="backgroundColor"]').forEach(b => b.classList.remove('active'));
                saveSettings({ backgroundColor: normalizeHex(this.value) });
                applyContentWidthAndBackground();
            });
            bgPicker.addEventListener('change', function() {
                wrap.querySelectorAll('.settings-btn[data-setting="backgroundColor"]').forEach(b => b.classList.remove('active'));
                applySettings();
            });
        }
        var guideA = wrap.querySelector('#settingsOpenGuide');
        if (guideA) {
            guideA.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                panel.classList.remove('settings-panel-open');
                try {
                    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.runtime && chrome.runtime.getURL) {
                        chrome.tabs.create({ url: chrome.runtime.getURL('guide.html') });
                    } else {
                        window.open('guide.html', '_blank', 'noopener');
                    }
                } catch (err) {
                    window.open('guide.html', '_blank', 'noopener');
                }
            });
        }

        var openBookmarkManagerBtn = wrap.querySelector('#settingsOpenBookmarkManager');
        if (openBookmarkManagerBtn) {
            openBookmarkManagerBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
                    chrome.tabs.create({ url: 'chrome://bookmarks/' });
                }
            });
        }

        var fileInput = wrap.querySelector('#settingsBackgroundImage');
        var uploadBtn = wrap.querySelector('#settingsUploadBgBtn');
        var clearBtn = wrap.querySelector('#settingsClearBgBtn');
        if (uploadBtn && fileInput) {
            uploadBtn.addEventListener('click', function() { fileInput.click(); });
            fileInput.addEventListener('change', function() {
                var file = this.files && this.files[0];
                if (!file || !file.type.startsWith('image/')) return;
                var reader = new FileReader();
                reader.onload = function() {
                    var dataUrl = reader.result;
                    if (dataUrl.length > 900000) {
                        alert(t('imgTooBig'));
                        return;
                    }
                    saveSettings({ backgroundImage: dataUrl });
                    applyContentWidthAndBackground();
                    if (clearBtn) {
                        clearBtn.disabled = false;
                        clearBtn.classList.remove('disabled');
                    }
                };
                reader.readAsDataURL(file);
                this.value = '';
            });
        }
        if (clearBtn) {
            clearBtn.addEventListener('click', function() {
                if (this.disabled) return;
                saveSettings({ backgroundImage: '' });
                applyContentWidthAndBackground();
                this.disabled = true;
                this.classList.add('disabled');
            });
        }
    }

    window.BookmarkManagerSettings = {
        loadSettings: loadSettings,
        saveSettings: saveSettings,
        renderSettingsUI: renderSettingsUI
    };
})();
