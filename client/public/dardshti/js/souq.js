// souq.js - سوق العكيشة (مع نظام المشرف)
(function() {
    'use strict';
    var $ = function(id) { return document.getElementById(id); };
    console.log('🛒 تحميل سوق العكيشة');

    var currentCategory = 'all';

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
        var msgs = $('msgs');
        if (!msgs) return;
        msgs.innerHTML = '';

        var header = document.createElement('div');
        header.className = 'souq-header';
        header.innerHTML = 
            '<div class="souq-header-icon">🛒</div>' +
            '<h2>سوق العكيشة</h2>' +
            '<p>بيع وشراء بين أبناء المنطقة</p>' +
            '<div class="souq-stats" id="souqStats"></div>' +
            '<button type="button" class="btn-primary souq-add-btn" id="btnAddItem">➕ إعلان جديد</button>';

        msgs.appendChild(header);

        var catsEl = document.createElement('div');
        catsEl.className = 'souq-categories';
        var catsHtml = '<button type="button" class="cat-btn ' + (currentCategory === 'all' ? 'active' : '') + '" data-cat="all">📋 الكل</button>';
        CATEGORIES.forEach(function(c) {
            catsHtml += '<button type="button" class="cat-btn ' + (currentCategory === c.id ? 'active' : '') + '" data-cat="' + c.id + '">' + c.icon + ' ' + c.name + '</button>';
        });
        catsEl.innerHTML = catsHtml;
        msgs.appendChild(catsEl);

        setTimeout(function() {
            catsEl.querySelectorAll('.cat-btn').forEach(function(btn) {
                btn.onclick = function() {
                    currentCategory = this.getAttribute('data-cat');
                    render();
                };
            });
            var btnAdd = $('btnAddItem');
            if (btnAdd) btnAdd.onclick = openItemForm;
            updateStats();
        }, 50);

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

        items.sort(function(a, b) { return b.time - a.time; });

        if (items.length === 0) {
            var empty = document.createElement('div');
            empty.className = 'souq-empty';
            empty.innerHTML = 
                '<div style="font-size:48px;opacity:0.5;">🛒</div>' +
                '<h3>لا توجد إعلانات</h3>' +
                '<p>' + (currentCategory === 'all' ? 'كن أول من ينشر إعلاناً' : 'لا توجد إعلانات في هذه الفئة') + '</p>';
            msgs.appendChild(empty);
            return;
        }

        items.forEach(function(item) {
            msgs.appendChild(createItemCard(item, user));
        });
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

        var html = '<div class="souq-card-header">' +
            '<div class="souq-cat-badge">' + cat.icon + ' ' + cat.name + '</div>' +
            '<div class="souq-cond-badge cond-' + item.condition + '">' + cond.icon + ' ' + cond.name + '</div>' +
        '</div>';

        if (isPending) {
            html += '<div class="pending-status">⏳ قيد المراجعة</div>';
        }

        if (item.image) {
            html += '<div class="souq-image"><img src="' + item.image + '" alt="صورة"></div>';
        } else {
            html += '<div class="souq-no-image">' + cat.icon + '</div>';
        }

        html += '<div class="souq-body">' +
            '<h3 class="souq-title">' + esc(item.title) + '</h3>' +
            (item.description ? '<p class="souq-desc">' + esc(item.description) + '</p>' : '') +
            '<div class="souq-price">💰 ' + esc(item.price) + ' ريال</div>';

        if (item.location) {
            html += '<div class="souq-location">📍 ' + esc(item.location) + '</div>';
        }
        html += '</div>';

        html += '<div class="souq-footer">' +
            '<div class="souq-author">' +
                '<div class="souq-avatar"></div>' +
                '<div class="souq-author-info">' +
                    '<div class="souq-author-name">' + esc(item.name) + '</div>' +
                    '<div class="souq-author-time">' + timeStr + '</div>' +
                '</div>' +
            '</div>';

        if (item.phone && !isPending) {
            html += '<a href="tel:' + esc(item.phone) + '" class="souq-call-btn">📞 اتصل</a>';
        }
        html += '</div>';

        if (canDelete) {
            html += '<div class="souq-actions"><button type="button" class="delete-btn" data-action="delete">🗑️ حذف الإعلان</button></div>';
        }

        card.innerHTML = html;

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

        var img = card.querySelector('.souq-image img');
        if (img) {
            img.onclick = function() {
                var lb = $('lightbox'), lbImg = $('lbImg');
                if (lb && lbImg) { lbImg.src = img.src; lb.classList.add('active'); }
            };
        }

        return card;
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

    window.SouqOpen = function(channel) {
        console.log('🛒 فتح سوق العكيشة');
        var chatArea = $('chatArea');
        var mainScreen = $('mainScreen');
        if (!chatArea || !mainScreen) return;

        $('hName').textContent = '🛒 سوق العكيشة';
        var hs = $('hStatus');
        if (hs) {
            var onlineCount = window.DardshtiBackend ? window.DardshtiBackend.getOnlineCount() : null;
            hs.textContent = onlineCount === null ? 'حالة الاتصال غير متاحة' : onlineCount + ' مستخدم متصل بالتطبيق';
            hs.classList.toggle('online', onlineCount !== null && onlineCount > 0);
        }

        var av = $('chatAvatar');
        if (av) {
            av.style.background = 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)';
            av.innerHTML = '🛒';
        }

        var bc = $('btnCall'); if (bc) bc.style.display = 'none';
        var bv = $('btnVideoCall'); if (bv) bv.style.display = 'none';

        var ib = $('inputBar');
        if (ib) ib.style.display = 'none';

        window._currentChannel = channel;
        currentCategory = 'all';
        render();

        // إظهار زر المشرف إذا كان المستخدم مشرفاً
        if (window.SouqAdmin && window.SouqAdmin.refresh) {
            setTimeout(window.SouqAdmin.refresh, 100);
        }

        mainScreen.classList.remove('active');
        chatArea.classList.add('active');
    };

    console.log('✅ سوق العكيشة جاهز');
})();
