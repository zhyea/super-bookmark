# SuperBookmark

跨浏览器扩展：**Chrome** 与 **Firefox**（Manifest V3）。书签管理，支持从新标签页或工具栏打开。

## 「增强型安全浏览不信任此扩展程序」说明

这是 **Chrome 对「未在应用商店分发」扩展的常见提示**，与扩展是否恶意无必然关系。

| 场景 | 说明 |
|------|------|
| **解压加载 / 本机 .crx 安装** | 扩展不在 Chrome 应用商店索引里，增强型安全浏览无法为其建立「信誉」，可能提示不信任。 |
| **已上架应用商店** | 通过审核并安装后，一般不再出现该提示（或显著减少）。 |

### 你自己开发、自己用时可以怎么做

1. **确认来源**：只加载你本仓库里构建的扩展，不要安装来历不明的 .crx。  
2. **保留提示但继续使用**：若你信任本仓库代码，可在提示中选择仍保留扩展（具体入口随 Chrome 版本略有不同）。  
3. **暂时放宽安全浏览（仅限个人调试）**：在 `chrome://settings/security` 中可关闭「增强型安全浏览」进行本地调试；**不建议**在日常浏览中长期关闭。  
4. **正式分发**：将扩展提交 [Chrome 网上应用店](https://chrome.google.com/webstore/devconsole)，通过审核后用户从商店安装，通常最省心。

### 与本扩展权限

当前 `manifest.json` 仅声明：`storage`、`bookmarks`、`tabs`，用于存储设置、读写书签、打开新标签页；**无** `<all_urls>` 等宽泛网站权限。权限无法在代码里「消除」上述提示；提示主要来自**分发方式**，而非权限行数。

## 本地加载（Chrome）

1. 执行 `npm run build`，静态资源与清单来自 `public/`（含 `manifest.json`、`icons/`、`assets/`）。  
2. 打开 `chrome://extensions`，开启「开发者模式」。  
3. 「加载已解压的扩展程序」，选择本仓库下的 **`dist`** 目录（勿选仓库根目录）。  
4. 从 `icon.png` 生成各尺寸 PNG：见 `tools/build_extension_png_icons.py`（输出到 `public/icons/`）。

## 本地加载（Firefox）

1. 执行 `npm run build:firefox`，产物在 **`dist-firefox`**（与 Chrome 版相比会额外写入 `browser_specific_settings.gecko`，便于长期侧载与提交 [AMO](https://addons.mozilla.org/developers/)）。  
2. 打开 `about:debugging#/runtime/this-firefox`，点「临时载入扩展…」，选择 **`dist-firefox/manifest.json`**。  
3. **扩展 ID**：默认脚本写入 `superbookmark@superbookmark.local`。若需固定为其他 ID（例如上架），构建前设置环境变量：  
   `GECKO_EXTENSION_ID=你的唯一ID@你的域名 npm run build:firefox`  
4. 要求 **Firefox 115+**（与脚本中 `strict_min_version` 一致，可按需调高）。

### Firefox 与 Chrome 行为差异说明

- **替换新标签页**：后台脚本会识别 Chromium 的 `chrome://newtab` 与 Firefox 的 `about:newtab` / `about:home`。  
- **打开系统书签管理器**：Chromium 使用 `chrome://bookmarks/`；Firefox 使用书签库页 `chrome://browser/content/places/places.xhtml`（若个别版本受限无法打开，请直接在扩展内管理书签）。

## 许可证

见仓库维护者说明。
