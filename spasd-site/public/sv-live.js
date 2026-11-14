/* Student Voice live content: pulls what you publish in /admin and puts it on the page.
   If the admin API can't be reached, the page just shows its built-in content. */
(function () {
  if (location.protocol === 'file:') return;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function fmt(d) { try { return new Date(d + (d.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); } catch (e) { return d; } }
  function track(t, v, extra) {
    try {
      var b = JSON.stringify(Object.assign({ t: t, v: v }, extra || {}));
      if (navigator.sendBeacon) navigator.sendBeacon('/api/track', new Blob([b], { type: 'application/json' }));
      else fetch('/api/track', { method: 'POST', headers: { 'content-type': 'application/json' }, body: b, keepalive: true });
    } catch (e) {}
  }

  /* ---- anonymous stats: page views, tabs, quiz scores, QR scans (no cookies, no IDs) ---- */
  var qs = new URLSearchParams(location.search);
  if (qs.get('src')) { track('qr', qs.get('src')); qs.delete('src'); try { history.replaceState(null, '', location.pathname + (qs.toString() ? '?' + qs : '') + location.hash); } catch (e) {} }
  track('view', (location.hash || '#top').slice(1).split(/[?&]/)[0] || 'top');
  document.addEventListener('click', function (e) { var t = e.target.closest && e.target.closest('.tabbar [data-tab]'); if (t) track('tab', t.getAttribute('data-tab')); });
  document.addEventListener('sv-quizdone', function (e) { var d = e.detail || {}; track('quiz', 'quiz', { s: d.score, n: d.total }); });

  fetch('/api/public', { credentials: 'omit' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
    if (!d) return;
    var adminHere = false; try { adminHere = localStorage.getItem('sv-admin') === '1'; } catch (e) {}

    /* maintenance mode */
    if (d.maintenance && !adminHere) {
      var o = el('div', 'svl-maint');
      o.innerHTML = '<div><h2>Back soon</h2><p>SPASD Student Voice is getting an update. Check back in a little while.</p></div>';
      document.body.appendChild(o); document.documentElement.style.overflow = 'hidden';
    }

    /* top banner (news or urgent) */
    (d.banner || []).slice(0, 2).forEach(function (b) {
      var bar = el('div', 'svl-banner' + (b.level === 'urgent' ? ' urgent' : ''));
      bar.setAttribute('role', b.level === 'urgent' ? 'alert' : 'status');
      var t = el('b', null, b.title); bar.appendChild(t);
      if (b.body) bar.appendChild(document.createTextNode(' ' + b.body));
      if (b.link) { var a = el('a', null, 'More'); if (/^https?:/.test(b.link)) { a.href = b.link; a.target = '_blank'; a.rel = 'noopener'; } else { a.setAttribute('data-go', b.link); a.setAttribute('role', 'link'); a.tabIndex = 0; } bar.appendChild(document.createTextNode(' ')); bar.appendChild(a); }
      var anchor = $('.tabbar'); if (anchor) anchor.parentNode.insertBefore(bar, anchor);
    });

    /* magazine cover: newest update is always the headline (by date, ignoring pins) */
    (function () {
      var all = (d.updates || []).filter(function (u) { return u && u.title; }).slice().sort(function (a, b) { return (a.date || '') < (b.date || '') ? 1 : (a.date || '') > (b.date || '') ? -1 : 0; });
      if (!all.length || !$('#mag')) return;
      var c = all[0];
      function go(u) { return function (ev) { if (ev.type === 'keydown' && ev.key !== 'Enter') return; setTimeout(function () { var t = document.getElementById('u-' + u.id); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 250); }; }
      var long = c.date ? new Date(c.date + (c.date.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
      $('#mag-date').textContent = long;
      $('#mag-kick').textContent = c.category || 'Latest';
      $('#mag-h').textContent = c.title;
      var body = c.body || ''; $('#mag-dek').textContent = body.length > 280 ? body.slice(0, 277).replace(/\s+\S*$/, '') + '…' : body;
      var cov = $('#mag-cover'); var by = cov.querySelector('.np-by');
      var oldImg = cov.querySelector('img'); if (oldImg) oldImg.remove();
      if (c.image) { var im = el('img'); im.src = c.image; im.alt = c.imageAlt || ''; im.loading = 'lazy'; cov.insertBefore(im, cov.firstChild); }
      var oldFor = cov.querySelector('.np-for'); if (oldFor) oldFor.remove();
      if (c.forYou) { var fy = el('p', 'np-for'); fy.appendChild(el('b', null, 'What this means for you: ')); fy.appendChild(document.createTextNode(c.forYou)); cov.insertBefore(fy, $('#mag-more')); }
      var more = $('#mag-more'); more.addEventListener('click', go(c)); more.addEventListener('keydown', go(c));
      var rest = all.slice(1, 4), list = $('#mag-list');
      if (rest.length) {
        list.textContent = '';
        rest.forEach(function (u) {
          var li = el('li'), a = el('a'); a.setAttribute('data-go', 'updates'); a.setAttribute('role', 'link'); a.tabIndex = 0;
          a.appendChild(el('time', null, (u.date ? fmt(u.date) : '') + (u.category ? ' · ' + u.category : '')));
          a.appendChild(el('span', null, u.title));
          a.addEventListener('click', go(u)); a.addEventListener('keydown', go(u));
          li.appendChild(a); list.appendChild(li);
        });
        
      }
    })();

    /* updates -> "Latest quick updates" (categories, pinned, simple version, reactions, listen, sources) */
    var ups = (d.updates || []).slice().sort(function (a, b) { if (!!b.pinned !== !!a.pinned) return b.pinned ? 1 : -1; return (a.date || '') < (b.date || '') ? 1 : -1; });
    var readSet = {}; try { readSet = JSON.parse(localStorage.getItem('sv-read') || '{}'); } catch (e) {}
    var reacted = {}; try { reacted = JSON.parse(localStorage.getItem('sv-reacted') || '{}'); } catch (e) {}
    var rx = d.reactions || {};
    var RX = [['up', '👍', 'Helpful'], ['q', '❓', 'I have a question'], ['fire', '🔥', 'Big deal']];
    if (ups.length && $('#feed')) {
      var ul = $('#feed');
      ups.forEach(function (u) {
        var li = el('li', 'svl-up' + (u.pinned ? ' pinned' : '') + (readSet[u.id] ? ' read' : ''));
        li.setAttribute('data-cat', u.category || 'General'); li.setAttribute('data-month', (u.date || '').slice(0, 7)); li.id = 'u-' + u.id;
        var top = el('div', 'up-top');
        top.appendChild(el('time', null, u.date ? fmt(u.date) : ''));
        if (u.pinned) top.appendChild(el('span', 'tag go', 'Pinned'));
        if (u.category) top.appendChild(el('span', 'tag', u.category));
        if (u.correction) top.appendChild(el('span', 'tag wait', 'Corrected'));
        li.appendChild(top);
        li.appendChild(el('b', null, u.title));
        if (u.image) { var im = el('img'); im.src = u.image; im.alt = u.imageAlt || ''; im.loading = 'lazy'; li.appendChild(im); }
        var bodyP = el('p', 'up-body', u.body || ''); li.appendChild(bodyP);
        if (u.simple) { var sp = el('p', 'eli up-simple', '💡 ' + u.simple); var eb = document.getElementById('eli-btn'); sp.hidden = !(eb && eb.getAttribute('aria-pressed') === 'true'); li.appendChild(sp); }
        if (u.forYou) { var fy = el('p', 'up-foryou'); fy.appendChild(el('b', null, 'What this means for you: ')); fy.appendChild(document.createTextNode(u.forYou)); li.appendChild(fy); }
        if (u.correction) li.appendChild(el('p', 'up-correction', 'Correction: ' + u.correction));
        if (u.title_es || u.body_es) { var es = el('p', 'upd-es'); es.lang = 'es'; es.textContent = [u.title_es, u.body_es].filter(Boolean).join(': '); li.appendChild(es); }
        var links = el('div', 'up-links');
        function addLink(txt, target) { if (!target) return; var a = el('a', null, txt); if (/^https?:/.test(target)) { a.href = target; a.target = '_blank'; a.rel = 'noopener'; } else { a.setAttribute('data-go', target); a.setAttribute('role', 'link'); a.tabIndex = 0; } links.appendChild(a); }
        addLink('Source', u.source); addLink('Related', u.related);
        if ('speechSynthesis' in window) { var lb = el('button', 'linkbtn', '🔊 Listen'); lb.type = 'button';
          lb.addEventListener('click', function () { speechSynthesis.cancel(); var t = new SpeechSynthesisUtterance(u.title + '. ' + (u.body || '')); t.lang = 'en-US'; speechSynthesis.speak(t); });
          links.appendChild(lb); }
        if (links.children.length) li.appendChild(links);
        var rr = el('div', 'up-rx'); rr.setAttribute('aria-label', 'Reactions');
        RX.forEach(function (r) {
          var n = (rx[u.id] && rx[u.id][r[0]]) || 0, k = u.id + ':' + r[0];
          var b = el('button', 'rx' + (reacted[k] ? ' on' : ''), r[1] + ' ' + n); b.type = 'button'; b.title = r[2]; b.setAttribute('aria-label', r[2] + ', ' + n);
          b.addEventListener('click', function () { if (reacted[k]) return; reacted[k] = 1; try { localStorage.setItem('sv-reacted', JSON.stringify(reacted)); } catch (e) {}
            n++; b.textContent = r[1] + ' ' + n; b.classList.add('on');
            fetch('/api/react', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: u.id, r: r[0] }) }).catch(function () {}); });
          rr.appendChild(b);
        });
        li.appendChild(rr);
        li.addEventListener('click', function (e) { if (e.target.closest('button,a')) return; readSet[u.id] = 1; li.classList.add('read'); try { localStorage.setItem('sv-read', JSON.stringify(readSet)); } catch (er) {} });
        ul.appendChild(li);
      });
      $('#feedsec').hidden = false;
      /* filters, month, timeline, hide read, print, recap */
      var cats = ['All']; ups.forEach(function (u) { var c = u.category || 'General'; if (cats.indexOf(c) < 0) cats.push(c); });
      var months = []; ups.forEach(function (u) { var m = (u.date || '').slice(0, 7); if (m && months.indexOf(m) < 0) months.push(m); });
      var curCat = 'All', curMonth = '', hideRead = false;
      function apply() {
        [].forEach.call(ul.children, function (li) {
          var ok = (curCat === 'All' || li.getAttribute('data-cat') === curCat) && (!curMonth || li.getAttribute('data-month') === curMonth) && !(hideRead && li.classList.contains('read'));
          li.hidden = !ok;
        });
        var rc = $('#ut-recap');
        if (rc) {
          if (!curMonth) { rc.hidden = true; return; }
          var mu = ups.filter(function (u) { return (u.date || '').slice(0, 7) === curMonth; });
          var ma = (d.answers || []).filter(function (a) { return (a.date || '').slice(0, 7) === curMonth; });
          var mq = (d.pubq || []).filter(function (q) { return (q.sent || '').slice(0, 7) === curMonth; });
          var mc = (d.changelog || []).filter(function (c) { return (c.date || '').slice(0, 7) === curMonth; });
          rc.innerHTML = ''; rc.hidden = false;
          rc.appendChild(el('h3', null, new Date(curMonth + '-15').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) + ' recap'));
          rc.appendChild(el('p', null, mu.length + ' updates · ' + mq.length + ' questions sent · ' + ma.length + ' answers posted · ' + mc.length + ' site changes'));
          if (ma.length) { var al = el('ul'); ma.forEach(function (a) { al.appendChild(el('li', null, a.question)); }); rc.appendChild(el('b', null, 'Answers posted:')); rc.appendChild(al); }
        }
      }
      var tc = $('#ut-cats');
      if (tc) cats.forEach(function (c) { var b = el('button', 'chip' + (c === 'All' ? ' on' : ''), c); b.type = 'button';
        b.addEventListener('click', function () { curCat = c; [].forEach.call(tc.children, function (x) { x.classList.toggle('on', x === b); }); apply(); }); tc.appendChild(b); });
      var ms = $('#ut-month');
      if (ms) { months.forEach(function (m) { var o = el('option', null, new Date(m + '-15').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })); o.value = m; ms.appendChild(o); }); ms.addEventListener('change', function () { curMonth = ms.value; apply(); }); }
      var vb = $('#ut-view'); if (vb) vb.addEventListener('click', function () { var on = vb.getAttribute('aria-pressed') !== 'true'; vb.setAttribute('aria-pressed', on); ul.classList.toggle('timeline', on); vb.textContent = on ? 'List view' : 'Timeline view'; });
      var hb = $('#ut-hide'); if (hb) hb.addEventListener('click', function () { hideRead = hb.getAttribute('aria-pressed') !== 'true'; hb.setAttribute('aria-pressed', hideRead); apply(); });
      var pb = $('#ut-print'); if (pb) pb.addEventListener('click', function () { document.documentElement.classList.add('print-feed'); window.print(); setTimeout(function () { document.documentElement.classList.remove('print-feed'); }, 500); });
      var eliB = document.getElementById('eli-btn'); if (eliB) eliB.addEventListener('click', function () { setTimeout(function () { var on = eliB.getAttribute('aria-pressed') === 'true'; ul.querySelectorAll('.up-simple').forEach(function (x) { x.hidden = !on; }); }, 0); });
    } else { var utl = $('.upd-tools'); if (utl) utl.hidden = true; }

    /* Home: weekly line, rotating quote, impact numbers, last-answer status, new-since-last-visit dot */
    var wk = (d.weekly || []).sort(function (a, b) { return (a.week || '') < (b.week || '') ? 1 : -1; })[0];
    if (wk && $('#hx-week')) { var hw = $('#hx-week'); hw.hidden = false; hw.textContent = ''; hw.appendChild(el('b', null, 'This week: ')); hw.appendChild(document.createTextNode(wk.text)); }
    var sq = d.squotes || [];
    if (sq.length && $('#hx-quote')) { var wn = Math.floor(Date.now() / (7 * 864e5)); var q1 = sq[wn % sq.length]; var hq = $('#hx-quote'); hq.hidden = false; hq.textContent = '“' + q1.quote + '”'; hq.appendChild(el('cite', null, q1.who ? '— ' + q1.who : '— A student')); }
    var pq = d.pubq || [], answered = pq.filter(function (q) { return q.qstatus === 'answered'; });
    if ($('#hx-impact')) {
      $('#hx-n-q').textContent = pq.length; $('#hx-n-a').textContent = answered.length; $('#hx-n-u').textContent = (d.updates || []).length;
      if (!pq.length && !(d.updates || []).length) $('#hx-impact').classList.add('quiet');
    }
    var lastA = answered.map(function (q) { return q.answeredOn; }).concat((d.answers || []).map(function (a) { return a.date; })).filter(Boolean).sort().pop();
    if (lastA && $('#hx-status')) { var ds = Math.max(0, Math.floor((Date.now() - Date.parse(lastA + 'T12:00:00')) / 864e5)); var hs = $('#hx-status'); hs.hidden = false; hs.className = 'hx-status ' + (ds <= 7 ? 'g' : ds <= 21 ? 'y' : 'r');
      hs.textContent = 'Last answer from the district: ' + (ds === 0 ? 'today' : ds === 1 ? 'yesterday' : ds + ' days ago'); }
    try {
      var lv = localStorage.getItem('sv-lastvisit-live');
      if (lv && d.lastUpdated && d.lastUpdated > lv) { var tab = document.querySelector('.tabbar [data-tab="updates"]'); if (tab && !tab.classList.contains('newdot')) { tab.classList.add('newdot'); tab.setAttribute('aria-label', tab.textContent.trim() + ' (new since your last visit)'); } }
      localStorage.setItem('sv-lastvisit-live', new Date().toISOString());
    } catch (e) {}

    /* home cards */
    (d.homecards || []).forEach(function (c) {
      var card = $('.h3-' + c.card); if (!card) return;
      if (c.heading) { var h = card.querySelector('h3'); if (h) h.textContent = c.heading; }
      if (c.text) { var p = card.querySelector('p'); if (p) p.textContent = c.text; }
    });

    /* calendar dates */
    var dl = $('#datelist');
    if (dl) (d.dates || []).forEach(function (x) {
      if (!x.date) return;
      var li = el('li'); li.setAttribute('data-end', x.date);
      li.appendChild(el('time', null, fmt(x.date)));
      var dv = el('div'); dv.appendChild(el('b', null, x.title));
      dv.appendChild(el('span', null, [x.time, x.place, x.note].filter(Boolean).join(' · ')));
      li.appendChild(dv);
      if (Date.parse(x.date + 'T23:59:59') < Date.now()) return;
      var after = [].slice.call(dl.children).find(function (o) { return (o.getAttribute('data-end') || '') > x.date; });
      dl.insertBefore(li, after || null);
    });

    /* promise status changes */
    var pv = $('[data-view="promises"] .sec');
    if (pv && (d.promises || []).length) {
      var sec = el('div', 'svl-box'); sec.appendChild(el('h3', null, 'Latest status changes'));
      var pl = el('ul', 'dates');
      d.promises.forEach(function (p) {
        var li = el('li'); li.appendChild(el('time', null, p.updatedAt ? fmt(p.updatedAt.slice(0, 10)) : ''));
        var dv = el('div'); dv.appendChild(el('b', null, p.title + ': ' + (p.state || '')));
        dv.appendChild(el('span', null, [p.owner ? 'Owner: ' + p.owner : '', p.due ? 'Due ' + fmt(p.due) : '', p.note].filter(Boolean).join(' · ')));
        li.appendChild(dv); pl.appendChild(li);
      });
      sec.appendChild(pl);
      var h2 = pv.querySelector('h2'); pv.insertBefore(sec, h2 && h2.nextElementSibling ? h2.nextElementSibling.nextElementSibling : null);
    }

    /* district answers, word for word */
    var ol = $('section[aria-labelledby="ask"] ol.promise');
    if (ol) (d.answers || []).slice().reverse().forEach(function (a) {
      var li = el('li', 'p-go'), ph = el('div', 'ph');
      ph.appendChild(el('span', 'tag go', 'Answered ' + (a.date ? fmt(a.date) : '')));
      ph.appendChild(el('h3', null, a.question)); li.appendChild(ph);
      var bq = el('blockquote', 'svl-quote', a.answer); li.appendChild(bq);
      if (a.who) li.appendChild(el('p', 'sub', '— ' + a.who));
      ol.insertBefore(li, ol.firstChild);
    });

    /* did you know */
    var dyk = $('#dyk');
    if (dyk && (d.dyk || []).length) {
      var f = d.dyk[Math.floor(Math.random() * d.dyk.length)];
      dyk.textContent = ''; dyk.appendChild(el('b', null, 'Did you know? ')); dyk.appendChild(document.createTextNode(f.text + ' '));
      if (f.link) { var a2 = el('a', null, 'Source'); a2.setAttribute('data-go', f.link); a2.setAttribute('role', 'link'); a2.tabIndex = 0; dyk.appendChild(a2); }
    }

    /* myths and FAQ */
    var myths = $('dl.myths');
    if (myths) (d.faq || []).forEach(function (q) { myths.appendChild(el('dt', null, q.q)); myths.appendChild(el('dd', null, q.a)); });

    /* changelog */
    var clh = $('#changelog'); var cl = clh && clh.parentNode.querySelector('ul.dates');
    if (cl) (d.changelog || []).slice(0, 15).reverse().forEach(function (c) {
      var li = el('li'); li.appendChild(el('time', null, c.date ? fmt(c.date) : ''));
      var dv = el('div'); dv.appendChild(el('b', null, c.title)); dv.appendChild(el('span', null, c.body || '')); li.appendChild(dv);
      cl.insertBefore(li, cl.firstChild);
    });

    /* last updated */
    if (d.lastUpdated) {
      var built = (document.querySelector('meta[name="sv-updated"]') || {}).content || '';
      if (d.lastUpdated.slice(0, 10) > built) document.querySelectorAll('.upd').forEach(function (u) {
        u.textContent = new Date(d.lastUpdated).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/Chicago' });
      });
    }


    /* ---- public question board ---- */
    window.SV_PUBQ = d.pubq || [];
    var qbl = $('#qb-list');
    if (qbl) {
      var votes = d.qvotes || {}, rates = d.qrates || {};
      var voted = {}; try { voted = JSON.parse(localStorage.getItem('sv-qvoted') || '{}'); } catch (e) {}
      var qs2 = (d.pubq || []).slice();
      var ans = qs2.filter(function (q) { return q.qstatus === 'answered' && q.sent && q.answeredOn; });
      if (qs2.length) {
        var avg = ans.length ? Math.round(ans.reduce(function (a, q) { return a + (Date.parse(q.answeredOn) - Date.parse(q.sent)) / 864e5; }, 0) / ans.length) : null;
        $('#qb-stats').textContent = qs2.length + ' questions sent · ' + ans.length + ' answered' + (avg != null ? ' · answers took ' + avg + ' days on average' : '') + '. Upvote the ones you want answered first.';
      }
      var qotw = qs2.find(function (q) { return q.qotw; });
      if (qotw) { var qb = $('#qb-qotw'); qb.hidden = false; qb.textContent = ''; qb.appendChild(el('b', null, 'Question of the week: ')); qb.appendChild(document.createTextNode(qotw.question)); }
      var topics = []; qs2.forEach(function (q) { if (q.topic && topics.indexOf(q.topic) < 0) topics.push(q.topic); });
      var cur = '';
      function days(q) { var end = q.answeredOn ? Date.parse(q.answeredOn) : Date.now(); return q.sent ? Math.max(0, Math.floor((end - Date.parse(q.sent)) / 864e5)) : null; }
      function draw() {
        qbl.innerHTML = '';
        var rows = qs2.filter(function (q) { return !cur || q.topic === cur; }).sort(function (a, b) { return (votes[b.id] || 0) - (votes[a.id] || 0); });
        if (!rows.length) qbl.appendChild(el('li', 'sub', 'No questions posted yet.'));
        rows.forEach(function (q) {
          var li = el('li', 'qb-item'), up = el('button', 'qb-up' + (voted[q.id] ? ' on' : ''));
          up.type = 'button'; up.setAttribute('aria-label', 'Upvote this question'); up.setAttribute('aria-pressed', !!voted[q.id]);
          up.innerHTML = '▲<span>' + (votes[q.id] || 0) + '</span>';
          up.addEventListener('click', function () {
            if (voted[q.id]) return; voted[q.id] = 1; try { localStorage.setItem('sv-qvoted', JSON.stringify(voted)); } catch (e) {}
            votes[q.id] = (votes[q.id] || 0) + 1; up.classList.add('on'); up.setAttribute('aria-pressed', 'true'); up.querySelector('span').textContent = votes[q.id];
            fetch('/api/qvote', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: q.id }) }).catch(function () {});
          });
          var body = el('div', 'qb-body');
          var st = q.qstatus === 'answered' ? 'Answered' : q.qstatus === 'waiting' ? 'Waiting ' + days(q) + ' days' : 'Sent';
          var meta = el('div', 'qb-meta'); meta.appendChild(el('span', 'tag ' + (q.qstatus === 'answered' ? 'go' : 'wait'), st));
          if (q.route) meta.appendChild(el('span', 'tag', q.route)); if (q.topic) meta.appendChild(el('span', 'tag', q.topic));
          body.appendChild(meta); body.appendChild(el('h3', null, q.question));
          if (q.answer) {
            body.appendChild(el('blockquote', 'svl-quote', q.answer)); if (q.who) body.appendChild(el('p', 'sub', '— ' + q.who));
            var rt = el('div', 'qb-rate'), r = rates[q.id] || { yes: 0, no: 0 };
            rt.appendChild(el('span', 'sub', 'Did this answer the question? '));
            ['yes', 'no'].forEach(function (v) { var b = el('button', 'btn small', (v === 'yes' ? 'Yes' : 'Not really') + ' (' + r[v] + ')'); b.type = 'button';
              b.addEventListener('click', function () { if (voted['r' + q.id]) return; voted['r' + q.id] = 1; try { localStorage.setItem('sv-qvoted', JSON.stringify(voted)); } catch (e) {} r[v]++; b.textContent = (v === 'yes' ? 'Yes' : 'Not really') + ' (' + r[v] + ') ✓';
                fetch('/api/qrate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: q.id, v: v }) }).catch(function () {}); });
              rt.appendChild(b); });
            body.appendChild(rt);
          }
          var fu = el('button', 'btn small', 'Ask a follow-up'); fu.type = 'button';
          fu.addEventListener('click', function () { var t = document.getElementById('s-text'); if (!t) return; t.value = 'Follow-up to "' + q.question + '": '; var a = document.querySelector('[data-go="askh"]'); location.hash = '#askh'; t.focus(); });
          body.appendChild(fu);
          li.appendChild(up); li.appendChild(body); qbl.appendChild(li);
        });
      }
      var tb = $('#qb-topics');
      if (tb && topics.length) { ['All'].concat(topics).forEach(function (t) { var b = el('button', 'chip' + (t === 'All' ? ' on' : ''), t); b.type = 'button';
        b.addEventListener('click', function () { cur = t === 'All' ? '' : t; [].forEach.call(tb.children, function (c) { c.classList.toggle('on', c === b); }); draw(); }); tb.appendChild(b); }); }
      draw();
    }

    /* ---- Board meetings: next meeting preview + recaps ---- */
    var bm = (d.boardmtg || []).slice().sort(function (a, b) { return (a.date || '') < (b.date || '') ? -1 : 1; });
    var today = new Date().toISOString().slice(0, 10);
    var nextM = bm.filter(function (m) { return m.kind === 'preview' && m.date >= today; })[0];
    if (nextM && $('#bm-next')) {
      var nb = $('#bm-next'); nb.innerHTML = '';
      var c = el('div', 'svl-box'); c.appendChild(el('h4', null, fmt(nextM.date) + ': ' + nextM.title));
      if (nextM.items) { var ul2 = el('ul'); nextM.items.split('\n').filter(Boolean).forEach(function (x) { ul2.appendChild(el('li', null, x.replace(/^[-•]\s*/, ''))); }); c.appendChild(ul2); }
      if (nextM.link && /^https?:\/\//i.test(nextM.link)) { var al = el('a', null, 'Official agenda'); al.href = nextM.link; al.target = '_blank'; al.rel = 'noopener'; c.appendChild(al); }
      nb.appendChild(c);
    }
    var recaps = bm.filter(function (m) { return m.kind !== 'preview'; }).reverse();
    if (recaps.length && $('#bm-recaps')) {
      var rl = $('#bm-recaps'); rl.innerHTML = '';
      recaps.forEach(function (m) { var li = el('li'); li.appendChild(el('time', null, fmt(m.date))); var dv = el('div'); dv.appendChild(el('b', null, m.title)); dv.appendChild(el('span', null, m.summary || ''));
        if (m.timestamps) dv.appendChild(el('span', 'sub', 'Student items: ' + m.timestamps));
        [['recording', 'Recording'], ['minutes', 'Minutes']].forEach(function (k) { if (m[k[0]] && /^https?:\/\//i.test(m[k[0]])) { var a = el('a', null, k[1]); a.href = m[k[0]]; a.target = '_blank'; a.rel = 'noopener'; dv.appendChild(document.createTextNode(' ')); dv.appendChild(a); } });
        li.appendChild(dv); rl.appendChild(li); });
    }
    (d.boardmtg || []).filter(function (m) { return m.vote; }).forEach(function (m) {
      var tb2 = $('#bm-votes tbody'); if (!tb2) return; var tr = el('tr'); tr.appendChild(el('td', null, fmt(m.date))); tr.appendChild(el('td', null, m.title)); tr.appendChild(el('td', null, m.vote)); tb2.appendChild(tr);
    });

    /* content warnings on/off */
    if (Array.isArray(d.cwSections)) {
      document.querySelectorAll('p.cw.heads').forEach(function (p) { var host = p.parentNode; if (d.cwSections.indexOf(host.id) < 0) p.hidden = true; });
      d.cwSections.forEach(function (id) {
        var host = document.getElementById(id); if (!host) return;
        if (host.tagName === 'H2' || host.tagName === 'H3') host = host.closest('section, article') || host;
        if (host.querySelector(':scope > p.cw')) return;
        var p = el('p', 'cw heads', 'Heads up: this section talks about serious topics. Take care while reading.');
        host.insertBefore(p, host.firstChild);
      });
    }
  }).catch(function () {});
})();
