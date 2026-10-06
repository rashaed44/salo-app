// Cloud feature layer: groups, notifications, follows, and shared content.
(function () {
    'use strict';
    var $ = function (id) { return document.getElementById(id); };
    var backend = window.DardshtiBackend;

    function esc(value) {
        return String(value == null ? '' : value).replace(/[&<>'"]/g, function (ch) {
            return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[ch];
        });
    }

    function style() {
        if ($('cloudFeatureStyles')) return;
        var css = document.createElement('style');
        css.id = 'cloudFeatureStyles';
        css.textContent = '.cloud-panel{margin:12px 14px;padding:14px;border:1px solid rgba(95,205,255,.18);border-radius:18px;background:rgba(11,20,48,.72);box-shadow:0 8px 25px rgba(0,0,0,.18)}.cloud-panel h3{margin:0 0 10px;color:#fff}.cloud-row{display:flex;gap:8px;align-items:center;margin:8px 0}.cloud-row input,.cloud-row textarea,.cloud-panel select{flex:1;background:#101b3b;color:#fff;border:1px solid #21436c;border-radius:10px;padding:10px;font:inherit}.cloud-btn{border:0;border-radius:10px;padding:9px 13px;background:linear-gradient(135deg,#19c9ed,#6843ef);color:white;font-weight:700;cursor:pointer}.cloud-btn.ghost{background:#142344}.cloud-list{display:grid;gap:8px}.cloud-card{padding:11px;border-radius:13px;background:rgba(255,255,255,.055);color:#dce8ff}.cloud-card small{color:#8fa8ca}.cloud-actions{display:flex;gap:8px;margin-top:8px}.cloud-empty{color:#8fa8ca;text-align:center;padding:12px}.cloud-badge{display:inline-flex;min-width:18px;height:18px;align-items:center;justify-content:center;background:#ff4f7b;border-radius:10px;font-size:11px;margin-right:4px}.cloud-notify{position:fixed;z-index:1000;top:68px;right:12px;width:min(340px,calc(100vw - 24px));max-height:70vh;overflow:auto}.cloud-notify .cloud-card{cursor:pointer}.cloud-author{font-weight:700;color:#63d6ff}.cloud-muted{color:#93a9c8;font-size:12px}';
        document.head.appendChild(css);
    }

    function notifyButton() {
        var header = $('appHeader');
        if (!header || $('btnNotifications')) return;
        var actions = header.querySelector('.header-actions') || header;
        var button = document.createElement('button');
        button.type = 'button';
        button.id = 'btnNotifications';
        button.setAttribute('aria-label', 'الإشعارات');
        button.textContent = '🔔';
        button.onclick = function () {
            var box = $('cloudNotifications');
            if (box) box.remove(); else renderNotifications(true);
        };
        actions.insertBefore(button, actions.firstChild);
    }

    function renderNotifications(open) {
        if (!backend || !backend.listNotifications || !localStorage.getItem('dardshti_api_token')) return;
        backend.listNotifications().then(function (items) {
            var unread = items.filter(function (n) { return !n.isRead; }).length;
            var button = $('btnNotifications');
            if (button) button.innerHTML = '🔔' + (unread ? '<span class="cloud-badge">' + unread + '</span>' : '');
            if (!open) return;
            var box = document.createElement('div');
            box.id = 'cloudNotifications';
            box.className = 'cloud-panel cloud-notify';
            box.innerHTML = '<h3>الإشعارات</h3><div class="cloud-list">' + (items.length ? items.map(function (n) {
                return '<div class="cloud-card" data-notification="' + n.id + '"><strong>' + esc(n.title) + '</strong><br><span>' + esc(n.body || '') + '</span><br><small>' + new Date(n.createdAt).toLocaleString('ar') + '</small></div>';
            }).join('') : '<div class="cloud-empty">لا توجد إشعارات جديدة</div>') + '</div>';
            document.body.appendChild(box);
            box.querySelectorAll('[data-notification]').forEach(function (card) {
                card.onclick = function () {
                    backend.markNotificationRead(card.getAttribute('data-notification')).catch(function () {});
                    card.style.opacity = '.55';
                };
            });
        }).catch(function () {});
    }

    function groupsPanel() {
        var section = $('sectionGroups');
        if (!section || $('cloudGroupsPanel')) return;
        var panel = document.createElement('div');
        panel.id = 'cloudGroupsPanel';
        panel.className = 'cloud-panel';
        panel.innerHTML = '<h3>المجموعات والمجتمعات</h3><div class="cloud-row"><input id="cloudGroupName" placeholder="اسم المجموعة"><input id="cloudGroupDesc" placeholder="وصف مختصر"><button class="cloud-btn" id="cloudCreateGroup">إنشاء</button></div><div class="cloud-list" id="cloudGroupsList"><div class="cloud-empty">جارٍ التحميل...</div></div>';
        section.innerHTML = '';
        section.appendChild(panel);
        $('cloudCreateGroup').onclick = function () {
            if (!backend || !localStorage.getItem('dardshti_api_token')) return alert('سجّل الدخول أولاً');
            var name = $('cloudGroupName').value.trim();
            var desc = $('cloudGroupDesc').value.trim();
            if (!name) return alert('أدخل اسم المجموعة');
            backend.createGroup(name, desc, 'public').then(loadGroups).catch(function (e) { alert(e.message); });
        };
        loadGroups();
    }

    function loadGroups() {
        var list = $('cloudGroupsList');
        if (!list || !backend || !localStorage.getItem('dardshti_api_token')) {
            if (list) list.innerHTML = '<div class="cloud-empty">سجّل الدخول لعرض المجموعات</div>';
            return;
        }
        backend.listGroups().then(function (groups) {
            list.innerHTML = groups.length ? groups.map(function (group) {
                return '<div class="cloud-card"><strong>' + esc(group.name) + '</strong><br><span>' + esc(group.description || 'مجموعة دردشتي') + '</span><div class="cloud-actions"><button class="cloud-btn" data-join-group="' + group.id + '">انضمام</button><span class="cloud-muted">مجموعة عامة</span></div></div>';
            }).join('') : '<div class="cloud-empty">لا توجد مجموعات بعد. أنشئ أول مجموعة.</div>';
            list.querySelectorAll('[data-join-group]').forEach(function (button) {
                button.onclick = function () { backend.joinGroup(button.getAttribute('data-join-group')).then(function () { button.textContent = 'تم الانضمام'; button.disabled = true; }).catch(function (e) { alert(e.message); }); };
            });
        }).catch(function () { list.innerHTML = '<div class="cloud-empty">تعذر تحميل المجموعات</div>'; });
    }

    function cloudFeed() {
        var section = $('sectionReviews');
        if (!section || $('cloudFeedPanel')) return;
        var panel = document.createElement('div');
        panel.id = 'cloudFeedPanel';
        panel.className = 'cloud-panel';
        panel.innerHTML = '<h3>المنشورات العامة</h3><div class="cloud-row"><textarea id="cloudPostText" rows="2" placeholder="انشر شيئاً يراه الجميع..."></textarea><button class="cloud-btn" id="cloudPublishPost">نشر</button></div><div id="cloudPostsList" class="cloud-list"><div class="cloud-empty">سجّل الدخول لرؤية المنشورات</div></div>';
        section.insertBefore(panel, section.firstChild);
        $('cloudPublishPost').onclick = function () {
            if (!backend || !localStorage.getItem('dardshti_api_token')) return alert('سجّل الدخول أولاً');
            var text = $('cloudPostText').value.trim();
            if (!text) return alert('اكتب نص المنشور');
            backend.createContent('post', { text: text }).then(function () { $('cloudPostText').value = ''; renderPosts(); }).catch(function (e) { alert(e.message); });
        };
        renderPosts();
    }

    function renderPosts() {
        var list = $('cloudPostsList');
        if (!list || !backend || !localStorage.getItem('dardshti_api_token')) return;
        backend.listContent('post').then(function (items) {
            list.innerHTML = items.length ? items.map(function (item) {
                var payload = item.payload || {};
                return '<div class="cloud-card"><div class="cloud-author">مستخدم #' + item.ownerId + '</div><div>' + esc(payload.text || '') + '</div><div class="cloud-actions"><button class="cloud-btn ghost" data-like="' + item.id + '">♥ إعجاب</button><button class="cloud-btn ghost" data-comment="' + item.id + '">💬 تعليق</button><small class="cloud-muted">' + new Date(item.createdAt).toLocaleString('ar') + '</small></div><div class="cloud-comments" id="comments-' + item.id + '"></div></div>';
            }).join('') : '<div class="cloud-empty">لا توجد منشورات بعد</div>';
            list.querySelectorAll('[data-like]').forEach(function (button) { button.onclick = function () { backend.toggleReaction(button.getAttribute('data-like'), 'like').then(function (result) { button.textContent = result.active ? '♥ تم الإعجاب' : '♥ إعجاب'; }); }; });
            list.querySelectorAll('[data-comment]').forEach(function (button) { button.onclick = function () { var text = prompt('اكتب تعليقك'); if (text) backend.addComment(button.getAttribute('data-comment'), text).then(renderPosts); }; });
        }).catch(function () { list.innerHTML = '<div class="cloud-empty">تعذر تحميل المنشورات</div>'; });
    }

    function boot() {
        style();
        notifyButton();
        groupsPanel();
        cloudFeed();
        renderNotifications(false);
        setInterval(function () { renderNotifications(false); }, 30000);
        document.addEventListener('click', function (event) {
            var nav = event.target.closest && event.target.closest('.nav-btn[data-section="groups"]');
            if (nav) setTimeout(loadGroups, 100);
            var reviews = event.target.closest && event.target.closest('.nav-btn[data-section="reviews"]');
            if (reviews) setTimeout(renderPosts, 100);
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
