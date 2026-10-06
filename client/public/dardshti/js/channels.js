// channels.js - 6 قنوات
(function() {
    'use strict';
    var $ = function(id) { return document.getElementById(id); };
    console.log('📢 تحميل نظام القنوات');

    var DEFAULT_CHANNELS = [
        { id: 'general', name: 'دردشة عامة', desc: 'نقاشات عامة ومتنوعة', icon: '🌍', color: '#00d4ff', colorDark: '#0099cc', verified: true },
        { id: 'sports', name: 'دردشة رياضية', desc: 'كورة، مباريات، ورياضة', icon: '⚽', color: '#00ff88', colorDark: '#00cc66', verified: true },
        { id: 'friends', name: 'دردشة الأصدقاء', desc: 'تعرف على أصدقاء جدد', icon: '👥', color: '#ff6b9d', colorDark: '#cc5580', verified: false },
        { id: 'fun', name: 'الدردشة العكيشة', desc: 'ضحك وفرفشة وترفيه', icon: '😂', color: '#ffd93d', colorDark: '#ccae31', verified: false },
        { id: 'akish', name: 'مجتمع أبناء العكيشة', desc: 'قناة خاصة بأبناء المنطقة', icon: '🏔️', color: '#ff8c42', colorDark: '#cc6f35', verified: true },
        { id: 'saleh', name: 'قضايا الصلو', desc: 'إبلاغ عن محتوى فاسد أو مفيد', icon: '⚖️', color: '#e74c3c', colorDark: '#c0392d', verified: true, special: 'cases' },
        { id: 'souq', name: 'سوق العكيشة', desc: 'بيع وشراء بين أبناء المنطقة', icon: '🛒', color: '#9b59b6', colorDark: '#8e44ad', verified: true, special: 'souq' }
    ];
    var joinedChannels = Object.create(null);
    var channelOpenVersion = 0;
    var membershipDialog = null;
    var membershipUserId = null;

    function ensureMembershipDialog() {
        if (membershipDialog) return membershipDialog;
        var overlay = document.createElement('div');
        overlay.className = 'channel-join-overlay';
        overlay.hidden = true;
        var card = document.createElement('div');
        card.className = 'channel-join-card';
        var title = document.createElement('h3');
        title.className = 'channel-join-title';
        var status = document.createElement('p');
        status.className = 'channel-join-status';
        var actions = document.createElement('div');
        actions.className = 'channel-join-actions';
        var cancel = document.createElement('button');
        cancel.type = 'button';
        cancel.className = 'channel-join-cancel';
        cancel.textContent = 'رجوع';
        var join = document.createElement('button');
        join.type = 'button';
        join.className = 'channel-join-confirm';
        join.textContent = 'انضمام للقناة';
        join.hidden = true;
        actions.appendChild(cancel);
        actions.appendChild(join);
        card.appendChild(title);
        card.appendChild(status);
        card.appendChild(actions);
        overlay.appendChild(card);
        document.body.appendChild(overlay);
        cancel.onclick = closeMembershipDialog;
        overlay.addEventListener('click', function(event) { if (event.target === overlay) closeMembershipDialog(); });
        membershipDialog = { overlay: overlay, title: title, status: status, join: join, cancel: cancel };
        return membershipDialog;
    }

    function closeMembershipDialog() {
        if (membershipDialog) membershipDialog.overlay.hidden = true;
    }

    function openChannel(channel) {
        var version = ++channelOpenVersion;
        window._currentChannel = null;
        window._activeReplyTarget = null;
        if ($('replyBar')) $('replyBar').classList.remove('active');
        var dialog = ensureMembershipDialog();
        if (!window.DardshtiBackend) {
            dialog.title.textContent = 'تعذر الاتصال';
            dialog.status.textContent = 'اتصل بالخادم ثم حاول الانضمام إلى القناة.';
            dialog.join.hidden = true;
            dialog.overlay.hidden = false;
            return;
        }
        var currentUser = window.DardshtiBackend.getUser() || {};
        var currentUserId = currentUser.id || currentUser.username || null;
        if (membershipUserId !== currentUserId) {
            membershipUserId = currentUserId;
            joinedChannels = Object.create(null);
        }
        if (joinedChannels[channel.id]) {
            openJoinedChannel(channel);
            return;
        }
        dialog.title.textContent = 'قناة ' + channel.name;
        dialog.status.textContent = 'جار التحقق من عضويتك…';
        dialog.join.hidden = true;
        dialog.join.disabled = true;
        dialog.overlay.hidden = false;
        window.DardshtiBackend.getChannelMembership(channel.id).then(function(joined) {
            if (version !== channelOpenVersion) return;
            if (joined) {
                joinedChannels[channel.id] = true;
                closeMembershipDialog();
                openJoinedChannel(channel);
                return;
            }
            dialog.status.textContent = 'انضم إلى القناة لتتمكن من قراءة الرسائل والمشاركة فيها.';
            dialog.join.textContent = 'انضمام للقناة';
            dialog.join.hidden = false;
            dialog.join.disabled = false;
            dialog.join.onclick = function() {
                if (dialog.join.disabled) return;
                dialog.join.disabled = true;
                dialog.status.textContent = 'جار حفظ عضويتك…';
                window.DardshtiBackend.joinChannel(channel.id).then(function() {
                    if (version !== channelOpenVersion) return;
                    joinedChannels[channel.id] = true;
                    closeMembershipDialog();
                    openJoinedChannel(channel);
                }).catch(function(error) {
                    if (version !== channelOpenVersion) return;
                    dialog.status.textContent = error.message || 'تعذر الانضمام. تحقق من اتصال الإنترنت وحاول مجدداً.';
                    dialog.join.disabled = false;
                });
            };
        }).catch(function(error) {
            if (version !== channelOpenVersion) return;
            dialog.title.textContent = 'تعذر التحقق من القناة';
            dialog.status.textContent = error.message || 'تحقق من اتصال الإنترنت ثم أعد المحاولة.';
            dialog.join.textContent = 'إعادة المحاولة';
            dialog.join.hidden = false;
            dialog.join.disabled = false;
            dialog.join.onclick = function() { openChannel(channel); };
        });
    }

    function getChannels() {
        // دائماً استخدم القنوات الافتراضية (لتجنب القنوات القديمة في localStorage)
        try {
            var s = JSON.parse(localStorage.getItem('dardshti_channels_v2') || 'null');
            if (s && s.length === DEFAULT_CHANNELS.length) return s;
        } catch (e) {}
        localStorage.setItem('dardshti_channels_v2', JSON.stringify(DEFAULT_CHANNELS));
        return DEFAULT_CHANNELS;
    }

    function getChannelMessages(id) {
        try { return JSON.parse(localStorage.getItem('dardshti_channel_msgs_' + id) || '[]'); }
        catch (e) { return []; }
    }

    function saveChannelMessages(id, msgs) {
        localStorage.setItem('dardshti_channel_msgs_' + id, JSON.stringify(msgs));
    }

    function renderChannels() {
        var list = $('channelsList');
        if (!list) { console.log('❌ channelsList غير موجود'); return; }
        console.log('✅ عرض', DEFAULT_CHANNELS.length, 'قنوات');

        var channels = getChannels();
        var onlineCount = window.DardshtiBackend ? window.DardshtiBackend.getOnlineCount() : null;
        list.innerHTML = '';

        channels.forEach(function(ch) {
            var item = document.createElement('div');
            item.className = 'channel-item';
            item.setAttribute('data-channel', ch.id);
            item.style.setProperty('--channel-color', ch.color);
            item.style.setProperty('--channel-color-dark', ch.colorDark);

            var nameHtml = ch.name + (ch.verified ? ' <span class="channel-verified">✓</span>' : '');
            if (ch.special === 'cases') nameHtml = '⚖️ ' + nameHtml;

            item.innerHTML =
                '<div class="channel-avatar">' + ch.icon + '</div>' +
                '<div class="channel-info">' +
                    '<div class="channel-name">' + nameHtml + '</div>' +
                    '<div class="channel-desc">' + ch.desc + '</div>' +
                '</div>' +
                '<div class="channel-meta">' +
                    '<div class="channel-members"><span class="channel-online">●</span> ' + (onlineCount === null ? '—' : formatNum(onlineCount)) + ' متصل بالتطبيق</div>' +
                    '<div class="channel-members">👥 عدد الأعضاء غير متاح</div>' +
                '</div>';

            item.onclick = function() { openChannel(ch); };
            list.appendChild(item);
        });
    }

    function openJoinedChannel(channel) {
        console.log('📂 فتح:', channel.name);

        // إذا كانت قناة الصلو
        if (channel.id === 'saleh' && typeof window.CasesOpen === 'function') {
            window.CasesOpen(channel);
            return;
        }

        var chatArea = $('chatArea');
        var mainScreen = $('mainScreen');
        if (!chatArea || !mainScreen) return;

        // إذا كانت قناة أبناء العكيشة
        if (channel.id === 'akish' && typeof window.AkishOpen === 'function') {
            window.AkishOpen(channel);
            return;
        }

        // سوق العكيشة
        if (channel.id === 'souq' && typeof window.SouqOpen === 'function') {
            window.SouqOpen(channel);
            return;
        }

        var hName = $('hName');
        var hStatus = $('hStatus');
        var chatAvatar = $('chatAvatar');

        if (hName) hName.textContent = channel.icon + ' ' + channel.name;
        if (hStatus) {
            var onlineCount = window.DardshtiBackend ? window.DardshtiBackend.getOnlineCount() : null;
            hStatus.textContent = onlineCount === null ? 'حالة الاتصال غير متاحة' : onlineCount + ' متصل بالتطبيق';
            hStatus.classList.toggle('online', onlineCount !== null && onlineCount > 0);
        }
        if (chatAvatar) {
            chatAvatar.style.background = 'linear-gradient(135deg, ' + channel.color + ' 0%, ' + channel.colorDark + ' 100%)';
            chatAvatar.innerHTML = channel.icon;
        }

        var inputBar = $('inputBar');
        if (inputBar) inputBar.style.display = '';

        var btnCall = $('btnCall');
        var btnVideoCall = $('btnVideoCall');
        if (btnCall) btnCall.style.display = 'none';
        if (btnVideoCall) btnVideoCall.style.display = 'none';

        window._currentChannel = channel;
        var messageInput = $('msgInput');
        var sendButton = $('btnSend');
        var sendingHere = Boolean(channelSendInFlight[channel.id]);
        if (messageInput) messageInput.disabled = sendingHere;
        if (sendButton) sendButton.disabled = sendingHere;
        renderChannelMessages(channel.id);

        mainScreen.classList.remove('active');
        chatArea.classList.add('active');

        setTimeout(function() {
            var input = $('msgInput');
            if (input) { input.placeholder = 'اكتب في ' + channel.name + '...'; input.focus(); }
        }, 300);
    }

    function renderChannelMessages(id) {
        var msgs = $('msgs');
        if (!msgs) return;
        var viewVersion = ++channelViewVersion;
        activeChannelId = id;
        lastChannelMessageId = 0;
        channelMessagesReady = false;
        seenChannelMessageIds = new Set();
        if (channelPollTimer) clearInterval(channelPollTimer);
        msgs.innerHTML = '';
        var channel = getChannels().find(function(c) { return c.id === id; });
        if (!window.DardshtiBackend) {
            showChannelWelcome(channel, 'يلزم الاتصال بالخادم لعرض الرسائل الحقيقية');
            channelMessagesReady = true;
            return;
        }
        showChannelWelcome(channel, 'جار تحميل الرسائل…');
        window.DardshtiBackend.loadChannelMessages(id).then(function(messages) {
            if (activeChannelId !== id || channelViewVersion !== viewVersion) return;
            channelMessagesReady = true;
            msgs.innerHTML = '';
            if (!messages.length) showChannelWelcome(channel, 'كن أول من يبدأ النقاش!');
            messages.forEach(function(message) {
                if (message.id && seenChannelMessageIds.has(Number(message.id))) return;
                if (message.id) seenChannelMessageIds.add(Number(message.id));
                addMessage(message);
                if (message.id && message.id > lastChannelMessageId) lastChannelMessageId = message.id;
            });
        }).catch(function(error) {
            if (activeChannelId !== id || channelViewVersion !== viewVersion) return;
            channelMessagesReady = true;
            console.warn('[Dardshti] channel messages load failed:', error.message);
            showChannelWelcome(channel, 'تعذر تحميل الرسائل من الخادم');
        });
        channelPollTimer = setInterval(pollChannelMessages, 2500);
    }

    var activeChannelId = null;
    var lastChannelMessageId = 0;
    var channelPollTimer = null;
    var channelPollInFlight = Object.create(null);
    var channelSendInFlight = Object.create(null);
    var pendingChannelMessages = Object.create(null);
    var seenChannelMessageIds = new Set();
    var channelViewVersion = 0;
    var channelMessagesReady = false;

    function showChannelWelcome(channel, text) {
        var msgs = $('msgs');
        if (!msgs || !channel) return;
        var welcome = document.createElement('div');
        welcome.className = 'channel-welcome';
        var icon = document.createElement('div');
        icon.className = 'channel-welcome-icon';
        icon.textContent = channel.icon;
        var heading = document.createElement('h3');
        heading.textContent = 'مرحباً بك في ' + channel.name;
        var description = document.createElement('p');
        description.textContent = text;
        welcome.appendChild(icon);
        welcome.appendChild(heading);
        welcome.appendChild(description);
        msgs.appendChild(welcome);
    }

    function pollChannelMessages() {
        if (!activeChannelId || !window.DardshtiBackend || !channelMessagesReady || channelPollInFlight[activeChannelId]) return;
        var channelId = activeChannelId;
        channelPollInFlight[channelId] = true;
        window.DardshtiBackend.loadChannelMessages(channelId, lastChannelMessageId).then(function(messages) {
            if (activeChannelId !== channelId) return;
            var messageBox = $('msgs');
            if (!messageBox) return;
            var welcome = messageBox.querySelector('.channel-welcome');
            if (welcome && messages.length) welcome.remove();
            messages.forEach(function(message) {
                if (message.id && seenChannelMessageIds.has(Number(message.id))) return;
                if (message.id) seenChannelMessageIds.add(Number(message.id));
                addMessage(message);
                if (message.id && message.id > lastChannelMessageId) lastChannelMessageId = message.id;
            });
        }).catch(function(error) { console.warn('[Dardshti] channel message refresh failed:', error.message); })
            .finally(function() { delete channelPollInFlight[channelId]; });
    }

    function addMessage(msg) {
        var msgs = $('msgs');
        if (!msgs) return;
        var bubble = document.createElement('div');
        bubble.className = 'msg ' + (msg.sent ? 'sent' : 'received');
        if (msg.id) bubble.dataset.messageId = String(msg.id);

        var time = new Date(msg.time || Date.now());
        var timeStr = String(time.getHours()).padStart(2, '0') + ':' + String(time.getMinutes()).padStart(2, '0');

        if (!msg.sent && msg.senderName) {
            var sender = document.createElement('div');
            sender.style.cssText = 'font-size:11px;font-weight:700;color:#00d4ff;margin-bottom:4px;';
            sender.textContent = msg.senderName;
            bubble.appendChild(sender);
        }
        var body = document.createElement('div');
        body.className = 'message-body';
        body.textContent = msg.text || '';
        if (msg.replyToId && msg.replyToText) {
            var quote = document.createElement('div');
            quote.className = 'message-reply-quote';
            quote.textContent = msg.replyToText;
            bubble.appendChild(quote);
        }
        bubble.appendChild(body);
        var timeEl = document.createElement('div');
        timeEl.className = 'msg-time';
        timeEl.textContent = timeStr;
        bubble.appendChild(timeEl);
        msgs.appendChild(bubble);
        msgs.scrollTop = msgs.scrollHeight;
    }

    function sendChannelMessage(text) {
        if (!window._currentChannel) return false;
        var ch = window._currentChannel;
        if (!window.DardshtiBackend || channelSendInFlight[ch.id]) return false;
        var input = $('msgInput');
        var button = $('btnSend');
        var reply = window._activeReplyTarget || null;
        var payloadKey = JSON.stringify({ text: text, replyToId: reply && reply.id });
        var pendingSend = pendingChannelMessages[ch.id];
        if (!pendingSend || pendingSend.payloadKey !== payloadKey) {
            pendingSend = { payloadKey: payloadKey, id: window.DardshtiBackend.createClientMessageId() };
            pendingChannelMessages[ch.id] = pendingSend;
        }
        channelSendInFlight[ch.id] = true;
        if (input) input.disabled = true;
        if (button) button.disabled = true;
        window.DardshtiBackend.sendChannelMessage(ch.id, text, reply && reply.id, pendingSend.id).then(function(result) {
            if (pendingChannelMessages[ch.id] === pendingSend) delete pendingChannelMessages[ch.id];
            var record = result && result.message;
            var sentMessage = {
                text: record && record.text ? record.text : text,
                id: record && record.id,
                time: record && record.createdAt ? record.createdAt : Date.now(),
                senderName: (window.DardshtiBackend.getUser() || {}).displayName || (window.DardshtiBackend.getUser() || {}).username,
                sent: true,
                replyToId: record && record.replyToId ? record.replyToId : (reply && reply.id),
                replyToText: reply && reply.text
            };
            if (sentMessage.id && !seenChannelMessageIds.has(Number(sentMessage.id))) {
                seenChannelMessageIds.add(Number(sentMessage.id));
                addMessage(sentMessage);
                if (sentMessage.id > lastChannelMessageId) lastChannelMessageId = sentMessage.id;
            } else {
                pollChannelMessages();
            }
            if (activeChannelId === ch.id && input) input.value = '';
            var replyBar = $('replyBar');
            if (replyBar) replyBar.classList.remove('active');
            document.querySelectorAll('.msg.replying').forEach(function(message) { message.classList.remove('replying'); });
            window._activeReplyTarget = null;
        }).catch(function(error) {
            console.warn('[Dardshti] channel message send failed:', error.message);
            showChannelToast('تعذر الإرسال: ' + error.message);
        }).finally(function() {
            delete channelSendInFlight[ch.id];
            if (window._currentChannel && window._currentChannel.id === ch.id) {
                if (input) input.disabled = false;
                if (button) button.disabled = false;
            }
        });
        return true;
    }

    function showChannelToast(text) {
        var toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = text;
        document.body.appendChild(toast);
        setTimeout(function() { toast.remove(); }, 2600);
    }

    function formatNum(n) {
        if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
        return String(n);
    }

    function esc(t) {
        var d = document.createElement('div');
        d.textContent = t;
        return d.innerHTML;
    }

    // ربط الإرسال فور تحميل الصفحة لتجنب تأخير أول ضغطة
    (function() {
        var btnSend = $('btnSend');
        var msgInput = $('msgInput');

        if (btnSend) {
            btnSend.addEventListener('click', function(e) {
                if (window._currentChannel && window._currentChannel.id !== 'saleh') {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    var text = msgInput ? msgInput.value.trim() : '';
                    if (text) {
                        if (sendChannelMessage(text) && msgInput) msgInput.focus();
                    }
                }
            }, true);
        }

        if (msgInput) {
            msgInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter' && window._currentChannel && window._currentChannel.id !== 'saleh') {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    var text = this.value.trim();
                    if (text) sendChannelMessage(text);
                }
            }, true);
        }
    })();

    renderChannels();
    console.log('✅ القنوات جاهزة');

    document.addEventListener('click', function(e) {
        if (e.target.closest('.nav-btn[data-section="chats"]')) {
            setTimeout(renderChannels, 100);
        }
        if (e.target.closest('#btnBack')) {
            if (channelPollTimer) clearInterval(channelPollTimer);
            channelPollTimer = null;
            activeChannelId = null;
            window._currentChannel = null;
        }
    });

    window.Channels = { render: renderChannels, open: openChannel, send: sendChannelMessage };
})();
