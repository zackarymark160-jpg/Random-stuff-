/* Student Voice Admin. Plain JS, no build step. */
(function () {
'use strict';
var $ = function (s, r) { return (r || document).querySelector(s); };
var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function h(tag, attrs, kids) {
  var e = document.createElement(tag);
  for (var k in (attrs || {})) { var v = attrs[k]; if (v == null || v === false) continue;
    if (k === 'text') e.textContent = v; else if (k === 'html') e.innerHTML = v; else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? '' : v); }
  (kids || []).forEach(function (c) { if (c != null) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
  return e;
}
function toast(msg) { var t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(t._t); t._t = setTimeout(function () { t.classList.remove('on'); }, 2600); }
function today() { return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }); }
function fdate(d) { if (!d) return ''; var x = new Date(d.length === 10 ? d + 'T12:00:00' : d); return isNaN(x) ? d : x.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
function ftime(d) { var x = new Date(d); return isNaN(x) ? '' : x.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); }
function daysSince(d) { return Math.floor((Date.now() - Date.parse(d.length === 10 ? d + 'T12:00:00' : d)) / 864e5); }
function slug(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40); }
function download(name, text, type) { var a = h('a', { href: URL.createObjectURL(new Blob([text], { type: type || 'text/plain' })), download: name }); document.body.appendChild(a); a.click(); a.remove(); }
function copy(text) { (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(function () { toast('Copied'); }, function () { prompt('Copy this:', text); }); }
function csv(rows) { var cols = []; rows.forEach(function (r) { Object.keys(r).forEach(function (k) { if (cols.indexOf(k) < 0) cols.push(k); }); });
  var q = function (v) { return '"' + String(v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : v).replace(/"/g, '""') + '"'; };
  return [cols.map(q).join(',')].concat(rows.map(function (r) { return cols.map(function (c) { return q(r[c]); }).join(','); })).join('\n'); }

/* ---------------- API ---------------- */
function api(path, opts) {
  opts = opts || {};
  var init = { method: opts.method || 'GET', credentials: 'same-origin', headers: { 'x-sv': '1' } };
  if (opts.body !== undefined) { init.headers['content-type'] = 'application/json'; init.body = JSON.stringify(opts.body); }
  return fetch(path, init).then(function (r) {
    if (r.status === 401 && path !== '/api/login' && path !== '/api/google') { showLogin('You were logged out. Log in again.'); throw new Error('logged out'); }
    return r.json().catch(function () { return {}; }).then(function (d) { if (!r.ok) { var e = new Error(d.error || ('Error ' + r.status)); e.data = d; throw e; } return d; });
  });
}
var cache = {};
function col(name, fresh) { if (!fresh && cache[name]) return Promise.resolve(cache[name]); return api('/api/c/' + name).then(function (d) { cache[name] = d; return d; }); }
var ME = null, SETTINGS = null;
var isOwner = function () { return ME && ME.role === 'owner'; };
var canEdit = function () { return ME && ME.role !== 'viewer'; };

/* ---------------- what each list holds ---------------- */
var ST = ['status'];
var SCHEMAS = {
  updates: { label: 'Updates', pub: true, title: 'title', date: 'date', help: 'Shows under "Latest quick updates" on the Updates tab, and in the RSS feed and lite page.',
    fields: [['title', 'Title'], ['title_es', 'Title (Spanish)', 'text', 'es'], ['date', 'Date', 'date'], ['category', 'Topic', 'select', ['Weighted grades', 'Student council', 'Board meetings', 'Phones', 'Safety', 'Budget', 'General']], ['body', 'Text', 'textarea'], ['simple', 'Simple version (shows with "Explain it simply")', 'textarea'], ['forYou', 'What this means for you (one line)'], ['body_es', 'Text (Spanish)', 'textarea', 'es'], ['image', 'Image', 'image'], ['imageAlt', 'Image description (for screen readers)'], ['source', 'Source (link or section id)'], ['related', 'Related section id (like vp-track)'], ['correction', 'Correction note (if you changed this after posting)'], ['pinned', 'Pin to the top', 'check']] },
  homecards: { label: 'Home cards', pub: true, title: 'heading', help: 'Replaces the heading or text on one of the 3 Home cards. Leave a field blank to keep what\'s there.',
    fields: [['card', 'Which card', 'select', ['now', 'ask', 'dates']], ['heading', 'Heading'], ['text', 'Text', 'textarea'], ['text_es', 'Text (Spanish, for your records)', 'textarea', 'es']] },
  dates: { label: 'Calendar', pub: true, title: 'title', date: 'date', help: 'Adds to Upcoming dates on Home and to the calendar feed. Past dates drop off by themselves.',
    fields: [['title', 'What'], ['title_es', 'What (Spanish)', 'text', 'es'], ['date', 'Date', 'date'], ['time', 'Time'], ['place', 'Place'], ['note', 'Note', 'textarea']] },
  promises: { label: 'You Said, We Did', pub: true, title: 'title', date: 'due', help: 'Status changes show at the top of the You Said, We Did tab. Due dates feed the deadline alerts.',
    fields: [['title', 'Promise'], ['state', 'Status', 'select', ['asked', 'in progress', 'done', 'stuck']], ['owner', 'Who owns it'], ['due', 'Due date', 'date'], ['note', 'Note', 'textarea']] },
  answers: { label: 'District answers', pub: true, title: 'question', date: 'date', help: 'Paste the district\'s reply exactly as written. It shows in Ask the District.',
    fields: [['question', 'Question'], ['answer', 'Answer, word for word', 'textarea'], ['who', 'Who answered (name and role)'], ['date', 'Date answered', 'date']] },
  banner: { label: 'Banner', pub: true, title: 'title', help: 'A one-line banner above the tabs. Pick "urgent" for a red one. Set "Stop showing" so it disappears on its own.',
    fields: [['title', 'Bold part'], ['body', 'Rest of the line'], ['level', 'Type', 'select', ['news', 'urgent']], ['link', 'Link (a full URL, or a section id like updates)']] },
  dyk: { label: 'Did you know', pub: true, title: 'text', help: 'One random fact shows on Home each visit.',
    fields: [['text', 'Fact', 'textarea'], ['text_es', 'Fact (Spanish)', 'textarea', 'es'], ['link', 'Source section id (like numbers)']] },
  faq: { label: 'FAQ and myths', pub: true, title: 'q', help: 'Adds to the myths vs. facts list on Learn.',
    fields: [['q', 'Question or myth'], ['a', 'Answer or fact', 'textarea'], ['q_es', 'Question (Spanish)', 'text', 'es'], ['a_es', 'Answer (Spanish)', 'textarea', 'es']] },
  pubq: { label: 'Public questions', pub: true, title: 'question', date: 'sent', help: 'Questions shown on the public question board, with upvotes and status. Check them for names before publishing.',
    fields: [['question', 'Question'], ['topic', 'Topic', 'select', ['weighted grades', 'phones', 'safety', 'schedules', 'council', 'lunch & buildings', 'other']], ['route', 'Who answers', 'select', ['School Board', 'District staff']], ['qstatus', 'Question status', 'select', ['sent', 'waiting', 'answered']], ['sent', 'Date sent', 'date'], ['answeredOn', 'Date answered', 'date'], ['answer', 'Answer, word for word', 'textarea'], ['who', 'Who answered'], ['qotw', 'Question of the week', 'check']] },
  boardmtg: { label: 'Board meetings', pub: true, title: 'title', date: 'date', help: 'Previews show as "Next meeting, in plain words." Recaps show in Meeting recaps. Fill "What the Board did" to add a row to the student-issues table.',
    fields: [['date', 'Meeting date', 'date'], ['kind', 'Type', 'select', ['preview', 'recap']], ['title', 'Title'], ['items', 'Preview: 3 things that matter (one per line)', 'textarea'], ['summary', 'Recap: plain summary', 'textarea'], ['vote', 'What the Board did on a student issue (optional)'], ['timestamps', 'Recording timestamps for student items'], ['link', 'Agenda link', 'url'], ['recording', 'Recording link', 'url'], ['minutes', 'Minutes link', 'url']] },
  weekly: { label: 'Weekly line', pub: true, title: 'text', date: 'week', help: 'One line at the top of Home. The newest one shows.', fields: [['week', 'Week of', 'date'], ['text', 'This week…']] },
  squotes: { label: 'Student quotes', pub: true, title: 'quote', help: 'Rotates weekly on Home. Only quotes marked as consented show. Never put a student name in "Who".', fields: [['quote', 'Quote', 'textarea'], ['who', 'Who (like "A junior" or "A parent", no names)'], ['consent', 'They said yes to posting it', 'check']] },
  changelog: { label: 'Changelog', pub: true, title: 'title', date: 'date', help: 'Publishing anything adds a line here by itself. You can add your own too.',
    fields: [['date', 'Date', 'date'], ['title', 'What changed'], ['body', 'Details']] },

  questions: { label: 'Question tracker', title: 'title', date: 'sent', help: 'Every question you send the district. Anything waiting 7+ days shows up on Today.',
    fields: [['title', 'Question'], ['to', 'Sent to (name, role)'], ['sent', 'Date sent', 'date'], ['status', 'Status', 'select', ['draft', 'sent', 'waiting', 'answered']], ['answeredOn', 'Date answered', 'date'], ['answer', 'Their answer, word for word', 'textarea'], ['note', 'Notes', 'textarea']] },
  emails: { label: 'Email log', title: 'subject', date: 'date', fields: [['subject', 'Subject'], ['with', 'With'], ['date', 'Date', 'date'], ['summary', 'Short summary', 'textarea'], ['text', 'Full email text', 'textarea']] },
  meetings: { label: 'Meeting log', title: 'title', date: 'date', fields: [['title', 'Meeting'], ['with', 'With'], ['date', 'Date', 'date'], ['notes', 'What was said', 'textarea'], ['next', 'Next steps', 'textarea']] },
  quotes: { label: 'Quote library', title: 'quote', date: 'date', help: 'Word-for-word quotes, ready for reports.', fields: [['quote', 'Quote', 'textarea'], ['who', 'Who'], ['role', 'Role'], ['date', 'Date', 'date'], ['source', 'Source (email, meeting, document)']] },
  agenda: { label: 'Board agenda watch', title: 'item', date: 'meeting', fields: [['item', 'Agenda item'], ['meeting', 'Meeting date', 'date'], ['why', 'Why it matters', 'textarea'], ['status', 'Status', 'select', ['watch', 'spoke', 'done']]] },
  records: { label: 'Records requests', title: 'request', date: 'sent', help: 'Wisconsin agencies should answer "as soon as practicable and without delay." Use the due date as your own follow-up date.',
    fields: [['request', 'What you asked for'], ['to', 'Sent to'], ['sent', 'Date sent', 'date'], ['due', 'Follow up by', 'date'], ['status', 'Status', 'select', ['open', 'received', 'denied']], ['note', 'Notes', 'textarea']] },
  contacts: { label: 'Staff contacts', title: 'name', help: 'Staff names, roles and emails. No phone numbers. Names here are also skipped by the student-name check.',
    fields: [['name', 'Name'], ['role', 'Role'], ['email', 'Email', 'email'], ['office', 'School or office'], ['note', 'Note', 'textarea']] },
  roster: { label: 'Council roster', title: 'name', help: 'Private. Never published.', fields: [['name', 'Name'], ['school', 'School'], ['role', 'Role'], ['email', 'Email', 'email']] },
  mtgnotes: { label: 'Team meeting notes', title: 'title', date: 'date', fields: [['title', 'Meeting'], ['date', 'Date', 'date'], ['attendees', 'Who came'], ['agenda', 'Agenda', 'textarea'], ['notes', 'Notes', 'textarea'], ['actions', 'Action items', 'textarea']] },
  hours: { label: 'Volunteer hours', title: 'name', date: 'date', fields: [['name', 'Name'], ['date', 'Date', 'date'], ['hours', 'Hours', 'number'], ['what', 'What they did'], ['approved', 'Approved', 'check']] },
  tasks: { label: 'Tasks', title: 'title', date: 'due', fields: [['title', 'Task'], ['who', 'Who'], ['due', 'Due', 'date'], ['status', 'Status', 'select', ['todo', 'doing', 'done']]] },
  adopt: { label: 'Adopt-a-topic', title: 'topic', fields: [['topic', 'Topic'], ['who', 'Who has it'], ['note', 'Note', 'textarea']] },
  partners: { label: 'Partners', title: 'name', fields: [['name', 'Business or group'], ['kind', 'Type'], ['contact', 'Contact email'], ['helped', 'How they helped', 'textarea']] },
  subscribers: { label: 'Subscribers', title: 'email', help: 'People who asked for updates. Only add people who said yes.', fields: [['email', 'Email', 'email'], ['name', 'Name'], ['lang', 'Language', 'select', ['English', 'Spanish', 'Hmong']], ['consent', 'They asked to get updates', 'check'], ['source', 'Where they signed up']] },
  igposts: { label: 'Instagram planner', title: 'caption', date: 'date', fields: [['date', 'Post date', 'date'], ['kind', 'Type', 'select', ['post', 'reel', 'story']], ['status', 'Status', 'select', ['idea', 'ready', 'posted']], ['caption', 'Caption', 'textarea'], ['link', 'Link after posting']] },
  press: { label: 'Press list', title: 'outlet', fields: [['outlet', 'Outlet'], ['name', 'Reporter'], ['email', 'Email', 'email'], ['beat', 'Beat'], ['note', 'Note', 'textarea']] },
  translations: { label: 'Translation queue', title: 'what', fields: [['what', 'What needs translating'], ['lang', 'Language', 'select', ['Spanish', 'Hmong']], ['status', 'Status', 'select', ['needed', 'in progress', 'done']], ['who', 'Who is doing it']] },
  notes: { label: 'Notes pad', title: 'title', help: 'Private scratch notes.', fields: [['title', 'Title'], ['text', 'Notes', 'textarea']] },
  qrlinks: { label: 'QR links', title: 'label', fields: [['label', 'Label'], ['target', 'Link'], ['src', 'Tracking name']] },
};

var NAV = [
  ['', [['today', 'Today'], ['inbox', 'Inbox'], ['search', 'Search']]],
  ['Site content', [['c/updates', 'Updates'], ['c/homecards', 'Home cards'], ['c/dates', 'Calendar'], ['c/promises', 'You Said, We Did'], ['c/answers', 'District answers'], ['c/banner', 'Banner'], ['c/dyk', 'Did you know'], ['c/faq', 'FAQ and myths'], ['c/pubq', 'Public questions'], ['c/boardmtg', 'Board meetings'], ['c/weekly', 'Weekly line'], ['c/squotes', 'Student quotes'], ['c/changelog', 'Changelog']]],
  ['Publishing', [['publish', 'Checks and tools']]],
  ['Numbers', [['stats', 'Stats'], ['report', 'Monthly report']]],
  ['District', [['c/questions', 'Question tracker'], ['c/emails', 'Email log'], ['c/meetings', 'Meeting log'], ['c/quotes', 'Quote library'], ['c/agenda', 'Board agenda'], ['c/records', 'Records requests'], ['c/contacts', 'Staff contacts'], ['files', 'Evidence files'], ['timeline', 'Timeline']]],
  ['Team', [['team', 'Admins and roles'], ['log', 'Activity log'], ['c/roster', 'Council roster'], ['c/mtgnotes', 'Meeting notes'], ['c/hours', 'Volunteer hours'], ['tasks', 'Task board'], ['c/adopt', 'Adopt-a-topic'], ['c/partners', 'Partners'], ['signups', 'Sign-up approvals']]],
  ['Get the word out', [['newsletter', 'Newsletter builder'], ['c/subscribers', 'Subscribers'], ['c/igposts', 'Instagram planner'], ['caption', 'Caption writer'], ['qr', 'QR codes'], ['flyer', 'Flyer maker'], ['share', 'Share images'], ['c/press', 'Press list'], ['c/translations', 'Translations']]],
  ['Safety', [['safety', 'Safety settings'], ['reports', 'Problem reports']]],
  ['You', [['c/notes', 'Notes pad'], ['settings', 'Settings'], ['handoff', 'Handoff guide'], ['keys', 'Shortcuts']]],
];

/* ---------------- shell ---------------- */
function buildNav(badges) {
  var side = $('#side'); side.innerHTML = '';
  NAV.forEach(function (g) {
    if (g[0]) side.appendChild(h('h4', { text: g[0] }));
    g[1].forEach(function (r) {
      if (r[0] === 'team' && !isOwner()) return;
      var b = badges && badges[r[0]];
      side.appendChild(h('a', { href: '#' + r[0], 'data-r': r[0] }, [r[1], b ? h('span', { class: 'badge', text: b }) : null]));
    });
  });
  markNav();
}
function markNav() { var r = location.hash.slice(1).split('?')[0] || 'today'; $$('#side a').forEach(function (a) { a.toggleAttribute('aria-current', a.getAttribute('data-r') === r); if (a.getAttribute('data-r') === r) a.setAttribute('aria-current', 'page'); }); }
$('#menubtn').addEventListener('click', function () { var o = $('#side').classList.toggle('open'); this.setAttribute('aria-expanded', o); });
$('#side').addEventListener('click', function (e) { if (e.target.closest('a')) { $('#side').classList.remove('open'); $('#menubtn').setAttribute('aria-expanded', 'false'); } });
$('#themebtn').addEventListener('click', function () { var r = document.documentElement, d = r.getAttribute('data-theme') === 'dark' || (!r.getAttribute('data-theme') && matchMedia('(prefers-color-scheme: dark)').matches); r.setAttribute('data-theme', d ? 'light' : 'dark'); try { localStorage.setItem('sva-theme', d ? 'light' : 'dark'); } catch (e) {} });
try { var th = localStorage.getItem('sva-theme'); if (th) document.documentElement.setAttribute('data-theme', th); } catch (e) {}
$('#logoutbtn').addEventListener('click', function () { api('/api/logout', { method: 'POST' }).finally(function () { try { localStorage.removeItem('sv-admin'); } catch (e) {} showLogin('Logged out.'); }); });
$('#searchbtn').addEventListener('click', function () { location.hash = '#search'; });

function modal(title, body, onclose) {
  $('#mtitle').textContent = title; var mb = $('#mbody'); mb.innerHTML = ''; mb.appendChild(body);
  $('#modal').hidden = false; $('#modal')._close = onclose;
  var f = mb.querySelector('input,textarea,select,button'); if (f) f.focus();
}
function closeModal() { $('#modal').hidden = true; if ($('#modal')._close) $('#modal')._close(); }
$('#modal').addEventListener('click', function (e) { if (e.target === this) closeModal(); });

/* ---------------- login ---------------- */
var gReady = false;
function showLogin(msg) {
  $('#app').hidden = true; $('#login').hidden = false; ME = null;
  if (msg) $('#lmsg').textContent = msg;
  if (/e=expired/.test(location.search)) $('#lerr').textContent = 'That login link expired or was already used.';
  api('/api/config').then(function (c) {
    if (!c.ready) $('#lerr').textContent = 'The admin password isn\'t set up on Netlify yet.';
    $('#magicform').hidden = !c.magic;
    if (c.google && !gReady) {
      gReady = true;
      var s = h('script', { src: 'https://accounts.google.com/gsi/client', async: true });
      s.onload = function () {
        google.accounts.id.initialize({ client_id: c.google, callback: function (r) { api('/api/google', { method: 'POST', body: { credential: r.credential } }).then(loggedIn, function (e) { $('#lerr').textContent = e.message; }); } });
        google.accounts.id.renderButton($('#gbtn'), { theme: 'outline', size: 'large', text: 'signin_with', shape: 'pill' });
        $('#gbox').hidden = false;
      };
      document.head.appendChild(s);
    }
  }).catch(function () {});
  setTimeout(function () { $('#lpw').focus(); }, 50);
}
$('#pwform').addEventListener('submit', function (e) {
  e.preventDefault(); $('#lerr').textContent = '';
  api('/api/login', { method: 'POST', body: { email: $('#lemail').value, password: $('#lpw').value } }).then(loggedIn, function (er) { $('#lerr').textContent = er.message; $('#lpw').select(); });
});
$('#magicform').addEventListener('submit', function (e) {
  e.preventDefault();
  api('/api/magic', { method: 'POST', body: { email: $('#memail').value } }).then(function (d) { $('#lerr').textContent = ''; $('#lmsg').textContent = d.message; });
});
function loggedIn(d) {
  ME = d.user; $('#lpw').value = '';
  try { localStorage.setItem('sv-admin', '1'); } catch (e) {}
  if (location.search) history.replaceState(null, '', '/admin/' + location.hash);
  $('#login').hidden = true; $('#app').hidden = false;
  api('/api/settings').then(function (s) { SETTINGS = s; });
  buildNav(); route(); refreshBadges();
}
/* idle logout after 30 minutes with no activity */
var lastAct = Date.now();
['click', 'keydown', 'touchstart', 'scroll'].forEach(function (ev) { document.addEventListener(ev, function () { lastAct = Date.now(); }, { passive: true }); });
setInterval(function () { if (ME && Date.now() - lastAct > 30 * 60 * 1000) { api('/api/logout', { method: 'POST' }).catch(function () {}); showLogin('Logged out after 30 minutes of no activity.'); } }, 30000);

/* ---------------- router ---------------- */
var VIEWS = {};
function route() {
  if (!ME) return;
  var full = location.hash.slice(1) || 'today', r = full.split('?')[0], q = new URLSearchParams(full.split('?')[1] || '');
  markNav();
  var main = $('#main'); main.innerHTML = '';
  var fn = r.indexOf('c/') === 0 ? function (m) { return listView(m, r.slice(2), q); } : VIEWS[r];
  if (!fn) { main.appendChild(h('p', { text: 'Not found.' })); return; }
  try { fn(main, q); } catch (e) { main.appendChild(h('p', { class: 'err', text: e.message })); }
  main.focus({ preventScroll: true }); window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);
function title(main, t, sub, actions) {
  main.appendChild(h('div', { class: 'row', style: 'justify-content:space-between;margin-bottom:8px' }, [h('h1', { text: t }), actions ? h('div', { class: 'row' }, actions) : null]));
  if (sub) main.appendChild(h('p', { class: 'sub', text: sub, style: 'margin:-4px 0 16px' }));
}
function fail(main) { return function (e) { if (e.message !== 'logged out') main.appendChild(h('p', { class: 'err', text: e.message })); }; }

var INBOX = null;
function inbox(fresh) { if (INBOX && !fresh) return Promise.resolve(INBOX); return api('/api/inbox').then(function (d) { INBOX = d; return d; }); }
function refreshBadges() {
  inbox(true).then(function (list) {
    var n = list.filter(function (s) { return s.status === 'new' && !s.spam; }).length;
    var su = list.filter(function (s) { return /^(team|hours)$/.test(s.form) && !s.approved && !s.spam && s.status !== 'answered'; }).length;
    var rep = list.filter(function (s) { return s.form === 'report' && s.status === 'new'; }).length;
    buildNav({ inbox: n || '', signups: su || '', reports: rep || '' });
  }).catch(function () {});
}

/* ---------------- Today ---------------- */
VIEWS.today = function (main) {
  title(main, 'Today', new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }));
  var cards = h('div', { class: 'cards' }); main.appendChild(cards);
  var lists = h('div', { class: 'grid2' }); main.appendChild(lists);
  Promise.all([inbox(true), col('questions', true), col('promises', true), col('tasks', true), col('dates', true), col('records', true), col('agenda', true)]).then(function (r) {
    var subs = r[0], qs = r[1], pr = r[2], tasks = r[3], dates = r[4], rec = r[5], ag = r[6];
    var fresh = subs.filter(function (s) { return s.status === 'new' && !s.spam; });
    var flagged = subs.filter(function (s) { return s.flag && s.status !== 'answered' && !s.spam; });
    var overdue = qs.filter(function (q) { return q.status !== 'answered' && q.status !== 'draft' && q.sent && daysSince(q.sent) >= 7; });
    var lateP = pr.filter(function (p) { return p.due && p.state !== 'done' && daysSince(p.due) >= -14; });
    var openT = tasks.filter(function (t) { return t.status !== 'done'; });
    if (flagged.length) cards.appendChild(h('a', { class: 'card alert', href: '#inbox?flag=1', style: 'text-decoration:none' }, [h('b', { text: flagged.length, style: 'font-family:var(--display);font-size:2.2rem;display:block' }), 'safety-flagged message' + (flagged.length > 1 ? 's' : '')]));
    [[fresh.length, 'new messages', '#inbox'], [overdue.length, 'waiting 7+ days on the district', '#c/questions'], [lateP.length, 'promise deadlines due or late', '#c/promises'], [openT.length, 'open tasks', '#tasks']].forEach(function (c) {
      cards.appendChild(h('a', { class: 'card stat' + (c[0] && c[2] !== '#tasks' ? ' warn' : ''), href: c[2], style: 'text-decoration:none' }, [h('b', { text: c[0] }), c[1]]));
    });
    function box(t, items, fn) { var p = h('div', { class: 'panel' }, [h('h3', { text: t })]); var ul = h('ul', { class: 'list' }); if (!items.length) ul.appendChild(h('li', { class: 'sub', text: 'Nothing here.' })); items.slice(0, 6).forEach(function (i) { ul.appendChild(fn(i)); }); p.appendChild(ul); lists.appendChild(p); }
    box('Follow up with the district', overdue.sort(function (a, b) { return a.sent > b.sent ? 1 : -1; }), function (q) { return h('li', {}, [h('b', { text: daysSince(q.sent) + ' days: ' }), q.title + (q.to ? ' (' + q.to + ')' : '')]); });
    box('Promise deadlines', lateP, function (p) { var d = daysSince(p.due); return h('li', {}, [h('span', { class: 'pill ' + (d > 0 ? 'late' : 'scheduled'), text: d > 0 ? d + ' days late' : 'due ' + fdate(p.due) }), p.title]); });
    box('Next dates', dates.filter(function (d) { return d.date >= today(); }).sort(function (a, b) { return a.date > b.date ? 1 : -1; }).concat(ag.filter(function (a) { return a.meeting >= today() && a.status === 'watch'; }).map(function (a) { return { date: a.meeting, title: 'Board: ' + a.item }; })), function (d) { return h('li', {}, [h('b', { text: fdate(d.date) + ' ' }), d.title]); });
    box('Records requests to chase', rec.filter(function (x) { return x.status === 'open' && x.due && x.due <= today(); }), function (x) { return h('li', { text: x.request + ' (follow up was ' + fdate(x.due) + ')' }); });
    box('Open tasks', openT.sort(function (a, b) { return (a.due || 'z') > (b.due || 'z') ? 1 : -1; }), function (t) { return h('li', {}, [t.title, h('span', { class: 'sub', text: (t.who ? ' · ' + t.who : '') + (t.due ? ' · ' + fdate(t.due) : '') })]); });
    box('Newest messages', fresh, function (s) { return h('li', {}, [h('a', { href: '#inbox?key=' + encodeURIComponent(s.key), text: (s.form + ': ') }), firstText(s).slice(0, 80)]); });
  }).catch(fail(main));
};
function firstText(s) { var d = s.data || {}; return d.question || d.message || d.thought || d.text || d.comment || Object.values(d).filter(function (v) { return String(v).length > 12; })[0] || Object.values(d).join(' · '); }

/* ---------------- Inbox ---------------- */
var TOPICS = ['weighted grades', 'phones', 'safety', 'schedules', 'council', 'lunch & buildings', 'other'];
VIEWS.inbox = function (main, q) { inboxView(main, q, null); };
VIEWS.reports = function (main, q) { inboxView(main, q, 'report'); };
VIEWS.signups = function (main, q) { inboxView(main, q, 'signup'); };
function inboxView(main, q, mode) {
  title(main, mode === 'report' ? 'Problem reports' : mode === 'signup' ? 'Sign-up approvals' : 'Inbox',
    mode === 'report' ? 'Things people flagged on the site.' : mode === 'signup' ? 'People who asked to join the team or logged volunteer hours. Approve or decline.' : 'Everything sent through the site\'s forms.',
    mode ? null : [h('button', { class: 'btn small', text: 'Export to spreadsheet', onclick: function () { inbox().then(function (l) { download('inbox-' + today() + '.csv', csv(l.map(function (s) { return Object.assign({ date: s.created, form: s.form, status: s.status, topic: s.tag, spam: s.spam, flag: s.flag }, s.data, { notes: s.notes }); })), 'text/csv'); }); } }),
      isOwner() ? h('button', { class: 'btn small', text: 'Import older messages', onclick: function () { this.disabled = true; var b = this; api('/api/inbox/import', { method: 'POST', body: {} }).then(function (d) { toast('Imported ' + d.added); INBOX = null; route(); }, function (e) { toast(e.message); b.disabled = false; }); } }) : null]);
  var crisis = h('div', { class: 'crisis', text: (SETTINGS && SETTINGS.crisis) || '' });
  var tb = h('div', { class: 'toolbar noprint' });
  var fForm = h('select', { 'aria-label': 'Form' }), fStatus = h('select', { 'aria-label': 'Status' }, ['all', 'new', 'read', 'answered'].map(function (s) { return h('option', { value: s, text: s === 'all' ? 'Any status' : s }); }));
  var fTag = h('select', { 'aria-label': 'Topic' }, [h('option', { value: '', text: 'Any topic' })].concat(TOPICS.map(function (t) { return h('option', { value: t, text: t }); })));
  var fBox = h('select', { 'aria-label': 'Folder' }, [['main', 'Inbox'], ['flag', 'Safety flags'], ['held', 'Held by blocked words'], ['spam', 'Spam']].map(function (o) { return h('option', { value: o[0], text: o[1] }); }));
  var fText = h('input', { type: 'search', placeholder: 'Search messages', 'aria-label': 'Search messages' });
  if (q.get('flag')) fBox.value = 'flag';
  if (!mode) [fForm, fStatus, fTag, fBox, fText].forEach(function (x) { tb.appendChild(x); }); else tb.appendChild(fText);
  main.appendChild(tb);
  var listEl = h('ul', { class: 'list' }); main.appendChild(listEl);
  inbox(true).then(function (all) {
    var forms = [...new Set(all.map(function (s) { return s.form; }))].sort();
    fForm.appendChild(h('option', { value: '', text: 'All forms' })); forms.forEach(function (f) { fForm.appendChild(h('option', { value: f, text: f })); });
    function draw() {
      var t = fText.value.toLowerCase();
      var rows = all.filter(function (s) {
        if (mode === 'report') return s.form === 'report' && (!t || JSON.stringify(s.data).toLowerCase().indexOf(t) >= 0);
        if (mode === 'signup') return /^(team|hours)$/.test(s.form) && !s.spam && (!t || JSON.stringify(s.data).toLowerCase().indexOf(t) >= 0);
        var box = fBox.value;
        if (box === 'spam' ? !s.spam : s.spam) return false;
        if (box === 'flag' && !s.flag) return false;
        if (box === 'held' && !s.held) return false;
        if (fForm.value && s.form !== fForm.value) return false;
        if (fStatus.value !== 'all' && s.status !== fStatus.value) return false;
        if (fTag.value && s.tag !== fTag.value) return false;
        return !t || JSON.stringify(s.data).toLowerCase().indexOf(t) >= 0 || (s.notes || '').toLowerCase().indexOf(t) >= 0;
      });
      listEl.innerHTML = '';
      crisis.remove(); if (rows.some(function (s) { return s.flag; })) main.insertBefore(crisis, tb);
      if (!rows.length) listEl.appendChild(h('li', { class: 'sub', text: all.length ? 'Nothing matches.' : 'No messages yet. New form submissions show up here by themselves.' }));
      rows.forEach(function (s) {
        listEl.appendChild(h('li', { class: 'item', tabindex: 0, onclick: function () { openSub(s, draw); }, onkeydown: function (e) { if (e.key === 'Enter') openSub(s, draw); } }, [
          h('div', { class: 'grow' }, [
            h('div', {}, [h('span', { class: 'pill ' + s.status, text: s.status }), s.flag ? h('span', { class: 'pill flag', text: 'safety' }) : null, s.held ? h('span', { class: 'pill held', text: 'held' }) : null, s.approved ? h('span', { class: 'pill approved', text: 'approved' }) : null, h('span', { class: 'pill', text: s.tag || 'other' })]),
            h('div', { class: 'title', text: firstText(s).slice(0, 140) || '(empty)' }),
            h('div', { class: 'meta', text: s.form + ' · ' + ftime(s.created) })])]));
      });
    }
    [fForm, fStatus, fTag, fBox].forEach(function (x) { x.addEventListener('change', draw); }); fText.addEventListener('input', draw);
    draw();
    var k = q.get('key'); if (k) { var s = all.find(function (x) { return x.key === k; }); if (s) openSub(s, draw); }
  }).catch(fail(main));
}
function patchSub(s, fields) { return api('/api/inbox', { method: 'PATCH', body: Object.assign({ key: s.key }, fields) }).then(function (r) { Object.assign(s, r); refreshBadges(); return r; }); }
function openSub(s, redraw) {
  if (s.status === 'new' && canEdit()) patchSub(s, { status: 'read' }).then(redraw);
  var b = h('div', { class: 'editor' });
  if (s.flag) b.appendChild(h('div', { class: 'crisis', text: (SETTINGS && SETTINGS.crisis) || '' }));
  var dl = h('dl', { class: 'kv' }); Object.keys(s.data || {}).forEach(function (k) { dl.appendChild(h('dt', { text: k })); dl.appendChild(h('dd', { text: s.data[k] })); });
  b.appendChild(h('p', { class: 'sub', text: s.form + ' form · ' + ftime(s.created) + (s.suggested && s.suggested !== s.tag ? ' · suggested topic: ' + s.suggested : '') }));
  b.appendChild(dl);
  if (s.data && s.data.audio) b.appendChild(h('audio', { controls: true, src: '/api/files/' + encodeURIComponent(s.data.audio), style: 'width:100%' }));
  var tag = h('select', {}, TOPICS.map(function (t) { return h('option', { value: t, text: t, selected: t === s.tag }); }));
  var notes = h('textarea', { text: s.notes || '', placeholder: 'Private notes' }); notes.value = s.notes || '';
  b.appendChild(h('div', { class: 'grid2' }, [h('label', {}, ['Topic (auto-suggested: ' + (s.suggested || 'other') + ')', tag]), h('label', {}, ['Notes', notes])]));
  var email = (s.data || {}).email || (s.data || {}).Email;
  var reply = h('textarea', { placeholder: 'Reply' });
  var tmpl = h('select', { 'aria-label': 'Reply template' }, [h('option', { value: '', text: 'Use a reply template…' })].concat(((SETTINGS && SETTINGS.replyTemplates) || []).map(function (t, i) { return h('option', { value: i, text: t.slice(0, 70) }); })));
  tmpl.addEventListener('change', function () { if (tmpl.value !== '') reply.value = SETTINGS.replyTemplates[+tmpl.value].replace('[date]', fdate(today())); });
  b.appendChild(h('div', { class: 'panel' }, [h('h3', { text: email ? 'Reply to ' + email : 'Reply (no email given, so copy it to wherever you answer)' }), tmpl, reply,
    h('div', { class: 'row' }, [email ? h('button', { class: 'btn primary', text: 'Send email', onclick: function () { api('/api/inbox/reply', { method: 'POST', body: { key: s.key, text: reply.value } }).then(function () { toast('Sent'); s.status = 'answered'; redraw(); closeModal(); }, function (e) { toast(e.message); }); } }) : null,
      h('button', { class: 'btn', text: 'Copy reply', onclick: function () { copy(reply.value); } })])]));
  var acts = h('div', { class: 'row' });
  if (canEdit()) {
    acts.appendChild(h('button', { class: 'btn primary', text: 'Save', onclick: function () { patchSub(s, { tag: tag.value, notes: notes.value }).then(function () { toast('Saved'); redraw(); closeModal(); }); } }));
    ['new', 'read', 'answered'].forEach(function (st) { acts.appendChild(h('button', { class: 'btn small', text: 'Mark ' + st, onclick: function () { patchSub(s, { status: st, tag: tag.value, notes: notes.value }).then(function () { redraw(); closeModal(); }); } })); });
    acts.appendChild(h('button', { class: 'btn small', text: s.spam ? 'Not spam' : 'Spam', onclick: function () { patchSub(s, { spam: !s.spam }).then(function () { redraw(); closeModal(); }); } }));
    acts.appendChild(h('button', { class: 'btn small', text: s.flag ? 'Clear safety flag' : 'Safety flag', onclick: function () { patchSub(s, { flag: !s.flag }).then(function () { redraw(); closeModal(); }); } }));
    if (s.held) acts.appendChild(h('button', { class: 'btn small', text: 'Release hold', onclick: function () { patchSub(s, { held: false }).then(function () { redraw(); closeModal(); }); } }));
    if (/^(team|hours)$/.test(s.form)) {
      acts.appendChild(h('button', { class: 'btn hot small', text: s.approved ? 'Approved ✓' : 'Approve', onclick: function () {
        patchSub(s, { approved: true, status: 'answered' }).then(function () {
          if (s.form === 'hours') { var d = s.data; api('/api/c/hours', { method: 'POST', body: { name: d.name || d.Name || '', date: d.date || today(), hours: d.hours || d.Hours || '', what: d.what || d.activity || d.description || '', approved: true } }); }
          if (s.form === 'team') { var t = s.data; api('/api/c/roster', { method: 'POST', body: { name: t.name || '', school: t.school || '', role: t.role || t.roles || '', email: t.email || '' } }); }
          toast('Approved'); redraw(); closeModal(); }); } }));
      acts.appendChild(h('button', { class: 'btn small', text: 'Decline', onclick: function () { patchSub(s, { approved: false, status: 'answered' }).then(function () { redraw(); closeModal(); }); } }));
    }
  }
  if (canEdit() && !(s.data && s.data.audio)) acts.appendChild(h('button', { class: 'btn small', text: 'Post as public question', onclick: function () {
    closeModal(); location.hash = '#c/pubq'; setTimeout(function () { editItem('pubq', { question: firstText(s), topic: s.tag, route: (s.data || {}).route === 'School Board' ? 'School Board' : 'District staff', qstatus: 'sent', sent: today() }, function () { route(); }); }, 200); } }));
  if (s.form === 'subscribe' && canEdit()) acts.appendChild(h('button', { class: 'btn hot small', text: 'Add to subscribers', onclick: function () { var d = s.data || {};
    api('/api/c/subscribers', { method: 'POST', body: { email: d.email || '', lang: d.lang === 'Español' ? 'Spanish' : 'English', consent: d.consent === 'yes', source: 'Website: ' + (d.topics || '') } }).then(function () { patchSub(s, { status: 'answered' }); toast('Added'); closeModal(); }); } }));
  if (isOwner()) acts.appendChild(h('button', { class: 'btn danger small', text: 'Delete', onclick: function () { if (confirm('Delete this message for good?')) api('/api/inbox?key=' + encodeURIComponent(s.key), { method: 'DELETE' }).then(function () { INBOX = INBOX.filter(function (x) { return x !== s; }); route(); closeModal(); }); } }));
  acts.appendChild(h('button', { class: 'btn small', text: 'Close', onclick: closeModal }));
  b.appendChild(acts);
  modal('Message', b);
}

/* ---------------- generic list + editor ---------------- */
function statusOf(i) { if (i.status === 'published') { if (i.publishAt && Date.parse(i.publishAt) > Date.now()) return 'scheduled'; if (i.endAt && Date.parse(i.endAt) < Date.now()) return 'ended'; return 'published'; } return i.status || 'draft'; }
function listView(main, name, q) {
  var S = SCHEMAS[name]; if (!S) { main.appendChild(h('p', { text: 'Unknown list.' })); return; }
  var acts = [];
  if (canEdit()) acts.push(h('button', { class: 'btn hot', text: '+ New', onclick: function () { editItem(name, {}, draw); } }));
  acts.push(h('button', { class: 'btn small', text: 'Export', onclick: function () { col(name).then(function (l) { download(name + '-' + today() + '.csv', csv(l), 'text/csv'); }); } }));
  title(main, S.label, S.help || (S.pub ? 'Shows on the public site once published.' : 'Private. Only admins see this.'), acts);
  var tb = h('div', { class: 'toolbar' }); var find = h('input', { type: 'search', placeholder: 'Search ' + S.label.toLowerCase(), 'aria-label': 'Search' }); tb.appendChild(find);
  var fs = null;
  var sel = S.fields.find(function (f) { return f[2] === 'select' && f[0] !== 'card' && f[0] !== 'lang'; });
  if (S.pub) { fs = h('select', { 'aria-label': 'Filter' }, ['all', 'published', 'scheduled', 'draft', 'ended'].map(function (s) { return h('option', { value: s, text: s === 'all' ? 'Everything' : s }); })); tb.appendChild(fs); }
  else if (sel) { fs = h('select', { 'aria-label': 'Filter' }, [h('option', { value: 'all', text: 'Any ' + sel[1].toLowerCase() })].concat(sel[3].map(function (s) { return h('option', { value: s, text: s }); }))); tb.appendChild(fs); }
  main.appendChild(tb);
  var ul = h('ul', { class: 'list' }); main.appendChild(ul);
  var items = [];
  function draw(fresh) {
    col(name, fresh !== false).then(function (l) {
      items = l; ul.innerHTML = '';
      var t = find.value.toLowerCase();
      var rows = l.filter(function (i) {
        if (fs && fs.value !== 'all') { if (S.pub ? statusOf(i) !== fs.value : i[sel[0]] !== fs.value) return false; }
        return !t || JSON.stringify(i).toLowerCase().indexOf(t) >= 0;
      });
      if (S.date) rows.sort(function (a, b) { return (a[S.date] || '') < (b[S.date] || '') ? 1 : -1; });
      if (!rows.length) ul.appendChild(h('li', { class: 'sub', text: l.length ? 'Nothing matches.' : 'Nothing here yet.' }));
      rows.forEach(function (i) {
        var pills = [];
        if (S.pub) pills.push(h('span', { class: 'pill ' + statusOf(i), text: statusOf(i) }));
        if (sel && i[sel[0]]) pills.push(h('span', { class: 'pill ' + slug(i[sel[0]]), text: i[sel[0]] }));
        if (name === 'questions' && i.status !== 'answered' && i.status !== 'draft' && i.sent && daysSince(i.sent) >= 7) pills.push(h('span', { class: 'pill late', text: daysSince(i.sent) + ' days waiting' }));
        if (name === 'promises' && i.due && i.state !== 'done' && daysSince(i.due) > 0) pills.push(h('span', { class: 'pill late', text: 'late' }));
        var other = S.fields.filter(function (f) { return f[0] !== S.title && ['textarea', 'text', undefined].indexOf(f[2]) >= 0 && i[f[0]]; })[0];
        ul.appendChild(h('li', { class: 'item', tabindex: 0, onclick: function () { editItem(name, i, draw); }, onkeydown: function (e) { if (e.key === 'Enter') editItem(name, i, draw); } }, [
          i.image ? h('img', { src: i.image, alt: '', width: 64, height: 64, style: 'object-fit:cover;border-radius:8px' }) : null,
          h('div', { class: 'grow' }, [h('div', {}, pills), h('div', { class: 'title', text: String(i[S.title] || '(untitled)').slice(0, 160) }),
            other ? h('div', { class: 'snip', text: i[other[0]] }) : null,
            h('div', { class: 'meta', text: [S.date && i[S.date] ? fdate(i[S.date]) : '', i.updatedAt ? 'edited ' + ftime(i.updatedAt) + (i.by ? ' by ' + i.by : '') : ''].filter(Boolean).join(' · ') })])]));
      });
      if (q && q.get('id')) { var it = l.find(function (x) { return x.id === q.get('id'); }); q = null; if (it) editItem(name, it, draw); }
    }).catch(fail(main));
  }
  find.addEventListener('input', function () { draw(false); }); if (fs) fs.addEventListener('change', function () { draw(false); });
  draw();
}
function fieldInput(f, val) {
  var k = f[0], type = f[2] || 'text', inp;
  if (type === 'textarea') { inp = h('textarea', { spellcheck: 'true', lang: f[3] === 'es' ? 'es' : 'en' }); inp.value = val || ''; }
  else if (type === 'select') { inp = h('select', {}, [h('option', { value: '', text: '—' })].concat(f[3].map(function (o) { return h('option', { value: o, text: o }); }))); inp.value = val || ''; }
  else if (type === 'check') { inp = h('input', { type: 'checkbox' }); inp.checked = !!val; }
  else if (type === 'image') {
    var wrap = h('div', { class: 'row' }); var hid = h('input', { type: 'hidden' }); hid.value = val || '';
    var img = h('img', { alt: '', style: 'max-width:160px;border-radius:8px', src: val || null, hidden: !val });
    var file = h('input', { type: 'file', accept: 'image/*', 'aria-label': 'Choose image' });
    file.addEventListener('change', function () { var fl = file.files[0]; if (!fl) return; toast('Shrinking and uploading…');
      shrink(fl, 1600).then(function (data) { return api('/api/media', { method: 'POST', body: { name: fl.name, data: data } }); }).then(function (r) { hid.value = r.url; img.src = r.url; img.hidden = false; toast('Image added'); }, function (e) { toast(e.message); }); });
    wrap.appendChild(img); wrap.appendChild(file); wrap.appendChild(h('button', { class: 'btn small', type: 'button', text: 'Remove', onclick: function () { hid.value = ''; img.hidden = true; } }));
    wrap.appendChild(hid); wrap._get = function () { return hid.value; }; return wrap;
  }
  else { inp = h('input', { type: type === 'date' || type === 'email' || type === 'number' || type === 'url' ? type : 'text', spellcheck: 'true', lang: f[3] === 'es' ? 'es' : 'en' }); inp.value = val == null ? '' : val; }
  inp._get = function () { return type === 'check' ? inp.checked : inp.value; };
  return inp;
}
function shrink(file, max) {
  return new Promise(function (res, rej) {
    var img = new Image(); img.onload = function () {
      var s = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      res(c.toDataURL('image/jpeg', .85)); URL.revokeObjectURL(img.src);
    }; img.onerror = rej; img.src = URL.createObjectURL(file);
  });
}
function editItem(name, item, redraw) {
  var S = SCHEMAS[name], b = h('div', { class: 'editor' }), inputs = {};
  S.fields.forEach(function (f) {
    var inp = fieldInput(f, item[f[0]]); inputs[f[0]] = inp;
    if (f[2] === 'check') b.appendChild(h('label', { class: 'check' }, [inp, f[1]]));
    else b.appendChild(h('label', {}, [f[1] + (f[3] === 'es' ? ' ' : ''), inp]));
  });
  if (!canEdit()) $$('input,textarea,select', b).forEach(function (x) { x.disabled = true; });
  var pa, ea;
  if (S.pub) {
    pa = h('input', { type: 'datetime-local' }); pa.value = item.publishAt ? toLocal(item.publishAt) : '';
    ea = h('input', { type: 'datetime-local' }); ea.value = item.endAt ? toLocal(item.endAt) : '';
    b.appendChild(h('div', { class: 'grid2' }, [h('label', {}, ['Go live at ', h('span', { class: 'hint', text: '(optional, schedules it)' }), pa]), h('label', {}, ['Stop showing at ', h('span', { class: 'hint', text: '(optional)' }), ea])]));
  }
  var out = h('div'); b.appendChild(out);
  function values() { var v = {}; for (var k in inputs) v[k] = inputs[k]._get(); if (item.id) v.id = item.id; if (S.pub) { v.publishAt = pa.value ? new Date(pa.value).toISOString() : ''; v.endAt = ea.value ? new Date(ea.value).toISOString() : ''; } return v; }
  function save(status) {
    var v = values(); if (status) v.status = status;
    return api('/api/c/' + name, { method: 'POST', body: v }).then(function (r) { Object.assign(item, r); cache[name] = null; toast(status === 'published' ? (r.publishAt && Date.parse(r.publishAt) > Date.now() ? 'Scheduled' : 'Published. It\'s live within a minute.') : 'Saved'); redraw(); closeModal(); }, function (e) { toast(e.message); });
  }
  var acts = h('div', { class: 'row' });
  if (canEdit()) {
    if (S.pub) {
      acts.appendChild(h('button', { class: 'btn', text: 'Save draft', onclick: function () { save('draft'); } }));
      acts.appendChild(h('button', { class: 'btn', text: 'Preview', onclick: function () { out.innerHTML = ''; out.appendChild(previewOf(name, values())); } }));
      if (isOwner()) acts.appendChild(h('button', { class: 'btn primary', text: item.status === 'published' ? 'Update live version' : 'Publish', onclick: function () { prePublish(values(), function () { save('published'); }); } }));
      if (isOwner() && item.status === 'published') acts.appendChild(h('button', { class: 'btn small', text: 'Unpublish', onclick: function () { save('draft'); } }));
    } else acts.appendChild(h('button', { class: 'btn primary', text: 'Save', onclick: function () { save(); } }));
  }
  if (item.id) acts.appendChild(h('button', { class: 'btn small', text: 'History', onclick: function () { history(name, item, redraw); } }));
  if (name === 'updates' && item.id) acts.appendChild(h('button', { class: 'btn small', text: 'Make caption', onclick: function () { closeModal(); location.hash = '#caption?id=' + item.id; } }));
  if (name === 'updates' && item.id) acts.appendChild(h('button', { class: 'btn small', text: 'Share image', onclick: function () { closeModal(); location.hash = '#share?id=' + item.id; } }));
  if (item.id && isOwner()) acts.appendChild(h('button', { class: 'btn danger small', text: 'Delete', onclick: function () { if (confirm('Delete this? You can bring it back from History later.')) api('/api/c/' + name + '/' + item.id, { method: 'DELETE' }).then(function () { cache[name] = null; redraw(); closeModal(); }); } }));
  acts.appendChild(h('button', { class: 'btn small', text: 'Close', onclick: closeModal }));
  b.appendChild(acts);
  if (S.pub && !isOwner() && canEdit()) b.appendChild(h('p', { class: 'hint', text: 'You can save drafts. The owner publishes.' }));
  modal((item.id ? 'Edit: ' : 'New: ') + S.label, b);
}
function toLocal(iso) { var d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); }
function previewOf(name, v) {
  var p = h('div', { class: 'preview' }, [h('p', { class: 'hint', text: 'Preview' })]);
  if (name === 'banner') p.appendChild(h('div', { style: 'padding:8px 12px;border-radius:8px;color:#fff;background:' + (v.level === 'urgent' ? '#9b2c2c' : '#e8561c') }, [h('b', { text: v.title + ' ' }), v.body || '']));
  else {
    var t = v.title || v.heading || v.question || v.q || v.text || '';
    if (v.date) p.appendChild(h('div', { class: 'sub', text: fdate(v.date) }));
    p.appendChild(h('h3', { text: t }));
    if (v.image) p.appendChild(h('img', { src: v.image, alt: v.imageAlt || '' }));
    var body = v.body || v.answer || v.a || (v.text !== t ? v.text : '') || v.note || '';
    if (body) p.appendChild(h(name === 'answers' ? 'blockquote' : 'p', { text: body }));
    if (v.who) p.appendChild(h('p', { class: 'sub', text: '— ' + v.who }));
    if (v.title_es || v.body_es || v.text_es || v.a_es) p.appendChild(h('p', { lang: 'es', class: 'sub', text: [v.title_es, v.body_es, v.text_es, v.q_es, v.a_es].filter(Boolean).join(' · ') }));
  }
  return p;
}
/* checks + privacy checklist before anything goes public */
function prePublish(v, go) {
  var text = Object.keys(v).filter(function (k) { return typeof v[k] === 'string' && !/^(id|status|publishAt|endAt|image|link|date|card|level|state)$/.test(k); }).map(function (k) { return v[k]; }).join('\n');
  api('/api/check', { method: 'POST', body: { text: text } }).then(function (r) {
    var b = h('div', { class: 'editor' });
    var bad = r.phones.length || r.redactions.length;
    if (r.names.length || bad) {
      var box = h('div', { class: 'checks bad' });
      if (r.names.length) box.appendChild(h('p', {}, [h('b', { text: 'Possible names: ' }), r.names.join(', '), h('br'), h('span', { class: 'hint', text: 'Student names never go on the site. If these are staff, add them to Staff contacts so the check skips them.' })]));
      if (r.phones.length) box.appendChild(h('p', {}, [h('b', { text: 'Phone numbers: ' }), r.phones.join(', '), ' (not allowed on the site)']));
      if (r.redactions.length) box.appendChild(h('p', {}, [h('b', { text: 'Redacted names found: ' }), r.redactions.join(', ')]));
      b.appendChild(box);
    } else b.appendChild(h('div', { class: 'checks ok', text: 'No student names, phone numbers, or redacted names found.' }));
    var qs = ['No student names (staff names are fine)', 'No phone numbers', 'District quotes are word for word', 'Nothing here accuses a specific person', 'I\'d be OK with the district reading this'];
    var boxes = qs.map(function (q) { var c = h('input', { type: 'checkbox' }); b.appendChild(h('label', { class: 'check' }, [c, q])); return c; });
    var goBtn = h('button', { class: 'btn primary', text: 'Publish', disabled: true, onclick: function () { closeModal(); go(); } });
    boxes.forEach(function (c) { c.addEventListener('change', function () { goBtn.disabled = !boxes.every(function (x) { return x.checked; }) || !!bad; }); });
    if (bad) b.appendChild(h('p', { class: 'err', text: 'Fix the phone numbers or redacted names first.' }));
    b.appendChild(h('div', { class: 'row' }, [goBtn, h('button', { class: 'btn', text: 'Go back', onclick: closeModal })]));
    modal('Before it goes live', b);
  }, function (e) { toast(e.message); });
}
function history(name, item, redraw) {
  api('/api/hist/' + name + '/' + item.id).then(function (list) {
    var b = h('div', { class: 'editor' });
    if (!list.length) b.appendChild(h('p', { class: 'sub', text: 'No older versions yet. Every save keeps the previous version here.' }));
    list.forEach(function (v) {
      var it = v.item || {};
      b.appendChild(h('div', { class: 'panel' }, [h('div', { class: 'row', style: 'justify-content:space-between' }, [h('b', { text: ftime(v.ts) + (it._deleted ? ' (deleted)' : '') }),
        isOwner() ? h('button', { class: 'btn small', text: 'Bring this back', onclick: function () { api('/api/hist/' + name + '/' + item.id, { method: 'POST', body: { ts: v.ts } }).then(function () { cache[name] = null; toast('Restored'); redraw(); closeModal(); }); } }) : null]),
        h('p', { class: 'snip', text: [it[SCHEMAS[name].title], it.status].filter(Boolean).join(' · ') })]));
    });
    b.appendChild(h('button', { class: 'btn', text: 'Close', onclick: closeModal }));
    modal('History', b);
  });
}

/* ---------------- Publishing tools ---------------- */
VIEWS.publish = function (main) {
  title(main, 'Checks and tools', 'Published edits go live within about a minute. No uploading needed.');
  var g = h('div', { class: 'grid2' }); main.appendChild(g);
  // scan everything live
  var scan = h('div', { class: 'panel' }, [h('h3', { text: 'Privacy scan of everything live' }), h('p', { class: 'sub', text: 'Checks all published admin content for student names, phone numbers and redacted names.' })]);
  var scanOut = h('div'); scan.appendChild(h('button', { class: 'btn primary', text: 'Run scan', onclick: function () {
    scanOut.textContent = 'Scanning…';
    Promise.all(Object.keys(SCHEMAS).filter(function (k) { return SCHEMAS[k].pub; }).map(function (k) { return col(k, true).then(function (l) { return l.filter(function (i) { return i.status === 'published'; }).map(function (i) { return { k: k, i: i }; }); }); })).then(function (parts) {
      var all = [].concat.apply([], parts); var text = all.map(function (x) { return Object.values(x.i).filter(function (v) { return typeof v === 'string'; }).join(' '); }).join('\n');
      return api('/api/check', { method: 'POST', body: { text: text } }).then(function (r) { scanOut.innerHTML = ''; scanOut.appendChild(h('div', { class: 'checks ' + (r.names.length || r.phones.length || r.redactions.length ? 'bad' : 'ok'), text: all.length + ' live items checked. Names: ' + (r.names.join(', ') || 'none') + '. Phones: ' + (r.phones.join(', ') || 'none') + '. Redacted: ' + (r.redactions.join(', ') || 'none') + '.' })); });
    }).catch(function (e) { scanOut.textContent = e.message; }); } })); scan.appendChild(scanOut);
  g.appendChild(scan);
  // links
  var lk = h('div', { class: 'panel' }, [h('h3', { text: 'Broken link check' }), h('p', { class: 'sub', text: 'Checks every link and file on the home page, plus every in-page button target.' })]);
  var lkOut = h('div'); lk.appendChild(h('button', { class: 'btn primary', text: 'Check links', onclick: function () { lkOut.textContent = 'Checking… (up to a minute)'; api('/api/linkcheck').then(function (r) {
    lkOut.innerHTML = ''; lkOut.appendChild(h('p', { class: 'sub', text: r.checked + ' links checked.' }));
    if (!r.broken.length && !r.badGo.length) lkOut.appendChild(h('div', { class: 'checks ok', text: 'Nothing broken.' }));
    r.broken.forEach(function (b) { lkOut.appendChild(h('div', { class: 'checks bad', text: b.status + ': ' + b.url })); });
    r.badGo.forEach(function (b) { lkOut.appendChild(h('div', { class: 'checks bad', text: 'Button points to missing section: ' + b })); });
  }, function (e) { lkOut.textContent = e.message; }); } })); lk.appendChild(lkOut);
  g.appendChild(lk);
  // maintenance + emergency
  var mt = h('div', { class: 'panel' }, [h('h3', { text: 'Maintenance mode' })]);
  api('/api/settings').then(function (s) { SETTINGS = s;
    mt.appendChild(h('p', { class: 'sub', text: s.maintenance ? 'ON. Visitors see a "Back soon" page. You still see the site because you\'re logged in on this device.' : 'Off.' }));
    if (isOwner()) mt.appendChild(h('button', { class: 'btn ' + (s.maintenance ? 'primary' : 'danger'), text: s.maintenance ? 'Turn off' : 'Turn on', onclick: function () { api('/api/settings', { method: 'POST', body: { maintenance: !s.maintenance } }).then(function () { toast('Done'); route(); }); } }));
  });
  g.appendChild(mt);
  g.appendChild(h('div', { class: 'panel' }, [h('h3', { text: 'Emergency banner' }), h('p', { class: 'sub', text: 'A red banner above the tabs for urgent safety info. Use it rarely.' }),
    canEdit() ? h('button', { class: 'btn danger', text: 'Write an urgent banner', onclick: function () { location.hash = '#c/banner'; setTimeout(function () { editItem('banner', { level: 'urgent' }, function () { route(); }); }, 150); } }) : null]));
  // snapshots
  var sn = h('div', { class: 'panel' }, [h('h3', { text: 'Roll back site content' }), h('p', { class: 'sub', text: 'Save a snapshot of everything you\'ve published, and bring any snapshot back. For the site files themselves, Netlify keeps every past deploy under Deploys.' })]);
  var snl = h('ul', { class: 'list' });
  function loadSnaps() { api('/api/snapshots').then(function (l) { snl.innerHTML = ''; if (!l.length) snl.appendChild(h('li', { class: 'sub', text: 'No snapshots yet.' })); l.forEach(function (ts) { snl.appendChild(h('li', { class: 'row', style: 'justify-content:space-between' }, [ftime(ts), isOwner() ? h('button', { class: 'btn small', text: 'Roll back to this', onclick: function () { if (confirm('Replace all live content with this snapshot? (Today\'s version is kept in each item\'s History.)')) api('/api/snapshot', { method: 'POST', body: { restore: ts } }).then(function () { cache = {}; toast('Rolled back'); }); } }) : null])); }); }); }
  if (isOwner()) sn.appendChild(h('div', { class: 'row' }, [h('button', { class: 'btn primary', text: 'Save snapshot now', onclick: function () { api('/api/snapshot', { method: 'POST', body: {} }).then(function () { toast('Saved'); loadSnaps(); }); } }), h('a', { class: 'btn', href: 'https://app.netlify.com/projects/spasdstudentvoice/deploys', target: '_blank', rel: 'noopener', text: 'Netlify deploys ↗' })]));
  sn.appendChild(snl); loadSnaps(); g.appendChild(sn);
  g.appendChild(h('div', { class: 'panel' }, [h('h3', { text: 'Feeds (update by themselves)' }), h('p', { class: 'sub', text: 'The RSS feed, the lite page and the calendar feed include what you publish here, with no extra step.' }),
    h('div', { class: 'row' }, [h('a', { class: 'btn small', href: '/feed.xml', target: '_blank', text: 'RSS feed' }), h('a', { class: 'btn small', href: '/lite.html', target: '_blank', text: 'Lite page' }), h('a', { class: 'btn small', href: '/calendar.ics', text: 'Calendar file' })]),
    h('p', { class: 'sub', text: 'The "Last updated" date on Home and the changelog in Archive also update by themselves every time you publish.' })]));
};

/* ---------------- Stats ---------------- */
function bars(obj, max) { var w = h('div', { class: 'bars' }); var arr = Object.entries(obj).sort(function (a, b) { return b[1] - a[1]; }).slice(0, max || 12); var top = arr.length ? arr[0][1] : 1;
  if (!arr.length) w.appendChild(h('p', { class: 'sub', text: 'No data yet.' }));
  arr.forEach(function (e) { w.appendChild(h('div', { class: 'bar' }, [h('span', { text: e[0] }), h('i', { style: 'width:' + Math.max(2, e[1] / top * 100) + '%' }), h('span', { text: e[1] })])); }); return w; }
VIEWS.stats = function (main) {
  title(main, 'Stats', 'Anonymous counts only. No cookies and nothing tied to a person.');
  var days = h('select', { 'aria-label': 'Range' }, [7, 30, 90].map(function (d) { return h('option', { value: d, text: 'Last ' + d + ' days', selected: d === 30 }); }));
  main.appendChild(h('div', { class: 'toolbar' }, [days]));
  var g = h('div', { class: 'grid2' }); main.appendChild(g);
  function load() {
    g.innerHTML = '<p class="sub">Loading…</p>';
    Promise.all([api('/api/stats?days=' + days.value), inbox(true), col('questions', true), col('qrlinks', true)]).then(function (r) {
      var st = r[0], subs = r[1].filter(function (s) { return !s.spam; }), qs = r[2], qrl = r[3]; g.innerHTML = '';
      var dl = []; for (var i = +days.value - 1; i >= 0; i--) dl.push(new Date(Date.now() - i * 864e5).toISOString().slice(0, 10));
      var views = dl.map(function (d) { return st.perDay[d] || 0; }), vmax = Math.max.apply(null, views.concat([1]));
      g.appendChild(h('div', { class: 'panel' }, [h('h3', { text: 'Visits: ' + views.reduce(function (a, b) { return a + b; }, 0) }), h('div', { class: 'spark', role: 'img', 'aria-label': 'Visits per day' }, views.map(function (v, i) { return h('i', { style: 'height:' + (v / vmax * 100) + '%', title: dl[i] + ': ' + v }); }))]));
      var weeks = {}; subs.forEach(function (s) { var d = new Date(s.created); d.setDate(d.getDate() - d.getDay()); var k = 'Week of ' + d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); weeks[k] = (weeks[k] || 0) + 1; });
      var wk = Object.entries(weeks).slice(0, 10).reverse(); var wobj = {}; wk.forEach(function (e) { wobj[e[0]] = e[1]; });
      var wbox = h('div', { class: 'panel' }, [h('h3', { text: 'Messages per week' })]); var wb = h('div', { class: 'bars' }); var wtop = Math.max.apply(null, wk.map(function (e) { return e[1]; }).concat([1]));
      wk.forEach(function (e) { wb.appendChild(h('div', { class: 'bar' }, [h('span', { text: e[0] }), h('i', { style: 'width:' + e[1] / wtop * 100 + '%' }), h('span', { text: e[1] })])); }); if (!wk.length) wb.appendChild(h('p', { class: 'sub', text: 'No messages yet.' }));
      wbox.appendChild(wb); g.appendChild(wbox);
      var topics = {}; subs.forEach(function (s) { topics[s.tag || 'other'] = (topics[s.tag || 'other'] || 0) + 1; });
      g.appendChild(h('div', { class: 'panel' }, [h('h3', { text: 'Top topics' }), bars(topics)]));
      g.appendChild(h('div', { class: 'panel' }, [h('h3', { text: 'Most-read tabs' }), bars(st.tabs)]));
      var qrn = {}; Object.keys(st.qr).forEach(function (k) { var l = qrl.find(function (x) { return x.src === k; }); qrn[l ? l.label : k] = st.qr[k]; });
      g.appendChild(h('div', { class: 'panel' }, [h('h3', { text: 'QR code scans' }), bars(qrn), h('a', { href: '#qr', class: 'sub', text: 'Make a trackable QR code' })]));
      var qz = h('div', { class: 'panel' }, [h('h3', { text: 'Quiz scores' })]); var qk = Object.keys(st.quiz);
      if (!qk.length) qz.appendChild(h('p', { class: 'sub', text: 'No quizzes finished yet.' })); qk.forEach(function (k) { qz.appendChild(h('p', { text: st.quiz[k].n + ' finished, average ' + Math.round(st.quiz[k].pct) + '%' })); }); g.appendChild(qz);
      var wait = qs.filter(function (q) { return q.status !== 'answered' && q.status !== 'draft' && q.sent; }).sort(function (a, b) { return a.sent > b.sent ? 1 : -1; });
      var wbx = h('div', { class: 'panel' }, [h('h3', { text: 'Days waiting on the district' })]); if (!wait.length) wbx.appendChild(h('p', { class: 'sub', text: 'Nothing waiting.' }));
      wait.forEach(function (q) { wbx.appendChild(h('p', {}, [h('b', { text: daysSince(q.sent) + ' days ' }), q.title])); }); g.appendChild(wbx);
      // survey + poll results from any form
      var sv = h('div', { class: 'panel', style: 'grid-column:1/-1' }, [h('h3', { text: 'Survey and poll results' }), h('p', { class: 'sub', text: 'Pick a form. Any question with a short list of answers gets a chart.' })]);
      var forms = [...new Set(subs.map(function (s) { return s.form; }))].sort(); var fsel = h('select', { 'aria-label': 'Form' }, forms.map(function (f) { return h('option', { value: f, text: f }); }));
      var so = h('div'); sv.appendChild(fsel); sv.appendChild(so); g.appendChild(sv);
      function survey() { so.innerHTML = ''; var rows = subs.filter(function (s) { return s.form === fsel.value; }); var keys = {};
        rows.forEach(function (s) { Object.keys(s.data).forEach(function (k) { (keys[k] = keys[k] || {})[s.data[k]] = (keys[k][s.data[k]] || 0) + 1; }); });
        Object.keys(keys).forEach(function (k) { var vals = Object.keys(keys[k]); if (vals.length > 12 || vals.length < 1 || /email|name/i.test(k)) return; so.appendChild(h('h4', { text: k + ' (' + rows.length + ')' })); so.appendChild(bars(keys[k])); });
        if (!so.children.length) so.appendChild(h('p', { class: 'sub', text: 'No multiple-choice questions on this form.' })); }
      fsel.addEventListener('change', survey); if (forms.length) survey();
    }).catch(fail(main));
  }
  days.addEventListener('change', load); load();
};
VIEWS.report = function (main) {
  var m = new Date(); var month = h('input', { type: 'month', value: m.toISOString().slice(0, 7), 'aria-label': 'Month' });
  title(main, 'Monthly report', 'One page of this month\'s numbers for your next report. Print it or copy the text.', [month, h('button', { class: 'btn', text: 'Print', onclick: function () { print(); } })]);
  var out = h('div', { class: 'panel' }); main.appendChild(out);
  function load() {
    var mo = month.value; out.textContent = 'Building…';
    Promise.all([inbox(true), col('questions', true), col('meetings', true), col('updates', true), col('answers', true), col('hours', true), api('/api/stats?days=90')]).then(function (r) {
      var inM = function (d) { return d && String(d).slice(0, 7) === mo; };
      var subs = r[0].filter(function (s) { return !s.spam && inM(s.created); }), q = r[1], mt = r[2].filter(function (x) { return inM(x.date); }), up = r[3].filter(function (x) { return x.status === 'published' && inM(x.date || x.updatedAt); }), an = r[4].filter(function (x) { return x.status === 'published' && inM(x.date); }), hrs = r[5].filter(function (x) { return x.approved && inM(x.date); }), st = r[6];
      var visits = Object.keys(st.perDay).filter(inM).reduce(function (a, d) { return a + st.perDay[d]; }, 0);
      var topics = {}; subs.forEach(function (s) { topics[s.tag] = (topics[s.tag] || 0) + 1; });
      var sent = q.filter(function (x) { return inM(x.sent); }), ans = q.filter(function (x) { return inM(x.answeredOn); });
      var lines = [
        'Student Voice: ' + new Date(mo + '-15').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        '', 'Messages from students and families: ' + subs.length,
        'Top topics: ' + Object.entries(topics).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 3).map(function (e) { return e[0] + ' (' + e[1] + ')'; }).join(', '),
        'Questions sent to the district: ' + sent.length + '. Answered this month: ' + ans.length + '.',
        'Answers posted word for word: ' + an.length, 'Meetings with district staff: ' + mt.length, 'Updates published: ' + up.length,
        'Volunteer hours approved: ' + hrs.reduce(function (a, x) { return a + (+x.hours || 0); }, 0), 'Site visits (counted since stats began): ' + visits,
        '', 'Still waiting: ' + q.filter(function (x) { return x.status !== 'answered' && x.status !== 'draft' && x.sent; }).map(function (x) { return x.title + ' (' + daysSince(x.sent) + ' days)'; }).join('; ') ];
      out.innerHTML = ''; out.appendChild(h('pre', { style: 'white-space:pre-wrap;font:inherit', text: lines.join('\n') }));
      out.appendChild(h('button', { class: 'btn noprint', text: 'Copy text', onclick: function () { copy(lines.join('\n')); } }));
    }).catch(fail(main));
  }
  month.addEventListener('change', load); load();
};

/* ---------------- District: files + timeline ---------------- */
VIEWS.files = function (main) {
  title(main, 'Evidence files', 'Private. Only admins can open these. Max 4 MB each. Keep anything very sensitive in your own Google Drive instead.');
  if (canEdit()) {
    var f = h('input', { type: 'file', 'aria-label': 'Choose file' }), note = h('input', { placeholder: 'What is this? (optional)' });
    main.appendChild(h('div', { class: 'panel row' }, [f, note, h('button', { class: 'btn primary', text: 'Upload', onclick: function () { var fl = f.files[0]; if (!fl) return; if (fl.size > 4 * 1024 * 1024) return toast('Max 4 MB');
      var rd = new FileReader(); rd.onload = function () { api('/api/files', { method: 'POST', body: { name: fl.name, data: rd.result, note: note.value } }).then(function () { toast('Uploaded'); route(); }, function (e) { toast(e.message); }); }; rd.readAsDataURL(fl); } })]));
  }
  var ul = h('ul', { class: 'list' }); main.appendChild(ul);
  api('/api/files').then(function (l) { if (!l.length) ul.appendChild(h('li', { class: 'sub', text: 'No files yet.' }));
    l.sort(function (a, b) { return a.key < b.key ? 1 : -1; }).forEach(function (x) { ul.appendChild(h('li', { class: 'item' }, [h('div', { class: 'grow' }, [h('div', { class: 'title', text: x.name }), h('div', { class: 'meta', text: [x.note, Math.round((x.size || 0) / 1024) + ' KB', x.by].filter(Boolean).join(' · ') })]),
      h('a', { class: 'btn small', href: '/api/files/' + encodeURIComponent(x.key), text: 'Download' }),
      isOwner() ? h('button', { class: 'btn danger small', text: 'Delete', onclick: function () { if (confirm('Delete this file?')) api('/api/files/' + encodeURIComponent(x.key), { method: 'DELETE' }).then(route); } }) : null])); }); }).catch(fail(main));
};
VIEWS.timeline = function (main) {
  title(main, 'Timeline', 'Everything from your logs in date order. Print it for a report.', [h('button', { class: 'btn', text: 'Print', onclick: function () { print(); } })]);
  var ul = h('ul', { class: 'list' }); main.appendChild(ul);
  Promise.all(['questions', 'emails', 'meetings', 'records', 'quotes', 'answers'].map(function (c) { return col(c, true); })).then(function (r) {
    var ev = [];
    r[0].forEach(function (q) { if (q.sent) ev.push([q.sent, 'Asked', q.title + (q.to ? ' (to ' + q.to + ')' : '')]); if (q.answeredOn) ev.push([q.answeredOn, 'Answered', q.title + (q.answer ? ': "' + q.answer.slice(0, 160) + '"' : '')]); });
    r[1].forEach(function (e) { ev.push([e.date, 'Email', e.subject + (e.with ? ' (with ' + e.with + ')' : '') + (e.summary ? ': ' + e.summary : '')]); });
    r[2].forEach(function (m) { ev.push([m.date, 'Meeting', m.title + (m.with ? ' with ' + m.with : '')]); });
    r[3].forEach(function (x) { ev.push([x.sent, 'Records request', x.request + ' (' + x.status + ')']); });
    r[4].forEach(function (x) { ev.push([x.date, 'Quote', '"' + x.quote + '" (' + [x.who, x.role].filter(Boolean).join(', ') + ')']); });
    r[5].filter(function (a) { return a.status === 'published'; }).forEach(function (a) { ev.push([a.date, 'Posted answer', a.question]); });
    ev = ev.filter(function (e) { return e[0]; }).sort(function (a, b) { return a[0] < b[0] ? 1 : -1; });
    if (!ev.length) ul.appendChild(h('li', { class: 'sub', text: 'Add questions, emails and meetings to build your timeline.' }));
    ev.forEach(function (e) { ul.appendChild(h('li', { class: 'panel', style: 'margin:0' }, [h('b', { text: fdate(e[0]) + ' · ' + e[1] }), h('div', { text: e[2] })])); });
  }).catch(fail(main));
};

/* ---------------- Team ---------------- */
VIEWS.team = function (main) {
  title(main, 'Admins and roles', 'Owner: everything. Editor: can edit and save drafts, can\'t publish or delete. Viewer: read only.');
  if (!isOwner()) { main.appendChild(h('p', { text: 'Only the owner can manage admins.' })); return; }
  var email = h('input', { type: 'email', placeholder: 'Their email' }), name = h('input', { placeholder: 'Name' }), role = h('select', {}, ['editor', 'viewer'].map(function (r) { return h('option', { value: r, text: r }); })), pw = h('input', { type: 'text', placeholder: 'Starting password (10+ characters)', autocomplete: 'off' });
  main.appendChild(h('div', { class: 'panel editor' }, [h('h3', { text: 'Add or update a teammate' }), h('div', { class: 'grid2' }, [h('label', {}, ['Email', email]), h('label', {}, ['Name', name]), h('label', {}, ['Role', role]), h('label', {}, ['Password', pw])]),
    h('p', { class: 'hint', text: 'They can also log in with Google or an email link once those are set up, as long as it\'s this email.' }),
    h('button', { class: 'btn primary', text: 'Save teammate', onclick: function () { api('/api/users', { method: 'POST', body: { email: email.value, name: name.value, role: role.value, password: pw.value } }).then(function () { toast('Saved'); route(); }, function (e) { toast(e.message); }); } })]));
  var ul = h('ul', { class: 'list' }); main.appendChild(ul);
  api('/api/users').then(function (l) { ul.appendChild(h('li', { class: 'item' }, [h('div', { class: 'grow' }, [h('div', { class: 'title', text: 'You (owner)' })])]));
    l.forEach(function (u) { ul.appendChild(h('li', { class: 'item' }, [h('div', { class: 'grow' }, [h('div', { class: 'title', text: (u.name || u.email) }), h('div', { class: 'meta', text: u.email + ' · ' + u.role })]),
      h('button', { class: 'btn danger small', text: 'Remove', onclick: function () { if (confirm('Remove ' + u.email + '? They lose access right away.')) api('/api/users?id=' + u.id, { method: 'DELETE' }).then(route); } })])); }); });
};
VIEWS.log = function (main) {
  var m = h('input', { type: 'month', value: new Date().toISOString().slice(0, 7), 'aria-label': 'Month' });
  title(main, 'Activity log', 'Who changed what, and when.', [m]);
  var t = h('table'); main.appendChild(h('div', { class: 'panel', style: 'overflow-x:auto' }, [t]));
  function load() { api('/api/log?m=' + m.value).then(function (l) { t.innerHTML = '<tr><th>When</th><th>Who</th><th>What</th></tr>'; if (!l.length) t.appendChild(h('tr', {}, [h('td', { colspan: 3, class: 'sub', text: 'Nothing this month.' })]));
    l.forEach(function (x) { t.appendChild(h('tr', {}, [h('td', { text: ftime(x.at) }), h('td', { text: x.who }), h('td', { text: x.action + (x.detail ? ': ' + x.detail : '') })])); }); }).catch(fail(main)); }
  m.addEventListener('change', load); load();
};
VIEWS.tasks = function (main) {
  title(main, 'Task board', null, canEdit() ? [h('button', { class: 'btn hot', text: '+ New task', onclick: function () { editItem('tasks', { status: 'todo' }, function () { route(); }); } })] : null);
  var b = h('div', { class: 'board' }); main.appendChild(b);
  col('tasks', true).then(function (l) {
    [['todo', 'To do'], ['doing', 'Doing'], ['done', 'Done']].forEach(function (c, ci, arr) {
      var colEl = h('div', { class: 'col' }, [h('h3', { text: c[1] })]);
      l.filter(function (t) { return (t.status || 'todo') === c[0]; }).sort(function (a, b) { return (a.due || 'z') > (b.due || 'z') ? 1 : -1; }).forEach(function (t) {
        var card = h('div', { class: 'card', style: 'margin-bottom:8px' }, [h('div', { class: 'title', text: t.title, style: 'font-weight:700;cursor:pointer', onclick: function () { editItem('tasks', t, function () { route(); }); } }),
          h('div', { class: 'sub', text: [t.who, t.due ? fdate(t.due) : ''].filter(Boolean).join(' · ') })]);
        if (canEdit()) { var row = h('div', { class: 'row' });
          if (ci > 0) row.appendChild(h('button', { class: 'btn small', text: '← ' + arr[ci - 1][1], onclick: function () { api('/api/c/tasks', { method: 'POST', body: { id: t.id, status: arr[ci - 1][0] } }).then(route); } }));
          if (ci < 2) row.appendChild(h('button', { class: 'btn small', text: arr[ci + 1][1] + ' →', onclick: function () { api('/api/c/tasks', { method: 'POST', body: { id: t.id, status: arr[ci + 1][0] } }).then(route); } }));
          card.appendChild(row); }
        colEl.appendChild(card);
      });
      b.appendChild(colEl);
    });
  }).catch(fail(main));
};

/* ---------------- Get the word out ---------------- */
VIEWS.newsletter = function (main) {
  title(main, 'Newsletter builder', 'Pick what goes in. It builds a printable page and email text.');
  var since = h('input', { type: 'date', value: new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10), 'aria-label': 'Since' });
  var lang = h('select', { 'aria-label': 'Language' }, [h('option', { value: 'en', text: 'English' }), h('option', { value: 'both', text: 'English + Spanish' })]);
  main.appendChild(h('div', { class: 'toolbar' }, [h('span', { text: 'Include things since' }), since, lang]));
  var pick = h('div', { class: 'panel' }); main.appendChild(pick);
  var out = h('div'); main.appendChild(out);
  Promise.all([col('updates', true), col('answers', true), col('dates', true), col('subscribers', true)]).then(function (r) {
    function draw() {
      pick.innerHTML = ''; var boxes = [];
      var groups = [['Updates', r[0].filter(function (u) { return u.status === 'published' && (u.date || '') >= since.value; })], ['District answers', r[1].filter(function (u) { return u.status === 'published' && (u.date || '') >= since.value; })], ['Coming up', r[2].filter(function (u) { return u.status === 'published' && u.date >= today(); })]];
      groups.forEach(function (g) { pick.appendChild(h('h3', { text: g[0] })); if (!g[1].length) pick.appendChild(h('p', { class: 'sub', text: 'Nothing.' }));
        g[1].forEach(function (i) { var c = h('input', { type: 'checkbox', checked: true }); c._i = i; c._g = g[0]; boxes.push(c); pick.appendChild(h('label', { class: 'check' }, [c, (i.title || i.question) + (i.date ? ' (' + fdate(i.date) + ')' : '')])); }); });
      pick.appendChild(h('div', { class: 'row' }, [h('button', { class: 'btn primary', text: 'Build it', onclick: function () { build(boxes.filter(function (b) { return b.checked; })); } })]));
    }
    function build(sel) {
      var es = lang.value === 'both', html = '', text = 'SPASD Student Voice update\n\n';
      var by = {}; sel.forEach(function (b) { (by[b._g] = by[b._g] || []).push(b._i); });
      Object.keys(by).forEach(function (g) { html += '<h2>' + esc(g) + '</h2>'; text += g.toUpperCase() + '\n';
        by[g].forEach(function (i) {
          if (g === 'District answers') { html += '<h3>' + esc(i.question) + '</h3><blockquote>' + esc(i.answer) + '</blockquote><p>— ' + esc(i.who || '') + '</p>'; text += '- ' + i.question + '\n  "' + i.answer + '" (' + (i.who || '') + ')\n'; }
          else if (g === 'Coming up') { html += '<p><b>' + esc(fdate(i.date)) + ':</b> ' + esc(i.title) + (i.place ? ', ' + esc(i.place) : '') + '</p>'; text += '- ' + fdate(i.date) + ': ' + i.title + '\n'; }
          else { html += '<h3>' + esc(i.title) + '</h3><p>' + esc(i.body) + '</p>' + (es && i.body_es ? '<p lang="es"><i>' + esc(i.title_es || '') + ' ' + esc(i.body_es) + '</i></p>' : ''); text += '- ' + i.title + ': ' + i.body + '\n' + (es && i.body_es ? '  ES: ' + i.body_es + '\n' : ''); }
        }); text += '\n'; });
      text += 'More at spasdstudentvoice.netlify.app (blocked on school Wi-Fi, so open it on your phone\'s data).';
      out.innerHTML = '';
      var subs = r[3].filter(function (s) { return s.consent; }).map(function (s) { return s.email; });
      out.appendChild(h('div', { class: 'panel' }, [h('div', { class: 'row' }, [
        h('button', { class: 'btn primary', text: 'Open printable page', onclick: function () { var w = open('', '_blank'); w.document.write('<!doctype html><meta charset="utf-8"><title>Student Voice newsletter</title><style>body{font:16px/1.5 system-ui,sans-serif;max-width:680px;margin:30px auto;padding:0 16px;color:#14233a}h1{color:#1b3a66}h2{color:#e8561c;border-bottom:2px solid #e8561c}blockquote{border-left:4px solid #1b3a66;margin:0;padding-left:12px}</style><h1>SPASD Student Voice</h1><p>' + new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) + '</p>' + html + '<p><small>Student-run. Not an official SPASD site.</small></p>'); w.document.close(); } }),
        h('button', { class: 'btn', text: 'Copy email text', onclick: function () { copy(text); } }),
        h('button', { class: 'btn', text: 'Copy subscriber emails (' + subs.length + ')', onclick: function () { copy(subs.join(', ')); } })]),
        h('p', { class: 'hint', text: 'Paste subscriber emails into BCC, never To or CC.' }), h('pre', { style: 'white-space:pre-wrap;font:inherit', text: text })]));
    }
    since.addEventListener('change', draw); draw();
  }).catch(fail(main));
};
function makeCaption(u, lang) {
  var body = lang === 'es' ? (u.body_es || '') : (u.body || ''), t = lang === 'es' ? (u.title_es || u.title) : u.title;
  var sentences = body.match(/[^.!?]+[.!?]+/g) || [body];
  var main = sentences.slice(0, 2).join(' ').trim();
  return lang === 'es' ? t + '\n\n' + main + '\n\nEnlace en la biografía. (¿Bloqueado en el Wi-Fi escolar? Ábrelo con tus datos.)\n#TuEscuelaTuVoz #SPASDStudentVoice'
    : t + '\n\n' + main + '\n\nLink in bio. (Blocked on school Wi-Fi? Open it on your phone\'s data.)\n#YourSchoolYourSay #SPASDStudentVoice';
}
VIEWS.caption = function (main, q) {
  title(main, 'Caption writer', 'Turns an update into a starter Instagram caption. Always reread and make it sound like you.');
  var sel = h('select', { 'aria-label': 'Update' }), lang = h('select', { 'aria-label': 'Language' }, [h('option', { value: 'en', text: 'English' }), h('option', { value: 'es', text: 'Spanish' })]);
  var ta = h('textarea', { style: 'min-height:200px', 'aria-label': 'Caption' });
  main.appendChild(h('div', { class: 'toolbar' }, [sel, lang])); main.appendChild(ta);
  main.appendChild(h('div', { class: 'row', style: 'margin-top:10px' }, [h('button', { class: 'btn primary', text: 'Copy', onclick: function () { copy(ta.value); } }),
    canEdit() ? h('button', { class: 'btn', text: 'Add to Instagram planner', onclick: function () { api('/api/c/igposts', { method: 'POST', body: { caption: ta.value, kind: 'post', status: 'ready', date: today() } }).then(function () { toast('Added'); cache.igposts = null; }); } }) : null]));
  col('updates', true).then(function (l) { l.forEach(function (u) { sel.appendChild(h('option', { value: u.id, text: u.title })); }); if (q.get('id')) sel.value = q.get('id');
    function go() { var u = l.find(function (x) { return x.id === sel.value; }); ta.value = u ? makeCaption(u, lang.value) : 'Write an update first.'; }
    sel.addEventListener('change', go); lang.addEventListener('change', go); go(); });
};
VIEWS.qr = function (main) {
  title(main, 'QR codes', 'Each code gets its own tracking name, so Stats shows which flyer gets scanned.');
  var label = h('input', { placeholder: 'Label, like "Library flyer"' }), target = h('input', { value: location.origin + '/', 'aria-label': 'Link' });
  var box = h('div', { class: 'qr', 'aria-label': 'QR code' }), urlOut = h('p', { class: 'sub', style: 'overflow-wrap:anywhere' });
  main.appendChild(h('div', { class: 'panel editor' }, [h('div', { class: 'grid2' }, [h('label', {}, ['Label', label]), h('label', {}, ['Link (any page on the site, or any URL)', target])]),
    h('div', { class: 'row' }, [h('button', { class: 'btn primary', text: 'Make QR code', onclick: make }), h('button', { class: 'btn', text: 'Download PNG', onclick: function () { var c = box.querySelector('canvas'); if (c) { var a = h('a', { href: c.toDataURL('image/png'), download: 'qr-' + slug(label.value || 'code') + '.png' }); a.click(); } } })]), box, urlOut]));
  function make() {
    if (!window.QRCode) return toast('QR tool still loading, try again');
    var src = slug(label.value || 'qr-' + Date.now().toString(36)); var u = new URL(target.value, location.origin);
    if (u.origin === location.origin) u.searchParams.set('src', src);
    box.innerHTML = ''; new QRCode(box, { text: u.toString(), width: 320, height: 320, correctLevel: QRCode.CorrectLevel.M }); urlOut.textContent = u.toString();
    if (canEdit()) api('/api/c/qrlinks', { method: 'POST', body: { label: label.value || src, target: u.toString(), src: src } }).then(function () { cache.qrlinks = null; drawList(); });
  }
  var ul = h('ul', { class: 'list' }); main.appendChild(h('h2', { text: 'Your codes' })); main.appendChild(ul);
  function drawList() { col('qrlinks', true).then(function (l) { ul.innerHTML = ''; l.forEach(function (x) { ul.appendChild(h('li', { class: 'item', onclick: function () { label.value = x.label; target.value = x.target.replace(/[?&]src=[^&]+/, ''); make(); } }, [h('div', { class: 'grow' }, [h('div', { class: 'title', text: x.label }), h('div', { class: 'meta', text: x.target })])])); }); }); }
  drawList();
};
VIEWS.flyer = function (main) {
  title(main, 'Flyer maker', 'Fill it in and print. The QR code points to the site.');
  var head = h('input', { value: 'Your school. Your say.' }), sub = h('textarea', { text: '' }), link = h('input', { value: location.origin + '/?src=flyer' }), es = h('input', { value: 'Tu escuela. Tu voz.' });
  sub.value = 'Ask the district a question, anonymously if you want. Real answers get posted word for word.';
  main.appendChild(h('div', { class: 'panel editor noprint' }, [h('label', {}, ['Headline', head]), h('label', {}, ['Text', sub]), h('label', {}, ['Spanish line', es]), h('label', {}, ['QR link', link]),
    h('button', { class: 'btn primary', text: 'Open printable flyer', onclick: function () {
      var d = h('div'); if (window.QRCode) new QRCode(d, { text: link.value, width: 300, height: 300 });
      setTimeout(function () { var c = d.querySelector('canvas'), img = c ? c.toDataURL() : '';
        var w = open('', '_blank'); w.document.write('<!doctype html><meta charset="utf-8"><title>Flyer</title><style>@page{size:letter;margin:0.5in}body{font-family:Impact,"Arial Narrow",sans-serif;text-align:center;color:#1b3a66;margin:0}h1{font-size:64pt;line-height:1;margin:.6in 0 .2in;text-transform:uppercase}p{font:20pt/1.4 system-ui,sans-serif;color:#14233a;max-width:6.5in;margin:0 auto .25in}.es{color:#e8561c;font-size:28pt;font-family:Impact,sans-serif}img{width:2.6in}small{font:11pt system-ui;color:#566377;display:block;margin-top:.2in}</style><h1>' + esc(head.value) + '</h1><p>' + esc(sub.value) + '</p><p class="es">' + esc(es.value) + '</p><img src="' + img + '" alt="QR code"><small>spasdstudentvoice.netlify.app · Student-run, not an official SPASD site · Blocked on school Wi-Fi? Use your phone\'s data.</small>'); w.document.close(); setTimeout(function () { w.print(); }, 400); }, 100);
    } })]));
};
VIEWS.share = function (main, q) {
  title(main, 'Share images', 'Makes a square 1080×1080 image for Instagram from any update.');
  var sel = h('select', { 'aria-label': 'Update' }), kick = h('input', { value: 'Student Voice update' }), t = h('input', { 'aria-label': 'Headline' }), s = h('textarea', { 'aria-label': 'Text' });
  var cv = h('canvas', { class: 'share', width: 1080, height: 1080, style: 'width:min(420px,100%)' });
  main.appendChild(h('div', { class: 'grid2' }, [h('div', { class: 'panel editor' }, [h('label', {}, ['Start from', sel]), h('label', {}, ['Small top line', kick]), h('label', {}, ['Headline', t]), h('label', {}, ['Text', s]),
    h('div', { class: 'row' }, [h('button', { class: 'btn primary', text: 'Download PNG', onclick: function () { var a = h('a', { href: cv.toDataURL('image/png'), download: 'share-' + slug(t.value) + '.png' }); a.click(); } })])]), h('div', {}, [cv])]));
  function wrap(cx, text, x, y, maxW, lh, maxLines) { var words = String(text).split(/\s+/), line = '', n = 0; for (var i = 0; i < words.length; i++) { var test = line ? line + ' ' + words[i] : words[i]; if (cx.measureText(test).width > maxW && line) { cx.fillText(line, x, y); y += lh; line = words[i]; if (++n >= maxLines - 1) { line += '…'; break; } } else line = test; } cx.fillText(line, x, y); return y + lh; }
  function draw() { var cx = cv.getContext('2d'); cx.fillStyle = '#1b3a66'; cx.fillRect(0, 0, 1080, 1080); cx.fillStyle = '#e8561c'; cx.fillRect(0, 0, 1080, 18); cx.fillRect(80, 860, 160, 10);
    cx.fillStyle = '#e8561c'; cx.font = '800 40px "Barlow Condensed", Impact, sans-serif'; cx.fillText(kick.value.toUpperCase(), 80, 150);
    cx.fillStyle = '#fff'; cx.font = '800 104px "Barlow Condensed", Impact, sans-serif'; var y = wrap(cx, t.value.toUpperCase(), 80, 270, 920, 100, 4);
    cx.font = '400 42px "Public Sans", system-ui, sans-serif'; cx.fillStyle = '#dbe6f5'; wrap(cx, s.value, 80, y + 30, 920, 58, 6);
    cx.fillStyle = '#fff'; cx.font = '700 34px "Public Sans", system-ui, sans-serif'; cx.fillText('spasdstudentvoice.netlify.app', 80, 950); cx.fillStyle = '#9fb0c6'; cx.font = '400 28px "Public Sans", system-ui, sans-serif'; cx.fillText('Student-run · Not an official SPASD site', 80, 1000); }
  [kick, t, s].forEach(function (x) { x.addEventListener('input', draw); });
  col('updates', true).then(function (l) { sel.appendChild(h('option', { value: '', text: 'Blank' })); l.forEach(function (u) { sel.appendChild(h('option', { value: u.id, text: u.title })); });
    sel.addEventListener('change', function () { var u = l.find(function (x) { return x.id === sel.value; }); if (u) { t.value = u.title; s.value = (u.body || '').split(/(?<=[.!?])\s/)[0]; } draw(); });
    if (q.get('id')) { sel.value = q.get('id'); sel.dispatchEvent(new Event('change')); } else { t.value = 'Your school. Your say.'; s.value = 'Ask the district anything. Real answers, word for word.'; draw(); } });
  if (document.fonts) document.fonts.ready.then(draw);
};

/* ---------------- Safety ---------------- */
VIEWS.safety = function (main) {
  title(main, 'Safety settings', 'Owner only can change these.');
  api('/api/settings').then(function (s) { SETTINGS = s;
    var ret = h('input', { type: 'number', min: 30, value: s.retentionDays }), bw = h('textarea'), rd = h('textarea'), an = h('textarea'), cw = h('textarea'), cr = h('textarea'), rt = h('textarea', { style: 'min-height:140px' });
    bw.value = (s.blockedWords || []).join('\n'); rd.value = (s.redactions || []).join('\n'); an.value = (s.allowNames || []).join('\n'); cw.value = (s.cwSections || []).join('\n'); cr.value = s.crisis || ''; rt.value = (s.replyTemplates || []).join('\n---\n');
    var lines = function (t) { return t.value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean); };
    var form = h('div', { class: 'panel editor' }, [
      h('label', {}, ['Delete messages older than (days)', ret, h('span', { class: 'hint', text: 'Runs every morning. Less data means less risk.' })]),
      h('label', {}, ['Blocked words (one per line)', bw, h('span', { class: 'hint', text: 'Messages with these get held for review.' })]),
      h('label', {}, ['Redacted names (one per line)', rd, h('span', { class: 'hint', text: 'Publishing is blocked if any of these show up.' })]),
      h('label', {}, ['Names the student-name check should skip (one per line)', an, h('span', { class: 'hint', text: 'Staff in Staff contacts are skipped already.' })]),
      h('label', {}, ['Sections with a content warning (section ids, one per line)', cw, h('span', { class: 'hint', text: 'For example r-framework. Remove an id to turn its warning off.' })]),
      h('label', {}, ['Crisis resources (shown on flagged messages)', cr]),
      h('label', {}, ['Reply templates (separate with a line of ---)', rt]),
      isOwner() ? h('button', { class: 'btn primary', text: 'Save safety settings', onclick: function () { api('/api/settings', { method: 'POST', body: { retentionDays: +ret.value || 365, blockedWords: lines(bw), redactions: lines(rd), allowNames: lines(an), cwSections: lines(cw), crisis: cr.value, replyTemplates: rt.value.split(/\n-{3,}\n/).map(function (x) { return x.trim(); }).filter(Boolean) } }).then(function (n) { SETTINGS = n; toast('Saved'); }, function (e) { toast(e.message); }); } }) : null]);
    if (!isOwner()) $$('input,textarea', form).forEach(function (x) { x.disabled = true; });
    main.appendChild(h('div', { class: 'crisis', text: s.crisis }));
    main.appendChild(form);
    if (isOwner()) main.appendChild(h('div', { class: 'panel' }, [h('h3', { text: 'Backup' }), h('p', { class: 'sub', text: 'One file with every message, list and setting. Keep it somewhere private.' }), h('a', { class: 'btn primary', href: '/api/export', text: 'Download backup' })]));
  }).catch(fail(main));
};

/* ---------------- Settings ---------------- */
VIEWS.settings = function (main) {
  title(main, 'Settings', 'Logged in as ' + (ME.email || ME.name || 'owner') + ' (' + ME.role + ').');
  var g = h('div', { class: 'grid2' }); main.appendChild(g);
  var cur = h('input', { type: 'password', autocomplete: 'current-password' }), nw = h('input', { type: 'password', autocomplete: 'new-password' });
  g.appendChild(h('div', { class: 'panel editor' }, [h('h3', { text: 'Change your password' }), h('label', {}, ['Current password', cur]), h('label', {}, ['New password (10+ characters)', nw]),
    h('button', { class: 'btn primary', text: 'Change password', onclick: function () { api('/api/password', { method: 'POST', body: { current: cur.value, next: nw.value } }).then(function () { toast('Password changed'); cur.value = nw.value = ''; }, function (e) { toast(e.message); }); } })]));
  if (isOwner()) g.appendChild(h('div', { class: 'panel' }, [h('h3', { text: 'Log out everywhere' }), h('p', { class: 'sub', text: 'Kicks out every device and teammate. Everyone has to log in again.' }),
    h('button', { class: 'btn danger', text: 'Log out everywhere', onclick: function () { if (confirm('Log out every device?')) api('/api/logout-all', { method: 'POST' }).then(function () { showLogin('Everyone was logged out.'); }); } })]));
  api('/api/settings').then(function (s) { SETTINGS = s;
    var sheet = h('div', { class: 'panel' }, [h('h3', { text: 'Google Sheets' }), h('p', { class: 'sub', text: 'A private link Google Sheets can read. Paste the formula into cell A1 of a sheet you own and it stays in sync.' })]);
    if (s.sheetsKey) ['inbox', 'questions', 'hours', 'subscribers'].forEach(function (c) { var f = '=IMPORTDATA("' + location.origin + '/api/sheet.csv?c=' + c + '&k=' + s.sheetsKey + '")'; sheet.appendChild(h('div', { class: 'row', style: 'margin:6px 0' }, [h('b', { text: c }), h('button', { class: 'btn small', text: 'Copy formula', onclick: function () { copy(f); } })])); });
    if (isOwner()) sheet.appendChild(h('button', { class: 'btn', text: s.sheetsKey ? 'Make a new link (old one stops working)' : 'Turn on', onclick: function () { api('/api/settings', { method: 'POST', body: { newSheetsKey: true } }).then(route); } }));
    sheet.appendChild(h('p', { class: 'hint', text: 'Anyone with the formula can read that data, so don\'t share the sheet publicly.' }));
    g.appendChild(sheet);
    var ics = location.origin + '/calendar.ics';
    g.appendChild(h('div', { class: 'panel' }, [h('h3', { text: 'Google Calendar' }), h('p', { class: 'sub', text: 'In Google Calendar: Other calendars → + → From URL, then paste this. Every public date shows up there and stays updated (Google refreshes it every few hours).' }),
      h('div', { class: 'row' }, [h('code', { text: ics, style: 'overflow-wrap:anywhere' }), h('button', { class: 'btn small', text: 'Copy', onclick: function () { copy(ics); } })])]));
    api('/api/config').then(function (c) {
      g.appendChild(h('div', { class: 'panel' }, [h('h3', { text: 'Login methods' }),
        h('p', {}, [h('b', { text: 'Password: ' }), 'on']), h('p', {}, [h('b', { text: 'Google: ' }), c.google ? 'on' : 'off. Needs GOOGLE_CLIENT_ID and ADMIN_EMAIL in Netlify.']),
        h('p', {}, [h('b', { text: 'Email link: ' }), c.magic ? 'on' : 'off. Needs RESEND_API_KEY and ADMIN_EMAIL in Netlify.']), h('a', { href: '#handoff', text: 'Setup steps' })]));
      if (isOwner()) g.appendChild(h('div', { class: 'panel' }, [h('h3', { text: 'Email' }), h('p', { class: 'sub', text: 'Daily digest, weekly Sunday summary, safety alerts and email replies all need email set up.' }),
        h('div', { class: 'row' }, [h('button', { class: 'btn', text: 'Send a test email', onclick: function () { api('/api/email-test', { method: 'POST' }).then(function (r) { toast(r.ok ? 'Sent. Check your inbox.' : r.reason); }); } }),
          h('label', { class: 'check' }, [h('input', { type: 'checkbox', checked: s.weeklyEmail !== false, onchange: function () { api('/api/settings', { method: 'POST', body: { weeklyEmail: this.checked } }); } }), 'Sunday summary'])])]));
    });
  });
};
VIEWS.handoff = function (main) {
  title(main, 'Handoff guide', 'For whoever runs Student Voice after you. Print this and give them a backup.', [h('button', { class: 'btn', text: 'Print', onclick: function () { print(); } })]);
  main.appendChild(h('div', { class: 'panel', html: [
    '<h3>What this is</h3><p>A student-run site that tracks what students ask the Sun Prairie Area School District and what the district answers. The admin side (this page) lives at <code>/admin</code> on the same site.</p>',
    '<h3>The rules that keep it trusted</h3><ul><li>Never post student names. Staff names and roles are fine.</li><li>No phone numbers anywhere on the site.</li><li>District answers are posted word for word.</li><li>Nothing on the site accuses a specific person.</li><li>Keep the "Student-run · Not an official SPASD site" line.</li></ul>',
    '<h3>Where things are</h3><ul><li><b>Netlify</b> hosts the site (project: spasdstudentvoice). The owner\'s Netlify login controls everything.</li><li><b>Admin content</b> (updates, dates, answers, inbox, logs) is stored in Netlify Blobs, not in the site files.</li><li><b>The site files</b> live in the project folder. The admin code is in <code>netlify/functions</code> and <code>public/admin</code>.</li></ul>',
    '<h3>Netlify settings (Project configuration → Environment variables)</h3><ul><li><code>SESSION_SECRET</code>: random text that signs logins. Changing it logs everyone out.</li><li><code>ADMIN_PASSWORD_HASH</code>: the starting owner password (after the first change, the new one is stored in Blobs).</li><li><code>ADMIN_EMAIL</code>: the owner\'s email, for Google and email-link login and digests.</li><li><code>GOOGLE_CLIENT_ID</code>: turns on Sign in with Google.</li><li><code>RESEND_API_KEY</code> (and optional <code>RESEND_FROM</code>): turns on email links, digests and replies.</li><li><code>NETLIFY_API_TOKEN</code>: lets the inbox import older messages and delete from Netlify too.</li><li><code>REDACT_WORDS</code>: comma-separated names that must never be published.</li></ul>',
    '<h3>Handing it over</h3><ol><li>Download a backup (Safety settings).</li><li>Add the new person as an editor first, then move ownership by changing ADMIN_EMAIL and the password once they\'re ready.</li><li>Transfer the Netlify project to their Netlify team.</li><li>Post a changelog note so readers know who runs it now.</li></ol>'].join('') }));
};
VIEWS.keys = function (main) {
  title(main, 'Keyboard shortcuts');
  var t = h('table'); [['/', 'Search everything'], ['g then t', 'Today'], ['g then i', 'Inbox'], ['g then u', 'Updates'], ['g then q', 'Question tracker'], ['g then s', 'Stats'], ['n', 'New item (on any list)'], ['Esc', 'Close a popup']].forEach(function (r) { t.appendChild(h('tr', {}, [h('td', {}, [h('kbd', { text: r[0] })]), h('td', { text: r[1] })])); });
  main.appendChild(h('div', { class: 'panel' }, [t]));
};

/* ---------------- Search everything ---------------- */
VIEWS.search = function (main, q) {
  title(main, 'Search everything', 'Messages, every list, and notes.');
  var inp = h('input', { type: 'search', placeholder: 'Type to search', 'aria-label': 'Search everything', value: q.get('q') || '' });
  main.appendChild(h('div', { class: 'toolbar' }, [inp])); var ul = h('ul', { class: 'list' }); main.appendChild(ul);
  var names = Object.keys(SCHEMAS);
  Promise.all([inbox(true)].concat(names.map(function (n) { return col(n, true); }))).then(function (r) {
    function run() { var t = inp.value.trim().toLowerCase(); ul.innerHTML = ''; if (t.length < 2) return; var n = 0;
      r[0].forEach(function (s) { if (n < 60 && JSON.stringify(s.data).toLowerCase().indexOf(t) >= 0) { n++; ul.appendChild(h('li', { class: 'item', onclick: function () { location.hash = '#inbox?key=' + encodeURIComponent(s.key); } }, [h('div', { class: 'grow' }, [h('div', { class: 'meta', text: 'Inbox · ' + s.form }), h('div', { class: 'title', text: firstText(s).slice(0, 140) })])])); } });
      names.forEach(function (nm, i) { r[i + 1].forEach(function (it) { if (n < 60 && JSON.stringify(it).toLowerCase().indexOf(t) >= 0) { n++; ul.appendChild(h('li', { class: 'item', onclick: function () { location.hash = '#c/' + nm + '?id=' + it.id; } }, [h('div', { class: 'grow' }, [h('div', { class: 'meta', text: SCHEMAS[nm].label }), h('div', { class: 'title', text: String(it[SCHEMAS[nm].title] || '').slice(0, 140) })])])); } }); });
      if (!n) ul.appendChild(h('li', { class: 'sub', text: 'Nothing found.' })); }
    inp.addEventListener('input', run); run(); inp.focus();
  }).catch(fail(main));
};

/* ---------------- shortcuts ---------------- */
var gKey = 0;
document.addEventListener('keydown', function (e) {
  if (!ME) return;
  if (e.key === 'Escape' && !$('#modal').hidden) { closeModal(); return; }
  if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) || e.metaKey || e.ctrlKey || e.altKey || !$('#modal').hidden) return;
  if (e.key === '/') { e.preventDefault(); location.hash = '#search'; return; }
  if (e.key === 'g') { gKey = Date.now(); return; }
  if (Date.now() - gKey < 1200) { var m = { t: 'today', i: 'inbox', u: 'c/updates', q: 'c/questions', s: 'stats' }[e.key]; if (m) { location.hash = '#' + m; gKey = 0; return; } }
  if (e.key === 'n') { var r = location.hash.slice(1).split('?')[0]; if (r.indexOf('c/') === 0 && canEdit()) editItem(r.slice(2), {}, route); }
});

/* ---------------- start ---------------- */
if ('serviceWorker' in navigator) { /* the admin is online-only on purpose; no offline cache */ }
api('/api/me').then(function (d) { loggedIn(d); }, function () { showLogin(); });
})();
