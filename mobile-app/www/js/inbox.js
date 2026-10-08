// Unified inbox: read-only aggregation of direct messages, server notifications, and saved-message references.
(function() {
    'use strict';
    var $ = function(id) { return document.getElementById(id); };
    var source = { conversations: [], channels: [], notifications: [], saved: [] };
    var filter = 'all';
    var query = '';
    var loading = false;
    var refreshTimer = null;

    function escapeText(value) { return String(value == null ? '' : value); }
    function localConversations() {
        try {
            var chats = JSON.parse(localStorage.getItem('dardshti_chats') || '[]');
            return Array.isArray(chats) ? chats.map(function(chat) {
                var last = Array.isArray(chat.messages) && chat.messages.length ? chat.messages[chat.messages.length - 1] : null;
                return { username: chat.username, name: chat.name || chat.username || 'محادثة', lastMessage: last ? (last.text || (last.hasImage ? 'صورة مرفقة' : 'رسالة')) : 'لا توجد رسائل بعد', lastMessageAt: last && last.time, sentByMe: last && last.sent, _local: true };
            }).filter(function(chat) { return Boolean(chat.username); }) : [];
        } catch (e) { return []; }
    }
    function savedMessages() {
        try {
            var items = JSON.parse(localStorage.getItem('dardshti_saved_messages') || '[]');
            return Array.isArray(items) ? items.filter(function(item) { return item && item.username; }) : [];
        } catch (e) { return []; }
    }
    function localChannelMessages() {
        var names = { general: 'دردشة عامة', sports: 'دردشة رياضية', friends: 'دردشة الأصدقاء', fun: 'الدردشة العكيشة', akish: 'مجتمع أبناء العكيشة' };
        var result = [];
        Object.keys(names).forEach(function(id) {
            try {
                var messages = JSON.parse(localStorage.getItem('dardshti_channel_msgs_' + id) || '[]');
                if (!Array.isArray(messages) || !messages.length) return;
                var last = messages[messages.length - 1];
                result.push({ channelId: id, name: names[id], lastMessage: last.text || 'رسالة', lastMessageAt: last.time || last.createdAt, sentByMe: Boolean(last.sent) });
            } catch (e) {}
        });
        return result;
    }
    function relativeDate(value) {
        var date = new Date(value || Date.now());
        return isNaN(date.getTime()) ? '' : date.toLocaleString('ar');
    }
    function updateBadge() {
        var unread = source.notifications.filter(function(item) { return !Number(item.isRead); }).length;
        var badge = $('inboxUnreadBadge');
        if (badge) {
            badge.textContent = unread > 99 ? '99+' : String(unread);
            badge.hidden = unread === 0;
        }
        var unreadSummary = $('inboxUnreadSummary');
        if (unreadSummary) unreadSummary.textContent = unread ? unread + ' إشعار غير مقروء' : 'لا توجد إشعارات غير مقروءة';
    }
    function allItems() {
        var items = [];
        source.conversations.forEach(function(item) {
            items.push({ kind: 'message', date: item.lastMessageAt, key: 'm:' + item.username,
                title: item.name || item.username, text: item.lastMessage || 'رسالة', username: item.username,
                sentByMe: item.sentByMe, messageId: item.lastMessageId, unread: false });
        });
        source.channels.forEach(function(item) {
            items.push({ kind: 'channel', date: item.lastMessageAt, key: 'c:' + item.channelId,
                title: item.name, text: item.lastMessage || 'رسالة', channelId: item.channelId, unread: false });
        });
        source.notifications.forEach(function(item) {
            items.push({ kind: 'notification', date: item.createdAt, key: 'n:' + item.id,
                title: item.title || 'إشعار', text: item.body || '', unread: !Number(item.isRead), id: item.id, raw: item });
        });
        source.saved.forEach(function(item) {
            items.push({ kind: 'saved', date: item.time, key: 's:' + item.key,
                title: (item.chatName || item.username || 'محادثة') + ' · رسالة محفوظة',
                text: item.text || (item.hasImage ? 'صورة محفوظة من الرسالة الأصلية' : 'رسالة محفوظة'),
                username: item.username, messageId: item.id });
        });
        return items.sort(function(a, b) { return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime(); });
    }
    function render() {
        var list = $('inboxList');
        if (!list) return;
        list.innerHTML = '';
        updateBadge();
        var items = allItems().filter(function(item) {
            var matchesFilter = filter === 'all' || (filter === 'messages' && (item.kind === 'message' || item.kind === 'channel')) || (filter === 'notifications' && item.kind === 'notification') || (filter === 'saved' && item.kind === 'saved');
            var haystack = (item.title + ' ' + item.text).toLocaleLowerCase();
            return matchesFilter && (!query || haystack.indexOf(query.toLocaleLowerCase()) !== -1);
        });
        if (!items.length) {
            var empty = document.createElement('div');
            empty.className = 'inbox-empty';
            empty.innerHTML = '<span class="inbox-empty-icon">✉</span><strong>' + (loading ? 'جار تحميل الوارد…' : 'صندوق الوارد فارغ') + '</strong><small>' + (filter === 'all' ? 'ستظهر هنا الرسائل الخاصة والتنبيهات والرسائل التي حفظتها.' : 'لا توجد عناصر في هذا التصنيف حالياً.') + '</small>';
            list.appendChild(empty);
            return;
        }
        items.forEach(function(item) {
            var card = document.createElement('article');
            card.className = 'inbox-card inbox-' + item.kind + (item.unread ? ' is-unread' : '');
            card.dataset.kind = item.kind;
            var icon = document.createElement('span');
            icon.className = 'inbox-card-icon';
            icon.textContent = item.kind === 'message' ? '◌' : (item.kind === 'channel' ? '▤' : (item.kind === 'notification' ? '♧' : '☆'));
            var content = document.createElement('div');
            content.className = 'inbox-card-content';
            var title = document.createElement('strong');
            title.textContent = item.title;
            var body = document.createElement('p');
            body.textContent = item.text;
            var meta = document.createElement('small');
            meta.textContent = (item.kind === 'message' ? (item.sentByMe ? 'أنت: ' : 'رسالة خاصة · ') : item.kind === 'channel' ? 'رسالة قناة · ' : item.kind === 'notification' ? 'تنبيه · ' : 'محفوظة · ') + relativeDate(item.date);
            content.appendChild(title); content.appendChild(body); content.appendChild(meta);
            if (item.unread) {
                var dot = document.createElement('span');
                dot.className = 'inbox-unread-dot';
                dot.setAttribute('aria-label', 'غير مقروء');
                card.appendChild(dot);
            }
            card.appendChild(icon); card.appendChild(content);
            if (item.kind === 'message') card.onclick = function() {
                if (window.DardshtiOpenDirectChat) window.DardshtiOpenDirectChat(item.username, item.title, item.messageId);
            };
            else if (item.kind === 'channel') card.onclick = function() {
                if (window.Channels && window.Channels.openById) window.Channels.openById(item.channelId);
            };
            else if (item.kind === 'saved') card.onclick = function() {
                if (window.DardshtiOpenDirectChat) window.DardshtiOpenDirectChat(item.username, item.title.split(' · ')[0], item.messageId);
            };
            else card.onclick = function() {
                if (!item.unread || !window.DardshtiBackend) return;
                window.DardshtiBackend.markNotificationRead(item.id).then(function() {
                    item.raw.isRead = 1;
                    source.notifications = source.notifications.map(function(notification) { return notification.id === item.id ? item.raw : notification; });
                    render();
                }).catch(function() {});
            };
            list.appendChild(card);
        });
    }
    function refresh() {
        if (loading) return;
        loading = true;
        source.saved = savedMessages();
        var backend = window.DardshtiBackend;
        if (!backend || !localStorage.getItem('dardshti_api_token')) {
            source.conversations = localConversations();
            source.channels = localChannelMessages();
            source.notifications = [];
            loading = false;
            render();
            return;
        }
        Promise.allSettled([backend.loadInboxConversations(), backend.listNotifications()]).then(function(results) {
            source.channels = localChannelMessages();
            var remoteConversations = results[0].status === 'fulfilled' ? results[0].value : [];
            source.notifications = results[1].status === 'fulfilled' ? results[1].value : [];
            var byUsername = Object.create(null);
            localConversations().forEach(function(chat) { byUsername[chat.username] = chat; });
            remoteConversations.forEach(function(chat) { byUsername[chat.username] = chat; });
            source.conversations = Object.keys(byUsername).map(function(key) { return byUsername[key]; });
        }).catch(function() {
            source.conversations = localConversations();
            source.channels = localChannelMessages();
            source.notifications = [];
        }).finally(function() {
            loading = false;
            render();
        });
    }
    function bind() {
        document.querySelectorAll('.inbox-filter').forEach(function(button) {
            button.onclick = function() {
                filter = button.dataset.filter || 'all';
                document.querySelectorAll('.inbox-filter').forEach(function(candidate) { candidate.classList.toggle('active', candidate === button); });
                render();
            };
        });
        var search = $('inboxSearch');
        if (search) search.oninput = function() { query = this.value.trim(); render(); };
        var refreshButton = $('inboxRefresh');
        if (refreshButton) refreshButton.onclick = refresh;
    }
    function open() {
        if (!window.DardshtiShowSection) return;
        window.DardshtiShowSection('inbox');
        refresh();
    }
    function boot() {
        bind();
        refresh();
        if (refreshTimer) clearInterval(refreshTimer);
        refreshTimer = setInterval(function() {
            var section = $('sectionInbox');
            if (section && section.classList.contains('active')) refresh();
        }, 30000);
    }
    window.DardshtiInbox = { refresh: refresh, open: open };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
