/* ===== Round 8: three ways to view the site — Newspaper, Level map, Side menu ===== */
(function(){
  const VIEWS = ["paper", "level", "drawer"];
  const $ = id => document.getElementById(id);
  const T = (en, es) => `<span class="en">${en}</span><span class="es">${es}</span>`;
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  const ls = { get(k){ try { return localStorage.getItem(k); } catch(e){ return null; } }, set(k, v){ try { localStorage.setItem(k, v); } catch(e){} } };
  const cfg = () => (typeof SITE_CFG !== "undefined" && SITE_CFG) || {};
  const todayISO = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
  const svg = (d, s = 20) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const IC = {
    paper:'<rect x="3" y="4" width="15" height="16" rx="1"/><path d="M18 8h3v10a2 2 0 0 1-2 2"/><path d="M7 8h7M7 12h7M7 16h4"/>',
    level:'<path d="M6 19c0-4 12-3 12-8S9 7 9 4"/><circle cx="6" cy="19" r="2"/><circle cx="9" cy="4" r="2"/>',
    drawer:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>',
    menu:'<path d="M4 7h16M4 12h16M4 17h16"/>', close:'<path d="M6 6l12 12M18 6L6 18"/>',
    home:'<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>', about:'<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
    work:'<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5h6v2"/>', advocacy:'<path d="M3 11v2l13 5V6L3 11z"/><path d="M16 9a3 3 0 0 1 0 6"/>',
    school:'<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5"/>', resume:'<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/>',
    contact:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>', star:'<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>'
  };
  const VIEW_TXT = {
    paper:{ en:"Newspaper", es:"Periódico", den:"Front page with the latest news", des:"Portada con las últimas noticias" },
    level:{ en:"Level map", es:"Mapa de niveles", den:"Explore the site like a game", des:"Explora el sitio como un juego" },
    drawer:{ en:"Side menu", es:"Menú lateral", den:"Everything in one slide-out menu", des:"Todo en un menú deslizable" }
  };

  /* Tabs that exist, in order, with their labels */
  const tabList = () => [...document.querySelectorAll("#tabs a[data-group]")].map(a => ({ g:a.dataset.group, href:a.getAttribute("href"), en:(a.querySelector(".en") || a).textContent.trim(), es:(a.querySelector(".es") || a).textContent.trim() }));
  const currentGroup = () => { const id = (location.hash || "#home").slice(1); try { return groupOf(id); } catch(e){ return "home"; } };

  function current(){ const v = ls.get("zm-layout"); if (VIEWS.includes(v)) return v; const d = cfg().layout; return VIEWS.includes(d) ? d : "paper"; }

  /* ---------- View picker (top bar) ---------- */
  function buildPicker(){
    const tools = document.querySelector(".topbar .tools"); if (!tools || $("tView")) return;
    const b = document.createElement("button"); b.className = "tool"; b.id = "tView"; b.type = "button"; b.setAttribute("aria-label", "Change view"); b.setAttribute("aria-haspopup", "true"); b.setAttribute("aria-expanded", "false");
    b.innerHTML = svg(IC.paper, 16);
    const lang = tools.querySelector(".lang"); tools.insertBefore(b, lang || null);
    const pop = document.createElement("div"); pop.id = "zmViewPop"; pop.hidden = true; pop.setAttribute("role", "menu");
    pop.innerHTML = `<div class="vh">${T("View this site as", "Ver este sitio como")}</div>` + VIEWS.map(v => `<button type="button" role="menuitemradio" data-view="${v}"><span class="vi">${svg(IC[v], 18)}</span><span>${T(VIEW_TXT[v].en, VIEW_TXT[v].es)}<small>${T(VIEW_TXT[v].den, VIEW_TXT[v].des)}</small></span></button>`).join("");
    document.body.appendChild(pop);
    const close = () => { pop.hidden = true; b.setAttribute("aria-expanded", "false"); };
    b.addEventListener("click", e => { e.stopPropagation(); const r = b.getBoundingClientRect(); pop.style.top = (r.bottom + 8) + "px"; pop.style.right = Math.max(8, innerWidth - r.right) + "px"; pop.hidden = !pop.hidden; b.setAttribute("aria-expanded", String(!pop.hidden)); if (!pop.hidden) (pop.querySelector("button.on") || pop.querySelector("button")).focus(); });
    pop.addEventListener("click", e => { const x = e.target.closest("[data-view]"); if (!x) return; ls.set("zm-layout", x.dataset.view); apply(x.dataset.view); close(); b.focus(); });
    document.addEventListener("click", e => { if (!pop.hidden && !pop.contains(e.target)) close(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape" && !pop.hidden){ close(); b.focus(); } });
  }

  /* ---------- Newspaper front page ---------- */
  function renderPaper(){
    const home = $("home"); if (!home) return;
    let box = $("zmPaper"); if (!box){ box = document.createElement("div"); box.id = "zmPaper"; home.insertBefore(box, home.firstChild); }
    const t = todayISO();
    const posts = (typeof POSTS !== "undefined" ? POSTS : []).filter(p => p && p.date && p.date <= t && p.title).slice().sort((a, b) => (b.pin ? 1 : 0) - (a.pin ? 1 : 0) || b.date.localeCompare(a.date));
    const L = posts[0], s1 = posts[1], s2 = posts[2];
    const cut = (s, n) => { s = String(s || ""); return s.length > n ? s.slice(0, s.lastIndexOf(" ", n)) + "…" : s; };
    const pt = (p, k, n) => p ? T(esc(cut(p[k].en, n)), esc(cut(p[k].es || p[k].en, n))) : "";
    const dateLine = T(new Date().toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric", year:"numeric" }), new Date().toLocaleDateString("es-ES", { weekday:"long", day:"numeric", month:"long", year:"numeric" }));
    const fmt = d => { const x = new Date(d + (d.length === 7 ? "-15" : "") + "T12:00"); return T(x.toLocaleDateString("en-US", { month:"short", day:"numeric" }), x.toLocaleDateString("es-ES", { day:"numeric", month:"short" })); };
    const evs = (typeof EVENTS !== "undefined" ? EVENTS : []).filter(e => e.date >= t).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
    const imp = (typeof IMPACT !== "undefined" ? IMPACT : []).slice(0, 4);
    const strip = tabList().filter(x => x.g !== "home").map(x => `<a href="${x.href}">${T(esc(x.en), esc(x.es))}</a>`).join("");
    box.innerHTML = `<div class="np">
      <div class="top"><span>Sun Prairie, Wis.</span><span>${dateLine}</span><span>${T("Vol. 3 · No. " + posts.length, "Vol. 3 · Núm. " + posts.length)}</span></div>
      <h1 class="mast">The Zack Mark</h1>
      <div class="tagl">${T("Student · Teacher · Advocate — everything about me, in one edition", "Estudiante · Maestro · Defensor — todo sobre mí, en una edición")}</div>
      <nav class="strip" aria-label="Sections">${strip}</nav>
      <div class="grid">
        <div>
          ${L ? `<div class="kick">${T("Latest", "Lo último")} · ${fmt(L.date)}</div>
          <h2 class="lead">${pt(L, "title", 140)}</h2>
          <img class="lead-img" src="photos/advocate-banner.jpg" alt="" loading="lazy">
          <div class="cap">${T("Zack Mark, student advocate, Sun Prairie West High School", "Zack Mark, defensor estudiantil, Sun Prairie West High School")}</div>
          <p>${pt(L, "body", 320)}</p>
          <a class="more" href="#updates">${T("Read all updates →", "Leer todas las novedades →")}</a>` : ""}
          ${(s1 || s2) ? `<div class="cols">${[s1, s2].filter(Boolean).map(p => `<div class="col"><div class="kick">${fmt(p.date)}</div><h3>${pt(p, "title", 110)}</h3><p>${pt(p, "body", 150)}</p></div>`).join("")}</div>` : ""}
        </div>
        <aside class="side">
          <div class="who"><img src="photos/about.jpg" alt="Zack Mark" loading="lazy"><div><h3>${T("Who is Zack Mark?", "¿Quién es Zack Mark?")}</h3><p>${T("SPW Class of 2027. 3rd degree black belt and lead instructor. Pushing for real student voice in SPASD.", "Generación 2027 de SPW. Cinturón negro de 3er grado e instructor principal. Busco que los estudiantes tengan voz real en SPASD.")}</p><a class="more" href="#about">${T("Full profile →", "Perfil completo →")}</a></div></div>
          ${imp.length ? `<div class="box"><div class="kick">${T("By the numbers", "En cifras")}</div><div class="nums">${imp.map(i => `<div><b>${esc(i.n)}</b><span>${T(esc(i.en), esc(i.es || i.en))}</span></div>`).join("")}</div></div>` : ""}
          ${evs.length ? `<div><div class="kick">${T("Coming up", "Próximamente")}</div>${evs.map(e => `<div class="ev"><b>${fmt(e.date)}</b><span>${T(esc(e.en), esc(e.es || e.en))}</span></div>`).join("")}<a class="more" href="#calendar">${T("Full calendar →", "Calendario completo →")}</a></div>` : ""}
          <div><div class="kick">${T("Records", "Registros")}</div><h3>${T("Advocacy Records v3.1", "Registros de abogacía v3.1")}</h3><p>${T("Student Voice and ALPR, two volumes, every page searchable.", "Student Voice y ALPR, dos volúmenes, cada página con búsqueda.")}</p><a class="more" href="#records">${T("Search the records →", "Buscar en los registros →")}</a></div>
        </aside>
      </div>
      <div class="sport"><img src="photos/kc-world-cup.jpg" alt="" loading="lazy"><div><div class="kick">${T("Sports", "Deportes")}</div>${T("Barça, the World Cup in Kansas City, and my football universes.", "El Barça, el Mundial en Kansas City y mis universos de fútbol.")} <a class="more" href="#fun">${T("Sports page →", "Deportes →")}</a></div></div>
    </div>`;
  }

  /* ---------- Level map ---------- */
  let pixelFont = false;
  function loadPixel(){ if (pixelFont) return; pixelFont = true; const l = document.createElement("link"); l.rel = "stylesheet"; l.href = "https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap"; document.head.appendChild(l); }
  const visited = () => { try { return new Set(JSON.parse(ls.get("zm-visited") || "[]")); } catch(e){ return new Set(); } };
  function markVisited(){ const g = currentGroup(); if (!g || g === "home" || g === "admin") return; const v = visited(); if (!v.has(g)){ v.add(g); ls.set("zm-visited", JSON.stringify([...v])); } }
  function renderLevel(){
    const home = $("home"); if (!home) return;
    let box = $("zmLevel"); if (!box){ box = document.createElement("div"); box.id = "zmLevel"; home.insertBefore(box, home.firstChild); }
    const lv = tabList().filter(x => x.g !== "home" && x.g !== "admin");
    const seen = visited(); const done = lv.filter(x => seen.has(x.g)).length;
    const next = lv.find(x => !seen.has(x.g));
    const n = lv.length, W = 400, step = 112, H = (n + 1) * step + 40;
    const pts = [{ x:W / 2, y:50 }].concat(lv.map((_, i) => ({ x: i % 2 ? W * .26 : W * .74, y: 50 + (i + 1) * step })));
    let d = `M${pts[0].x} ${pts[0].y}`; for (let i = 1; i < pts.length; i++){ const a = pts[i - 1], b = pts[i], my = (a.y + b.y) / 2; d += ` C${a.x} ${my} ${b.x} ${my} ${b.x} ${b.y}`; }
    const pct = p => `left:${(p.x / W * 100).toFixed(2)}%;top:${(p.y / H * 100).toFixed(2)}%`;
    const meIdx = next ? lv.indexOf(next) + 1 : n;
    box.innerHTML = `<div class="lv">
      <div class="hud px"><span class="chip">ZACK MARK</span><span class="chip gold" aria-label="${done} of ${n} levels explored">${svg(IC.star, 12)} ${done}/${n}</span></div>
      <div class="intro"><h2>${T(done === n ? "You beat the game!" : "Pick a level", done === n ? "¡Ganaste el juego!" : "Elige un nivel")}</h2><p>${T(done === n ? "You've seen every part of my site. Say hi?" : "Each stop is a part of my life. Visit them all to collect every star.", done === n ? "Ya viste todo mi sitio. ¿Me saludas?" : "Cada parada es una parte de mi vida. Visítalas todas para ganar cada estrella.")}</p></div>
      <div class="map" style="aspect-ratio:${W}/${H}">
        <svg viewBox="0 0 ${W} ${H}" aria-hidden="true"><path d="${d}" fill="none" stroke="#f3e2b3" stroke-width="24" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#c9a65e" stroke-width="3" stroke-dasharray="8 10"/></svg>
        <a class="node start" href="#home" style="${pct(pts[0])}" aria-label="Start"><span class="dot">${svg(IC.home, 22)}</span><span class="lab">${T("Start", "Inicio")}</span></a>
        ${lv.map((x, i) => { const st = seen.has(x.g) ? "done" : (x === next ? "next" : ""); return `<a class="node ${st}" href="${x.href}" style="${pct(pts[i + 1])}" aria-label="Level ${i + 1}: ${esc(x.en)}${st === "done" ? " (done)" : ""}"><span class="dot">${st === "done" ? svg(IC.star, 22) : i + 1}</span><span class="lab">${T(esc(x.en), esc(x.es))}</span></a>`; }).join("")}
        <img class="me" src="photos/about.jpg" alt="" style="${pct(pts[meIdx])}" loading="lazy" decoding="async">
      </div>
      <div class="card8"><div class="t"><div class="k px">${T(next ? "NEXT LEVEL" : "BONUS LEVEL", next ? "SIGUIENTE NIVEL" : "NIVEL EXTRA")}</div><div class="n">${next ? T(esc(next.en), esc(next.es)) : T("Send me a message", "Envíame un mensaje")}</div></div><a class="play px" href="${next ? next.href : "#contact"}">${T("PLAY", "JUGAR")}</a></div>
      ${done ? `<button class="reset" type="button" id="lvReset">${T("Reset my stars", "Reiniciar estrellas")}</button>` : ""}
    </div>`;
    const r = $("lvReset"); if (r) r.onclick = () => { ls.set("zm-visited", "[]"); renderLevel(); };
  }

  /* ---------- Side menu ---------- */
  function buildDrawer(){
    if ($("zmDrawer")) return;
    const wrap = document.querySelector("header.site .wrap"); if (!wrap) return;
    const b = document.createElement("button"); b.id = "zmBurger"; b.type = "button"; b.setAttribute("aria-label", "Open menu"); b.setAttribute("aria-controls", "zmDrawer"); b.setAttribute("aria-expanded", "false"); b.innerHTML = svg(IC.menu, 22);
    wrap.insertBefore(b, wrap.firstChild);
    const bg = document.createElement("div"); bg.id = "zmDrawerBg";
    const dr = document.createElement("aside"); dr.id = "zmDrawer"; dr.setAttribute("aria-label", "Site menu"); dr.setAttribute("aria-hidden", "true"); dr.inert = true;
    document.body.append(bg, dr);
    const open = () => { fillDrawer(); document.body.classList.add("drawer-open"); dr.setAttribute("aria-hidden", "false"); dr.inert = false; b.setAttribute("aria-expanded", "true"); setTimeout(() => { const f = dr.querySelector(".g.on") || dr.querySelector("a,button"); if (f) f.focus(); }, 50); };
    const close = (back) => { document.body.classList.remove("drawer-open"); dr.setAttribute("aria-hidden", "true"); dr.inert = true; b.setAttribute("aria-expanded", "false"); if (back) b.focus(); };
    b.addEventListener("click", open); bg.addEventListener("click", () => close(true));
    dr.addEventListener("click", e => { if (e.target.closest("a")) close(); if (e.target.closest(".dx")) close(true); const lb = e.target.closest("[data-dlang]"); if (lb && typeof setLang === "function"){ setLang(lb.dataset.dlang); fillDrawer(); } });
    document.addEventListener("keydown", e => { if (e.key === "Escape" && document.body.classList.contains("drawer-open")) close(true); });
  }
  function fillDrawer(){
    const dr = $("zmDrawer"); if (!dr) return;
    const g = currentGroup(), sec = (location.hash || "#home").slice(1), lang = document.documentElement.lang;
    const groups = (typeof GROUPS !== "undefined") ? GROUPS : {};
    dr.innerHTML = `<div class="dh"><img src="logo.svg" alt="" loading="lazy" decoding="async"><div><b>Zack Mark</b><small>${T("he/him · SPW Class of 2027", "él · Generación 2027 de SPW")}</small></div><button class="dx" type="button" aria-label="Close menu">${svg(IC.close, 22)}</button></div>
      <nav aria-label="Main">${tabList().map(x => { const secs = (groups[x.g] && groups[x.g].secs) || []; const on = x.g === g;
        return `<a class="g${on ? " on" : ""}" href="${x.href}"${on ? ' aria-current="true"' : ""}>${svg(IC[x.g] || IC.home, 19)}${T(esc(x.en), esc(x.es))}</a>` +
          (on && secs.length > 1 ? `<div class="subs">${secs.map(s => `<a href="#${s}" class="${s === sec ? "on" : ""}">${T(esc((SEC_LABELS[s] || {}).en || s), esc((SEC_LABELS[s] || {}).es || s))}</a>`).join("")}</div>` : ""); }).join("")}</nav>
      <div class="dl" role="group" aria-label="Language"><button type="button" data-dlang="en" class="${lang === "en" ? "on" : ""}">EN</button><button type="button" data-dlang="es" class="${lang === "es" ? "on" : ""}">ES</button></div>`;
  }

  /* ---------- Apply ---------- */
  function apply(v){
    VIEWS.forEach(x => document.body.classList.toggle("lay-" + x, x === v));
    document.querySelectorAll("#zmViewPop [data-view]").forEach(b => { const on = b.dataset.view === v; b.classList.toggle("on", on); b.setAttribute("aria-checked", String(on)); });
    const tb = $("tView"); if (tb) tb.innerHTML = svg(IC[v], 16);
    if (v === "paper") renderPaper();
    if (v === "level"){ loadPixel(); renderLevel(); }
    if (v !== "drawer") document.body.classList.remove("drawer-open");
  }
  function refresh(){ apply(current()); if (document.body.classList.contains("drawer-open")) fillDrawer(); }
  window.ZM_layoutView = { apply, refresh, current };

  function init(){
    buildPicker(); buildDrawer(); markVisited(); apply(current());
    window.addEventListener("hashchange", () => { markVisited(); if ((location.hash || "#home") === "#home") refresh(); });
    if (typeof window.ZM_rerender === "function" && !window.ZM_rerender.__r8){ const o = window.ZM_rerender; window.ZM_rerender = function(){ const r = o.apply(this, arguments); try { refresh(); } catch(e){} return r; }; window.ZM_rerender.__r8 = 1; }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();

/* a11y: link each form label to its field so screen readers announce it and tapping the label focuses the field */
(function(){var n=0;function link(){document.querySelectorAll(".f > label:not([for])").forEach(function(l){var c=l.nextElementSibling;if(!c||!/^(INPUT|SELECT|TEXTAREA)$/.test(c.tagName))return;if(!c.id)c.id="fld-"+(c.name||"x")+"-"+(++n);l.htmlFor=c.id;});}
var t;new MutationObserver(function(){clearTimeout(t);t=setTimeout(link,120);}).observe(document.documentElement,{childList:true,subtree:true});
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",link);else link();})();
