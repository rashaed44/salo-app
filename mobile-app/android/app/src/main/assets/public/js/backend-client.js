// DARDSHTI backend client: central auth, state sync, users, and messages.
(function () {
    'use strict';

    var configuredBase = (window.DARDSHTI_API_BASE || '').trim();
    var apiBase = configuredBase || (window.location.protocol === 'capacitor:' || window.location.protocol === 'file:'
        ? (window.DARDSHTI_FALLBACK_API_BASE || '')
        : window.location.origin);
    var tokenKey = 'dardshti_api_token';
    if (!apiBase && (window.location.protocol === 'capacitor:' || window.location.protocol === 'file:')) {
        apiBase = window.DARDSHTI_FALLBACK_API_BASE || '';
    }
    var originalSetItem = localStorage.setItem.bind(localStorage);
    var originalRemoveItem = localStorage.removeItem.bind(localStorage);
    var syncTimer = null;
    var syncing = false;
    var readyUser = null;
    var heartbeatTimer = null;
    var heartbeatInFlight = false;
    var onlineCount = null;

    function request(path, options) {
        options = options || {};
        var headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
        var token = originalGetItem(tokenKey);
        if (token) headers.Authorization = 'Bearer ' + token;
        var controller = new AbortController();
        var timeoutMs = options.timeoutMs || 12000;
        var requestOptions = Object.assign({}, options, { headers: headers, signal: controller.signal });
        delete requestOptions.timeoutMs;
        var timeout = setTimeout(function() { controller.abort(); }, timeoutMs);
        return fetch(apiBase + path, requestOptions).then(function (res) {
            return res.text().then(function (body) {
                var data = {};
                try { data = body ? JSON.parse(body) : {}; } catch (e) { data = {}; }
                if (!res.ok) {
                    var error = new Error(data.error || 'تعذر الاتصال بالخادم');
                    error.status = res.status;
                    throw error;
                }
                return data;
            });
        }).catch(function(error) {
            if (error && error.name === 'AbortError') throw new Error('انتهت مهلة الاتصال بالخادم. أعد المحاولة عند توفر الإنترنت.');
            throw error;
        }).finally(function() { clearTimeout(timeout); });
    }

    var originalGetItem = localStorage.getItem.bind(localStorage);
    function stateKeys() {
        var keys = {};
        for (var i = 0; i < localStorage.length; i++) {
            var key = localStorage.key(i);
            if (key && key.indexOf('dardshti_') === 0 && key !== 'dardshti_user' && key !== 'dardshti_users' && key !== tokenKey) {
                keys[key] = originalGetItem(key);
            }
        }
        return keys;
    }

    function clearRemoteStateKeys() {
        var keys = Object.keys(stateKeys());
        keys.forEach(function (key) { originalRemoveItem(key); });
    }

    function scheduleSync() {
        if (!originalGetItem(tokenKey) || syncing) return;
        clearTimeout(syncTimer);
        syncTimer = setTimeout(function () {
            syncing = true;
            request('/api/legacy/state', { method: 'PUT', body: JSON.stringify({ state: stateKeys() }) })
                .catch(function (error) { console.warn('[Dardshti] state sync failed:', error.message); })
                .finally(function () { syncing = false; });
        }, 450);
    }

    localStorage.setItem = function (key, value) {
        originalSetItem(key, value);
        if (key && key.indexOf('dardshti_') === 0 && key !== 'dardshti_user' && key !== 'dardshti_users' && key !== tokenKey) scheduleSync();
    };

    function hydrate() {
        if (!originalGetItem(tokenKey)) return Promise.resolve(null);
        return Promise.all([
            request('/api/legacy/auth/me'),
            request('/api/legacy/state')
        ]).then(function (result) {
            readyUser = result[0].user;
            clearRemoteStateKeys();
            var remoteState = result[1].state || {};
            Object.keys(remoteState).forEach(function (key) {
                if (key.indexOf('dardshti_') === 0 && key !== 'dardshti_user' && key !== 'dardshti_users' && key !== tokenKey) {
                    originalSetItem(key, remoteState[key]);
                }
            });
            originalSetItem('dardshti_user', JSON.stringify(readyUser));
            startPresence();
            return readyUser;
        }).catch(function (error) {
            if (error.status === 401) originalRemoveItem(tokenKey);
            readyUser = null;
            return null;
        });
    }

    function setSession(data) {
        originalSetItem(tokenKey, data.token);
        originalSetItem('dardshti_user', JSON.stringify(data.user));
        readyUser = data.user;
        return hydrate().then(function () {
            startPresence();
            return data.user;
        });
    }

    function login(username, password) {
        return request('/api/legacy/auth/login', { method: 'POST', body: JSON.stringify({ username: username, password: password }) }).then(setSession);
    }

    function register(displayName, username, password) {
        return request('/api/legacy/auth/register', { method: 'POST', body: JSON.stringify({ displayName: displayName, username: username, password: password }) }).then(setSession);
    }

    function logout() {
        stopPresence();
        return request('/api/legacy/auth/logout', { method: 'POST' }).catch(function () {}).then(function () {
            originalRemoveItem(tokenKey);
            originalRemoveItem('dardshti_user');
            readyUser = null;
        });
    }

    function searchUsers(query) {
        return request('/api/legacy/users?search=' + encodeURIComponent(query)).then(function (data) {
            if (typeof data.onlineCount === 'number') onlineCount = data.onlineCount;
            return data.users || [];
        });
    }

    function mapMessages(rows) {
        var current = readyUser || JSON.parse(originalGetItem('dardshti_user') || 'null');
        return (rows || []).map(function (message) {
            return {
                text: message.text || '', imageUrl: message.imageUrl || null,
                sent: current && message.senderId === current.id,
                senderName: message.senderName || '', senderUsername: message.senderUsername || '',
                time: message.createdAt, id: message.id,
                replyToId: message.replyToId || null, replyToText: message.replyToText || ''
            };
        });
    }

    function heartbeat() {
        if (!originalGetItem(tokenKey) || heartbeatInFlight || document.visibilityState === 'hidden') return Promise.resolve();
        heartbeatInFlight = true;
        return request('/api/legacy/presence/heartbeat', { method: 'POST', body: '{}' })
            .catch(function (error) { console.warn('[Dardshti] presence heartbeat failed:', error.message); })
            .finally(function () { heartbeatInFlight = false; });
    }

    function startPresence() {
        stopPresence();
        heartbeat();
        heartbeatTimer = setInterval(heartbeat, 15000);
        document.addEventListener('visibilitychange', heartbeat);
        window.addEventListener('focus', heartbeat);
    }

    function stopPresence() {
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        heartbeatTimer = null;
        document.removeEventListener('visibilitychange', heartbeat);
        window.removeEventListener('focus', heartbeat);
    }

    function loadMessages(username) {
        return request('/api/legacy/messages?username=' + encodeURIComponent(username)).then(function (data) { return mapMessages(data.messages); });
    }

    function loadMessagesAfter(username, afterId) {
        return request('/api/legacy/messages?username=' + encodeURIComponent(username) + '&afterId=' + encodeURIComponent(afterId || 0)).then(function (data) {
            return mapMessages(data.messages).filter(function(message) { return !afterId || Number(message.id) > Number(afterId); });
        });
    }

    function loadChannelMessages(channelId, afterId) {
        var suffix = afterId ? '&afterId=' + encodeURIComponent(afterId) : '';
        return request('/api/legacy/messages?channelId=' + encodeURIComponent(channelId) + suffix).then(function (data) {
            return mapMessages(data.messages).filter(function(message) { return !afterId || Number(message.id) > Number(afterId); });
        });
    }

    function createClientMessageId() {
        var random = window.crypto && typeof window.crypto.randomUUID === 'function'
            ? window.crypto.randomUUID().replace(/-/g, '')
            : Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
        return 'm_' + Date.now().toString(36) + '_' + random;
    }

    function sendMessage(username, text, imageUrl, replyToId, clientMessageId) {
        return request('/api/legacy/messages', { method: 'POST', timeoutMs: imageUrl ? 20000 : 8000, body: JSON.stringify({ username: username, text: text, imageUrl: imageUrl || null, replyToId: replyToId || null, clientMessageId: clientMessageId || createClientMessageId() }) });
    }

    function getChannelMembership(channelId) {
        return request('/api/legacy/channels/' + encodeURIComponent(channelId) + '/membership', { timeoutMs: 8000 }).then(function(data) { return Boolean(data.joined); });
    }

    function joinChannel(channelId) {
        return request('/api/legacy/channels/' + encodeURIComponent(channelId) + '/join', { method: 'POST', timeoutMs: 8000, body: '{}' });
    }

    function sendChannelMessage(channelId, text, replyToId, clientMessageId) {
        return request('/api/legacy/messages', { method: 'POST', timeoutMs: 8000, body: JSON.stringify({ channelId: channelId, text: text, replyToId: replyToId || null, clientMessageId: clientMessageId || createClientMessageId() }) });
    }

    function listContent(kind) {
        return request('/api/legacy/content/' + encodeURIComponent(kind)).then(function (data) { return data.items || []; });
    }

    function createContent(kind, payload) {
        return request('/api/legacy/content/' + encodeURIComponent(kind), { method: 'POST', body: JSON.stringify({ payload: payload }) });
    }

    function updateContent(id, payload) {
        return request('/api/legacy/content/' + encodeURIComponent(id), { method: 'PATCH', body: JSON.stringify({ payload: payload }) });
    }

    function deleteContent(id) {
        return request('/api/legacy/content/' + encodeURIComponent(id), { method: 'DELETE' });
    }

    function listComments(id) {
        return request('/api/legacy/content/' + encodeURIComponent(id) + '/comments').then(function (data) { return data.comments || []; });
    }

    function addComment(id, body) {
        return request('/api/legacy/content/' + encodeURIComponent(id) + '/comments', { method: 'POST', body: JSON.stringify({ body: body }) });
    }

    function toggleReaction(id, type) {
        return request('/api/legacy/content/' + encodeURIComponent(id) + '/reactions', { method: 'POST', body: JSON.stringify({ type: type || 'like' }) });
    }

    function listNotifications() {
        return request('/api/legacy/notifications').then(function (data) { return data.notifications || []; });
    }

    function markNotificationRead(id) {
        return request('/api/legacy/notifications/' + encodeURIComponent(id) + '/read', { method: 'PATCH' });
    }

    function listGroups() {
        return request('/api/legacy/groups').then(function (data) { return data.groups || []; });
    }

    function createGroup(name, description, privacy) {
        return request('/api/legacy/groups', { method: 'POST', body: JSON.stringify({ name: name, description: description, privacy: privacy }) });
    }

    function joinGroup(id) {
        return request('/api/legacy/groups/' + encodeURIComponent(id) + '/join', { method: 'POST' });
    }

    function leaveGroup(id) {
        return request('/api/legacy/groups/' + encodeURIComponent(id) + '/leave', { method: 'DELETE' });
    }

    function toggleFollow(username) {
        return request('/api/legacy/follow/' + encodeURIComponent(username), { method: 'POST' });
    }

    window.DardshtiBackend = {
        apiBase: apiBase,
        ready: hydrate(),
        login: login,
        register: register,
        logout: logout,
        searchUsers: searchUsers,
        loadMessages: loadMessages,
        loadMessagesAfter: loadMessagesAfter,
        loadChannelMessages: loadChannelMessages,
        getChannelMembership: getChannelMembership,
        joinChannel: joinChannel,
        sendChannelMessage: sendChannelMessage,
        heartbeat: heartbeat,
        sendMessage: sendMessage,
        createClientMessageId: createClientMessageId,
        listContent: listContent,
        createContent: createContent,
        updateContent: updateContent,
        deleteContent: deleteContent,
        listComments: listComments,
        addComment: addComment,
        toggleReaction: toggleReaction,
        listNotifications: listNotifications,
        markNotificationRead: markNotificationRead,
        listGroups: listGroups,
        createGroup: createGroup,
        joinGroup: joinGroup,
        leaveGroup: leaveGroup,
        toggleFollow: toggleFollow,
        sync: scheduleSync,
        getUser: function () { return readyUser; },
        getOnlineCount: function () { return onlineCount; }
    };
})();
