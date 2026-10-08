#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const required = [
  'www/index.html',
  'www/css/style.css',
  'www/css/premium.css',
  'www/js/app.js',
  'www/js/backend-client.js',
  'www/js/enhancements.js',
  'www/js/shared-content.js',
  'www/js/chat-features.js',
  'www/js/inbox.js',
  'www/js/channels.js',
  'www/js/cases.js',
  'www/js/akish.js',
  'www/js/souq.js',
  'www/js/souq-admin.js',
  'android/app/src/main/assets/public/index.html',
  'android/capacitor-cordova-android-plugins/cordova.variables.gradle',
  'android/app/src/main/res/values/colors.xml'
];

const fail = [];
for (const rel of required) {
  if (!fs.existsSync(path.join(root, rel))) fail.push(`Missing: ${rel}`);
}

const jsFiles = fs.readdirSync(path.join(root, 'www/js'))
  .filter(name => name.endsWith('.js'))
  .map(name => path.join(root, 'www/js', name));
for (const file of jsFiles) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) fail.push(`JavaScript syntax error: ${path.relative(root, file)}\n${result.stderr}`);
}

const chatHtml = fs.readFileSync(path.join(root, 'www/index.html'), 'utf8');
for (const id of ['chatToolsPanel', 'chatSearchBar', 'savedMessagesModal', 'savedMessagesList']) {
  if (!chatHtml.includes(`id="${id}"`)) fail.push(`Missing private-chat feature element: ${id}`);
}
if (!chatHtml.includes('id="sectionInbox"')) fail.push('Missing unified inbox section');
if (/class="nav-btn[^\"]*"[^>]*data-section="reviews"/.test(chatHtml)) fail.push('Posts section is still exposed in the bottom navigation');
const legacyApi = fs.readFileSync(path.resolve(root, '../backend/server/legacyApi.ts'), 'utf8');
if (!legacyApi.includes('/api/legacy/inbox/conversations')) fail.push('Missing read-only inbox conversations API');
const chatLogic = fs.readFileSync(path.join(root, 'www/js/app.js'), 'utf8');
for (const key of ['dardshti_private_pinned_chats', 'dardshti_saved_messages', 'searchChatMessages', 'saveCurrentMessage']) {
  if (!chatLogic.includes(key)) fail.push(`Missing private-chat feature logic: ${key}`);
}

for (const rel of ['index.html', 'js/app.js', 'js/backend-client.js', 'js/enhancements.js', 'js/shared-content.js', 'js/chat-features.js', 'js/inbox.js', 'js/channels.js', 'js/souq.js', 'js/souq-admin.js', 'css/style.css', 'css/premium.css']) {
  const a = path.join(root, 'www', rel);
  const b = path.join(root, 'android/app/src/main/assets/public', rel);
  if (fs.existsSync(a) && fs.existsSync(b)) {
    const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    if (hash(a) !== hash(b)) fail.push(`Android asset out of sync: ${rel}`);
  }
}

if (fail.length) {
  console.error(fail.join('\n'));
  process.exit(1);
}
console.log(`Project checks passed (${jsFiles.length} JavaScript files, assets synchronized).`);
