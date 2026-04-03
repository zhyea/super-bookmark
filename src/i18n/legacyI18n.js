/**
 * 兼容原 window.BookmarkManagerI18n API（供 settings、render、edit 等脚本使用）
 */
import DOMPurify from 'dompurify';
import { CODES, HTML_LANG, BG_PRESET_KEYS, normalizeLocale, detectLocale } from './locale-utils.js';

/** 使用说明页 HTML：仅允许来自 i18n 的安全标签（再经 DOMPurify 净化） */
const GUIDE_SANITIZE = {
    ALLOWED_TAGS: ['div', 'header', 'section', 'footer', 'h1', 'h2', 'p', 'ul', 'li', 'strong', 'em', 'br', 'span'],
    ALLOWED_ATTR: ['class'],
    ALLOW_DATA_ATTR: false
};

function escapeAttr(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/**
 * @param {import('vue-i18n').I18n} i18n
 */
export function installLegacyBookmarkI18n(i18n) {
    function t(key) {
        return i18n.global.t(key);
    }

    function setLocale(code) {
        const loc = normalizeLocale(code);
        const g = i18n.global;
        const locRef = g.locale;
        if (locRef && typeof locRef === 'object' && 'value' in locRef) {
            locRef.value = loc;
        } else {
            g.locale = loc;
        }
        if (typeof document !== 'undefined' && document.documentElement) {
            document.documentElement.lang = HTML_LANG[loc] || 'en';
        }
    }

    function getLocale() {
        const loc = i18n.global.locale;
        return loc && typeof loc === 'object' && 'value' in loc ? loc.value : loc;
    }

    function applyMainPageStatic() {
        if (typeof document === 'undefined') return;
        const d = document;
        d.title = t('pageTitle');
        const loadEl = d.getElementById('loading');
        if (loadEl) loadEl.textContent = t('loading');
        const emptyP = d.querySelector('#emptyState p');
        if (emptyP) emptyP.textContent = t('emptyState');
        const foot = d.querySelector('.footer-content p');
        if (foot) foot.textContent = t('footer');
        const priWrap = d.getElementById('primaryNavWrap');
        if (priWrap) priWrap.setAttribute('aria-label', t('navPrimaryAria'));
        const secNav = d.getElementById('secondaryNav');
        if (secNav) {
            const wrap = secNav.closest('nav');
            if (wrap) wrap.setAttribute('aria-label', t('navSecondaryAria'));
        }
        const side = d.querySelector('.sidebar');
        if (side) side.setAttribute('aria-label', t('sidebarAria'));
        const si = d.getElementById('searchInput');
        if (si) {
            si.placeholder = t('searchPlaceholder');
            si.setAttribute('aria-label', t('searchPlaceholder'));
        }
        const sb = d.getElementById('searchBtn');
        if (sb) sb.textContent = t('searchBtn');
        const tp = d.getElementById('tagBarPrev');
        const tn = d.getElementById('tagBarNext');
        if (tp) {
            tp.setAttribute('aria-label', t('tagLeft'));
            tp.setAttribute('title', t('tagLeft'));
        }
        if (tn) {
            tn.setAttribute('aria-label', t('tagRight'));
            tn.setAttribute('title', t('tagRight'));
        }
        const ctx = d.getElementById('linkContextMenu');
        if (ctx) {
            const del = ctx.querySelector('[data-action="delete"]');
            if (del) del.textContent = t('ctxDelete');
            const edit = ctx.querySelector('[data-action="edit"]');
            if (edit) edit.textContent = t('ctxEdit');
        }
        const scrollBtn = d.querySelector('.scroll-float-btn');
        if (scrollBtn) {
            scrollBtn.setAttribute('aria-label', t('scrollAria'));
            let nearBottom = false;
            try {
                const cm = d.getElementById('contentMain');
                if (cm) nearBottom = cm.scrollTop + cm.clientHeight >= cm.scrollHeight - 20;
            } catch (e) {}
            scrollBtn.title = nearBottom ? t('scrollTop') : t('scrollBottom');
        }
    }

    function buildGuideHTML() {
        return (
            '<div class="guide-wrap">' +
            '<header class="guide-header"><h1>' + t('guideH1') + '</h1><p>' + t('guideIntro') + '</p></header>' +
            '<section class="guide-section"><h2>' + t('g1h') + '</h2><p>' + t('g1p') + '</p><ul>' +
            '<li>' + t('g1li1') + '</li><li>' + t('g1li2') + '</li><li>' + t('g1li3') + '</li></ul>' +
            '<p class="guide-note">' + t('g1note') + '</p></section>' +
            '<section class="guide-section"><h2>' + t('g2h') + '</h2><ul>' +
            '<li>' + t('g2li1') + '</li><li>' + t('g2li2') + '</li><li>' + t('g2li3') + '</li></ul></section>' +
            '<section class="guide-section"><h2>' + t('g3h') + '</h2><p>' + t('g3p') + '</p><ul>' +
            '<li>' + t('g3li1') + '</li><li>' + t('g3li2') + '</li><li>' + t('g3li3') + '</li></ul></section>' +
            '<section class="guide-section"><h2>' + t('g4h') + '</h2><p>' + t('g4p') + '</p></section>' +
            '<section class="guide-section"><h2>' + t('g5h') + '</h2><ul>' +
            '<li>' + t('g5li1') + '</li><li>' + t('g5li2') + '</li><li>' + t('g5li3') + '</li>' +
            '<li>' + t('g5li4') + '</li><li>' + t('g5li5') + '</li><li>' + t('g5li6') + '</li></ul></section>' +
            '<footer class="guide-footer"><p>' + t('guideFoot') + '</p></footer></div>'
        );
    }

    function initGuidePage() {
        function applyGuide() {
            document.title = t('guidePageTitle');
            const clean = DOMPurify.sanitize(buildGuideHTML(), GUIDE_SANITIZE);
            const parsed = new DOMParser().parseFromString(clean, 'text/html');
            document.body.replaceChildren(...parsed.body.childNodes);
        }
        if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
            setLocale(detectLocale());
            applyGuide();
            return;
        }
        try {
            chrome.storage.local.get('bookmarkManagerSettings', function(data) {
                if (chrome.runtime && chrome.runtime.lastError) {
                    setLocale(detectLocale());
                } else {
                    const s = data && data.bookmarkManagerSettings;
                    setLocale(s && s.locale ? s.locale : detectLocale());
                }
                applyGuide();
            });
        } catch (e) {
            setLocale(detectLocale());
            applyGuide();
        }
    }

    const api = {
        CODES,
        BG_PRESET_KEYS,
        setLocale,
        getLocale,
        t,
        normalizeLocale,
        detectLocale,
        escapeAttr,
        applyMainPageStatic,
        buildGuideHTML,
        initGuidePage
    };

    if (typeof window !== 'undefined') {
        window.BookmarkManagerI18n = api;
    }
    return api;
}
