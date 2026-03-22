/**
 * 使用说明页入口（须为外部脚本：扩展页 CSP 禁止内联脚本）
 */
(function () {
    function run() {
        if (window.BookmarkManagerI18n) {
            window.BookmarkManagerI18n.initGuidePage();
        } else {
            document.body.innerHTML =
                '<div class="guide-wrap" style="padding:24px"><p>无法加载多语言模块，请检查 assets/i18n.js 是否可访问。</p></div>';
        }
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', run);
    } else {
        run();
    }
})();
