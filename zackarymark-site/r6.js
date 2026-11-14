/* ===== round 6: tools, records, council, games, community, look ===== */
(function(){
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const both = o => `<span class="en">${o.en}</span><span class="es">${o.es || o.en}</span>`;
const es = () => document.documentElement.lang === "es";
const LS = (k, v) => { try { if (v === undefined) return JSON.parse(localStorage.getItem(k)); localStorage.setItem(k, JSON.stringify(v)); } catch(e){ return null; } };
const today = () => new Date(Date.now() - new Date().getTimezoneOffset()*6e4).toISOString().slice(0,10);
const dayIndex = () => Math.floor((Date.now() - new Date("2026-01-01")) / 864e5);
const toast2 = m => (typeof toast === "function" ? toast(m) : null);
async function copyText(t){ try { await navigator.clipboard.writeText(t); toast2(es() ? "Copiado" : "Copied"); } catch(e){ toast2(es() ? "Selecciona el texto y cópialo" : "Select the text and copy it"); } }

/* ---------------- data from the v3.0 record (Nov 10, 2026) ---------------- */
const PROMISES = [
  ["Marlita Bevenue, Communications","District family newsletters will also go to students, starting in November","Oct 20 meeting; in writing Oct 21","pend","Pending: first issue not yet received"],
  ["District","Confirmed LGBTQIA+ protections are unchanged","Oct 1","kept","Kept"],
  ["Chief Warych","Send a written ALPR FAQ","Promised Oct 13","kept","Kept: sent Oct 16"],
  ["SPPD FAQ","The city owns the data; no federal access; no sharing with 287(g) agencies; every search logged with a reason","Oct 16","pend","Statement, not yet a contract term"],
  ["Chief Warych","No livestreaming with Axon","Oct 27","pend","Pending contract and policy"],
  ["Chief Warych","Axon retention starts as a 14-day, three-month trial; moves to 21 days only if investigations are affected","Oct 27","pend","Pending approval"],
  ["Chief Warych","Searches audited monthly by a Detective Sergeant","Oct 27","pend","Pending approval"],
  ["Chief Warych","Post the ALPR policy (F-18) on the SPPD website if approved","Oct 27","pend","Pending approval"],
  ["Chief Warych","Make the data-sharing MOU a public document after signing","Oct 27","pend","Pending signing"],
  ["Chief Warych","Follow up on whether Flock audit logs are kept","Oct 27","open","Open: no follow-up yet"],
  ["Chief Warych","Consider a quarterly ALPR transparency report once Axon is approved","Nov 9","pend","Pending approval"],
  ["Dr. Antoine Reed","\"Find time to connect\" on the student council","Oct 30","kept","Kept: met Nov 4"],
  ["Karen Richmond","Answer how Board student reps are chosen","Asked Nov 4","kept","Kept: answered Nov 5"],
  ["Principal Bartelt","3–5 Patrick Marsh Peer Ambassadors for the council","Nov 5","pend","Planning meeting held Nov 12; agenda and calendar next"],
  ["Principal Barrett","Explore how Prairie Phoenix students can take part once the structure is clear","Nov 5","pend","Pending"],
  ["Sarah Dianich","Share the invitation with East students once the council is school-sponsored","Nov 6 and Nov 10","pend","Waiting on approval"],
  ["Mr. Medema","Review the Act 95 guides again after the weighted grades decision","Nov 9","pend","Pending vote"],
  ["Chief Warych","ALPR comes back to council as an annual budget item","Nov 12","pend","Stated in writing; starts with the 2027 budget"],
  ["Chief Warych","Audit report from the audit committee Alder Drengler referred","Nov 12","pend","Pending: referral not yet taken up"],
  ["Mayor Stocker","Meet about youth seats on city committees","Nov 12","pend","Pending: call to set a time"],
  ["Board President McFarland","Answer five student questions about the Board","Nov 6","kept","Kept: answered Nov 13"]
];
const UNANSWERED = [
  ["Oct 27","Chief Warych","Are Flock audit logs kept after the Flock cameras come out?"],
  ["Nov 5","Dr. Reed","How a district-level student group registers, and who should sponsor it"],
  ["Nov 6","Board President McFarland","A monthly student update on Board agendas"],
  ["Nov 6; again Nov 13","Mayor and city staff","Will the data-sharing agreement, retention period and search logging and audit rules be in writing and public before the Axon contract is signed?"],
  ["Nov 9","City records office","Public records request PD-2399-2026 (Axon estimate, F-18, data-sharing agreements, audit records)"],
  ["Nov 10","Central Heights","A 15–20 minute meeting about the council"],
  ["Nov 11","SPASD records office","Public records request: monitoring tool contracts, weighted grades materials, safety incident totals"],
  ["Nov 12","Chief Warych","When will the audit committee referral be taken up? Will the data-sharing MOU be public before signing?"]
];
const WAITING = [["Final weighted grades vote","After teacher input; Nov 23 at the earliest"],["City budget vote on the Axon cameras","Nov 17"],["Dr. Reed's answer on how the council registers","—"],["Teacher input plan for weighted grades","Nov 17"],["Dr. Morgan follow-up meeting","Nov 18"],["Public records request PD-2399-2026 results","—"]];
const NUMBERS = [["206","numbered emails in the record"],["33","meetings logged"],["903","students answered the Act 95 survey"],["78%","picked weighted GPA (ranking option)"],["531","caregivers answered the weighted grades survey"],["70%","caregivers support weighted grades"],["6","schools invited to the council"],["$235,388.97","proposed 10-year Axon cost"]];
const TIMELINE = [
  ["Jan 13","Student Safety & Trust Framework sent to the Board of Education."],["Jan 26","Act 95 students present survey findings at a public hearing."],["Feb 26","Weighted grades work group begins."],["Mar 2","Student advocacy meeting with school and district leaders."],
  ["April","Principal interviews, superintendent candidate session (Apr 13), Student Senate elected (Apr 27), Report A published."],["Jul 10","First meeting with Chief Warych about Flock cameras."],["August","Meetings on the budget (Aug 18), with Dr. Turner (Aug 27) and with the Chief (Aug 17)."],
  ["Sept 23","Weighted grades work group restarts for 2026–27."],["Oct 1","District confirms in writing that LGBTQIA+ protections are unchanged."],["Oct 6–7","Community ALPR report sent to the Chief; Public Safety Committee hears the Axon plan."],["Oct 16","SPPD sends a written ALPR FAQ."],
  ["Oct 20–22","Meeting with district leaders, newsletter commitment, caregiver survey analysis."],["Oct 27–29","Chief's written answers, two new Instagram series, advisory council proposal to Dr. Reed."],["Oct 30","Dr. Reed: \"I love this idea.\""],
  ["Nov 2","Students preview weighted grades with the Board's Teaching & Learning Committee."],["Nov 3","Outreach to five more schools; the district publishes \"Making a Difference Through Student Voice.\""],["Nov 4","Meeting with Dr. Reed; council invitations go to every middle and high school."],
  ["Nov 5","Patrick Marsh signs on; Prairie Phoenix supportive."],["Nov 6","East offers to share the invitation; follow-ups to the Board President, Dr. Morgan, the Chief and the Mayor."],["Nov 7","Letter to the Board of Education with questions about the superintendent's license."],
  ["Nov 8–9","SP30 slide and poster for East; public records request and letter to the editor on plate readers; Chief open to a quarterly transparency report."],["Nov 9","Weighted grades plan goes to the Board's Committee of the Whole."],["Nov 10","Central Heights points the council to its Student Council; caregiver survey analysis released."],["Nov 11","Records request to SPASD; community ALPR report sent to every alder."],["Nov 12","Patrick Marsh planning meeting; Chief Warych's written answers; Mayor Stocker backs youth seats."],["Nov 13","Board asks for teacher input on weighted grades; Board President McFarland answers five student questions."],
  ["Coming up","Nov 16 Teaching, Learning & Equity Committee; Nov 17 weighted grades teacher-input plan and city budget hearing; Nov 18 meeting with Dr. Morgan; weighted grades vote after teacher input."]
];
const CORRECTIONS = [["Oct 28","The Chief corrected the city budget schedule: there was no Nov 3 meeting. The meeting log was fixed."],["Oct 30","Officials' personal cell numbers were removed. A second copy of the source documents was removed."],["Nov 6","A drafted newsletter was replaced with the district's own Nov 3 article, copied word for word."],["Nov 10","My school email address was replaced on every card; a note that didn't belong in the public record was removed; the caregiver survey analysis was restored after the district said it could be shared."]];
const VERSIONS = [["Nov 11 · v3.1","Nov 10–11 emails and the Nov 18 meeting; new pages: Act 95 timeline, plate reader glossary, asked vs. answered, records requests, public comment log, media and press, how a decision gets made, lessons for student advocates, goals for 2027, council charter draft. New editions: large print, smaller files, text-only and single-section PDFs."],["Nov 10 · v3.0","Rebuilt: executive summary, promises tracker, By the Numbers, council schools table, Flock vs. Axon table, master timeline, corrections log, Spanish summary, index. Two public volumes added."],["Nov 9","Chief's reply on a quarterly transparency report, the public records request, a letter to the editor, Nov 9 Board meeting details."],["Nov 6","The district's Nov 3 feature, Sun Prairie East's reply, Nov 4 next steps with Dr. Reed."],["Nov 5","The District-Wide Student Council: invitations to every middle and high school and first replies."],["Nov 4","Advisory council thread, letters to five more schools, Nov 9 rehearsal invites."],["Oct 30","At a Glance, timeline, glossary, clickable contents; personal cell numbers removed."],["Oct 28","Chief Warych's written answers to seven follow-up questions."],["Oct 27","Logos, websites, Instagram accounts, ALPR handout, Action Kit."],["October","First combined edition, January to October 2026."]];
const SOURCES = [["Board agendas and minutes (BoardDocs)","https://go.boarddocs.com/wi/spasd/Board.nsf"],["Sun Prairie Area School District","https://www.sunprairieschools.org"],["City of Sun Prairie","https://www.cityofsunprairie.com"],["Volume 2 — plate reader sources (p. 179)","docs/Zack_Mark_Vol2_ALPR.pdf#page=179"],["Volume 2 — all sources (p. 178)","docs/Zack_Mark_Vol2_ALPR.pdf#page=178"]];
const GLOSSARY = [["Act 95","Wisconsin law that guarantees UW admission to top-ranked students, which is why class rank and how GPA is calculated matter."],["ALPR","Automated license plate reader: a camera that photographs passing cars and reads the plate."],["Axon","The company Sun Prairie plans to switch to for plate readers, starting May 2027."],["Capstone","An advanced, project-based course; part of the weighted grades plan."],["Committee of the Whole","A Board of Education meeting where all members discuss an item in depth before a formal vote."],["F-18","SPPD's written policy on license plate readers."],["Flock","Flock Safety, the company behind Sun Prairie's current plate reader cameras."],["Fusus","Software that can pull camera feeds into a live view. The Chief said there will be no livestreaming."],["Hotlist","A list of plates police are looking for, such as stolen cars. A match is an alert, not proof of a crime."],["MOU","Memorandum of understanding: a written agreement between agencies, here about sharing plate data."],["MTSS","Multi-tiered system of support: a school's layered approach to academic and emotional help."],["Outpost","Axon's solar-powered plate reader camera, the model in the draft Sun Prairie estimate."],["Peer Ambassadors","A Patrick Marsh student group whose members may join the student council pilot."],["PLC","Professional Learning Center, 220 Kroncke Dr., where the Board of Education meets."],["PSC","The City of Sun Prairie's Public Safety Committee."],["Public records request","A request under Wisconsin law for copies of government records."],["SP30","Sun Prairie East's daily advisory period, where announcements and slides are shared."],["SPASD","Sun Prairie Area School District."],["SPPD","Sun Prairie Police Department."],["T&L Committee","The Board of Education's Teaching & Learning Committee."],["Weighted grades","A GPA scale where harder classes (AP, capstones, some dual credit) can count up to 5.0 instead of 4.0."],["287(g)","A federal program that lets local agencies help with immigration enforcement. SPPD says plate data won't be shared with agencies in it."]];
const FVA = [["Cameras","5 Falcon cameras in the 2023 order form; 9 in use by 2026 (6 city-owned, 3 donated)","9 Outpost solar cameras"],["Cost","$15,000 a year platform fee; $30,750 for the first 2-year term","$235,388.97 over 10 years, about $23,539 a year (draft estimate)"],["Term","24 months, auto-renewing","120 months, May 1, 2027 to Apr 30, 2037"],["Data retention","30 days (order form)","14-day trial for 3 months, then 14 or 21 days (Chief, Oct 27)"],["Livestreaming","Not addressed in the order form","None, per the Chief (Oct 27)"],["Search audits","Not specified in the order form","Monthly, by a Detective Sergeant (Chief, Oct 27)"],["Data ownership and sharing","See the Master Services Agreement","City owns the data; no federal access; no 287(g) sharing (SPPD FAQ, Oct 16); data-sharing MOU to be public after signing"],["Written policy","Policy F-18","F-18 to be posted on the SPPD website if approved"],["Status","In use","Moving with the city budget; Council's final budget vote Nov 17"]];
const MYTHS = [
  { t:{en:"Weighted grades",es:"Calificaciones ponderadas"}, m:{en:"Weighted grades only help a few top students.",es:"Las calificaciones ponderadas solo ayudan a unos pocos."}, f:{en:"The goal is that taking a harder class never hurts your GPA. 70% of 531 caregivers surveyed support it.",es:"La meta es que tomar una clase más difícil nunca baje tu GPA. El 70% de 531 familias lo apoya."} },
  { t:{en:"Weighted grades",es:"Calificaciones ponderadas"}, m:{en:"It's already decided.",es:"Ya está decidido."}, f:{en:"Not yet. The plan went to the Board's Committee of the Whole on Nov 9; the final vote is expected in late November.",es:"Todavía no. El plan pasó al Comité Plenario el 9 de nov.; el voto final se espera a fines de noviembre."} },
  { t:{en:"Weighted grades",es:"Calificaciones ponderadas"}, m:{en:"Every class would be weighted.",es:"Todas las clases serían ponderadas."}, f:{en:"Only harder classes — AP, capstones and qualifying college credit — would count up to 5.0.",es:"Solo las más difíciles — AP, capstone y crédito universitario — valdrían hasta 5.0."} },
  { t:{en:"Plate readers",es:"Lectores de placas"}, m:{en:"An alert means someone committed a crime.",es:"Una alerta significa que alguien cometió un delito."}, f:{en:"A hotlist match is an alert, not proof of a crime. Officers still have to confirm it.",es:"Una coincidencia es una alerta, no prueba de un delito. La policía debe confirmarla."} },
  { t:{en:"Plate readers",es:"Lectores de placas"}, m:{en:"The new cameras will livestream.",es:"Las cámaras nuevas transmitirán en vivo."}, f:{en:"The Chief said in writing (Oct 27) there will be no livestreaming. It isn't a contract term yet.",es:"El jefe dijo por escrito (27 oct.) que no habrá transmisión en vivo. Aún no es término de contrato."} },
  { t:{en:"Plate readers",es:"Lectores de placas"}, m:{en:"Federal agencies get the data.",es:"Las agencias federales reciben los datos."}, f:{en:"SPPD's FAQ (Oct 16) says the city owns the data, with no federal access and no sharing with 287(g) agencies.",es:"El FAQ de la policía (16 oct.) dice que la ciudad es dueña de los datos, sin acceso federal ni con agencias 287(g)."} }
];
const TALKING = [
  { t:{en:"Weighted grades",es:"Calificaciones ponderadas"}, p:{en:"Taking a harder class shouldn't hurt your GPA. 78% of students who chose a ranking option picked weighted GPA, and 70% of caregivers support it. I'm asking the Board to approve the 5.0 scale.",es:"Tomar una clase más difícil no debería bajar tu GPA. El 78% de los estudiantes que eligieron una opción prefirió GPA ponderado y el 70% de las familias lo apoya. Pido a la Junta aprobar la escala de 5.0."} },
  { t:{en:"Student council",es:"Consejo estudiantil"}, p:{en:"Decisions about our schools happen at the district level, so students should have a seat there too. A District-Wide Student Council would bring students from every middle and high school to the table.",es:"Las decisiones sobre nuestras escuelas se toman en el distrito, así que los estudiantes también deberían estar ahí. Un consejo del distrito reuniría a estudiantes de todas las secundarias y preparatorias."} },
  { t:{en:"Plate readers",es:"Lectores de placas"}, p:{en:"Before the city signs a 10-year, $235,000 camera contract, the promises on retention, livestreaming, audits and data sharing should be written into the contract or policy — and reported to the public every quarter.",es:"Antes de firmar un contrato de 10 años y $235,000, las promesas sobre retención, transmisión, auditorías y datos deberían quedar por escrito — y reportarse al público cada trimestre."} }
];
const BOARD_STEPS = [
  { en:"<b>A committee studies it.</b> An idea like weighted grades starts in a Board committee (here, Teaching & Learning) with staff and, this time, students.", es:"<b>Un comité lo estudia.</b> Una idea como las calificaciones ponderadas empieza en un comité de la Junta (aquí, Enseñanza y Aprendizaje) con personal y, esta vez, estudiantes." },
  { en:"<b>Committee of the Whole.</b> All Board members discuss it in depth before any formal vote (Nov 9 for weighted grades).", es:"<b>Comité Plenario.</b> Todos los miembros lo discuten a fondo antes de votar (9 de nov. para las calificaciones ponderadas)." },
  { en:"<b>The agenda is posted.</b> Agendas go up on BoardDocs before each meeting. That's when you can see the vote is coming.", es:"<b>Se publica la agenda.</b> Las agendas salen en BoardDocs antes de cada reunión. Ahí ves que viene el voto." },
  { en:"<b>Public comment.</b> Anyone can sign up as the agenda describes and speak for about three minutes: your name, your point, one ask.", es:"<b>Comentario público.</b> Cualquiera puede inscribirse según la agenda y hablar unos tres minutos: tu nombre, tu punto, una petición." },
  { en:"<b>The vote.</b> The Board votes at a regular meeting. If it passes, staff put it into practice and update guides for families.", es:"<b>El voto.</b> La Junta vota en una reunión regular. Si se aprueba, el personal lo aplica y actualiza las guías para familias." }
];
const START_GUIDE = [
  { en:"Write down one problem students keep talking about.", es:"Escribe un problema del que los estudiantes hablan siempre." },
  { en:"Find out who actually decides it — principal, district or Board.", es:"Averigua quién decide de verdad — director, distrito o Junta." },
  { en:"Send a short, polite email: who you are, what you're asking, one clear question.", es:"Manda un correo corto y amable: quién eres, qué pides, una pregunta clara." },
  { en:"Ask for a meeting, and bring a one-page handout.", es:"Pide una reunión y lleva una hoja con lo esencial." },
  { en:"Keep a record of every email and promise.", es:"Guarda registro de cada correo y promesa." },
  { en:"Share what happened with students in plain words.", es:"Comparte lo que pasó con los estudiantes en palabras simples." },
  { en:"Follow up once after a week. Be patient and be proud.", es:"Haz seguimiento una vez a la semana. Ten paciencia y orgullo." }
];
const COUNCIL_PROG = [["Proposed to Dr. Reed","Oct 29","done"],["\"I love this idea\"","Oct 30","done"],["Met with Dr. Reed","Nov 4","done"],["Invitations to every school","Nov 4","done"],["First school signs on","Nov 5","done"],["Patrick Marsh planning","Nov 12","now"],["Registered as a student group","Pending",""],["First council meeting","TBD",""]];
const COUNCIL_SCHOOLS = [["Patrick Marsh Middle","6–8","signed","Signed on","3–5 Peer Ambassadors; planning meeting Nov 12"],["Prairie Phoenix Academy","9–12","supp","Supportive","Principal will explore how students can take part once the structure is clear"],["Sun Prairie East","9–12","wait","Waiting","Offered the newsletter and SP30; can't share with students until the council is school-sponsored"],["Central Heights Middle","6–8","next","Next step","Suggested starting with its Student Council; meeting requested"],["Sun Prairie West","9–12","unclear","Unclear","Principal not sure of the next step for a district-level club"],["Prairie View Middle","6–8","next","Talking","Asked which topics students would weigh in on; no reply yet on the council"]];
const COUNCIL_CAL = [["Nov 12","Patrick Marsh planning meeting (not public)"],["Nov 17","Weighted grades follow-up with district and school leaders"],["TBD","First council meeting — date once the council is registered"]];
const COUNCIL_FAQ = [
  { q:{en:"Who can join?",es:"¿Quién puede unirse?"}, a:{en:"Students in grades 6–12 from every SPASD middle and high school.",es:"Estudiantes de 6º a 12º de todas las secundarias y preparatorias de SPASD."} },
  { q:{en:"What does it cost a school?",es:"¿Cuánto le cuesta a una escuela?"}, a:{en:"Nothing. Schools help by sharing the invitation and naming a contact or adviser.",es:"Nada. Las escuelas ayudan compartiendo la invitación y nombrando un contacto o asesor."} },
  { q:{en:"Does it replace school student councils?",es:"¿Reemplaza a los consejos de cada escuela?"}, a:{en:"No. It connects them. Some schools may send members of their own council.",es:"No. Los conecta. Algunas escuelas pueden enviar miembros de su propio consejo."} },
  { q:{en:"Who sponsors it?",es:"¿Quién lo patrocina?"}, a:{en:"That's being worked out with the district right now — it's one of the open questions.",es:"Se está definiendo con el distrito ahora — es una de las preguntas abiertas."} }
];
const SCHOOLS = [["Patrick Marsh Middle School","6–8"],["Central Heights Middle School","6–8"],["Prairie View Middle School","6–8"],["Sun Prairie East High School","9–12"],["Sun Prairie West High School","9–12"],["Prairie Phoenix Academy","9–12"]];

/* ---------------- home ---------------- */
function home(){
  const hero = document.querySelector("#home .hero"); if (!hero || $("winBanner")) return;
  const won = (typeof SCOREBOARD !== "undefined" ? SCOREBOARD : []).filter(s => s.st === "done");
  if (won.length){ const w = won[0]; hero.insertAdjacentHTML("beforebegin", `<a class="r6-win" id="winBanner" href="#advocacy"><b>${es() ? "LOGRO" : "LATEST WIN"}</b><span>${w.ic || "🏆"} ${both(w)}</span><span style="margin-left:auto">→</span></a>`); }
  const after = document.querySelector("#home .counter-row");
  if (after){
    after.insertAdjacentHTML("afterend", `<div class="r6-ticker" id="ticker" aria-label="Latest updates"><div class="in" id="tickIn"></div></div><div class="card reveal in" style="margin-top:18px" id="routeCard"><div class="eyebrow">${both({en:"Start here",es:"Empieza aquí"})}</div><h3>${both({en:"What brings you here?",es:"¿Qué te trae por aquí?"})}</h3>
      <div class="r6-route" id="route">${[["student","🎒",{en:"I'm a student",es:"Soy estudiante"}],["parent","👪",{en:"I'm a parent",es:"Soy padre/madre"}],["press","📰",{en:"Reporter or organizer",es:"Prensa u organizador"}],["kicks","🥋",{en:"I know you from Kicks",es:"Te conozco de Kicks"}]].map(([k, ic, l]) => `<button type="button" data-r="${k}"><span class="ic">${ic}</span>${both(l)}</button>`).join("")}</div><div class="r6-routeout" id="routeOut"></div></div>`);
  }
  fillTicker();
  const ROUTES = {
    student:[["#explain",{en:"Big decisions explained simply",es:"Grandes decisiones explicadas"}],["#tools",{en:"GPA calculator and letter generator",es:"Calculadora de GPA y generador de cartas"}],["#council",{en:"Join the District-Wide Student Council",es:"Únete al consejo estudiantil"}],["#games",{en:"Games",es:"Juegos"}]],
    parent:[["#explain",{en:"Weighted grades in plain words",es:"Calificaciones ponderadas en palabras simples"}],["#records",{en:"What the district promised",es:"Lo que prometió el distrito"}],["#action",{en:"Add your name",es:"Agrega tu nombre"}],["#community",{en:"Upcoming events and RSVP",es:"Próximos eventos"}]],
    press:[["#presskit",{en:"Press kit",es:"Kit de prensa"}],["#records",{en:"Search the full record",es:"Buscar en el registro"}],["#advocacy",{en:"Reports library",es:"Biblioteca de informes"}],["#contact",{en:"Contact",es:"Contacto"}]],
    kicks:[["#work",{en:"My martial arts journey",es:"Mi camino en artes marciales"}],["#games",{en:"Belt order quiz for kids",es:"Quiz de cinturones para niños"}],["#gallery",{en:"Photos",es:"Fotos"}],["#contact",{en:"Say hi",es:"Saluda"}]]
  };
  $("route")?.addEventListener("click", e => { const b = e.target.closest("button[data-r]"); if (!b) return;
    $("route").querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b));
    $("routeOut").innerHTML = ROUTES[b.dataset.r].map(([h, l]) => `<a class="linkcard" href="${h}">${both(l)} <span>→</span></a>`).join(""); });
  // hero slideshow
  const frame = document.querySelector("#home .frame");
  const pics = ["photos/about.jpg","photos/kicks-demo.jpg","photos/advocate-banner.jpg","photos/kc-world-cup.jpg"];
  if (frame && !frame.querySelector(".r6-slide") && !matchMedia("(prefers-reduced-motion: reduce)").matches){
    frame.style.position = "relative";
    pics.forEach(p => frame.insertAdjacentHTML("beforeend", `<img class="r6-slide" src="${p}" alt="" aria-hidden="true">`));
    const slides = [...frame.querySelectorAll(".r6-slide")]; let i = -1;
    setInterval(() => { if (document.documentElement.classList.contains("rm")) return; slides.forEach(s => s.classList.remove("on")); i = (i + 1) % (slides.length + 1); if (i < slides.length) slides[i].classList.add("on"); }, 5000);
  }
}
function fillTicker(){
  const t = $("tickIn"); if (!t || typeof POSTS === "undefined") return;
  const items = POSTS.filter(p => p.date.length === 7 || p.date <= today()).slice(0, 6).map(p => `<a href="#updates"><b>${esc(p.date.slice(5) || p.date)}</b> · ${both(p.title)}</a>`).join("");
  t.innerHTML = items + items;
}

/* ---------------- tools ---------------- */
function gpa(){
  const rows = $("gpaRows"); if (!rows) return;
  let list = LS("zm-gpa") || [{ n:"AP US History", g:"A", w:true },{ n:"English 11", g:"A", w:false },{ n:"Chemistry", g:"B", w:false },{ n:"AP Spanish", g:"B", w:true }];
  const pts = { A:4, B:3, C:2, D:1, F:0 };
  const draw = () => {
    rows.innerHTML = list.map((r, i) => `<div class="r6-row" data-i="${i}"><input value="${esc(r.n)}" data-k="n" aria-label="Class"><select data-k="g" aria-label="Grade">${Object.keys(pts).map(g => `<option ${g === r.g ? "selected" : ""}>${g}</option>`).join("")}</select><select data-k="w" aria-label="Type"><option value="0" ${!r.w ? "selected" : ""}>${es() ? "Regular" : "Regular"}</option><option value="1" ${r.w ? "selected" : ""}>${es() ? "Ponderada" : "Weighted"}</option></select><button type="button" data-x="${i}" aria-label="Remove">✕</button></div>`).join("");
    calc();
  };
  const calc = () => { if (!list.length){ $("gpaU").textContent = $("gpaW").textContent = "0.00"; return; }
    const u = list.reduce((s, r) => s + pts[r.g], 0) / list.length;
    const w = list.reduce((s, r) => s + pts[r.g] + (r.w && pts[r.g] >= 2 ? 1 : 0), 0) / list.length;
    $("gpaU").textContent = u.toFixed(2); $("gpaW").textContent = w.toFixed(2); LS("zm-gpa", list); };
  rows.addEventListener("input", e => { const row = e.target.closest("[data-i]"); if (!row) return; const r = list[+row.dataset.i], k = e.target.dataset.k; r[k] = k === "w" ? e.target.value === "1" : e.target.value; calc(); });
  rows.addEventListener("change", e => rows.dispatchEvent(new Event("input", { bubbles:true })) );
  rows.addEventListener("click", e => { const x = e.target.closest("[data-x]"); if (x){ list.splice(+x.dataset.x, 1); draw(); } });
  $("gpaAdd").onclick = () => { list.push({ n:"", g:"A", w:false }); draw(); };
  draw();
}
const LETTERS = {
  board:{ en:"Dear members of the Sun Prairie Area School District Board of Education,", es:"Estimados miembros de la Junta de Educación del Distrito Escolar de Sun Prairie:" },
  mayor:{ en:"Dear Mayor and members of the Sun Prairie City Council,", es:"Estimado alcalde y miembros del Concejo Municipal de Sun Prairie:" },
  principal:{ en:"Dear Principal,", es:"Estimado director/a:" }
};
const ASKS = {
  weighted:{ en:"I'm writing to ask you to approve weighted grades on a 5.0 scale for AP, capstone and qualifying college-credit classes. Taking a harder class should never hurt a student's GPA or class rank.", es:"Les escribo para pedirles que aprueben las calificaciones ponderadas en una escala de 5.0 para clases AP, capstone y de crédito universitario. Tomar una clase más difícil nunca debería bajar el GPA ni el rango de un estudiante." },
  council:{ en:"I'm writing in support of a District-Wide Student Council that brings students from every middle and high school to the table with district leaders.", es:"Les escribo para apoyar un Consejo Estudiantil del distrito que reúna a estudiantes de todas las secundarias y preparatorias con los líderes del distrito." },
  alpr:{ en:"I'm writing about the license plate reader cameras. Before any contract is signed, I ask that the promises on data retention, no livestreaming, monthly audits and data sharing be written into the contract or policy, and that the public get a report every quarter.", es:"Les escribo sobre las cámaras lectoras de placas. Antes de firmar un contrato, pido que las promesas sobre retención de datos, no transmisión en vivo, auditorías mensuales y uso de datos queden por escrito en el contrato o la política, y que el público reciba un informe cada trimestre." },
  other:{ en:"I'm writing about an issue that matters to me and my community.", es:"Les escribo sobre un tema que me importa a mí y a mi comunidad." }
};
function letter(){
  if (!$("ltOut")) return;
  const build = () => { const L = es() ? "es" : "en", name = $("ltName").value.trim() || (L === "es" ? "[tu nombre]" : "[your name]"), why = $("ltWhy").value.trim();
    $("ltOut").textContent = `${LETTERS[$("ltTo").value][L]}\n\n${L === "es" ? "Me llamo" : "My name is"} ${name}. ${ASKS[$("ltTopic").value][L]}${why ? "\n\n" + why : ""}\n\n${L === "es" ? "Gracias por su tiempo." : "Thank you for your time."}\n\n${name}`; };
  ["ltTo","ltTopic","ltName","ltWhy"].forEach(id => $(id).addEventListener("input", build)); build(); letter.build = build;
}
function recap(){
  if (!$("rcOut")) return; $("rcDate").value = today();
  const build = () => { const L = es(), d = $("rcDate").value ? new Date($("rcDate").value + "T12:00").toLocaleDateString(L ? "es-ES" : "en-US", { month:"long", day:"numeric" }) : "";
    $("rcOut").textContent = `${L ? "Resumen" : "Recap"}: ${$("rcMeet").value || (L ? "[reunión]" : "[meeting]")}, ${d}\n\n${L ? "Qué pasó" : "What happened"}: ${$("rcWhat").value || "…"}\n\n${L ? "Qué sigue" : "What's next"}: ${$("rcNext").value || "…"}`; };
  ["rcMeet","rcDate","rcWhat","rcNext"].forEach(id => $(id).addEventListener("input", build)); build(); recap.build = build;
}
function tools(){
  gpa(); letter(); recap();
  const tp = $("tpCards"); if (tp) tp.innerHTML = TALKING.map((t, i) => `<div class="card"><div class="eyebrow">${both(t.t)}</div><p style="margin:0" data-tp="${i}">${both(t.p)}</p><button type="button" class="r6-copy" data-tpc="${i}">${both({en:"Copy",es:"Copiar"})}</button></div>`).join("");
  tp?.addEventListener("click", e => { const b = e.target.closest("[data-tpc]"); if (b) copyText(TALKING[+b.dataset.tpc].p[es() ? "es" : "en"]); });
  let s = 0; const steps = $("boardSteps");
  const drawSteps = () => { if (!steps) return; steps.innerHTML = BOARD_STEPS.map((x, i) => `<div class="st ${i === s ? "on" : ""}"><p style="margin:0"><span class="num">${i + 1}</span>${x[es() ? "es" : "en"]}</p></div>`).join("") + `<div class="r6-dots">${BOARD_STEPS.map((_, i) => `<i class="${i === s ? "on" : ""}"></i>`).join("")}</div>`; };
  $("bsPrev") && ($("bsPrev").onclick = () => { s = Math.max(0, s - 1); drawSteps(); }); $("bsNext") && ($("bsNext").onclick = () => { s = Math.min(BOARD_STEPS.length - 1, s + 1); drawSteps(); }); drawSteps(); tools.steps = drawSteps;
  const ft = $("fvATable"); if (ft) ft.innerHTML = `<table><tr><th></th><th>Flock (2023 contract)</th><th>Axon (proposed)</th></tr>${FVA.map(r => `<tr><th scope="row">${esc(r[0])}</th><td>${esc(r[1])}</td><td>${esc(r[2])}</td></tr>`).join("")}</table>`;
  const mc = $("mythCards"); if (mc) mc.innerHTML = MYTHS.map(m => `<div class="card r6-myth"><div class="eyebrow">${both(m.t)}</div><div class="m">✗ ${both({en:"Myth",es:"Mito"})}: ${both(m.m)}</div><div class="f">✓ ${both({en:"Fact",es:"Hecho"})}: ${both(m.f)}</div></div>`).join("");
  const gl = () => { const q = ($("glQ")?.value || "").toLowerCase(); if ($("glList")) $("glList").innerHTML = GLOSSARY.filter(g => !q || (g[0] + g[1]).toLowerCase().includes(q)).map(g => `<div class="r6-gl"><b>${esc(g[0])}</b> — ${esc(g[1])}</div>`).join("") || `<p class="hint">—</p>`; };
  $("glQ")?.addEventListener("input", gl); gl();
  const sg = $("startGuide"); if (sg) sg.innerHTML = START_GUIDE.map(x => `<li>${both(x)}</li>`).join("");
  document.addEventListener("click", e => { const b = e.target.closest("[data-copy]"); if (b) copyText($(b.dataset.copy).textContent); });
}

/* ---------------- records ---------------- */
let VOLS = null, volT;
async function volSearch(){
  const q = $("volQ").value.trim(), out = $("volRes"); if (q.length < 3){ out.innerHTML = `<p class="hint">${es() ? "Escribe al menos 3 letras." : "Type at least 3 letters."}</p>`; return; }
  if (!VOLS){ out.innerHTML = `<p class="hint">${es() ? "Cargando…" : "Loading…"}</p>`; try { VOLS = await (await fetch("data/volumes.json")).json(); } catch(e){ out.innerHTML = `<p class="hint">${es() ? "No se pudo cargar." : "Couldn't load the search."}</p>`; return; } }
  const which = $("volWhich").value, ql = q.toLowerCase(), hits = [];
  [["v1","Volume 1 · Student Voice","docs/Zack_Mark_Vol1_Student_Voice.pdf"],["v2","Volume 2 · ALPR","docs/Zack_Mark_Vol2_ALPR.pdf"]].forEach(([k, name, file]) => {
    if (which !== "all" && which !== k) return;
    VOLS[k].forEach((txt, i) => { const at = txt.toLowerCase().indexOf(ql); if (at < 0) return; const count = txt.toLowerCase().split(ql).length - 1;
      const a = Math.max(0, at - 90), snip = (a ? "…" : "") + txt.slice(a, at + q.length + 140) + "…";
      hits.push({ name, file, page:i + 1, count, snip }); }); });
  hits.sort((x, y) => y.count - x.count);
  const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
  out.innerHTML = `<p class="hint">${hits.length} ${es() ? "páginas" : "pages"}</p>` + hits.slice(0, 40).map(h => `<div class="hit"><a href="${h.file}#page=${h.page}" target="_blank" rel="noopener">${h.name} — ${es() ? "página" : "page"} ${h.page} ↗</a> <span class="r6-meta">${h.count}×</span><div>${esc(h.snip).replace(rx, m => `<mark>${m}</mark>`)}</div></div>`).join("");
}
function records(){
  if (!$("promList")) return;
  $("volQ").addEventListener("input", () => { clearTimeout(volT); volT = setTimeout(volSearch, 250); }); $("volWhich").addEventListener("change", volSearch);
  $("promList").innerHTML = PROMISES.map(p => `<div class="r6-prom"><span class="lt ${p[3]}"></span><div><b>${esc(p[1])}</b><small>${esc(p[0])} · ${esc(p[2])}</small></div><div class="s">${esc(p[4])}</div></div>`).join("");
  $("unansList").innerHTML = UNANSWERED.map(u => `<div class="r6-li"><b>${esc(u[1])}</b> · <small style="color:var(--muted)">${esc(u[0])}</small><br>${esc(u[2])}</div>`).join("");
  $("waitList").innerHTML = WAITING.map(w => `<div class="r6-li">${esc(w[0])} <span class="tag">${esc(w[1])}</span></div>`).join("");
  $("numList").innerHTML = NUMBERS.map(n => `<div><b>${esc(n[0])}</b><small>${esc(n[1])}</small></div>`).join("");
  $("masterTL").innerHTML = TIMELINE.map(t => `<div><b>${esc(t[0])}</b> — ${esc(t[1])}</div>`).join("");
  $("corrList").innerHTML = CORRECTIONS.map(c => `<div class="r6-li"><b>${esc(c[0])}</b> — ${esc(c[1])}</div>`).join("");
  $("verList").innerHTML = VERSIONS.map(v => `<div class="r6-li"><b>${esc(v[0])}</b> — ${esc(v[1])}</div>`).join("");
  $("srcList").innerHTML = SOURCES.map(s => `<a class="linkcard" href="${s[1]}" target="_blank" rel="noopener">${esc(s[0])} <span>↗</span></a>`).join("");
}

/* ---------------- council ---------------- */
function council(){
  if (!$("cProg")) return;
  $("cProg").innerHTML = COUNCIL_PROG.map(p => `<div class="${p[2]}">${p[2] === "done" ? "✓ " : p[2] === "now" ? "● " : ""}${esc(p[0])}<small>${esc(p[1])}</small></div>`).join("");
  $("cSchools").innerHTML = COUNCIL_SCHOOLS.map(s => `<div class="card r6-sch"><span class="st st-${s[2]}">${esc(s[3]).toUpperCase()}</span><h3 style="margin:0 0 4px">${esc(s[0])}</h3><small style="color:var(--muted);font-weight:700">${es() ? "Grados" : "Grades"} ${s[1]}</small><p style="margin:8px 0 0;font-size:.9rem">${esc(s[4])}</p></div>`).join("");
  $("cCal").innerHTML = COUNCIL_CAL.map(c => `<div class="r6-li"><span class="tag">${esc(c[0])}</span> ${esc(c[1])}</div>`).join("");
  $("cFaq").innerHTML = COUNCIL_FAQ.map(f => `<details class="more" style="margin:6px 0"><summary>${both(f.q)}</summary><p style="margin:6px 0 10px">${both(f.a)}</p></details>`).join("");
}

/* ---------------- games + badges ---------------- */
const BADGES = [["first",{en:"First visit",es:"Primera visita"}],["explorer",{en:"Explorer: 7 pages",es:"Explorador: 7 páginas"}],["penalty",{en:"Penalty pro",es:"Rey de penales"}],["lightning",{en:"Lightning reflexes",es:"Reflejos de rayo"}],["quiz",{en:"Quiz master",es:"Maestro del quiz"}],["predict",{en:"Fortune teller",es:"Adivino"}],
  ["s-visca",{en:"Secret: Visca!",es:"Secreto: ¡Visca!"}],["s-logo",{en:"Secret: logo tapper",es:"Secreto: toca el logo"}],["s-konami",{en:"Secret: ↑↑↓↓←→←→BA",es:"Secreto: ↑↑↓↓←→←→BA"}],["s-star",{en:"Secret: hidden star",es:"Secreto: estrella escondida"}],["s-owl",{en:"Secret: night owl",es:"Secreto: búho nocturno"}]];
const getB = () => LS("zm-badges") || {};
function award(k){ const b = getB(); if (b[k]) return; b[k] = Date.now(); LS("zm-badges", b); const def = BADGES.find(x => x[0] === k); if (def) toast2("🏅 " + def[1][es() ? "es" : "en"]); drawBadges(); }
function drawBadges(){ const l = $("bdgList"); if (!l) return; const b = getB();
  l.innerHTML = BADGES.map(([k, n]) => `<span class="${b[k] ? "got" : ""}">${b[k] ? "🏅" : (k.startsWith("s-") ? "❔" : "○")} ${b[k] || !k.startsWith("s-") ? both(n) : both({en:"Secret",es:"Secreto"})}</span>`).join("");
  $("bdgCount").textContent = `· ${Object.keys(b).length}/${BADGES.length}`; }
function penalty(){
  const box = $("penGame"); if (!box) return; let shots = 0, goals = 0;
  const draw = (msg = "") => { box.innerHTML = `<div class="r6-pen">${["↖","⬆","↗","↙","⬇","↘"].map((a, i) => `<button type="button" data-z="${i}">${a}</button>`).join("")}</div><p style="font-weight:800;margin:8px 0 0">${msg || (es() ? `Tiro ${shots + 1} de 5` : `Shot ${shots + 1} of 5`)} · ⚽ ${goals}</p>`; };
  box.addEventListener("click", e => { const b = e.target.closest("[data-z]"); if (!b) return; if (shots >= 5){ shots = goals = 0; draw(); return; }
    const keeper = Math.floor(Math.random() * 6); shots++; const scored = keeper !== +b.dataset.z; if (scored) goals++;
    draw(scored ? (es() ? "¡GOOOL!" : "GOAL!") : (es() ? "¡Atajado!" : "Saved!")); box.querySelector(`[data-z="${keeper}"]`).classList.add("keeper");
    if (shots >= 5){ box.insertAdjacentHTML("beforeend", `<p style="font-weight:900;margin:4px 0 0">${goals}/5 — ${es() ? "toca para jugar otra vez" : "tap to play again"}</p>`); if (goals >= 4) award("penalty"); } });
  draw();
}
function reaction(){
  const b = $("rxBox"); if (!b) return; let state = "idle", t0 = 0, tm;
  b.onclick = () => {
    if (state === "idle" || state === "done"){ state = "wait"; b.className = "r6-rx wait"; b.textContent = es() ? "Espera…" : "Wait…"; tm = setTimeout(() => { state = "go"; b.className = "r6-rx go"; b.textContent = es() ? "¡AHORA!" : "KIAI! NOW!"; t0 = performance.now(); }, 1200 + Math.random() * 2500); }
    else if (state === "wait"){ clearTimeout(tm); state = "done"; b.className = "r6-rx"; b.textContent = es() ? "Muy pronto — toca otra vez" : "Too soon — tap to retry"; }
    else if (state === "go"){ const ms = Math.round(performance.now() - t0); state = "done"; b.className = "r6-rx"; b.textContent = ms + " ms";
      const best = Math.min(LS("zm-rx") || 9999, ms); LS("zm-rx", best); $("rxOut").textContent = (es() ? "Récord: " : "Best: ") + best + " ms"; if (ms < 300) award("lightning"); }
  };
  const best = LS("zm-rx"); if (best) $("rxOut").textContent = (es() ? "Récord: " : "Best: ") + best + " ms";
}
const QUIZZES = {
  barca:[["When was FC Barcelona founded?",["1899","1920","1902","1950"],0],["Who founded the club?",["Joan Gamper","Johan Cruyff","Pep Guardiola","Lionel Messi"],0],["What is the club's motto?",["Més que un club","Visca el Barça","Força Barça","Som una família"],0],["What is the stadium called?",["Spotify Camp Nou","Santiago Bernabéu","Wanda Metropolitano","Mestalla"],0],["Barça's colors are called…",["Blaugrana","Rojiblanco","Merengue","Txuri-urdin"],0]],
  flags:[["🇲🇿 Which country is this?",["Mozambique","Zimbabwe","Kenya","Angola"],0],["🇿🇼 Which country is this?",["Zimbabwe","Zambia","Mozambique","Ghana"],0],["🇵🇪 Which country is this?",["Peru","Canada","Austria","Poland"],0],["🇩🇪 Which country is this?",["Germany","Belgium","Spain","Italy"],0],["🇫🇷 Which country is this?",["France","Netherlands","Italy","Russia"],0],["🇮🇹 Which country is this?",["Italy","Ireland","Mexico","France"],0],["🇪🇸 Which country is this?",["Spain","Portugal","Peru","Colombia"],0]],
  belt:[["What belt comes after White?",["Gold","Orange","Green","Blue"],0],["What comes after Orange?",["Green","Purple","Gold","Red"],0],["Which belts are in Level 2?",["Purple and Blue","Red and Brown","White and Gold","Black"],0],["What comes after Blue strip?",["Red","Brown","Purple","Green"],0],["What comes right before Black Belt Candidate?",["Brown strip","Red strip","Blue","Brown"],0]]
};
window.QUIZZES_R6 = QUIZZES;
function quiz(){
  const box = $("qzBox"); if (!box) return; let set = [], i = 0, score = 0;
  const shuffle = a => a.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(x => x[1]);
  const show = () => { if (i >= set.length){ box.innerHTML = `<p style="font-weight:900;font-size:1.2rem">${score}/${set.length}</p>`; if (score === set.length) award("quiz"); return; }
    const [q, opts, c] = set[i]; const ord = shuffle(opts.map((o, k) => [o, k === c]));
    box.innerHTML = `<div class="r6-qz"><p style="font-weight:800;margin:0">${i + 1}. ${esc(q)}</p>${ord.map(([o, ok]) => `<button type="button" class="opt" data-ok="${ok ? 1 : 0}">${esc(o)}</button>`).join("")}</div>`; };
  box.addEventListener("click", e => { const b = e.target.closest("button.opt"); if (!b || b.disabled) return; box.querySelectorAll("button.opt").forEach(x => { x.disabled = true; if (x.dataset.ok === "1") x.classList.add("right"); });
    if (b.dataset.ok === "1") score++; else b.classList.add("wrong"); setTimeout(() => { i++; show(); }, 900); });
  $("qzGo").onclick = () => { set = shuffle(QUIZZES[$("qzSel").value]).slice(0, 5); i = 0; score = 0; show(); };
  box.innerHTML = `<p class="hint">${es() ? "Elige un quiz y presiona ▶" : "Pick a quiz and press ▶"}</p>`;
}
function predictor(){
  const box = $("predBox"); if (!box || typeof FIXTURES === "undefined") return;
  const next = FIXTURES.filter(f => f.at && new Date(f.at) > new Date()).slice(0, 3);
  const saved = LS("zm-preds") || {};
  if (!next.length){ box.innerHTML = `<p class="hint">${es() ? "No hay partidos próximos." : "No upcoming matches listed."}</p>`; return; }
  box.innerHTML = next.map(f => { const k = f.at, p = saved[k] || {}; return `<div class="r6-li"><b>${both(f)}</b><br><small style="color:var(--muted)">${new Date(f.at).toLocaleString(es() ? "es-ES" : "en-US", { dateStyle:"medium", timeStyle:"short" })}</small>
    <div class="row" style="margin-top:6px"><input type="number" min="0" max="15" value="${p.b ?? ""}" data-k="${k}" data-s="b" style="width:64px" aria-label="Barça goals"> – <input type="number" min="0" max="15" value="${p.o ?? ""}" data-k="${k}" data-s="o" style="width:64px" aria-label="Opponent goals"></div></div>`; }).join("") + `<p class="hint" style="margin:8px 0 0">${es() ? "Tu predicción se guarda en este dispositivo." : "Your prediction is saved on this device."}</p>`;
  box.addEventListener("input", e => { const x = e.target.closest("[data-k]"); if (!x) return; const s = LS("zm-preds") || {}; s[x.dataset.k] = s[x.dataset.k] || {}; s[x.dataset.k][x.dataset.s] = x.value; LS("zm-preds", s); award("predict"); });
}
const WORDS = [["abogar","to advocate","Quiero abogar por mis compañeros."],["la junta","the board","La junta vota esta noche."],["el compromiso","the commitment","El jefe cumplió su compromiso."],["el cinturón","the belt","Gané mi cinturón negro."],["la patada","the kick","Practica tu patada lateral."],["el presupuesto","the budget","El presupuesto se aprueba en octubre."],["la encuesta","the survey","Responde la encuesta, por favor."],["el consejo","the council","El consejo estudiantil se reúne pronto."],["la confianza","confidence / trust","Construí mi confianza poco a poco."],["la voz","the voice","Tu voz importa."],["el maestro","the teacher","Quiero ser maestro de estudios sociales."],["el barrio","the neighborhood","Mi barrio es Sun Prairie."],["la beca","the scholarship","Solicité una beca."],["el partido","the match","¡Hoy hay partido del Barça!"]];
const RIDDLES = [["What has keys but can't open locks?","A piano","¿Qué tiene llaves pero no abre cerraduras?","Un piano"],["What gets wetter the more it dries?","A towel","¿Qué se moja más mientras más seca?","Una toalla"],["What has hands but can't clap?","A clock","¿Qué tiene manos pero no aplaude?","Un reloj"],["What can you catch but not throw?","A cold","¿Qué puedes atrapar pero no lanzar?","Un resfriado"],["What goes up but never comes down?","Your age","¿Qué sube pero nunca baja?","Tu edad"],["What has a neck but no head?","A bottle","¿Qué tiene cuello pero no cabeza?","Una botella"],["The more you take, the more you leave behind. What are they?","Footsteps","Mientras más tomas, más dejas atrás. ¿Qué son?","Pasos"]];
function daily(){
  const w = WORDS[dayIndex() % WORDS.length]; if ($("wodBox")) $("wodBox").innerHTML = `<p style="font-family:'Source Serif 4',serif;font-size:1.8rem;font-weight:700;margin:0;color:var(--navy)">${esc(w[0])}</p><p style="margin:2px 0 8px;font-weight:700">${esc(w[1])}</p><p style="margin:0;font-style:italic">“${esc(w[2])}”</p>`;
  const r = RIDDLES[dayIndex() % RIDDLES.length]; if ($("ridBox")) $("ridBox").innerHTML = `<p style="font-weight:800;margin:0">${both({en:r[0],es:r[2]})}</p><details class="more" style="margin-top:8px"><summary>${both({en:"Show answer",es:"Ver respuesta"})}</summary><p style="margin:6px 0">${both({en:r[1],es:r[3]})}</p></details>`;
}
function secrets(){
  award("first");
  const h = new Date().getHours(); if (h >= 22 || h < 5) award("s-owl");
  const seen = new Set(LS("zm-seen") || []); const track = () => { const id = (location.hash || "#home").slice(1); seen.add(id); LS("zm-seen", [...seen]); if (seen.size >= 7) award("explorer"); };
  addEventListener("hashchange", track); track();
  let buf = ""; const kon = "ArrowUpArrowUpArrowDownArrowDownArrowLeftArrowRightArrowLeftArrowRightba"; let kb = "";
  document.addEventListener("keydown", e => { if (/input|textarea/i.test(document.activeElement.tagName)) return; buf = (buf + e.key.toLowerCase()).slice(-5); if (buf === "visca") award("s-visca"); kb = (kb + e.key).slice(-kon.length); if (kb === kon) award("s-konami"); });
  let taps = 0, tt; document.querySelectorAll(".brand img, header .logo, .badge").forEach(l => l.addEventListener("click", () => { taps++; clearTimeout(tt); tt = setTimeout(() => taps = 0, 1500); if (taps >= 5) award("s-logo"); }));
  const f = document.querySelector("footer"); if (f){ const s = document.createElement("button"); s.type = "button"; s.textContent = "★"; s.setAttribute("aria-label", "Hidden star"); s.style.cssText = "background:none;border:0;color:inherit;opacity:.25;cursor:pointer;font-size:.8rem;padding:2px"; s.onclick = () => award("s-star"); f.querySelector(".wrap")?.append(s); }
  drawBadges();
}

/* ---------------- community ---------------- */
function community(){
  if (!$("rsvpList")) return;
  const evs = (typeof EVENTS !== "undefined" ? EVENTS : []).filter(e => e.date.length === 10 && e.date >= today()).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6);
  $("rsvpList").innerHTML = evs.map((e, i) => `<div class="r6-li" style="display:flex;justify-content:space-between;gap:8px;align-items:center"><span><span class="tag">${e.date.slice(5)}</span> ${both(e)}</span><button type="button" class="r6-copy" style="margin:0" data-rsvp="${i}">RSVP</button></div>`).join("") || `<p class="hint">—</p>`;
  $("rsvpList").onclick = ev => { const b = ev.target.closest("[data-rsvp]"); if (!b) return; const e = evs[+b.dataset.rsvp]; $("rsvpForm").hidden = false; $("rsvpEvent").value = e.date + " — " + e.en; $("rsvpLabel").innerHTML = `${e.date} · ${both(e)}`; $("rsvpForm").scrollIntoView({ block:"nearest" }); };
  $("schoolList").innerHTML = SCHOOLS.map(s => `<div class="dir"><div><b>${esc(s[0])}</b><small>${es() ? "Grados" : "Grades"} ${s[1]}</small></div><a href="https://www.sunprairieschools.org" target="_blank" rel="noopener">↗</a></div>`).join("");
}

/* ---------------- contact routing + spam trap ---------------- */
function routing(){
  const f = $("contactForm"), sel = $("cf-topic"); if (!f || !sel) return;
  const map = { "Student Voice":["contact-studentvoice","studentvoicesp@gmail.com"], "ALPR":["contact-alpr","sunprairiealpr@gmail.com"] };
  const note = document.createElement("div"); note.className = "r6-route-note"; sel.after(note);
  const upd = () => { const m = map[sel.value] || ["contact","zackarymark160@gmail.com"]; f.setAttribute("name", m[0]); const h = f.querySelector('input[name="form-name"]'); if (h) h.value = m[0]; note.textContent = (es() ? "Llega a: " : "Goes to: ") + m[1]; };
  sel.addEventListener("change", upd); upd(); routing.upd = upd;
  const T0 = Date.now(); const orig = window.ZM_submit;
  if (orig && !orig.__trap){ const wrapped = function(form){ if (Date.now() - T0 < 2500) return Promise.resolve({ ok:true }); return orig(form); }; wrapped.__trap = 1; window.ZM_submit = wrapped; try { ZM_submit = wrapped; } catch(e){} }
}

/* ---------------- posts: reading time, tags, related, weekly recap ---------------- */
const TAGS = [["advocacy",{en:"Advocacy",es:"Abogacía"},/board|district|student|council|newsletter|weighted|superintendent|survey/i],["alpr",{en:"Plate readers",es:"Lectores de placas"},/alpr|flock|axon|plate|police|chief/i],["kicks",{en:"Kicks",es:"Kicks"},/kicks|belt|karate|martial/i],["school",{en:"School",es:"Escuela"},/school|class|college|yearbook|ap |marketing|bank/i]];
let TAGF = "";
function posts(){
  const wrap = $("posts"); if (!wrap) return;
  if (!$("postTags")){ wrap.insertAdjacentHTML("beforebegin", `<div id="weeklyRecap"></div><div class="r6-tags" id="postTags"><button type="button" class="on" data-tag="">${both({en:"All",es:"Todo"})}</button>${TAGS.map(t => `<button type="button" data-tag="${t[0]}">${both(t[1])}</button>`).join("")}</div>`);
    $("postTags").onclick = e => { const b = e.target.closest("[data-tag]"); if (!b) return; TAGF = b.dataset.tag; $("postTags").querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b)); posts(); }; }
  const cards = [...wrap.querySelectorAll(".post")];
  cards.forEach(c => {
    const txt = c.textContent; const tags = TAGS.filter(t => t[2].test(txt)).map(t => t[0]); c.dataset.tags = tags.join(" ");
    c.hidden = !!TAGF && !tags.includes(TAGF);
    if (!c.querySelector(".r6-meta")){ const words = (c.querySelector("p.en")?.textContent || "").split(/\s+/).length; c.querySelector("time")?.insertAdjacentHTML("afterend", `<span class="r6-meta">· ${Math.max(1, Math.round(words / 200))} min ${es() ? "de lectura" : "read"}</span>`); }
  });
  cards.forEach(c => { if (c.querySelector(".r6-related")) return; const my = (c.dataset.tags || "").split(" ").filter(Boolean); if (!my.length) return;
    const rel = cards.filter(o => o !== c && my.some(t => (o.dataset.tags || "").includes(t))).slice(0, 2); if (!rel.length) return;
    c.insertAdjacentHTML("beforeend", `<div class="r6-related">${both({en:"Related:",es:"Relacionado:"})} ${rel.map(o => `<a href="#updates" data-jump="${cards.indexOf(o)}">${o.querySelector("h3 .en")?.textContent || ""}</a>`).join(" · ")}</div>`); });
  wrap.onclick = e => { const a = e.target.closest("[data-jump]"); if (a){ e.preventDefault(); cards[+a.dataset.jump]?.scrollIntoView({ behavior:"smooth", block:"center" }); } };
  const wk = (typeof POSTS !== "undefined" ? POSTS : []).filter(p => p.date.length === 10 && p.date <= today() && (Date.now() - new Date(p.date + "T12:00")) < 7 * 864e5);
  $("weeklyRecap").innerHTML = wk.length ? `<div class="r6-recap"><b>${both({en:"This week:",es:"Esta semana:"})}</b> ${wk.map(p => both(p.title)).join(" · ")}</div>` : "";
}

/* ---------------- look + accessibility settings ---------------- */
const PREF_KEYS = ["hc","rm","dys","pol","cur","pat","div"];
function look(){
  const p = LS("zm-look") || {}; const root = document.documentElement;
  const apply = () => { root.classList.remove("th-barca","th-sp"); if (p.theme && p.theme !== "classic") root.classList.add("th-" + p.theme); PREF_KEYS.forEach(k => root.classList.toggle(k, !!p[k])); LS("zm-look", p); };
  apply();
  if (p.dys || true){ const l = document.createElement("link"); l.rel = "stylesheet"; l.href = "https://fonts.googleapis.com/css2?family=Lexend:wght@400;700&display=swap"; document.head.append(l); }
  const tools = document.querySelector(".topbar .tools"); if (!tools || $("tLook")) return;
  const btn = document.createElement("button"); btn.className = "tool"; btn.id = "tLook"; btn.setAttribute("aria-label", "Display settings"); btn.textContent = "⚙️"; tools.insertBefore(btn, tools.querySelector(".lang"));
  const panel = document.createElement("div"); panel.className = "r6-panel"; panel.hidden = true; panel.setAttribute("role", "dialog"); panel.setAttribute("aria-label", "Display settings");
  const row = (k, en, esL) => `<label><span>${both({en, es:esL})}</span><input type="checkbox" data-p="${k}" ${p[k] ? "checked" : ""}></label>`;
  panel.innerHTML = `<h4>${both({en:"Display",es:"Pantalla"})}</h4><label><span>${both({en:"Theme",es:"Tema"})}</span><select data-p="theme"><option value="classic">Classic</option><option value="barca" ${p.theme === "barca" ? "selected" : ""}>Barça</option><option value="sp" ${p.theme === "sp" ? "selected" : ""}>Sun Prairie</option></select></label>
    ${row("hc","High contrast","Alto contraste")}${row("rm","Reduce motion","Menos movimiento")}${row("dys","Easy-read font","Letra fácil de leer")}${row("pol","Polaroid photos","Fotos polaroid")}${row("cur","Fun cursor","Cursor divertido")}${row("pat","Background pattern","Fondo con patrón")}${row("div","Wavy dividers","Divisores ondulados")}
    <label><span>${both({en:"Seasonal effects",es:"Efectos de temporada"})}</span><input type="checkbox" data-p="noseason" ${p.noseason ? "" : "checked"}></label>`;
  document.body.append(panel);
  btn.onclick = e => { e.stopPropagation(); panel.hidden = !panel.hidden; };
  document.addEventListener("click", e => { if (!panel.hidden && !panel.contains(e.target) && e.target !== btn) panel.hidden = true; });
  panel.addEventListener("change", e => { const k = e.target.dataset.p; if (!k) return; if (k === "theme") p.theme = e.target.value; else if (k === "noseason") p.noseason = !e.target.checked; else p[k] = e.target.checked; apply(); season(); });
  if (!p.rm && matchMedia("(prefers-reduced-motion: reduce)").matches) root.classList.add("rm");
}
let seasonRaf = null;
function season(){
  const p = LS("zm-look") || {}; const old = $("leaves"); if (seasonRaf) cancelAnimationFrame(seasonRaf); if (old) old.remove();
  if (p.noseason || p.rm) { const sn = $("snow"); if (sn && p.noseason) sn.style.display = "none"; return; }
  const d = new Date(), m = d.getMonth(), day = d.getDate();
  const fall = (m === 8) || (m === 9) || (m === 10 && day < 15), spring = (m === 2 && day >= 20) || m === 3 || m === 4;
  if (!fall && !spring) return;
  const c = document.createElement("canvas"); c.id = "leaves"; c.setAttribute("aria-hidden", "true"); c.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:2"; document.body.append(c);
  const x = c.getContext("2d"); const size = () => { c.width = innerWidth; c.height = innerHeight; }; size(); addEventListener("resize", size);
  const cols = fall ? ["#e85d04","#f2b705","#b45309","#c2410c"] : ["#f9a8d4","#fbcfe8","#f472b6","#fde68a"];
  const ps = Array.from({ length:Math.min(28, innerWidth / 40 | 0) }, () => ({ x:Math.random() * innerWidth, y:Math.random() * innerHeight, r:4 + Math.random() * 5, s:.4 + Math.random() * .8, a:Math.random() * 6, c:cols[Math.random() * cols.length | 0] }));
  (function tick(){ x.clearRect(0, 0, c.width, c.height); ps.forEach(q => { q.y += q.s; q.a += .02; q.x += Math.sin(q.a) * .6; if (q.y > c.height + 10){ q.y = -10; q.x = Math.random() * c.width; } x.save(); x.translate(q.x, q.y); x.rotate(q.a); x.fillStyle = q.c; x.beginPath(); x.ellipse(0, 0, q.r, q.r * .55, 0, 0, 7); x.fill(); x.restore(); }); seasonRaf = requestAnimationFrame(tick); })();
}
function loadbar(){ const b = document.createElement("div"); b.id = "r6load"; document.body.append(b);
  addEventListener("hashchange", () => { b.style.opacity = 1; b.style.width = "70%"; setTimeout(() => { b.style.width = "100%"; setTimeout(() => { b.style.opacity = 0; setTimeout(() => b.style.width = 0, 400); }, 250); }, 150); }); }
function swipe(){
  let sx = 0, sy = 0; const main = document.querySelector("main.wrap"); if (!main) return;
  main.addEventListener("touchstart", e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive:true });
  main.addEventListener("touchend", e => { const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) < 80 || Math.abs(dy) > 50 || e.target.closest("input,textarea,select,canvas,.r6-table,.kan,.masonry")) return;
    const subs = [...document.querySelectorAll("#subtabs a")]; if (subs.length < 2) return; const i = subs.findIndex(a => a.classList.contains("on"));
    const n = subs[i + (dx < 0 ? 1 : -1)]; if (n) location.hash = n.getAttribute("href"); }, { passive:true });
}
function langDetect(){ try { if (!localStorage.getItem("zm-lang") && /^es\b/i.test(navigator.language || "") && typeof setLang === "function") setLang("es"); } catch(e){} }

/* ---------------- wire up ---------------- */
function rerenderLang(){ tools.steps && tools.steps(); letter.build && letter.build(); recap.build && recap.build(); routing.upd && routing.upd(); daily(); fillTicker(); drawBadges(); }
function init(){
  langDetect(); look(); season(); loadbar(); swipe(); home(); tools(); records(); council(); penalty(); reaction(); quiz(); predictor(); daily(); secrets(); community(); routing(); posts();
  if (typeof renderPosts === "function" && !renderPosts.__r6){ const o = renderPosts; const w = function(){ o.apply(this, arguments); try { posts(); fillTicker(); } catch(e){} }; w.__r6 = 1; try { renderPosts = w; } catch(e){} }
  document.querySelectorAll(".lang button").forEach(b => b.addEventListener("click", () => setTimeout(rerenderLang, 0)));
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
