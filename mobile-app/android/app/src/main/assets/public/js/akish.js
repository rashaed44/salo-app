// akish.js - مجتمع أبناء العكيشة
(function() {
    'use strict';
    var $ = function(id) { return document.getElementById(id); };

    console.log('🏔️ تحميل مجتمع أبناء العكيشة');

    var currentTab = 'announcements';
    
    // ===== المشرفون =====
    // هذه القائمة للواجهة المحلية فقط؛ يجب فرض الصلاحيات في الخادم عند الإنتاج.
    var ADMINS = ['admin', 'owner', 'moderator'];
    
    function isAdmin() {
        var user = JSON.parse(localStorage.getItem('dardshti_user') || 'null');
        if (!user) return false;
        return ADMINS.indexOf(user.username) !== -1 ||
               ADMINS.indexOf(user.displayName) !== -1;
    }

    // ===== الإعلانات =====
    function getAnnouncements() {
        try { return JSON.parse(localStorage.getItem('dardshti_akish_announcements') || '[]'); }
        catch (e) { return []; }
    }

    function saveAnnouncements(list) {
        localStorage.setItem('dardshti_akish_announcements', JSON.stringify(list));
    }

    // ===== المناسبات =====
    function getEvents() {
        try { return JSON.parse(localStorage.getItem('dardshti_akish_events') || '[]'); }
        catch (e) { return []; }
    }

    function saveEvents(list) {
        localStorage.setItem('dardshti_akish_events', JSON.stringify(list));
    }

    // ===== عرض الصفحة =====
    function render() {
        var msgs = $('msgs');
        if (!msgs) return;
        msgs.innerHTML = '';

        // الرأس
        var header = document.createElement('div');
        header.className = 'akish-header';
        header.innerHTML = 
            '<div class="akish-header-icon">🏔️</div>' +
            '<h2>مجتمع أبناء العكيشة</h2>' +
            '<p>منصة تجمع أبناء المنطقة الكرام</p>' +
            '<div class="akish-stats" id="akishStats"></div>';

        msgs.appendChild(header);

        // التبويبات
        var tabs = document.createElement('div');
        tabs.className = 'akish-tabs';
        tabs.innerHTML = 
            '<button type="button" class="akish-tab ' + (currentTab === 'announcements' ? 'active' : '') + '" data-tab="announcements">📌 الإعلانات</button>' +
            '<button type="button" class="akish-tab ' + (currentTab === 'events' ? 'active' : '') + '" data-tab="events">🎉 المناسبات</button>';

        msgs.appendChild(tabs);

        setTimeout(function() {
            tabs.querySelectorAll('.akish-tab').forEach(function(btn) {
                btn.onclick = function() {
                    currentTab = this.getAttribute('data-tab');
                    render();
                };
            });
            updateStats();
        }, 50);

        // محتوى التبويب
        if (currentTab === 'announcements') {
            renderAnnouncements(msgs);
        } else {
            renderEvents(msgs);
        }
    }

    // ===== الإحصائيات =====
    function updateStats() {
        var el = $('akishStats');
        if (!el) return;
        var ann = getAnnouncements().length;
        var evts = getEvents().filter(function(e) { return new Date(e.date).getTime() > Date.now(); }).length;
        el.innerHTML = 
            '<div class="stat-item"><span class="stat-num">' + ann + '</span><span class="stat-label">إعلان</span></div>' +
            '<div class="stat-item"><span class="stat-num">' + evts + '</span><span class="stat-label">مناسبة قادمة</span></div>' +
            '<div class="stat-item"><span class="stat-num">—</span><span class="stat-label">عدد الأعضاء غير متاح</span></div>';
    }

    // ===== الإعلانات =====
    function renderAnnouncements(container) {
        // زر إضافة (للمشرف فقط)
        if (isAdmin()) {
            var addBtn = document.createElement('button');
            addBtn.className = 'akish-add-btn';
            addBtn.innerHTML = '📢 إعلان جديد';
            addBtn.onclick = openAnnouncementForm;
            container.appendChild(addBtn);
        }

        var announcements = getAnnouncements();
        announcements.sort(function(a, b) {
            // المثبتة أولاً
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return b.time - a.time;
        });

        if (announcements.length === 0) {
            var empty = document.createElement('div');
            empty.className = 'akish-empty';
            empty.innerHTML = 
                '<div style="font-size:48px;opacity:0.5;">📭</div>' +
                '<h3>لا توجد إعلانات</h3>' +
                '<p>أول إعلان سيظهر هنا</p>';
            container.appendChild(empty);
            return;
        }

        announcements.forEach(function(a) {
            var card = createAnnouncementCard(a);
            container.appendChild(card);
        });
    }

    function createAnnouncementCard(a) {
        var card = document.createElement('div');
        card.className = 'announcement-card';
        if (a.pinned) card.classList.add('pinned');
        if (a.urgent) card.classList.add('urgent');

        var timeStr = timeAgo(new Date(a.time));
        var user = JSON.parse(localStorage.getItem('dardshti_user') || 'null');

        var html = '';
        if (a.pinned) html += '<div class="announcement-badge pinned-badge">📌 مثبت</div>';
        if (a.urgent) html += '<div class="announcement-badge urgent-badge">⚠️ عاجل</div>';

        html += 
            '<div class="announcement-header">' +
                '<div class="announcement-category">' + getCategoryIcon(a.category) + ' ' + getCategoryName(a.category) + '</div>' +
                '<div class="announcement-time">' + timeStr + '</div>' +
            '</div>' +
            '<h3 class="announcement-title">' + esc(a.title) + '</h3>' +
            '<p class="announcement-body">' + esc(a.body) + '</p>';

        if (a.image) {
            html += '<div class="announcement-image"><img src="' + a.image + '" alt="صورة"></div>';
        }

        html += 
            '<div class="announcement-footer">' +
                '<div class="announcement-author">' +
                    '<div class="announcement-avatar"></div>' +
                    '<span>بواسطة ' + esc(a.name) + '</span>' +
                '</div>';

        if (user && user.username === a.username) {
            html += '<div class="announcement-actions">' +
                '<button type="button" class="action-icon-btn" data-action="pin" title="تثبيت">📌</button>' +
                '<button type="button" class="action-icon-btn danger" data-action="delete" title="حذف">🗑️</button>' +
            '</div>';
        }
        html += '</div>';

        card.innerHTML = html;

        // Avatar
        var av = card.querySelector('.announcement-avatar');
        if (av) {
            var img = document.createElement('img');
            img.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(a.name);
            img.onerror = function() { av.textContent = a.name.charAt(0); };
            av.appendChild(img);
        }

        // Actions
        var pinBtn = card.querySelector('[data-action="pin"]');
        if (pinBtn) {
            pinBtn.onclick = function() {
                var list = getAnnouncements();
                var item = list.find(function(x) { return x.id === a.id; });
                if (item) {
                    item.pinned = !item.pinned;
                    saveAnnouncements(list);
                    render();
                }
            };
        }

        var delBtn = card.querySelector('[data-action="delete"]');
        if (delBtn) {
            delBtn.onclick = function() {
                if (!confirm('حذف هذا الإعلان؟')) return;
                saveAnnouncements(getAnnouncements().filter(function(x) { return x.id !== a.id; }));
                render();
                showToast('🗑️ تم الحذف');
            };
        }

        // صورة
        var img = card.querySelector('.announcement-image img');
        if (img) {
            img.onclick = function() {
                var lb = $('lightbox'), lbImg = $('lbImg');
                if (lb && lbImg) { lbImg.src = img.src; lb.classList.add('active'); }
            };
        }

        return card;
    }

    // ===== المناسبات =====
    function renderEvents(container) {
        if (isAdmin()) {
            var addBtn = document.createElement('button');
            addBtn.className = 'akish-add-btn';
            addBtn.innerHTML = '🎉 إضافة مناسبة';
            addBtn.onclick = openEventForm;
            container.appendChild(addBtn);
        }

        var events = getEvents();
        events.sort(function(a, b) {
            // القادمة أولاً، ثم المنتهية
            var aFuture = new Date(a.date).getTime() > Date.now();
            var bFuture = new Date(b.date).getTime() > Date.now();
            if (aFuture && !bFuture) return -1;
            if (!aFuture && bFuture) return 1;
            if (aFuture) return new Date(a.date).getTime() - new Date(b.date).getTime();
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        });

        if (events.length === 0) {
            var empty = document.createElement('div');
            empty.className = 'akish-empty';
            empty.innerHTML = 
                '<div style="font-size:48px;opacity:0.5;">📅</div>' +
                '<h3>لا توجد مناسبات</h3>' +
                '<p>أضف أول مناسبة</p>';
            container.appendChild(empty);
            return;
        }

        events.forEach(function(e) {
            var card = createEventCard(e);
            container.appendChild(card);
        });
    }

    function createEventCard(e) {
        var card = document.createElement('div');
        card.className = 'event-card';

        var eventDate = new Date(e.date);
        var isPast = eventDate.getTime() < Date.now();
        if (isPast) card.classList.add('past');

        var user = JSON.parse(localStorage.getItem('dardshti_user') || 'null');
        var days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
        var months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

        var dateStr = days[eventDate.getDay()] + ' ' + eventDate.getDate() + ' ' + months[eventDate.getMonth()] + ' ' + eventDate.getFullYear();
        var timeStr = String(eventDate.getHours()).padStart(2, '0') + ':' + String(eventDate.getMinutes()).padStart(2, '0');

        var html = 
            '<div class="event-header">' +
                '<div class="event-type-badge type-' + e.type + '">' + getEventTypeIcon(e.type) + ' ' + getEventTypeName(e.type) + '</div>' +
                (isPast ? '<div class="event-past-badge">انتهت</div>' : '') +
            '</div>' +
            '<h3 class="event-title">' + esc(e.title) + '</h3>';

        if (e.description) html += '<p class="event-desc">' + esc(e.description) + '</p>';

        html += 
            '<div class="event-details">' +
                '<div class="event-detail"><span class="detail-icon">📅</span>' + dateStr + '</div>' +
                '<div class="event-detail"><span class="detail-icon">🕐</span>' + timeStr + '</div>' +
                (e.location ? '<div class="event-detail"><span class="detail-icon">📍</span>' + esc(e.location) + '</div>' : '') +
                (e.phone ? '<div class="event-detail"><span class="detail-icon">📞</span>' + esc(e.phone) + '</div>' : '') +
            '</div>';

        if (user && user.username === e.username) {
            html += '<div class="event-actions">' +
                '<button type="button" class="action-icon-btn danger" data-action="delete">🗑️ حذف</button>' +
            '</div>';
        }

        card.innerHTML = html;

        var delBtn = card.querySelector('[data-action="delete"]');
        if (delBtn) {
            delBtn.onclick = function() {
                if (!confirm('حذف هذه المناسبة؟')) return;
                saveEvents(getEvents().filter(function(x) { return x.id !== e.id; }));
                render();
                showToast('🗑️ تم الحذف');
            };
        }

        return card;
    }

    // ===== نافذة إضافة إعلان =====
    function openAnnouncementForm() {
        var modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.id = 'announcementFormModal';

        modal.innerHTML = 
            '<div class="modal">' +
                '<div class="modal-header">' +
                    '<h3>📢 إعلان جديد</h3>' +
                    '<button type="button" id="closeAnnForm">✕</button>' +
                '</div>' +
                '<div class="modal-body">' +
                    '<label class="case-label">التصنيف:</label>' +
                    '<div class="case-type-buttons">' +
                        '<button type="button" class="case-type-btn active" data-cat="general">📢 عام</button>' +
                        '<button type="button" class="case-type-btn" data-cat="mosque">🕌 مسجد</button>' +
                        '<button type="button" class="case-type-btn" data-cat="news">📰 أخبار</button>' +
                        '<button type="button" class="case-type-btn" data-cat="urgent">⚠️ عاجل</button>' +
                    '</div>' +
                    '<label class="case-label">العنوان *:</label>' +
                    '<input type="text" id="annTitle" placeholder="عنوان الإعلان..." maxlength="100">' +
                    '<label class="case-label">النص:</label>' +
                    '<textarea id="annBody" placeholder="نص الإعلان..." maxlength="1000"></textarea>' +
                    '<label class="case-label" style="display:flex;align-items:center;gap:8px;margin-top:12px;">' +
                        '<input type="checkbox" id="annUrgent" style="width:auto;"> إعلان عاجل' +
                    '</label>' +
                    '<label class="case-label">صورة (اختياري):</label>' +
                    '<input type="file" id="annImage" accept="image/*">' +
                    '<div id="annImagePreview" style="display:none;margin-top:10px;">' +
                        '<img id="annImagePreviewImg" style="max-width:100%;border-radius:12px;">' +
                    '</div>' +
                    '<div class="edit-modal-actions" style="margin-top:16px;">' +
                        '<button type="button" class="btn-cancel" id="cancelAnn">إلغاء</button>' +
                        '<button type="button" class="btn-save" id="submitAnn">نشر</button>' +
                    '</div>' +
                '</div>' +
            '</div>';

        document.body.appendChild(modal);

        var category = 'general';
        var urgent = false;
        var imageData = null;

        modal.querySelectorAll('.case-type-btn').forEach(function(btn) {
            btn.onclick = function() {
                modal.querySelectorAll('.case-type-btn').forEach(function(b) { b.classList.remove('active'); });
                this.classList.add('active');
                category = this.getAttribute('data-cat');
            };
        });

        $('annUrgent').onchange = function() { urgent = this.checked; };

        $('annImage').onchange = function() {
            var file = this.files[0];
            if (!file) return;
            if (file.size > 2 * 1024 * 1024) { alert('حجم الصورة كبير'); return; }
            var reader = new FileReader();
            reader.onload = function(e) {
                imageData = e.target.result;
                $('annImagePreviewImg').src = imageData;
                $('annImagePreview').style.display = 'block';
            };
            reader.readAsDataURL(file);
        };

        $('closeAnnForm').onclick = function() { modal.remove(); };
        $('cancelAnn').onclick = function() { modal.remove(); };

        $('submitAnn').onclick = function() {
            var title = $('annTitle').value.trim();
            if (!title) { alert('أدخل العنوان'); return; }
            var body = $('annBody').value.trim();

            var user = JSON.parse(localStorage.getItem('dardshti_user') || 'null');
            if (!user) return;

            var list = getAnnouncements();
            list.push({
                id: 'ann_' + Date.now(),
                category: category,
                title: title,
                body: body,
                urgent: urgent,
                image: imageData,
                username: user.username,
                name: user.displayName || user.username,
                pinned: false,
                time: Date.now()
            });
            saveAnnouncements(list);
            modal.remove();
            render();
            showToast('✅ تم نشر الإعلان');
        };
    }

    // ===== نافذة إضافة مناسبة =====
    function openEventForm() {
        var modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.id = 'eventFormModal';

        modal.innerHTML = 
            '<div class="modal">' +
                '<div class="modal-header">' +
                    '<h3>🎉 مناسبة جديدة</h3>' +
                    '<button type="button" id="closeEventForm">✕</button>' +
                '</div>' +
                '<div class="modal-body">' +
                    '<label class="case-label">نوع المناسبة:</label>' +
                    '<div class="case-type-buttons">' +
                        '<button type="button" class="case-type-btn active" data-type="wedding">💍 زفاف</button>' +
                        '<button type="button" class="case-type-btn" data-type="engagement">💐 خطوبة</button>' +
                        '<button type="button" class="case-type-btn" data-type="graduation">🎓 تخرج</button>' +
                        '<button type="button" class="case-type-btn" data-type="condolence">🖤 عزاء</button>' +
                        '<button type="button" class="case-type-btn" data-type="birth">👶 مولود</button>' +
                        '<button type="button" class="case-type-btn" data-type="other">📌 أخرى</button>' +
                    '</div>' +
                    '<label class="case-label">عنوان المناسبة *:</label>' +
                    '<input type="text" id="eventTitle" placeholder="مثال: زفاف أحمد بن علي" maxlength="100">' +
                    '<label class="case-label">الوصف:</label>' +
                    '<textarea id="eventDesc" placeholder="تفاصيل المناسبة..." maxlength="500"></textarea>' +
                    '<label class="case-label">التاريخ *:</label>' +
                    '<input type="date" id="eventDate">' +
                    '<label class="case-label">الوقت:</label>' +
                    '<input type="time" id="eventTime" value="20:00">' +
                    '<label class="case-label">المكان:</label>' +
                    '<input type="text" id="eventLocation" placeholder="مثال: قاعة الأفراح - الصلو">' +
                    '<label class="case-label">رقم التواصل (اختياري):</label>' +
                    '<input type="tel" id="eventPhone" placeholder="+967...">' +
                    '<div class="edit-modal-actions" style="margin-top:16px;">' +
                        '<button type="button" class="btn-cancel" id="cancelEvent">إلغاء</button>' +
                        '<button type="button" class="btn-save" id="submitEvent">نشر</button>' +
                    '</div>' +
                '</div>' +
            '</div>';

        document.body.appendChild(modal);

        var eventType = 'wedding';

        modal.querySelectorAll('.case-type-btn').forEach(function(btn) {
            btn.onclick = function() {
                modal.querySelectorAll('.case-type-btn').forEach(function(b) { b.classList.remove('active'); });
                this.classList.add('active');
                eventType = this.getAttribute('data-type');
            };
        });

        // التاريخ الافتراضي: غداً
        var tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        $('eventDate').value = tomorrow.toISOString().split('T')[0];

        $('closeEventForm').onclick = function() { modal.remove(); };
        $('cancelEvent').onclick = function() { modal.remove(); };

        $('submitEvent').onclick = function() {
            var title = $('eventTitle').value.trim();
            if (!title) { alert('أدخل عنوان المناسبة'); return; }
            var dateVal = $('eventDate').value;
            if (!dateVal) { alert('اختر التاريخ'); return; }
            var timeVal = $('eventTime').value || '20:00';

            var dateTime = dateVal + 'T' + timeVal;

            var user = JSON.parse(localStorage.getItem('dardshti_user') || 'null');
            if (!user) return;

            var list = getEvents();
            list.push({
                id: 'evt_' + Date.now(),
                type: eventType,
                title: title,
                description: $('eventDesc').value.trim(),
                date: dateTime,
                location: $('eventLocation').value.trim(),
                phone: $('eventPhone').value.trim(),
                username: user.username,
                name: user.displayName || user.username,
                time: Date.now()
            });
            saveEvents(list);
            modal.remove();
            render();
            showToast('✅ تم نشر المناسبة');
        };
    }

    // ===== دوال مساعدة =====
    function getCategoryIcon(cat) {
        return { general: '📢', mosque: '🕌', news: '📰', urgent: '⚠️' }[cat] || '📢';
    }

    function getCategoryName(cat) {
        return { general: 'إعلان عام', mosque: 'المسجد', news: 'أخبار', urgent: 'عاجل' }[cat] || 'إعلان';
    }

    function getEventTypeIcon(type) {
        return { wedding: '💍', engagement: '💐', graduation: '🎓', condolence: '🖤', birth: '👶', other: '📌' }[type] || '🎉';
    }

    function getEventTypeName(type) {
        return { wedding: 'زفاف', engagement: 'خطوبة', graduation: 'تخرج', condolence: 'عزاء', birth: 'مولود', other: 'مناسبة' }[type] || 'مناسبة';
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

    // ===== دالة فتح القناة =====
    window.AkishOpen = function(channel) {
        console.log('🏔️ فتح قناة أبناء العكيشة');
        var chatArea = $('chatArea');
        var mainScreen = $('mainScreen');
        if (!chatArea || !mainScreen) return;

        $('hName').textContent = '🏔️ مجتمع أبناء العكيشة';
        var hs = $('hStatus');
        if (hs) {
            var onlineCount = window.DardshtiBackend ? window.DardshtiBackend.getOnlineCount() : null;
            hs.textContent = onlineCount === null ? 'حالة الاتصال غير متاحة' : onlineCount + ' مستخدم متصل بالتطبيق';
            hs.classList.toggle('online', onlineCount !== null && onlineCount > 0);
        }

        var av = $('chatAvatar');
        if (av) {
            av.style.background = 'linear-gradient(135deg, #ff8c42 0%, #cc6f35 100%)';
            av.innerHTML = '🏔️';
        }

        var bc = $('btnCall'); if (bc) bc.style.display = 'none';
        var bv = $('btnVideoCall'); if (bv) bv.style.display = 'none';

        var ib = $('inputBar');
        if (ib) ib.style.display = 'none';

        window._currentChannel = channel;
        currentTab = 'announcements';

        render();

        mainScreen.classList.remove('active');
        chatArea.classList.add('active');
    };

    console.log('✅ مجتمع أبناء العكيشة جاهز');
})();
