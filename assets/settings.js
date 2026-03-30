/**
 * 设置模块：依赖 i18n.js、settings-panel-template.js（需先于本文件加载）、chrome.storage
 */
(function() {
    const SETTINGS_STORAGE_KEY = 'bookmarkManagerSettings';
    const DEFAULT_BG_PATH = 'assets/imgs/default_bg.webp';

    function tpl() {
        return window.SettingsPanelTemplate;
    }

    function I18n() {
        return window.BookmarkManagerI18n;
    }
    function t(key) {
        let L = I18n();
        return L && L.t ? L.t(key) : key;
    }
    function escAttr(s) {
        return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    }

    function normalizeHex(hex) {
        if (!hex || typeof hex !== 'string') return '#e8f4fc';
        let h = hex.trim();
        if (/^#[0-9a-fA-F]{6}$/.test(h)) return h.toLowerCase();
        return '#e8f4fc';
    }

    function presetMatchesColor(hex) {
        let n = normalizeHex(hex);
        const SPT = tpl();
        const BG = SPT && SPT.BACKGROUND_COLORS;
        return BG ? BG.some(function(c) { return c.value.toLowerCase() === n; }) : false;
    }

    function loadSettings(cb) {
        chrome.storage.local.get(SETTINGS_STORAGE_KEY, function(data) {
            const s = data[SETTINGS_STORAGE_KEY] || {};
            const L = I18n();
            const locale = L && L.normalizeLocale ? L.normalizeLocale(s.locale || (L.detectLocale && L.detectLocale())) : 'zh';
            if (L && L.setLocale) L.setLocale(locale);
            const CV = tpl() && tpl().CONTENT_WIDTH_VALUES;
            const contentWidth = s.contentWidth && CV && CV.includes(s.contentWidth) ? s.contentWidth : '1200';
            const maxC = tpl() && typeof tpl().maxColumnsForContentWidth === 'function' ? tpl().maxColumnsForContentWidth(contentWidth) : 5;
            let colNum = [3, 4, 5].includes(parseInt(s.columns, 10)) ? parseInt(s.columns, 10) : 3;
            if (colNum > maxC) colNum = maxC;
            const backgroundColor = normalizeHex(s.backgroundColor);
            const backgroundImage = (s.backgroundImage && typeof s.backgroundImage === 'string' && s.backgroundImage.startsWith('data:')) ? s.backgroundImage : '';
            const disableDefaultBg = s.disableDefaultBg === true;
            const BM = window.BookmarkManager;
            const visibleRoots = BM && BM.normalizeVisibleRoots
                ? BM.normalizeVisibleRoots(s.visibleRoots)
                : { bar: true, other: true, mobile: true, others: true };
            window.__settings = {
                // 首次安装或未保存时：编辑模式默认关闭
                showActions: s.showActions === true,
                columns: colNum,
                contentWidth: contentWidth,
                backgroundColor: backgroundColor,
                backgroundImage: backgroundImage,
                disableDefaultBg: disableDefaultBg,
                replaceDefaultNewTab: s.replaceDefaultNewTab === true,
                locale: locale,
                visibleRoots: visibleRoots
            };
            if (typeof document !== 'undefined' && document.body) {
                document.body.classList.toggle('hide-card-actions', !window.__settings.showActions);
            }
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
            const CV = tpl() && tpl().CONTENT_WIDTH_VALUES;
            if (CV) CV.forEach(function(v) { container.classList.remove('width-' + v); });
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
        } else if (s.disableDefaultBg !== true) {
            // Default background image (low priority). Can be removed by clicking "Clear".
            document.body.style.backgroundImage = 'url(' + DEFAULT_BG_PATH + ')';
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
        const SPT = tpl();
        if (!SPT || typeof SPT.buildSettingsPanelHtml !== 'function') return;
        const L = I18n();
        const wrap = document.createElement('div');
        wrap.className = 'settings-wrap';
        const showActions = window.__settings.showActions;
        const cols = window.__settings.columns;
        const contentWidth = window.__settings.contentWidth || '1200';
        const backgroundColor = normalizeHex(window.__settings.backgroundColor);
        const hasBackgroundImage = !!(window.__settings.backgroundImage) || window.__settings.disableDefaultBg !== true;
        const replaceDefaultNewTab = window.__settings.replaceDefaultNewTab === true;
        const locale = (window.__settings.locale && L && L.normalizeLocale) ? L.normalizeLocale(window.__settings.locale) : 'zh';
        const isPresetActive = presetMatchesColor(backgroundColor);
        const pickerValue = backgroundColor;

        wrap.innerHTML = SPT.buildSettingsPanelHtml({
            t: t,
            escAttr: escAttr,
            showActions: showActions,
            cols: cols,
            contentWidth: contentWidth,
            backgroundColor: backgroundColor,
            hasBackgroundImage: hasBackgroundImage,
            replaceDefaultNewTab: replaceDefaultNewTab,
            locale: locale,
            isPresetActive: isPresetActive,
            pickerValue: pickerValue,
            L: L
        });
        document.body.appendChild(wrap);
        const toggle = wrap.querySelector('.settings-toggle');
        const panel = wrap.querySelector('.settings-panel');
        const localeSel = wrap.querySelector('#settingsLocale');

        if (localeSel) {
            localeSel.addEventListener('change', function() {
                let v = L && L.normalizeLocale ? L.normalizeLocale(this.value) : 'zh';
                if (L && L.setLocale) L.setLocale(v);
                saveSettings({ locale: v });
                let keepPanelOpen = panel.classList.contains('settings-panel-open');
                wrap.remove();
                renderSettingsUI(linksGrid);
                if (keepPanelOpen) {
                    let newPanel = document.querySelector('.settings-panel');
                    if (newPanel) newPanel.classList.add('settings-panel-open');
                }
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

        (function bindSettingsPanelScrollbar() {
            const panelContent = wrap.querySelector('.settings-panel-content');
            if (!panelContent) return;
            let hideTimer = null;
            const HIDE_MS = 1200;
            function showScrollbar() {
                panelContent.classList.add('settings-scrollbar--visible');
                if (hideTimer) clearTimeout(hideTimer);
                hideTimer = setTimeout(function() {
                    hideTimer = null;
                    panelContent.classList.remove('settings-scrollbar--visible');
                }, HIDE_MS);
            }
            panelContent.addEventListener('scroll', showScrollbar, { passive: true });
        })();

        function getCurrentBackgroundColor() {
            const bgBtn = wrap.querySelector('[data-setting="backgroundColor"].active');
            const picker = wrap.querySelector('#settingsBgColorPicker');
            if (bgBtn && bgBtn.dataset.value && bgBtn.dataset.value !== 'custom') return normalizeHex(bgBtn.dataset.value);
            if (picker && picker.value) return normalizeHex(picker.value);
            return normalizeHex(window.__settings.backgroundColor);
        }

        function applySettings() {
            const editModeSwitch = wrap.querySelector('#settingsEditModeSwitch');
            const editModeOn = !!(editModeSwitch && editModeSwitch.checked);
            const showActions = editModeOn;
            const widthBtn = wrap.querySelector('[data-setting="contentWidth"].active');
            const cw = widthBtn ? widthBtn.dataset.value : '1200';
            const SPT = tpl();
            const maxCols = SPT && SPT.maxColumnsForContentWidth ? SPT.maxColumnsForContentWidth(cw) : 5;
            let colBtn = wrap.querySelector('[data-setting="columns"].active');
            let columns = colBtn ? parseInt(colBtn.dataset.value, 10) : 3;
            if (columns > maxCols) {
                columns = maxCols;
                wrap.querySelectorAll('[data-setting="columns"]').forEach(function(b) {
                    b.classList.remove('active');
                    if (parseInt(b.dataset.value, 10) === maxCols) b.classList.add('active');
                });
            }
            const bg = getCurrentBackgroundColor();
            const replaceSwitch = wrap.querySelector('#settingsReplaceNewTabSwitch');
            const replaceDefaultNewTab = !!(replaceSwitch && replaceSwitch.checked);
            const loc = localeSel && L && L.normalizeLocale ? L.normalizeLocale(localeSel.value) : (window.__settings.locale || 'zh');
            saveSettings({
                showActions: showActions,
                columns: columns,
                contentWidth: cw,
                backgroundColor: bg,
                backgroundImage: window.__settings.backgroundImage || '',
                disableDefaultBg: window.__settings.disableDefaultBg === true,
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

        function refreshColumnButtonStates() {
            const SPT = tpl();
            if (!SPT || typeof SPT.maxColumnsForContentWidth !== 'function') return;
            const widthBtn = wrap.querySelector('[data-setting="contentWidth"].active');
            const cw = widthBtn ? widthBtn.dataset.value : '1200';
            const maxCols = SPT.maxColumnsForContentWidth(cw);
            wrap.querySelectorAll('.settings-btn[data-setting="columns"]').forEach(function(btn) {
                const n = parseInt(btn.dataset.value, 10);
                const dis = n > maxCols;
                btn.disabled = dis;
                btn.classList.toggle('disabled', dis);
                btn.title = dis ? t('settingsColumnDisabled') : '';
            });
        }
        refreshColumnButtonStates();

        let TOGGLE_SETTINGS = ['columns', 'contentWidth'];
        TOGGLE_SETTINGS.forEach(function(name) {
            wrap.querySelectorAll('.settings-btn[data-setting="' + name + '"]').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    if (name === 'columns' && this.disabled) return;
                    wrap.querySelectorAll('.settings-btn[data-setting="' + name + '"]').forEach(function(b) { b.classList.remove('active'); });
                    this.classList.add('active');
                    if (name === 'contentWidth') {
                        refreshColumnButtonStates();
                        const SPT = tpl();
                        const wb = wrap.querySelector('[data-setting="contentWidth"].active');
                        const cw = wb ? wb.dataset.value : '1200';
                        const maxCols = SPT && SPT.maxColumnsForContentWidth ? SPT.maxColumnsForContentWidth(cw) : 5;
                        const activeCol = wrap.querySelector('[data-setting="columns"].active');
                        const cur = activeCol ? parseInt(activeCol.dataset.value, 10) : 3;
                        if (cur > maxCols) {
                            wrap.querySelectorAll('[data-setting="columns"]').forEach(function(b) {
                                b.classList.remove('active');
                                if (parseInt(b.dataset.value, 10) === maxCols) b.classList.add('active');
                            });
                        }
                    }
                    applySettings();
                });
            });
        });
        let editModeSwitchEl = wrap.querySelector('#settingsEditModeSwitch');
        if (editModeSwitchEl) editModeSwitchEl.addEventListener('change', applySettings);
        let replaceNewTabSwitchEl = wrap.querySelector('#settingsReplaceNewTabSwitch');
        if (replaceNewTabSwitchEl) replaceNewTabSwitchEl.addEventListener('change', applySettings);
        wrap.querySelectorAll('.settings-btn[data-setting="backgroundColor"]').forEach(function(btn) {
            btn.addEventListener('click', function() {
                wrap.querySelectorAll('.settings-btn[data-setting="backgroundColor"]').forEach(function(b) { b.classList.remove('active'); });
                this.classList.add('active');
                let picker = wrap.querySelector('#settingsBgColorPicker');
                if (picker && this.dataset.value !== 'custom') {
                    picker.value = normalizeHex(this.dataset.value);
                }
                if (picker && this.dataset.value === 'custom') {
                    picker.click();
                }
                applySettings();
            });
        });
        let bgPicker = wrap.querySelector('#settingsBgColorPicker');
        if (bgPicker) {
            bgPicker.addEventListener('input', function() {
                wrap.querySelectorAll('.settings-btn[data-setting="backgroundColor"]').forEach(b => b.classList.remove('active'));
                let customBtn = wrap.querySelector('.settings-btn[data-setting="backgroundColor"][data-value="custom"]');
                if (customBtn) customBtn.classList.add('active');
                saveSettings({ backgroundColor: normalizeHex(this.value) });
                applyContentWidthAndBackground();
            });
            bgPicker.addEventListener('change', function() {
                wrap.querySelectorAll('.settings-btn[data-setting="backgroundColor"]').forEach(b => b.classList.remove('active'));
                applySettings();
            });
        }
        let guideA = wrap.querySelector('#settingsOpenGuide');
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

        let openBookmarkManagerBtn = wrap.querySelector('#settingsOpenBookmarkManager');
        if (openBookmarkManagerBtn) {
            openBookmarkManagerBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
                    chrome.tabs.create({ url: 'chrome://bookmarks/' });
                }
            });
        }

        let fileInput = wrap.querySelector('#settingsBackgroundImage');
        let uploadBtn = wrap.querySelector('#settingsUploadBgBtn');
        let clearBtn = wrap.querySelector('#settingsClearBgBtn');
        if (uploadBtn && fileInput) {
            uploadBtn.addEventListener('click', function() { fileInput.click(); });
            fileInput.addEventListener('change', function() {
                let file = this.files && this.files[0];
                if (!file || !file.type.startsWith('image/')) return;
                let reader = new FileReader();
                reader.onload = function() {
                    let dataUrl = reader.result;
                    if (dataUrl.length > 900000) {
                        alert(t('imgTooBig'));
                        return;
                    }
                    saveSettings({ backgroundImage: dataUrl, disableDefaultBg: false });
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
                // Clear ALL background images, including the default background.
                saveSettings({ backgroundImage: '', disableDefaultBg: true });
                applyContentWidthAndBackground();
                this.disabled = true;
                this.classList.add('disabled');
            });
        }

        (function bindVisibleRootButtons() {
            let container = wrap.querySelector('#settingsVisibleRootsBtns');
            if (!container || typeof chrome === 'undefined' || !chrome.bookmarks || !chrome.bookmarks.getTree) return;
            let BM = window.BookmarkManager;
            if (!BM || !BM.classifyBuiltinRoot || !BM.normalizeVisibleRoots) return;
            chrome.bookmarks.getTree(function(tree) {
                let roots = (tree && tree[0] && tree[0].children) ? tree[0].children : [];
                let folders = roots.filter(function(n) { return !n.url && n.children; });
                let vr = BM.normalizeVisibleRoots(window.__settings && window.__settings.visibleRoots);
                let seen = { bar: false, other: false, mobile: false };
                let html = [];
                for (let i = 0; i < folders.length; i++) {
                    let node = folders[i];
                    let rk = BM.classifyBuiltinRoot(node);
                    if (!rk || seen[rk]) continue;
                    seen[rk] = true;
                    let on = vr[rk] !== false;
                    html.push('<button type="button" class="settings-btn settings-root-toggle' + (on ? ' active' : '') + '" data-root-key="' + rk + '" aria-pressed="' + (on ? 'true' : 'false') + '">' + escAttr(node.title || '') + '</button>');
                }
                let othersOn = vr.others !== false;
                html.push('<button type="button" class="settings-btn settings-root-toggle' + (othersOn ? ' active' : '') + '" data-root-key="others" aria-pressed="' + (othersOn ? 'true' : 'false') + '">' + escAttr(t('settingsRootOthers')) + '</button>');
                container.innerHTML = html.join('');
                container.querySelectorAll('.settings-root-toggle').forEach(function(btn) {
                    btn.addEventListener('click', function(ev) {
                        ev.stopPropagation();
                        let key = this.dataset.rootKey;
                        if (!key) return;
                        let base = (window.__settings && window.__settings.visibleRoots) || BM.DEFAULT_VISIBLE_ROOTS;
                        let next = {
                            bar: !!base.bar,
                            other: !!base.other,
                            mobile: !!base.mobile,
                            others: !!base.others
                        };
                        if (next[key]) {
                            let cnt = (next.bar ? 1 : 0) + (next.other ? 1 : 0) + (next.mobile ? 1 : 0) + (next.others ? 1 : 0);
                            if (cnt <= 1) return;
                            next[key] = false;
                        } else {
                            next[key] = true;
                        }
                        next = BM.normalizeVisibleRoots(next);
                        saveSettings({ visibleRoots: next });
                        container.querySelectorAll('.settings-root-toggle').forEach(function(b) {
                            let k2 = b.dataset.rootKey;
                            let active = next[k2] !== false;
                            b.classList.toggle('active', active);
                            b.setAttribute('aria-pressed', active ? 'true' : 'false');
                        });
                        window.dispatchEvent(new CustomEvent('bookmark-visible-roots-changed'));
                    });
                });
            });
        })();

        (function bindBackupActions() {
            const BB = window.BookmarkBackup;
            if (!BB) return;
            const restoreBtn = wrap.querySelector('#settingsBackupRestoreDefault');
            const exportBtn = wrap.querySelector('#settingsBackupExport');
            const importBtn = wrap.querySelector('#settingsBackupImport');
            const fileInput = wrap.querySelector('#settingsBackupFile');
            if (restoreBtn) {
                restoreBtn.addEventListener('click', function(ev) {
                    ev.stopPropagation();
                    if (!confirm(t('backupConfirmRestore'))) return;
                    BB.restoreFactoryDefaults(function(err) {
                        if (err) {
                            alert(t('backupFail') + (err.message || String(err)));
                            return;
                        }
                        alert(t('backupRestoreDone'));
                        location.reload();
                    });
                });
            }
            if (exportBtn) {
                exportBtn.addEventListener('click', function(ev) {
                    ev.stopPropagation();
                    const pwd = prompt(t('backupPwdExport'), '');
                    if (pwd === null) return;
                    BB.exportBackupToFile(pwd, 'super-bookmark-backup', function(err) {
                        if (err) {
                            alert(t('backupFail') + (err.message || String(err)));
                            return;
                        }
                        alert(t('backupExportDone'));
                    });
                });
            }
            if (importBtn && fileInput) {
                importBtn.addEventListener('click', function(ev) {
                    ev.stopPropagation();
                    fileInput.value = '';
                    fileInput.click();
                });
                fileInput.addEventListener('change', function() {
                    const f = this.files && this.files[0];
                    if (!f) return;
                    if (!confirm(t('backupConfirmImport'))) {
                        this.value = '';
                        return;
                    }
                    const pwd = prompt(t('backupPwdImport'), '');
                    if (pwd === null) {
                        this.value = '';
                        return;
                    }
                    BB.importBackupFromFile(f, pwd, function(err) {
                        fileInput.value = '';
                        if (err) {
                            if (err.message === 'DECRYPT_FAIL') alert(t('backupWrongPwd'));
                            else alert(t('backupFail') + (err.message || String(err)));
                            return;
                        }
                        alert(t('backupImportDone'));
                        location.reload();
                    });
                });
            }
        })();
    }

    window.BookmarkManagerSettings = {
        loadSettings: loadSettings,
        saveSettings: saveSettings,
        renderSettingsUI: renderSettingsUI
    };
})();
