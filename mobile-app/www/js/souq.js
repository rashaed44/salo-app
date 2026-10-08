// souq.js - سوق العكيشة (مع نظام المشرف)
(function() {
    'use strict';
    var $ = function(id) { return document.getElementById(id); };
    console.log('🛒 تحميل سوق العكيشة');

    var currentCategory = 'all';
    var searchQuery = '';

    var CATEGORIES = [
        { id: 'car', name: 'سيارات', icon: '🚗' },
        { id: 'realestate', name: 'عقارات', icon: '🏠' },
        { id: 'electronics', name: 'أجهزة', icon: '📱' },
        { id: 'furniture', name: 'أثاث', icon: '🛋️' },
        { id: 'animals', name: 'حيوانات', icon: '🐪' },
        { id: 'clothes', name: 'ملابس', icon: '👕' },
        { id: 'services', name: 'خدمات', icon: '🔧' },
        { id: 'other', name: 'أخرى', icon: '📦' }
    ];

    var CONDITIONS = [
        { id: 'new', name: 'جديد', icon: '✨' },
        { id: 'used', name: 'مستعمل', icon: '📦' },
        { id: 'excellent', name: 'ممتاز', icon: '⭐' }
    ];

    function categoryIcon(id) {
        var paths = {
            car: '<path d="m4 13 2-5h12l2 5v6h-2v-2H6v2H4v-6Z"/><path d="M6 13h12M7 16h.01M17 16h.01M8 8l1-3h6l1 3"/>',
            realestate: '<path d="m3 11 9-8 9 8M5 10v11h14V10M9 21v-7h6v7"/>',
            electronics: '<rect x="4" y="4" width="16" height="12" rx="2"/><path d="M2 20h20M9 16l-1 4m7-4 1 4"/>',
            furniture: '<path d="M4 12V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4M3 12h18v6H3zM5 18v3m14-3v3M7 12V9h10v3"/>',
            animals: '<path d="M7 20c0-3 1-5 4-5h4c3 0 4 2 4 5M9 15l-2-7 3-3 3 2 3-2 2 4-2 6M6 8 4 5m14 3 2-3"/>',
            clothes: '<path d="m8 4 4 2 4-2 5 4-3 3-2-1v10H8V10l-2 1-3-3 5-4Z"/>',
            services: '<path d="m14 6 4 4M5 19l8-8m-2-7a5 5 0 0 0 6 6l4 4a2 2 0 0 1-3 3l-4-4a5 5 0 0 0-6-6l3 3-3 3-3-3a5 5 0 0 1 6-6Z"/>',
            other: '<path d="M4 7h16v13H4zM7 7l2-4h6l2 4M9 12h6m-6 4h6"/>'
        };
        return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (paths[id] || paths.other) + '</svg>';
    }

    function getItems() {
        try { return JSON.parse(localStorage.getItem('dardshti_souq_items') || '[]'); }
        catch (e) { return []; }
    }

    function saveItems(items) {
        localStorage.setItem('dardshti_souq_items', JSON.stringify(items));
    }

    function getSettings() {
        if (window.SouqAdmin && window.SouqAdmin.getSettings) {
            return window.SouqAdmin.getSettings();
        }
        return { requireApproval: false, isOpen: true };
    }

    function isAdmin() {
        return window.SouqAdmin && window.SouqAdmin.isAdmin && window.SouqAdmin.isAdmin();
    }

    function isBanned(username) {
        return window.SouqAdmin && window.SouqAdmin.isBanned && window.SouqAdmin.isBanned(username);
    }

    function render() {
        var market = $('souqScreen');
        if (!market) return;
        market.innerHTML = '';

        var header = document.createElement('div');
        header.className = 'souq-header market-toolbar';
        header.innerHTML =
            '<button type="button" class="btn-primary souq-add-btn" id="btnAddItem"><span class="souq-add-plus">+</span><span>أضف إعلانك</span></button>' +
            '<div class="souq-brand"><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M5 20h38L40 8H8L5 20Z"/><path d="M9 20v22h30V20M18 42V28h12v14M5 20a6 6 0 0 0 12 0 6 6 0 0 0 12 0 6 6 0 0 0 12 0"/></svg><h2>السوق</h2></div>' +
            '<button type="button" class="souq-notify-btn" id="souqNotifications" aria-label="الإشعارات"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M9 21h6"/></svg><i></i></button>';

        market.appendChild(header);
        if (window.SouqAdmin && window.SouqAdmin.refresh) window.SouqAdmin.refresh();

        var search = document.createElement('label');
        search.className = 'souq-search';
        search.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg><input id="souqSearch" type="search" placeholder="ابحث في السوق" autocomplete="off">';
        market.appendChild(search);
        var searchInput = $('souqSearch');
        if (searchInput) {
            searchInput.value = searchQuery;
            searchInput.oninput = function() { searchQuery = this.value; renderResults(); };
        }

        var catsEl = document.createElement('div');
        catsEl.className = 'souq-categories market-categories';
        var catsHtml = '<button type="button" class="cat-btn ' + (currentCategory === 'all' ? 'active' : '') + '" data-cat="all"><span class="cat-grid-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="5" height="5" rx="1"/><rect x="15" y="4" width="5" height="5" rx="1"/><rect x="4" y="15" width="5" height="5" rx="1"/><rect x="15" y="15" width="5" height="5" rx="1"/></svg></span> الكل</button>';
        CATEGORIES.forEach(function(c) {
            catsHtml += '<button type="button" class="cat-btn ' + (currentCategory === c.id ? 'active' : '') + '" data-cat="' + c.id + '"><span class="souq-cat-icon">' + categoryIcon(c.id) + '</span>' + c.name + '</button>';
        });
        catsEl.innerHTML = catsHtml;
        market.appendChild(catsEl);

        catsEl.querySelectorAll('.cat-btn').forEach(function(btn) {
            btn.onclick = function() {
                currentCategory = this.getAttribute('data-cat');
                render();
            };
        });
        var btnAdd = $('btnAddItem');
        if (btnAdd) btnAdd.onclick = openItemForm;
        var notificationButton = $('souqNotifications');
        if (notificationButton) notificationButton.onclick = function() {
            var existingButton = $('btnNotifications');
            if (!localStorage.getItem('dardshti_api_token')) { showToast('سجّل الدخول لعرض الإشعارات'); return; }
            if (existingButton) existingButton.click();
            else showToast('لا توجد إشعارات جديدة');
        };

        renderResults();
    }

    function renderResults() {
        var market = $('souqScreen');
        if (!market) return;
        var previous = market.querySelector('.souq-list, .souq-empty');
        if (previous) previous.remove();
        var items = getItems();
        var user = JSON.parse(localStorage.getItem('dardshti_user') || 'null');
        var admin = isAdmin();

        items = items.filter(function(i) {
            if (admin) return true;
            if (user && i.username === user.username) return true;
            return !i.status || i.status === 'approved';
        });

        if (currentCategory !== 'all') {
            items = items.filter(function(i) { return i.category === currentCategory; });
        }
        if (searchQuery.trim()) {
            var query = searchQuery.trim().toLowerCase();
            items = items.filter(function(i) {
                return [i.title, i.description, i.location, i.name].join(' ').toLowerCase().indexOf(query) !== -1;
            });
        }

        items.sort(function(a, b) { return b.time - a.time; });

        if (items.length === 0) {
            var empty = document.createElement('div');
            empty.className = 'souq-empty';
            empty.innerHTML = '<div class="souq-empty-icon">⌕</div><h3>' + (searchQuery ? 'لا توجد نتائج' : 'لا توجد إعلانات') + '</h3><p>' + (searchQuery ? 'جرّب كلمة بحث أخرى' : 'أضف أول إعلان إلى السوق') + '</p>';
            market.appendChild(empty);
            return;
        }

        var list = document.createElement('div');
        list.className = 'souq-list';
        items.forEach(function(item) {
            list.appendChild(createItemCard(item, user));
        });
        market.appendChild(list);
    }

    function updateStats() {
        var el = $('souqStats');
        if (!el) return;
        var items = getItems();
        var total = items.length;
        var today = items.filter(function(i) {
            var d = new Date(i.time);
            var now = new Date();
            return d.toDateString() === now.toDateString();
        }).length;

        el.innerHTML = 
            '<div class="stat-item"><span class="stat-num">' + total + '</span><span class="stat-label">إعلان</span></div>' +
            '<div class="stat-item"><span class="stat-num">' + today + '</span><span class="stat-label">اليوم</span></div>' +
            '<div class="stat-item"><span class="stat-num">—</span><span class="stat-label">عدد الأعضاء غير متاح</span></div>';
    }

    function createItemCard(item, user) {
        var card = document.createElement('div');
        card.className = 'souq-card';

        var cat = CATEGORIES.find(function(c) { return c.id === item.category; }) || { icon: '📦', name: 'أخرى' };
        var cond = CONDITIONS.find(function(c) { return c.id === item.condition; }) || { icon: '📦', name: 'مستعمل' };
        var timeStr = timeAgo(new Date(item.time));
        var canDelete = user && user.username === item.username;
        var isPending = item.status === 'pending';

        var favorites = getFavorites();
        var isFavorite = favorites.indexOf(item.id) !== -1;
        card.innerHTML = '<div class="souq-image"><div class="souq-no-image">' + cat.icon + '</div><button class="souq-favorite ' + (isFavorite ? 'active' : '') + '" type="button" aria-label="' + (isFavorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة') + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 8.7c0 5.1-8.8 10.3-8.8 10.3S3.2 13.8 3.2 8.7A4.7 4.7 0 0 1 12 6a4.7 4.7 0 0 1 8.8 2.7Z"/></svg></button></div>' +
            '<div class="souq-content"><div class="souq-card-top"><span class="souq-cat-badge">' + cat.name + '</span><button type="button" class="souq-more" aria-label="خيارات الإعلان">⋮</button></div>' +
            (isPending ? '<div class="pending-status">قيد المراجعة</div>' : '') +
            '<h3 class="souq-title">' + esc(item.title) + '</h3>' +
            (item.description ? '<p class="souq-desc">' + esc(item.description) + '</p>' : '') +
            '<div class="souq-price"><span>' + esc(item.price) + '</span> <small>ريال</small></div>' +
            '<div class="souq-location"><span aria-hidden="true">●</span> ' + esc(item.location || 'الموقع غير محدد') + '</div>' +
            '<div class="souq-footer"><div class="souq-author"><div class="souq-avatar"></div><div class="souq-author-info"><div class="souq-author-name">' + esc(item.name) + '</div><div class="souq-author-time">' + timeStr + '</div></div></div>' +
            (item.phone && !isPending ? '<a href="tel:' + esc(item.phone) + '" class="souq-call-btn" aria-label="اتصال بالبائع">اتصال</a>' : '') + '</div>' +
            (item.condition ? '<div class="souq-condition">' + cond.name + '</div>' : '') +
            (canDelete ? '<div class="souq-actions"><button type="button" class="delete-btn" data-action="delete">حذف الإعلان</button></div>' : '') + '</div>';

        var photo = card.querySelector('.souq-image');
        if (item.image && photo) {
            var productImage = document.createElement('img');
            productImage.src = item.image;
            productImage.alt = item.title ? 'صورة ' + item.title : 'صورة الإعلان';
            productImage.onerror = function() {
                productImage.remove();
                if (!photo.querySelector('.souq-no-image')) photo.insertAdjacentHTML('afterbegin', '<div class="souq-no-image">' + cat.icon + '</div>');
            };
            photo.insertBefore(productImage, photo.firstChild);
            var placeholder = photo.querySelector('.souq-no-image');
            if (placeholder) placeholder.remove();
            productImage.onclick = function() {
                var lb = $('lightbox'), lbImg = $('lbImg');
                if (lb && lbImg) { lbImg.src = productImage.src; lb.classList.add('active'); }
            };
        }

        var av = card.querySelector('.souq-avatar');
        if (av) {
            var img = document.createElement('img');
            img.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(item.name);
            img.onerror = function() { av.textContent = item.name.charAt(0); };
            av.appendChild(img);
        }

        var delBtn = card.querySelector('[data-action="delete"]');
        if (delBtn) {
            delBtn.onclick = function() {
                if (!confirm('حذف هذا الإعلان؟')) return;
                saveItems(getItems().filter(function(x) { return x.id !== item.id; }));
                render();
                showToast('🗑️ تم الحذف');
            };
        }

        var favoriteBtn = card.querySelector('.souq-favorite');
        if (favoriteBtn) favoriteBtn.onclick = function() {
            var saved = getFavorites();
            var index = saved.indexOf(item.id);
            if (index >= 0) saved.splice(index, 1); else saved.push(item.id);
            localStorage.setItem('dardshti_souq_favorites', JSON.stringify(saved));
            var active = saved.indexOf(item.id) !== -1;
            favoriteBtn.classList.toggle('active', active);
            favoriteBtn.setAttribute('aria-label', active ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة');
        };
        var moreBtn = card.querySelector('.souq-more');
        if (moreBtn) moreBtn.onclick = function() {
            if (canDelete && delBtn) delBtn.click();
            else if (item.phone) window.location.href = 'tel:' + item.phone;
            else showToast('لا يوجد رقم تواصل لهذا الإعلان');
        };

        return card;
    }

    function getFavorites() {
        try { return JSON.parse(localStorage.getItem('dardshti_souq_favorites') || '[]'); }
        catch (e) { return []; }
    }

    function openItemForm() {
        var user = JSON.parse(localStorage.getItem('dardshti_user') || 'null');
        if (!user) { alert('سجّل دخول أولاً'); return; }

        var admin = isAdmin();
        var settings = getSettings();
        var banned = isBanned(user.username);

        if (banned) {
            alert('🚫 تم حظرك من النشر في السوق');
            return;
        }

        if (!settings.isOpen && !admin) {
            alert('🚫 السوق مغلق حالياً من قبل المشرف');
            return;
        }

        var existing = $('souqFormModal');
        if (existing) existing.remove();

        var modal = document.createElement('div');
        modal.id = 'souqFormModal';
        modal.className = 'modal-overlay active';

        var catsHtml = '';
        CATEGORIES.forEach(function(c) {
            catsHtml += '<button type="button" class="case-type-btn" data-cat="' + c.id + '">' + c.icon + ' ' + c.name + '</button>';
        });
        var condsHtml = '';
        CONDITIONS.forEach(function(c) {
            condsHtml += '<button type="button" class="case-type-btn" data-cond="' + c.id + '">' + c.icon + ' ' + c.name + '</button>';
        });

        modal.innerHTML = 
            '<div class="modal">' +
                '<div class="modal-header">' +
                    '<h3>🛒 إعلان جديد</h3>' +
                    '<button type="button" id="closeSouqForm">✕</button>' +
                '</div>' +
                '<div class="modal-body">' +
                    '<label class="case-label">الفئة *:</label>' +
                    '<div class="case-type-buttons" id="catButtons">' + catsHtml + '</div>' +
                    '<label class="case-label">حالة السلعة *:</label>' +
                    '<div class="case-type-buttons" id="condButtons">' + condsHtml + '</div>' +
                    '<label class="case-label">عنوان الإعلان *:</label>' +
                    '<input type="text" id="souqTitle" placeholder="مثال: سيارة تويوتا 2015" maxlength="100">' +
                    '<label class="case-label">الوصف:</label>' +
                    '<textarea id="souqDesc" placeholder="تفاصيل السلعة..." maxlength="1000"></textarea>' +
                    '<label class="case-label">السعر (ريال) *:</label>' +
                    '<input type="number" id="souqPrice" placeholder="0" min="0">' +
                    '<label class="case-label">الموقع:</label>' +
                    '<input type="text" id="souqLocation" placeholder="العكيشة - السوق" maxlength="100">' +
                    '<label class="case-label">رقم التواصل:</label>' +
                    '<input type="tel" id="souqPhone" placeholder="+967...">' +
                    '<label class="case-label">صورة (اختياري):</label>' +
                    '<input type="file" id="souqImage" accept="image/*">' +
                    '<div id="souqImagePreview" style="display:none;margin-top:10px;">' +
                        '<img id="souqImagePreviewImg" style="max-width:100%;border-radius:12px;">' +
                    '</div>' +
                    '<div class="edit-modal-actions" style="margin-top:16px;">' +
                        '<button type="button" class="btn-cancel" id="cancelSouq">إلغاء</button>' +
                        '<button type="button" class="btn-save" id="submitSouq">نشر</button>' +
                    '</div>' +
                '</div>' +
            '</div>';

        document.body.appendChild(modal);

        var selectedCat = null;
        var selectedCond = null;
        var imageData = null;

        modal.querySelectorAll('#catButtons .case-type-btn').forEach(function(btn) {
            btn.onclick = function() {
                modal.querySelectorAll('#catButtons .case-type-btn').forEach(function(b) { b.classList.remove('active'); });
                this.classList.add('active');
                selectedCat = this.getAttribute('data-cat');
            };
        });

        modal.querySelectorAll('#condButtons .case-type-btn').forEach(function(btn) {
            btn.onclick = function() {
                modal.querySelectorAll('#condButtons .case-type-btn').forEach(function(b) { b.classList.remove('active'); });
                this.classList.add('active');
                selectedCond = this.getAttribute('data-cond');
            };
        });

        $('souqImage').onchange = function() {
            var file = this.files[0];
            if (!file) return;
            if (file.size > 2 * 1024 * 1024) { alert('حجم الصورة كبير'); return; }
            var reader = new FileReader();
            reader.onload = function(e) {
                imageData = e.target.result;
                $('souqImagePreviewImg').src = imageData;
                $('souqImagePreview').style.display = 'block';
            };
            reader.readAsDataURL(file);
        };

        $('closeSouqForm').onclick = function() { modal.remove(); };
        $('cancelSouq').onclick = function() { modal.remove(); };

        $('submitSouq').onclick = function() {
            if (!selectedCat) { alert('اختر الفئة'); return; }
            if (!selectedCond) { alert('اختر حالة السلعة'); return; }
            var title = $('souqTitle').value.trim();
            if (!title) { alert('أدخل عنوان الإعلان'); return; }
            var price = $('souqPrice').value.trim();
            if (!price) { alert('أدخل السعر'); return; }

            var status = (admin || !settings.requireApproval) ? 'approved' : 'pending';

            var items = getItems();
            items.push({
                id: 'souq_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                category: selectedCat,
                condition: selectedCond,
                title: title,
                description: $('souqDesc').value.trim(),
                price: price,
                location: $('souqLocation').value.trim(),
                phone: $('souqPhone').value.trim(),
                image: imageData,
                username: user.username,
                name: user.displayName || user.username,
                status: status,
                time: Date.now()
            });
            saveItems(items);
            modal.remove();

            if (status === 'pending') {
                showToast('⏳ إعلانك قيد المراجعة');
            } else {
                showToast('✅ تم نشر الإعلان');
            }
            render();
        };
    }

    function timeAgo(date) {
        var s = Math.floor((Date.now() - date.getTime()) / 1000);
        if (s < 60) return 'الآن';
        if (s < 3600) return Math.floor(s / 60) + ' دقيقة';
        if (s < 86400) return Math.floor(s / 3600) + ' ساعة';
        if (s < 604800) return Math.floor(s / 86400) + ' يوم';
        return date.getDate() + '/' + (date.getMonth() + 1) + '/' + date.getFullYear();
    }

    function esc(t) {
        var d = document.createElement('div');
        d.textContent = t;
        return d.innerHTML;
    }

    function showToast(text) {
        var toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = text;
        document.body.appendChild(toast);
        setTimeout(function() {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s';
            setTimeout(function() { toast.remove(); }, 300);
        }, 1800);
    }

    window.SouqRender = render;
    window.SouqOpen = function(channel) {
        console.log('🛒 فتح سوق العكيشة');
        window._currentChannel = channel;
        currentCategory = 'all';
        searchQuery = '';
        var navButton = document.querySelector('.nav-btn[data-section="souq"]');
        if (navButton) navButton.click();
        else render();
    };

    console.log('✅ سوق العكيشة جاهز');
})();
