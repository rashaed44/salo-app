// Shared content bridge for legacy sections. It keeps the existing UI while making
// market items, cases, reviews, announcements, events, and channel messages shared.
(function () {
    'use strict';
    var backend = window.DardshtiBackend;
    if (!backend) return;
    var mappings = {
        dardshti_souq_items: 'market_item',
        dardshti_saleh_cases_v2: 'case',
        dardshti_reviews: 'post',
        dardshti_stories: 'story',
        dardshti_akish_announcements: 'announcement',
        dardshti_akish_events: 'event'
    };
    var originalSetItem = localStorage.setItem.bind(localStorage);
    var pending = {};

    function hasSession() { return Boolean(localStorage.getItem('dardshti_api_token')); }
    function fingerprint(item) { return item._cloudId || [item.username, item.title, item.name, item.text, item.createdAt, item.time].join('|'); }
    function mergeUnique(local, remote) {
        var result = local.slice();
        remote.forEach(function (item) {
            var index = result.findIndex(function (entry) { return entry._cloudId && entry._cloudId === item._cloudId; });
            if (index >= 0) result[index] = Object.assign({}, result[index], item);
            else if (!result.some(function (entry) { return fingerprint(entry) === fingerprint(item); })) result.push(item);
        });
        return result;
    }
    function readList(key) {
        try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) { return []; }
    }
    function writeList(key, list) { originalSetItem(key, JSON.stringify(list)); }

    function pull(kind, key) {
        if (!hasSession()) return;
        backend.listContent(kind).then(function (items) {
            var remote = items.map(function (item) { return Object.assign({}, item.payload || {}, { _cloudId: item.id, ownerId: item.ownerId, createdAt: item.createdAt }); });
            if (remote.length) writeList(key, mergeUnique(readList(key), remote));
        }).catch(function () {});
    }

    function pushList(key, kind, list) {
        if (!hasSession()) return;
        list.forEach(function (item) {
            if (item._cloudId) return;
            var id = fingerprint(item);
            if (pending[id]) return;
            pending[id] = true;
            backend.createContent(kind, item).then(function (result) {
                if (result.item) {
                    item._cloudId = result.item.id;
                    item.ownerId = result.item.ownerId;
                    writeList(key, list);
                }
            }).catch(function () {}).finally(function () { delete pending[id]; });
        });
    }

    localStorage.setItem = function (key, value) {
        originalSetItem(key, value);
        var kind = mappings[key];
        if (kind && hasSession()) {
            try { pushList(key, kind, JSON.parse(value)); } catch (e) {}
        }
    };

    function boot() {
        Object.keys(mappings).forEach(function (key) { pull(mappings[key], key); });
        if (hasSession()) {
            backend.listContent('channel_message').then(function (items) {
                var byChannel = {};
                items.forEach(function (item) {
                    var payload = item.payload || {};
                    if (!payload.channelId) return;
                    if (!byChannel[payload.channelId]) byChannel[payload.channelId] = [];
                    byChannel[payload.channelId].push(Object.assign({}, payload, { _cloudId: item.id }));
                });
                Object.keys(byChannel).forEach(function (channelId) {
                    var key = 'dardshti_channel_msgs_' + channelId;
                    writeList(key, mergeUnique(readList(key), byChannel[channelId]));
                });
            }).catch(function () {});
        }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
    window.DardshtiCloud = { pull: pull, pushList: pushList };
})();
