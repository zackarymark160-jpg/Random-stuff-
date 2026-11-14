// Full-site test for SPASD Student Voice. Run against `netlify dev`:
//   netlify dev --offline --port 8888   (with SESSION_SECRET + ADMIN_PASSWORD_HASH set)
//   BASE=http://localhost:8888 ADMIN_PW=... AXE=/path/to/axe.min.js node tests/site.test.cjs
// Prints PASS/FAIL per check and writes tests/report.json.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const BASE = process.env.BASE || 'http://localhost:8888';
const PUB = path.join(__dirname, '..', 'public');
const AXE = process.env.AXE;
const ADMIN_PW = process.env.ADMIN_PW;
// Files known to be missing until they're uploaded (the guard hides them):
const KNOWN_MISSING = /reel-(fall-update|weighted-grades-timeline|ask-the-district|your-turn|join|newsletter-es|caregiver-survey-es)\.mp4|student-voice-jingle\.mp3/;
const results = []; let fails = 0;
const check = (area, name, ok, detail = '') => { results.push({ area, name, ok, detail }); if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'}  [${area}] ${name}${detail ? '  — ' + String(detail).slice(0, 400) : ''}`); };
const ignorable = t => /goatcounter|gc\.zgo\.at|favicon/i.test(t) || (/404|Failed to load resource/.test(t));

(async () => {
  const br = await chromium.launch();

  /* ---------- 1. Every page loads clean, phone + desktop ---------- */
  const pages = ['/', '/archive.html', '/reports/report-5-november-2026.html', '/weighted-grades-families.html', '/lite.html', '/lite-static.html', '/admin/'];
  for (const vp of [{ w: 390, h: 844, n: 'phone' }, { w: 1280, h: 900, n: 'desktop' }]) {
    for (const u of pages) {
      const p = await br.newPage({ viewport: { width: vp.w, height: vp.h } });
      const errs = []; p.on('pageerror', e => errs.push('JS: ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !ignorable(m.text())) errs.push(m.text()); });
      const r = await p.goto(BASE + u, { waitUntil: u.startsWith('/admin') ? 'load' : 'networkidle' }).catch(e => ({ status: () => 'ERR ' + e.message }));
      await p.waitForTimeout(500);
      const over = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      check('pages', `${u} (${vp.n}) loads`, r.status() === 200, r.status());
      check('pages', `${u} (${vp.n}) no JS errors`, errs.length === 0, errs.join(' | '));
      check('pages', `${u} (${vp.n}) no sideways scroll`, over <= 1, over > 1 ? `${over}px too wide` : '');
      await p.close();
    }
  }
  // Short links redirect into the right view
  for (const s of ['join', 'learn', 'promises', 'updates', 'mail', 'archive']) {
    const p = await br.newPage(); await p.goto(`${BASE}/s/${s}.html`, { waitUntil: 'load' }); await p.waitForTimeout(400);
    const vis = await p.evaluate(() => { const v = [...document.querySelectorAll('.view')].find(x => !x.hidden); return v && v.dataset.view; });
    check('short links', `/s/${s}.html opens a view`, !!vis, `landed on ${vis} (${p.url().replace(BASE, '')})`);
    await p.close();
  }

  /* ---------- 2. Home page: every view, every in-page link, every button ---------- */
  const p = await br.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !ignorable(m.text())) errs.push(m.text()); });
  p.on('dialog', d => d.dismiss().catch(() => {}));
  await p.goto(BASE + '/', { waitUntil: 'load' });
  const views = await p.evaluate(() => [...document.querySelectorAll('.view')].map(v => v.dataset.view));
  for (const v of views) {
    await p.goto('about:blank'); await p.goto(`${BASE}/#${v}`, { waitUntil: 'load' }); await p.waitForTimeout(400);
    const st = await p.evaluate(v => { const el = document.querySelector(`.view[data-view="${v}"]`); return { shown: el && !el.hidden, text: el ? el.innerText.trim().length : 0, over: document.documentElement.scrollWidth - innerWidth }; }, v);
    if (v === 'admin') { const fr = await p.evaluate(() => { const f = document.querySelector('.view[data-view="admin"] iframe'); return f ? (f.getAttribute('src') || f.dataset.src || '') : ''; }); check('views', '#admin shows the embedded admin panel', st.shown && /admin/.test(fr), fr); }
    else check('views', `#${v} shows with content`, st.shown && st.text > 50, `${st.text} chars`);
    check('views', `#${v} no sideways scroll (phone)`, st.over <= 1, st.over > 1 ? `${st.over}px` : '');
    if (AXE) {
      await p.addScriptTag({ path: AXE });
      const ax = await p.evaluate(async v => { const r = await axe.run(document.querySelector(`.view[data-view="${v}"]`), { resultTypes: ['violations'], runOnly: ['wcag2a', 'wcag2aa'] }); return r.violations.filter(x => ['serious', 'critical'].includes(x.impact)).map(x => `${x.id} (${x.nodes.length}): ${x.nodes[0].target.join(' ')}`); }, v);
      check('accessibility', `#${v} no serious/critical WCAG A/AA issues`, ax.length === 0, ax.join(' | '));
      if (v !== 'admin') { await p.emulateMedia({ colorScheme: 'dark' }); await p.waitForTimeout(150);
        const dk = await p.evaluate(async v => { const r = await axe.run(document.querySelector(`.view[data-view="${v}"]`), { runOnly: ['color-contrast'] }); return r.violations.flatMap(x => x.nodes.map(n => n.target[0] + ' ' + ((n.any[0] || {}).data || {}).contrastRatio)); }, v);
        await p.emulateMedia({ colorScheme: 'light' });
        check('accessibility', `#${v} text contrast OK in dark mode`, dk.length === 0, dk.slice(0, 6).join(' | ')); }
    }
  }
  // Every data-go target exists
  const gos = await p.evaluate(() => [...new Set([...document.querySelectorAll('[data-go]')].map(a => a.dataset.go))]);
  const badGo = await p.evaluate(ids => ids.filter(id => !document.getElementById(id) && !document.querySelector(`.view[data-view="${id}"]`) && !/^a-/.test(id)), gos);
  check('in-page links', `all ${gos.length} data-go targets exist`, badGo.length === 0, badGo.join(', '));
  // Every href="#x" anchor exists
  const badHash = await p.evaluate(() => [...new Set([...document.querySelectorAll('a[href^="#"]')].map(a => a.getAttribute('href').slice(1)).filter(Boolean))].filter(id => !document.getElementById(id) && !document.querySelector(`.view[data-view="${id}"]`) && !/^a-/.test(id)));
  check('in-page links', 'all #anchor links have a target', badHash.length === 0, badHash.join(', '));
  // Archive reader: every part opens with content
  await p.goto('about:blank'); await p.goto(`${BASE}/#archive`, { waitUntil: 'load' }); await p.waitForTimeout(800);
  const parts = await p.evaluate(() => [...document.querySelectorAll('.ax')].map(b => b.dataset.k));
  let emptyParts = [];
  for (const k of parts) {
    await p.evaluate(k => document.getElementById('ax-' + k)?.click() || document.querySelector(`.ax[data-k="${k}"]`).click(), k);
    await p.waitForTimeout(60);
    const len = await p.evaluate(() => document.getElementById('areader').innerText.length);
    if (len < 80) emptyParts.push(k);
  }
  check('archive', `all ${parts.length} archive parts open with content`, emptyParts.length === 0, emptyParts.join(', '));
  // Click every visible, non-submit button in every view (catch-all for broken widgets)
  for (const v of views.filter(v => v !== 'admin')) {
    await p.goto('about:blank'); await p.goto(`${BASE}/#${v}`, { waitUntil: 'load' }); await p.waitForTimeout(300);
    errs.length = 0;
    const n = await p.evaluate(v => { const root = document.querySelector(`.view[data-view="${v}"]`); let c = 0;
      root.querySelectorAll('details').forEach(d => d.open = true);
      [...root.querySelectorAll('button:not([type=submit]), [role=button]')].forEach(b => { if (b.offsetParent && !b.closest('form') && !/record|mic|voice|print|share|copy/i.test(b.textContent + (b.getAttribute('aria-label') || ''))) { try { b.click(); c++; } catch (e) {} } }); return c; }, v);
    await p.waitForTimeout(500);
    check('buttons', `#${v}: clicked ${n} buttons, no errors`, errs.length === 0, errs.join(' | '));
    await p.goto('about:blank');
  }
  // Spanish view really is Spanish
  await p.goto('about:blank'); await p.goto(`${BASE}/#es`, { waitUntil: 'load' });
  const esLang = await p.evaluate(() => { const v = document.querySelector('.view[data-view="es"]'); return (v.getAttribute('lang') || v.querySelector('[lang]')?.getAttribute('lang') || '') + ' ' + /calificaciones|estudiantes/.test(v.innerText); });
  check('spanish', 'Spanish view is marked lang="es" and has Spanish text', /^es.* true$/.test(esLang), esLang);
  // Missing-file guard
  await p.goto(`${BASE}/`, { waitUntil: 'load' }); await p.evaluate(() => document.querySelectorAll('img[loading=lazy]').forEach(i => i.loading = 'eager')); await p.waitForTimeout(2500);
  const hidden = await p.evaluate(() => [...document.querySelectorAll('[data-missing]')].map(e => (e.querySelector('video,img,a') || e).getAttribute('src') || (e.querySelector('a') || e).getAttribute('href') || e.textContent.trim().slice(0, 30)));
  const unexpected = hidden.filter(h => h && !KNOWN_MISSING.test(h) && !/Join Reel|^And the/.test(h));
  check('missing-file guard', `only the not-yet-uploaded videos/jingle are hidden (${hidden.length} hidden)`, unexpected.length === 0, unexpected.join(', '));
  const brokenImgs = await p.evaluate(() => [...document.querySelectorAll('img')].filter(i => i.complete && i.naturalWidth === 0 && !i.closest('[data-missing]') && i.offsetParent).map(i => i.getAttribute('src')));
  check('images', 'no visible broken images on home', brokenImgs.length === 0, brokenImgs.join(', '));
  await p.close();

  /* ---------- 3. Every local link and asset in every HTML file resolves ---------- */
  const htmls = ['index.html', 'archive.html', 'reports/report-5-november-2026.html', 'weighted-grades-families.html', 'lite-static.html', 'admin/index.html', ...fs.readdirSync(path.join(PUB, 's')).map(f => 's/' + f)];
  const missing = new Set(); let total = 0;
  const ctx = await br.newContext(); const req = ctx.request;
  for (const h of htmls) {
    const t = fs.readFileSync(path.join(PUB, h), 'utf8');
    const refs = [...t.matchAll(/(?:src|href|poster)=["']([^"'#?]+)/g)].map(m => m[1]).filter(u => !/^(https?:|mailto:|tel:|sms:|data:|javascript:|\/\/)/.test(u) && !u.includes('${') && u.trim());
    for (const u of new Set(refs)) {
      const abs = new URL(u, `${BASE}/${h}`).href; total++;
      const r = await req.fetch(abs, { method: 'GET', maxRedirects: 3 }).catch(() => null);
      if (!r || r.status() >= 400) { if (!KNOWN_MISSING.test(u)) missing.add(`${h} → ${u} (${r ? r.status() : 'ERR'})`); }
    }
  }
  check('links', `all ${total} local links/assets resolve (except known-missing videos)`, missing.size === 0, [...missing].join(' | '));

  /* ---------- 4. Headers from netlify.toml ---------- */
  const hd = async u => (await req.fetch(BASE + u)).headers();
  let h = await hd('/'); check('headers', 'nosniff on every page', h['x-content-type-options'] === 'nosniff', h['x-content-type-options']);
  h = await hd('/admin/'); check('headers', 'admin is noindex + no framing', /noindex/.test(h['x-robots-tag'] || '') && h['x-frame-options'] === 'SAMEORIGIN', JSON.stringify({ r: h['x-robots-tag'], f: h['x-frame-options'] }));
  // netlify dev ignores Cache-Control rules, so check the config itself for those.
  const toml = fs.readFileSync(path.join(__dirname, '..', 'netlify.toml'), 'utf8');
  check('headers', 'netlify.toml: videos/images/icons cached for a day', ['/videos/*', '/images/*', '/icons/*'].every(x => new RegExp(`for = "${x.replace('*', '\\*')}"[\\s\\S]{0,80}max-age=86400`).test(toml)));
  check('headers', 'netlify.toml: service worker never cached', /for = "\/sw\.js"[\s\S]{0,80}no-cache/.test(toml));
  check('headers', 'netlify.toml: no duplicate rules', (toml.match(/for = "\/sw\.js"/g) || []).length === 1);

  /* ---------- 5. Server endpoints ---------- */
  const get = async u => { const r = await req.fetch(BASE + u); return { s: r.status(), t: await r.text(), ct: r.headers()['content-type'] }; };
  let r = await get('/api/public'); let pub = {}; try { pub = JSON.parse(r.t); } catch {}
  check('api', '/api/public returns JSON', r.s === 200 && typeof pub === 'object', r.s);
  r = await get('/feed.xml'); check('api', '/feed.xml is valid RSS', r.s === 200 && /<rss[\s\S]*<channel>[\s\S]*<\/rss>/.test(r.t), r.ct);
  r = await get('/calendar.ics'); check('api', '/calendar.ics is a valid calendar', r.s === 200 && /^BEGIN:VCALENDAR[\s\S]*END:VCALENDAR\s*$/.test(r.t.trim() + '\n'), `${(r.t.match(/BEGIN:VEVENT/g) || []).length} events`);
  r = await get('/lite.html'); check('api', '/lite.html renders', r.s === 200 && /<html/i.test(r.t), r.s);
  const post = async (u, b, hdr = {}) => { const x = await req.fetch(BASE + u, { method: 'POST', data: b, headers: { 'content-type': 'application/json', ...hdr } }); return { s: x.status(), t: await x.text() }; };
  r = await post('/api/track', { t: 'view', v: 'test' }); check('api', 'tracking accepts a page view', r.s === 200, r.t);
  r = await post('/api/track', { t: 'hack' }); check('api', 'tracking rejects junk', r.s === 400, r.s);
  // (netlify dev retries a function 404 as "<path>.html", which then 400s; production returns the 404. Both are refusals.)
  r = await post('/api/react', { id: 'nope', r: 'up' }); check('api', 'reaction to a nonexistent update is refused', r.s === 404 || r.s === 400, r.s);
  r = await post('/api/react', { id: 'x', r: 'evil' }); check('api', 'reaction with a bad emoji type is refused', r.s === 400, r.s);
  r = await post('/api/qvote', { id: 'nope' }); check('api', 'vote on a nonexistent question is refused', r.s === 404 || r.s === 400, r.s);
  r = await post('/api/voice', { data: 'not audio' }); check('api', 'voice upload rejects non-audio', r.s === 400, r.t);
  r = await post('/api/settings', { x: 1 }); check('security', 'admin write without CSRF header is blocked', r.s === 400, r.s);
  r = await post('/api/settings', { x: 1 }, { 'x-sv': '1' }); check('security', 'admin write without login is blocked', r.s === 401 || r.s === 403, r.s);
  for (const u of ['/api/inbox', '/api/export', '/api/users', '/api/stats', '/api/files', '/api/sheet.csv']) { r = await get(u); check('security', `${u} needs login`, r.s === 401 || r.s === 403, r.s); }

  /* ---------- 6. Every form submits and shows a message ---------- */
  const fp = await br.newPage({ viewport: { width: 390, height: 844 } }); const ferrs = []; fp.on('pageerror', e => ferrs.push(e.message));
  await fp.goto(BASE + '/', { waitUntil: 'load' });
  const forms = (await fp.evaluate(() => [...document.querySelectorAll('form')].map((f, i) => ({ i, name: f.getAttribute('name') || f.id, hidden: f.hidden })))).filter(f => !f.hidden); // hidden forms only register names with Netlify
  for (const f of forms) {
    await fp.goto(BASE + '/', { waitUntil: 'load' }); ferrs.length = 0;
    let navigated = null; const onNav = fr => { if (fr === fp.mainFrame()) navigated = fr.url(); }; fp.on('framenavigated', onNav);
    const res = await fp.evaluate(async i => {
      const f = document.querySelectorAll('form')[i]; const v = f.closest('.view'); if (v) { document.querySelectorAll('.view').forEach(x => x.hidden = x !== v); }
      f.querySelectorAll('details').forEach(d => d.open = true); let d = f.closest('details'); while (d) { d.open = true; d = d.parentElement.closest('details'); }
      for (const el of f.elements) {
        if (el.name === 'bot-field' || el.type === 'hidden' || el.disabled) continue;
        if (el.type === 'radio') { if (!f.querySelector(`[name="${el.name}"]:checked`)) el.checked = true; continue; }
        if (el.type === 'checkbox') { if (el.required || !f.querySelector(`[name="${el.name}"]:checked`)) el.checked = true; continue; }
        if (el.tagName === 'SELECT') { if (el.options.length > 1) el.selectedIndex = 1; continue; }
        if (el.type === 'email') el.value = 'test@example.com'; else if (el.type === 'number') el.value = el.min || '1'; else if (el.type === 'date') el.value = '2026-12-01'; else if (el.type === 'tel') el.value = '6085550100'; else if (el.type === 'url') el.value = 'https://example.com'; else if (/^(text|search|)$/.test(el.type) || el.tagName === 'TEXTAREA') el.value = 'Automated test, please ignore';
      }
      const before = f.innerText;
      const btn = f.querySelector('[type=submit],button:not([type=button])');
      const valid = f.checkValidity();
      if (btn) btn.click(); else f.requestSubmit();
      await new Promise(r => setTimeout(r, 1800));
      const scope = f.closest('section,details,.formcard,.view') || document.body;
      const msg = [...scope.querySelectorAll('.status,[role=status],[aria-live],.ok,.err,.msg-ok,.done')].map(x => x.textContent.trim()).filter(Boolean).join(' / ');
      return { valid, msg, changed: f.innerText !== before || !document.body.contains(f) || f.hidden };
    }, f.i).catch(async e => { await fp.waitForLoadState('load').catch(() => {}); const body = await fp.evaluate(() => document.body.innerText.slice(0, 200)).catch(() => ''); return { valid: true, msg: 'NATIVE SUBMIT → ' + body.replace(/\s+/g, ' '), changed: false, native: true }; });
    fp.off('framenavigated', onNav);
    if (res.native) { check('forms', `"${f.name}" submits and confirms`, false, `form has no script handler; the browser posted it and left the page (${navigated}). ${res.msg}`); continue; }
    const okMsg = /thank|sent|got it|list|see you|saved|received|gracias|you're|done|counted|added/i.test(res.msg);
    check('forms', `"${f.name}" submits and confirms`, res.valid && ferrs.length === 0 && (okMsg || res.changed) && !/couldn|error|try again|went wrong/i.test(res.msg), `valid=${res.valid} msg="${res.msg.slice(0, 120)}" ${ferrs.join(' | ')}`);
  }
  // 👍/👎 "was this helpful" buttons post the hidden feedback form
  await fp.goto(BASE + '/#learn', { waitUntil: 'load' }); await fp.waitForTimeout(500);
  const posted = []; fp.on('request', rq => { if (rq.method() === 'POST' && new URL(rq.url()).pathname === '/') posted.push(rq.postData() || ''); });
  const thumbs = await fp.evaluate(() => { document.querySelectorAll('.view[data-view="learn"] details').forEach(d => d.open = true); const b = document.querySelector('.view[data-view="learn"] button[aria-label="This was helpful"]'); if (b) b.click(); return !!b; });
  await fp.waitForTimeout(800);
  check('forms', '👍 "helpful" button sends feedback', !!thumbs && posted.some(b => /form-name=feedback/.test(b)), thumbs ? posted.join(' | ').slice(0, 120) : 'no 👍 button found on Learn');
  await fp.close();

  /* ---------- 6b. Form → admin inbox pipeline (Netlify calls submission-created in production) ---------- */
  const marker = 'pipeline-test-' + Date.now();
  const sc = await req.fetch(BASE + '/.netlify/functions/submission-created', { method: 'POST', headers: { 'content-type': 'application/json' }, data: { payload: { id: marker, form_name: 'contact', created_at: new Date().toISOString(), data: { 'form-name': 'contact', name: 'Test', message: 'Automated test ' + marker } } } });
  check('pipeline', 'submission-created function accepts a form payload', sc.status() === 200, sc.status());
  /* ---------- 7. Admin ---------- */
  const ap = await br.newPage({ viewport: { width: 1280, height: 900 } }); const aerrs = []; ap.on('pageerror', e => aerrs.push(e.message)); ap.on('console', m => { if (m.type() === 'error' && !ignorable(m.text()) && !/401|403/.test(m.text())) aerrs.push(m.text()); });
  await ap.goto(BASE + '/admin/', { waitUntil: 'load' });
  const pw = await ap.$('input[type=password]');
  check('admin', 'admin shows a password login', !!pw);
  if (pw && ADMIN_PW) {
    await pw.fill('wrong-password-123'); await ap.keyboard.press('Enter'); await ap.waitForTimeout(1200);
    const loggedWrong = await ap.evaluate(() => !document.querySelector('input[type=password]') || !document.querySelector('input[type=password]').offsetParent);
    check('admin', 'wrong password is refused', !loggedWrong);
    await ap.fill('input[type=password]', ADMIN_PW); await ap.keyboard.press('Enter'); await ap.waitForTimeout(2500);
    const me = await ap.evaluate(async () => (await fetch('/api/me')).status);
    check('admin', 'right password logs in', me === 200, `/api/me → ${me}`);
    const navs = await ap.evaluate(() => [...document.querySelectorAll('nav button, [role=tab], .tabs button, aside button, nav a')].filter(b => b.offsetParent).map(b => b.textContent.trim()).filter(Boolean));
    let clicked = 0; aerrs.length = 0;
    for (const t of navs) { const b = await ap.$(`text="${t.replace(/"/g, '\\"')}"`); if (b) { await b.click({ timeout: 2000 }).catch(() => {}); await ap.waitForTimeout(300); clicked++; } }
    await ap.screenshot({ path: path.join(__dirname, 'admin.png') });
    check('admin', `opened ${clicked} admin sections with no errors`, aerrs.length === 0 && clicked > 0, aerrs.join(' | '));
    const inbox = await ap.evaluate(async () => { for (let i = 0; i < 3; i++) { const r = await fetch('/api/inbox'); if (r.status === 200 || i === 2) return r.status + ' ' + (await r.text()); await new Promise(z => setTimeout(z, 1000)); } });
    check('admin', 'logged-in inbox loads', /^200/.test(inbox), inbox.slice(0, 80));
    check('pipeline', 'the test form submission shows up in the admin inbox', inbox.includes(marker), '');
    const out = await ap.evaluate(async () => (await fetch('/api/logout', { method: 'POST', headers: { 'x-sv': '1' } })).status);
    const after = await ap.evaluate(async () => (await fetch('/api/me')).status);
    check('admin', 'logout ends the session', after === 401 || after === 403, `logout ${out}, then /api/me ${after}`);
  }
  await ap.close();

  /* ---------- 8. Files ---------- */
  fs.writeFileSync(path.join(__dirname, 'report.json'), JSON.stringify(results, null, 1));
  await br.close();
  console.log(`\n${results.length - fails} passed, ${fails} failed`);
})();
