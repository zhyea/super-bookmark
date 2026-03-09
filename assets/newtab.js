document.addEventListener('DOMContentLoaded', function() {
    // 搜索功能 - 添加防抖
    const searchInput = document.querySelector('.search-box input');
    let searchTimeout;
    
    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const searchTerm = this.value.toLowerCase();
            const linkItems = document.querySelectorAll('.link-item');
            const categories = document.querySelectorAll('.category');
            
            // 只有当搜索框有内容时才进行过滤
            if (searchTerm.trim() === '') {
                linkItems.forEach(item => {
                    item.style.display = 'block';
                });
                // 恢复所有分类
                categories.forEach(cat => {
                    cat.style.display = 'block';
                });
                return;
            }
            
            linkItems.forEach(item => {
                const title = item.querySelector('.title').textContent.toLowerCase();
                const description = item.querySelector('.description').textContent.toLowerCase();
                
                if (title.includes(searchTerm) || description.includes(searchTerm)) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            });

            // 根据卡片结果隐藏或显示分类块
            categories.forEach(cat => {
                const items = cat.querySelectorAll('.link-item');
                const hasVisible = Array.from(items).some(i => i.style.display !== 'none');
                cat.style.display = hasVisible ? 'block' : 'none';
            });
        }, 300); // 300ms防抖
    });
    
    // 确保搜索框不会响应右键点击
    searchInput.addEventListener('contextmenu', function(e) {
        e.preventDefault();
    });
    
    // 收藏功能
    const starButtons = document.querySelectorAll('.actions button:nth-child(1)');
    starButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            const linkItem = this.closest('.link-item');
            const title = linkItem.querySelector('.title').textContent;
            const url = linkItem.querySelector('a').href;
            
            // 切换收藏状态
            this.textContent = this.textContent === '⭐' ? '☆' : '⭐';
            
            // 保存到本地存储
            chrome.storage.local.get('bookmarks', function(data) {
                const bookmarks = data.bookmarks || [];
                const existingIndex = bookmarks.findIndex(bookmark => bookmark.url === url);
                
                if (existingIndex !== -1) {
                    // 移除收藏
                    bookmarks.splice(existingIndex, 1);
                } else {
                    // 添加收藏
                    bookmarks.push({ title, url });
                }
                
                chrome.storage.local.set({ bookmarks });
            });
        });
    });
    
    // 复制链接功能
    const copyButtons = document.querySelectorAll('.actions button:nth-child(2)');
    copyButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            const url = this.closest('.link-item').querySelector('a').href;
            
            navigator.clipboard.writeText(url).then(function() {
                // 显示复制成功提示
                const originalText = button.textContent;
                button.textContent = '✓';
                setTimeout(() => {
                    button.textContent = originalText;
                }, 1000);
            });
        });
    });
    
    // 分享功能
    const shareButtons = document.querySelectorAll('.actions button:nth-child(3)');
    shareButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            const url = this.closest('.link-item').querySelector('a').href;
            
            if (navigator.share) {
                navigator.share({
                    title: '发现导航',
                    url: url
                });
            } else {
                //  fallback for browsers that don't support share API
                prompt('复制链接', url);
            }
        });
    });
    
    // 加载已收藏的链接
    chrome.storage.local.get('bookmarks', function(data) {
        const bookmarks = data.bookmarks || [];
        const linkItems = document.querySelectorAll('.link-item');
        
        linkItems.forEach(item => {
            const url = item.querySelector('a').href;
            const isBookmarked = bookmarks.some(bookmark => bookmark.url === url);
            if (isBookmarked) {
                item.querySelector('.actions button:nth-child(1)').textContent = '⭐';
            }
        });
    });
    
    // 删除模式功能
    const container = document.querySelector('.container');
    const topNavLinks = document.querySelectorAll('.category-nav a');
    const sideNavLinks = document.querySelectorAll('.side-nav-list a');
    const linkItems = document.querySelectorAll('.link-item');
    const deleteIcons = document.querySelectorAll('.delete-icon');
    let currentEditingItem = null;
    
    // 鼠标右键点击卡片进入删除模式
    linkItems.forEach(item => {
        item.addEventListener('contextmenu', function(e) {
            // 阻止默认右键菜单
            e.preventDefault();
            // 阻止事件冒泡
            e.stopPropagation();
            
            // 如果点击的是删除图标或操作按钮，不进入删除模式
            if (e.target.classList.contains('delete-icon') || e.target.closest('.actions')) {
                return;
            }
            
            // 切换删除模式
            container.classList.toggle('delete-mode');
            
            // 进入删除模式时显示所有卡片
            if (container.classList.contains('delete-mode')) {
                const allLinkItems = document.querySelectorAll('.link-item');
                allLinkItems.forEach(item => {
                    item.style.display = 'block';
                });
            }
        });
    });
    
    // 点击删除图标删除卡片
    deleteIcons.forEach(icon => {
        icon.addEventListener('click', function(e) {
            e.stopPropagation();
            const linkItem = this.closest('.link-item');
            
            // 添加删除动画
            linkItem.style.animation = 'fadeOut 0.3s ease forwards';
            
            setTimeout(() => {
                linkItem.remove();
                
                // 如果没有卡片了，退出删除模式
                if (document.querySelectorAll('.link-item').length === 0) {
                    container.classList.remove('delete-mode');
                }
            }, 300);
        });
    });
    
    // 点击空白处退出删除模式
    container.addEventListener('click', function(e) {
        // 确保是鼠标左键点击
        if (e.button !== 0) {
            return;
        }
        
        if (e.target === container || e.target.classList.contains('category') || e.target.classList.contains('links-grid')) {
            container.classList.remove('delete-mode');
        }
    });
    
    // 添加删除动画样式
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeOut {
            from {
                opacity: 1;
                transform: scale(1);
            }
            to {
                opacity: 0;
                transform: scale(0.8);
            }
        }
        
        /* 编辑窗口样式 */
        .edit-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        }
        
        .edit-modal-content {
            background-color: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            width: 400px;
            max-width: 90%;
        }
        
        .edit-modal h3 {
            margin-bottom: 20px;
            color: #4a6fa5;
        }
        
        .edit-modal form {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }
        
        .edit-modal .form-group {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }
        
        .edit-modal label {
            font-size: 14px;
            font-weight: 600;
            color: #333;
        }
        
        .edit-modal input,
        .edit-modal textarea {
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
            outline: none;
            transition: border-color 0.3s ease;
        }
        
        .edit-modal input:focus,
        .edit-modal textarea:focus {
            border-color: #4a6fa5;
            box-shadow: 0 0 0 2px rgba(74, 111, 165, 0.1);
        }
        
        .edit-modal textarea {
            resize: vertical;
            min-height: 80px;
        }
        
        .edit-modal .button-group {
            display: flex;
            gap: 10px;
            justify-content: flex-end;
            margin-top: 10px;
        }
        
        .edit-modal button {
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .edit-modal .cancel-btn {
            background-color: #f0f0f0;
            color: #333;
        }
        
        .edit-modal .cancel-btn:hover {
            background-color: #e0e0e0;
        }
        
        .edit-modal .save-btn {
            background-color: #4a6fa5;
            color: white;
        }
        
        .edit-modal .save-btn:hover {
            background-color: #3a5a85;
        }
    `;
    document.head.appendChild(style);
    
    // 编辑功能
    function openEditModal(linkItem) {
        if (!linkItem) return;

        // 退出删除模式（如果在删除模式下）
        container.classList.remove('delete-mode');

        currentEditingItem = linkItem;
        const title = linkItem.querySelector('.title').textContent;
        const description = linkItem.querySelector('.description').textContent;
        const url = linkItem.querySelector('a').href;

        createEditModal(title, description, url);
    }

    // 编辑按钮点击事件
    const editButtons = document.querySelectorAll('.actions button:nth-child(4)');
    editButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            const linkItem = this.closest('.link-item');
            openEditModal(linkItem);
        });

    // 一级 / 二级目录联动高亮
    function setActiveNav(hash) {
        const normalized = hash || window.location.hash || '#cat-tech';

        topNavLinks.forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === normalized);
        });

        sideNavLinks.forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === normalized);
        });
    }

    topNavLinks.forEach(link => {
        link.addEventListener('click', function() {
            setActiveNav(this.getAttribute('href'));
        });
    });

    sideNavLinks.forEach(link => {
        link.addEventListener('click', function() {
            setActiveNav(this.getAttribute('href'));
        });
    });

    // 初始化默认高亮
    setActiveNav();
    });
    
    // 创建编辑窗口
    function createEditModal(title, description, url) {
        const modal = document.createElement('div');
        modal.className = 'edit-modal';
        modal.innerHTML = `
            <div class="edit-modal-content">
                <h3>编辑卡片</h3>
                <form id="edit-form">
                    <div class="form-group">
                        <label for="title">标题</label>
                        <input type="text" id="title" value="${title}" required>
                    </div>
                    <div class="form-group">
                        <label for="description">描述</label>
                        <textarea id="description">${description}</textarea>
                    </div>
                    <div class="form-group">
                        <label for="url">链接</label>
                        <input type="url" id="url" value="${url}" required>
                    </div>
                    <div class="button-group">
                        <button type="button" class="cancel-btn">取消</button>
                        <button type="submit" class="save-btn">保存</button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 取消按钮事件
        modal.querySelector('.cancel-btn').addEventListener('click', function() {
            modal.remove();
            currentEditingItem = null;
        });
        
        // 保存按钮事件
        modal.querySelector('#edit-form').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const newTitle = document.getElementById('title').value;
            const newDescription = document.getElementById('description').value;
            const newUrl = document.getElementById('url').value;
            
            // 更新卡片信息
            if (currentEditingItem) {
                currentEditingItem.querySelector('.title').textContent = newTitle;
                currentEditingItem.querySelector('.description').textContent = newDescription;
                currentEditingItem.querySelector('a').href = newUrl;
            }
            
            modal.remove();
            currentEditingItem = null;
        });
        
        // 点击模态框外部关闭
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.remove();
                currentEditingItem = null;
            }
        });
    }
});