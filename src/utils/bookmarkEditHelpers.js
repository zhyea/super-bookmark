/**
 * 书签编辑弹窗：目录树与 parentId 解析（纯函数，供 Vue 与测试复用）
 */

/** 根据 navData 生成当前书签所在目录的 parentId（用于 extensions bookmarks API） */
export function getCurrentParentId(primary, secondary) {
    if (!primary || !secondary) return '';
    if (String(secondary.id).endsWith('_direct')) return String(primary.folderId);
    if (secondary.id === 'MERGED_UNCAT' && primary.isMergedRoots) return '1';
    return String(secondary.id);
}

/** 从书签树构建目录列表（树状展示用）：去掉「未命名」层级，pathDisplay 为显示路径，depth 为缩进层级 */
export function buildFolderTreeFlat(tree) {
    const out = [];
    function recurse(nodes, pathParts) {
        if (!nodes) return;
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            if (node.url) continue;
            const title = node.title && node.title.trim() ? node.title.trim() : '未命名';
            const nextParts = title === '未命名' ? pathParts : pathParts.concat(title);
            if (title !== '未命名') {
                out.push({
                    id: String(node.id),
                    pathDisplay: nextParts.join(' / '),
                    depth: nextParts.length - 1
                });
            }
            recurse(node.children || [], nextParts);
        }
    }
    for (let r = 0; r < tree.length; r++) {
        const root = tree[r];
        const rootTitle = root.title && root.title.trim() ? root.title.trim() : '未命名';
        if (rootTitle !== '未命名') {
            out.push({ id: String(root.id), pathDisplay: rootTitle, depth: 0 });
        }
        recurse(root.children || [], rootTitle === '未命名' ? [] : [rootTitle]);
    }
    return out;
}
