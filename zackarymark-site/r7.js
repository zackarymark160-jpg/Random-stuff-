/* ===== round 7: public app picks (round 1) ===== */
(function(){
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const B = (en, es) => `<span class="en">${en}</span><span class="es">${es ?? en}</span>`;
const both = o => B(o.en, o.es);
const isEs = () => document.documentElement.lang === "es";
const LS = (k, v) => { try { if (v === undefined) return JSON.parse(localStorage.getItem(k)); localStorage.setItem(k, JSON.stringify(v)); } catch(e){ return null; } };
const today = () => new Date(Date.now() - new Date().getTimezoneOffset()*6e4).toISOString().slice(0,10);
const say = m => (typeof toast === "function" ? toast(m) : null);
async function copyText(t){ try { await navigator.clipboard.writeText(t); say(isEs() ? "Copiado" : "Copied"); } catch(e){ say(isEs() ? "Selecciona y copia" : "Select and copy it"); } }
const html = (el, s) => { const e = typeof el === "string" ? $(el) : el; if (e) e.innerHTML = s; return e; };
const add = (sel, where, s) => { const e = typeof sel === "string" ? document.querySelector(sel) : sel; if (e) e.insertAdjacentHTML(where, s); };
const card = (title, body, extra = "") => `<div class="card ${extra}">${title ? `<h3>${title}</h3>` : ""}${body}</div>`;
const li = arr => `<ul class="r7-ul">${arr.map(x => `<li>${typeof x === "string" ? x : both(x)}</li>`).join("")}</ul>`;
const ol = arr => `<ol class="r7-ol">${arr.map(x => `<li>${typeof x === "string" ? x : both(x)}</li>`).join("")}</ol>`;
const sec = (id, eyebrow, title, lede) => `<section class="view" id="${id}"><div class="pad"><div class="eyebrow">${eyebrow}</div><h2>${title}</h2>${lede ? `<p class="lede">${lede}</p>` : ""}</div><div id="${id}Body" style="margin-top:18px"></div></section>`;
const IMP = () => (typeof IMPACT !== "undefined" && IMPACT.length ? IMPACT : []);

/* ---------------- new sections (added to the page) ---------------- */
function addSections(){
  if ($("me")) return;
  const anchor = document.querySelector('section#projects'); if (!anchor) return;
  anchor.insertAdjacentHTML("beforebegin",
    sec("me", B("More about me","Más sobre mí"), B("The quick version of me","Yo, en versión rápida"), B("Bios to copy, how to say my name, FAQ and a little fun.","Biografías para copiar, cómo decir mi nombre, preguntas y algo de diversión.")) +
    sec("guide", B("Advocacy guide","Guía de abogacía"), B("How I do this — and how you can too","Cómo lo hago — y cómo puedes hacerlo tú"), B("What I've learned since January, the scripts I use, and how local government works.","Lo que aprendí desde enero, los guiones que uso y cómo funciona el gobierno local.")) +
    sec("planner", B("Senior year","Último año"), B("Senior year and college planner","Planificador de último año y universidad"), B("Checklists, tips and the teacher I want to become.","Listas, consejos y el maestro que quiero ser.")) +
    sec("site", B("About this site","Sobre este sitio"), B("Accessibility, terms and how I check facts","Accesibilidad, términos y cómo verifico datos"), ""));
  GROUPS.about.secs.splice(1, 0, "me");
  GROUPS.advocacy.secs.splice(2, 0, "guide");
  GROUPS.school.secs.splice(2, 0, "planner");
  GROUPS.site = { secs:["site"] };
  Object.assign(SEC_LABELS, { me:{en:"More about me",es:"Más sobre mí"}, guide:{en:"Guide",es:"Guía"}, planner:{en:"Planner",es:"Planificador"}, site:{en:"About this site",es:"Sobre el sitio"} });
  if (typeof ZM_GROUPS0 !== "undefined"){ ZM_GROUPS0.about.secs = GROUPS.about.secs.slice(); ZM_GROUPS0.advocacy.secs = GROUPS.advocacy.secs.slice(); ZM_GROUPS0.school.secs = GROUPS.school.secs.slice(); ZM_GROUPS0.site = { secs:["site"] }; }
  try { const v = [...document.querySelectorAll("section.view")]; if (typeof views !== "undefined" && Array.isArray(views)){ views.length = 0; v.forEach(x => views.push(x)); } } catch(e){}
  const links = document.querySelector("footer .links"); if (links) links.insertAdjacentHTML("beforeend", `<a href="#site">${B("About this site","Sobre el sitio")}</a>`);
}

/* ---------------- home ---------------- */
function home(){
  const hero = document.querySelector("#home .hero"); if (!hero || $("r7top")) return;
  const upd = (typeof SITE_CFG !== "undefined" && SITE_CFG.updated) || (typeof POSTS !== "undefined" && POSTS[0] && POSTS[0].date) || today();
  const d = new Date(upd + "T12:00");
  hero.insertAdjacentHTML("beforebegin", `<div class="r7-top" id="r7top"><span id="r7greet"></span><span class="r7-sep">·</span><span>🕒 <span id="r7clock"></span> ${B("in Sun Prairie","en Sun Prairie")}</span><span class="r7-sep">·</span><span>${B("Updated","Actualizado")} ${d.toLocaleDateString(isEs() ? "es-ES" : "en-US", { month:"short", day:"numeric", year:"numeric" })}</span></div>`);
  const tick = () => { const now = new Date(); const t = now.toLocaleTimeString(isEs() ? "es-ES" : "en-US", { timeZone:"America/Chicago", hour:"numeric", minute:"2-digit" }); html("r7clock", t);
    const h = +now.toLocaleString("en-US", { timeZone:"America/Chicago", hour:"numeric", hour12:false }); html("r7greet", h < 12 ? B("☀️ Good morning","☀️ Buenos días") : h < 18 ? B("👋 Good afternoon","👋 Buenas tardes") : B("🌙 Good evening","🌙 Buenas noches")); };
  tick(); setInterval(tick, 30000);
  const after = $("routeCard") || document.querySelector("#home .counter-row"); if (!after) return;
  const K = typeof KANBAN !== "undefined" ? KANBAN : { todo:[], doing:[], done:[] };
  const yStart = new Date(new Date().getFullYear(), 0, 1), yEnd = new Date(new Date().getFullYear() + 1, 0, 1), pct = Math.round((Date.now() - yStart) / (yEnd - yStart) * 100);
  const posts = typeof POSTS !== "undefined" ? POSTS : [];
  const meet = posts.find(p => /board|committee|council|meeting/i.test(p.title.en + p.body.en) && p.date <= today());
  const FACTS = [B("I've trained in martial arts since 2016.","Entreno artes marciales desde 2016."),B("I speak English and Spanish.","Hablo inglés y español."),B("I was at the 2026 World Cup in Kansas City.","Estuve en el Mundial 2026 en Kansas City."),B("My first job was at Renk Seed Co.","Mi primer trabajo fue en Renk Seed Co."),B("I've written 200+ emails to officials this year.","Este año escribí más de 200 correos a funcionarios."),B("I built every one of my websites myself, with AI help.","Hice todos mis sitios web, con ayuda de IA."),B("I've been to 7 countries on 4 continents.","He estado en 7 países de 4 continentes."),B("I teach kids as young as 4.","Enseño a niños desde los 4 años.")];
  after.insertAdjacentHTML("afterend", `
  <div class="r7-impact reveal in" id="r7impact"></div>
  <div class="grid g3" style="margin-top:18px">
    ${card(B("Now · Next · Later","Ahora · Después · Más tarde"), `<div class="r7-nnl"><div><b>${B("Now","Ahora")}</b>${(K.doing[0] ? both(K.doing[0]) : "—")}</div><div><b>${B("Next","Después")}</b>${(K.todo[0] ? both(K.todo[0]) : "—")}</div><div><b>${B("Later","Más tarde")}</b>${(K.todo[1] ? both(K.todo[1]) : "—")}</div></div>`)}
    ${card(B("This week I'm working on","Esta semana trabajo en"), li(K.doing.slice(0, 4)))}
    ${card(B("Featured project","Proyecto destacado"), `<p style="margin:0 0 10px">${B("<b>The District-Wide Student Council</b> — students from every middle and high school in the same room as district leaders.","<b>El Consejo Estudiantil del distrito</b> — estudiantes de todas las secundarias y preparatorias junto a los líderes del distrito.")}</p><a class="linkcard" href="#council">${B("See where it stands","Ver cómo va")} <span>→</span></a>`)}
  </div>
  <div class="grid g3" style="margin-top:14px">
    ${card(B("Did you know?","¿Sabías que…?"), `<p id="r7dyk" style="margin:0;min-height:48px"></p>`)}
    ${card(B("Meeting spotlight","Reunión destacada"), meet ? `<p style="margin:0"><b>${both(meet.title)}</b></p><small style="color:var(--muted)">${esc(meet.date)}</small><a class="linkcard" href="#updates" style="margin-top:10px">${B("Read the update","Leer la novedad")} <span>→</span></a>` : `<p class="hint">—</p>`)}
    ${card(B(`${new Date().getFullYear()} is ${pct}% done`,`${new Date().getFullYear()} va ${pct}%`), `<div class="r7-yr"><i style="width:${pct}%"></i></div><p style="margin:10px 0 0;font-size:.9rem">${B("Next up: senior year, college apps and the council's first meeting.","Lo que sigue: último año, solicitudes y la primera reunión del consejo.")}</p>`)}
  </div>
  <div class="r7-quick" style="margin-top:14px">${[["#about","👋",{en:"About",es:"Sobre mí"}],["#work","🥋",{en:"Work",es:"Trabajo"}],["#advocacy","📣",{en:"Advocacy",es:"Abogacía"}],["#records","🔎",{en:"Search records",es:"Buscar registros"}],["#planner","🎓",{en:"Senior year",es:"Último año"}],["#games","🎮",{en:"Games",es:"Juegos"}],["#resume","📄",{en:"Resume",es:"Currículum"}],["#community","🤝",{en:"Get involved",es:"Participa"}]].map(([h, i, l]) => `<a href="${h}"><span>${i}</span>${both(l)}</a>`).join("")}</div>
  <a class="r7-book" href="#community" data-book="1">🎤 ${B("Book me to speak","Invítame a hablar")}</a>
  <div class="r7-map card" style="margin-top:14px"><div class="r7-pin">📍</div><div><b>${B("Hi from Sun Prairie, Wisconsin!","¡Hola desde Sun Prairie, Wisconsin!")}</b><p style="margin:4px 0 0">${B("About 15 minutes northeast of Madison. Home of my schools, my dojo and my advocacy.","A unos 15 minutos al noreste de Madison. Aquí están mis escuelas, mi dojo y mi abogacía.")}</p></div></div>`);
  let fi = new Date().getDate() % FACTS.length; const dyk = () => { html("r7dyk", FACTS[fi]); fi = (fi + 1) % FACTS.length; }; dyk(); setInterval(dyk, 7000);
  drawImpact();
  document.querySelector("[data-book]")?.addEventListener("click", () => setTimeout(() => { const s = document.querySelector('form[name=requests] select[name=type]'); if (s){ s.value = s.options[0].value; s.scrollIntoView({ block:"center" }); } }, 300));
}
function drawImpact(){
  const box = $("r7impact"); if (!box) return;
  const list = IMP();
  box.innerHTML = `<div class="eyebrow">${B("Impact so far","Impacto hasta ahora")}</div><div class="r7-imp">${list.map(x => `<div><b data-to="${x.n}">0</b><small>${both(x)}</small></div>`).join("")}</div>`;
  const io = new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) return; io.disconnect();
    box.querySelectorAll("[data-to]").forEach(b => { const to = +b.dataset.to, t0 = performance.now(); const step = t => { const k = Math.min(1, (t - t0) / 1200); b.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))).toLocaleString(); if (k < 1) requestAnimationFrame(step); else if (to >= 100) confettiBurst(); }; requestAnimationFrame(step); }); }));
  io.observe(box);
}
let burstDone = false;
function confettiBurst(){
  if (burstDone || document.documentElement.classList.contains("rm")) return; burstDone = true;
  if (typeof confetti === "function"){ try { confetti(80); return; } catch(e){} }
}

/* ---------------- more about me ---------------- */
const BIOS = {
  short:{ en:"Zack Mark is a Sun Prairie West senior, martial arts instructor and student advocate who wants to teach high school social studies.", es:"Zack Mark es estudiante de último año en Sun Prairie West, instructor de artes marciales y defensor estudiantil que quiere enseñar estudios sociales." },
  medium:{ en:"Zackary Mark is a senior at Sun Prairie West High School (Class of 2027) and a 3rd degree black belt who leads eight martial arts classes a week. In 2026 he founded SPASD Student Voice and Sun Prairie ALPR, working with district and city leaders on student representation, weighted grades and plain-language transparency. He's bilingual in English and Spanish and plans to become a social studies teacher.", es:"Zackary Mark es estudiante de último año en Sun Prairie West High School (Generación 2027) y cinturón negro de 3er grado que dirige ocho clases de artes marciales por semana. En 2026 fundó SPASD Student Voice y Sun Prairie ALPR, trabajando con líderes del distrito y la ciudad en representación estudiantil, calificaciones ponderadas y transparencia en lenguaje sencillo. Es bilingüe y planea ser maestro de estudios sociales." },
  long:{ en:"Zackary Mark is a senior at Sun Prairie West High School (Class of 2027) in Sun Prairie, Wisconsin. He has trained in martial arts since 2016, earned his 3rd degree black belt, and leads eight classes a week for kids as young as four. He has also taught swim lessons and worked at Renk Seed Co. In January 2026 he began writing to school leaders, which grew into SPASD Student Voice: a public record of 200+ emails and 30+ meetings, a seat on the district's weighted grades work group, district newsletters for every student, and a plan for a District-Wide Student Council. He also wrote Sun Prairie ALPR, a plain-language community report on the city's license plate reader cameras, and asked the police chief for a quarterly public transparency report. He is on the Forensics Team, in AVID and SET Marketing Academy, speaks English and Spanish, and plans to study Education and Political Science.", es:"Zackary Mark es estudiante de último año en Sun Prairie West High School (Generación 2027) en Sun Prairie, Wisconsin. Entrena artes marciales desde 2016, tiene cinturón negro de 3er grado y dirige ocho clases por semana para niños desde los cuatro años. También enseñó natación y trabajó en Renk Seed Co. En enero de 2026 empezó a escribir a líderes escolares, lo que se convirtió en SPASD Student Voice: un registro público de más de 200 correos y 30 reuniones, un lugar en el grupo de calificaciones ponderadas, boletines del distrito para todos los estudiantes y un plan para un Consejo Estudiantil del distrito. También escribió Sun Prairie ALPR, un informe comunitario en lenguaje sencillo sobre las cámaras lectoras de placas, y pidió al jefe de policía un informe trimestral de transparencia. Está en el equipo de Forensics, AVID y SET Marketing Academy, habla inglés y español, y planea estudiar Educación y Ciencias Políticas." }
};
const FAQ_ME = [
  [{en:"What grade are you in?",es:"¿En qué grado estás?"},{en:"I'm a senior at Sun Prairie West, Class of 2027.",es:"Estoy en último año en Sun Prairie West, Generación 2027."}],
  [{en:"How long have you done martial arts?",es:"¿Cuánto tiempo llevas en artes marciales?"},{en:"Since 2016. I'm a 3rd degree black belt.",es:"Desde 2016. Soy cinturón negro de 3er grado."}],
  [{en:"Why do you do advocacy?",es:"¿Por qué haces abogacía?"},{en:"I kept hearing about decisions after they were made. I want students in the room before.",es:"Siempre me enteraba de las decisiones después. Quiero estudiantes presentes antes."}],
  [{en:"Are you paid for any of this?",es:"¿Te pagan por esto?"},{en:"No. Student Voice and Sun Prairie ALPR are volunteer projects.",es:"No. Student Voice y Sun Prairie ALPR son proyectos voluntarios."}],
  [{en:"Who builds your websites?",es:"¿Quién hace tus sitios?"},{en:"I plan and design them and build them with Claude, an AI assistant.",es:"Yo los planeo y diseño, y los construyo con Claude, un asistente de IA."}],
  [{en:"Can I invite you to speak?",es:"¿Puedo invitarte a hablar?"},{en:"Yes — use the request form on the Community page.",es:"Sí — usa el formulario en la página de Comunidad."}]
];
const BINGO = [{en:"Speaks Spanish",es:"Habla español"},{en:"Black belt",es:"Cinturón negro"},{en:"Barça fan",es:"Fan del Barça"},{en:"Builds websites",es:"Hace sitios web"},{en:"Went to the World Cup",es:"Fue al Mundial"},{en:"Teaches kids",es:"Enseña a niños"},{en:"Emails the Board",es:"Escribe a la Junta"},{en:"Forensics Team",es:"Equipo de Forensics"},{en:"FREE",es:"LIBRE"},{en:"Been to Peru",es:"Fue a Perú"},{en:"Class of 2027",es:"Generación 2027"},{en:"Future teacher",es:"Futuro maestro"},{en:"Makes flyers",es:"Hace volantes"},{en:"Swim instructor",es:"Instructor de natación"},{en:"Football universes",es:"Universos de fútbol"},{en:"Bi and proud",es:"Bi y orgulloso"}];
function me(){
  const b = $("meBody"); if (!b || b.dataset.done) return; b.dataset.done = 1;
  b.innerHTML = `
  <div class="r7-motto">${B("“Help people understand not just what is decided, but why.”","“Ayudar a la gente a entender no solo qué se decide, sino por qué.”")}</div>
  <div class="grid g2" style="margin-top:18px;align-items:start">
    ${card(B("Bio — pick a length","Biografía — elige el largo"), `<div class="r6-tags" id="bioLen"><button class="on" data-l="short">${B("Short","Corta")}</button><button data-l="medium">${B("Medium","Mediana")}</button><button data-l="long">${B("Long","Larga")}</button></div><p id="bioTxt"></p><button class="btn" type="button" id="bioCopy">${B("Copy bio","Copiar biografía")}</button>`)}
    <div class="stack">
      ${card(B("How to say my name","Cómo se dice mi nombre"), `<p style="font-size:1.4rem;font-family:'Source Serif 4',serif;margin:0;color:var(--navy)">ZAK-uh-ree MARK</p><p style="margin:6px 0 10px">${B("Most people call me Zack. He/him.","Casi todos me dicen Zack. Él.")}</p><button class="btn outline" type="button" id="sayName">🔊 ${B("Hear it","Escuchar")}</button>`)}
      <div class="r7-tcard"><div class="r7-tc-top"><img src="photos/hero.jpg" alt=""><div><b>ZACK MARK</b><small>${B("Advocate · Instructor","Defensor · Instructor")}</small></div></div><div class="r7-tc-stats"><div><b>10</b><small>${B("YRS TRAINING","AÑOS")}</small></div><div><b>8</b><small>${B("CLASSES/WK","CLASES/SEM")}</small></div><div><b>206</b><small>EMAILS</small></div><div><b>7</b><small>${B("COUNTRIES","PAÍSES")}</small></div></div><div class="r7-tc-foot">${B("Special move: the follow-up email","Movimiento especial: el correo de seguimiento")}</div></div>
    </div>
  </div>
  <div class="grid g2" style="margin-top:18px;align-items:start">
    ${card(B("FAQ about me","Preguntas sobre mí"), FAQ_ME.map(([q, a]) => `<details class="more" style="margin:6px 0"><summary>${both(q)}</summary><p style="margin:6px 0 10px">${both(a)}</p></details>`).join(""))}
    ${card(B("About-me bingo","Bingo sobre mí"), `<p style="margin:0 0 8px;font-size:.9rem">${B("Tap what you already knew. Get a line!","Toca lo que ya sabías. ¡Haz una línea!")}</p><div class="r7-bingo" id="bingo">${BINGO.map((x, i) => `<button type="button" data-i="${i}" class="${i === 8 ? "on" : ""}">${both(x)}</button>`).join("")}</div><p id="bingoMsg" style="font-weight:900;margin:8px 0 0"></p>`)}
  </div>
  <div class="card" style="margin-top:18px"><h3>${B("Pregúntame en español","Pregúntame en español")}</h3><p style="margin:0 0 10px">${B("Prefer Spanish? Write to me in Spanish and I'll answer in Spanish.","¿Prefieres español? Escríbeme en español y te respondo en español.")}</p>
    <form name="ask-spanish" method="POST" data-netlify="true" netlify-honeypot="bot-field" class="netlify-ajax"><input type="hidden" name="form-name" value="ask-spanish"><p class="hidden"><label>No llenar: <input name="bot-field"></label></p>
    <div class="grid g2" style="gap:0 16px"><div class="f"><label>Nombre</label><input name="name" required></div><div class="f"><label>Correo</label><input type="email" name="email" required></div></div>
    <div class="f"><label>Tu pregunta</label><textarea name="question" rows="3" required></textarea></div><button class="btn gold" type="submit">Enviar</button><div class="formMsg" aria-live="polite" style="font-weight:800;margin-top:10px"></div></form></div>`;
  let len = "short"; const drawBio = () => html("bioTxt", both(BIOS[len]));
  $("bioLen").onclick = e => { const x = e.target.closest("[data-l]"); if (!x) return; len = x.dataset.l; $("bioLen").querySelectorAll("button").forEach(y => y.classList.toggle("on", y === x)); drawBio(); }; drawBio();
  $("bioCopy").onclick = () => copyText(BIOS[len][isEs() ? "es" : "en"]);
  $("sayName").onclick = () => { try { const u = new SpeechSynthesisUtterance("Zackary Mark"); u.lang = "en-US"; u.rate = .8; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch(e){} };
  const lines = [[0,1,2,3],[4,5,6,7],[8,9,10,11],[12,13,14,15],[0,4,8,12],[1,5,9,13],[2,6,10,14],[3,7,11,15],[0,5,10,15],[3,6,9,12]];
  $("bingo").onclick = e => { const x = e.target.closest("[data-i]"); if (!x) return; x.classList.toggle("on"); const on = [...$("bingo").children].map(c => c.classList.contains("on"));
    html("bingoMsg", lines.some(l => l.every(i => on[i])) ? B("🎉 BINGO! You know me well.","🎉 ¡BINGO! Me conoces bien.") : ""); };
  wireForms(b);
}

/* ---------------- work additions ---------------- */
const JOBS = [
  { y:"2021–2023", t:{en:"Seasonal worker — Renk Seed Co.",es:"Trabajador de temporada — Renk Seed Co."}, d:{en:"My first real job. Showing up on time, physical work, and taking direction.",es:"Mi primer trabajo de verdad. Puntualidad, trabajo físico y seguir instrucciones."} },
  { y:"~2021–2024", t:{en:"Red Pants assistant instructor — Kicks Unlimited",es:"Instructor asistente Red Pants — Kicks Unlimited"}, d:{en:"About two and a half years helping lead classes. I learned how to keep a room of kids focused.",es:"Unos dos años y medio ayudando a dirigir clases. Aprendí a mantener a un grupo de niños enfocado."} },
  { y:"2024–now", t:{en:"Red Top lead instructor — Kicks Unlimited",es:"Instructor principal Red Top — Kicks Unlimited"}, d:{en:"Leading eight classes a week, ages 4 and up. Planning, stripes, and making every kid feel seen.",es:"Dirijo ocho clases por semana, desde los 4 años. Planear, dar franjas y hacer que cada niño se sienta visto."} },
  { y:"2025–2026", t:{en:"Swim instructor — Diventures",es:"Instructor de natación — Diventures"}, d:{en:"Water safety and swim basics for young kids. Patience, calm voice, small wins.",es:"Seguridad en el agua y natación básica para niños. Paciencia, voz tranquila, pequeños logros."} }
];
const RULES = [{en:"Learn every name fast — and use it.",es:"Aprende cada nombre rápido — y úsalo."},{en:"Show it, then let them try. Talk less.",es:"Muéstralo y deja que lo intenten. Habla menos."},{en:"Catch them doing something right.",es:"Atrápalos haciendo algo bien."},{en:"Keep it moving — no long lines, no waiting.",es:"Mantén el ritmo — sin filas largas ni esperas."},{en:"End on a win so they want to come back.",es:"Termina con un logro para que quieran volver."}];
const WARMUPS = [{en:"Jumping jacks with a loud count — everyone counts together",es:"Saltos con conteo en voz alta — todos cuentan juntos"},{en:"Animal walks: bear crawl, crab walk, frog jumps",es:"Caminatas de animales: oso, cangrejo, rana"},{en:"Simon says with stances",es:"Simón dice con posturas"},{en:"Mirror drill: copy your partner's blocks",es:"Ejercicio espejo: copia los bloqueos de tu pareja"},{en:"Stretch circle — each kid picks one stretch",es:"Círculo de estiramiento — cada niño elige uno"}];
const SWIM = [{en:"Kids should always swim with an adult watching — every time.",es:"Los niños siempre deben nadar con un adulto mirando — siempre."},{en:"Use a life jacket in open water and on boats.",es:"Usa chaleco salvavidas en aguas abiertas y en botes."},{en:"Teach kids to get out of the pool on their own, at the wall.",es:"Enseña a los niños a salir de la piscina solos, por la pared."},{en:"Floating on the back is a lifesaving skill — practice it.",es:"Flotar de espaldas salva vidas — practíquenlo."},{en:"Nervous kids: start with blowing bubbles and short goals.",es:"Niños nerviosos: empiecen con burbujas y metas cortas."}];
const LEAD = [{en:"Red Top lead instructor, Kicks Unlimited",es:"Instructor principal Red Top, Kicks Unlimited"},{en:"Founder, SPASD Student Voice",es:"Fundador, SPASD Student Voice"},{en:"Author, Sun Prairie ALPR community report",es:"Autor, informe comunitario Sun Prairie ALPR"},{en:"Student member, weighted grades work group",es:"Miembro estudiantil, grupo de calificaciones ponderadas"},{en:"Organizer, District-Wide Student Council",es:"Organizador, Consejo Estudiantil del distrito"},{en:"Team member, SPW Yearbook sponsorships",es:"Miembro del equipo, patrocinios del anuario SPW"},{en:"SPWHS Forensics Team since 2023",es:"Equipo de Forensics de SPWHS desde 2023"}];
function work(){
  const w = document.querySelector("section#work"); if (!w || $("r7work")) return;
  w.insertAdjacentHTML("beforeend", `<div id="r7work"><hr class="soft">
  <div class="eyebrow">${B("Work timeline","Línea de trabajo")}</div><h2>${B("Every job and what it taught me","Cada trabajo y lo que me enseñó")}</h2>
  <div class="r7-jobs">${JOBS.map(j => `<details class="r7-job"><summary><span class="tag">${j.y}</span> ${both(j.t)}</summary><p>${both(j.d)}</p></details>`).join("")}</div>
  <div class="grid g3" style="margin-top:18px;align-items:start">
    ${card(B("Teaching kids: my 5 rules","Enseñar a niños: mis 5 reglas"), ol(RULES))}
    ${card(B("Class warm-ups I use","Calentamientos que uso"), li(WARMUPS))}
    ${card(B("Water safety for families","Seguridad en el agua para familias"), li(SWIM) + `<p style="font-size:.8rem;color:var(--muted);margin:6px 0 0">${B("General tips, not a substitute for lessons.","Consejos generales, no reemplazan las clases.")}</p>`)}
  </div>
  <div class="grid g2" style="margin-top:18px;align-items:start">
    ${card(B("Leadership roles","Roles de liderazgo"), li(LEAD))}
    ${card(B("Employers and references","Empleadores y referencias"), `<form name="work-request" method="POST" data-netlify="true" netlify-honeypot="bot-field" class="netlify-ajax"><input type="hidden" name="form-name" value="work-request"><p class="hidden"><label>Don't fill this out: <input name="bot-field"></label></p>
      <div class="f"><label>${B("I'm writing about","Escribo sobre")}</label><select name="type"><option>A job opportunity</option><option>A reference request</option></select></div>
      <div class="grid g2" style="gap:0 16px"><div class="f"><label>${B("Name","Nombre")}</label><input name="name" required></div><div class="f"><label>Email</label><input type="email" name="email" required></div></div>
      <div class="f"><label>${B("Organization","Organización")}</label><input name="org"></div><div class="f"><label>${B("Details","Detalles")}</label><textarea name="details" rows="3" required></textarea></div>
      <button class="btn gold" type="submit">${B("Send","Enviar")}</button><div class="formMsg" aria-live="polite" style="font-weight:800;margin-top:10px"></div></form>`)}
  </div></div>`);
  wireForms($("r7work"));
}

/* ---------------- advocacy guide ---------------- */
const LESSONS = [{en:"One clear ask beats ten good points.",es:"Una petición clara vale más que diez buenos puntos."},{en:"Polite and persistent works. Follow up once a week, not every day.",es:"Ser amable y constante funciona. Seguimiento una vez por semana, no diario."},{en:"Write everything down — the record is your power.",es:"Escribe todo — el registro es tu fuerza."},{en:"Find out who actually decides before you ask.",es:"Averigua quién decide antes de pedir."},{en:"Say thank you in public when someone keeps a promise.",es:"Agradece en público cuando alguien cumple."},{en:"Plain words travel further than big words.",es:"Las palabras simples llegan más lejos."},{en:"Fix mistakes fast and say what you fixed.",es:"Corrige errores rápido y di qué corregiste."}];
const PREP = [{en:"Read the agenda and any attached documents.",es:"Lee la agenda y los documentos adjuntos."},{en:"Write my one ask in a single sentence.",es:"Escribo mi petición en una oración."},{en:"Bring a one-page handout with sources.",es:"Llevo una hoja con fuentes."},{en:"List 3 questions I want answered.",es:"Anoto 3 preguntas que quiero respondidas."},{en:"Practice out loud with a timer.",es:"Practico en voz alta con cronómetro."},{en:"After: send a thank-you and a written recap within 24 hours.",es:"Después: envío gracias y un resumen escrito en 24 horas."}];
const ETIQ = [{en:"Use a clear subject line: \"Request: 15-minute meeting about weighted grades\".",es:"Usa un asunto claro: \"Solicitud: reunión de 15 minutos sobre calificaciones ponderadas\"."},{en:"Open with who you are (name, grade, school).",es:"Empieza diciendo quién eres (nombre, grado, escuela)."},{en:"One ask, one paragraph, one question.",es:"Una petición, un párrafo, una pregunta."},{en:"Use a title: Dr., Principal, Chief, Mayor.",es:"Usa el título: Dr., Director, Jefe, Alcalde."},{en:"Be kind even if you disagree.",es:"Sé amable aunque no estés de acuerdo."},{en:"Wait about a week before following up.",es:"Espera una semana antes del seguimiento."},{en:"Never share other students' names without permission.",es:"Nunca compartas nombres de otros estudiantes sin permiso."}];
const SCRIPTS = [
  { t:{en:"Calling an office",es:"Llamar a una oficina"}, s:{en:"Hi, my name is [name] and I'm a student at [school]. I'm calling about [topic]. Could I leave a message for [official], or is there a good time to reach them? My number is [number]. Thank you!",es:"Hola, me llamo [nombre] y soy estudiante en [escuela]. Llamo sobre [tema]. ¿Puedo dejar un mensaje para [funcionario] o hay un buen momento para hablar? Mi número es [número]. ¡Gracias!"} },
  { t:{en:"Voicemail",es:"Buzón de voz"}, s:{en:"Hi, this is [name], a student at [school]. I'm asking you to [one ask] because [one reason]. You can reach me at [number or email]. Thank you for your time.",es:"Hola, soy [nombre], estudiante en [escuela]. Le pido que [petición] porque [razón]. Puede contactarme al [número o correo]. Gracias por su tiempo."} },
  { t:{en:"Asking for a meeting",es:"Pedir una reunión"}, s:{en:"Would you have 15 minutes in the next two weeks to talk about [topic]? I can meet in person or online, and I'll bring a one-page summary.",es:"¿Tendría 15 minutos en las próximas dos semanas para hablar sobre [tema]? Puedo reunirme en persona o en línea y llevaré un resumen de una página."} }
];
const WHO = [[{en:"Your school",es:"Tu escuela"},{en:"Class schedules, clubs, school rules, daily safety, principal decisions",es:"Horarios, clubes, reglas escolares, seguridad diaria, decisiones del director"}],[{en:"School district / Board",es:"Distrito / Junta"},{en:"Budget, grading policy (like weighted grades), calendars, superintendent, district-wide policies",es:"Presupuesto, política de calificaciones, calendarios, superintendente, políticas del distrito"}],[{en:"City of Sun Prairie",es:"Ciudad de Sun Prairie"},{en:"Police (and plate reader cameras), parks, roads, city budget, the mayor and alders",es:"Policía (y cámaras de placas), parques, calles, presupuesto municipal, alcalde y concejales"}],[{en:"State of Wisconsin",es:"Estado de Wisconsin"},{en:"Laws like Act 95, school funding formulas, revenue limits",es:"Leyes como Act 95, fórmulas de financiamiento, límites de ingresos"}]];
const GOV = [{en:"<b>Residents</b> elect the Board of Education, the mayor and alders.",es:"<b>Los residentes</b> eligen a la Junta de Educación, al alcalde y a los concejales."},{en:"<b>The Board</b> hires the superintendent and sets district policy.",es:"<b>La Junta</b> contrata al superintendente y fija la política del distrito."},{en:"<b>The superintendent</b> runs the district day to day with principals and staff.",es:"<b>El superintendente</b> dirige el distrito con directores y personal."},{en:"<b>The City Council</b> passes the city budget and local rules; committees study items first.",es:"<b>El Concejo Municipal</b> aprueba el presupuesto y reglas locales; los comités estudian primero."},{en:"<b>The police chief</b> runs the department under city leadership and policy.",es:"<b>El jefe de policía</b> dirige el departamento bajo la ciudad y sus políticas."}];
const BUDGET = [{en:"Departments (like the police) say what they need.",es:"Los departamentos (como la policía) dicen qué necesitan."},{en:"City leaders put together a proposed budget.",es:"Los líderes de la ciudad preparan un presupuesto propuesto."},{en:"Committees and the Council review it in public meetings.",es:"Los comités y el Concejo lo revisan en reuniones públicas."},{en:"Residents can comment at a public hearing or meeting.",es:"Los residentes pueden comentar en una audiencia o reunión."},{en:"The Council votes to adopt it. In 2026 the final vote is Nov 17.",es:"El Concejo vota para aprobarlo. En 2026 el voto final es el 17 de nov."}];
const VOTES = [["2026-11-17",{en:"City budget vote (includes the Axon cameras)",es:"Voto del presupuesto municipal (incluye las cámaras Axon)"}],["2026-11-17",{en:"Weighted grades follow-up with district and school leaders",es:"Seguimiento de calificaciones ponderadas con líderes"}],["2026-11-30",{en:"Weighted grades final vote (expected late November)",es:"Voto final de calificaciones ponderadas (fines de noviembre)"}]];
function guide(){
  const b = $("guideBody"); if (!b || b.dataset.done) return; b.dataset.done = 1;
  const P = typeof PROMISES_R6 !== "undefined" ? PROMISES_R6 : [];
  const sb = typeof SCOREBOARD !== "undefined" ? SCOREBOARD : [];
  b.innerHTML = `
  <div class="grid g3" id="voteCd">${VOTES.map(v => `<div class="card r7-cd" data-d="${v[0]}"><b class="r7-cdn">—</b><small>${both(v[1])}</small></div>`).join("")}</div>
  <div class="grid g2" style="margin-top:18px;align-items:start">
    ${card(B("You said, we did","Ustedes dijeron, nosotros hicimos"), `<div id="ysd"></div>`)}
    ${card(B("Wins wall","Muro de logros"), sb.filter(s => s.st === "done").map(s => `<div class="r6-li">${s.ic || "🏆"} <b>${both(s)}</b><br><small style="color:var(--muted)">${both(s.note)}</small></div>`).join("") + `<p style="font-size:.82rem;color:var(--muted);margin:8px 0 0">${B("Sources: the Records tab and Volume 1.","Fuentes: la pestaña Registro y el Volumen 1.")}</p>`)}
  </div>
  <div class="grid g3" style="margin-top:18px;align-items:start">
    ${card(B("What I've learned","Lo que he aprendido"), li(LESSONS))}
    ${card(B("How I prepare for a meeting","Cómo me preparo para una reunión"), ol(PREP))}
    ${card(B("Email etiquette for students","Cómo escribir correos a funcionarios"), li(ETIQ))}
  </div>
  <div class="card" style="margin-top:18px"><h3>${B("Scripts for calling officials","Guiones para llamar a funcionarios")}</h3><div class="grid g3">${SCRIPTS.map((s, i) => `<div><b>${both(s.t)}</b><p style="margin:6px 0 0;font-size:.92rem">${both(s.s)}</p><button type="button" class="r6-copy" data-sc="${i}">${B("Copy","Copiar")}</button></div>`).join("")}</div></div>
  <div class="card" style="margin-top:18px"><h3>${B("Who decides what?","¿Quién decide qué?")}</h3><div class="r6-table"><table><tr><th>${B("Level","Nivel")}</th><th>${B("Decides things like…","Decide cosas como…")}</th></tr>${WHO.map(w => `<tr><th scope="row">${both(w[0])}</th><td>${both(w[1])}</td></tr>`).join("")}</table></div></div>
  <div class="grid g2" style="margin-top:18px;align-items:start">
    ${card(B("How local government works","Cómo funciona el gobierno local"), `<div class="r7-flow">${GOV.map(g => `<div>${both(g)}</div>`).join("")}</div>`)}
    ${card(B("How a city budget gets approved","Cómo se aprueba un presupuesto municipal"), ol(BUDGET))}
  </div>
  <p style="font-size:.82rem;color:var(--muted)">${B("Mistakes I made and fixed are listed in the corrections log on the Records tab.","Los errores que corregí están en el registro de correcciones de la pestaña Registro.")} <a href="#records">→</a></p>`;
  const ysd = $("ysd"); if (ysd){ const kept = [["Newsletters to students",{en:"Asked Oct 20 → district agreed in writing Oct 21",es:"Pedido el 20 oct. → el distrito aceptó por escrito el 21 oct."}],["LGBTQIA+ protections",{en:"Asked → confirmed unchanged Oct 1",es:"Pedido → confirmado sin cambios el 1 oct."}],["ALPR FAQ",{en:"Asked Oct 13 → Chief sent it Oct 16",es:"Pedido el 13 oct. → el jefe lo envió el 16 oct."}],["Council meeting",{en:"Proposed Oct 29 → Dr. Reed met Nov 4",es:"Propuesto el 29 oct. → el Dr. Reed se reunió el 4 nov."}],["Student rep answer",{en:"Asked Nov 4 → answered Nov 5",es:"Pedido el 4 nov. → respondido el 5 nov."}]];
    ysd.innerHTML = kept.map(k => `<div class="r6-li">✅ <b>${esc(k[0])}</b><br><small>${both(k[1])}</small></div>`).join(""); }
  b.addEventListener("click", e => { const x = e.target.closest("[data-sc]"); if (x) copyText(SCRIPTS[+x.dataset.sc].s[isEs() ? "es" : "en"]); });
  const cd = () => b.querySelectorAll(".r7-cd").forEach(c => { const days = Math.ceil((new Date(c.dataset.d + "T12:00") - new Date()) / 864e5); c.querySelector(".r7-cdn").textContent = days > 0 ? days + (isEs() ? " días" : " days") : (isEs() ? "Ya pasó" : "Done"); });
  cd(); setInterval(cd, 60000);
}

/* ---------------- senior year planner ---------------- */
const SENIOR = [{en:"Ask teachers for recommendation letters (early fall)",es:"Pedir cartas de recomendación (principios de otoño)"},{en:"Finish the Common App / UW app",es:"Terminar la solicitud Common App / UW"},{en:"Submit the FAFSA",es:"Enviar la FAFSA"},{en:"Apply for scholarships every month",es:"Solicitar becas cada mes"},{en:"Send transcripts and test scores",es:"Enviar expedientes y puntajes"},{en:"Visit top-choice campuses",es:"Visitar los campus favoritos"},{en:"Compare financial aid offers",es:"Comparar ofertas de ayuda"},{en:"Commit by May 1",es:"Decidir antes del 1 de mayo"},{en:"Order cap and gown",es:"Pedir toga y birrete"},{en:"Thank everyone who helped",es:"Agradecer a todos los que ayudaron"}];
const BUCKET = [{en:"See the District-Wide Student Council hold its first meeting",es:"Ver la primera reunión del Consejo Estudiantil"},{en:"Speak at a Board meeting one more time",es:"Hablar una vez más en la Junta"},{en:"Go to a Barça match in person",es:"Ir a un partido del Barça en persona"},{en:"Finish a Forensics season strong",es:"Terminar fuerte la temporada de Forensics"},{en:"Teach one more belt test",es:"Dirigir un examen de cinturón más"},{en:"Make a senior-year photo book",es:"Hacer un álbum de fotos del último año"}];
const TIPS = [[{en:"Social studies",es:"Estudios sociales"},{en:"Make a timeline for every unit; connect causes to effects.",es:"Haz una línea de tiempo por unidad; conecta causas y efectos."}],[{en:"Spanish",es:"Español"},{en:"Talk out loud daily — even to yourself. Watch shows with Spanish subtitles.",es:"Habla en voz alta a diario. Mira series con subtítulos en español."}],[{en:"Math",es:"Matemáticas"},{en:"Redo the problems you got wrong, not just new ones.",es:"Rehaz los problemas que fallaste, no solo nuevos."}],[{en:"English",es:"Inglés"},{en:"Write one-sentence summaries of each chapter.",es:"Escribe un resumen de una oración por capítulo."}],[{en:"Science",es:"Ciencias"},{en:"Draw diagrams and explain them like you're teaching.",es:"Dibuja diagramas y explícalos como si enseñaras."}]];
const AP = [{en:"Start reviewing 6 weeks out, not 6 days.",es:"Empieza a repasar 6 semanas antes, no 6 días."},{en:"Do official past free-response questions and score them with the rubric.",es:"Haz preguntas oficiales de años pasados y califícalas con la rúbrica."},{en:"Time yourself on practice sections.",es:"Cronométrate en las secciones de práctica."},{en:"Make a one-page cheat sheet per unit (for studying, not the test!).",es:"Haz una hoja de resumen por unidad (para estudiar, ¡no para el examen!)."},{en:"Sleep the night before beats cramming.",es:"Dormir la noche anterior gana a estudiar de golpe."}];
const TIME = [{en:"Everything goes on one calendar — school, work, meetings.",es:"Todo va en un calendario — escuela, trabajo, reuniones."},{en:"School and business emails go out during office hours.",es:"Los correos escolares y de trabajo salen en horario de oficina."},{en:"Biggest task first, while you're fresh.",es:"La tarea más grande primero, con energía."},{en:"Short focused blocks with breaks.",es:"Bloques cortos y enfocados con descansos."},{en:"Sunday night: plan the week in 10 minutes.",es:"Domingo en la noche: planea la semana en 10 minutos."}];
const APPS = [["Aug–Sep",{en:"Make your college list; ask for recommendation letters",es:"Haz tu lista; pide cartas de recomendación"}],["Oct",{en:"FAFSA opens; finish essays",es:"Abre la FAFSA; termina ensayos"}],["Nov",{en:"Early deadlines (often Nov 1–15)",es:"Fechas tempranas (a menudo 1–15 nov.)"}],["Dec–Feb",{en:"Regular deadlines; scholarships",es:"Fechas regulares; becas"}],["Mar–Apr",{en:"Decisions and aid offers arrive",es:"Llegan decisiones y ofertas de ayuda"}],["May 1",{en:"National decision day",es:"Día nacional de decisión"}]];
const ESSAY = [{en:"Tell one specific story, not your whole life.",es:"Cuenta una historia específica, no toda tu vida."},{en:"Show what you did and what changed in you.",es:"Muestra qué hiciste y qué cambió en ti."},{en:"Write like you talk, then cut 20%.",es:"Escribe como hablas y luego recorta un 20%."},{en:"Have one adult and one friend read it.",es:"Que lo lean un adulto y un amigo."}];
const SCHOL = [{en:"Check your school counseling office's list first.",es:"Revisa primero la lista de tu consejería."},{en:"Local awards (banks, clubs, businesses) have fewer applicants.",es:"Los premios locales tienen menos solicitantes."},{en:"Reuse and adapt your best essays.",es:"Reutiliza y adapta tus mejores ensayos."},{en:"Track deadlines in one place.",es:"Anota todas las fechas en un lugar."},{en:"Never pay to apply for a scholarship.",es:"Nunca pagues por solicitar una beca."}];
const VISIT = [{en:"Sit in on a class in your major",es:"Asiste a una clase de tu carrera"},{en:"Eat in the dining hall",es:"Come en el comedor"},{en:"Ask current students what they'd change",es:"Pregunta a estudiantes qué cambiarían"},{en:"Visit the education department",es:"Visita el departamento de educación"},{en:"Ask about student teaching placements",es:"Pregunta por las prácticas docentes"},{en:"Write notes right after the visit",es:"Toma notas justo después"}];
const MAJORS = [[{en:"Education (Secondary Social Studies)",es:"Educación (Estudios Sociales)"},{en:"How people learn, classroom practice, student teaching; leads to a teaching license.",es:"Cómo se aprende, práctica en el aula, prácticas docentes; lleva a una licencia."}],[{en:"Political Science",es:"Ciencias Políticas"},{en:"Government, law, public policy, elections; great for civics teaching and policy work.",es:"Gobierno, derecho, política pública, elecciones; ideal para enseñar civismo y política."}],[{en:"Spanish (minor)",es:"Español (subespecialidad)"},{en:"Advanced language, literature and culture; helps teach and advocate for families.",es:"Lengua, literatura y cultura avanzadas; ayuda a enseñar y abogar por familias."}]];
const SYLLABUS = [{en:"Unit 1 — Who decides? Local government and you",es:"Unidad 1 — ¿Quién decide? El gobierno local y tú"},{en:"Unit 2 — Rights and responsibilities",es:"Unidad 2 — Derechos y responsabilidades"},{en:"Unit 3 — Following the money: budgets",es:"Unidad 3 — Sigue el dinero: presupuestos"},{en:"Unit 4 — Technology, privacy and the law",es:"Unidad 4 — Tecnología, privacidad y ley"},{en:"Unit 5 — Media literacy and checking sources",es:"Unidad 5 — Medios y verificación de fuentes"},{en:"Final project — Bring a real ask to a real official",es:"Proyecto final — Lleva una petición real a un funcionario real"}];
const LESSON = [{en:"Warm-up (5 min): \"Who should decide your school's phone rule?\"",es:"Inicio (5 min): \"¿Quién debería decidir la regla de celulares?\""},{en:"Mini-lesson (10 min): school, district, city, state — who does what",es:"Mini-lección (10 min): escuela, distrito, ciudad, estado — quién hace qué"},{en:"Group work (20 min): sort 12 real decisions into the right level",es:"Trabajo en grupo (20 min): clasifica 12 decisiones reales"},{en:"Share-out (10 min): one surprise from each group",es:"Puesta en común (10 min): una sorpresa por grupo"},{en:"Exit ticket (5 min): write one email subject line to the right person",es:"Cierre (5 min): escribe un asunto de correo para la persona correcta"}];
const BOOKS = [["The First Days of School","Harry K. Wong & Rosemary T. Wong"],["Teach Like a Champion","Doug Lemov"],["Pedagogy of the Oppressed","Paulo Freire"],["Lies My Teacher Told Me","James W. Loewen"],["We Want to Do More Than Survive","Bettina L. Love"]];
function planner(){
  const b = $("plannerBody"); if (!b || b.dataset.done) return; b.dataset.done = 1;
  const grad = (typeof GRAD_DATE !== "undefined" && GRAD_DATE) || "";
  const st = LS("zm-senior") || {};
  b.innerHTML = `
  <div class="card r7-grad"><div><div class="eyebrow">${B("Class of 2027","Generación 2027")}</div><b id="gradCd">—</b><small id="gradSub"></small></div><div class="r7-yr" style="flex:1"><i id="gradBar"></i></div></div>
  <div class="grid g2" style="margin-top:18px;align-items:start">
    ${card(B("Senior year to-do","Pendientes del último año"), `<div id="srList">${SENIOR.map((s, i) => `<label class="r6-opt"><input type="checkbox" data-i="${i}" ${st[i] ? "checked" : ""}> ${both(s)}</label>`).join("")}</div><small style="color:var(--muted)">${B("Your checks save on this device.","Tus marcas se guardan en este dispositivo.")}</small>`)}
    ${card(B("Senior year bucket list","Lista de deseos del último año"), li(BUCKET))}
  </div>
  <div class="card" style="margin-top:18px"><h3>${B("Study tips by subject","Consejos por materia")}</h3><div class="r6-table"><table>${TIPS.map(t => `<tr><th scope="row">${both(t[0])}</th><td>${both(t[1])}</td></tr>`).join("")}</table></div></div>
  <div class="grid g3" style="margin-top:18px;align-items:start">${card(B("AP exam prep","Preparación AP"), li(AP))}${card(B("How I manage my time","Cómo manejo mi tiempo"), li(TIME))}${card(B("College essay tips","Consejos para ensayos"), li(ESSAY))}</div>
  <div class="card" style="margin-top:18px"><h3>${B("College application timeline","Calendario de solicitudes")}</h3><div class="r6-tl">${APPS.map(a => `<div><b>${a[0]}</b> — ${both(a[1])}</div>`).join("")}</div><p style="font-size:.82rem;color:var(--muted);margin:10px 0 0">${B("Always check each school's real deadlines.","Revisa siempre las fechas reales de cada universidad.")}</p></div>
  <div class="grid g2" style="margin-top:18px;align-items:start">${card(B("Scholarship search tips","Consejos para buscar becas"), li(SCHOL))}${card(B("Campus visit checklist","Lista para visitar campus"), li(VISIT))}</div>
  <div class="card" style="margin-top:18px"><h3>${B("Majors I'm considering","Carreras que considero")}</h3><div class="grid g3">${MAJORS.map(m => `<div class="r7-major"><b>${both(m[0])}</b><p style="margin:6px 0 0;font-size:.92rem">${both(m[1])}</p></div>`).join("")}</div></div>
  <hr class="soft">
  <div class="eyebrow">${B("The teacher I want to be","El maestro que quiero ser")}</div><h2>${B("My future classroom","Mi futuro salón")}</h2>
  <div class="grid g2" style="margin-top:14px;align-items:start">
    ${card(B("Dream class: \"Civics in Real Life\" — mock syllabus","Clase soñada: \"Civismo en la vida real\" — temario"), ol(SYLLABUS))}
    ${card(B("A lesson I'd teach (50 minutes)","Una clase que daría (50 minutos)"), ol(LESSON))}
    ${card(B("Future classroom vision","Visión de mi salón"), li([{en:"Desks in groups, not rows",es:"Mesas en grupos, no en filas"},{en:"A wall of real letters students sent to officials",es:"Un muro con cartas reales a funcionarios"},{en:"Bilingual signs and books",es:"Carteles y libros bilingües"},{en:"A 'question of the day' board",es:"Un pizarrón con la 'pregunta del día'"},{en:"Every student's name pronounced right",es:"El nombre de cada estudiante bien pronunciado"}]))}
    ${card(B("Books for future teachers","Libros para futuros maestros"), `<ul class="r7-ul">${BOOKS.map(x => `<li><b>${esc(x[0])}</b> — ${esc(x[1])}</li>`).join("")}</ul>`)}
  </div>
  ${card(B("Where I'll be in 5 years","Dónde estaré en 5 años"), `<p style="margin:0">${B("Finishing a degree in Education and Political Science, student teaching social studies, still speaking up for students — and still training.","Terminando una carrera en Educación y Ciencias Políticas, haciendo prácticas de estudios sociales, alzando la voz por los estudiantes — y entrenando.")}</p>`, "r7-mt")}`;
  $("srList").addEventListener("change", e => { const i = e.target.dataset.i; const s = LS("zm-senior") || {}; s[i] = e.target.checked; LS("zm-senior", s); });
  const gd = grad ? new Date(grad) : new Date("2027-06-01T12:00:00"); const start = new Date("2026-09-01T08:00:00");
  const tick = () => { const days = Math.max(0, Math.ceil((gd - new Date()) / 864e5)); html("gradCd", `${days} ${isEs() ? "días" : "days"}`); html("gradSub", grad ? B("until graduation","hasta la graduación") : B("until June 2027 (about — date TBA)","hasta junio de 2027 (aprox. — fecha por anunciar)"));
    $("gradBar").style.width = Math.min(100, Math.max(0, (new Date() - start) / (gd - start) * 100)) + "%"; };
  tick();
}

/* ---------------- builds additions ---------------- */
const TOOLS = [["Netlify",{en:"Hosting and forms",es:"Hosting y formularios"}],["Claude",{en:"AI assistant that writes the code with me",es:"Asistente de IA que escribe el código conmigo"}],["HTML, CSS, JavaScript",{en:"The building blocks",es:"Los bloques básicos"}],["Canva",{en:"Flyers and graphics",es:"Volantes y gráficos"}],["Google Docs & Sheets",{en:"Reports and trackers",es:"Informes y seguimiento"}],["Instagram",{en:"Sharing updates",es:"Compartir novedades"}]];
const PROCESS = [{en:"Who is it for and what should they do?",es:"¿Para quién es y qué deben hacer?"},{en:"Write the words first",es:"Escribe el texto primero"},{en:"Sketch the layout on paper",es:"Dibuja el diseño en papel"},{en:"Pick 2–3 colors and 2 fonts",es:"Elige 2–3 colores y 2 fuentes"},{en:"Build, then test on a phone",es:"Construye y prueba en un celular"},{en:"Ask someone else to try it",es:"Pide a alguien que lo pruebe"},{en:"Fix, publish, keep improving",es:"Corrige, publica y sigue mejorando"}];
const PALETTES = [["This site",["#0b2545","#2563c9","#f2b705","#f5f7fa","#1b2430"]],["Barça theme",["#004d98","#a50044","#edbb00","#f7e3ec","#1b2430"]],["Sun Prairie theme",["#1b7f5a","#e85d04","#ffe8d9","#e3f4ec","#1b2430"]]];
const A11Y = [{en:"Every image has alt text",es:"Cada imagen tiene texto alternativo"},{en:"Text has strong color contrast",es:"El texto tiene buen contraste"},{en:"Works with only a keyboard",es:"Funciona solo con teclado"},{en:"Buttons say what they do",es:"Los botones dicen lo que hacen"},{en:"Big enough tap targets on phones",es:"Botones grandes en celulares"},{en:"Respects reduce-motion settings",es:"Respeta la opción de menos movimiento"},{en:"Readable in two languages",es:"Se lee en dos idiomas"}];
const TUTS = [[{en:"1. Your first web page",es:"1. Tu primera página"},"<h1>Hello!</h1>\n<p>This is my first page.</p>"],[{en:"2. Add color with CSS",es:"2. Agrega color con CSS"},"<style>h1{color:#2563c9}</style>\n<h1>Blue title</h1>"],[{en:"3. Make a button work",es:"3. Haz que un botón funcione"},"<button onclick=\"this.textContent='Clicked!'\">Click me</button>"],[{en:"4. A simple card",es:"4. Una tarjeta simple"},"<div style=\"border:1px solid #ccc;border-radius:12px;padding:16px;max-width:260px\">\n  <h3>Card title</h3><p>Card text.</p>\n</div>"]];
const TEMPLATE = `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>My club</title>\n<style>\nbody{font-family:system-ui,sans-serif;margin:0;color:#1b2430}\nheader{background:#0b2545;color:#fff;padding:40px 20px;text-align:center}\nmain{max-width:720px;margin:0 auto;padding:20px}\n.card{border:1px solid #dde3ea;border-radius:14px;padding:18px;margin:14px 0}\n</style>\n</head>\n<body>\n<header><h1>My Club</h1><p>We meet Tuesdays after school.</p></header>\n<main>\n<div class="card"><h2>About us</h2><p>Write what your club does.</p></div>\n<div class="card"><h2>Join</h2><p>Email us at club@example.com</p></div>\n</main>\n</body>\n</html>`;
function builds(){
  const w = document.querySelector("section#builds"); if (!w || $("r7builds")) return;
  w.insertAdjacentHTML("beforeend", `<div id="r7builds"><hr class="soft">
  <div class="grid g2" style="align-items:start">
    ${card(B("Tools I use","Herramientas que uso"), TOOLS.map(t => `<div class="r6-li"><b>${esc(t[0])}</b> — ${both(t[1])}</div>`).join(""))}
    ${card(B("My design process","Mi proceso de diseño"), ol(PROCESS))}
  </div>
  <div class="grid g2" style="margin-top:18px;align-items:start">
    ${card(B("Color palettes","Paletas de color"), PALETTES.map(p => `<div style="margin:8px 0"><b>${esc(p[0])}</b><div class="r7-pal">${p[1].map(c => `<button type="button" style="background:${c}" data-c="${c}" title="${c}" aria-label="Copy ${c}"></button>`).join("")}</div></div>`).join("") + `<small style="color:var(--muted)">${B("Tap a color to copy it.","Toca un color para copiarlo.")}</small>`)}
    ${card(B("Logo gallery","Galería de logos"), `<div class="r7-logos"><img src="logo.svg" alt="ZM seal logo"><img src="logo-mark.svg" alt="ZM mark"></div>`)}
  </div>
  <div class="grid g2" style="margin-top:18px;align-items:start">
    ${card(B("Accessibility checklist I follow","Lista de accesibilidad que sigo"), li(A11Y))}
    ${card(B("Free template for students","Plantilla gratis para estudiantes"), `<p style="margin:0 0 10px">${B("A one-page club website. Copy it, paste it into a file called index.html, and change the words.","Un sitio de una página para tu club. Cópialo en un archivo index.html y cambia el texto.")}</p><button class="btn" type="button" id="tplCopy">${B("Copy template","Copiar plantilla")}</button>`)}
  </div>
  <div class="card" style="margin-top:18px"><h3>${B("Mini web tutorials + playground","Mini tutoriales + zona de práctica")}</h3>
    <div class="r6-tags" id="tutTabs">${TUTS.map((t, i) => `<button type="button" data-t="${i}" class="${i ? "" : "on"}">${both(t[0])}</button>`).join("")}</div>
    <div class="r7-play"><textarea id="playCode" spellcheck="false" aria-label="HTML code"></textarea><iframe id="playOut" title="Result" sandbox="allow-scripts"></iframe></div>
    <small style="color:var(--muted)">${B("Edit the code on the left — the result updates on the right.","Edita el código a la izquierda — el resultado cambia a la derecha.")}</small></div>
  <div class="card" style="margin-top:18px"><h3>${B("How I made this site","Cómo hice este sitio")}</h3>${ol([{en:"Listed everything I wanted people to know about me",es:"Hice una lista de todo lo que quería contar"},{en:"Decided what stays private (no students' names, no private messages)",es:"Decidí qué queda privado (sin nombres de estudiantes ni mensajes privados)"},{en:"Picked a clean civic look: navy, blue and gold",es:"Elegí un estilo cívico: azul marino, azul y dorado"},{en:"Built it with Claude in rounds, testing every round",es:"Lo construí con Claude por rondas, probando cada ronda"},{en:"Added English and Spanish to everything",es:"Agregué inglés y español a todo"},{en:"Added an admin so I can update it myself",es:"Agregué un panel para actualizarlo yo mismo"}])}</div></div>`);
  $("tplCopy").onclick = () => copyText(TEMPLATE);
  w.querySelector(".r7-pal")?.closest(".card").addEventListener("click", e => { const c = e.target.closest("[data-c]"); if (c) copyText(c.dataset.c); });
  const code = $("playCode"), out = $("playOut"); let t;
  const run = () => { out.srcdoc = code.value; };
  const load = i => { code.value = TUTS[i][1]; run(); $("tutTabs").querySelectorAll("button").forEach((b, j) => b.classList.toggle("on", j === i)); };
  $("tutTabs").onclick = e => { const b = e.target.closest("[data-t]"); if (b) load(+b.dataset.t); };
  code.oninput = () => { clearTimeout(t); t = setTimeout(run, 300); }; load(0);
}

/* ---------------- games additions ---------------- */
const WI = [["What is Wisconsin's capital?",["Madison","Milwaukee","Green Bay","Sun Prairie"],0],["Wisconsin's nickname is…",["America's Dairyland","The Sunshine State","The Golden State","The Lone Star State"],0],["Wisconsin's state animal is the…",["Badger","Bear","Moose","Eagle"],0],["Which famous artist was born in Sun Prairie?",["Georgia O'Keeffe","Frida Kahlo","Andy Warhol","Bob Ross"],0],["Sun Prairie's famous weather forecaster is…",["Jimmy the Groundhog","Punxsutawney Phil","Wally the Walleye","Benny the Badger"],0],["Which Great Lakes touch Wisconsin?",["Michigan and Superior","Erie and Ontario","Huron only","None"],0]];
const WORDS_WS = ["PRAIRIE","GROUNDHOG","BADGER","MADISON","CHEESE","SCHOOL","KICKS","VOICE"];
const EMOJI = [["⚽🏟️🇪🇸🏆","Barça wins a trophy at the stadium"],["🥋👦⬆️🎗️","A kid earns a new belt stripe"],["✉️🏛️🗳️✅","An email to the Board leads to a vote that passes"],["✈️🇵🇪⛰️📸","A trip to Peru to photograph the mountains"],["🚗📷🔒📊","Plate reader cameras, privacy and a transparency report"]];
const FACTWHEEL = [{en:"I started martial arts in 2016.",es:"Empecé artes marciales en 2016."},{en:"My first job was at a seed company.",es:"Mi primer trabajo fue en una empresa de semillas."},{en:"I saw the World Cup in Kansas City.",es:"Vi el Mundial en Kansas City."},{en:"I've been to Mozambique and Zimbabwe.",es:"He estado en Mozambique y Zimbabue."},{en:"I made my own football club: Atlètic Barceloneta.",es:"Creé mi propio club: Atlètic Barceloneta."},{en:"I'm on the Forensics Team.",es:"Estoy en el equipo de Forensics."},{en:"I want to teach social studies.",es:"Quiero enseñar estudios sociales."},{en:"I wrote a report in three languages.",es:"Escribí un informe en tres idiomas."}];
function games(){
  const g = document.querySelector("section#games"); if (!g || $("r7games")) return;
  if (typeof QUIZZES_R6 !== "undefined") QUIZZES_R6.wi = WI;
  const sel = $("qzSel"); if (sel && !sel.querySelector('[value=wi]')) sel.insertAdjacentHTML("beforeend", `<option value="wi">Wisconsin trivia</option>`);
  g.insertAdjacentHTML("beforeend", `<div id="r7games" class="grid g2" style="margin-top:18px;align-items:start">
    ${card(B("Typing speed","Velocidad de escritura"), `<p id="tyTarget" class="r7-ty"></p><input id="tyIn" placeholder="${isEs() ? "Empieza a escribir…" : "Start typing…"}" autocomplete="off" spellcheck="false"><p id="tyOut" style="font-weight:800;margin:8px 0 0"></p>`)}
    ${card(B("Memory match","Memoria"), `<div class="r7-mem" id="mem"></div><p id="memOut" style="font-weight:800;margin:8px 0 0"></p>`)}
    ${card(B("Word search: Sun Prairie","Sopa de letras: Sun Prairie"), `<div class="r7-ws" id="ws"></div><p id="wsWords" style="font-size:.85rem;margin:8px 0 0"></p>`)}
    ${card(B("Formation builder","Arma tu alineación"), `<select id="fmSel" style="max-width:160px"><option>4-3-3</option><option>4-4-2</option><option>3-5-2</option><option>4-2-3-1</option></select><div class="r7-pitch" id="pitch"></div><small style="color:var(--muted)">${B("Tap a spot to type a player name.","Toca un lugar para escribir un jugador.")}</small>`)}
    ${card(B("Fun-fact wheel","Ruleta de datos"), `<div class="r7-wheel" id="wheel">🎡</div><button class="btn" type="button" id="spin">${B("Spin","Girar")}</button><p id="wheelOut" style="font-weight:800;margin:10px 0 0"></p>`)}
    ${card(B("Emoji story","Historia con emojis"), `<p id="emo" style="font-size:2rem;margin:0"></p><button class="btn outline" type="button" id="emoShow">${B("Show answer","Ver respuesta")}</button> <button class="btn outline" type="button" id="emoNext">→</button><p id="emoAns" style="margin:8px 0 0"></p>`)}
    ${card(B("Which football universe next?","¿Qué universo de fútbol sigue?"), `<form name="universe-poll" method="POST" data-netlify="true" netlify-honeypot="bot-field" class="netlify-ajax"><input type="hidden" name="form-name" value="universe-poll"><p class="hidden"><label>Don't fill this out: <input name="bot-field"></label></p>
      ${["Atlètic Barceloneta","Como 1907","Real Madrid 1999/2000","Man United","Something new"].map((u, i) => `<label class="r6-opt"><input type="radio" name="pick" value="${u}" ${i ? "" : "required"}> ${u}</label>`).join("")}<button class="btn" type="submit" style="margin-top:6px">${B("Vote","Votar")}</button><div class="formMsg" aria-live="polite" style="font-weight:800;margin-top:10px"></div></form>`)}
    ${card(B("8-bit mode","Modo 8 bits"), `<p style="margin:0 0 10px">${B("Make the whole site look like a retro video game.","Haz que todo el sitio parezca un videojuego retro.")}</p><button class="btn gold" type="button" id="bit8">🕹️ ${B("Toggle 8-bit","Activar 8 bits")}</button>`)}
  </div>`);
  // typing
  const lines = ["Visca el Barça and visca Sun Prairie.","Students deserve a seat at the table.","Practice your form a little every day."];
  let tyStart = 0, ty = lines[Math.floor(Math.random() * lines.length)]; html("tyTarget", esc(ty));
  $("tyIn").oninput = e => { const v = e.target.value; if (!tyStart) tyStart = performance.now(); if (v === ty){ const s = (performance.now() - tyStart) / 1000; const wpm = Math.round(ty.split(" ").length / s * 60); html("tyOut", `${wpm} WPM`); const best = Math.max(LS("zm-wpm") || 0, wpm); LS("zm-wpm", best); e.target.value = ""; tyStart = 0; ty = lines[Math.floor(Math.random() * lines.length)]; html("tyTarget", esc(ty)); } else $("tyIn").classList.toggle("bad", !ty.startsWith(v)); };
  // memory
  const pics = ["photos/hero.jpg","photos/kicks-demo.jpg","photos/kc-world-cup.jpg","photos/advocate-banner.jpg","photos/about.jpg","photos/plane.jpg"];
  const deck = [...pics, ...pics].map(v => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map(x => x[1]); let open = [], found = 0, moves = 0;
  html("mem", deck.map((p, i) => `<button type="button" data-i="${i}" aria-label="Card"><img src="${p}" alt=""></button>`).join(""));
  $("mem").onclick = e => { const c = e.target.closest("[data-i]"); if (!c || c.classList.contains("up") || open.length === 2) return; c.classList.add("up"); open.push(c);
    if (open.length === 2){ moves++; const [a, b2] = open; if (deck[a.dataset.i] === deck[b2.dataset.i]){ found++; open = []; if (found === pics.length) html("memOut", `🎉 ${moves} ${isEs() ? "movimientos" : "moves"}`); } else setTimeout(() => { a.classList.remove("up"); b2.classList.remove("up"); open = []; }, 800); } };
  // word search
  const N = 10, grid = Array.from({ length:N }, () => Array(N).fill("")); const placed = [];
  WORDS_WS.forEach(w => { for (let tries = 0; tries < 200; tries++){ const dir = Math.random() < .5 ? [0,1] : [1,0]; const r = Math.floor(Math.random() * (N - (dir[0] ? w.length : 0))), c = Math.floor(Math.random() * (N - (dir[1] ? w.length : 0)));
    if ([...w].every((ch, k) => !grid[r + dir[0]*k][c + dir[1]*k] || grid[r + dir[0]*k][c + dir[1]*k] === ch)){ [...w].forEach((ch, k) => grid[r + dir[0]*k][c + dir[1]*k] = ch); placed.push({ w, cells:[...w].map((_, k) => (r + dir[0]*k) * N + c + dir[1]*k) }); break; } } });
  const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"; html("ws", grid.flat().map((ch, i) => `<button type="button" data-i="${i}">${ch || A[Math.floor(Math.random() * 26)]}</button>`).join(""));
  const sel2 = new Set(), foundW = new Set(); const drawW = () => html("wsWords", placed.map(p => foundW.has(p.w) ? `<s>${p.w}</s>` : p.w).join(" · "));
  $("ws").onclick = e => { const x = e.target.closest("[data-i]"); if (!x) return; const i = +x.dataset.i; sel2.has(i) ? sel2.delete(i) : sel2.add(i); x.classList.toggle("sel");
    placed.forEach(p => { if (!foundW.has(p.w) && p.cells.every(c => sel2.has(c))){ foundW.add(p.w); p.cells.forEach(c => { $("ws").children[c].classList.add("hit"); }); drawW(); } }); };
  drawW();
  // formation
  const F = { "4-3-3":[[1],[4],[3],[3]], "4-4-2":[[1],[4],[4],[2]], "3-5-2":[[1],[3],[5],[2]], "4-2-3-1":[[1],[4],[2],[3],[1]] };
  const names = LS("zm-xi") || {};
  const drawF = () => { const f = F[$("fmSel").value]; html("pitch", f.slice().reverse().map((row, ri) => `<div class="row">${Array.from({ length:row[0] }, (_, k) => { const key = $("fmSel").value + ":" + ri + ":" + k; return `<button type="button" data-k="${key}">${esc(names[key] || "＋")}</button>`; }).join("")}</div>`).join("")); };
  $("fmSel").onchange = drawF; drawF();
  $("pitch").onclick = e => { const x = e.target.closest("[data-k]"); if (!x) return; const v = prompt(isEs() ? "Nombre del jugador" : "Player name", names[x.dataset.k] || ""); if (v == null) return; names[x.dataset.k] = v.slice(0, 14); LS("zm-xi", names); drawF(); };
  // wheel
  $("spin").onclick = () => { const w = $("wheel"); w.classList.remove("go"); void w.offsetWidth; w.classList.add("go"); setTimeout(() => html("wheelOut", both(FACTWHEEL[Math.floor(Math.random() * FACTWHEEL.length)])), 900); };
  // emoji
  let ei = 0; const drawE = () => { html("emo", EMOJI[ei][0]); html("emoAns", ""); }; drawE();
  $("emoShow").onclick = () => html("emoAns", esc(EMOJI[ei][1])); $("emoNext").onclick = () => { ei = (ei + 1) % EMOJI.length; drawE(); };
  // 8-bit
  if (LS("zm-8bit")) document.documentElement.classList.add("bit8");
  $("bit8").onclick = () => { const on = document.documentElement.classList.toggle("bit8"); LS("zm-8bit", on); if (!document.getElementById("pressStart")){ const l = document.createElement("link"); l.id = "pressStart"; l.rel = "stylesheet"; l.href = "https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap"; document.head.append(l); } };
  if (LS("zm-8bit") && !document.getElementById("pressStart")){ const l = document.createElement("link"); l.id = "pressStart"; l.rel = "stylesheet"; l.href = "https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap"; document.head.append(l); }
  wireForms($("r7games"));
  // penalty leaderboard
  const pen = $("penGame"); if (pen && !$("penBest")){ pen.insertAdjacentHTML("afterend", `<p id="penBest" style="font-size:.85rem;color:var(--muted);margin:6px 0 0"></p>`); const upd = () => { const t = pen.textContent.match(/(\d)\/5/); if (t){ const best = Math.max(LS("zm-penbest") || 0, +t[1]); LS("zm-penbest", best); } html("penBest", `${isEs() ? "Mejor en este dispositivo" : "Best on this device"}: ${LS("zm-penbest") || 0}/5`); }; new MutationObserver(upd).observe(pen, { childList:true, subtree:true }); upd(); }
}

/* ---------------- travels additions ---------------- */
const FLAGS = [["🇲🇿","Mozambique","Nov 2023"],["🇿🇼","Zimbabwe","Nov 2023"],["🇵🇪","Peru","Mar 2024"],["🇩🇪","Germany","Apr 2026"],["🇫🇷","France","Apr 2026"],["🇮🇹","Italy","Apr 2026"],["🇪🇸","Spain","Apr 2026"],["🇺🇸","USA (Kansas City)","Jun 2026"]];
function travels(){
  const t = document.querySelector("section#travels"); if (!t || $("r7travel")) return;
  t.insertAdjacentHTML("beforeend", `<div id="r7travel"><hr class="soft">
  <div class="r7-imp" style="margin-bottom:18px"><div><b>7</b><small>${B("countries abroad","países en el extranjero")}</small></div><div><b>4</b><small>${B("continents","continentes")}</small></div><div><b>4</b><small>${B("big trips","viajes grandes")}</small></div><div><b>1</b><small>${B("World Cup","Mundial")}</small></div></div>
  <div class="card"><h3>${B("Flag collection","Colección de banderas")}</h3><div class="r7-flags">${FLAGS.map(f => `<div><span>${f[0]}</span><b>${f[1]}</b><small>${f[2]}</small></div>`).join("")}</div></div>
  <div class="grid g2" style="margin-top:18px;align-items:start">
    ${card(B("My packing list","Mi lista de equipaje"), li([{en:"Passport + a photo of it on your phone",es:"Pasaporte + una foto en el celular"},{en:"Phone charger and a power bank",es:"Cargador y batería portátil"},{en:"Plug adapter for the country",es:"Adaptador de enchufe"},{en:"Comfortable walking shoes",es:"Zapatos cómodos"},{en:"Refillable water bottle",es:"Botella reutilizable"},{en:"Any medicine you need",es:"Tus medicinas"},{en:"A small notebook for memories",es:"Una libreta para recuerdos"}]))}
    ${card(B("Travel tips for students","Consejos de viaje para estudiantes"), li([{en:"Learn hello, thank you and sorry in the local language",es:"Aprende hola, gracias y perdón en el idioma local"},{en:"Share your plans with a trusted adult",es:"Comparte tus planes con un adulto de confianza"},{en:"Keep a copy of your ID separate from the original",es:"Guarda una copia de tu identificación aparte"},{en:"Try one new food every day",es:"Prueba una comida nueva cada día"},{en:"Write a few lines each night — you'll be glad later",es:"Escribe unas líneas cada noche — te alegrarás después"}]))}
  </div>
  ${card(B("Next trips wishlist","Próximos viajes soñados"), li([{en:"Barcelona — a match at Spotify Camp Nou",es:"Barcelona — un partido en el Spotify Camp Nou"},{en:"Mexico",es:"México"},{en:"Japan",es:"Japón"},{en:"Washington, D.C. — Congress and the Supreme Court",es:"Washington, D.C. — el Congreso y la Corte Suprema"}]), "r7-mt")}</div>`);
}

/* ---------------- community / contact additions ---------------- */
function community(){
  const c = document.querySelector("section#community"); if (!c || $("r7comm")) return;
  const sel = document.querySelector('form[name=requests] select[name=type]');
  if (sel && !sel.querySelector('[data-r7]')) sel.insertAdjacentHTML("beforeend", ["Speaking: student voice and advocacy","Speaking: martial arts and leadership","Speaking: bilingual students","Media kit / interview","Collaboration on a project","Mentoring a younger student"].map(o => `<option data-r7>${o}</option>`).join(""));
  c.insertAdjacentHTML("beforeend", `<div id="r7comm"><hr class="soft">
  <div class="grid g2" style="align-items:start">
    ${card(B("When I'm usually free","Cuándo estoy disponible"), `<div class="r6-table"><table><tr><th></th><th>${B("Daytime","De día")}</th><th>${B("After school","Después de clases")}</th><th>${B("Evening","Noche")}</th></tr>${[["Mon","Lun","s","b","b"],["Tue","Mar","s","b","f"],["Wed","Mié","s","b","f"],["Thu","Jue","s","b","f"],["Fri","Vie","s","b","b"],["Sat","Sáb","f","f","f"],["Sun","Dom","f","f","b"]].map(r => `<tr><th scope="row">${B(r[0], r[1])}</th>${r.slice(2).map(x => `<td class="r7-av ${x}">${x === "f" ? B("Usually free","Libre") : x === "s" ? B("School","Escuela") : B("Busy","Ocupado")}</td>`).join("")}</tr>`).join("")}</table></div><p style="margin:10px 0 0;font-weight:800">⏱️ ${B("I reply to every message within 48 hours.","Respondo cada mensaje en 48 horas.")}</p>`)}
    ${card(B("Find me online","Encuéntrame en línea"), `<div class="r7-social">
      <a href="https://www.instagram.com/spasdstudentvoice" target="_blank" rel="noopener">📸 @spasdstudentvoice</a><a href="https://www.instagram.com/sunprairiealpr" target="_blank" rel="noopener">📸 @sunprairiealpr</a>
      <a href="https://spasdstudentvoice.netlify.app" target="_blank" rel="noopener">🎓 Student Voice</a><a href="https://sunprairiealpr.netlify.app" target="_blank" rel="noopener">🚗 Sun Prairie ALPR</a>
      <a href="https://kicksunlimitedhub.netlify.app" target="_blank" rel="noopener">🥋 Kicks Hub</a><a href="mailto:zackarymark160@gmail.com">✉️ Email</a></div>
      <p style="font-size:.85rem;margin:10px 0 0">${B("Instagram highlights live on each profile's page.","Las historias destacadas están en cada perfil.")}</p>`)}
  </div>
  <div class="grid g2" style="margin-top:18px;align-items:start">
    ${card(B("Share this site","Comparte este sitio"), `<div style="display:flex;gap:14px;align-items:center"><img src="qr.png" alt="QR code for zackarymark.netlify.app" style="width:120px;image-rendering:pixelated"><div><p style="margin:0 0 8px;font-weight:800">zackarymark.netlify.app</p><button class="btn outline" type="button" id="shareSite">${B("Share","Compartir")}</button></div></div>`)}
    ${card(B("Press photo pack","Fotos para prensa"), `<div class="grid g2" style="gap:8px"><a href="photos/hero.jpg" target="_blank" rel="noopener"><img src="photos/hero.jpg" alt="Headshot" style="width:100%;border-radius:10px;aspect-ratio:4/5;object-fit:cover"></a><a href="photos/advocate-banner.jpg" target="_blank" rel="noopener"><img src="photos/advocate-banner.jpg" alt="Advocate banner" style="width:100%;border-radius:10px;aspect-ratio:4/5;object-fit:cover"></a></div><p style="font-size:.82rem;color:var(--muted);margin:8px 0 0">${B("Free to use with credit: Zack Mark.","Uso libre con crédito: Zack Mark.")}</p>`)}
  </div>
  ${card(B("Feedback or found a bug?","¿Comentarios o un error?"), `<form name="site-feedback" method="POST" data-netlify="true" netlify-honeypot="bot-field" class="netlify-ajax"><input type="hidden" name="form-name" value="site-feedback"><p class="hidden"><label>Don't fill this out: <input name="bot-field"></label></p>
    <div class="grid g2" style="gap:0 16px"><div class="f"><label>${B("Type","Tipo")}</label><select name="type"><option>Feedback</option><option>Something's broken</option><option>Idea for the site</option></select></div><div class="f"><label>${B("Page","Página")}</label><input name="page" id="fbPage"></div></div>
    <div class="f"><label>${B("Tell me","Cuéntame")}</label><textarea name="message" rows="3" required></textarea></div><button class="btn" type="submit">${B("Send","Enviar")}</button><div class="formMsg" aria-live="polite" style="font-weight:800;margin-top:10px"></div></form>`, "r7-mt")}
  </div>`);
  $("fbPage").value = location.hash || "#home";
  $("shareSite").onclick = async () => { try { await navigator.share({ title:"Zack Mark", url:"https://zackarymark.netlify.app" }); } catch(e){ copyText("https://zackarymark.netlify.app"); } };
  wireForms($("r7comm"));
}

/* ---------------- updates: search, archive, read-aloud, share ---------------- */
function updates(){
  const wrap = $("posts"); if (!wrap) return;
  if (!$("postSearch")) $("postTags")?.insertAdjacentHTML("afterend", `<div class="row" style="margin:8px 0 14px"><input id="postSearch" placeholder="${isEs() ? "Buscar novedades…" : "Search updates…"}" style="flex:1;min-width:180px"><select id="postMonth" style="max-width:200px"><option value="">${isEs() ? "Todos los meses" : "All months"}</option></select></div>`);
  const ms = $("postMonth"); if (ms && ms.options.length < 2 && typeof POSTS !== "undefined"){ [...new Set(POSTS.map(p => p.date.slice(0, 7)))].sort().reverse().forEach(m => ms.insertAdjacentHTML("beforeend", `<option value="${m}">${new Date(m + "-15").toLocaleDateString(isEs() ? "es-ES" : "en-US", { month:"long", year:"numeric" })}</option>`)); }
  const filt = () => { const q = ($("postSearch")?.value || "").toLowerCase(), m = $("postMonth")?.value || "";
    [...wrap.querySelectorAll(".post")].forEach((c, i) => { const p = (typeof POSTS !== "undefined" ? POSTS.slice().sort((x, y) => (y.pin ? 1 : 0) - (x.pin ? 1 : 0) || y.date.localeCompare(x.date)) : [])[i];
      const okQ = !q || c.textContent.toLowerCase().includes(q), okM = !m || (p && p.date.startsWith(m)); if (!okQ || !okM) c.hidden = true; else if (c.dataset.tags !== undefined) c.hidden = c.hidden && false; }); };
  $("postSearch") && ($("postSearch").oninput = filt); $("postMonth") && ($("postMonth").onchange = filt);
  wrap.querySelectorAll(".post").forEach(c => { if (c.querySelector(".r7-pa")) return;
    const t = c.querySelector("h3 .en")?.textContent || "";
    c.insertAdjacentHTML("beforeend", `<div class="r7-pa"><button type="button" data-say>🔊 ${B("Listen","Escuchar")}</button><button type="button" data-share="${esc(t)}">↗ ${B("Share","Compartir")}</button><button type="button" data-print>🖨️ ${B("Print","Imprimir")}</button></div>`); });
  wrap.onclick = async e => {
    const j = e.target.closest("[data-jump]"); if (j) return;
    const c = e.target.closest(".post"); if (!c) return;
    if (e.target.closest("[data-say]")){ try { speechSynthesis.cancel(); const L = isEs() ? "es" : "en"; const txt = [...c.querySelectorAll(`h3 .${L}, p.${L}`)].map(x => x.textContent).join(". "); const u = new SpeechSynthesisUtterance(txt); u.lang = isEs() ? "es-ES" : "en-US"; speechSynthesis.speak(u); } catch(err){} }
    const sh = e.target.closest("[data-share]"); if (sh){ const url = "https://zackarymark.netlify.app/#updates"; try { await navigator.share({ title:sh.dataset.share, url }); } catch(err){ copyText(sh.dataset.share + " — " + url); } }
    if (e.target.closest("[data-print]")){ document.querySelectorAll(".post").forEach(p => p.classList.toggle("r7-noprint", p !== c)); window.print(); setTimeout(() => document.querySelectorAll(".r7-noprint").forEach(p => p.classList.remove("r7-noprint")), 500); }
  };
}

/* ---------------- about this site (accessibility, terms, verify, status, shortcuts) ---------------- */
function site(){
  const b = $("siteBody"); if (!b || b.dataset.done) return; b.dataset.done = 1;
  b.innerHTML = `<div class="r7-badge">🍪🚫 ${B("Cookie-free: no ads, no tracking cookies","Sin cookies: sin anuncios ni rastreo")}</div>
  <div class="grid g2" style="margin-top:18px;align-items:start">
    ${card(B("Accessibility statement","Declaración de accesibilidad"), `<p style="margin:0 0 8px">${B("I want everyone to be able to use this site. It's built to work with keyboards and screen readers, in English and Spanish, with options for high contrast, less motion and an easy-read font (⚙️ at the top).","Quiero que todos puedan usar este sitio. Funciona con teclado y lectores de pantalla, en inglés y español, con opciones de alto contraste, menos movimiento y letra fácil (⚙️ arriba).")}</p><p style="margin:0">${B("If something doesn't work for you, tell me on the feedback form and I'll fix it.","Si algo no te funciona, dímelo en el formulario y lo arreglo.")}</p><a class="linkcard" href="#community">${B("Feedback form","Formulario")} <span>→</span></a>`)}
    ${card(B("Keyboard shortcuts","Atajos de teclado"), `<div class="r6-li"><kbd>Tab</kbd> ${B("Move between links and buttons","Moverse entre enlaces y botones")}</div><div class="r6-li"><kbd>Enter</kbd> ${B("Open or press","Abrir o presionar")}</div><div class="r6-li">${B("Skip link: press Tab once on any page","Saltar al contenido: Tab una vez")}</div><div class="r6-li"><kbd>Shift</kbd>+<kbd>Alt</kbd>+<kbd>A</kbd> ${B("Admin (for me)","Admin (para mí)")}</div><div class="r6-li">${B("Type","Escribe")} <kbd>visca</kbd> ${B("for a surprise","para una sorpresa")}</div>`)}
    ${card(B("How I check facts","Cómo verifico datos"), ol([{en:"I only post what's in writing — emails, agendas, official documents.",es:"Solo publico lo que está por escrito — correos, agendas, documentos oficiales."},{en:"Quotes are copied word for word, with the date.",es:"Las citas se copian palabra por palabra, con la fecha."},{en:"Promises are labeled honestly: kept, pending or open.",es:"Las promesas se marcan con honestidad: cumplida, pendiente o abierta."},{en:"I never name students without permission.",es:"Nunca nombro estudiantes sin permiso."},{en:"When I'm wrong, I fix it and log the correction.",es:"Si me equivoco, lo corrijo y lo registro."}]) + `<a class="linkcard" href="#records">${B("Sources and corrections log","Fuentes y correcciones")} <span>→</span></a>`)}
    ${card(B("Terms of use","Términos de uso"), li([{en:"Content is mine unless credited. You can share it with credit and a link.",es:"El contenido es mío salvo que se indique. Puedes compartirlo con crédito y enlace."},{en:"Reports are public records summaries, not legal advice.",es:"Los informes resumen registros públicos, no son asesoría legal."},{en:"Be respectful in forms and comments; I remove spam and personal attacks.",es:"Sé respetuoso; elimino spam y ataques personales."},{en:"Links to other sites aren't endorsements.",es:"Los enlaces a otros sitios no son respaldos."}]) + `<a class="linkcard" href="privacy.html">${B("Privacy policy","Política de privacidad")} <span>↗</span></a>`)}
    ${card(B("Site status","Estado de los sitios"), [["zackarymark.netlify.app","Main site"],["spasdstudentvoice.netlify.app","Student Voice"],["sunprairiealpr.netlify.app","ALPR"],["kicksunlimitedhub.netlify.app","Kicks Hub"]].map(s => `<div class="dir"><div><b>${s[1]}</b><small>${s[0]}</small></div><a href="https://${s[0]}" target="_blank" rel="noopener">${B("Open","Abrir")} ↗</a></div>`).join("") + `<p style="font-size:.82rem;color:var(--muted);margin:8px 0 0">${B("If one won't load, try again later or tell me on the feedback form.","Si uno no carga, intenta más tarde o avísame.")}</p>`)}
    ${card(B("Read this page aloud","Leer esta página en voz alta"), `<p style="margin:0 0 10px">${B("Turn on read-aloud, then tap 🔊 at the top on any page.","Activa la lectura y toca 🔊 arriba en cualquier página.")}</p><button class="btn" type="button" id="ttsOn">🔊 ${B("Turn on read-aloud","Activar lectura")}</button>`)}
  </div>`;
  $("ttsOn").onclick = () => { LS("zm-tts", true); ttsButton(); say(isEs() ? "Lectura activada" : "Read-aloud on"); };
}
function ttsButton(){
  if (!LS("zm-tts") || $("tTts")) return; const tools = document.querySelector(".topbar .tools"); if (!tools) return;
  const b = document.createElement("button"); b.className = "tool"; b.id = "tTts"; b.textContent = "🔊"; b.setAttribute("aria-label", "Read this page aloud"); tools.insertBefore(b, tools.querySelector(".lang"));
  b.onclick = () => { try { if (speechSynthesis.speaking){ speechSynthesis.cancel(); return; } const v = document.querySelector("section.view.on"); const L = isEs() ? "es" : "en"; const txt = [...v.querySelectorAll("h2, h3, p, li")].filter(x => !x.closest("." + (L === "en" ? "es" : "en")) && x.offsetParent).map(x => x.textContent.trim()).filter(Boolean).join(". ").slice(0, 6000);
    const u = new SpeechSynthesisUtterance(txt); u.lang = isEs() ? "es-ES" : "en-US"; speechSynthesis.speak(u); } catch(e){} };
}

/* ---------------- look: intro, section colors, holidays, flips ---------------- */
function look(){
  const root = document.documentElement;
  // color-coded sections
  const g = id => Object.keys(GROUPS).find(k => GROUPS[k].secs.includes(id)) || "home";
  const tint = () => { const v = document.querySelector("section.view.on"); if (v) root.dataset.grp = g(v.id); };
  addEventListener("hashchange", () => setTimeout(tint, 0)); setTimeout(tint, 0);
  // holiday themes
  const d = new Date(), m = d.getMonth(), day = d.getDate();
  if (m === 9 && day >= 20) root.classList.add("hol-halloween");
  // Thanksgiving: 4th Thursday of November
  const tg = (() => { const x = new Date(d.getFullYear(), 10, 1); const first = (11 - x.getDay()) % 7 + 1; return first + 21; })();
  if (m === 10 && day >= tg - 5 && day <= tg + 1){ root.classList.add("hol-thanks");
    document.querySelector("#home .hero")?.insertAdjacentHTML("beforebegin", `<div class="r7-hol">🦃 ${B("Happy Thanksgiving! Thank you to everyone who's helped this year.","¡Feliz Día de Acción de Gracias! Gracias a todos los que ayudaron este año.")}</div>`); }
  // animated logo intro (once per session, skippable)
  try { if (!sessionStorage.getItem("zm-intro") && !root.classList.contains("rm") && !matchMedia("(prefers-reduced-motion: reduce)").matches){ sessionStorage.setItem("zm-intro", 1);
    const o = document.createElement("div"); o.className = "r7-intro"; o.innerHTML = `<img src="logo.svg" alt=""><button type="button">${B("Skip","Saltar")}</button>`; document.body.append(o);
    const done = () => { o.classList.add("out"); setTimeout(() => o.remove(), 500); }; o.querySelector("button").onclick = done; setTimeout(done, 1600); } } catch(e){}
  // flip cards on fun facts
  document.querySelectorAll("#about .fact").forEach(f => { f.classList.add("r7-flip"); f.tabIndex = 0; f.setAttribute("role", "button"); f.onclick = () => f.classList.toggle("flipped"); });
}

/* ---------------- forms added by JS: hook into the site's AJAX submit ---------------- */
function wireForms(scope){
  if (!scope) return;
  scope.querySelectorAll("form.netlify-ajax").forEach(f => { if (f.dataset.r7) return; f.dataset.r7 = 1;
    f.addEventListener("submit", async e => { e.preventDefault(); const msg = f.querySelector(".formMsg");
      try { const r = await ZM_submit(f); if (r && r.ok === false) throw 0; f.reset(); if (msg){ msg.style.color = "#16a34a"; msg.textContent = isEs() ? "¡Gracias! Lo recibí." : "Thanks! Got it."; } thanks(); }
      catch(err){ if (msg){ msg.style.color = "#dc2626"; msg.textContent = isEs() ? "No se pudo enviar. Intenta otra vez." : "Couldn't send. Try again."; } } }); });
}
function thanks(){
  const o = document.createElement("div"); o.className = "r7-thanks"; o.innerHTML = `<div><b>🙏 ${B("Thank you!","¡Gracias!")}</b><p>${B("I read every message and reply within 48 hours.","Leo cada mensaje y respondo en 48 horas.")}</p><button type="button" class="btn gold">${B("Back to the site","Volver al sitio")}</button></div>`;
  document.body.append(o); o.querySelector("button").onclick = () => o.remove(); setTimeout(() => o.remove(), 6000);
}

/* ---------------- wire up ---------------- */
function render(){ me(); guide(); planner(); site(); }
function init(){
  addSections(); look(); home(); work(); builds(); games(); travels(); community(); updates(); ttsButton(); render();
  const lazy = () => { const id = (location.hash || "#home").slice(1); if (["me","guide","planner","site"].includes(id)) render(); };
  addEventListener("hashchange", lazy);
  if (typeof renderPosts === "function" && !renderPosts.__r7){ const o = renderPosts; const w = function(){ o.apply(this, arguments); try { updates(); } catch(e){} }; w.__r7 = 1; w.__r6 = o.__r6; try { renderPosts = w; } catch(e){} }
  if (window.ZM_apply && !window.ZM_apply.__r7){ const o = window.ZM_apply; const w = m => { o(m); try { drawImpact(); } catch(e){} }; w.__r7 = 1; window.ZM_apply = w; }
  try { show(); } catch(e){}
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
