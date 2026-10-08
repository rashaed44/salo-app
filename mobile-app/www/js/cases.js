// cases.js - نظام قضايا الصلو (نسخة محسّنة)
(function() {
    'use strict';
    var $ = function(id) { return document.getElementById(id); };

    console.log('⚖️ تحميل نظام قضايا الصلو v2');

    var currentFilter = 'all';
    var currentCaseId = null;

    // ===== القضايا =====
    function getCases() {
        try { return JSON.parse(localStorage.getItem('dardshti_saleh_cases_v2') || '[]'); }
        catch (e) { return []; }
    }

    function saveCases(cases) {
        localStorage.setItem('dardshti_saleh_cases_v2', JSON.stringify(cases));
    }

    // ===== النقاط =====
    function getUserPoints() {
        var user = JSON.parse(localStorage.getItem('dardshti_user') || 'null');
        if (!user) return 0;
        try {
            var points = JSON.parse(localStorage.getItem('dardshti_saleh_points') || '{}');
            return points[user.username] || 0;
        } catch (e) { return 0; }
    }

    function addPoints(amount) {
        var user = JSON.parse(localStorage.getItem('dardshti_user') || 'null');
        if (!user) return;
        try {
            var points = JSON.parse(localStorage.getItem('dardshti_saleh_points') || '{}');
            points[user.username] = (points[user.username] || 0) + amount;
            localStorage.setItem('dardshti_saleh_points', JSON.stringify(points));
        } catch (e) {}
    }

    // ===== عرض القضايا =====
    function renderCases() {
        var msgs = $('msgs');
        if (!msgs) return;
        msgs.innerHTML = '';

        // رأس القناة
        var header = document.createElement('div');
        header.className = 'cases-header';
        header.innerHTML = 
            '<div class="cases-header-icon">⚖️</div>' +
            '<h2>قضايا الصلو</h2>' +
            '<p>منصة الإبلاغ عن المحتوى في المنطقة</p>' +
            '<div class="cases-stats" id="casesStats"></div>' +
            '<button type="button" class="btn-primary" id="btnAddCase" style="margin-top:12px;">➕ إضافة قضية جديدة</button>';

        msgs.appendChild(header);

        // الفلاتر
        var filters = document.createElement('div');
        filters.className = 'cases-filters';
        filters.innerHTML = 
            '<button type="button" class="filter-btn ' + (currentFilter === 'all' ? 'active' : '') + '" data-filter="all">الكل</button>' +
            '<button type="button" class="filter-btn ' + (currentFilter === 'bad' ? 'active' : '') + '" data-filter="bad">🔴 فاسد</button>' +
            '<button type="button" class="filter-btn ' + (currentFilter === 'good' ? 'active' : '') + '" data-filter="good">🟢 مفيد</button>' +
            '<button type="button" class="filter-btn ' + (currentFilter === 'resolved' ? 'active' : '') + '" data-filter="resolved">✅ محلولة</button>';

        msgs.appendChild(filters);

        // ربط الفلاتر
        setTimeout(function() {
            filters.querySelectorAll('.filter-btn').forEach(function(btn) {
                btn.onclick = function() {
                    currentFilter = this.getAttribute('data-filter');
                    renderCases();
                };
            });

            var btnAdd = $('btnAddCase');
            if (btnAdd) btnAdd.onclick = openCaseForm;

            // الإحصائيات
            updateStats();
        }, 100);

        // القضايا
        var cases = getCases();
        cases.sort(function(a, b) { return b.time - a.time; });

        if (currentFilter === 'bad') cases = cases.filter(function(c) { return c.type === 'bad'; });
        else if (currentFilter === 'good') cases = cases.filter(function(c) { return c.type === 'good'; });
        else if (currentFilter === 'resolved') cases = cases.filter(function(c) { return c.status === 'resolved'; });

        if (cases.length === 0) {
            var empty = document.createElement('div');
            empty.className = 'cases-empty';
            empty.innerHTML = 
                '<div style="font-size:48px;opacity:0.5;">📭</div>' +
                '<h3>لا توجد قضايا</h3>' +
                '<p>' + (currentFilter === 'all' ? 'كن أول من يشارك قضية' : 'لا توجد قضايا من هذا النوع') + '</p>';
            msgs.appendChild(empty);
            return;
        }

        var user = JSON.parse(localStorage.getItem('dardshti_user') || 'null');
        cases.forEach(function(c) {
            var card = createCaseCard(c, user);
            msgs.appendChild(card);
        });
    }

    // ===== الإحصائيات =====
    function updateStats() {
        var statsEl = $('casesStats');
        if (!statsEl) return;

        var cases = getCases();
        var total = cases.length;
        var bad = cases.filter(function(c) { return c.type === 'bad'; }).length;
        var good = cases.filter(function(c) { return c.type === 'good'; }).length;
        var resolved = cases.filter(function(c) { return c.status === 'resolved'; }).length;

        statsEl.innerHTML = 
            '<div class="stat-item"><span class="stat-num">' + total + '</span><span class="stat-label">إجمالي</span></div>' +
            '<div class="stat-item stat-bad"><span class="stat-num">' + bad + '</span><span class="stat-label">فاسد</span></div>' +
            '<div class="stat-item stat-good"><span class="stat-num">' + good + '</span><span class="stat-label">مفيد</span></div>' +
            '<div class="stat-item stat-resolved"><span class="stat-num">' + resolved + '</span><span class="stat-label">محلولة</span></div>';
    }

    // ===== بطاقة القضية =====
    function createCaseCard(c, user) {
        var card = document.createElement('div');
        card.className = 'case-card ' + (c.type === 'bad' ? 'case-bad' : 'case-good');
        if (c.status === 'resolved') card.classList.add('case-resolved');

        var isBad = c.type === 'bad';
        var icon = isBad ? '🔴' : '🟢';
        var typeText = isBad ? 'محتوى فاسد' : 'محتوى مفيد';
        var statusText = c.status === 'resolved' ? '✅ محلولة' : (c.status === 'review' ? '🔄 قيد المراجعة' : '🆕 جديدة');

        var timeStr = timeAgo(new Date(c.time));
        var yesVotes = (c.votes && c.votes.yes) ? c.votes.yes.length : 0;
        var noVotes = (c.votes && c.votes.no) ? c.votes.no.length : 0;
        var commentsCount = (c.comments) ? c.comments.length : 0;

        var userVoted = null;
        if (user && c.votes) {
            if (c.votes.yes && c.votes.yes.indexOf(user.username) !== -1) userVoted = 'yes';
            if (c.votes.no && c.votes.no.indexOf(user.username) !== -1) userVoted = 'no';
        }

        var canResolve = user && user.username === c.username;

        var html = 
            '<div class="case-card-header">' +
                '<div class="case-type-badge ' + (isBad ? 'bad' : 'good') + '">' + icon + ' ' + typeText + '</div>' +
                '<div class="case-status ' + (c.status || 'new') + '">' + statusText + '</div>' +
            '</div>' +
            '<h3 class="case-title">' + esc(c.title) + '</h3>';

        if (c.desc) html += '<p class="case-desc">' + esc(c.desc) + '</p>';
        if (c.location) html += '<div class="case-location">📍 ' + esc(c.location) + '</div>';
        if (c.image) html += '<div class="case-image"><img src="' + c.image + '" alt="صورة"></div>';

        html += 
            '<div class="case-author">' +
                '<div class="case-author-avatar"></div>' +
                '<div class="case-author-info">' +
                    '<div class="case-author-name">' + esc(c.name) + '</div>' +
                    '<div class="case-author-time">' + timeStr + '</div>' +
                '</div>' +
            '</div>';

        html += 
            '<div class="case-votes">' +
                '<button type="button" class="vote-btn yes ' + (userVoted === 'yes' ? 'voted' : '') + '" data-vote="yes">' +
                    '<span>👍</span><span class="vote-count">' + yesVotes + '</span>' +
                '</button>' +
                '<button type="button" class="vote-btn no ' + (userVoted === 'no' ? 'voted' : '') + '" data-vote="no">' +
                    '<span>👎</span><span class="vote-count">' + noVotes + '</span>' +
                '</button>' +
                '<button type="button" class="comment-btn" data-action="comments">' +
                    '<span>💬</span><span class="vote-count">' + commentsCount + '</span>' +
                '</button>' +
            '</div>';

        // خيارات الحالة (للمالك فقط)
        if (canResolve && c.status !== 'resolved') {
            html += '<div class="case-admin-actions">' +
                '<button type="button" class="resolve-btn" data-action="resolve">✅ تم الحل</button>' +
                '<button type="button" class="delete-btn" data-action="delete">🗑️ حذف</button>' +
            '</div>';
        }

        card.innerHTML = html;

        // Avatar
        var avatarEl = card.querySelector('.case-author-avatar');
        if (avatarEl) {
            var img = document.createElement('img');
            img.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(c.name);
            img.onerror = function() { avatarEl.textContent = c.name.charAt(0); };
            avatarEl.appendChild(img);
        }

        // التصويت
        card.querySelectorAll('.vote-btn').forEach(function(btn) {
            btn.onclick = function() {
                if (!user) { alert('سجّل دخول أولاً'); return; }
                handleVote(c.id, btn.getAttribute('data-vote'), user.username);
            };
        });

        // التعليقات
        var commentBtn = card.querySelector('[data-action="comments"]');
        if (commentBtn) {
            commentBtn.onclick = function() { openComments(c.id); };
        }

        // تم الحل
        var resolveBtn = card.querySelector('[data-action="resolve"]');
        if (resolveBtn) {
            resolveBtn.onclick = function() {
                if (!confirm('وضع علامة "محلولة" على هذه القضية؟')) return;
                markResolved(c.id);
            };
        }

        // حذف
        var deleteBtn = card.querySelector('[data-action="delete"]');
        if (deleteBtn) {
            deleteBtn.onclick = function() {
                if (!confirm('حذف هذه القضية نهائياً؟')) return;
                deleteCase(c.id);
            };
        }

        // النقر على الصورة
        var img = card.querySelector('.case-image img');
        if (img) {
            img.onclick = function() {
                var lb = $('lightbox'), lbImg = $('lbImg');
                if (lb && lbImg) { lbImg.src = img.src; lb.classList.add('active'); }
            };
        }

        return card;
    }

    // ===== التصويت =====
    function handleVote(caseId, voteType, username) {
        var cases = getCases();
        var c = cases.find(function(x) { return x.id === caseId; });
        if (!c) return;

        if (!c.votes) c.votes = { yes: [], no: [] };
        if (!c.votes.yes) c.votes.yes = [];
        if (!c.votes.no) c.votes.no = [];

        var yesIdx = c.votes.yes.indexOf(username);
        var noIdx = c.votes.no.indexOf(username);

        if (yesIdx !== -1) c.votes.yes.splice(yesIdx, 1);
        if (noIdx !== -1) c.votes.no.splice(noIdx, 1);

        if (voteType === 'yes' && yesIdx === -1) c.votes.yes.push(username);
        else if (voteType === 'no' && noIdx === -1) c.votes.no.push(username);

        saveCases(cases);
        renderCases();
    }

    // ===== تم الحل =====
    function markResolved(caseId) {
        var cases = getCases();
        var c = cases.find(function(x) { return x.id === caseId; });
        if (!c) return;
        c.status = 'resolved';
        c.resolvedAt = Date.now();
        saveCases(cases);
        addPoints(10);
        renderCases();
        showToast('✅ تم وضع علامة محلولة (+10 نقاط)');
    }

    // ===== حذف =====
    function deleteCase(caseId) {
        var cases = getCases().filter(function(x) { return x.id !== caseId; });
        saveCases(cases);
        renderCases();
        showToast('🗑️ تم حذف القضية');
    }

    // ===== نافذة التعليقات =====
    function openComments(caseId) {
        currentCaseId = caseId;
        var cases = getCases();
        var c = cases.find(function(x) { return x.id === caseId; });
        if (!c) return;

        var existing = $('commentsModal');
        if (existing) existing.remove();

        var user = JSON.parse(localStorage.getItem('dardshti_user') || 'null');
        var comments = c.comments || [];

        var modal = document.createElement('div');
        modal.id = 'commentsModal';
        modal.className = 'modal-overlay active';

        var commentsHtml = '';
        if (comments.length === 0) {
            commentsHtml = '<p style="text-align:center;color:#5a6485;padding:20px;">لا توجد تعليقات بعد</p>';
        } else {
            comments.forEach(function(cm) {
                commentsHtml += 
                    '<div class="comment-item">' +
                        '<div class="comment-avatar"></div>' +
                        '<div class="comment-body">' +
                            '<div class="comment-user">' + esc(cm.name) + '</div>' +
                            '<div class="comment-text">' + esc(cm.text) + '</div>' +
                            '<div class="comment-time">' + timeAgo(new Date(cm.time)) + '</div>' +
                        '</div>' +
                    '</div>';
            });
        }

        modal.innerHTML = 
            '<div class="modal">' +
                '<div class="modal-header">' +
                    '<h3>💬 التعليقات (' + comments.length + ')</h3>' +
                    '<button type="button" id="closeComments" aria-label="إغلاق">✕</button>' +
                '</div>' +
                '<div class="modal-body">' +
                    '<div class="comments-list" id="commentsList">' + commentsHtml + '</div>' +
                    (user ? 
                        '<div class="comment-form">' +
                            '<input type="text" id="newComment" placeholder="اكتب تعليقاً..." maxlength="500">' +
                            '<button type="button" id="sendComment">إرسال</button>' +
                        '</div>' :
                        '<p style="text-align:center;color:#5a6485;padding:10px;">سجّل دخول للتعليق</p>'
                    ) +
                '</div>' +
            '</div>';

        document.body.appendChild(modal);

        // Avatars للتعليقات
        modal.querySelectorAll('.comment-avatar').forEach(function(av, i) {
            if (comments[i]) {
                var img = document.createElement('img');
                img.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(comments[i].name);
                img.onerror = function() { av.textContent = comments[i].name.charAt(0); };
                av.appendChild(img);
            }
        });

        // إغلاق
        var closeBtn = $('closeComments');
        if (closeBtn) closeBtn.onclick = function() { modal.remove(); };

        // إرسال تعليق
        var sendBtn = $('sendComment');
        var commentInput = $('newComment');
        if (sendBtn && commentInput && user) {
            var sendComment = function() {
                var text = commentInput.value.trim();
                if (!text) return;

                var cases = getCases();
                var c2 = cases.find(function(x) { return x.id === caseId; });
                if (!c2) return;

                if (!c2.comments) c2.comments = [];
                c2.comments.push({
                    username: user.username,
                    name: user.displayName || user.username,
                    text: text,
                    time: Date.now()
                });
                saveCases(cases);
                addPoints(2);
                modal.remove();
                openComments(caseId);
                renderCases();
            };

            sendBtn.onclick = sendComment;
            commentInput.onkeypress = function(e) {
                if (e.key === 'Enter') { e.preventDefault(); sendComment(); }
            };
            setTimeout(function() { commentInput.focus(); }, 300);
        }
    }

    // ===== نافذة إضافة قضية =====
    function openCaseForm() {
        var existing = $('caseFormModal');
        if (existing) existing.remove();

        var user = JSON.parse(localStorage.getItem('dardshti_user') || 'null');
        if (!user) { alert('سجّل دخول أولاً'); return; }

        var modal = document.createElement('div');
        modal.id = 'caseFormModal';
        modal.className = 'modal-overlay active';
        modal.innerHTML = 
            '<div class="modal">' +
                '<div class="modal-header">' +
                    '<h3>⚖️ إضافة قضية جديدة</h3>' +
                    '<button type="button" id="closeCaseForm" aria-label="إغلاق">✕</button>' +
                '</div>' +
                '<div class="modal-body">' +
                    '<label class="case-label">نوع القضية:</label>' +
                    '<div class="case-type-buttons">' +
                        '<button type="button" class="case-type-btn" data-type="bad">🔴 محتوى فاسد</button>' +
                        '<button type="button" class="case-type-btn" data-type="good">🟢 محتوى مفيد</button>' +
                    '</div>' +
                    '<label class="case-label">عنوان القضية *:</label>' +
                    '<input type="text" id="caseTitle" placeholder="عنوان مختصر..." maxlength="100">' +
                    '<label class="case-label">الوصف:</label>' +
                    '<textarea id="caseDesc" placeholder="اشرح القضية بالتفصيل..." maxlength="1000"></textarea>' +
                    '<label class="case-label">الموقع (اختياري):</label>' +
                    '<input type="text" id="caseLocation" placeholder="مثال: الصلو - السوق" maxlength="100">' +
                    '<label class="case-label">صورة (اختياري):</label>' +
                    '<input type="file" id="caseImage" accept="image/*">' +
                    '<div id="caseImagePreview" style="display:none;margin-top:10px;">' +
                        '<img id="caseImagePreviewImg" style="max-width:100%;border-radius:12px;">' +
                    '</div>' +
                    '<div class="edit-modal-actions" style="margin-top:16px;">' +
                        '<button type="button" class="btn-cancel" id="cancelCase">إلغاء</button>' +
                        '<button type="button" class="btn-save" id="submitCase">نشر القضية</button>' +
                    '</div>' +
                '</div>' +
            '</div>';

        document.body.appendChild(modal);

        var selectedType = null;
        var imageData = null;

        modal.querySelectorAll('.case-type-btn').forEach(function(btn) {
            btn.onclick = function() {
                modal.querySelectorAll('.case-type-btn').forEach(function(b) { b.classList.remove('active'); });
                this.classList.add('active');
                selectedType = this.getAttribute('data-type');
            };
        });

        var imageInput = $('caseImage');
        if (imageInput) {
            imageInput.onchange = function() {
                var file = this.files[0];
                if (!file) return;
                if (file.size > 2 * 1024 * 1024) {
                    alert('حجم الصورة كبير (الحد 2 ميجا)');
                    return;
                }
                var reader = new FileReader();
                reader.onload = function(e) {
                    imageData = e.target.result;
                    var preview = $('caseImagePreview');
                    var img = $('caseImagePreviewImg');
                    if (preview && img) { img.src = imageData; preview.style.display = 'block'; }
                };
                reader.readAsDataURL(file);
            };
        }

        $('closeCaseForm').onclick = function() { modal.remove(); };
        $('cancelCase').onclick = function() { modal.remove(); };

        $('submitCase').onclick = function() {
            if (!selectedType) { alert('اختر نوع القضية'); return; }
            var title = $('caseTitle').value.trim();
            if (!title) { alert('أدخل عنوان القضية'); return; }
            var desc = $('caseDesc').value.trim();
            var location = $('caseLocation').value.trim();

            var cases = getCases();
            cases.push({
                id: 'case_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                type: selectedType,
                title: title,
                desc: desc,
                location: location,
                image: imageData,
                username: user.username,
                name: user.displayName || user.username,
                votes: { yes: [], no: [] },
                comments: [],
                status: 'new',
                time: Date.now()
            });
            saveCases(cases);
            addPoints(5);
            modal.remove();
            renderCases();
            showToast('✅ تم نشر القضية (+5 نقاط)');
        };
    }

    // ===== دوال مساعدة =====
    function timeAgo(date) {
        var seconds = Math.floor((Date.now() - date.getTime()) / 1000);
        if (seconds < 60) return 'الآن';
        if (seconds < 3600) return Math.floor(seconds / 60) + ' دقيقة';
        if (seconds < 86400) return Math.floor(seconds / 3600) + ' ساعة';
        if (seconds < 604800) return Math.floor(seconds / 86400) + ' يوم';
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
    window.CasesOpen = function(channel) {
        console.log('⚖️ فتح قناة الصلو');
        var chatArea = $('chatArea');
        var mainScreen = $('mainScreen');
        if (!chatArea || !mainScreen) return;

        $('hName').textContent = '⚖️ قضايا الصلو';
        var hs = $('hStatus');
        if (hs) { hs.textContent = 'منصة الإبلاغ'; hs.classList.add('online'); }

        var av = $('chatAvatar');
        if (av) {
            av.style.background = 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)';
            av.innerHTML = '⚖️';
        }

        var bc = $('btnCall'); if (bc) bc.style.display = 'none';
        var bv = $('btnVideoCall'); if (bv) bv.style.display = 'none';

        var ib = $('inputBar');
        if (ib) ib.style.display = 'none';

        window._currentChannel = channel;
        currentFilter = 'all';

        renderCases();

        mainScreen.classList.remove('active');
        chatArea.classList.add('active');
    };

    console.log('✅ نظام قضايا الصلو v2 جاهز');
})();
