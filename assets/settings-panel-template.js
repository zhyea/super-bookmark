/**
 * 设置抽屉 DOM 字符串模板（供 settings.js 注入 innerHTML）
 * 需在 settings.js 之前加载；挂到 global.SettingsPanelTemplate
 */
(function(global) {
    const CONTENT_WIDTH_VALUES = ['full', '1200', '960', '800'];

    const BACKGROUND_COLORS = [
        { value: '#e8f4fc' },
        { value: '#e8f5e9' },
        { value: '#f7f5f2' },
        { value: '#f5f5f5' },
        { value: '#ffffff' },
        { value: '#2d2d2d' }
    ];

    const LANG_KEYS = {
        zh: 'langZh',
        'zh-TW': 'langZhTW',
        en: 'langEn',
        es: 'langEs',
        de: 'langDe',
        fr: 'langFr',
        it: 'langIt',
        ru: 'langRu',
        ar: 'langAr',
        ja: 'langJa',
        ko: 'langKo'
    };

    const DEFAULT_BGK = ['bgpBlue', 'bgpGreen', 'bgpBeige', 'bgpGray', 'bgpWhite', 'bgpDark'];

    /**
     * @param {object} o
     * @param {function(string): string} o.t i18n
     * @param {function(string): string} o.escAttr
     * @param {boolean} o.showActions
     * @param {number} o.cols
     * @param {string} o.contentWidth
     * @param {string} o.backgroundColor 已 normalize 的 hex
     * @param {boolean} o.hasBackgroundImage
     * @param {boolean} o.replaceDefaultNewTab
     * @param {string} o.locale 已 normalize
     * @param {boolean} o.isPresetActive
     * @param {string} o.pickerValue
     * @param {object|null} o.L BookmarkManagerI18n
     */
    function buildSettingsPanelHtml(o) {
        const t = o.t;
        const escAttr = o.escAttr;
        const L = o.L;
        const BGK = (L && L.BG_PRESET_KEYS) || DEFAULT_BGK;

        const contentWidthHtml = CONTENT_WIDTH_VALUES.map(function(v) {
            const label = v === 'full' ? t('fullWidth') : v + 'px';
            return '<button type="button" class="settings-btn ' + (o.contentWidth === v ? 'active' : '') + '" data-setting="contentWidth" data-value="' + v + '">' + label + '</button>';
        }).join('');

        const bgColorHtml = BACKGROUND_COLORS.map(function(c, idx) {
            const isDark = c.value === '#2d2d2d';
            const activeClass = o.isPresetActive && o.backgroundColor.toLowerCase() === c.value.toLowerCase() ? 'active' : '';
            const darkClass = isDark ? ' settings-bg-dark' : '';
            const titleKey = BGK[idx] || 'bgpBlue';
            return '<button type="button" class="settings-btn settings-bg-swatch' + darkClass + ' ' + activeClass + '" data-setting="backgroundColor" data-value="' + c.value + '" style="background-color:' + c.value + '" title="' + escAttr(t(titleKey)) + '"></button>';
        }).join('');

        const langOpts = (L && L.CODES) ? L.CODES.map(function(code) {
            const lab = t(LANG_KEYS[code] || 'langEn');
            return '<option value="' + code + '"' + (o.locale === code ? ' selected' : '') + '>' + escAttr(lab) + '</option>';
        }).join('') : '';

        const cols = o.cols;
        const customActive = !o.isPresetActive ? 'active' : '';

        return (
            '<button type="button" class="settings-toggle" aria-label="' + escAttr(t('settingsAria')) + '">' +
                '<span class="settings-toggle-breadcrumb" aria-hidden="true"></span>' +
            '</button>' +
            '<div class="settings-panel">' +
                '<div class="settings-panel-title">' + escAttr(t('settingsTitle')) + '</div>' +
                '<div class="settings-panel-content">' +
                '<div class="settings-section">' +
                    '<div class="settings-section-title">' + escAttr(t('settingsGroupGeneral')) + '</div>' +
                    '<div class="settings-row settings-row-inline">' +
                        '<span class="settings-label">' + escAttr(t('settingsLang')) + '</span>' +
                        '<div class="settings-btns">' +
                            '<select class="settings-locale-select" id="settingsLocale" aria-label="' + escAttr(t('settingsLang')) + '">' + langOpts + '</select>' +
                        '</div>' +
                    '</div>' +
                    '<div class="settings-row settings-row-inline">' +
                        '<span class="settings-label">' + escAttr(t('settingsEditMode')) + '</span>' +
                        '<div class="settings-btns settings-switch-row">' +
                            '<label class="settings-switch" title="' + escAttr(t('settingsEditMode')) + '">' +
                                '<input type="checkbox" id="settingsEditModeSwitch"' + (o.showActions ? ' checked' : '') + '>' +
                                '<span class="settings-switch-slider"></span>' +
                            '</label>' +
                        '</div>' +
                    '</div>' +
                    '<div class="settings-row settings-row-inline">' +
                        '<span class="settings-label">' + escAttr(t('settingsNewTab')) + '</span>' +
                        '<div class="settings-btns settings-switch-row">' +
                            '<label class="settings-switch" title="' + escAttr(t('settingsNewTab')) + '">' +
                                '<input type="checkbox" id="settingsReplaceNewTabSwitch"' + (o.replaceDefaultNewTab ? ' checked' : '') + '>' +
                                '<span class="settings-switch-slider"></span>' +
                            '</label>' +
                        '</div>' +
                    '</div>' +
                '</div>' +

                '<div class="settings-section">' +
                    '<div class="settings-section-title">' + escAttr(t('settingsGroupView')) + '</div>' +
                    '<div class="settings-row">' +
                        '<span class="settings-label">' + escAttr(t('settingsColumns')) + '</span>' +
                        '<div class="settings-btns">' +
                            '<button type="button" class="settings-btn' + (cols === 3 ? ' active' : '') + '" data-setting="columns" data-value="3">3</button>' +
                            '<button type="button" class="settings-btn' + (cols === 4 ? ' active' : '') + '" data-setting="columns" data-value="4">4</button>' +
                            '<button type="button" class="settings-btn' + (cols === 5 ? ' active' : '') + '" data-setting="columns" data-value="5">5</button>' +
                        '</div>' +
                    '</div>' +
                    '<div class="settings-row">' +
                        '<span class="settings-label">' + escAttr(t('settingsWidth')) + '</span>' +
                        '<div class="settings-btns">' + contentWidthHtml + '</div>' +
                    '</div>' +
                    '<div class="settings-row">' +
                        '<span class="settings-label">' + escAttr(t('settingsBg')) + '</span>' +
                        '<div class="settings-btns settings-bg-row">' +
                            bgColorHtml +
                            '<button type="button" class="settings-btn settings-bg-swatch settings-bg-custom ' + customActive + '" data-setting="backgroundColor" data-value="custom" title="' + escAttr(t('bgPickTitle')) + '" aria-label="' + escAttr(t('bgPickAria')) + '"></button>' +
                            '<input type="color" id="settingsBgColorPicker" class="settings-color-picker" value="' + escAttr(o.pickerValue) + '" aria-label="' + escAttr(t('bgPickAria')) + '">' +
                        '</div>' +
                    '</div>' +
                    '<div class="settings-row">' +
                        '<span class="settings-label">' + escAttr(t('settingsBgImg')) + '</span>' +
                        '<div class="settings-btns settings-bg-image-row">' +
                            '<input type="file" accept="image/*" id="settingsBackgroundImage" class="settings-file-input" style="display:none">' +
                            '<button type="button" class="settings-btn" id="settingsUploadBgBtn">' + escAttr(t('chooseImg')) + '</button>' +
                            '<button type="button" class="settings-btn' + (o.hasBackgroundImage ? '' : ' disabled') + '" id="settingsClearBgBtn"' + (!o.hasBackgroundImage ? ' disabled' : '') + '>' + escAttr(t('clear')) + '</button>' +
                        '</div>' +
                    '</div>' +
                '</div>' +

                '<div class="settings-section">' +
                    '<div class="settings-section-title">' + escAttr(t('settingsGroupManage')) + '</div>' +
                    '<div class="settings-row">' +
                        '<span class="settings-label">' + escAttr(t('settingsVisibleRoots')) + '</span>' +
                        '<div class="settings-btns settings-root-btns" id="settingsVisibleRootsBtns"></div>' +
                    '</div>' +
                    '<div class="settings-row">' +
                        '<span class="settings-label">' + escAttr(t('settingsFolderManage')) + '</span>' +
                        '<div class="settings-btns">' +
                            '<button type="button" class="settings-btn" id="settingsOpenBookmarkManager">' + escAttr(t('openBookmarkManager')) + '</button>' +
                        '</div>' +
                    '</div>' +
                '</div>' +

                '<div class="settings-section settings-section-about">' +
                    '<div class="settings-section-title">' + escAttr(t('settingsGroupAbout')) + '</div>' +
                    '<div class="settings-row settings-row-help">' +
                        '<a href="#" class="settings-help-link" id="settingsOpenGuide">' + escAttr(t('helpLink')) + '</a>' +
                    '</div>' +
                '</div>' +
                '</div>' +
            '</div>'
        );
    }

    global.SettingsPanelTemplate = {
        CONTENT_WIDTH_VALUES: CONTENT_WIDTH_VALUES,
        BACKGROUND_COLORS: BACKGROUND_COLORS,
        buildSettingsPanelHtml: buildSettingsPanelHtml
    };
})(typeof window !== 'undefined' ? window : this);
