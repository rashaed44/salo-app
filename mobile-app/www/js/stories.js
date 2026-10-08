// SALO Stories — stories are stored separately from legacy posts and synced per user.
(function () {
    'use strict';
    var $ = function (id) { return document.getElementById(id); };
    var STORAGE_KEY = 'dardshti_stories';
    var stories = [];
    var selectedColor = '#075985';
    var selectedImage = '';
    var viewerIndex = -1;
    var viewerTimer = null;
    function readStories() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch (e) { return []; } }
    function writeStories() { localStorage.setItem(STORAGE_KEY, JSON.stringify(stories)); }
    function currentUser() { try { return JSON.parse(localStorage.getItem('dardshti_user') || 'null'); } catch (e) { return null; } }
    function escapeHtml(value) { var div = document.createElement('div'); div.textContent = String(value || ''); return div.innerHTML; }
    function activeStories() { var now = Date.now(); return stories.filter(function (s) { return !s.expiresAt || s.expiresAt > now; }).sort(function (a, b) { return b.createdAt - a.createdAt; }); }
    function avatarFor(story) { return story.avatar || (window.getAvatar ? window.getAvatar(story.name || story.username) : ''); }
    function render() {
        stories = activeStories();
        var list = $('storiesList'), empty = $('storiesEmpty'); if (!list) return;
        var user = currentUser();
        list.innerHTML = '<button type="button" class="story-add-card" id="listAddStory"><span class="story-add-avatar">＋</span><b>قصتك</b><small>إضافة</small></button>' + stories.map(function (story, index) {
            var mine = user && story.username === user.username;
            var viewed = story.viewers && user && story.viewers.indexOf(user.username) !== -1;
            var visual = story.image ? '<img src="' + story.image + '" alt="">' : '<span>' + escapeHtml(story.text || '✨') + '</span>';
            return '<button type="button" class="story-card ' + (viewed ? 'viewed' : '') + '" data-story-index="' + index + '"><div class="story-ring" style="--story-color:' + story.color + '"><div class="story-thumb">' + visual + '</div></div><b>' + escapeHtml(mine ? 'قصتك' : (story.name || story.username)) + '</b><small>' + (mine ? 'عرض قصتك' : 'منذ قليل') + '</small></button>';
        }).join('');
        if (empty) empty.hidden = stories.length > 0;
        var add = $('listAddStory'); if (add) add.onclick = openComposer;
        list.querySelectorAll('[data-story-index]').forEach(function (card) { card.onclick = function () { openViewer(Number(card.getAttribute('data-story-index'))); }; });
    }
    function openComposer() { var modal = $('storyComposerModal'); if (!modal) return; modal.classList.add('active'); modal.setAttribute('aria-hidden', 'false'); if ($('storyText')) $('storyText').focus(); }
    function closeComposer() { var modal = $('storyComposerModal'); if (!modal) return; modal.classList.remove('active'); modal.setAttribute('aria-hidden', 'true'); selectedImage = ''; if ($('storyText')) $('storyText').value = ''; if ($('storyPreview')) { $('storyPreview').style.backgroundImage = ''; $('storyPreview').innerHTML = '<span>اكتب شيئاً جميلاً</span>'; } }
    function updatePreview() { var preview = $('storyPreview'), text = ($('storyText') || {}).value || ''; if (!preview) return; preview.style.background = selectedColor; preview.innerHTML = selectedImage ? '<img src="' + selectedImage + '" alt="معاينة">' : '<span>' + escapeHtml(text || 'اكتب شيئاً جميلاً') + '</span>'; }
    function publish() {
        var user = currentUser(), text = (($('storyText') || {}).value || '').trim();
        if (!user) return alert('يجب تسجيل الدخول أولاً');
        if (!text && !selectedImage) return alert('اكتب نصاً أو أضف صورة للستوري');
        stories = readStories().filter(function (s) { return s.expiresAt > Date.now(); });
        stories.push({ id: 'story_' + Date.now() + '_' + Math.random().toString(36).slice(2), username: user.username, name: user.displayName || user.username, avatar: '', text: text, image: selectedImage, color: selectedColor, createdAt: Date.now(), expiresAt: Date.now() + 24 * 60 * 60 * 1000, viewers: [], reactions: 0 });
        writeStories(); closeComposer(); render();
        alert('تم نشر الستوري بنجاح وستبقى لمدة 24 ساعة');
    }
    function openViewer(index) { var modal = $('storyViewerModal'); if (!modal || !stories[index]) return; viewerIndex = index; modal.classList.add('active'); modal.setAttribute('aria-hidden', 'false'); showViewer(); }
    function closeViewer() { var modal = $('storyViewerModal'); if (modal) { modal.classList.remove('active'); modal.setAttribute('aria-hidden', 'true'); } clearTimeout(viewerTimer); }
    function showViewer() {
        var story = stories[viewerIndex], user = currentUser(); if (!story) return closeViewer();
        if (user && story.viewers && story.viewers.indexOf(user.username) === -1) { story.viewers.push(user.username); writeStories(); }
        var head = $('storyViewerUser'), content = $('storyViewerContent'), progress = $('storyProgress');
        if (head) { var mine = user && story.username === user.username; head.innerHTML = '<b>' + escapeHtml(story.name || story.username) + '</b><small>' + (story.viewers ? story.viewers.length : 0) + ' مشاهدة</small>' + (mine ? '<button type=\"button\" class=\"story-delete\" id=\"deleteCurrentStory\">حذف</button>' : ''); var del = $('deleteCurrentStory'); if (del) del.onclick = deleteCurrentStory; }
        if (content) { content.style.background = story.color || '#075985'; content.innerHTML = story.image ? '<img src="' + story.image + '" alt="ستوري">' : '<p>' + escapeHtml(story.text) + '</p>'; }
        if (progress) { progress.classList.remove('run'); void progress.offsetWidth; progress.classList.add('run'); }
        clearTimeout(viewerTimer); viewerTimer = setTimeout(function () { nextStory(); }, 6000);
    }
    function deleteCurrentStory() { var story = stories[viewerIndex], user = currentUser(); if (!story || !user || story.username !== user.username) return; if (!confirm('حذف هذه الستوري؟')) return; var all = readStories().filter(function (s) { return s.id !== story.id; }); localStorage.setItem(STORAGE_KEY, JSON.stringify(all)); stories = activeStories(); closeViewer(); render(); }
    function nextStory() { if (viewerIndex < stories.length - 1) { viewerIndex++; showViewer(); } else closeViewer(); }
    function prevStory() { if (viewerIndex > 0) { viewerIndex--; showViewer(); } }
    function reactStory() { if (!stories[viewerIndex]) return; stories[viewerIndex].reactions = (stories[viewerIndex].reactions || 0) + 1; writeStories(); var button = $('storyReact'); if (button) { button.textContent = '♥'; button.classList.add('liked'); } }
    function bind() {
        stories = readStories();
        ['openStoryComposer', 'emptyAddStory'].forEach(function (id) { if ($(id)) $(id).onclick = openComposer; });
        if ($('closeStoryComposer')) $('closeStoryComposer').onclick = closeComposer;
        if ($('publishStory')) $('publishStory').onclick = publish;
        if ($('storyText')) $('storyText').oninput = updatePreview;
        if ($('storyImageButton')) $('storyImageButton').onclick = function () { if ($('storyImageInput')) $('storyImageInput').click(); };
        if ($('storyImageInput')) $('storyImageInput').onchange = function () { var file = this.files && this.files[0]; if (!file) return; if (file.size > 1400000) return alert('الصورة كبيرة جداً، اختر صورة أقل من 1.4MB'); var reader = new FileReader(); reader.onload = function (e) { selectedImage = e.target.result; updatePreview(); }; reader.readAsDataURL(file); };
        document.querySelectorAll('[data-story-color]').forEach(function (button) { button.onclick = function () { selectedColor = button.getAttribute('data-story-color'); document.querySelectorAll('[data-story-color]').forEach(function (b) { b.classList.toggle('selected', b === button); }); updatePreview(); }; });
        if ($('closeStoryViewer')) $('closeStoryViewer').onclick = closeViewer;
        if ($('storyNext')) $('storyNext').onclick = nextStory;
        if ($('storyPrev')) $('storyPrev').onclick = prevStory;
        if ($('storyReact')) $('storyReact').onclick = reactStory;
        document.addEventListener('click', function (event) { var button = event.target.closest('.nav-btn[data-section="stories"]'); if (button) setTimeout(render, 50); });
        render();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind); else bind();
    window.SALOStories = { render: render, openComposer: openComposer };
})();
