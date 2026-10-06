// chat-features.js - مميزات المحادثة
(function() {
    'use strict';
    var currentMenu = null;

    console.log('📦 تحميل مميزات المحادثة');

    // إغلاق القائمة
    document.addEventListener('click', function(e) {
        if (currentMenu && !currentMenu.contains(e.target)) {
            currentMenu.remove();
            currentMenu = null;
        }
    });

    // فتح القائمة
    function openMenu(msgEl) {
        if (currentMenu) {
            currentMenu.remove();
            currentMenu = null;
        }

        var rect = msgEl.getBoundingClientRect();
        var isSent = msgEl.classList.contains('sent');
        var menu = document.createElement('div');
        menu.className = 'message-menu';

        var items = [
            { icon: '↩️', text: 'رد', action: function() { startReply(msgEl); } },
            { icon: '📋', text: 'نسخ', action: function() { copyText(msgEl); } }
        ];

        if (isSent) {
            items.push({ icon: '✏️', text: 'تعديل', action: function() { startEdit(msgEl); } });
            items.push({ icon: '🗑️', text: 'حذف', danger: true, action: function() { deleteMsg(msgEl); } });
        }

        items.forEach(function(item) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'message-menu-item' + (item.danger ? ' danger' : '');
            btn.innerHTML = '<span class="menu-icon">' + item.icon + '</span> ' + item.text;
            btn.onclick = function(e) {
                e.stopPropagation();
                item.action();
                if (currentMenu) {
                    currentMenu.remove();
                    currentMenu = null;
                }
            };
            menu.appendChild(btn);
        });

        document.body.appendChild(menu);

        var mr = menu.getBoundingClientRect();
        var left = rect.left;
        var top = rect.top - mr.height - 10;
        if (top < 10) top = rect.bottom + 10;
        if (left + mr.width > window.innerWidth) left = window.innerWidth - mr.width - 10;
        if (left < 10) left = 10;

        menu.style.left = left + 'px';
        menu.style.top = top + 'px';
        currentMenu = menu;
    }

    // الرد على رسالة
    function startReply(msgEl) {
        var body = msgEl.querySelector('.message-body');
        var text = (body ? body.textContent : msgEl.textContent).trim().substring(0, 120);
        var id = Number(msgEl.dataset.messageId || 0);
        var replyBar = document.getElementById('replyBar');
        var replyText = document.getElementById('replyText');
        if (!id) {
            showToast('لا يمكن الرد على رسالة قديمة لا تحمل معرفاً محفوظاً');
            return;
        }
        if (replyBar && replyText) {
            window._activeReplyTarget = { id: id, text: text };
            replyText.textContent = text;
            replyBar.classList.add('active');
            document.querySelectorAll('.msg.replying').forEach(function(m) { m.classList.remove('replying'); });
            msgEl.classList.add('replying');
            var input = document.getElementById('msgInput');
            if (input) input.focus();
        }
    }

    // نسخ
    function copyText(msgEl) {
        var text = msgEl.textContent.trim();
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function() {
                showToast('✅ تم النسخ');
            }).catch(function() {
                fallbackCopy(text);
            });
        } else {
            fallbackCopy(text);
        }
    }

    function fallbackCopy(text) {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand('copy');
            showToast('✅ تم النسخ');
        } catch (e) {
            showToast('❌ فشل النسخ');
        }
        ta.remove();
    }

    // تعديل
    function startEdit(msgEl) {
        var modal = document.getElementById('editMessageModal');
        var textarea = document.getElementById('editMessageText');
        if (modal && textarea) {
            textarea.value = msgEl.textContent.trim();
            modal.classList.add('active');
            window._editingMsg = msgEl;
        } else {
            alert('❌ نافذة التعديل غير موجودة');
        }
    }

    // حذف
    function deleteMsg(msgEl) {
        if (!confirm('حذف هذه الرسالة؟')) return;
        msgEl.style.transition = 'all 0.3s';
        msgEl.style.opacity = '0';
        msgEl.style.transform = 'translateX(-50px)';
        setTimeout(function() { msgEl.remove(); }, 300);
    }

    // Toast
    function showToast(text) {
        var toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = text;
        document.body.appendChild(toast);
        setTimeout(function() {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s';
            setTimeout(function() { toast.remove(); }, 300);
        }, 1500);
    }

    // ربط الضغط المطول
    function attachMenu(msgEl) {
        if (msgEl.dataset.menuAttached === '1') return;
        msgEl.dataset.menuAttached = '1';

        var pressTimer;

        msgEl.addEventListener('touchstart', function(e) {
            pressTimer = setTimeout(function() {
                if (navigator.vibrate) navigator.vibrate(30);
                openMenu(msgEl);
            }, 500);
        }, { passive: true });

        msgEl.addEventListener('touchend', function() {
            clearTimeout(pressTimer);
        });

        msgEl.addEventListener('touchmove', function() {
            clearTimeout(pressTimer);
        });

        msgEl.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            openMenu(msgEl);
        });
    }

    // ربط نافذة التعديل
    function setupEditModal() {
        var saveBtn = document.getElementById('saveEditMessage');
        var cancelBtn = document.getElementById('cancelEditMessage');
        var closeBtn = document.getElementById('closeEditMessage');
        var modal = document.getElementById('editMessageModal');

        if (saveBtn) {
            saveBtn.onclick = function() {
                var textarea = document.getElementById('editMessageText');
                var msgEl = window._editingMsg;
                if (textarea && msgEl) {
                    var newText = textarea.value.trim();
                    if (newText) {
                        // احفظ النص الأصلي
                        var timeEl = msgEl.querySelector('.msg-time');
                        var editedMark = msgEl.querySelector('.msg-edited');
                        
                        // ابحث عن حاوية النص
                        var textNodes = [];
                        msgEl.childNodes.forEach(function(node) {
                            if (node.nodeType === 3) textNodes.push(node);
                        });

                        if (textNodes.length > 0) {
                            textNodes[0].textContent = newText;
                        } else {
                            var first = msgEl.firstChild;
                            if (first && first.nodeType === 3) {
                                first.textContent = newText + ' ';
                            } else {
                                msgEl.insertBefore(document.createTextNode(newText + ' '), msgEl.firstChild);
                            }
                        }

                        if (!editedMark && timeEl) {
                            var edited = document.createElement('span');
                            edited.className = 'msg-edited';
                            edited.textContent = '(معدّلة) ';
                            timeEl.insertBefore(edited, timeEl.firstChild);
                        }
                    }
                }
                if (modal) modal.classList.remove('active');
                window._editingMsg = null;
            };
        }

        if (cancelBtn) cancelBtn.onclick = function() { if (modal) modal.classList.remove('active'); };
        if (closeBtn) closeBtn.onclick = function() { if (modal) modal.classList.remove('active'); };
    }

    // تطبيق على كل الرسائل
    function applyToAll() {
        document.querySelectorAll('.msg').forEach(attachMenu);
    }

    // مراقبة رسائل جديدة
    var msgsContainer = document.getElementById('msgs');
    if (msgsContainer) {
        new MutationObserver(function(muts) {
            muts.forEach(function(m) {
                m.addedNodes.forEach(function(n) {
                    if (n.nodeType === 1 && n.classList.contains('msg')) {
                        attachMenu(n);
                    }
                });
            });
        }).observe(msgsContainer, { childList: true });
    }

    // تشغيل
    setTimeout(function() {
        applyToAll();
        setupEditModal();
        console.log('✅ مميزات جاهزة');
    }, 1000);

    // عند فتح محادثة
    document.addEventListener('click', function(e) {
        if (e.target.closest('.chat-item')) {
            setTimeout(applyToAll, 400);
        }
    });

})();
