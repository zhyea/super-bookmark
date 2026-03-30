/**
 * 扩展新标签页入口：先加载服务模块（挂 window），再挂载 Vue，最后初始化书签交互。
 */
import './styles/global.css';

import './services/constants.js';
import './services/bookmarkNavBuild.js';
import './services/bookmarks.js';
import './services/bookmarkMaintenance.js';
import './services/editModal.js';
import './services/backupRestore.js';
import './services/settings.js';

import { createApp } from 'vue';
import App from './App.vue';
import { i18n } from './i18n/instance.js';

const app = createApp(App);
app.use(i18n);
app.mount('#app');
