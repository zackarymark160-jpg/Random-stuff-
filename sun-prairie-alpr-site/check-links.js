// Usage: node check-links.js   (run on your own computer; Node 18+)
// Checks every outside link on the site's pages, scripts and data files and prints the ones that fail.
const fs = require('fs');
const path = require('path');
const FILES = ['index.html', 'report.html', 'resources.html', 'slides.html', 'feed.xml',
  'features-views.js', 'v3-docs.js', 'v3-meet.js', 'v3-make.js', 'v3-write.js', 'data/tracker.json'];
const SKIP = /fonts\.g|schema\.org|w3\.org|sunprairiealpr\.netlify|intent|sharer|submit\?|share\?/;
const urls = new Set();
for (const f of FILES) {
  const p = path.join(__dirname, f);
  if (!fs.existsSync(p)) continue;
  for (const m of fs.readFileSync(p, 'utf8').matchAll(/https?:\/\/[^\s"'<>)\\]+/g)) {
    const u = m[0].replace(/[.,;]+$/, '').replace(/&amp;/g, '&').split('#')[0];
    if (!SKIP.test(u)) urls.add(u);
  }
}
const list = [...urls];
(async () => {
  const bad = [];
  let i = 0;
  async function worker() {
    while (i < list.length) {
      const u = list[i++];
      try {
        const r = await fetch(u, { redirect: 'follow', signal: AbortSignal.timeout(20000),
          headers: { 'User-Agent': 'Mozilla/5.0 link-check' } });
        if (r.status >= 400) bad.push(r.status + ' ' + u);
      } catch (e) { bad.push('ERR ' + u); }
    }
  }
  await Promise.all(Array.from({ length: 8 }, worker));
  console.log(bad.sort().join('\n'));
  console.log(list.length + ' links checked, ' + bad.length + ' problems. Some sites (Instagram, TikTok, news sites) block scripts, so recheck those by hand.');
})();
