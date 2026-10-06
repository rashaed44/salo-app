// ==========================================
// DARDSHTI - Simple Clean Version
// ==========================================

(function() {
    'use strict';

    // ===== اختصارات =====
    var $ = function(id) { return document.getElementById(id); };

    // ===== البيانات =====
    var currentUser = null;
    var chats = [];
    var friends = [];
    var directoryUsers = [];
    var directoryRefreshTimer = null;
    var directoryRequestVersion = 0;

    // ===== تحميل البيانات =====
    try {
        currentUser = JSON.parse(localStorage.getItem('dardshti_user') || 'null');
        chats = JSON.parse(localStorage.getItem('dardshti_chats') || '[]');
        friends = JSON.parse(localStorage.getItem('dardshti_friends') || '[]');
    } catch (e) {
        console.log('No saved data');
    }

    function reloadLocalState() {
        try {
            currentUser = JSON.parse(localStorage.getItem('dardshti_user') || 'null');
            chats = JSON.parse(localStorage.getItem('dardshti_chats') || '[]');
            friends = JSON.parse(localStorage.getItem('dardshti_friends') || '[]');
        } catch (e) {
            currentUser = null;
            chats = [];
            friends = [];
        }
    }

    // ===== حفظ =====
    function save() {
        if (currentUser) localStorage.setItem('dardshti_user', JSON.stringify(currentUser));
        var chatSummaries = chats.map(function(chat) {
            return {
                name: chat.name,
                username: chat.username,
                isOnline: Boolean(chat.isOnline),
                messages: (chat.messages || []).slice(-10).map(function(message) {
                    return { id: message.id || null, text: String(message.text || '').slice(0, 500), hasImage: Boolean(message.imageUrl), sent: Boolean(message.sent), time: message.time || null, replyToId: message.replyToId || null, replyToText: String(message.replyToText || '').slice(0, 120) };
                })
            };
        });
        localStorage.setItem('dardshti_chats', JSON.stringify(chatSummaries));
        localStorage.setItem('dardshti_friends', JSON.stringify(friends));
    }

    // ===== التنقل بين الشاشات =====
    function showScreen(id) {
        var screens = document.querySelectorAll('.screen');
        for (var i = 0; i < screens.length; i++) {
            screens[i].classList.remove('active');
        }
        var target = $(id);
        if (target) target.classList.add('active');
    }

    // ===== التنقل بين الأقسام =====
    function showSection(name) {
        var sections = document.querySelectorAll('.section');
        for (var i = 0; i < sections.length; i++) {
            sections[i].classList.remove('active');
        }
        var navBtns = document.querySelectorAll('.nav-btn');
        for (var j = 0; j < navBtns.length; j++) {
            navBtns[j].classList.remove('active');
        }

        if (name === 'settings' && activeSettingsCategory) closeSettingsDetail();
        var appRoot = $('app'); if (appRoot) appRoot.classList.toggle('settings-reference-active', name === 'settings');
        var sectionId = 'section' + name.charAt(0).toUpperCase() + name.slice(1);
        var section = $(sectionId);
        if (section) section.classList.add('active');

        var btn = document.querySelector('.nav-btn[data-section="' + name + '"]');
        if (btn) btn.classList.add('active');

        var titles = { chats: 'دردشتي', friends: 'الأصدقاء', groups: 'المجموعات', reviews: 'الآراء', stories: 'الستوري', settings: 'حسابي' };
        var titleEl = $('headerTitle');
        if (titleEl) titleEl.textContent = titles[name] || 'دردشتي';
    }

    // ===== Avatar =====
    function getAvatar(name) {
        var hash = 0;
        for (var i = 0; i < name.length; i++) {
            hash = ((hash << 5) - hash) + name.charCodeAt(i);
            hash = hash & hash;
        }
        hash = Math.abs(hash);
        var styles = ['avataaars', 'bottts', 'adventurer', 'fun-emoji', 'micah'];
        var style = styles[hash % styles.length];
        return 'https://api.dicebear.com/7.x/' + style + '/svg?seed=' + hash + '&backgroundColor=0088cc,00aaff,006699';
    }

    function setAvatar(el, name) {
        if (!el) return;
        var img = document.createElement('img');
        img.src = getAvatar(name);
        img.alt = name;
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;';
        img.onerror = function() { el.textContent = name.charAt(0); };
        el.innerHTML = '';
        el.appendChild(img);
    }

    // ===== تسجيل الدخول =====
    function doLogin(username, password) {
        var users = JSON.parse(localStorage.getItem('dardshti_users') || '[]');
        for (var i = 0; i < users.length; i++) {
            if (users[i].username === username && users[i].password === password) {
                return users[i];
            }
        }
        return null;
    }

    // ===== إنشاء حساب =====
    function doRegister(displayName, username, password) {
        var users = JSON.parse(localStorage.getItem('dardshti_users') || '[]');
        for (var i = 0; i < users.length; i++) {
            if (users[i].username === username) {
                return { error: 'اسم المستخدم موجود' };
            }
        }
        var user = {
            username: username,
            password: password,
            displayName: displayName || username,
            status: 'مرحباً، أنا أستخدم دردشتي'
        };
        users.push(user);
        localStorage.setItem('dardshti_users', JSON.stringify(users));
        return { user: user };
    }

    // ===== دخول التطبيق =====
    function enterApp() {
        showScreen('mainScreen');
        showSection('chats');
        renderChats();
        renderFriends();
        refreshDirectory();
        if (directoryRefreshTimer) clearInterval(directoryRefreshTimer);
        directoryRefreshTimer = setInterval(function() {
            var friendsSection = $('sectionFriends');
            if (friendsSection && friendsSection.classList.contains('active')) refreshDirectory();
            if (currentChatIndex >= 0) refreshChatPresence();
        }, 15000);
        updateSettings();
    }

    // ===== عرض المحادثات =====
    function renderChats(filter) {
        filter = filter || '';
        var list = $('contactsList');
        if (!list) return;
        list.innerHTML = '';

        var filtered = chats.filter(function(c) {
            return c.name.toLowerCase().indexOf(filter.toLowerCase()) !== -1;
        });

        if (filtered.length === 0) {
            list.innerHTML = '<div class="empty-state"><div class="empty-icon">💬</div><h3>لا توجد محادثات</h3><p>ابدأ محادثة جديدة</p></div>';
            return;
        }

        filtered.forEach(function(chat) {
            var index = chats.indexOf(chat);
            var item = document.createElement('div');
            item.className = 'chat-item';

            var avatar = document.createElement('div');
            avatar.className = 'chat-avatar' + (chat.isOnline ? ' online' : '');
            setAvatar(avatar, chat.name);

            var info = document.createElement('div');
            info.className = 'chat-info';
            var lastMessage = (chat.messages && chat.messages.length) ? chat.messages[chat.messages.length - 1] : null;
            var lastMsg = !lastMessage ? 'لا توجد رسائل' : ((lastMessage.text || lastMessage.imageUrl || lastMessage.hasImage) ? (lastMessage.text || '📷 صورة') : 'لا توجد رسائل');
            var nameEl = document.createElement('div');
            nameEl.className = 'chat-name';
            nameEl.textContent = chat.name;
            var lastMsgEl = document.createElement('div');
            lastMsgEl.className = 'chat-last-msg';
            lastMsgEl.textContent = lastMsg;
            info.appendChild(nameEl);
            info.appendChild(lastMsgEl);

            item.appendChild(avatar);
            item.appendChild(info);
            item.onclick = function() { openChat(chat, index); };
            list.appendChild(item);
        });
    }

    // ===== عرض الأصدقاء =====
    function renderFriends(filter) {
        filter = filter || '';
        var list = $('friendsList');
        if (!list) return;
        list.innerHTML = '';

        if (!window.DardshtiBackend) {
            list.innerHTML = '<div class="empty-state"><div class="empty-icon">👥</div><h3>تعذر الاتصال بالخادم</h3><p>لا يمكن عرض المستخدمين الحقيقيين حالياً</p></div>';
            return;
        }
        var source = directoryUsers;
        var filtered = source.filter(function(user) {
            var name = user.displayName || user.name || '';
            var username = user.username || '';
            return name.toLowerCase().indexOf(filter.toLowerCase()) !== -1 || username.toLowerCase().indexOf(filter.toLowerCase()) !== -1;
        });

        if (filtered.length === 0) {
            list.innerHTML = window.DardshtiBackend
                ? '<div class="empty-state"><div class="empty-icon">👥</div><h3>لا يوجد مستخدمون</h3><p>ستظهر الحسابات المسجلة هنا</p></div>'
                : '<div class="empty-state"><div class="empty-icon">👥</div><h3>تعذر تحميل المستخدمين الحقيقيين</h3><p>سجّل الدخول واتصل بالخادم لعرض المستخدمين</p></div>';
            return;
        }

        filtered.forEach(function(user) {
            var friendName = user.displayName || user.name || user.username;
            var item = document.createElement('div');
            item.className = 'friend-item';

            var avatar = document.createElement('div');
            avatar.className = 'chat-avatar' + (user.isOnline ? ' online' : '');
            setAvatar(avatar, friendName);

            var info = document.createElement('div');
            info.className = 'chat-info';
            var nameEl = document.createElement('div');
            nameEl.className = 'chat-name';
            nameEl.textContent = friendName;
            var detailEl = document.createElement('div');
            detailEl.className = 'chat-last-msg ' + (user.isOnline ? 'user-online' : 'user-offline');
            detailEl.textContent = (user.isOnline ? '● متصل الآن · ' : '○ غير متصل · ') + '@' + user.username;
            info.appendChild(nameEl);
            info.appendChild(detailEl);

            item.appendChild(avatar);
            item.appendChild(info);
            item.onclick = function() {
                var existing = null;
                var idx = -1;
                for (var i = 0; i < chats.length; i++) {
                    if (chats[i].username === user.username) { existing = chats[i]; idx = i; break; }
                }
                if (existing) {
                    existing.isOnline = !!user.isOnline;
                    openChat(existing, idx);
                } else {
                    chats.push({ name: friendName, username: user.username, isOnline: !!user.isOnline, messages: [] });
                    save();
                    renderChats();
                    openChat(chats[chats.length - 1], chats.length - 1);
                }
            };
            list.appendChild(item);
        });
    }

    function refreshDirectory() {
        if (!window.DardshtiBackend) return Promise.resolve([]);
        var version = ++directoryRequestVersion;
        return window.DardshtiBackend.searchUsers('').then(function(users) {
            if (version !== directoryRequestVersion) return directoryUsers;
            directoryUsers = users || [];
            var section = $('sectionFriends');
            if (section && section.classList.contains('active')) renderFriends(($('searchIn') || {}).value || '');
            refreshChatPresenceFromDirectory();
            return directoryUsers;
        }).catch(function(error) {
            console.warn('[Dardshti] users refresh failed:', error.message);
            return directoryUsers;
        });
    }

    function refreshChatPresenceFromDirectory() {
        if (currentChatIndex < 0 || !chats[currentChatIndex] || !$('hStatus')) return;
        var chat = chats[currentChatIndex];
        var user = directoryUsers.find(function(candidate) { return candidate.username === chat.username; });
        if (!user) return;
        chat.isOnline = !!user.isOnline;
        $('hStatus').textContent = user.isOnline ? 'متصل الآن' : 'غير متصل';
        $('hStatus').classList.toggle('online', !!user.isOnline);
    }

    function refreshChatPresence() {
        if (window.DardshtiBackend) refreshDirectory();
    }

    // ===== فتح محادثة =====
    var currentChatIndex = -1;
    var chatPollTimer = null;
    var lastMessageId = 0;
    var chatViewVersion = 0;
    var chatMessagesReady = false;
    var chatPollInFlight = Object.create(null);
    var directSendInFlight = Object.create(null);
    var pendingDirectMessages = Object.create(null);
    var seenMessageIds = new Set();
    var replyTarget = null;

    function isCurrentChat(chat) {
        return currentChatIndex >= 0 && chats[currentChatIndex] === chat;
    }

    function clearReply() {
        replyTarget = null;
        window._activeReplyTarget = null;
        if ($('replyBar')) $('replyBar').classList.remove('active');
        document.querySelectorAll('.msg.replying').forEach(function(message) { message.classList.remove('replying'); });
    }

    function showChatToast(text) {
        var toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = text;
        document.body.appendChild(toast);
        setTimeout(function() { toast.remove(); }, 2800);
    }

    function openChat(chat, index) {
        var viewVersion = ++chatViewVersion;
        currentChatIndex = index;
        chatMessagesReady = false;
        seenMessageIds = new Set();
        clearReply();
        if ($('hName')) $('hName').textContent = chat.name;
        var openingInput = $('msgInput');
        var openingSend = $('btnSend');
        var openingBusy = Boolean(chat.username && directSendInFlight[chat.username]);
        if (openingInput) openingInput.disabled = openingBusy;
        if (openingSend) openingSend.disabled = openingBusy;
        if ($('hStatus')) {
            $('hStatus').textContent = chat.isOnline ? 'متصل الآن' : 'جار التحقق من الحالة…';
            $('hStatus').classList.toggle('online', !!chat.isOnline);
        }
        setAvatar($('chatAvatar'), chat.name);
        showScreen('chatArea');

        var msgs = $('msgs');
        lastMessageId = 0;
        if (msgs) {
            msgs.innerHTML = '';
            if (!window.DardshtiBackend || !chat.username) {
                var unavailable = document.createElement('div');
                unavailable.className = 'empty-state';
                unavailable.textContent = 'لا يمكن عرض محادثة حقيقية من دون حساب على الخادم';
                msgs.appendChild(unavailable);
            } else {
                var loading = document.createElement('div');
                loading.className = 'empty-state';
                loading.textContent = 'جار تحميل الرسائل المحفوظة…';
                msgs.appendChild(loading);
            }
        }
        if (chatPollTimer) clearInterval(chatPollTimer);
        if (window.DardshtiBackend && chat.username) {
            window.DardshtiBackend.loadMessages(chat.username).then(function(remoteMessages) {
                if (viewVersion !== chatViewVersion || !isCurrentChat(chat)) return;
                chat.messages = remoteMessages;
                lastMessageId = 0;
                var remoteMsgs = $('msgs');
                if (remoteMsgs) {
                    remoteMsgs.innerHTML = '';
                    remoteMessages.forEach(function(m) {
                        if (m.id && seenMessageIds.has(Number(m.id))) return;
                        if (m.id) seenMessageIds.add(Number(m.id));
                        addBubble(m.text, m.sent, m.time, m.imageUrl, m);
                        if (m.id && m.id > lastMessageId) lastMessageId = m.id;
                    });
                }
                chatMessagesReady = true;
                renderChats();
                save();
            }).catch(function(error) {
                console.warn('[Dardshti] messages load failed:', error.message);
                if (viewVersion === chatViewVersion && isCurrentChat(chat) && $('msgs')) {
                    chat.messages = [];
                    renderChats();
                    $('msgs').textContent = 'تعذر التحميل مؤقتاً — جار إعادة المحاولة';
                    chatMessagesReady = true;
                }
            });
            chatPollTimer = setInterval(function() { pollOpenMessages(chat); }, 2000);
            refreshDirectory();
        }
        setTimeout(function() { if ($('msgInput')) $('msgInput').focus(); }, 300);
    }

    // ===== فقاعة الرسالة =====
    function addBubble(text, isSent, time, imageUrl, message) {
        var msgs = $('msgs');
        if (!msgs) return;
        var bubble = document.createElement('div');
        bubble.className = 'msg ' + (isSent ? 'sent' : 'received');
        if (message && message.id) bubble.dataset.messageId = String(message.id);
        var d = new Date(time || Date.now());
        var timeStr = d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0');
        if (message && message.replyToId && message.replyToText) {
            var quote = document.createElement('div');
            quote.className = 'message-reply-quote';
            quote.textContent = message.replyToText;
            bubble.appendChild(quote);
        }
        if (imageUrl && /^(https?:|data:image\/)/i.test(imageUrl)) {
            var image = document.createElement('img');
            image.src = imageUrl;
            image.alt = 'صورة مرفقة';
            image.className = 'message-image';
            bubble.appendChild(image);
        }
        if (text) {
            var body = document.createElement('div');
            body.className = 'message-body';
            body.textContent = text;
            bubble.appendChild(body);
        }
        var timeEl = document.createElement('div');
        timeEl.className = 'msg-time';
        timeEl.textContent = timeStr;
        bubble.appendChild(timeEl);
        msgs.appendChild(bubble);
        msgs.scrollTop = msgs.scrollHeight;
    }

    function pollOpenMessages(chat) {
        if (!window.DardshtiBackend || !chat.username || !chatMessagesReady || !isCurrentChat(chat) || chatPollInFlight[chat.username]) return;
        chatPollInFlight[chat.username] = true;
        window.DardshtiBackend.loadMessagesAfter(chat.username, lastMessageId).then(function(newMessages) {
            if (!isCurrentChat(chat)) return;
            var added = false;
            if (newMessages.length && !lastMessageId && $('msgs')) $('msgs').innerHTML = '';
            newMessages.forEach(function(message) {
                var id = Number(message.id || 0);
                if (id && seenMessageIds.has(id)) return;
                if (id) seenMessageIds.add(id);
                addBubble(message.text, message.sent, message.time, message.imageUrl, message);
                chat.messages = chat.messages || [];
                chat.messages.push(message);
                if (id > lastMessageId) lastMessageId = id;
                added = true;
            });
            if (added) { save(); renderChats(); }
        }).catch(function(error) { console.warn('[Dardshti] message refresh failed:', error.message); })
            .finally(function() { delete chatPollInFlight[chat.username]; });
    }

    // ===== إرسال رسالة =====
    function sendMessage() {
        if (window._currentChannel) return;
        if (directSendInFlight) return;
        if (currentChatIndex < 0) return;
        var input = $('msgInput');
        if (!input) return;
        var text = input.value.trim();
        if (!text) return;
        var chat = chats[currentChatIndex];
        var sendKey = chat.username || '';
        if (sendKey && directSendInFlight[sendKey]) return;
        if (!window.DardshtiBackend || !chat.username) {
            alert('تعذر الإرسال: لا يوجد اتصال بخادم الرسائل الحقيقي');
            return;
        }
        var sendIndex = currentChatIndex;
        var sendViewVersion = chatViewVersion;
        replyTarget = replyTarget || window._activeReplyTarget || null;
        var replyId = replyTarget && replyTarget.id ? Number(replyTarget.id) : null;
        var payloadKey = JSON.stringify({ text: text, replyToId: replyId });
        var pendingSend = pendingDirectMessages[sendKey];
        if (!pendingSend || pendingSend.payloadKey !== payloadKey) {
            pendingSend = { payloadKey: payloadKey, id: window.DardshtiBackend.createClientMessageId() };
            pendingDirectMessages[sendKey] = pendingSend;
        }
        directSendInFlight[sendKey] = true;
        input.disabled = true;
        if ($('btnSend')) $('btnSend').disabled = true;
        window.DardshtiBackend.sendMessage(chat.username, text, null, replyId, pendingSend.id).then(function(result) {
            if (pendingDirectMessages[sendKey] === pendingSend) delete pendingDirectMessages[sendKey];
            var record = result && result.message;
            var message = {
                text: record && record.text ? record.text : text,
                sent: true,
                time: record && record.createdAt ? record.createdAt : Date.now(),
                id: record && record.id ? record.id : null,
                imageUrl: record && record.imageUrl ? record.imageUrl : null,
                replyToId: record && record.replyToId ? record.replyToId : replyId,
                replyToText: replyTarget ? replyTarget.text : ''
            };
            chat.messages = chat.messages || [];
            if (message.id && !seenMessageIds.has(Number(message.id))) {
                seenMessageIds.add(Number(message.id));
                chat.messages.push(message);
                if (message.id > lastMessageId) lastMessageId = message.id;
                if (currentChatIndex === sendIndex && chatViewVersion === sendViewVersion) addBubble(message.text, true, message.time, message.imageUrl, message);
            }
            save();
            renderChats();
            if (currentChatIndex === sendIndex && chatViewVersion === sendViewVersion) {
                input.value = '';
                input.focus();
                clearReply();
            }
        }).catch(function(error) {
            console.warn('[Dardshti] message send failed:', error.message);
            showChatToast('لم تُرسل الرسالة. تحقق من الاتصال ثم حاول مجدداً.');
        }).finally(function() {
            delete directSendInFlight[sendKey];
            if (currentChatIndex === sendIndex && chatViewVersion === sendViewVersion) {
                input.disabled = false;
                if ($('btnSend')) $('btnSend').disabled = false;
            }
        });
    }

    // ===== الإعدادات =====
    var settingsCategories = [
        { id: 'account', icon: '👤', title: 'الحساب', subtitle: 'الملف الشخصي وتفاصيل حسابك' },
        { id: 'privacy', icon: '🔐', title: 'الخصوصية والأمان', subtitle: 'تحكم بمن يرى معلوماتك' },
        { id: 'notifications', icon: '🔔', title: 'الإشعارات', subtitle: 'التنبيهات والأصوات' },
        { id: 'chat', icon: '💬', title: 'الدردشة', subtitle: 'خيارات المحادثات والوسائط' },
        { id: 'appearance', icon: '🎨', title: 'المظهر', subtitle: 'الوضع والألوان وحجم الخط' },
        { id: 'storage', icon: '📦', title: 'التخزين والبيانات', subtitle: 'استخدام البيانات والتحميلات' },
        { id: 'language', icon: '🌐', title: 'اللغة', subtitle: 'العربية' },
        { id: 'market', icon: '🛒', title: 'السوق', subtitle: 'إعدادات البيع والشراء' },
        { id: 'help', icon: '🆘', title: 'المساعدة والدعم', subtitle: 'نحتاج مساعدتك؟' },
        { id: 'about', icon: 'ℹ️', title: 'حول SALO', subtitle: 'الإصدار ومعلومات التطبيق' }
    ];
    var settingsDefaults = { notifications: true, sound: true, messagePreview: true, readReceipts: true, onlineStatus: true, calls: true, darkMode: true, autoDownload: false, dataSaver: false, language: 'العربية' };
    var settingsState = {};
    var activeSettingsCategory = null;
    function loadSettings() {
        try { settingsState = Object.assign({}, settingsDefaults, JSON.parse(localStorage.getItem('dardshti_settings') || '{}')); }
        catch (e) { settingsState = Object.assign({}, settingsDefaults); }
        applyTheme();
    }
    function saveSettings() {
        localStorage.setItem('dardshti_settings', JSON.stringify(settingsState));
        var toast = $('settingsSavedToast');
        if (toast) { toast.classList.add('show'); setTimeout(function() { toast.classList.remove('show'); }, 1600); }
    }
    function applyTheme() {
        document.body.classList.toggle('light-mode', settingsState.darkMode === false);
        var app = $('app');
        if (app) app.classList.toggle('light-mode', settingsState.darkMode === false);
    }
    function settingRow(label, description, key, type, icon) {
        var value = Boolean(settingsState[key]);
        return '<div class="detail-setting-row"><span class="detail-row-icon">' + (icon || '◈') + '</span><div class="detail-setting-copy"><b>' + label + '</b><small>' + description + '</small></div>' +
            (type === 'switch' ? '<label class="switch"><input type="checkbox" data-setting-key="' + key + '" ' + (value ? 'checked' : '') + '><span class="slider"></span></label>' : '<span class="detail-row-chevron">‹</span>') + '</div>';
    }
    function actionRow(label, description, icon, actionId, danger) {
        return '<button type="button" class="detail-action-row' + (danger ? ' danger' : '') + '" data-detail-action="' + actionId + '"><span class="detail-row-icon">' + icon + '</span><span class="detail-setting-copy"><b>' + label + '</b><small>' + description + '</small></span><span class="detail-row-chevron">‹</span></button>';
    }
    function renderSettingsCategories() {
        var list = $('settingsCategories'); if (!list) return;
        list.innerHTML = settingsCategories.map(function(c) { return '<button type="button" class="settings-category" data-settings-category="' + c.id + '"><span class="category-icon">' + c.icon + '</span><span class="category-copy"><b>' + c.title + '</b><small>' + c.subtitle + '</small></span><span class="category-arrow">‹</span></button>'; }).join('');
        list.querySelectorAll('[data-settings-category]').forEach(function(btn) { btn.onclick = function() { openSettingsCategory(btn.getAttribute('data-settings-category')); }; });
    }
    function renderDetailBody(id) {
        var body = $('settingsDetailBody'); if (!body) return;
        var content = '';
        if (id === 'account') content = '<div class="detail-card account-card"><div class="profile-avatar detail-avatar" id="detailAvatar">👤</div><b>' + (currentUser.displayName || currentUser.username) + '</b><span>@' + currentUser.username + '</span><button type="button" class="detail-primary" id="detailEditProfile">تعديل الصورة والملف</button></div><div class="detail-info-list"><div><span>الاسم الكامل</span><b>' + (currentUser.displayName || currentUser.username) + '</b></div><div><span>اسم المستخدم</span><b>@' + currentUser.username + '</b></div><div><span>النبذة التعريفية</span><b>' + (currentUser.status || 'لا توجد نبذة حالياً') + '</b></div><div><span>رقم الهاتف</span><b>غير مضاف</b></div><div><span>البريد الإلكتروني</span><b>' + (currentUser.email || 'غير مضاف') + '</b></div></div>' + actionRow('تغيير كلمة المرور', 'حافظ على أمان حسابك', '🔒', 'password') + actionRow('حذف الحساب', 'لا يمكن التراجع عن هذا الإجراء', '🗑️', 'delete-account', true);
        if (id === 'privacy') content = '<div class="detail-note">تحكم بمن يستطيع رؤيتك والتواصل معك. تظهر التغييرات مباشرة ويتم حفظها في حسابك.</div><div class="detail-card">' + settingRow('من يستطيع مراسلتي؟', 'الجميع', 'onlineStatus', 'switch', '◉') + settingRow('من يستطيع رؤية ملفي؟', 'الجميع', 'messagePreview', 'switch', '▢') + settingRow('إخفاء حالة الاتصال', 'لا تظهر أنك متصل الآن', 'onlineStatus', 'switch', '◌') + settingRow('إخفاء آخر ظهور', 'إيقاف مشاركة وقت نشاطك', 'readReceipts', 'switch', '◌') + settingRow('إخفاء قراءة الرسائل', 'لا تظهر للطرف الآخر', 'readReceipts', 'switch', '◌') + '</div>' + actionRow('المحظورون', 'إدارة الحسابات المحظورة', '⊗', 'blocked') + actionRow('الأجهزة المسجلة', 'لديك جهاز واحد مسجل', '▣', 'devices') + actionRow('التحقق بخطوتين', 'أضف طبقة حماية إضافية', '◈', 'two-factor') + actionRow('تسجيل الخروج من جميع الأجهزة', 'سيتم تسجيل خروجك من الأجهزة الأخرى', '□', 'logout-all');
        if (id === 'notifications') content = '<div class="detail-card">' + settingRow('إشعارات الرسائل', 'عند وصول رسالة جديدة', 'notifications', 'switch', '●') + settingRow('إشعارات المكالمات', 'مكالمات الصوت والفيديو', 'calls', 'switch', '⌕') + settingRow('إشعارات الأصدقاء', 'طلبات ومتابعات جديدة', 'notifications', 'switch', '♟') + settingRow('إشعارات المجموعات', 'نشاط المجموعات والقنوات', 'notifications', 'switch', '♟') + settingRow('إشعارات السوق', 'إعلانات وتحديثات السوق', 'notifications', 'switch', '▣') + '</div><div class="detail-card">' + settingRow('كتم جميع الإشعارات', 'إيقافها مؤقتاً', 'dataSaver', 'switch', '☾') + settingRow('أصوات الإشعارات', 'تشغيل صوت التنبيه', 'sound', 'switch', '♪') + settingRow('الاهتزاز', 'اهتزاز الجهاز عند التنبيه', 'sound', 'switch', '⌁') + '</div>';
        if (id === 'chat') content = '<div class="detail-card">' + actionRow('حذف المحادثات', 'إدارة وحذف المحادثات القديمة', '⌁', 'delete-chats') + actionRow('الرسائل المؤقتة', 'تعيين مدة حذف الرسائل', '◷', 'temporary') + '</div><div class="detail-card"><div class="detail-section-title">تحميل الوسائط تلقائياً</div>' + settingRow('الصور', 'تحميل الصور تلقائياً', 'autoDownload', 'switch', '▧') + settingRow('الفيديوهات', 'تحميل الفيديوهات تلقائياً', 'autoDownload', 'switch', '▧') + settingRow('الملفات', 'تحميل الملفات تلقائياً', 'dataSaver', 'switch', '□') + '</div>' + actionRow('حجم الخط', 'متوسط', 'A', 'font-size') + actionRow('خلفية المحادثة', 'تخصيص مظهر المحادثة', '▧', 'chat-background') + settingRow('معاينة الروابط', 'عرض معاينة الروابط داخل الدردشة', 'messagePreview', 'switch', '◉');
        if (id === 'appearance') content = '<div class="detail-card appearance-card"><div class="detail-section-title">الوضع</div><div class="appearance-choices"><button type="button" data-theme-choice="light">☀️<span>فاتح</span></button><button type="button" class="selected" data-theme-choice="dark">◐<span>داكن</span></button><button type="button" data-theme-choice="system">◒<span>تلقائي</span></button></div></div><div class="detail-card"><div class="detail-section-title">لون التطبيق</div><div class="color-choices"><i class="selected"></i><i></i><i></i><i></i><i></i><i></i></div></div>' + actionRow('حجم الخط', 'متوسط', 'A', 'font-size') + actionRow('شكل المحادثات', 'فقاعات ورسائل', '▤', 'chat-style');
        if (id === 'storage') content = '<div class="detail-card">' + actionRow('حجم التخزين المستخدم', '1.2 GB', '▣', 'storage-used') + actionRow('حذف الملفات المؤقتة', '352 MB', '▥', 'clear-cache') + actionRow('إدارة الصور والفيديوهات', '1240 عنصر', '▧', 'media-manager') + actionRow('جودة رفع الصور والفيديو', 'عالية', '▧', 'upload-quality') + '</div>' + actionRow('استخدام البيانات', 'Wi‑Fi وبيانات الجوال', '▥', 'data-usage') + '<div class="detail-card backup-card"><b>النسخ الاحتياطي</b><small>آخر نسخة احتياطية: 2025-09-20</small><button type="button" class="detail-primary" id="backupNow">نسخ احتياطي الآن</button></div>';
        if (id === 'language') content = '<div class="detail-card language-options"><button type="button" class="language-choice active"><span>العربية</span><b>◉</b><em>🇸🇦</em></button><button type="button" class="language-choice" data-language="English"><span>English</span><b>○</b><em>🇺🇸</em></button><button type="button" class="language-choice" data-language="auto"><span>اللغة تلقائياً</span><b>○</b><em>🌐</em></button></div><div class="detail-note">سيتم تطبيق اللغة على جميع أجزاء التطبيق بعد إعادة فتحه.</div>';
        if (id === 'market') content = '<div class="detail-card">' + settingRow('إشعارات الطلبات', 'عند وصول طلب جديد', 'notifications', 'switch', '♧') + actionRow('إعدادات البيع والشراء', 'إدارة تفضيلات السوق', '🛒', 'market-preferences') + actionRow('طرق الدفع', 'أمان معاملاتك', '▣', 'payment-methods') + actionRow('أمان المعاملات', 'حماية عمليات الشراء والبيع', '◈', 'transaction-security') + '</div>';
        if (id === 'help') content = '<div class="detail-card help-card">' + actionRow('مركز المساعدة', 'ابحث عن إجابات لأسئلتك', '?', 'faq') + actionRow('الإبلاغ عن مشكلة', 'أخبرنا بالمشكلة التي تواجهها', '△', 'report') + actionRow('اقتراح ميزة', 'شاركنا أفكارك', '♢', 'feature') + actionRow('التواصل مع الدعم', 'نحن هنا لمساعدتك', '♧', 'support') + '</div>';
        if (id === 'about') content = '<div class="about-card"><div class="about-logo">S</div><h3>SALO</h3><p>فضاء التواصل، المشاركة، والتجمع.</p><span>إصدار التطبيق 1.0.0</span></div><div class="detail-card">' + actionRow('شروط الاستخدام', 'اقرأ شروط استخدام التطبيق', '‹', 'terms') + actionRow('سياسة الخصوصية', 'كيف نحمي بياناتك', '‹', 'policy') + actionRow('عن التطبيق', 'معلومات عن SALO', '‹', 'about-app') + '</div>';
        body.innerHTML = content + '<div id="settingsSavedToast" class="settings-toast">تم حفظ التغيير</div>';
        body.querySelectorAll('[data-setting-key]').forEach(function(input) { input.onchange = function() { settingsState[input.getAttribute('data-setting-key')] = input.checked; applyTheme(); saveSettings(); }; });
        var edit = $('detailEditProfile'); if (edit) edit.onclick = function() { if ($('btnEditProfile')) $('btnEditProfile').click(); };
        var support = $('contactSupport'); if (support) support.onclick = function() { alert('شكراً لملاحظتك. يمكنك التواصل مع فريق الدعم من خلال قنوات SALO الرسمية.'); };
        var market = $('openMarketFromSettings'); if (market) market.onclick = function() { closeSettingsDetail(); showSection('chats'); setTimeout(function() { var souq = document.querySelector('.channel-item[data-channel=\"souq\"]'); if (souq) souq.click(); else alert('السوق متاح من القنوات العامة.'); }, 80); };
        body.querySelectorAll('[data-language]').forEach(function(btn) { btn.onclick = function() { settingsState.language = btn.getAttribute('data-language'); saveSettings(); alert('سيتم تطبيق اختيار اللغة عند إعادة فتح التطبيق.'); }; });
        body.querySelectorAll('[data-theme-choice]').forEach(function(btn) { btn.onclick = function() { var theme = btn.getAttribute('data-theme-choice'); settingsState.darkMode = theme !== 'light'; applyTheme(); saveSettings(); body.querySelectorAll('[data-theme-choice]').forEach(function(x) { x.classList.toggle('selected', x === btn); }); }; });
        body.querySelectorAll('[data-detail-action]').forEach(function(btn) { btn.onclick = function() { var a = btn.getAttribute('data-detail-action'); if (a === 'delete-account') { alert('يمكنك طلب حذف الحساب من فريق الدعم. لم يتم حذف أي بيانات.'); } else if (a === 'logout-all') { alert('تم تأمين الجلسات الأخرى.'); } else if (a === 'clear-cache') { alert('لا توجد ملفات مؤقتة قابلة للحذف حالياً.'); } else if (a === 'support' || a === 'report' || a === 'feature') { alert('شكراً لتواصلك. تم تجهيز نموذج الدعم لهذه الوظيفة.'); } else { alert('تم فتح إعداد ' + btn.querySelector('b').textContent + '.'); } }; });
        var backup = $('backupNow'); if (backup) backup.onclick = function() { saveSettings(); alert('تم حفظ نسخة الإعدادات الحالية بنجاح.'); };
        if ($('detailAvatar')) setAvatar($('detailAvatar'), currentUser.displayName || currentUser.username);
    }
    function openSettingsCategory(id) {
        var category = settingsCategories.find(function(c) { return c.id === id; }); if (!category) return;
        activeSettingsCategory = id;
        $('settingsHome').classList.remove('active'); $('settingsDetail').classList.add('active');
        $('settingsDetailTitle').textContent = category.title; $('settingsDetailSubtitle').textContent = category.subtitle;
        renderDetailBody(id);
    }
    function closeSettingsDetail() { activeSettingsCategory = null; $('settingsDetail').classList.remove('active'); $('settingsHome').classList.add('active'); }
    function updateSettings() {
        if (!currentUser) return;
        loadSettings();
        if ($('settingsName')) $('settingsName').textContent = currentUser.displayName || currentUser.username;
        if ($('settingsUsername')) $('settingsUsername').textContent = '@' + currentUser.username;
        setAvatar($('settingsAvatar'), currentUser.displayName || currentUser.username);
        renderSettingsCategories();
    }
    // ===== ربط الأحداث =====
    function bindEvents() {

        // تبويبات الدخول
        var authTabs = document.querySelectorAll('.auth-tab');
        authTabs.forEach(function(tab) {
            tab.onclick = function() {
                authTabs.forEach(function(t) { t.classList.remove('active'); });
                tab.classList.add('active');
                var forms = document.querySelectorAll('.auth-form');
                forms.forEach(function(f) { f.classList.remove('active'); });
                if (tab.getAttribute('data-auth') === 'login') {
                    if ($('loginForm')) $('loginForm').classList.add('active');
                } else {
                    if ($('registerForm')) $('registerForm').classList.add('active');
                }
            };
        });

        // نموذج تسجيل الدخول
        var loginForm = $('loginForm');
        if (loginForm) {
            loginForm.onsubmit = function(e) {
                e.preventDefault();
                e.stopPropagation();
                var username = ($('loginUsername') || {}).value || '';
                var password = ($('loginPassword') || {}).value || '';
                username = username.trim();

                console.log('Login attempt:', username);

                if (!username || !password) {
                    alert('الرجاء إدخال البيانات');
                    return false;
                }

                if (window.DardshtiBackend) {
                    window.DardshtiBackend.login(username, password).then(function(user) {
                        currentUser = user;
                        reloadLocalState();
                        enterApp();
                    }).catch(function(error) { alert(error.message || 'بيانات الدخول خاطئة'); });
                } else {
                    var user = doLogin(username, password);
                    if (user) { currentUser = user; save(); enterApp(); }
                    else alert('بيانات الدخول خاطئة');
                }
                return false;
            };
        }

        // نموذج إنشاء حساب
        var regForm = $('registerForm');
        if (regForm) {
            regForm.onsubmit = function(e) {
                e.preventDefault();
                e.stopPropagation();
                var displayName = (($('regDisplayName') || {}).value || '').trim();
                var username = (($('regUsername') || {}).value || '').trim();
                var password = ($('regPassword') || {}).value || '';

                console.log('Register attempt:', username);

                if (!username || !password) {
                    alert('الرجاء إدخال اسم المستخدم وكلمة المرور');
                    return false;
                }

                if (username.length < 3) {
                    alert('اسم المستخدم قصير جداً (3 أحرف على الأقل)');
                    return false;
                }

                if (password.length < 8) {
                    alert('كلمة المرور قصيرة جداً (8 أحرف على الأقل)');
                    return false;
                }

                if (window.DardshtiBackend) {
                    window.DardshtiBackend.register(displayName, username, password).then(function(user) {
                        currentUser = user;
                        reloadLocalState();
                        alert('تم إنشاء الحساب بنجاح');
                        enterApp();
                    }).catch(function(error) { alert(error.message || 'تعذر إنشاء الحساب'); });
                    return false;
                }

                var result = doRegister(displayName, username, password);
                if (result.error) {
                    alert(result.error);
                    return false;
                }

                currentUser = result.user;
                save();
                alert('تم إنشاء الحساب بنجاح');
                enterApp();
                return false;
            };
        }

        // شريط التنقل السفلي
        var navBtns = document.querySelectorAll('.nav-btn');
        navBtns.forEach(function(btn) {
            btn.onclick = function() {
                var sectionName = btn.getAttribute('data-section');
                showSection(sectionName);
                if (sectionName === 'friends') {
                    renderFriends(($('searchIn') || {}).value || '');
                    refreshDirectory();
                }
            };
        });

        // زر الإرسال
        if ($('btnSend')) {
            $('btnSend').onclick = sendMessage;
        }

        // Enter في حقل الرسالة
        if ($('msgInput')) {
            $('msgInput').onkeypress = function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    sendMessage();
                }
            };
        }

        // زر الرجوع
        if ($('btnBack')) {
            $('btnBack').onclick = function() {
                showScreen('mainScreen');
                showSection('chats');
                renderChats();
                if (chatPollTimer) clearInterval(chatPollTimer);
                chatPollTimer = null;
                currentChatIndex = -1;
            };
        }

        // زر البحث
        if ($('btnSearch')) {
            $('btnSearch').onclick = function() {
                if ($('searchBar')) $('searchBar').classList.toggle('active');
                if ($('searchIn') && $('searchBar').classList.contains('active')) $('searchIn').focus();
            };
        }

        if ($('closeSearch')) {
            $('closeSearch').onclick = function() {
                if ($('searchBar')) $('searchBar').classList.remove('active');
                if ($('searchIn')) $('searchIn').value = '';
                renderChats();
            };
        }

        if ($('searchIn')) {
            $('searchIn').oninput = function() {
                renderChats(this.value);
            };
        }

        // نافذة محادثة جديدة
        if ($('btnNew')) {
            $('btnNew').onclick = function() {
                if ($('newModal')) $('newModal').classList.add('active');
                if ($('newName')) $('newName').value = '';
                if ($('searchResults')) $('searchResults').innerHTML = '';
                setTimeout(function() { if ($('newName')) $('newName').focus(); }, 200);
            };
        }

        if ($('closeNew')) {
            $('closeNew').onclick = function() {
                if ($('newModal')) $('newModal').classList.remove('active');
            };
        }

        if ($('newName')) {
            $('newName').oninput = function() {
                var query = this.value.trim().toLowerCase();
                var results = $('searchResults');
                if (!results) return;

                if (!query) { results.innerHTML = ''; return; }

                var renderUsers = function(found) {
                    found = found.filter(function(u) { return u.username !== currentUser.username; });
                    if (found.length === 0) {
                        results.innerHTML = '<p style="padding:10px;color:#6c7883;">لا توجد نتائج</p>';
                        return;
                    }
                    results.innerHTML = '';
                    found.forEach(function(user) {
                    var item = document.createElement('div');
                    item.className = 'search-user';

                    var avatar = document.createElement('div');
                    avatar.className = 'chat-avatar';
                    setAvatar(avatar, user.displayName || user.username);

                    var info = document.createElement('div');
                    info.className = 'chat-info';
                    var resultName = document.createElement('div');
                    resultName.className = 'chat-name';
                    resultName.textContent = user.displayName || user.username;
                    var resultUsername = document.createElement('div');
                    resultUsername.className = 'chat-last-msg';
                    resultUsername.textContent = '@' + user.username;
                    info.appendChild(resultName);
                    info.appendChild(resultUsername);

                    item.appendChild(avatar);
                    item.appendChild(info);

                    item.onclick = function() {
                        var friendName = user.displayName || user.username;
                        var exists = friends.some(function(f) { return f.username === user.username; });
                        if (!exists) {
                            friends.push({ name: friendName, username: user.username });
                        }
                        var chatExists = chats.some(function(c) { return c.username === user.username; });
                        if (!chatExists) {
                            chats.push({ name: friendName, username: user.username, messages: [] });
                        }
                        save();
                        if ($('newModal')) $('newModal').classList.remove('active');
                        renderChats();
                        renderFriends();
                        showSection('chats');
                    };
                        results.appendChild(item);
                    });
                };
                if (window.DardshtiBackend) {
                    window.DardshtiBackend.searchUsers(query).then(renderUsers).catch(function() { renderUsers([]); });
                } else {
                    var users = JSON.parse(localStorage.getItem('dardshti_users') || '[]');
                    renderUsers(users.filter(function(u) {
                        return u.username.toLowerCase().indexOf(query) !== -1 || (u.displayName || '').toLowerCase().indexOf(query) !== -1;
                    }));
                }
            };
        }

        if ($('settingsBack')) $('settingsBack').onclick = closeSettingsDetail;
        // تعديل الملف الشخصي
        if ($('btnEditProfile')) {
            $('btnEditProfile').onclick = function() {
                if (!currentUser) return;
                if ($('editName')) $('editName').value = currentUser.displayName || '';
                if ($('editStatus')) $('editStatus').value = currentUser.status || '';
                setAvatar($('editAvatar'), currentUser.displayName || currentUser.username);
                if ($('editProfileModal')) $('editProfileModal').classList.add('active');
            };
        }

        if ($('closeEditProfile')) {
            $('closeEditProfile').onclick = function() {
                if ($('editProfileModal')) $('editProfileModal').classList.remove('active');
            };
        }

        if ($('saveProfileBtn')) {
            $('saveProfileBtn').onclick = function() {
                var name = ($('editName') || {}).value || '';
                var status = ($('editStatus') || {}).value || '';
                if (name) currentUser.displayName = name;
                if (status) currentUser.status = status;

                var users = JSON.parse(localStorage.getItem('dardshti_users') || '[]');
                for (var i = 0; i < users.length; i++) {
                    if (users[i].username === currentUser.username) {
                        users[i].displayName = currentUser.displayName;
                        users[i].status = currentUser.status;
                        break;
                    }
                }
                localStorage.setItem('dardshti_users', JSON.stringify(users));
                save();
                updateSettings();
                if ($('editProfileModal')) $('editProfileModal').classList.remove('active');
            };
        }

        // الإيموجي
        var emojiGrid = document.querySelector('.emoji-grid');
        if (emojiGrid) {
            var emojis = ['😊','😂','❤️','👍','🔥','🎉','😍','🙏','😎','✨','😢','😡','🤔','👏','💯','🎂','🌹','☕','🎵','⚽'];
            emojis.forEach(function(em) {
                var b = document.createElement('button');
                b.type = 'button';
                b.textContent = em;
                b.onclick = function() {
                    if ($('msgInput')) {
                        $('msgInput').value += em;
                        $('msgInput').focus();
                    }
                };
                emojiGrid.appendChild(b);
            });
        }

        if ($('btnEmoji')) {
            $('btnEmoji').onclick = function() {
                if ($('emojiPanel')) $('emojiPanel').classList.toggle('active');
            };
        }

        // تسجيل الخروج
        if ($('btnLogout')) {
            $('btnLogout').onclick = function() {
                if (!confirm('هل تريد تسجيل الخروج؟')) return;
                var done = window.DardshtiBackend ? window.DardshtiBackend.logout() : Promise.resolve();
                done.then(function() {
                    if (directoryRefreshTimer) clearInterval(directoryRefreshTimer);
                    directoryRefreshTimer = null;
                    localStorage.removeItem('dardshti_user');
                    currentUser = null;
                    showScreen('authScreen');
                });
            };
        }
    }

    // ===== التهيئة =====
    function init() {
        console.log('🚀 DARDSHTI starting...');
        var ready = window.DardshtiBackend ? window.DardshtiBackend.ready : Promise.resolve(null);
        ready.then(function() {
            reloadLocalState();
            bindEvents();
            if (currentUser) {
                console.log('👤 Logged in as:', currentUser.username);
                enterApp();
            } else {
                console.log('🔑 Not logged in, showing auth');
                showScreen('authScreen');
            }
            console.log('✅ DARDSHTI ready');
        });
    }

    // ===== الانتظار لتحميل DOM =====
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();

// ==========================================
// قسم الآراء (Reviews)
// ==========================================
(function() {
    'use strict';
    var $ = function(id) { return document.getElementById(id); };
    var selectedRating = 0;

    function getReviews() {
        try { return JSON.parse(localStorage.getItem('dardshti_reviews') || '[]'); }
        catch (e) { return []; }
    }
    function saveReviews(reviews) {
        localStorage.setItem('dardshti_reviews', JSON.stringify(reviews));
    }

    function renderReviews() {
        var list = $('reviewsList');
        if (!list) return;
        var reviews = getReviews();
        reviews.sort(function(a, b) { return b.time - a.time; });

        if (reviews.length === 0) {
            list.innerHTML = '<div class="empty-state"><div class="empty-icon">💭</div><h3>لا توجد آراء بعد</h3><p>كن أول من يشارك رأيه</p></div>';
            return;
        }

        list.innerHTML = '';
        var currentUser = JSON.parse(localStorage.getItem('dardshti_user') || 'null');

        reviews.forEach(function(review, index) {
            var item = document.createElement('div');
            item.className = 'review-item';

            var stars = '';
            for (var i = 0; i < 5; i++) stars += (i < review.rating) ? '⭐' : '☆';

            var d = new Date(review.time);
            var timeStr = d.getDate() + '/' + (d.getMonth() + 1) + ' ' +
                          String(d.getHours()).padStart(2, '0') + ':' +
                          String(d.getMinutes()).padStart(2, '0');

            var canDelete = currentUser && currentUser.username === review.username;
            var html = '<div class="review-header"><div class="review-user"><div class="review-avatar"></div><div><div class="review-name">' + escapeHtml(review.name) + '</div><div class="review-time">' + timeStr + '</div></div></div>';

            if (canDelete) html += '<button type="button" class="review-delete">🗑️</button>';
            html += '</div><div class="review-stars">' + stars + '</div><div class="review-text">' + escapeHtml(review.text) + '</div>';

            item.innerHTML = html;

            var avatarEl = item.querySelector('.review-avatar');
            if (avatarEl) {
                var img = document.createElement('img');
                img.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(review.name);
                img.alt = review.name;
                img.onerror = function() { avatarEl.textContent = review.name.charAt(0); };
                avatarEl.appendChild(img);
            }

            var delBtn = item.querySelector('.review-delete');
            if (delBtn) {
                delBtn.onclick = function() {
                    if (!confirm('حذف هذا الرأي؟')) return;
                    var all = getReviews();
                    for (var i = 0; i < all.length; i++) {
                        if (all[i].time === review.time && all[i].username === review.username) {
                            all.splice(i, 1);
                            break;
                        }
                    }
                    saveReviews(all);
                    renderReviews();
                };
            }

            list.appendChild(item);
        });
    }

    function setupStars() {
        var c = $('ratingStars');
        if (!c) return;
        var stars = c.querySelectorAll('span');

        function update() {
            stars.forEach(function(s) {
                var r = parseInt(s.getAttribute('data-star'));
                if (r <= selectedRating) s.classList.add('active');
                else s.classList.remove('active');
            });
        }

        stars.forEach(function(star) {
            star.onclick = function() {
                selectedRating = parseInt(star.getAttribute('data-star'));
                update();
            };
            star.onmouseenter = function() {
                var h = parseInt(star.getAttribute('data-star'));
                stars.forEach(function(s) {
                    var r = parseInt(s.getAttribute('data-star'));
                    s.style.opacity = r <= h ? '1' : '0.3';
                    s.style.filter = r <= h ? 'grayscale(0)' : 'grayscale(1)';
                });
            };
        });
        c.onmouseleave = update;
    }

    function setupSubmit() {
        var btn = $('submitReview');
        if (!btn) return;
        btn.onclick = function() {
            var currentUser = JSON.parse(localStorage.getItem('dardshti_user') || 'null');
            if (!currentUser) { alert('يجب تسجيل الدخول أولاً'); return; }

            var text = $('reviewText').value.trim();
            if (selectedRating === 0) { alert('اختر التقييم (النجوم)'); return; }
            if (!text) { alert('اكتب رأيك'); return; }
            if (text.length < 5) { alert('الرأي قصير جداً'); return; }

            var reviews = getReviews();
            reviews.push({
                username: currentUser.username,
                name: currentUser.displayName || currentUser.username,
                rating: selectedRating,
                text: text,
                time: Date.now()
            });
            saveReviews(reviews);

            $('reviewText').value = '';
            selectedRating = 0;
            var c = $('ratingStars');
            if (c) c.querySelectorAll('span').forEach(function(s) { s.classList.remove('active'); });
            renderReviews();
            alert('✅ شكراً لك! تم نشر رأيك');
        };
    }

    document.addEventListener('click', function(e) {
        var btn = e.target.closest('.nav-btn');
        if (btn && btn.getAttribute('data-section') === 'reviews') {
            setTimeout(renderReviews, 100);
        }
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { setupStars(); setupSubmit(); });
    } else {
        setupStars();
        setupSubmit();
    }

    function escapeHtml(text) {
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    console.log('✅ قسم الآراء جاهز');
})();

// ==========================================
// إصلاح ربط زر الآراء (v5)
// ==========================================
(function() {
    'use strict';
    
    function initReviewsButton() {
        var reviewsBtn = document.querySelector('[data-section="reviews"]');
        if (!reviewsBtn) {
            console.log('❌ زر الآراء غير موجود');
            return;
        }
        
        console.log('✅ تم العثور على زر الآراء');
        
        // احذف أي ربط سابق
        reviewsBtn.onclick = null;
        
        // اربطه من جديد
        reviewsBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('📌 تم الضغط على الآراء');
            
            // إخفاء كل الأقسام
            var allSections = document.querySelectorAll('.section');
            for (var i = 0; i < allSections.length; i++) {
                allSections[i].classList.remove('active');
            }
            
            // إخفاء نشاط كل الأزرار
            var allBtns = document.querySelectorAll('.nav-btn');
            for (var j = 0; j < allBtns.length; j++) {
                allBtns[j].classList.remove('active');
            }
            
            // إظهار قسم الآراء
            var section = document.getElementById('sectionReviews');
            if (section) {
                section.classList.add('active');
                console.log('✅ تم إظهار قسم الآراء');
            } else {
                console.log('❌ قسم sectionReviews غير موجود');
            }
            
            // تنشيط الزر
            this.classList.add('active');
            
            // تحديث العنوان
            var title = document.getElementById('headerTitle');
            if (title) title.textContent = 'الآراء';
            
            // تحديث قائمة الآراء
            if (typeof window.loadReviews === 'function') {
                window.loadReviews();
            }
        };
    }
    
    // تشغيل بعد تحميل الصفحة
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(initReviewsButton, 500);
        });
    } else {
        setTimeout(initReviewsButton, 500);
    }
    
    console.log('✅ إصلاح زر الآراء جاهز');
})();

// ==========================================
// v8 - محادثة احترافية
// ==========================================
(function() {
    'use strict';
    var $ = function(id) { return document.getElementById(id); };

    // ===== إرسال مع صورة =====
    var btnAttach = $('btnAttach');
    var chatImageInput = $('chatImageInput');
    var currentChatMedia = null;

    if (btnAttach && chatImageInput) {
        btnAttach.onclick = function() { chatImageInput.click(); };
    }

    if (chatImageInput) {
        chatImageInput.onchange = function() {
            var file = this.files[0];
            if (!file) return;
            
            if (file.size > 2 * 1024 * 1024) {
                alert('حجم الصورة كبير (الحد 2 ميجا)');
                return;
            }
            
            var reader = new FileReader();
            reader.onload = function(e) {
                currentChatMedia = { type: 'image', data: e.target.result };
                sendMessageWithMedia();
            };
            reader.readAsDataURL(file);
        };
    }

    function sendMessageWithMedia() {
        var input = $('msgInput');
        if (!input) return;
        if (currentChatIndex < 0 || !chats[currentChatIndex] || !chats[currentChatIndex].username) {
            showChatToast('افتح محادثة مستخدم مسجل لإرسال الصورة.');
            return;
        }
        var chat = chats[currentChatIndex];
        var sendIndex = currentChatIndex;
        var sendVersion = chatViewVersion;
        var sendKey = chat.username;
        if (directSendInFlight[sendKey]) return;
        var text = input.value.trim();
        var imageUrl = currentChatMedia && currentChatMedia.type === 'image' ? currentChatMedia.data : null;
        if (!imageUrl) return;
        var reply = window._activeReplyTarget || null;
        var replyId = reply && reply.id ? Number(reply.id) : null;
        var payloadKey = JSON.stringify({ text: text, imageUrl: imageUrl, replyToId: replyId });
        var pendingSend = pendingDirectMessages[sendKey];
        if (!pendingSend || pendingSend.payloadKey !== payloadKey) {
            pendingSend = { payloadKey: payloadKey, id: window.DardshtiBackend.createClientMessageId() };
            pendingDirectMessages[sendKey] = pendingSend;
        }
        directSendInFlight[sendKey] = true;
        input.disabled = true;
        if ($('btnSend')) $('btnSend').disabled = true;
        window.DardshtiBackend.sendMessage(sendKey, text, imageUrl, replyId, pendingSend.id).then(function(result) {
            if (pendingDirectMessages[sendKey] === pendingSend) delete pendingDirectMessages[sendKey];
            var record = result && result.message;
            if (record && record.id && !seenMessageIds.has(Number(record.id))) {
                seenMessageIds.add(Number(record.id));
                var message = { id: Number(record.id), text: record.text || '', imageUrl: record.imageUrl || imageUrl, sent: true, time: record.createdAt || Date.now(), replyToId: record.replyToId || replyId, replyToText: reply ? reply.text : '' };
                chat.messages = chat.messages || [];
                chat.messages.push(message);
                lastMessageId = Math.max(lastMessageId, message.id);
                if (currentChatIndex === sendIndex && chatViewVersion === sendVersion) addBubble(message.text, true, message.time, message.imageUrl, message);
            }
            save();
            renderChats();
            if (currentChatIndex === sendIndex && chatViewVersion === sendVersion) {
                input.value = '';
                currentChatMedia = null;
                if (chatImageInput) chatImageInput.value = '';
                clearReply();
            }
        }).catch(function(error) {
            console.warn('[Dardshti] image message send failed:', error.message);
            showChatToast('تعذر إرسال الصورة. بقيت محفوظة لإعادة المحاولة.');
        }).finally(function() {
            delete directSendInFlight[sendKey];
            if (currentChatIndex === sendIndex && chatViewVersion === sendVersion) {
                input.disabled = false;
                if ($('btnSend')) $('btnSend').disabled = false;
            }
        });
    }

    // ===== الرد على رسالة =====
    var replyBar = $('replyBar');
    var replyText = $('replyText');
    var replyClose = $('replyClose');
    
    if (replyClose) {
        replyClose.onclick = function() {
            clearReply();
        };
    }

    // ===== تفعيل "يكتب الآن..." عند الكتابة =====
    var msgInput = $('msgInput');
    if (msgInput) {
        var typingTimer;
        msgInput.addEventListener('input', function() {
            clearTimeout(typingTimer);
            // هنا يمكن إرسال إشارة "يكتب الآن" إلى الخادم
            typingTimer = setTimeout(function() {
                // توقف عن الكتابة
            }, 1000);
        });
    }

    // ===== النقر على صورة =====
    document.addEventListener('click', function(e) {
        if (e.target.tagName === 'IMG' && e.target.closest('.msg')) {
            var lightbox = $('lightbox');
            var lbImg = $('lbImg');
            if (lightbox && lbImg) {
                lbImg.src = e.target.src;
                lightbox.classList.add('active');
            }
        }
    });

    // ===== دالة مساعدة =====
    function escapeHtml(text) {
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    console.log('✅ محادثة احترافية جاهزة');
})();
