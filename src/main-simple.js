import './styles/global.css';

import './services/constants.js';
import './services/bookmarkNavBuild.js';
import './services/bookmarks.js';
import './services/bookmarkMaintenance.js';
import './services/editModal.js';
import './services/backupRestore.js';
import { BookmarkManagerSettings as Settings } from './services/settings.js';

import { createApp } from 'vue';
import SimpleApp from './SimpleApp.vue';
import { i18n } from './i18n/instance.js';

// 先加载设置并应用背景样式，再挂载极简页面，保证与默认页背景一致
Settings.loadSettings(() => {
    Settings.applyContentWidthAndBackground();

    const app = createApp(SimpleApp);
    app.use(i18n);
    app.mount('#app');
});

