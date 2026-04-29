/**
 * 备份 / 导入：书签树 + 扩展存储（标签、图标色、描述、设置），AES-GCM 加密后写入 .zhx
 */
import { BookmarkManager as BM } from './bookmarks.js';
import { CONTENT_CHROME_TRANSPARENCY_DEFAULT } from './settingsConstants.js';
const DEFAULT_BACKUP_PASSWORD = 'SuperBookmark-backup-default-v1';

function b64(u8) {
    let s = '';
    const len = u8.byteLength;
    for (let i = 0; i < len; i++) s += String.fromCharCode(u8[i]);
    return btoa(s);
}

function fromB64(str) {
    const bin = atob(str);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
}

function deriveKey(password, salt) {
    const enc = new TextEncoder();
    return crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveKey']).then(function(keyMaterial) {
        return crypto.subtle.deriveKey(
            { name: 'PBKDF2', salt: salt, iterations: 100000, hash: 'SHA-256' },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    });
}

function encryptJson(obj, passwordHint) {
    const pwd = (passwordHint != null && String(passwordHint).trim() !== '') ? String(passwordHint) : DEFAULT_BACKUP_PASSWORD;
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const plaintext = new TextEncoder().encode(JSON.stringify(obj));
    return deriveKey(pwd, salt).then(function(key) {
        return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, plaintext);
    }).then(function(ciphertext) {
        return JSON.stringify({
            v: 1,
            s: b64(salt),
            i: b64(iv),
            d: b64(new Uint8Array(ciphertext))
        });
    });
}

function decryptJsonFile(text, passwordHint) {
    const pwd = (passwordHint != null && String(passwordHint).trim() !== '') ? String(passwordHint) : DEFAULT_BACKUP_PASSWORD;
    const wrap = JSON.parse(text);
    if (!wrap || wrap.v !== 1 || !wrap.s || !wrap.i || !wrap.d) throw new Error('BAD_FORMAT');
    const salt = fromB64(wrap.s);
    const iv = fromB64(wrap.i);
    const data = fromB64(wrap.d);
    return deriveKey(pwd, salt).then(function(key) {
        return crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, data);
    }).then(function(buf) {
        return JSON.parse(new TextDecoder().decode(buf));
    });
}

function stripNode(node) {
    if (!node) return null;
    if (node.url) {
        return { oid: String(node.id), title: node.title || '', url: node.url };
    }
    const children = (node.children || []).map(stripNode).filter(Boolean);
    return { oid: String(node.id), title: node.title || '', children: children };
}

function buildExportPayload(cb) {
    if (!BM || typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local || !chrome.bookmarks || !chrome.bookmarks.getTree) {
        cb(new Error('NO_API'));
        return;
    }
    const keys = [BM.TAGS_STORAGE_KEY, BM.ICON_COLOR_STORAGE_KEY, BM.SETTINGS_STORAGE_KEY];
    chrome.storage.local.get(keys, function(store) {
        chrome.bookmarks.getTree(function(tree) {
            const roots = (tree && tree[0] && tree[0].children) ? tree[0].children.map(stripNode).filter(Boolean) : [];
            cb(null, {
                version: 1,
                exportedAt: new Date().toISOString(),
                storage: {
                    [BM.TAGS_STORAGE_KEY]: store[BM.TAGS_STORAGE_KEY] || {},
                    [BM.ICON_COLOR_STORAGE_KEY]: store[BM.ICON_COLOR_STORAGE_KEY] || {},
                    [BM.SETTINGS_STORAGE_KEY]: store[BM.SETTINGS_STORAGE_KEY] || {}
                },
                roots: roots
            });
        });
    });
}

function remapMap(obj, idMap) {
    const out = {};
    if (!obj || typeof obj !== 'object') return out;
    Object.keys(obj).forEach(function(k) {
        const nk = idMap[k] || idMap[String(k)];
        if (nk) out[nk] = obj[k];
    });
    return out;
}

/**
 * 将备份中的顶层根目录对应到当前浏览器中的根文件夹 id（书签栏 / 其他书签 / 移动设备等）。
 * 优先用导出时的 oid；若无效则按顺序或标题匹配。
 */
function resolveRootParentId(r, chromeRoots, rootIndex, cb) {
    chrome.bookmarks.get(String(r.oid), function(nodes) {
        if (!chrome.runtime.lastError && nodes && nodes.length) {
            cb(null, String(nodes[0].id));
            return;
        }
        if (rootIndex >= 0 && rootIndex < chromeRoots.length) {
            cb(null, String(chromeRoots[rootIndex].id));
            return;
        }
        for (let j = 0; j < chromeRoots.length; j++) {
            if (chromeRoots[j].title === r.title) {
                cb(null, String(chromeRoots[j].id));
                return;
            }
        }
        cb(new Error('ROOT_NOT_FOUND'));
    });
}

/**
 * 增量合并：不删除现有子项。优先按 oid 命中；否则书签按同父下 url、文件夹按同父下同标题匹配；再无则新建。
 * 备份中的标题/链接会覆盖到已匹配项；父级不一致时 move。
 */
function mergeNode(parentId, node, idMap) {
    if (node.url) {
        return mergeBookmark(parentId, node, idMap);
    }
    return mergeFolder(parentId, node, idMap);
}

function mergeBookmark(parentId, node, idMap) {
    return new Promise(function(resolve, reject) {
        chrome.bookmarks.get(String(node.oid), function(nodes) {
            const hit = !chrome.runtime.lastError && nodes && nodes.length && nodes[0].url;
            if (hit) {
                const existing = nodes[0];
                const id = String(existing.id);
                function applyUpdate() {
                    const updates = {};
                    if ((existing.title || '') !== (node.title || '')) updates.title = node.title;
                    if (existing.url !== node.url) updates.url = node.url;
                    if (Object.keys(updates).length) {
                        chrome.bookmarks.update(id, updates, function() {
                            if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
                            idMap[node.oid] = id;
                            resolve();
                        });
                    } else {
                        idMap[node.oid] = id;
                        resolve();
                    }
                }
                if (String(existing.parentId) !== String(parentId)) {
                    chrome.bookmarks.move(id, { parentId: String(parentId) }, function() {
                        if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
                        applyUpdate();
                    });
                } else {
                    applyUpdate();
                }
                return;
            }
            chrome.bookmarks.getChildren(String(parentId), function(children) {
                if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
                let match = null;
                if (children) {
                    for (let i = 0; i < children.length; i++) {
                        const c = children[i];
                        if (c.url && c.url === node.url) {
                            match = c;
                            break;
                        }
                    }
                }
                if (match) {
                    const id = String(match.id);
                    const updates = {};
                    if ((match.title || '') !== (node.title || '')) updates.title = node.title;
                    if (match.url !== node.url) updates.url = node.url;
                    if (Object.keys(updates).length) {
                        chrome.bookmarks.update(id, updates, function() {
                            if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
                            idMap[node.oid] = id;
                            resolve();
                        });
                    } else {
                        idMap[node.oid] = id;
                        resolve();
                    }
                } else {
                    chrome.bookmarks.create({ parentId: String(parentId), title: node.title, url: node.url }, function(created) {
                        if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
                        idMap[node.oid] = String(created.id);
                        resolve();
                    });
                }
            });
        });
    });
}

function mergeFolder(parentId, node, idMap) {
    return new Promise(function(resolve, reject) {
        chrome.bookmarks.get(String(node.oid), function(nodes) {
            const hitFolder = !chrome.runtime.lastError && nodes && nodes.length && !nodes[0].url;
            if (hitFolder) {
                const existing = nodes[0];
                const id = String(existing.id);
                function mergeInto(fid) {
                    idMap[node.oid] = fid;
                    const ch = node.children || [];
                    let p = Promise.resolve();
                    ch.forEach(function(child) {
                        p = p.then(function() { return mergeNode(fid, child, idMap); });
                    });
                    p.then(resolve).catch(reject);
                }
                function afterParentOk(fid) {
                    if ((existing.title || '') !== (node.title || '')) {
                        chrome.bookmarks.update(fid, { title: node.title }, function() {
                            if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
                            mergeInto(fid);
                        });
                    } else {
                        mergeInto(fid);
                    }
                }
                if (String(existing.parentId) !== String(parentId)) {
                    chrome.bookmarks.move(id, { parentId: String(parentId) }, function(moved) {
                        if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
                        afterParentOk(String(moved.id));
                    });
                } else {
                    afterParentOk(id);
                }
                return;
            }
            chrome.bookmarks.getChildren(String(parentId), function(children) {
                if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
                let match = null;
                if (children) {
                    for (let i = 0; i < children.length; i++) {
                        const c = children[i];
                        if (!c.url && (c.title || '') === (node.title || '')) {
                            match = c;
                            break;
                        }
                    }
                }
                if (match) {
                    const fid = String(match.id);
                    idMap[node.oid] = fid;
                    const ch = node.children || [];
                    let p = Promise.resolve();
                    ch.forEach(function(child) {
                        p = p.then(function() { return mergeNode(fid, child, idMap); });
                    });
                    p.then(resolve).catch(reject);
                } else {
                    chrome.bookmarks.create({ parentId: String(parentId), title: node.title }, function(created) {
                        if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
                        idMap[node.oid] = String(created.id);
                        const ch = node.children || [];
                        let p = Promise.resolve();
                        ch.forEach(function(child) {
                            p = p.then(function() { return mergeNode(String(created.id), child, idMap); });
                        });
                        p.then(resolve).catch(reject);
                    });
                }
            });
        });
    });
}

function mergeExportedChildren(parentId, exportedChildren, idMap) {
    let p = Promise.resolve();
    (exportedChildren || []).forEach(function(ch) {
        p = p.then(function() { return mergeNode(parentId, ch, idMap); });
    });
    return p;
}

function importPayload(payload, cb) {
    if (!payload || payload.version !== 1 || !payload.storage) {
        cb(new Error('BAD_PAYLOAD'));
        return;
    }
    const roots = payload.roots || [];
    if (roots.length === 0) {
        const s = payload.storage;
        chrome.storage.local.set(
            {
                [BM.TAGS_STORAGE_KEY]: s[BM.TAGS_STORAGE_KEY] || {},
                [BM.ICON_COLOR_STORAGE_KEY]: s[BM.ICON_COLOR_STORAGE_KEY] || {},
                [BM.SETTINGS_STORAGE_KEY]: s[BM.SETTINGS_STORAGE_KEY] || {}
            },
            function() {
                if (chrome.runtime.lastError) return cb(chrome.runtime.lastError);
                cb(null);
            }
        );
        return;
    }
    chrome.bookmarks.getTree(function(tree) {
        const chromeRoots = (tree && tree[0] && tree[0].children) ? tree[0].children : [];
        const idMap = {};

        function applyStorageAndDone() {
            const storeKeys = [BM.TAGS_STORAGE_KEY, BM.ICON_COLOR_STORAGE_KEY, BM.SETTINGS_STORAGE_KEY];
            chrome.storage.local.get(storeKeys, function(cur) {
                if (chrome.runtime.lastError) return cb(chrome.runtime.lastError);
                const remTags = remapMap(payload.storage[BM.TAGS_STORAGE_KEY] || {}, idMap);
                const remColors = remapMap(payload.storage[BM.ICON_COLOR_STORAGE_KEY] || {}, idMap);
                const tags = Object.assign({}, cur[BM.TAGS_STORAGE_KEY] || {}, remTags);
                const colors = Object.assign({}, cur[BM.ICON_COLOR_STORAGE_KEY] || {}, remColors);
                const settings = payload.storage[BM.SETTINGS_STORAGE_KEY] || {};
                chrome.storage.local.set(
                    {
                        [BM.TAGS_STORAGE_KEY]: tags,
                        [BM.ICON_COLOR_STORAGE_KEY]: colors,
                        [BM.SETTINGS_STORAGE_KEY]: settings
                    },
                    function() {
                        if (chrome.runtime.lastError) return cb(chrome.runtime.lastError);
                        cb(null);
                    }
                );
            });
        }

        function processRootAt(index) {
            if (index >= roots.length) {
                applyStorageAndDone();
                return;
            }
            const r = roots[index];
            resolveRootParentId(r, chromeRoots, index, function(err, parentId) {
                if (err) return cb(err);
                idMap[String(r.oid)] = parentId;
                mergeExportedChildren(parentId, r.children || [], idMap)
                    .then(function() { processRootAt(index + 1); })
                    .catch(function(e) { cb(e); });
            });
        }

        processRootAt(0);
    });
}

function exportBackupToFile(passwordHint, filenameBase, cb) {
    buildExportPayload(function(err, payload) {
        if (err) return cb(err);
        encryptJson(payload, passwordHint).then(function(jsonLine) {
            const blob = new Blob([jsonLine], { type: 'application/json;charset=utf-8' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = (filenameBase || 'super-bookmark-backup') + '.zhx';
            a.click();
            URL.revokeObjectURL(a.href);
            cb(null);
        }).catch(function(e) { cb(e); });
    });
}

function readFileAsText(file, cb) {
    const r = new FileReader();
    r.onload = function() { cb(null, String(r.result || '')); };
    r.onerror = function() { cb(new Error('READ_FAIL')); };
    r.readAsText(file, 'utf-8');
}

function importBackupFromFile(file, passwordHint, cb) {
    readFileAsText(file, function(err, text) {
        if (err) return cb(err);
        decryptJsonFile(text.trim(), passwordHint)
            .then(function(payload) {
                importPayload(payload, cb);
            })
            .catch(function() {
                cb(new Error('DECRYPT_FAIL'));
            });
    });
}

function restoreFactoryDefaults(cb) {
    if (!BM) {
        cb(new Error('NO_BM'));
        return;
    }
    chrome.storage.local.remove([BM.TAGS_STORAGE_KEY, BM.ICON_COLOR_STORAGE_KEY], function() {
        if (chrome.runtime.lastError) return cb(chrome.runtime.lastError);
        const L = typeof window !== 'undefined' ? window.BookmarkManagerI18n : null;
        const locale = L && L.normalizeLocale ? L.normalizeLocale(L.detectLocale && L.detectLocale()) : 'zh';
        const vr = BM.normalizeVisibleRoots ? BM.normalizeVisibleRoots(null) : { bar: true, other: true, mobile: true, others: true };
        const defaults = {
            showActions: false,
            columns: 3,
            contentWidthPercent: 70,
            backgroundColor: '#e8f4fc',
            contentChromeTransparency: CONTENT_CHROME_TRANSPARENCY_DEFAULT,
            backgroundImage: '',
            disableDefaultBg: false,
            replaceDefaultNewTab: false,
            theme: 'light',
            locale: locale,
            visibleRoots: vr,
            useSimplePage: false,
            showOverviewAllNav: false
        };
        chrome.storage.local.set({ [BM.SETTINGS_STORAGE_KEY]: defaults }, function() {
            if (chrome.runtime.lastError) return cb(chrome.runtime.lastError);
            cb(null);
        });
    });
}

export const BookmarkBackup = {
DEFAULT_BACKUP_PASSWORD: DEFAULT_BACKUP_PASSWORD,
encryptJson: encryptJson,
decryptJsonFile: decryptJsonFile,
buildExportPayload: buildExportPayload,
exportBackupToFile: exportBackupToFile,
importBackupFromFile: importBackupFromFile,
restoreFactoryDefaults: restoreFactoryDefaults
};

if (typeof window !== 'undefined') {
window.BookmarkBackup = BookmarkBackup;
}
