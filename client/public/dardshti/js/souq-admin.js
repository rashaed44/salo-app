// souq-admin.js - نظام مشرف سوق العكيشة
(function() {
    'use strict';
    var $ = function(id) { return document.getElementById(id); };

    console.log('👑 تحميل نظام المشرف');

    // ===== قائمة المشرفين =====
    var ADMINS = ['احمد', 'ahmed', 'admin'];

    function isAdmin() {
        var user = JSON.parse(localStorage.getItem('dardshti_user') || 'null');
        if (!user) return false;
        return ADMINS.indexOf(user.username) !== -1 ||
               ADMINS.indexOf(user.displayName) !== -1;
    }

    // ===== المستخدمون المحظورون =====
    function getBannedUsers() {
        try { return JSON.parse(localStorage.getItem('dardshti_souq_banned') || '[]'); }
        catch (e) { return []; }
    }

    function saveBannedUsers(list) {
        localStorage.setItem('dardshti_souq_banned', JSON.stringify(list));
    }

    function isBanned(username) {
        return getBannedUsers().indexOf(username) !== -1;
    }

    // ===== إعدادات القناة =====
    function getSettings() {
        try {
            return JSON.parse(localStorage.getItem('dardshti_souq_settings') || 'null') ||
                { requireApproval: true, isOpen: true };
        } catch (e) {
            return { requireApproval: true, isOpen: true };
        }
    }

    function saveSettings(s) {
        localStorage.setItem('dardshti_souq_settings', JSON.stringify(s));
    }

    // ===== إضافة أزرار المشرف =====
    function injectAdminButtons() {
        if (!isAdmin()) return;

        // ابحث عن رأس السوق
        var header = document.querySelector('.souq-header');
        if (!header) return;

        // تحقق من عدم وجود الأزرار مسبقاً
        if ($('adminPanelBtn')) return;

        var settings = getSettings();
        var pendingCount = getPendingCount();

        // أضف زر لوحة الإدارة
        var adminBtn = document.createElement('button');
        adminBtn.id = 'adminPanelBtn';
        adminBtn.className = 'admin-panel-btn';
        adminBtn.innerHTML = '👑 لوحة المشرف' +
            (pendingCount > 0 ? ' <span class="pending-badge">' + pendingCount + '</span>' : '');
        adminBtn.onclick = openAdminPanel;

        header.appendChild(adminBtn);
    }

    // ===== عدّاد الإعلانات المنتظرة =====
    function getPendingCount() {
        try {
            var items = JSON.parse(localStorage.getItem('dardshti_souq_items') || '[]');
            return items.filter(function(i) { return i.status === 'pending'; }).length;
        } catch (e) { return 0; }
    }

    // ===== فتح لوحة الإدارة =====
    function openAdminPanel() {
        var existing = $('adminPanelModal');
        if (existing) existing.remove();

        var modal = document.createElement('div');
        modal.id = 'adminPanelModal';
        modal.className = 'modal-overlay active';

        var settings = getSettings();
        var items = JSON.parse(localStorage.getItem('dardshti_souq_items') || '[]');
        var pending = items.filter(function(i) { return i.status === 'pending'; });
        var approved = items.filter(function(i) { return i.status === 'approved' || !i.status; });
        var rejected = items.filter(function(i) { return i.status === 'rejected'; });
        var banned = getBannedUsers();

        modal.innerHTML = 
            '<div class="modal admin-modal">' +
                '<div class="modal-header">' +
                    '<h3>👑 لوحة المشرف</h3>' +
                    '<button type="button" id="closeAdminPanel">✕</button>' +
                '</div>' +
                '<div class="modal-body">' +
                    // الإحصائيات
                    '<div class="admin-stats">' +
                        '<div class="admin-stat"><div class="stat-num">' + items.length + '</div><div class="stat-label">إجمالي</div></div>' +
                        '<div class="admin-stat pending"><div class="stat-num">' + pending.length + '</div><div class="stat-label">منتظر</div></div>' +
                        '<div class="admin-stat approved"><div class="stat-num">' + approved.length + '</div><div class="stat-label">منشور</div></div>' +
                        '<div class="admin-stat rejected"><div class="stat-num">' + rejected.length + '</div><div class="stat-label">مرفوض</div></div>' +
                    '</div>' +
                    
                    // الإعدادات
                    '<div class="admin-section">' +
                        '<h4>⚙️ الإعدادات</h4>' +
                        '<label class="admin-toggle">' +
                            '<input type="checkbox" id="settingApproval" ' + (settings.requireApproval ? 'checked' : '') + '>' +
                            '<span>الموافقة الإلزامية على الإعلانات</span>' +
                        '</label>' +
                        '<label class="admin-toggle">' +
                            '<input type="checkbox" id="settingOpen" ' + (settings.isOpen ? 'checked' : '') + '>' +
                            '<span>السوق مفتوح للنشر</span>' +
                        '</label>' +
                    '</div>' +
                    
                    // قائمة المنتظرة
                    '<div class="admin-section">' +
                        '<h4>⏳ إعلانات منتظرة (' + pending.length + ')</h4>' +
                        '<div id="pendingItems">' +
                            (pending.length === 0 
                                ? '<p class="admin-empty">لا توجد إعلانات منتظرة</p>'
                                : '') +
                        '</div>' +
                    '</div>' +
                    
                    // المشرفون
                    '<div class="admin-section">' +
                        '<h4>👑 المشرفون (' + ADMINS.length + ')</h4>' +
                        '<div class="admin-list">' +
                            ADMINS.map(function(a) {
                                return '<span class="admin-chip">' + esc(a) + '</span>';
                            }).join('') +
                        '</div>' +
                    '</div>' +
                    
                    // المحظورون
                    '<div class="admin-section">' +
                        '<h4>🚫 المحظورون (' + banned.length + ')</h4>' +
                        '<div id="bannedList">' +
                            (banned.length === 0
                                ? '<p class="admin-empty">لا يوجد محظورون</p>'
                                : banned.map(function(u) {
                                    return '<div class="banned-item"><span>' + esc(u) + '</span><button type="button" data-unban="' + esc(u) + '">رفع الحظر</button></div>';
                                }).join('')) +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>';

        document.body.appendChild(modal);

        // إغلاق
        $('closeAdminPanel').onclick = function() { modal.remove(); };
        modal.onclick = function(e) {
            if (e.target === modal) modal.remove();
        };

        // الإعدادات
        var approvalToggle = $('settingApproval');
        var openToggle = $('settingOpen');
        
        if (approvalToggle) {
            approvalToggle.onchange = function() {
                var s = getSettings();
                s.requireApproval = this.checked;
                saveSettings(s);
                showToast(this.checked ? '✅ الموافقة الإلزامية مفعّلة' : '⚠️ الموافقة الإلزامية معطّلة');
            };
        }

        if (openToggle) {
            openToggle.onchange = function() {
                var s = getSettings();
                s.isOpen = this.checked;
                saveSettings(s);
                showToast(this.checked ? '✅ السوق مفتوح' : '🚫 السوق مغلق');
            };
        }

        // عرض الإعلانات المنتظرة
        renderPendingItems(pending);

        // أزرار رفع الحظر
        modal.querySelectorAll('[data-unban]').forEach(function(btn) {
            btn.onclick = function() {
                var user = this.getAttribute('data-unban');
                var banned = getBannedUsers().filter(function(u) { return u !== user; });
                saveBannedUsers(banned);
                modal.remove();
                openAdminPanel();
                showToast('✅ تم رفع الحظر');
            };
        });
    }

    // ===== عرض الإعلانات المنتظرة =====
    function renderPendingItems(pending) {
        var container = $('pendingItems');
        if (!container) return;

        pending.forEach(function(item) {
            var card = document.createElement('div');
            card.className = 'pending-card';

            var cat = getCatInfo(item.category);
            var timeStr = timeAgo(new Date(item.time));

            card.innerHTML = 
                '<div class="pending-header">' +
                    '<div class="pending-cat">' + cat.icon + ' ' + cat.name + '</div>' +
                    '<div class="pending-time">' + timeStr + '</div>' +
                '</div>' +
                (item.image ? '<div class="pending-image"><img src="' + item.image + '"></div>' : '') +
                '<h5 class="pending-title">' + esc(item.title) + '</h5>' +
                (item.description ? '<p class="pending-desc">' + esc(item.description) + '</p>' : '') +
                '<div class="pending-price">💰 ' + esc(item.price) + ' ريال</div>' +
                '<div class="pending-author">' +
                    '<div class="pending-avatar"></div>' +
                    '<div>' +
                        '<div class="pending-name">' + esc(item.name) + '</div>' +
                        '<div class="pending-user">@' + esc(item.username) + '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="pending-actions">' +
                    '<button type="button" class="btn-approve" data-action="approve" data-id="' + item.id + '">✅ موافقة</button>' +
                    '<button type="button" class="btn-reject" data-action="reject" data-id="' + item.id + '">❌ رفض</button>' +
                    '<button type="button" class="btn-ban" data-action="ban" data-user="' + esc(item.username) + '">🚫 حظر</button>' +
                '</div>';

            container.appendChild(card);

            // Avatar
            var av = card.querySelector('.pending-avatar');
            if (av) {
                var img = document.createElement('img');
                img.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(item.name);
                img.onerror = function() { av.textContent = item.name.charAt(0); };
                av.appendChild(img);
            }
        });

        // أزرار
        container.querySelectorAll('[data-action]').forEach(function(btn) {
            btn.onclick = function() {
                var action = this.getAttribute('data-action');
                var id = this.getAttribute('data-id');
                var user = this.getAttribute('data-user');

                if (action === 'approve') approveItem(id);
                else if (action === 'reject') rejectItem(id);
                else if (action === 'ban') banUser(user);
            };
        });
    }

    // ===== الموافقة على إعلان =====
    function approveItem(id) {
        var items = JSON.parse(localStorage.getItem('dardshti_souq_items') || '[]');
        var item = items.find(function(i) { return i.id === id; });
        if (!item) return;
        item.status = 'approved';
        item.approvedAt = Date.now();
        localStorage.setItem('dardshti_souq_items', JSON.stringify(items));
        showToast('✅ تم نشر الإعلان');
        $('adminPanelModal').remove();
        openAdminPanel();
        // إعادة تحميل السوق
        if (typeof window.SouqOpen === 'function') {
            var ch = window._currentChannel;
            if (ch && ch.id === 'souq') window.SouqOpen(ch);
        }
    }

    // ===== رفض إعلان =====
    function rejectItem(id) {
        var reason = prompt('سبب الرفض (اختياري):');
        if (reason === null) return;
        var items = JSON.parse(localStorage.getItem('dardshti_souq_items') || '[]');
        var item = items.find(function(i) { return i.id === id; });
        if (!item) return;
        item.status = 'rejected';
        item.rejectReason = reason || 'مخالف للشروط';
        item.rejectedAt = Date.now();
        localStorage.setItem('dardshti_souq_items', JSON.stringify(items));
        showToast('❌ تم رفض الإعلان');
        $('adminPanelModal').remove();
        openAdminPanel();
        if (typeof window.SouqOpen === 'function') {
            var ch = window._currentChannel;
            if (ch && ch.id === 'souq') window.SouqOpen(ch);
        }
    }

    // ===== حظر مستخدم =====
    function banUser(username) {
        if (!username) return;
        if (!confirm('حظر المستخدم @' + username + ' من النشر في السوق؟')) return;
        var banned = getBannedUsers();
        if (banned.indexOf(username) === -1) banned.push(username);
        saveBannedUsers(banned);

        // ارفض كل إعلاناته
        var items = JSON.parse(localStorage.getItem('dardshti_souq_items') || '[]');
        items.forEach(function(i) {
            if (i.username === username && i.status === 'pending') {
                i.status = 'rejected';
                i.rejectReason = 'تم حظر المستخدم';
            }
        });
        localStorage.setItem('dardshti_souq_items', JSON.stringify(items));

        showToast('🚫 تم حظر ' + username);
        $('adminPanelModal').remove();
        openAdminPanel();
    }

    // ===== دوال مساعدة =====
    function getCatInfo(catId) {
        var cats = {
            car: { icon: '🚗', name: 'سيارات' },
            realestate: { icon: '🏠', name: 'عقارات' },
            electronics: { icon: '📱', name: 'أجهزة' },
            furniture: { icon: '🛋️', name: 'أثاث' },
            animals: { icon: '🐪', name: 'حيوانات' },
            clothes: { icon: '👕', name: 'ملابس' },
            services: { icon: '🔧', name: 'خدمات' },
            other: { icon: '📦', name: 'أخرى' }
        };
        return cats[catId] || { icon: '📦', name: 'أخرى' };
    }

    function timeAgo(date) {
        var s = Math.floor((Date.now() - date.getTime()) / 1000);
        if (s < 60) return 'الآن';
        if (s < 3600) return Math.floor(s / 60) + ' دقيقة';
        if (s < 86400) return Math.floor(s / 3600) + ' ساعة';
        if (s < 604800) return Math.floor(s / 86400) + ' يوم';
        return date.getDate() + '/' + (date.getMonth() + 1);
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

    // ===== تفعيل أزرار المشرف عند فتح السوق =====
    document.addEventListener('click', function(e) {
        if (e.target.closest('.nav-btn[data-section="chats"]')) {
            setTimeout(injectAdminButtons, 500);
        }
        if (e.target.closest('.channel-item[data-channel="souq"]')) {
            setTimeout(injectAdminButtons, 500);
        }
    });

    // تطبيق أولي
    setTimeout(injectAdminButtons, 2000);

    // تصدير للاستخدام الخارجي
    window.SouqAdmin = {
        isAdmin: isAdmin,
        isBanned: isBanned,
        getSettings: getSettings,
        refresh: injectAdminButtons
    };

    console.log('✅ نظام المشرف جاهز');
})();
