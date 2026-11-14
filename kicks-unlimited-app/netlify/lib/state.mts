// Shared studio data: one JSON document in Netlify Blobs, filtered per person and guarded by per-role rules.
import crypto from "node:crypto";
import { kv } from "./store.mts";
import seedState from "./seed.mts";
import { mailOn, smsOn, sendMail, sendSMS } from "./mail.mts";

export const ARR = ["students", "families", "staff", "shifts", "subs", "newsSubs", "events", "news", "messages", "inquiries", "parties", "signups", "absences", "invoices", "outbox", "resetReqs", "lost", "makeups", "promos", "rtlog", "plans", "drills", "hours", "faq", "gallery", "reviews", "inventory", "trades", "chat", "tips", "incidents", "timeoff", "onbItems", "onbQuiz", "orders", "guestWaivers", "requests", "lessonSlots", "rides", "ratings", "videos", "album", "templates", "votes", "tlog", "assign", "eos", "trivia", "giftCards", "codes", "expenses", "equipment", "surveys", "surveyAns", "webchat", "routines", "homework", "progress", "otw", "volunteers", "suggest", "journal", "testimonials", "reacts", "challenges", "chLog", "forms", "avail", "quizzes", "quizAns", "kudos", "pulse", "mileage", "pretrip", "swaps", "teachFb", "meds", "memberships", "social", "newsletters", "supply", "audit", "docs", "blog", "signouts", "goals", "meetSlots", "letters", "partyGuests", "swapItems", "rentals", "posts", "badges", "habits", "askBox", "kidVids", "photoReacts", "evals", "shadow", "behav", "chkLog", "ann", "annRead", "polls", "pollVotes", "handoff", "trainLog", "tgoals", "wish", "wishVote", "bioReqs", "covers", "hrsOk", "vendors", "ownerNotes", "todos", "donations", "sponsors", "schools", "spaceReqs", "press", "partners", "rsvps", "subs", "consents", "setHist", "formVids", "credits", "ocfg", "pages", "schApps", "ptips", "moves", "thanks", "trivScores", "subNotes", "res", "mentorLog", "classRate", "supplyReq", "convLog", "staffQ", "comp", "vendorPrices", "contractTpl", "growth", "loc2", "manual", "stories", "blogPlan", "drives", "deals", "alumni", "svcHours", "fireDrills", "photoHide", "art", "photoContest", "bloopers", "gearOut", "launch", "duties", "feedback", "classWait", "wsSign"];
export const OBJ2 = ["checks", "asp"];
export const OBJ = ["bdsign", "rankCodes", "banner", "billing", "mail", "site", "tuition", "progInfo", "quest"];
export const SCALAR = ["waiverText", "invNo"];
const SECRET_FAM = ["pw", "reset", "vcode", "vexp", "push", "stripeCus", "stripePm"];
const SECRET_STAFF = ["pw", "pin", "reset", "ecode", "eexp", "push"];

/* ---------- passwords ----------
   The browser sends sha256("kicks-sp:" + password). The server never stores that value as-is any more:
   it keeps a salted scrypt of it ("s1$salt$hash"), so a leaked backup can't be used to log in.
   New and reset staff accounts get a one-time temporary password (pwTemp) and must pick their own.
   Accounts still on the old shared starter password only work if the owner sets KICKS_STARTER_PW in Netlify,
   and they too must pick their own password right after logging in. */
const LEGACY_STARTER = sha("kicks-sp:kicks2026");
export const DEFAULT_PW = "starter"; // marker stored on accounts that use the shared starter password
export function starterHash() { const p = String(process.env.KICKS_STARTER_PW || ""); return p.length >= 8 && p !== "kicks2026" ? sha("kicks-sp:" + p) : ""; }
export const isStarter = (rec: any) => !!rec && (rec.pw === DEFAULT_PW || rec.pw === LEGACY_STARTER);
export const isStarterInput = (h: string) => h === LEGACY_STARTER || (!!starterHash() && h === starterHash());
const eq = (a: any, b: any) => { const A = Buffer.from(String(a)), B = Buffer.from(String(b)); return A.length === B.length && crypto.timingSafeEqual(A, B); };
export const pwHash = (h: string) => { const salt = crypto.randomBytes(16).toString("hex"); return "s1$" + salt + "$" + crypto.scryptSync(String(h), salt, 32).toString("hex"); };
export function pwCheck(rec: any, h: any) {
  if (!rec || !rec.pw || typeof h !== "string" || !/^[0-9a-f]{64}$/.test(h)) return false;
  if (isStarter(rec)) { const st = starterHash(); return !!st && eq(st, h); }
  const p = String(rec.pw);
  if (p.startsWith("s1$")) { const [, salt, d] = p.split("$"); return !!salt && !!d && eq(crypto.scryptSync(h, salt, 32).toString("hex"), d); }
  return eq(p, h); // saved by an older version: upgraded to scrypt at the next login
}
export const pwLegacy = (rec: any) => !!rec && !!rec.pw && !isStarter(rec) && !String(rec.pw).startsWith("s1$");
export function pwSet(rec: any, h: string) { rec.pw = pwHash(h); delete rec.pwTemp; }
/* a readable one-time password an owner can pass on (no 0/O/1/l look-alikes) */
export function tempPw() { const A = "abcdefghjkmnpqrstuvwxyz23456789"; let o = ""; for (let i = 0; i < 10; i++) o += A[crypto.randomInt(A.length)]; return o.slice(0, 5) + "-" + o.slice(5); }
export function setTempPw(rec: any) { const t = tempPw(); rec.pw = pwHash(sha("kicks-sp:" + t)); rec.pwTemp = true; return t; }
export const mustChangePw = (rec: any) => isStarter(rec) || !!(rec && rec.pwTemp);

export function sha(s: string) { return crypto.createHash("sha256").update(s).digest("hex"); }
export const clone = (o: any) => JSON.parse(JSON.stringify(o));
export const today = () => {
  // studio is in Sun Prairie, WI
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const g = (t: string) => (p.find((x) => x.type === t) || { value: "" }).value;
  return `${g("year")}-${g("month")}-${g("day")}`;
};
export const uid = (p = "") => p + crypto.randomBytes(6).toString("base64url") + Date.now().toString(36).slice(-3);
export const code6 = () => String(crypto.randomInt(100000, 1000000));
const cleanNm=(n: any)=>String(n||"").toLowerCase().replace(/[^a-z ]/g," ").replace(/\s+/g," ").trim().replace(/^(miss|mz)\b/,"ms").replace(/^mister\b/,"mr").replace(/^missus\b/,"mrs");
const TITLE_RX=/^(mr|ms|mrs|coach) /;
function nameKeys(m: any){const k=new Set();[m.name,...(m.aliases||[])].forEach((n: any)=>{const c=cleanNm(n);if(!c)return;k.add(c);const t=c.match(TITLE_RX);const bare=c.replace(TITLE_RX,"");k.add(bare);const w=bare.split(" ");if(t&&w.length>1)k.add(t[1]+" "+(t[1]==="coach"?w[0]:w[w.length-1]))});return k}
export const staffByName = (S: any, n: string) => { const q = cleanNm(n); if (!q) return null; const hit = S.staff.filter((m: any) => nameKeys(m).has(q)); return hit.length === 1 ? hit[0] : null; };
export const normName = (n: string) => String(n || "").toLowerCase().replace(/^(mr|ms|mrs|coach)\.?\s+/, "").replace(/[^a-z ]/g, "").replace(/\s+/g, " ").trim();
// plain addresses only: no quotes, brackets, commas or semicolons that could sneak extra recipients into an email
export const validEmail = (e: string) => String(e || "").length <= 120 && /^[A-Za-z0-9._%+'-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/.test(String(e || ""));

/* every save checks that nobody else saved since we loaded (Netlify Blobs etag); if they did, the request is re-run */
export class StateConflict extends Error {}
const TAGS = new WeakMap<object, string>();
export async function loadState(): Promise<any> {
  const db = await kv();
  let { data: s, etag } = await db.getTagged("state");
  // brand-new site: write the starting data, but only if nothing is stored yet — a glitchy read must never wipe the studio
  if (!s) {
    const fresh = clone(seedState), w = await db.createIfNew("state", fresh);
    if (w.ok) { s = fresh; etag = w.etag; } else { ({ data: s, etag } = await db.getTagged("state")); if (!s) throw new Error("Couldn't read the studio data. Try again in a moment."); }
  }
  TAGS.set(s, etag);
  let mig = false;
  for (const k of ARR) if (!Array.isArray(s[k])) s[k] = [];
  if (!Array.isArray(s.focus)) s.focus = [];
  for (const k of [...OBJ2, ...OBJ]) if (!s[k] || typeof s[k] !== "object") s[k] = {};
  // rank codes: the old ones were printed in the public app files, so the owner sets new ones in Netlify
  // (KICKS_RANK_CODES = "admin=####,ema=####,…": 4 digits each, using only 1–5, which is what the login screen accepts). They replace any code still on its old value.
  const OLD_CODES: any = { admin: "1525", ema: "3412", coach: "4253", lit: "5341", desk: "2135" };
  for (const [r, c] of String(process.env.KICKS_RANK_CODES || "").split(",").map((x) => x.split("=").map((y) => y.trim()))) {
    if (OLD_CODES[r] && /^[1-5]{4}$/.test(c || "") && (!s.rankCodes[r] || s.rankCodes[r] === OLD_CODES[r]) && s.rankCodes[r] !== c) { s.rankCodes[r] = c; mig = true; }
  }
  // newsletter sign-ups used to share the "subs" list with shift sub requests — give them their own list
  if (!Array.isArray(s.newsSubs)) s.newsSubs = [];
  const nl = s.subs.filter((x: any) => x && x.email && !x.shiftId);
  if (nl.length) { s.newsSubs.push(...nl.filter((x: any) => !s.newsSubs.some((y: any) => y.email === x.email))); s.subs = s.subs.filter((x: any) => !nl.includes(x)); mig = true; }
  // owner recovery: KICKS_RESET_ACCOUNT = "Full Name" puts that staff account back on the starter password, once.
  // (To do the same person again later, add "#2", "#3"… to the value.)
  const rescue = String(process.env.KICKS_RESET_ACCOUNT || "").trim();
  if (rescue && s.rescueDone !== rescue) { const m = staffByName(s, rescue.replace(/#\d+$/, "")); if (m) { m.pw = DEFAULT_PW; delete m.pwTemp; delete m.reset; s.rescueDone = rescue; mig = true; console.log("Account reset to starter password:", m.name); } }
  if (redactCodes(s)) mig = true;
  if (await moveDataUrls(s, db)) mig = true;
  if (addCalendars(s)) mig = true;
  if (mig) await saveState(s);
  return s;
}
/* monthly calendars from the studio, added once (by id) so edits and deletes stick */
const CAL_ADDS: any = {"drills-2026-11": {"events": [], "focus": [], "drills": [{"id": "dn-pass", "type": "Warm-up", "min": 5, "name": "Passing drills", "nameEs": "Ejercicios de pases", "how": "1. Triangle passing\n2. Around the world, or number passing\n3. Pass through traffic", "howEs": "1. Pases en triángulo\n2. La vuelta al mundo, o pases por número\n3. Pases entre el tráfico", "focus": "", "by": "Kicks playbook", "ts": 1793750400000}, {"id": "dn-spintracks", "type": "Technique", "min": 5, "name": "Spin Tracks", "nameEs": "Vías de giro", "how": "Put body shields on the floor in a train-track order. Spin kicks land in between the \"tracks\" (the body shields).", "howEs": "Ponga escudos en el piso en orden de vía de tren. Las patadas giratorias caen entre las \"vías\" (los escudos).", "focus": "", "by": "Kicks playbook", "ts": 1793750400000}, {"id": "dn-diag", "type": "Combos", "min": 5, "name": "Diagonal Switch (Mr. Novak)", "nameEs": "Cambio en diagonal (Mr. Novak)", "how": "1. Start at a ring at either end of the floor.\n2. The combo performed in the rings is: f-wheel, ridge-chop, back L-wheel, turn around with it & chop-ridge. Can be swapped for any combo.\n3. Have them run diagonal to the different rings.", "howEs": "1. Empiece en un aro en cualquier extremo del piso.\n2. La combinación en los aros es: f-wheel, ridge-chop, back L-wheel, girar con ella y chop-ridge. Se puede cambiar por cualquier combinación.\n3. Que corran en diagonal a los distintos aros.", "focus": "", "by": "Kicks playbook", "ts": 1793750400000}, {"id": "dn-rings", "type": "Ninja drill", "min": 5, "name": "Circling Rings", "nameEs": "Aros en círculo", "how": "Big rings: hop with two feet. Little rings: hop with one foot.\nFirst person starts hopping through the big rings, then runs around and hops through the little rings, and runs back to the start of the big rings. Keep going in a circle for 1 minute, then have the class switch directions. The second person in line can't go until the first person has started the other line of rings.", "howEs": "Aros grandes: saltar con los dos pies. Aros chicos: saltar con un pie.\nLa primera persona salta por los aros grandes, corre alrededor, salta por los aros chicos y regresa al inicio de los aros grandes. Sigan en círculo 1 minuto y luego cambien de dirección. La segunda persona de la fila no sale hasta que la primera empiece la otra línea de aros.", "focus": "", "by": "Kicks playbook", "ts": 1793750400000}, {"id": "dn-ninjatoss", "type": "Game", "min": 5, "name": "Body Shield Toss — Ninja version", "nameEs": "Lanzamiento de escudo — versión Ninja", "how": "Exactly like Body Shield Toss: standing on one leg, toss back and forth to get to the other side of the floor. But use dodgeballs, and only throw underhand.", "howEs": "Igual que Body Shield Toss: parados en una pierna, lancen de un lado a otro para llegar al otro lado del piso. Pero usen pelotas de dodgeball y solo lancen por debajo.", "focus": "", "by": "Kicks playbook", "ts": 1793750400000}, {"id": "dn-attdef", "type": "Sparring", "min": 10, "name": "Attacker vs. Defender", "nameEs": "Atacante vs. defensor", "how": "Goal: get better at blocking, dodging and counter attacks.\nAttackers throw 4–7 move attack combos. The defender can ONLY dodge and block until the end of the attacker's combo. After that, the defender can throw 1 counter attack to the head. If it lands, the attacker does 10 push-ups.", "howEs": "Meta: mejorar los bloqueos, las esquivas y los contraataques.\nLos atacantes lanzan combinaciones de 4 a 7 movimientos. El defensor SOLO puede esquivar y bloquear hasta que termine la combinación. Después puede lanzar 1 contraataque a la cabeza. Si conecta, el atacante hace 10 lagartijas.", "focus": "", "by": "Kicks playbook", "ts": 1793750400000}, {"id": "dn-sparapp", "type": "Sparring", "min": 10, "name": "Sparring: application of combos from forms", "nameEs": "Combate: aplicación de combinaciones de las formas", "how": "Quest: o-a bl, f-a bl, sk, knhbl, pnch\nVeritas: fk, fk, rk, sk, pnch\nRelevance: knhbl, pnch, i-90 bl, pnch, fk, sk, chp, pnch", "howEs": "Quest: o-a bl, f-a bl, sk, knhbl, pnch\nVeritas: fk, fk, rk, sk, pnch\nRelevance: knhbl, pnch, i-90 bl, pnch, fk, sk, chp, pnch", "focus": "", "by": "Kicks playbook", "ts": 1793750400000}, {"id": "dn-sparideas", "type": "Sparring", "min": 10, "name": "Sparring drill ideas", "nameEs": "Ideas de ejercicios de combate", "how": "• Sparring ladder drill\n• Zone cones\n• Running + wavemaster circles", "howEs": "• Escalera de combate\n• Conos de zona\n• Correr + círculos de wavemaster", "focus": "", "by": "Kicks playbook", "ts": 1793750400000}, {"id": "dn-split", "type": "Sparring", "min": 20, "name": "Split class: Reverberation + boxing sets", "nameEs": "Clase dividida: Reverberation + series de boxeo", "how": "Main floor: Reverberation.\nOther side: boxing sets A, B, C, D. Focus on set D: 1, 2, slip, shuffle 3, 2/4.\nRotate every 20 minutes.", "howEs": "Piso principal: Reverberation.\nEl otro lado: series de boxeo A, B, C, D. Enfoque en la serie D: 1, 2, slip, shuffle 3, 2/4.\nRoten cada 20 minutos.", "focus": "", "by": "Kicks playbook", "ts": 1793750400000}, {"id": "dn-lv3forms", "type": "Forms", "min": 20, "name": "Level 3: form review + applications", "nameEs": "Nivel 3: repaso de formas + aplicaciones", "how": "Everybody is on the main floor. The assistant instructor reviews the form (Kwi-Shi, Quest, Veritas, Chung-Mu, Relevance) 1–2 times, then hands the class to the lead instructor to teach the applications for that form. Repeat the pattern for the other forms.", "howEs": "Todos en el piso principal. El instructor asistente repasa la forma (Kwi-Shi, Quest, Veritas, Chung-Mu, Relevance) 1 o 2 veces y luego pasa la clase al instructor principal para enseñar las aplicaciones de esa forma. Repitan con las otras formas.", "focus": "", "by": "Kicks playbook", "ts": 1793750400000}, {"id": "dn-chungmu", "type": "Forms", "min": 5, "name": "Chung-Mu: common mistakes", "nameEs": "Chung-Mu: errores comunes", "how": "• Count 2 should be a front stance — I see a lot of back stances.\n• Count 18 should be a back stance — I see a lot of front stances.", "howEs": "• El conteo 2 debe ser postura de frente; veo muchas posturas de atrás.\n• El conteo 18 debe ser postura de atrás; veo muchas posturas de frente.", "focus": "", "by": "Kicks playbook", "ts": 1793750400000}, {"id": "dn-cw", "type": "Forms", "min": 5, "name": "CW notes: First Strike & Chung-Mu #10", "nameEs": "Notas CW: First Strike y Chung-Mu #10", "how": "WW First Strike: finish Figure 8.\nChung-Mu #10 is ridge, back round turn, side forearm block.", "howEs": "WW First Strike: terminar la Figura 8.\nChung-Mu #10 es ridge, back round turn, bloqueo lateral de antebrazo.", "focus": "", "by": "Kicks playbook", "ts": 1793750400000}, {"id": "dn-pt", "type": "Combos", "min": 10, "name": "Performance Team focus combo", "nameEs": "Combinación de enfoque — Performance Team", "how": "Combo: L. chop, R. punch, L. ridge, chop, R. punch\nDetails: 90° angle · head checks · straight chops · clean technique · good posture", "howEs": "Combinación: L. chop, R. punch, L. ridge, chop, R. punch\nDetalles: ángulo de 90° · mirar con la cabeza · chops rectos · técnica limpia · buena postura", "focus": "", "by": "Kicks playbook", "ts": 1793750400000}, {"id": "dn-control", "type": "Ninja drill", "min": 5, "focus": "Control", "name": "Ninja Control Drill", "nameEs": "Ejercicio de control Ninja", "how": "Have ninjas hold pads for each other. When the black belt says soft, medium or hard, the ninjas have to kick at that level. Let the black belt call it 5–6 times, then let the pad holder call it for the kicker. Then switch kickers and repeat.", "howEs": "Los ninjas se sostienen las manoplas entre ellos. Cuando el cinta negra dice suave, medio o fuerte, los ninjas patean a ese nivel. El cinta negra lo dice 5 o 6 veces, luego lo dice el que sostiene la manopla. Después cambian de pateador y repiten.", "by": "Kicks playbook", "ts": 1793750400000}, {"id": "dn-lines", "type": "Technique", "min": 10, "name": "Line drills", "nameEs": "Ejercicios en línea", "how": "• Front stance add-on shift with high block, punch.\n• Back stances backward and forward with knife hand blocks.\nCan you do it in sync with another person? (groups of 3 or 4, then the whole class)\nLevel 3: flying spin wheels down the floor? Level 2: back round, turn hooks?", "howEs": "• Postura de frente, cambio con bloqueo alto y golpe.\n• Posturas de atrás hacia atrás y adelante con bloqueos de mano de cuchillo.\n¿Lo pueden hacer sincronizados con otra persona? (grupos de 3 o 4, luego toda la clase)\nNivel 3: ¿flying spin wheels por el piso? Nivel 2: ¿back round, turn hooks?", "focus": "", "by": "Kicks playbook", "ts": 1793750400000}, {"id": "dn-formgame", "type": "Game", "min": 10, "name": "Form Game (UKU plan)", "nameEs": "Juego de formas (plan UKU)", "how": "Start with 1 or 2 reviews of the form. After review, divide the class into 2 teams, every other person on a different team (red, blue, red, etc.). Go down the line: each student says the next move/count from where they are. If they get the next move wrong, or get a move wrong in the next count, the other team gets a point. Keep going until the end of the form. However many points the other team has, your team does that many burpees. If both teams get every move right through the whole form, instructors do DOUBLE the burpees for each student in class.\nSteal rule: if a wrong move is called, every student on both teams can raise their hand with the loudest \"me sir\" to say the correct technique for a bonus point. If someone on the same team as the person who got it wrong gets it right, they steal the point the other team would have gotten.", "howEs": "Empiece con 1 o 2 repasos de la forma. Luego divida la clase en 2 equipos, alternando (rojo, azul, rojo, etc.). Recorran la fila: cada estudiante dice el siguiente movimiento/conteo. Si se equivoca en el siguiente movimiento, o en un movimiento del siguiente conteo, el otro equipo gana un punto. Sigan hasta el final de la forma. Su equipo hace tantos burpees como puntos tenga el otro equipo. Si los dos equipos aciertan todo, los instructores hacen el DOBLE de burpees por cada estudiante.\nRegla de robo: si se dice un movimiento equivocado, cualquier estudiante puede levantar la mano con el \"me sir\" más fuerte para decir la técnica correcta y ganar un punto extra. Si quien acierta es del mismo equipo que quien se equivocó, roba el punto que iba a ganar el otro equipo.", "focus": "", "by": "Kicks playbook", "ts": 1793750400000}, {"id": "dn-wu-bounce", "type": "Warm-up", "min": 3, "name": "Bounce and jab punch in different directions", "nameEs": "Rebotar y lanzar jab en distintas direcciones", "how": "", "howEs": "", "focus": "", "by": "Kicks playbook", "ts": 1793750400000}, {"id": "dn-wu-ski", "type": "Warm-up", "min": 3, "name": "Ski jumps", "nameEs": "Saltos de esquí", "how": "", "howEs": "", "focus": "", "by": "Kicks playbook", "ts": 1793750400000}, {"id": "dn-wu-wave", "type": "Warm-up", "min": 3, "name": "Wavemaster beat up", "nameEs": "Paliza al wavemaster", "how": "", "howEs": "", "focus": "", "by": "Kicks playbook", "ts": 1793750400000}, {"id": "dn-wu-kickpartner", "type": "Warm-up", "min": 3, "name": "Kick partner down the floor", "nameEs": "Patear al compañero a lo largo del piso", "how": "", "howEs": "", "focus": "", "by": "Kicks playbook", "ts": 1793750400000}, {"id": "dn-wu-relay", "type": "Warm-up", "min": 5, "name": "Relay races", "nameEs": "Carreras de relevos", "how": "", "howEs": "", "focus": "", "by": "Kicks playbook", "ts": 1793750400000}, {"id": "dn-wu-dribble", "type": "Warm-up", "min": 5, "name": "Dribbling dodgeballs", "nameEs": "Driblar pelotas de dodgeball", "how": "Dribble dodgeballs down the floor and back.", "howEs": "Driblen las pelotas de dodgeball hasta el otro lado del piso y de regreso.", "focus": "", "by": "Kicks playbook", "ts": 1793750400000}, {"id": "dn-wu-run", "type": "Warm-up", "min": 3, "name": "Running in place: up, back, in, out", "nameEs": "Correr en el lugar: arriba, atrás, adentro, afuera", "how": "", "howEs": "", "focus": "", "by": "Kicks playbook", "ts": 1793750400000}, {"id": "dn-wu-masters", "type": "Warm-up", "min": 5, "name": "Masters & Ninjas", "nameEs": "Maestros y Ninjas", "how": "", "howEs": "", "focus": "", "by": "Kicks playbook", "ts": 1793750400000}, {"id": "dn-wu-shtag", "type": "Warm-up", "min": 5, "name": "Shoulder tag", "nameEs": "Toque de hombro", "how": "", "howEs": "", "focus": "", "by": "Kicks playbook", "ts": 1793750400000}]}, "2026-11": {"events": [{"id": "n26-02", "date": "2026-11-02", "title": "Sparring (BBT)", "titleEs": "Combate (BBT)", "kind": "event", "aud": "all", "desc": "", "descEs": ""}, {"id": "n26-07", "date": "2026-11-07", "title": "Black Belt & Degree Test", "titleEs": "Examen de cinturón negro y de grado", "kind": "grad", "aud": "all", "time": "10:00", "desc": "10am at Kicks.", "descEs": "10 a. m. en Kicks."}, {"id": "n26-09", "date": "2026-11-09", "title": "Nunchucks (BBT)", "titleEs": "Nunchakus (BBT)", "kind": "event", "aud": "all", "desc": "", "descEs": ""}, {"id": "n26-10", "date": "2026-11-10", "title": "Bonus Day: Nunchucks (BBT)", "titleEs": "Día extra: Nunchakus (BBT)", "kind": "event", "aud": "all", "desc": "", "descEs": ""}, {"id": "n26-16", "date": "2026-11-16", "title": "Sparring (BBT)", "titleEs": "Combate (BBT)", "kind": "event", "aud": "all", "desc": "", "descEs": ""}, {"id": "n26-17", "date": "2026-11-17", "title": "Sparring Week: Level 3 & UKU", "titleEs": "Semana de combate: Nivel 3 y UKU", "kind": "event", "aud": "all", "desc": "", "descEs": ""}, {"id": "n26-18", "date": "2026-11-18", "title": "Sparring Week: Level 2 & UKU", "titleEs": "Semana de combate: Nivel 2 y UKU", "kind": "event", "aud": "all", "desc": "", "descEs": ""}, {"id": "n26-19", "date": "2026-11-19", "title": "Sparring Week: Levels 2, 3 & UKU", "titleEs": "Semana de combate: Niveles 2, 3 y UKU", "kind": "event", "aud": "all", "desc": "", "descEs": ""}, {"id": "n26-20", "date": "2026-11-20", "title": "Sparring Week: Levels 2 & 3", "titleEs": "Semana de combate: Niveles 2 y 3", "kind": "event", "aud": "all", "desc": "", "descEs": ""}, {"id": "n26-20s", "date": "2026-11-20", "title": "Pre-Black Friday Online Sale", "titleEs": "Venta en línea antes del Black Friday", "kind": "event", "aud": "all", "time": "09:00", "desc": "Starts at 9am.", "descEs": "Empieza a las 9 a. m."}, {"id": "n26-23", "date": "2026-11-23", "title": "Review & Test Prep (BBT)", "titleEs": "Repaso y preparación para el examen (BBT)", "kind": "event", "aud": "all", "desc": "", "descEs": ""}, {"id": "n26-25", "date": "2026-11-25", "title": "Closed", "titleEs": "Cerrado", "kind": "event", "aud": "all", "noClasses": true, "desc": "Kicks is closed Nov 25–29.", "descEs": "Kicks está cerrado del 25 al 29 de noviembre."}, {"id": "n26-26", "date": "2026-11-26", "title": "Closed", "titleEs": "Cerrado", "kind": "event", "aud": "all", "noClasses": true, "desc": "Kicks is closed Nov 25–29.", "descEs": "Kicks está cerrado del 25 al 29 de noviembre."}, {"id": "n26-27", "date": "2026-11-27", "title": "Closed", "titleEs": "Cerrado", "kind": "event", "aud": "all", "noClasses": true, "desc": "Kicks is closed Nov 25–29.", "descEs": "Kicks está cerrado del 25 al 29 de noviembre."}, {"id": "n26-28", "date": "2026-11-28", "title": "Closed", "titleEs": "Cerrado", "kind": "event", "aud": "all", "noClasses": true, "desc": "Kicks is closed Nov 25–29.", "descEs": "Kicks está cerrado del 25 al 29 de noviembre."}, {"id": "n26-29", "date": "2026-11-29", "title": "Closed", "titleEs": "Cerrado", "kind": "event", "aud": "all", "noClasses": true, "desc": "Kicks is closed Nov 25–29.", "descEs": "Kicks está cerrado del 25 al 29 de noviembre."}, {"id": "n26-30", "date": "2026-11-30", "title": "Review & Test Prep (BBT)", "titleEs": "Repaso y preparación para el examen (BBT)", "kind": "event", "aud": "all", "desc": "", "descEs": ""}, {"id": "d26-01", "date": "2026-12-01", "title": "Save the Date: Free Community Pics with Santa", "titleEs": "Reserve la fecha: fotos gratis con Santa", "kind": "event", "aud": "all", "time": "16:30", "desc": "4:30 to 6pm at Kicks. Sign-up coming soon!", "descEs": "De 4:30 a 6 p. m. en Kicks. ¡Pronto abrimos inscripciones!"}, {"id": "d26-05", "date": "2026-12-05", "title": "Save the Date: All Level Graduation", "titleEs": "Reserve la fecha: Graduación de todos los niveles", "kind": "grad", "aud": "all", "desc": "Details coming soon!", "descEs": "¡Pronto daremos más detalles!"}], "focus": [{"wk": "2026-11-01", "n": 8, "ln": "Teamwork", "lv": "Levels 1–3: Self Defense", "lvEs": "Niveles 1–3: Defensa personal"}, {"wk": "2026-11-08", "n": 9, "ln": "Focus", "lv": "Levels 1–3: Self Defense", "lvEs": "Niveles 1–3: Defensa personal"}, {"wk": "2026-11-15", "n": 10, "ln": "Coordination", "lv": "Level 1: Review · Levels 2 & 3: Sparring Week", "lvEs": "Nivel 1: Repaso · Niveles 2 y 3: Semana de combate"}, {"wk": "2026-11-22", "n": 11, "ln": "Fitness", "lv": "Levels 1–3: Review & Test Prep", "lvEs": "Niveles 1–3: Repaso y preparación para el examen"}, {"wk": "2026-11-29", "n": 12, "ln": "Review", "lv": "Levels 1–3: Review & Test Prep", "lvEs": "Niveles 1–3: Repaso y preparación para el examen"}]}};
function addCalendars(S: any) { S.calAdded = S.calAdded || []; let n = 0; for (const [k, c] of Object.entries(CAL_ADDS) as any) { if (S.calAdded.includes(k)) continue; for (const e of c.events) if (!S.events.some((x: any) => x.id === e.id || (x.date === e.date && x.title === e.title))) { S.events.push({ ...e }); n++; } for (const f of c.focus) if (!S.focus.some((x: any) => x.wk === f.wk)) { S.focus.push({ ...f }); n++; } for (const d of c.drills || []) if (!S.drills.some((x: any) => x.id === d.id || x.name === d.name)) { S.drills.push({ ...d }); n++; } S.calAdded.push(k); n++; } if (n) { S.events.sort((a: any, b: any) => a.date < b.date ? -1 : 1); S.focus.sort((a: any, b: any) => a.wk < b.wk ? -1 : 1); } return n; }
/* pictures saved inside the data by older versions move into their own files (once) */
async function moveDataUrls(s: any, db: any) {
  let n = 0;
  const mv = async (o: any, k: string) => {
    const v = o && o[k]; if (typeof v !== "string") return;
    const m = v.match(/^data:(image\/(jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/); if (!m) return;
    const id = uid("m").replace(/[^\w-]/g, ""); await db.set("media/" + id, { type: m[1], b64: m[3] }); o[k] = "/api/media/" + id; n++;
  };
  for (const x of s.students || []) await mv(x, "pic");
  for (const x of s.staff || []) if (x.web) await mv(x.web, "photo");
  for (const x of s.gallery || []) await mv(x, "src");
  for (const x of s.news || []) await mv(x, "photo");
  for (const x of s.lost || []) await mv(x, "photo");
  for (const x of s.chat || []) await mv(x, "img");
  return n > 0;
}
/* keep the live data small: chat, sent emails/texts and daily check-in details older than 60 days go to the archive */
export async function archiveOld(S: any) {
  const db = await kv(), cut = Date.now() - 60 * 864e5, cutD = new Date(cut).toISOString().slice(0, 10), ym = today().slice(0, 7);
  const out: any = { chat: [], outbox: [], asp: {}, checks: {}, checkins: [] };
  S.chat = (S.chat || []).filter((m: any) => (m.ts > cut || m.pin) ? true : (out.chat.push(m), false));
  S.outbox = (S.outbox || []).filter((m: any) => (!m.sent || m.ts > cut) ? true : (out.outbox.push(m), false));
  for (const k of Object.keys(S.asp || {})) if (k < cutD) { out.asp[k] = S.asp[k]; delete S.asp[k]; }
  for (const k of Object.keys(S.checks || {})) { const d = k.startsWith("d:") ? k.slice(2) : k.startsWith("w:") ? k.slice(2) : k.startsWith("m:") ? k.slice(2) + "-28" : ""; if (d && d < cutD) { out.checks[k] = S.checks[k]; delete S.checks[k]; } }
  for (const st of S.students || []) if (Array.isArray(st.checkins)) { const old = st.checkins.filter((x: any) => x.date < cutD); if (old.length) { out.checkins.push({ id: st.id, name: st.name, list: old }); st.checkins = st.checkins.filter((x: any) => x.date >= cutD); } }
  const n = out.chat.length + out.outbox.length + Object.keys(out.asp).length + Object.keys(out.checks).length + out.checkins.length;
  if (!n) return 0;
  const key = "archive/" + ym, prev = (await db.get(key)) || { chat: [], outbox: [], asp: {}, checks: {}, checkins: [] };
  await db.set(key, { chat: [...prev.chat, ...out.chat], outbox: [...prev.outbox, ...out.outbox], asp: { ...prev.asp, ...out.asp }, checks: { ...prev.checks, ...out.checks }, checkins: [...prev.checkins, ...out.checkins] });
  return n;
}
export async function readArchive() { const db = await kv(), keys = (await db.list("archive/")).sort(), r: any = {}; for (const k of keys) r[k.slice(8)] = await db.get(k); return r; }
export async function saveState(s: any) {
  const db = await kv();
  const w = await db.setIfMatch("state", s, TAGS.get(s) || "");
  if (!w.ok) throw new StateConflict("Someone else saved at the same moment");
  TAGS.set(s, w.etag);
}
/* run fn(state) and save; if another save slipped in between, start over with fresh data (up to 4 tries) */
export async function withState<T>(fn: () => Promise<T>): Promise<T> {
  for (let i = 0; ; i++) {
    try { return await fn(); } catch (e) { if (!(e instanceof StateConflict) || i >= 3) throw e; await new Promise((r) => setTimeout(r, 60 + Math.random() * 200 * (i + 1))); }
  }
}
export async function resetState() { const s = clone(seedState); await saveState(s); return s; }

/* ---------- sessions ---------- */
export async function newSession(kind: string, id: string, extra: any = {}) {
  const db = await kv();
  const token = crypto.randomBytes(24).toString("base64url");
  await db.set("sess/" + sha(token), { ...extra, kind, id, exp: Date.now() + (extra.mustPw ? 1000 * 60 * 30 : 1000 * 60 * 60 * 24 * 45) });
  return token;
}
export async function getSession(req: Request) {
  const h = req.headers.get("authorization") || "";
  const token = h.startsWith("Bearer ") ? h.slice(7).trim() : "";
  if (!token) return null;
  const db = await kv();
  const s = await db.get("sess/" + sha(token));
  if (!s || s.exp < Date.now()) return null;
  return { ...s, key: "sess/" + sha(token) };
}
export async function endSession(sess: any) { if (sess) { const db = await kv(); await db.del(sess.key); } }

/* ---------- simple lockout after repeated failures ---------- */
export async function limited(key: string, max = 6) { const db = await kv(); const r = await db.get("rl/" + sha(key)); return !!(r && r.n >= max && r.until > Date.now()); }
export async function failHit(key: string) { const db = await kv(); const k = "rl/" + sha(key); const r = (await db.get(k)) || { n: 0 }; if (r.until && r.until < Date.now()) r.n = 0; r.n++; r.until = Date.now() + 10 * 60 * 1000; await db.set(k, r); }
export async function failClear(key: string) { const db = await kv(); await db.del("rl/" + sha(key)); }

/* ---------- who is this, and what may they see ---------- */
export function actor(S: any, sess: any) {
  if (!sess) return null;
  if (sess.kind === "family") { const f = S.families.find((x: any) => x.id === sess.id); return f && f.status !== "declined" ? { kind: "family", id: f.id, role: "family", rec: f } : null; }
  const m = S.staff.find((x: any) => x.id === sess.id);
  if (!m) return null;
  if (sess.kind === "admin" && m.role !== "admin") return null;
  return { kind: sess.kind, id: m.id, role: m.role, rec: m };
}
const strip = (o: any, keys: string[]) => { const c = { ...o }; for (const k of keys) delete c[k]; return c; };

function evTaken(S: any) { const r: any = {}; for (const e of S.events || []) if (e.signup || e.kind === "pno") r[e.id] = (S.signups || []).filter((s: any) => s.eventId === e.id).length + (S.guestWaivers || []).filter((g: any) => g.eventId === e.id).reduce((n: number, g: any) => n + (g.kids || []).length, 0); return r; }
export function view(S: any, me: any) {
  const pub = {
    v: S.v, focus: S.focus, banner: S.banner, waiverText: S.waiverText,
    events: S.events.filter((e: any) => e.aud !== "staff").map((e: any) => (+e.spots > 0 || +e.fee > 0) && e.signup ? { ...e, taken: S.signups.filter((s: any) => s.eventId === e.id).length } : e), news: S.news.filter((n: any) => n.aud !== "staff").map((n: any) => strip(n, ["readBy"])),
    billing: { payUrl: (S.billing || {}).payUrl || "" }, mail: {}, rankCodes: {},
    site: strip(S.site || {}, ["sotm", "handbook", "kotw", "pretrip", "emergency", "rankPath", "rubric", "geo", "whatsNew", "roleTabs", "ratio", ...((S.site || {}).privacyPub ? [] : ["privacy"]), ...((S.site || {}).termsPub ? [] : ["terms"])]), evTaken: evTaken(S), guestWaivers: [],
    faq: S.faq || [], gallery: S.gallery || [], reviews: S.reviews || [], progInfo: S.progInfo || {}, quest: S.quest || {},
    sotmView: sotmView(S), flTaken: (S.inquiries || []).filter((q: any) => q.slot && q.status !== "closed").map((q: any) => q.slot),
    bdays: (S.site || {}).bdayPublic ? bdaysWeek(S) : [], orders: [],
    team: S.staff.filter((m: any) => (m.web ? m.web.show : m.role !== "lit")).map((m: any) => ({ id: m.id, name: m.name, title: m.title, role: m.role, redTop: !!m.redTop, redPants: !!m.redPants, order: (m.web || {}).order, bio: (m.web || {}).bio || "", photo: (m.web || {}).photo || "" })),
    students: [], families: [], staff: [], shifts: [], subs: [], messages: [], inquiries: [], parties: [], signups: [], absences: [], invoices: [],
    outbox: [], resetReqs: [], lost: [], makeups: [], promos: [], rtlog: [], plans: [], drills: [], hours: [], inventory: [], trades: [], chat: [], tips: [], incidents: [], timeoff: [], onbItems: [], onbQuiz: [], tuition: {}, checks: {}, asp: {}, bdsign: {}, invNo: 0,
    requests: [], lessonSlots: [], rides: [], ratings: [], videos: [], album: [], templates: [], votes: [], tlog: [], assign: [], eos: [], trivia: [], giftCards: [], codes: [], expenses: [], equipment: [], surveys: [], surveyAns: [], webchat: [],
    ...Object.fromEntries(R3.map(k => [k, []])),
    blog: (S.blog || []).filter((b: any) => b.pub), testimonials: (S.testimonials || []).filter((t: any) => t.ok).map((t: any) => ({ id: t.id, name: t.name, text: t.text, lang: t.lang, ok: true })),
    memberships: (S.memberships || []).filter((m: any) => m.pub),
    ...Object.fromEntries(R4.map(k => [k, []])),
    sponsors: S.sponsors || [], press: S.press || [], partners: S.partners || [], pages: (S.pages || []).filter((x: any) => x.pub),
    ...Object.fromEntries(R5.map(k => [k, []])), stories: (S.stories || []).filter((x: any) => x.pub), drives: (S.drives || []).filter((x: any) => x.pub), alumni: (S.alumni || []).filter((x: any) => x.pub).map((x: any) => ({ id: x.id, name: x.name, years: x.years, rank: x.rank, note: x.note, pub: true })),
    aspSchools: (S.schools || []).filter((x: any) => x.asp).map((x: any) => x.name),
    album: (S.album || []).filter((a: any) => a.pub && !(S.photoHide || []).some((h: any) => h.albumId === a.id) && (a.kids || []).every((id: string) => { const k = S.students.find((s: any) => s.id === id); return k && k.photo; })).map((a: any) => ({ id: a.id, img: a.img, caption: a.caption || "", date: a.date, pub: true })),
  };
  if (!me) return pub;
  if (me.role === "family") {
    const kids = S.students.filter((s: any) => s.familyId === me.id).map((s: any) => strip(s, ["notes", "qn"]));
    const kidIds = new Set(kids.map((k: any) => k.id));
    return {
      ...pub,
      students: kids,
      messages: S.messages.filter((m: any) => m.familyId === me.id && (!m.sendAt || m.released || m.sendAt <= Date.now())),
      bdays: bdaysWeek(S), refCount: (S.inquiries || []).filter((q: any) => q.ref === me.id).length,
      shop: (S.inventory || []).filter((i: any) => i.shop && +i.price > 0).map((i: any) => ({ id: i.id, name: i.name, size: i.size || "", cat: i.cat, price: +i.price, inStock: (+i.qty || 0) > 0 })),
      orders: (S.orders || []).filter((o: any) => o.familyId === me.id),
      makeups: S.makeups.filter((x: any) => kidIds.has(x.studentId) && x.status === "open"),
      signups: S.signups.filter((x: any) => x.familyId === me.id).map((x: any) => { const e = S.events.find((v: any) => v.id === x.eventId), cap = e ? +e.spots || 0 : 0; if (!cap) return x; const i = S.signups.filter((s: any) => s.eventId === x.eventId).sort((a: any, b: any) => (a.ts || 0) - (b.ts || 0)).findIndex((s: any) => s.id === x.id); return { ...x, wait: i >= cap, pos: i - cap + 1 }; }),
      absences: S.absences.filter((x: any) => kidIds.has(x.studentId)),
      parties: S.parties.filter((x: any) => x.familyId === me.id),
      invoices: S.invoices.filter((x: any) => x.familyId === me.id && x.status !== "void"),
      lost: S.lost.filter((x: any) => x.status === "open"),
      promos: S.promos.filter((x: any) => kidIds.has(x.studentId)).slice(0, 20),
      tuition: S.tuition && S.tuition[me.id] ? { [me.id]: S.tuition[me.id] } : {},
      billing: { payUrl: (S.billing || {}).payUrl || "", tuitionDay: (S.billing || {}).tuitionDay || 1 },
      requests: (S.requests || []).filter((r: any) => r.familyId === me.id),
      lessonSlots: (S.lessonSlots || []).filter((x: any) => x.date >= today()).map((x: any) => ({ ...x, taken: (S.requests || []).some((r: any) => r.kind === "lesson" && r.slotId === x.id && !["no", "canceled"].includes(r.status) && r.familyId !== me.id) })),
      rides: [],
      ratings: (S.ratings || []).filter((r: any) => r.familyId === me.id),
      videos: S.videos || [], trivia: S.trivia || [],
      album: (S.album || []).filter((a: any) => (a.kids || []).some((id: string) => kids.some((k: any) => k.id === id && k.photo !== false))).map((a: any) => ({ ...a, kids: (a.kids || []).filter((id: string) => kidIds.has(id)) })),
      surveys: (S.surveys || []).filter((x: any) => x.open), surveyAns: (S.surveyAns || []).filter((a: any) => a.familyId === me.id),
      refBoard: refBoard(S, me.id),
      families: [famOut(me.rec)],
      routines: S.routines || [], challenges: S.challenges || [], forms: (S.forms || []).map((f: any) => ({ id: f.id, name: f.name, moves: f.moves || [] })),
      homework: (S.homework || []).filter((h: any) => h.familyId === me.id), progress: (S.progress || []).filter((p: any) => p.published && kidIds.has(p.studentId)),
      otw: (S.otw || []).filter((o: any) => o.familyId === me.id && o.date === today()), journal: (S.journal || []).filter((j: any) => j.familyId === me.id),
      volunteers: (S.volunteers || []).map((v: any) => v.familyId === me.id ? v : { id: v.id, eventId: v.eventId, familyId: "" }),
      testimonials: (S.testimonials || []).filter((t: any) => t.familyId === me.id || t.ok).map((t: any) => t.familyId === me.id ? t : { id: t.id, name: t.name, text: t.text, ok: true }),
      reacts: (S.reacts || []).map((r: any) => r.familyId === me.id ? r : { ...r, familyId: "", id: "x" + crypto.createHash("md5").update(r.id).digest("hex").slice(0, 10) }),
      chLog: (S.chLog || []).filter((c: any) => kidIds.has(c.studentId)), chBoard: chBoard(S),
      goals: (S.goals || []).filter((g: any) => g.familyId === me.id), letters: (S.letters || []).filter((x: any) => x.familyId === me.id),
      meetSlots: (S.meetSlots || []).filter((x: any) => x.date >= today() && (!x.familyId || x.familyId === me.id)).map((x: any) => ({ ...x, staffName: ((S.staff || []).find((m: any) => m.id === x.staffId) || {}).name || "" })),
      partyGuests: (S.partyGuests || []).filter((g: any) => (S.parties || []).some((p: any) => p.id === g.partyId && p.familyId === me.id)),
      swapItems: (S.swapItems || []).filter((x: any) => !x.hidden).map((x: any) => x.familyId === me.id ? x : { ...x, familyId: "" }),
      rentals: (S.rentals || []).filter((x: any) => x.familyId === me.id), posts: (S.posts || []).filter((x: any) => (x.ok && !x.hidden) || x.familyId === me.id).map((x: any) => x.familyId === me.id ? x : { ...x, familyId: "" }),
      badges: (S.badges || []).filter((b: any) => kidIds.has(b.studentId)), habits: (S.habits || []).filter((h: any) => kidIds.has(h.studentId)), askBox: (S.askBox || []).filter((a: any) => a.familyId === me.id),
      kidVids: (S.kidVids || []).filter((v: any) => kidIds.has(v.studentId)), photoReacts: (S.photoReacts || []).filter((r: any) => r.familyId === me.id), formVids: S.formVids || [],
      credits: (S.credits || []).filter((c: any) => c.familyId === me.id), pages: (S.pages || []).filter((x: any) => x.pub),
      ptips: S.ptips || [], moves: S.moves || [], deals: (S.deals || []).filter((d: any) => !d.until || d.until >= today()), drives: (S.drives || []).filter((x: any) => x.pub),
      schApps: (S.schApps || []).filter((x: any) => x.familyId === me.id), thanks: (S.thanks || []).filter((x: any) => x.familyId === me.id), trivScores: (S.trivScores || []).filter((x: any) => kidIds.has(x.studentId)), trivBoard: trivBoard(S),
      photoHide: (S.photoHide || []).filter((h: any) => kidIds.has(h.studentId)), art: (S.art || []).filter((x: any) => x.familyId === me.id || x.win), photoContest: (S.photoContest || []).filter((x: any) => x.familyId === me.id || x.win),
      svcHours: (S.svcHours || []).filter((x: any) => kidIds.has(x.studentId)), classWait: (S.classWait || []).filter((x: any) => x.familyId === me.id), wsSign: (S.wsSign || []).filter((x: any) => x.familyId === me.id),
      buddies: kids.filter((k: any) => k.buddy).map((k: any) => { const b = S.students.find((s: any) => s.id === k.buddy); return { id: k.id, name: b ? firstLast(b.name) : "" }; }),
    };
  }
  const full = clone(S);
  full.families = S.families.map((f: any) => strip(f, SECRET_FAM));
  full.staff = S.staff.map((m: any) => strip(m, SECRET_STAFF));
  const meRec = S.staff.find((m: any) => m.id === me.id);
  full.chat = (S.chat || []).filter((m: any) => canCh(me.role, me.id, m.ch, meRec));
  full.tips = (S.tips || []).filter((t: any) => canTipSee(me.role, me.id, t));
  full.iom = iomLast(S);
  full.families = full.families.map(famOut);
  if (me.role === "admin") return full;
  for (const k of ["suggest", "audit", "docs", "social", "newsletters", "supply", "vendors", "ownerNotes", "todos", "donations", "ocfg", "setHist", "consents", "newsSubs", "letters", "posts", "swapItems", "credits", "schApps", "comp", "vendorPrices", "contractTpl", "growth", "loc2", "launch", "alumni", "art", "photoContest", "classWait", "wsSign"]) full[k] = [];
  full.staffQ = (S.staffQ || []).map((q: any) => q.anon ? { ...q, by: q.by === me.id ? me.id : "" } : q); full.thanks = (S.thanks || []).filter((t: any) => t.to === me.id && !t.hidden).map((t: any) => strip(t, ["familyId"]));
  if (me.role === "lit") full.convLog = []; full.mentorLog = (S.mentorLog || []).filter((x: any) => x.by === me.id || x.with === me.id || me.role === "ema");
  if (me.role !== "ema") { full.evals = (S.evals || []).filter((x: any) => x.to === me.id); full.tgoals = (S.tgoals || []).filter((x: any) => x.by === me.id); }
  full.hrsOk = (S.hrsOk || []).filter((x: any) => x.by === me.id); full.bioReqs = (S.bioReqs || []).filter((x: any) => x.by === me.id); full.trainLog = (S.trainLog || []).filter((x: any) => x.by === me.id || me.role === "ema");
  full.rsvps = me.role === "desk" ? S.rsvps || [] : []; full.spaceReqs = me.role === "desk" ? S.spaceReqs || [] : []; if (me.role === "lit") full.behav = [];
  full.teachFb = (S.teachFb || []).filter((x: any) => x.to === me.id || x.by === me.id);
  full.pulse = (S.pulse || []).filter((x: any) => x.by === me.id); full.quizAns = me.role === "ema" ? S.quizAns || [] : (S.quizAns || []).filter((x: any) => x.by === me.id);
  full.mileage = (S.mileage || []).filter((x: any) => x.by === me.id); full.journal = (S.journal || []).filter((j: any) => j.share).map((j: any) => strip(j, ["familyId"]));
  if (!["coach", "desk"].includes(me.role)) { full.signouts = []; full.meds = []; }
  if (me.role !== "ema") full.homework = (S.homework || []).map((h: any) => strip(h, ["familyId"]));
  if (me.role === "desk") { const d = clone(S); return { ...full, invoices: d.invoices.filter((i: any) => i.status !== "void"), inquiries: d.inquiries, orders: d.orders, inventory: d.inventory, parties: d.parties, students: full.students.map((s: any) => strip(s, ["med"])), hours: S.hours.filter((h: any) => h.staff === me.id), families: S.families.map(famOut), guestWaivers: d.guestWaivers, requests: [], expenses: [], equipment: [], giftCards: d.giftCards, codes: [], timeoff: (S.timeoff || []).filter((t: any) => t.staff === me.id), outbox: [], resetReqs: [], tuition: {}, rankCodes: {}, mail: {}, staff: full.staff.map((m: any) => (m.id === me.id ? m : strip(m, ["email", "emailOk", "pendEmail", "pay", "phone", "textSubs", "readCh", "tipsSeen", "pushPrefs", "onb", "certs", "dob"]))), votes: (S.votes || []).filter((v: any) => v.by === me.id), tlog: [], incidents: (S.incidents || []).filter((i: any) => i.by === me.id), rides: [], ratings: [], surveys: [], surveyAns: [], webchat: [] }; }
  full.requests = me.role === "ema" ? (S.requests || []).filter((r: any) => r.kind === "question" || r.kind === "lesson") : [];
  full.rides = []; full.ratings = []; full.giftCards = []; full.codes = []; full.expenses = []; full.surveys = []; full.surveyAns = []; full.webchat = []; full.equipment = [];
  full.votes = (S.votes || []).filter((v: any) => v.by === me.id);
  full.tlog = (S.tlog || []).filter((x: any) => x.staff === me.id);
  if (me.role === "lit") { full.assign = (S.assign || []).filter((a: any) => !a.for || a.for === me.id); full.album = []; }
  full.incidents = (S.incidents || []).filter((i: any) => me.role === "ema" || i.by === me.id);
  full.timeoff = (S.timeoff || []).filter((t: any) => t.staff === me.id);
  // staff (EMA instructors, coaches, L.I.T.s)
  full.families = S.families.filter((f: any) => f.status === "approved" || f.status === "pending").map((f: any) => ({ id: f.id, parent: f.parent, email: f.email, phone: f.phone, pickup: f.pickup, status: f.status, lang: f.lang || "en", waiver: f.waiver ? { date: f.waiver.date } : null, ...(me.role === "coach" ? { pickupPin: f.pickupPin || "" } : {}) }));
  full.staff = full.staff.map((m: any) => (m.id === me.id ? m : strip(m, ["email", "emailOk", "pendEmail", "pay", "phone", "textSubs", "readCh", "tipsSeen", "pushPrefs", "onb", "certs", "dob"])));
  full.guestWaivers = []; full.tuition = {};
  if (me.role !== "coach") full.students = full.students.map((s: any) => strip(s, ["med"]));
  full.hours = S.hours.filter((h: any) => h.staff === me.id);
  full.tuition = {};
  full.rankCodes = {}; full.mail = {}; full.outbox = []; full.resetReqs = []; full.invoices = []; full.inquiries = [];
  full.billing = { payUrl: (S.billing || {}).payUrl || "" };
  if (me.role === "lit" || me.role === "coach") { full.messages = []; full.students = full.students.map((s: any) => strip(s, ["notes"])); }
  if (me.role === "lit") full.staff = full.staff.map((m: any) => (m.id === me.id || m.role !== "lit" ? m : strip(m, ["onb"])));
  full.events = S.events; full.news = S.news; full.inventory = []; full.orders = [];
  return full;
}

function refBoard(S: any, myId: string) { const yr = today().slice(0, 4), cnt: any = {}; for (const q of S.inquiries || []) if (q.ref && new Date(q.ts || 0).getFullYear() === +yr) cnt[q.ref] = (cnt[q.ref] || 0) + 1; return Object.entries(cnt).map(([id, n]) => ({ id, n, f: S.families.find((f: any) => f.id === id) })).filter((r: any) => r.f && (!r.f.refHide || r.id === myId)).sort((a: any, b: any) => b.n - a.n).slice(0, 5).map((r: any) => ({ id: r.id === myId ? r.id : "x" + r.id.slice(-3), n: r.n, name: firstLast(r.f.parent) })); }
export const R5 = ["schApps", "ptips", "moves", "thanks", "trivScores", "subNotes", "res", "mentorLog", "classRate", "supplyReq", "convLog", "staffQ", "comp", "vendorPrices", "contractTpl", "growth", "loc2", "manual", "stories", "blogPlan", "drives", "deals", "alumni", "svcHours", "fireDrills", "photoHide", "art", "photoContest", "bloopers", "gearOut", "launch", "duties", "feedback", "classWait", "wsSign"];
export const R4 = ["goals", "meetSlots", "letters", "partyGuests", "swapItems", "rentals", "posts", "badges", "habits", "askBox", "kidVids", "photoReacts", "evals", "shadow", "behav", "chkLog", "ann", "annRead", "polls", "pollVotes", "handoff", "trainLog", "tgoals", "wish", "wishVote", "bioReqs", "covers", "hrsOk", "vendors", "ownerNotes", "todos", "donations", "sponsors", "schools", "spaceReqs", "press", "partners", "rsvps", "subs", "consents", "setHist", "formVids", "credits", "ocfg", "pages"];
export const R3 = ["routines", "homework", "progress", "otw", "volunteers", "suggest", "journal", "testimonials", "reacts", "challenges", "chLog", "forms", "avail", "quizzes", "quizAns", "kudos", "pulse", "mileage", "pretrip", "swaps", "teachFb", "meds", "memberships", "social", "newsletters", "supply", "audit", "docs", "blog", "signouts"];
const famOut = (f: any) => { const o = strip(f, SECRET_FAM); if (Array.isArray(o.guardians)) o.guardians = o.guardians.map((g: any) => ({ name: g.name, email: g.email })); if (o.autopay) o.autopay = { on: !!o.autopay.on, brand: o.autopay.brand || "", last4: o.autopay.last4 || "", fails: o.autopay.fails || 0 }; return o; };
function chBoard(S: any) { const t = today(), c = (S.challenges || []).filter((x: any) => x.from <= t && x.to >= t).sort((a: any, b: any) => String(b.from).localeCompare(a.from))[0]; if (!c) return []; const n: any = {}; for (const x of S.chLog || []) if (x.challengeId === c.id) n[x.studentId] = (n[x.studentId] || 0) + 1; return Object.entries(n).map(([id, k]) => ({ s: S.students.find((x: any) => x.id === id), n: k })).filter((r: any) => r.s && !r.s.noBoard).sort((a: any, b: any) => b.n - a.n).slice(0, 5).map((r: any) => ({ name: firstLast(r.s.name), n: r.n })); }
function trivBoard(S: any) { const wk = (() => { const d = new Date(today() + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() - d.getUTCDay()); return d.toISOString().slice(0, 10); })(); return (S.trivScores || []).filter((x: any) => x.wk === wk).map((x: any) => ({ s: S.students.find((k: any) => k.id === x.studentId), n: x.score })).filter((r: any) => r.s && !r.s.noBoard).sort((a: any, b: any) => b.n - a.n).slice(0, 5).map((r: any) => ({ name: firstLast(r.s.name), n: r.n })); }
function iomLast(S: any) { const d = new Date(Date.parse(today().slice(0, 7) + "-01T12:00:00Z") - 864e5).toISOString().slice(0, 7), cnt: any = {}; for (const v of S.votes || []) if (v.month === d) cnt[v.for] = (cnt[v.for] || 0) + 1; const top: any = Object.entries(cnt).sort((a: any, b: any) => b[1] - a[1])[0]; return top ? { month: d, id: top[0], n: top[1] } : null; }
/* ---------- public helpers: Student of the Month, birthdays this week, First Look slots ---------- */
const firstLast = (n: string) => { const p = String(n || "").trim().split(/\s+/); return p[0] + (p[1] ? " " + p[p.length - 1][0] + "." : ""); };
function sotmView(S: any) { const x = (S.site || {}).sotm; if (!x || !x.studentId) return null; const s = S.students.find((k: any) => k.id === x.studentId); if (!s) return null; return { name: firstLast(s.name), prog: s.prog, beltIdx: +s.belt || 0, blurb: x.blurb || "", blurbEs: x.blurbEs || "", month: x.month || "", pic: s.photo && s.pic ? s.pic : "" }; }
function bdaysWeek(S: any) { const out: any[] = []; const t = today(); for (let i = 0; i < 7; i++) { const d = new Date(Date.parse(t + "T12:00:00Z") + i * 864e5).toISOString().slice(0, 10); for (const s of S.students) if (s.status === "active" && s.photo && s.dob && String(s.dob).slice(5) === d.slice(5)) out.push({ name: firstLast(s.name), date: d }); } return out; }
function slotOk(S: any, slot: any) { if (typeof slot !== "string" || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(slot) || slot.slice(0, 10) <= today()) return false; const d = new Date(slot.slice(0, 10) + "T12:00:00Z").getUTCDay(); if (!((S.site || {}).flSlots || []).some((x: any) => x.d === d && x.t === slot.slice(11))) return false; return !(S.inquiries || []).some((q: any) => q.slot === slot && q.status !== "closed"); }
function qnClean(n: any) { if (Array.isArray(n.qn)) n.qn = n.qn.slice(-20).map((q: any) => ({ id: String(q.id || "").slice(0, 30), text: String(q.text || "").slice(0, 300), by: String(q.by || "").slice(0, 60), byId: String(q.byId || "").slice(0, 40), ts: +q.ts || Date.now() })); return n; }

/* ---------- paid sign-ups with spots + waitlist: bill whoever is "in", void dropped ones ---------- */
export function eventBilling(S: any) {
  for (const e of S.events || []) {
    if (!(e.signup || e.kind === "pno") || !(+e.fee > 0)) continue;
    const cap = +e.spots || 0;
    const su = (S.signups || []).filter((s: any) => s.eventId === e.id).sort((a: any, b: any) => (a.ts || 0) - (b.ts || 0));
    su.forEach((s: any, i: number) => {
      if ((cap && i >= cap) || s.inv) return;
      const k = S.students.find((x: any) => x.id === s.studentId);
      const sib = (S.billing || {}).sibPct > 0 && su.slice(0, i).some((o: any) => o.familyId === s.familyId) ? Math.min(50, +S.billing.sibPct) : 0;
      const fee = e.earlyFee && e.earlyUntil && new Date(s.ts || Date.now()).toISOString().slice(0, 10) <= e.earlyUntil ? +e.earlyFee : +e.fee;
      const n = Math.max(1, Math.min(3, +s.parts || +e.split || 1)), total = Math.round(fee * 100 * (100 - sib) / 100), part = Math.floor(total / n), t = today();
      const end = e.date > t ? e.date : t, gap = Math.max(0, Math.round((Date.parse(end + "T12:00:00Z") - Date.parse(t + "T12:00:00Z")) / 864e5));
      s.invs = [];
      for (let j = 0; j < n; j++) {
        const due = j === 0 ? t : new Date(Date.parse(t + "T12:00:00Z") + Math.round(gap * j / n) * 864e5).toISOString().slice(0, 10);
        const inv = { id: uid("i"), num: S.invNo = (S.invNo || 0) + 1, familyId: s.familyId, desc: `${e.title} — ${k ? String(k.name).split(" ")[0] : ""}${n > 1 ? ` (${j + 1}/${n})` : ""}`, descEs: `${e.titleEs || e.title} — ${k ? String(k.name).split(" ")[0] : ""}${n > 1 ? ` (${j + 1}/${n})` : ""}`, amount: j === 0 ? total - part * (n - 1) : part, due, status: "open", created: Date.now(), rem: [], eventId: e.id, signupId: s.id };
        S.invoices.push(inv); s.invs.push(inv.id);
      }
      s.inv = s.invs[0];
    });
  }
  for (const i of S.invoices || []) if (i.signupId && i.status === "open" && !(S.signups || []).some((s: any) => s.id === i.signupId)) i.status = "void";
}

/* ---------- pro shop: bill an order as soon as it's placed (so families can pay by card), void it if canceled ---------- */
export function orderBilling(S: any) {
  for (const o of S.orders || []) {
    const inv = (S.invoices || []).find((i: any) => i.orderId === o.id);
    if (o.status === "canceled") { if (inv && inv.status === "open") inv.status = "void"; continue; }
    if (inv || o.billed) continue;
    const amt = Math.round((o.items || []).reduce((a: number, i: any) => a + (+i.qty || 0) * (+i.price || 0), 0) * 100); if (!(amt > 0)) continue;
    const list = (o.items || []).map((i: any) => `${i.qty}× ${i.name}`).join(", ");
    S.invoices.push({ id: uid("i"), num: S.invNo = (S.invNo || 1000) + 1, familyId: o.familyId, desc: "Pro shop: " + list, descEs: "Tienda: " + list, amount: amt, due: new Date(Date.parse(today() + "T12:00:00Z") + 7 * 864e5).toISOString().slice(0, 10), status: "open", created: Date.now(), rem: [], orderId: o.id });
    o.billed = true;
  }
}

/* ---------- staff chat + tips access ---------- */
const CH_OK: any = { all: () => true, ema: (r: string) => ["ema", "admin"].includes(r), emalit: (r: string) => ["ema", "lit", "admin"].includes(r), lit: (r: string) => ["lit", "admin"].includes(r), camp: (r: string, m: any) => r === "admin" || !!(m && m.camp) };
export function canCh(role: string, id: string, ch: any, rec?: any) {
  if (!["admin", "ema", "coach", "lit", "desk"].includes(role) || typeof ch !== "string") return false;
  if (ch.startsWith("dm~")) { const p = ch.split("~"); return p.length === 3 && p[1] !== p[2] && (p[1] === id || p[2] === id); }
  return !!CH_OK[ch] && CH_OK[ch](role, rec);
}
export function canTipSee(role: string, id: string, t: any) {
  if (!t) return false;
  if (t.aud === "ema") return role === "admin" || (role === "ema" && (!t.for || t.for === id || t.by === id));
  if (t.aud === "lit") return ["ema", "admin"].includes(role) || (role === "lit" && (!t.for || t.for === id));
  return false;
}
function chatTipRule(S: any, me: any, x: any, old: any, v: any): any {
  const role = me.role;
  if (x.c === "chat") {
    if (x.op === "del") return old && (old.by === me.id || role === "admin") ? true : null;
    const rec = S.staff.find((m: any) => m.id === me.id);
    if (old) {
      if (!v || !canCh(role, me.id, old.ch, rec)) return null;
      const n = { ...old }, RX = ["👍", "❤️", "😂", "🎉", "🙏"], re: any = {};
      for (const e of RX) { const s = new Set(((old.re || {})[e] || []) as string[]); if (((v.re || {})[e] || []).includes(me.id)) s.add(me.id); else s.delete(me.id); if (s.size) re[e] = [...s]; }
      n.re = re;
      if (["admin", "ema"].includes(role) && typeof v.pin === "boolean") n.pin = v.pin;
      return n;
    }
    if (!v || !canCh(role, me.id, v.ch, rec)) return null;
    const text = String(v.text || "").trim().slice(0, 2000);
    const img = typeof v.img === "string" && /^\/api\/media\/[\w-]{1,40}$/.test(v.img) ? v.img : "";
    if (!text && !img) return null;
    const ch = String(v.ch); if (ch.startsWith("dm~") && !ch.split("~").slice(1).every((i: string) => S.staff.some((m: any) => m.id === i))) return null;
    return { id: String(v.id), ch, by: me.id, text, ...(img ? { img } : {}), ts: Date.now() };
  }
  if (x.op === "del") return old && (old.by === me.id || role === "admin") ? true : null;
  if (!old) {
    if (!["ema", "admin"].includes(role) || !v) return null;
    const aud = v.aud === "lit" ? "lit" : "ema", forId = v.for && S.staff.some((m: any) => m.id === v.for && m.role === aud && m.id !== me.id) ? String(v.for) : "";
    const text = String(v.text || "").trim().slice(0, 1500); if (!text) return null;
    return { id: String(v.id), by: me.id, aud, for: forId, cat: String(v.cat || "Other").slice(0, 40), text, ts: Date.now(), helpful: [] };
  }
  if (!canTipSee(role, me.id, old)) return null;
  const h = new Set(old.helpful || []); if ((v.helpful || []).includes(me.id)) h.add(me.id); else h.delete(me.id);
  return { ...old, helpful: [...h] };
}

/* ---------- write rules ---------- */
const only = (oldV: any, newV: any, fields: string[]) => { const o = clone(oldV); for (const f of fields) if (f in newV) o[f] = newV[f]; else delete o[f]; return o; };
const isStaff = (r: string) => ["admin", "ema", "coach", "lit", "desk"].includes(r);
function rule(S: any, me: any, x: any): any {
  const role = me ? me.role : "public";
  const c = x.c, list = S[c];
  const old = Array.isArray(list) ? list.find((r: any) => r[c === "focus" ? "wk" : "id"] === x.id) : undefined;
  const v = x.v && typeof x.v === "object" && !Array.isArray(x.v) ? { ...x.v } : x.v;
  if (role === "public") {
    if (c === "inquiries" && x.op === "put" && !old && v) return { ...only({}, v, ["id", "parent", "email", "phone", "child", "age", "interest", "pref", "notes", "lang"]), ...(typeof v.ref === "string" && S.families.some((f: any) => f.id === v.ref) ? { ref: v.ref } : {}), ...(slotOk(S, v.slot) ? { slot: v.slot } : {}), status: "new", ts: Date.now() };
    return null;
  }
  if ((c === "chat" || c === "tips") && isStaff(role)) return chatTipRule(S, me, x, old, v);
  if (role === "admin") {
    if (c === "families" && x.op === "put") return old ? { ...v, ...pick(old, SECRET_FAM) } : null;
    if (c === "staff" && x.op === "put") return old ? { ...v, ...pick(old, SECRET_STAFF) } : { ...v, pw: DEFAULT_PW };
    if (c === "staff" && x.op === "del" && x.id === me.id) return null;
    return x.op === "del" ? true : v;
  }
  if (role === "family") {
    const fid = me.id, ownKid = (sid: string) => S.students.some((s: any) => s.id === sid && s.familyId === fid);
    if (c === "families" && x.op === "put" && x.id === fid && old) {
      const n = only(old, v, ["parent", "email", "phone", "emergency", "pickup", "notify", "waiver", "lang", "agreement", "refHide", "pushPrefs", "pickupPin", "guardians", "custody", "quiet", "infoChecked"]);
      if (n.custody) n.custody = { days: Object.fromEntries(Object.entries((n.custody || {}).days || {}).slice(0, 7).map(([k, v]: any) => [String(k).slice(0, 1), String(v).slice(0, 40)])), note: String((n.custody || {}).note || "").slice(0, 300) };
      if (n.quiet) n.quiet = { on: !!n.quiet.on, from: /^\d{2}:\d{2}$/.test(n.quiet.from) ? n.quiet.from : "21:00", to: /^\d{2}:\d{2}$/.test(n.quiet.to) ? n.quiet.to : "07:00" };
      n.pickupPin = /^\d{4,6}$/.test(String(n.pickupPin || "")) ? String(n.pickupPin) : (old.pickupPin || ""); if (!n.pickupPin) delete n.pickupPin;
      n.guardians = (Array.isArray(n.guardians) ? n.guardians : []).slice(0, 3).map((g: any) => { const em = String(g.email || "").trim().toLowerCase(), was = (old.guardians || []).find((x: any) => x.email === em); return validEmail(em) && em !== String(old.email).toLowerCase() && !S.families.some((f: any) => f.id !== fid && (String(f.email).toLowerCase() === em || (f.guardians || []).some((x: any) => x.email === em))) ? { name: String(g.name || "").slice(0, 80), email: em, view: !!g.view, ...(was && was.pw ? { pw: was.pw } : {}) } : null; }).filter(Boolean); if (!n.guardians.length) delete n.guardians;
      for (const k of ["calKey", "autopay", "stripeCus", "stripePm"]) if (old[k]) n[k] = old[k];
      if (n.agreement) n.agreement = { name: String(n.agreement.name || "").slice(0, 80), date: today(), ver: +((S.site || {}).agreeVer || 1) };
      n.refHide = !!n.refHide; if (n.pushPrefs) n.pushPrefs = { cls: !!n.pushPrefs.cls };
      if (old.push) n.push = old.push;
      if (!["es", "hmn"].includes(n.lang)) n.lang = "en";
      if (!validEmail(n.email) || S.families.some((f: any) => f.id !== fid && String(f.email).toLowerCase() === String(n.email).toLowerCase())) n.email = old.email;
      return n;
    }
    if (c === "students" && x.op === "put") {
      if (!old) return v && v.familyId === fid ? { id: v.id, name: String(v.name || "").slice(0, 80), dob: v.dob || "", prog: ["ln", "kids", "adult"].includes(v.prog) ? v.prog : "kids", belt: 0, stripes: [], spar: 0, asp: !!v.asp, camp: !!v.camp, photo: !!v.photo, familyId: fid, att: [], notes: "", status: "pending" } : null;
      if (old.familyId !== fid) return null;
      const fam = ["photo", "practice", "uniform", "beltSize", "med", "noBoard", "famGoal", "dob", "sizeTs", "favMove", "dream", "balanceBest", "passport"];
      const n = { ...mergeFields(old, v, old.status === "pending" ? [...fam, "name", "prog"] : fam) };
      for (const f of ["med", "famGoal", "noBoard"]) if (!(f in v)) delete n[f];
      if (n.med) n.med = { allergies: String(n.med.allergies || "").slice(0, 300), conditions: String(n.med.conditions || "").slice(0, 300), meds: String(n.med.meds || "").slice(0, 300), notes: String(n.med.notes || "").slice(0, 600), giveName: String(n.med.giveName || "").slice(0, 120), giveTime: /^\d{2}:\d{2}$/.test(n.med.giveTime || "") ? n.med.giveTime : "", pickupNote: String(n.med.pickupNote || "").slice(0, 600), planUrl: /^\/api\/media\/[\w-]{1,40}$/.test(String(n.med.planUrl || "")) ? n.med.planUrl : "", ts: Date.now() };
      if (n.famGoal) n.famGoal = { text: String(n.famGoal.text || "").slice(0, 200), ts: Date.now() };
      if ("practice" in n) { const lim = today(); n.practice = [...new Set((Array.isArray(n.practice) ? n.practice : []).map(String).filter((d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d) && d <= lim))].sort().slice(-500); }
      return n;
    }
    if (c === "signups") { if (x.op === "del") return old && old.familyId === fid ? true : null; return !old && v.familyId === fid && ownKid(v.studentId) && S.events.some((e: any) => e.id === v.eventId && (e.signup || e.kind === "pno")) && !S.signups.some((s: any) => s.eventId === v.eventId && s.studentId === v.studentId) ? { id: v.id, eventId: v.eventId, studentId: v.studentId, familyId: fid, ts: Date.now(), ...((S.events.find((e: any) => e.id === v.eventId) || {}).splitFamily && [2, 3].includes(+v.parts) ? { parts: +v.parts } : {}) } : null; }
    if (c === "absences") { if (x.op === "del") return old && ownKid(old.studentId) ? true : null; return !old && ownKid(v.studentId) ? { ...v, familyId: fid } : null; }
    if (c === "messages" && x.op === "put") {
      if (!old) return v && v.familyId === fid && v.from === "family" && String(v.text || "").trim() ? { id: String(v.id), familyId: fid, from: "family", text: String(v.text).slice(0, 4000), ...(typeof v.img === "string" && /^\/api\/media\/[\w-]{1,40}$/.test(v.img) ? { img: v.img } : {}), by: me.rec.parent, ts: Date.now(), read: false } : null;
      return old.familyId === fid && old.from === "studio" ? { ...old, read: !!v.read } : null;
    }
    if (c === "parties" && x.op === "put" && !old) return v.familyId === fid ? { ...v, status: "requested", ts: Date.now() } : null;
    if (c === "orders" && x.op === "put") {
      if (old) return old.familyId === fid && old.status === "new" && v.status === "canceled" ? { ...old, status: "canceled" } : null;
      const inv = S.inventory || [];
      const items = (Array.isArray(v.items) ? v.items : []).slice(0, 20).map((it: any) => { const i = inv.find((x: any) => x.id === it.id && x.shop && +x.price > 0); const q = Math.max(1, Math.min(20, parseInt(it.qty) || 1)); return i ? { id: i.id, name: i.name + (i.size ? " (" + i.size + ")" : ""), qty: q, price: +i.price } : null; }).filter(Boolean);
      return items.length ? { id: String(v.id), familyId: fid, items, note: String(v.note || "").slice(0, 200), status: "new", ts: Date.now() } : null;
    }
    if (c === "makeups") {
      if (x.op === "del") return old && old.fam && ownKid(old.studentId) ? true : null;
      if (old || !v || !ownKid(v.studentId)) return null;
      const due = String(v.due || "").slice(0, 10); if (!/^\d{4}-\d{2}-\d{2}$/.test(due) || due < today()) return null;
      return { id: String(v.id), studentId: v.studentId, kind: "Class", note: String(v.note || "").slice(0, 160), due, status: "open", by: me.rec.parent, fam: true, ts: Date.now() };
    }
    if (c === "requests") {
      if (x.op === "del") return null;
      if (old) return old.familyId === fid && old.status === "pending" && v && v.status === "canceled" ? { ...old, status: "canceled" } : null;
      if (!v || !["lesson", "freeze", "question", "uniform", "cancel", "pauseKid"].includes(v.kind)) return null;
      if (v.kind !== "freeze" && v.kind !== "cancel" && !ownKid(v.studentId)) return null;
      const T = (k: string, n: number) => String(v[k] || "").slice(0, n);
      const r: any = { id: String(v.id), kind: v.kind, familyId: fid, studentId: v.kind === "freeze" ? "" : v.studentId, text: T("text", 600), status: "pending", ts: Date.now() };
      if (v.kind === "lesson") { r.slotId = (S.lessonSlots || []).some((x: any) => x.id === v.slotId) && !(S.requests || []).some((q: any) => q.slotId === v.slotId && !["no", "canceled"].includes(q.status)) ? v.slotId : ""; r.when = T("when", 120); if (!r.slotId && !r.when) return null; }
      if (v.kind === "freeze") { r.from = /^\d{4}-\d{2}-\d{2}$/.test(v.from) && v.from >= today() ? v.from : ""; r.weeks = Math.max(1, Math.min(12, parseInt(v.weeks) || 2)); if (!r.from) return null; }
      if (v.kind === "question") r.skill = T("skill", 60);
      if (v.kind === "uniform") { r.item = v.item === "belt" ? "belt" : "uniform"; r.size = T("size", 20); }
      if (v.kind === "cancel") { r.studentId = ""; r.from = /^\d{4}-\d{2}-\d{2}$/.test(v.from) && v.from >= today() ? v.from : today(); r.reason = T("reason", 60); }
      return r;
    }
    if (c === "rides") return null;
    if (c === "rides__off") {
      if (x.op === "del") return old && old.familyId === fid ? true : null;
      if (old || !v) return null;
      const T = (k: string, n: number) => String(v[k] || "").slice(0, n);
      return { id: String(v.id), familyId: fid, name: firstLast(me.rec.parent), kind: v.kind === "need" ? "need" : "offer", when: T("when", 80), area: T("area", 60), seats: Math.max(0, Math.min(8, parseInt(v.seats) || 0)), contact: T("contact", 60), note: T("note", 160), until: new Date(Date.now() + 60 * 864e5).toISOString().slice(0, 10), ts: Date.now() };
    }
    if (c === "ratings") return !old && x.op === "put" && v && ownKid(v.studentId) && !(S.ratings || []).some((r: any) => r.studentId === v.studentId && r.date === v.date) ? { id: String(v.id), familyId: fid, studentId: v.studentId, date: String(v.date).slice(0, 10), up: !!v.up, note: String(v.note || "").slice(0, 400), ts: Date.now() } : null;
    if (c === "surveyAns") { const sv = (S.surveys || []).find((q: any) => q.id === (v || {}).surveyId && q.open); return !old && x.op === "put" && sv && !(S.surveyAns || []).some((a: any) => a.surveyId === sv.id && a.familyId === fid) ? { id: String(v.id), surveyId: sv.id, familyId: fid, a: (Array.isArray(v.a) ? v.a : []).slice(0, 30).map((t: any) => String(t || "").slice(0, 600)), ts: Date.now() } : null; }
    const T2 = (o: any, k: string, n: number) => String((o || {})[k] || "").slice(0, n), D = (d: any) => /^\d{4}-\d{2}-\d{2}$/.test(String(d || "")) ? String(d) : "";
    if (c === "homework") { if (x.op === "del") return old && old.familyId === fid && old.status === "new" ? true : null; return !old && v && ownKid(v.studentId) && /^(https:\/\/|\/api\/media\/)/.test(String(v.url || "")) ? { id: String(v.id), familyId: fid, studentId: v.studentId, what: T2(v, "what", 120), url: T2(v, "url", 500), status: "new", ts: Date.now() } : null; }
    if (c === "otw") { if (x.op === "del") return old && old.familyId === fid ? true : null; return v && (!old || old.familyId === fid) ? { id: String(v.id), familyId: fid, date: today(), min: Math.max(1, Math.min(60, parseInt(v.min) || 10)), kind: v.kind === "late" ? "late" : "asp", studentId: ownKid(v.studentId) ? v.studentId : "", ts: Date.now() } : null; }
    if (c === "volunteers") { if (x.op === "del") return old && old.familyId === fid ? true : null; if (old && old.familyId === fid && v) return { ...old, hours: Math.max(0, Math.min(24, +v.hours || 0)), hoursOk: false }; const e = v && S.events.find((q: any) => q.id === v.eventId && +q.vol > 0); return !old && e && (S.volunteers || []).filter((q: any) => q.eventId === e.id).length < +e.vol && !(S.volunteers || []).some((q: any) => q.eventId === e.id && q.familyId === fid) ? { id: String(v.id), eventId: e.id, familyId: fid, name: me.rec.parent, phone: me.rec.phone || "", ts: Date.now() } : null; }
    if (c === "journal") { if (x.op === "del") return old && old.familyId === fid ? true : null; return v && ownKid(v.studentId) && (!old || old.familyId === fid) ? { id: String(v.id), familyId: fid, studentId: v.studentId, date: D(v.date) || today(), text: T2(v, "text", 2000), share: !!v.share, ts: old ? old.ts : Date.now() } : null; }
    if (c === "testimonials") return !old && x.op === "put" && v && !(S.testimonials || []).some((t: any) => t.familyId === fid) ? { id: String(v.id), familyId: fid, name: firstLast(me.rec.parent), text: T2(v, "text", 800), lang: v.lang === "es" ? "es" : "en", ok: false, ts: Date.now() } : null;
    if (c === "reacts") { if (x.op === "del") return old && old.familyId === fid ? true : null; const p = String(x.id).split(":"); return !old && v && p.length === 3 && p[1] === fid && ["👍", "❤️", "🎉", "🥋"].includes(p[2]) && S.news.some((n: any) => n.id === p[0]) ? { id: x.id, newsId: p[0], familyId: fid, e: p[2] } : null; }
    if (c === "chLog") { if (x.op === "del") return old && ownKid(old.studentId) ? true : null; const ch = v && (S.challenges || []).find((q: any) => q.id === v.challengeId); return !old && ch && ownKid(v.studentId) && D(v.date) && v.date >= ch.from && v.date <= ch.to && v.date <= today() && x.id === `${ch.id}:${v.studentId}:${v.date}` ? { id: x.id, challengeId: ch.id, studentId: v.studentId, date: v.date, familyId: fid } : null; }
    if (c === "suggest") return !old && x.op === "put" && v && T2(v, "text", 1500).trim().length >= 5 ? { id: String(v.id), text: T2(v, "text", 1500), ts: Date.now() } : null;
    const own = (o: any) => o && o.familyId === fid;
    if (c === "goals") { if (x.op === "del") return own(old) ? true : null; if (old && !own(old)) return null; return v && (!v.studentId || ownKid(v.studentId)) ? { id: String(x.id), familyId: fid, studentId: v.studentId || "", text: T2(v, "text", 300), done: !!v.done, by: me.rec.parent, notes: old ? old.notes || [] : [], ts: old ? old.ts : Date.now() } : null; }
    if (c === "meetSlots" && old && x.op === "put") { if (!old.familyId && v.familyId === fid) return { ...old, familyId: fid, topic: T2(v, "topic", 200), studentId: ownKid(v.studentId) ? v.studentId : "" }; if (own(old) && !v.familyId) return { ...old, familyId: "", topic: "", studentId: "" }; return null; }
    if (c === "letters") return !old && x.op === "put" && v && ownKid(v.studentId) ? { id: String(x.id), familyId: fid, studentId: v.studentId, kind: T2(v, "kind", 20) || "attendance", to: T2(v, "to", 120), status: "requested", ts: Date.now() } : null;
    if (c === "swapItems") { if (x.op === "del") return own(old) ? true : null; return !old && v ? { id: String(x.id), familyId: fid, name: firstLast(me.rec.parent), item: T2(v, "item", 80), size: T2(v, "size", 20), note: T2(v, "note", 200), kind: v.kind === "want" ? "want" : "give", ts: Date.now() } : null; }
    if (c === "rentals") return !old && x.op === "put" && v && (S.inventory || []).some((i: any) => i.id === v.itemId && i.rent) ? { id: String(x.id), familyId: fid, itemId: v.itemId, studentId: ownKid(v.studentId) ? v.studentId : "", status: "requested", ts: Date.now() } : null;
    if (c === "posts") { if (x.op === "del") return own(old) ? true : null; return !old && v && T2(v, "text", 1000).trim().length > 2 ? { id: String(x.id), familyId: fid, name: firstLast(me.rec.parent), text: T2(v, "text", 1000), ok: false, ts: Date.now() } : null; }
    if (c === "habits") { if (x.op === "del") return old && ownKid(old.studentId) ? true : null; const p = String(x.id).split(":"); return v && ownKid(p[0]) && D(p[1]) && p[1] <= today() ? { id: x.id, studentId: p[0], date: p[1], h: (Array.isArray(v.h) ? v.h : []).map((y: any) => String(y).slice(0, 40)).slice(0, 12) } : null; }
    if (c === "askBox") return !old && x.op === "put" && v && ownKid(v.studentId) ? { id: String(x.id), familyId: fid, studentId: v.studentId, q: T2(v, "q", 300), ts: Date.now() } : null;
    if (c === "photoReacts") { if (x.op === "del") return own(old) ? true : null; const p = String(x.id).split(":"), a = (S.album || []).find((y: any) => y.id === p[0]); return !old && a && p[1] === fid && (a.kids || []).some(ownKid) && ["❤️", "😂", "🔥", "🥋"].includes(p[2]) ? { id: x.id, albumId: a.id, familyId: fid, e: p[2] } : null; }
    const kidPut = (k: string, extra: any) => !old && x.op === "put" && v && ownKid(v.studentId) ? { id: String(x.id), familyId: fid, studentId: v.studentId, ts: Date.now(), ...extra } : null;
    if (c === "schApps") return !old && x.op === "put" && v ? { id: String(x.id), familyId: fid, reason: T2(v, "reason", 1500), amount: T2(v, "amount", 40), kids: T2(v, "kids", 200), status: "new", ts: Date.now() } : null;
    if (c === "thanks") return kidPut(c, { to: T2(v, "to", 40), text: T2(v, "text", 300), sticker: T2(v, "sticker", 8) });
    if (c === "trivScores") { const p = String(x.id).split(":"); return v && ownKid(p[1]) && D(p[0]) && (!old || +v.score > +old.score) ? { id: x.id, wk: p[0], studentId: p[1], score: Math.max(0, Math.min(5, parseInt(v.score) || 0)), ts: Date.now() } : null; }
    if (c === "photoHide") { const p = String(x.id).split(":"); if (!ownKid(p[1])) return null; return x.op === "del" ? true : { id: x.id, albumId: p[0], studentId: p[1], familyId: fid }; }
    if (c === "art" || c === "photoContest") { if (x.op === "del") return own(old) ? true : null; return !old && v && /^\/api\/media\/[\w-]{1,40}$/.test(String(v.img || "")) && (!v.studentId || ownKid(v.studentId)) ? { id: String(x.id), familyId: fid, studentId: v.studentId || "", img: v.img, title: T2(v, "title", 80), ok: !!v.ok, ts: Date.now() } : null; }
    if (c === "svcHours") return kidPut(c, { date: D(v.date) || today(), hours: Math.max(0, Math.min(24, +v.hours || 0)), what: T2(v, "what", 200), approved: false });
    if (c === "classWait") { if (x.op === "del") return own(old) ? true : null; return kidPut(c, { cls: T2(v, "cls", 60) }); }
    if (c === "wsSign") { if (x.op === "del") return own(old) ? true : null; const e = v && S.events.find((q: any) => q.id === v.eventId && q.workshop); return !old && e ? { id: String(x.id), familyId: fid, eventId: e.id, n: Math.max(1, Math.min(4, parseInt(v.n) || 1)), name: me.rec.parent, ts: Date.now() } : null; }
    return null;
  }
  // staff roles
  if (!isStaff(role)) return null;
  const ema = role === "ema", coach = role === "coach";
  if (c === "checks" || c === "bdsign") return x.op === "del" ? true : v;
  if (c === "asp") return ema || coach ? (x.op === "del" ? true : v) : null;
  if (c === "students" && x.op === "put" && old) {
    if (ema) { const n = qnClean(mergeFields(old, v, ["belt", "stripes", "spar", "att", "notes", "bbt", "pic", "checkins", "nudged", "qn", "goal", "needs"])); if (!("goal" in v)) delete n.goal; if (Array.isArray(n.needs)) n.needs = n.needs.slice(-8).map((q: any) => ({ t: String(q.t || "").slice(0, 80), by: String(q.by || "").slice(0, 60), ts: +q.ts || Date.now() })); return n; }
    if (coach) return qnClean(mergeFields(old, v, ["att", "checkins", "qn", "pic"]));
    if (role === "lit") return qnClean(mergeFields(old, v, ["att", "qn"]));
    if (role === "desk") return qnClean(mergeFields(old, v, ["att", "checkins"]));
    return null;
  }
  if (c === "subs") {
    if (x.op === "del") return null;
    if (!old) return v.by === me.id ? { ...v, status: "open", asked: Array.isArray(v.asked) ? v.asked.slice(0, 30).map(String) : [] } : null;
    if ((v.status === "claimed" || v.status === "covered") && v.cover === me.id && old.status === "open") return { ...old, status: "claimed", cover: me.id, claimTs: Date.now() };
    if (v.status === "canceled" && old.by === me.id) return { ...old, status: "canceled" };
    return null;
  }
  if (c === "messages" && ema && x.op === "put") {
    if (!old) return v.from === "studio" ? { ...v, by: me.rec.name, ts: Date.now(), read: false } : null;
    return { ...old, read: !!v.read };
  }
  if (c === "staff" && x.op === "put" && old && x.id === me.id) { const n = mergeFields(old, v, [...(ema ? ["parentLog"] : []), "bday", "onb", "pushPrefs", "readCh", "tipsSeen", "phone", "textSubs", "lang", "trainGoal", "shiftText", "schedPref", "favMove"]); n.shiftText = !!n.shiftText; n.schedPref = String(n.schedPref || "").slice(0, 400); n.trainGoal = String(n.trainGoal || "").slice(0, 160); n.phone = String(n.phone || "").slice(0, 30); n.textSubs = !!n.textSubs; n.bday = /^\d{2}-\d{2}$/.test(String(n.bday || "")) ? n.bday : ""; return n; }
  if (c === "news" && x.op === "put" && old) { const r = new Set(old.readBy || []); if ((v.readBy || []).includes(me.id)) r.add(me.id); return { ...old, readBy: [...r] }; }
  if (c === "trades") {
    if (x.op === "del") return null;
    if (!old) return v.by === me.id && v.with && v.with !== me.id ? { id: v.id, by: me.id, with: String(v.with), shiftId: String(v.shiftId), date: String(v.date).slice(0, 10), wantShiftId: String(v.wantShiftId), wantDate: String(v.wantDate).slice(0, 10), note: String(v.note || "").slice(0, 200), status: "open", ts: Date.now() } : null;
    if (old.status !== "open") return null;
    if (old.with === me.id && ["accepted", "declined"].includes(v.status)) return { ...old, status: v.status };
    if (old.by === me.id && v.status === "canceled") return { ...old, status: "canceled" };
    return null;
  }
  if (c === "makeups" && ema) return x.op === "del" ? null : v;
  if (c === "promos" && ema && x.op === "put" && !old) return v;
  if (c === "promos" && ema && x.op === "put" && old) { const nt = v.note && typeof v.note === "object" ? { good: String(v.note.good || "").slice(0, 800), next: String(v.note.next || "").slice(0, 800), by: String(v.note.by || "").slice(0, 60) } : undefined; return { ...old, note: nt }; }
  if (c === "incidents") {
    if (x.op === "del") return null;
    const T = (k: string, n = 1500) => String((v || {})[k] || "").slice(0, n);
    if (!old) return v ? { id: String(v.id), by: me.id, date: T("date", 10) || today(), time: T("time", 5), studentId: T("studentId", 40), name: T("name", 80), where: T("where", 40), what: T("what"), injury: T("injury", 500), aid: T("aid", 500), wit: T("wit", 300), told: T("told", 40), toldBy: T("toldBy", 60), follow: !!v.follow, status: "open", ts: Date.now(), ...(typeof v.img === "string" && /^\/api\/media\/[\w-]{1,40}$/.test(v.img) ? { img: v.img } : {}) } : null;
    if (old.by !== me.id) return null;
    return { ...old, told: T("told", 40) || old.told, toldBy: T("toldBy", 60) || old.toldBy };
  }
  if (c === "timeoff") {
    if (x.op === "del" || !v) return null;
    if (!old) { const from = String(v.from || "").slice(0, 10), to = String(v.to || from).slice(0, 10); return /^\d{4}-\d{2}-\d{2}$/.test(from) ? { id: String(v.id), staff: me.id, from, to: to >= from ? to : from, note: String(v.note || "").slice(0, 200), status: "pending", ts: Date.now() } : null; }
    return old.staff === me.id && old.status === "pending" && v.status === "canceled" ? { ...old, status: "canceled" } : null;
  }
  if (c === "lost") { if (x.op === "del") return null; return v; }
  if ((c === "plans" || c === "drills" || c === "templates" || c === "trivia") && ema) return x.op === "del" ? true : v;
  if (c === "requests" && ema && old && ["question", "lesson"].includes(old.kind) && x.op === "put") return { ...old, status: ["answered", "ok", "no", "done"].includes(v.status) ? v.status : old.status, reply: String(v.reply || "").slice(0, 800), replyBy: me.rec.name, replyTs: Date.now() };
  if (c === "lessonSlots" && ema) { if (x.op === "del") return old && old.staff === me.id ? true : null; return !old && v && /^\d{4}-\d{2}-\d{2}$/.test(v.date) && /^\d{2}:\d{2}$/.test(v.t) ? { id: String(v.id), staff: me.id, date: v.date, t: v.t, len: Math.max(15, Math.min(120, parseInt(v.len) || 30)), note: String(v.note || "").slice(0, 100), ts: Date.now() } : null; }
  if (c === "votes") { if (x.op === "del") return old && old.by === me.id ? true : null; const m = today().slice(0, 7); return v && x.id === m + ":" + me.id && v.for !== me.id && S.staff.some((s: any) => s.id === v.for) ? { id: x.id, month: m, by: me.id, for: String(v.for), ts: Date.now() } : null; }
  if (c === "tlog") { if (x.op === "del") return old && old.staff === me.id ? true : null; return !old && v ? { id: String(v.id), staff: me.id, date: String(v.date || today()).slice(0, 10), min: Math.max(5, Math.min(300, parseInt(v.min) || 60)), what: String(v.what || "").slice(0, 200), ts: Date.now() } : null; }
  if (c === "assign") {
    if (x.op === "del") return ema ? true : null;
    if (!old) return ema && v ? { id: String(v.id), title: String(v.title || "").slice(0, 120), url: /^https?:\/\//.test(v.url || "") ? String(v.url).slice(0, 400) : "", note: String(v.note || "").slice(0, 300), for: String(v.for || ""), due: String(v.due || "").slice(0, 10), by: me.id, done: [], ts: Date.now() } : null;
    const d = new Set(old.done || []); if ((v.done || []).includes(me.id)) d.add(me.id); else d.delete(me.id); return { ...old, done: [...d] };
  }
  if (c === "eos") return !old && x.op === "put" && v ? { id: String(v.id), by: me.id, date: today(), done: String(v.done || "").slice(0, 800), left: String(v.left || "").slice(0, 800), ts: Date.now() } : null;
  if (c === "album" && (ema || coach)) { if (x.op === "del") return ema || (old && old.by === me.id) ? true : null; return !old && v && /^\/api\/media\/[\w-]{1,40}$/.test(String(v.img)) ? { id: String(v.id), img: v.img, kids: (Array.isArray(v.kids) ? v.kids : []).filter((id: string) => S.students.some((s: any) => s.id === id && s.photo !== false)).slice(0, 40), cap: String(v.cap || "").slice(0, 120), date: today(), by: me.id, ts: Date.now() } : null; }
  if (c === "hours") {
    if (x.op === "del") return null;
    if (!old) { if (v.staff !== me.id || typeof v.in !== "number") return null; const n: any = { id: v.id, staff: me.id, in: v.in, out: typeof v.out === "number" ? v.out : null, date: String(v.date || today()).slice(0, 10), note: String(v.note || "").slice(0, 200), src: v.src === "fix" ? "fix" : "clock" }; if (n.src === "fix") n.approved = false; else n.in = Math.min(v.in, Date.now() + 60000); return n; }
    if (old.staff !== me.id) return null;
    const n = clone(old); if (!old.out && typeof v.out === "number") n.out = Math.min(v.out, Date.now() + 60000); if (typeof v.note === "string") n.note = v.note.slice(0, 200); return n;
  }
  const T3 = (o: any, k: string, n: number) => String((o || {})[k] || "").slice(0, n), desk = role === "desk";
  const mine = (o: any) => o && o.by === me.id, any = coach || ema || role === "lit" || role === "desk";
  if (["formVids", "meetSlots", "polls", "ann"].includes(c) && ema && role !== "lit") return x.op === "del" ? true : v ? { ...v, by: v.by || me.id } : null;
  if (["behav", "badges", "kidVids"].includes(c) && (ema || coach)) { if (x.op === "del") return mine(old) ? true : null; return !old && v ? { ...v, id: String(x.id), by: me.id, byName: me.rec.name, ts: Date.now() } : null; }
  if (c === "askBox" && ema && old && v) return { ...old, a: T3(v, "a", 600), aBy: me.rec.name, aTs: Date.now() };
  if (c === "goals" && (ema || coach) && old && v) return { ...old, notes: (Array.isArray(v.notes) ? v.notes : old.notes || []).slice(-20).map((n: any) => ({ t: String(n.t || "").slice(0, 300), by: String(n.by || me.rec.name).slice(0, 60), ts: +n.ts || Date.now() })), done: !!v.done };
  if (c === "evals" && ema) return !old && v && v.to !== me.id ? { ...v, id: String(x.id), by: me.id, ts: Date.now() } : null;
  if (["shadow", "chkLog", "handoff", "trainLog", "wish"].includes(c) && any) { if (x.op === "del") return mine(old) ? true : null; return !old && v ? { ...v, id: String(x.id), by: me.id, byName: me.rec.name, ts: Date.now() } : null; }
  if (["annRead", "pollVotes", "wishVote"].includes(c) && any) { if (String(x.id).split(":")[1] !== me.id) return null; return x.op === "del" ? true : { ...(v || {}), id: x.id, by: me.id, ts: Date.now() }; }
  if (c === "tgoals" && any) return x.id === `${(v || {}).wk}:${me.id}` || (old && old.by === me.id) ? (x.op === "del" ? true : { id: x.id, wk: T3(v, "wk", 10), by: me.id, text: T3(v, "text", 300), done: !!v.done, ts: Date.now() }) : null;
  if (c === "bioReqs" && any) return !old && x.op === "put" && v ? { id: String(x.id), by: me.id, bio: T3(v, "bio", 1500), bioEs: T3(v, "bioEs", 1500), title: T3(v, "title", 60), status: "pending", ts: Date.now() } : null;
  if (c === "covers" && any) { if (!old) return v ? { id: String(x.id), shiftId: T3(v, "shiftId", 40), date: T3(v, "date", 10), by: me.id, status: "offered", ts: Date.now() } : null; return old.by === me.id && v && v.status === "canceled" ? { ...old, status: "canceled" } : null; }
  if (c === "hrsOk" && any) return x.id === `${(v || {}).period}:${me.id}` && !old ? { id: x.id, period: T3(v, "period", 30), by: me.id, hrs: +v.hrs || 0, note: T3(v, "note", 300), ts: Date.now() } : null;
  if (c === "orders" && any && !old && x.op === "put" && v) { const pct = Math.max(0, Math.min(50, +((S.billing || {}).staffDisc) || 0)); const items = (Array.isArray(v.items) ? v.items : []).slice(0, 20).map((i: any) => { const it = (S.inventory || []).find((q: any) => q.id === i.id); return it ? { id: it.id, name: it.name + (it.size ? ` (${it.size})` : ""), qty: Math.max(1, Math.min(10, parseInt(i.qty) || 1)), price: Math.round(+it.price * (100 - pct)) / 100 } : null; }).filter(Boolean); return items.length ? { id: String(x.id), staffId: me.id, familyId: "", items, status: "new", note: "Staff order", ts: Date.now(), billed: true } : null; }
  if (c === "volunteers" && ema && old && v) return { ...old, hoursOk: !!v.hoursOk };
  if (["moves", "subNotes", "res", "fireDrills", "ptips"].includes(c) && (ema || (coach && c === "fireDrills"))) return x.op === "del" ? true : v ? { ...v, id: String(x.id), by: me.id } : null;
  if (["mentorLog", "classRate", "supplyReq", "feedback", "gearOut", "bloopers"].includes(c) && any) { if (x.op === "del") return mine(old) ? true : null; if (old) return mine(old) || (c === "gearOut") || (c === "bloopers" && (old.tagged || []).includes(me.id)) ? { ...old, ...(c === "gearOut" ? { back: v && v.back ? Date.now() : old.back } : {}), ...(c === "bloopers" ? { ok: { ...(old.ok || {}), [me.id]: true } } : {}) } : null; if (!v) return null; const nv: any = { ...v, id: String(x.id), by: me.id, byName: me.rec.name, ts: Date.now() }; if (c === "bloopers") { nv.tagged = (Array.isArray(v.tagged) ? v.tagged : []).filter((t: any) => S.staff.some((m: any) => m.id === t)); nv.ok = nv.tagged.includes(me.id) ? { [me.id]: true } : {}; nv.tv = false; if (!/^\/api\/media\/|^data:image\//.test(String(v.img || ""))) return null; } return nv; }
  if (c === "convLog" && (ema || coach)) { if (x.op === "del") return mine(old) ? true : null; return !old && v ? { ...v, id: String(x.id), by: me.id, byName: me.rec.name, ts: Date.now() } : null; }
  if (c === "staffQ" && any) return !old && x.op === "put" && v ? { id: String(x.id), q: T3(v, "q", 600), anon: !!v.anon, by: v.anon ? "" : me.id, ts: Date.now() } : null;
  if (c === "svcHours" && ema && old && v) return { ...old, approved: !!v.approved, by: me.rec.name };
  if (["routines", "challenges", "forms", "quizzes"].includes(c) && ema) return x.op === "del" ? true : v;
  if (c === "progress" && ema) return x.op === "del" ? true : v ? { ...v, by: v.by || me.rec.name } : null;
  if (c === "homework" && ema && old && x.op === "put") return { ...old, reply: T3(v, "reply", 800), replyBy: me.rec.name, status: "done", replyTs: Date.now() };
  if (c === "avail") return x.id === me.id && x.op === "put" && v ? { id: me.id, days: v.days && typeof v.days === "object" ? v.days : {}, note: T3(v, "note", 200), ts: Date.now() } : null;
  if (c === "quizAns") return !old && x.op === "put" && v && (S.quizzes || []).some((q: any) => q.id === v.quizId) ? { id: String(v.id), quizId: v.quizId, by: me.id, score: +v.score || 0, of: +v.of || 0, ts: Date.now() } : null;
  if (c === "kudos") { if (x.op === "del") return old && (old.by === me.id) ? true : null; return !old && v && v.to !== me.id && S.staff.some((m: any) => m.id === v.to) ? { id: String(v.id), by: me.id, to: String(v.to), text: T3(v, "text", 300), ts: Date.now() } : null; }
  if (c === "pulse") return !old && x.op === "put" && v && x.id === `${v.wk}:${me.id}` ? { id: x.id, wk: T3(v, "wk", 10), by: me.id, mood: Math.max(1, Math.min(5, parseInt(v.mood) || 3)), note: T3(v, "note", 600), anon: !!v.anon, ts: Date.now() } : null;
  if (c === "mileage") { if (x.op === "del") return old && old.by === me.id ? true : null; return !old && v ? { id: String(v.id), by: me.id, date: T3(v, "date", 10) || today(), start: +v.start || 0, end: +v.end || 0, miles: Math.max(0, Math.min(2000, +v.miles || 0)), purpose: T3(v, "purpose", 120), ts: Date.now() } : null; }
  if (c === "pretrip") return !old && x.op === "put" && v ? { id: String(v.id), by: me.id, date: today(), items: v.items && typeof v.items === "object" ? v.items : {}, ok: !!v.ok, note: T3(v, "note", 400), ts: Date.now() } : null;
  if (c === "swaps") {
    if (x.op === "del") return null;
    if (!old) return v && v.with !== me.id ? { id: String(v.id), by: me.id, with: T3(v, "with", 40), date: T3(v, "date", 10), cls: T3(v, "cls", 80), note: T3(v, "note", 200), status: "open", ts: Date.now() } : null;
    if (old.status !== "open") return null;
    if ((old.with === me.id || (!old.with && old.by !== me.id)) && ["accepted", "declined"].includes(v.status)) return { ...old, status: v.status, taker: me.id };
    if (old.by === me.id && v.status === "canceled") return { ...old, status: "canceled" };
    return null;
  }
  if (c === "teachFb" && ema) return !old && x.op === "put" && v && v.to !== me.id ? { id: String(v.id), by: me.id, to: T3(v, "to", 40), date: T3(v, "date", 10) || today(), cls: T3(v, "cls", 80), good: T3(v, "good", 800), next: T3(v, "next", 800), ts: Date.now() } : null;
  if (c === "meds" && (coach || desk)) return !old && x.op === "put" && v ? { id: String(v.id), studentId: T3(v, "studentId", 40), date: today(), time: T3(v, "time", 5), by: me.rec.name, ts: Date.now() } : null;
  if (c === "signouts" && (coach || desk || ema)) return !old && x.op === "put" && v ? { id: String(v.id), studentId: T3(v, "studentId", 40), date: today(), name: T3(v, "name", 80), sig: /^\/api\/media\/[\w-]{1,40}$/.test(String(v.sig || "")) ? v.sig : "", pinOk: !!v.pinOk, by: me.rec.name, ts: Date.now() } : null;
  if (desk) {
    if (c === "students" && x.op === "put" && old) return qnClean(mergeFields(old, v, ["att", "checkins"]));
    if (c === "invoices" && x.op === "put" && old && v) return old.status === "open" && v.status === "paid" ? { ...old, status: "paid", paidAt: Date.now(), method: T3(v, "method", 40) || "Front desk", by: me.rec.name } : null;
    if (c === "inquiries" && x.op === "put" && old && v) return { ...old, status: T3(v, "status", 20) || old.status, stage: T3(v, "stage", 20), notes: T3(v, "notes", 1000) };
    if (c === "orders" && x.op === "put" && old && v) return { ...old, status: ["new", "ready", "picked", "canceled"].includes(v.status) ? v.status : old.status };
    if (c === "messages" && x.op === "put") { if (!old) return v.from === "studio" ? { ...v, by: me.rec.name, ts: Date.now(), read: false } : null; return { ...old, read: !!v.read }; }
  }
  return null;
}
function pick(o: any, keys: string[]) { const r: any = {}; for (const k of keys) if (k in o) r[k] = o[k]; return r; }
function mergeFields(old: any, v: any, fields: string[]) { const o = clone(old); for (const f of fields) if (f in v) o[f] = v[f]; return o; }

export function applyChanges(S: any, me: any, changes: any[]) {
  const rejected: any[] = [];
  for (let x of (changes || []).slice(0, 500)) {
    if (!x || typeof x.c !== "string") continue;
    if (x.op === "patch") { // field-level change: merge into the record as it is now on the server
      const a = S[x.c], key = x.c === "focus" ? "wk" : "id", cur = Array.isArray(a) ? a.find((r: any) => r[key] === x.id) : null;
      if (!cur || !x.set || typeof x.set !== "object") { rejected.push({ c: x.c, id: x.id }); continue; }
      const v = { ...clone(cur), ...x.set }; for (const f of Array.isArray(x.unset) ? x.unset : []) delete v[f];
      x = { c: x.c, op: "put", id: x.id, v };
    }
    const c = x.c;
    const known = ARR.includes(c) || c === "focus" || OBJ2.includes(c) || OBJ.includes(c) || SCALAR.includes(c);
    if (!known) { rejected.push(x); continue; }
    if (OBJ2.includes(c) || OBJ.includes(c) || SCALAR.includes(c) || ["shifts", "events", "news", "focus", "invoices", "outbox", "resetReqs", "rtlog", "inquiries"].includes(c)) {
      // studio-wide settings and records: admin only (plus the staff/family exceptions in rule())
      const res = OBJ2.includes(c) || ["checks", "bdsign"].includes(c) || c === "inquiries" || (c === "news" && me && me.role !== "admin") || (c === "invoices" && me && me.role === "desk") ? rule(S, me, x) : me && me.role === "admin" ? (x.op === "del" ? true : x.v) : null;
      if (res === null || res === undefined) { rejected.push({ c, id: x.id }); continue; }
      if (SCALAR.includes(c)) { S[c] = x.v; continue; }
      if (OBJ2.includes(c)) { const o = (S[c] ||= {}); const p = (o[x.id] ||= {}); if (x.op === "del") delete p[x.sub]; else p[x.sub] = x.v; continue; }
      if (OBJ.includes(c)) { const o = (S[c] ||= {}); if (x.op === "del") delete o[x.id]; else o[x.id] = x.v; continue; }
      putArr(S, c, x, res); continue;
    }
    const res = rule(S, me, x);
    if (res === null || res === undefined) { rejected.push({ c, id: x.id }); continue; }
    putArr(S, c, x, res);
  }
  return rejected;
}
function putArr(S: any, c: string, x: any, res: any) {
  const key = c === "focus" ? "wk" : "id", a = (S[c] ||= []), i = a.findIndex((r: any) => r[key] === x.id);
  if (x.op === "del") { if (i >= 0) a.splice(i, 1); return; }
  const val = res === true ? x.v : res;
  if (!val || val[key] !== x.id) return;
  if (i >= 0) a[i] = val; else a.push(val);
}

/* ---------- outbox delivery ---------- */
export async function deliver(S: any) {
  let changed = false;
  const fromName = (S.mail && S.mail.fromName) || "Kicks Unlimited";
  for (const m of S.outbox.filter((m: any) => !m.sent && !m.failed).slice(0, 25)) {
    let r: any = { ok: false };
    if (m.tr === "hmn" && !m.trDone && (m.kind === "text" ? smsOn() : mailOn())) { try { const { hmnTranslate } = await import("./extra.mts"); m.body = await hmnTranslate(m.body); } catch (e) {} m.trDone = true; }
    if (m.kind === "text") { if (!smsOn()) continue; r = await sendSMS(m.to, m.body); }
    else { if (!mailOn()) continue; r = await sendMail(m.to, m.subject, m.body, fromName); }
    if (r.ok) { m.sent = Date.now(); m.auto = true; if (m.secret) redactCodes(S); } else { m.error = r.reason; m.tries = (m.tries || 0) + 1; if (m.tries >= 3) m.failed = true; }
    changed = true;
  }
  if (S.outbox.length > 400) S.outbox.length = 400;
  return changed;
}
/* reset codes in the outbox: blanked once the email has gone out, the code was used, or it expired */
export function redactCodes(S: any, code = "") {
  let n = 0;
  for (const m of S.outbox || []) if (m.secret && (m.sent || Date.now() > (m.secretExp || 0) || (code && m.secret === code))) { m.body = String(m.body).split(m.secret).join("••••••"); delete m.secret; delete m.secretExp; n++; }
  return n > 0;
}
export function queue(S: any, to: string, subject: string, body: string, kind = "email") {
  const sig = (S.mail && S.mail.sig) || "— The Kicks Unlimited team";
  const m = { id: uid("o"), to, subject, body: kind === "text" ? body : body + "\n\n" + sig, kind, from: kind === "text" ? "(608) 834-9992" : `${(S.mail && S.mail.fromName) || "Kicks Unlimited"} <${(S.mail && S.mail.addr) || "info@KicksSP.com"}>`, ts: Date.now() };
  S.outbox.unshift(m);
  return m;
}

/* families get emails & texts in their language */
const MES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const fmtEs = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("es-US", { weekday: "short", month: "short", day: "numeric" });
export function tell(S: any, f: any, subj: [string, string], body: [string, string], text?: [string, string]) {
  const es = f.lang === "es", sigEs = "— El equipo de Kicks Unlimited";
  if (!f.notify || f.notify.email !== false) { const m: any = queue(S, f.email, es ? subj[1] : subj[0], es ? body[1] : body[0]); if (es && !(S.mail && S.mail.sig)) m.body = m.body.replace(/— The Kicks Unlimited team$/, sigEs); if (f.lang === "hmn") m.tr = "hmn"; }
  if (text && (S.billing || {}).text && f.notify && f.notify.text) { const m: any = queue(S, f.phone, "Text message", "Kicks Unlimited: " + (es ? text[1] : text[0]), "text"); if (f.lang === "hmn") m.tr = "hmn"; }
}
/* ---------- monthly tuition on autopilot (runs daily) ---------- */
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
function nextDue(t: string, day: number) { const [y, m, d] = t.split("-").map(Number); const mm = d <= day ? m - 1 : m; const dt = new Date(Date.UTC(y, mm, day, 12)); return dt.toISOString().slice(0, 10); }
export function autoTuition(S: any) {
  const B = S.billing || {};
  if (!B.tuitionOn) return 0;
  const t = today(), due = nextDue(t, B.tuitionDay || 1);
  const days = Math.round((Date.parse(due + "T12:00:00Z") - Date.parse(t + "T12:00:00Z")) / 864e5);
  if (days > (B.tuitionLead ?? 7)) return 0;
  const mo = MONTHS[Number(due.slice(5, 7)) - 1];
  let n = 0;
  S.invNo = S.invNo || 1001;
  for (const f of S.families.filter((x: any) => x.status === "approved")) {
    const plan = (S.tuition || {})[f.id];
    if (!plan || !plan.on || !(plan.amount > 0)) continue;
    if (plan.pausedUntil && due >= (plan.pausedFrom || "") && due <= plan.pausedUntil) continue; // membership paused
    if (plan.endAt && due > plan.endAt) continue; // canceled
    const key = f.id + ":" + due.slice(0, 7);
    if (S.invoices.some((i: any) => i.tuitionKey === key)) continue;
    const kidsN = S.students.filter((s: any) => s.familyId === f.id && s.status === "active").length, pct = kidsN >= 2 ? Math.max(0, Math.min(50, +B.sibPct || 0)) : 0;
    const moEs = MES[Number(due.slice(5, 7)) - 1], extra = `${plan.note ? " — " + plan.note : ""}${plan.discount ? " · " + plan.discount : ""}`;
    const i = { id: uid("i"), num: S.invNo++, familyId: f.id, desc: `${mo} tuition${extra}${pct ? ` · Sibling discount −${pct}%` : ""}`, descEs: `Colegiatura de ${moEs}${extra}${pct ? ` · Descuento por hermanos −${pct}%` : ""}`, amount: Math.round(plan.amount * (1 - pct / 100)), due, status: "open", created: Date.now(), rem: [], tuitionKey: key, auto: true };
    S.invoices.push(i);
    const fn = String(f.parent || "").split(" ")[0];
    tell(S, f, [`${mo} tuition — Kicks Unlimited`, `Colegiatura de ${moEs} — Kicks Unlimited`], [`Hi ${fn},\n\nYour ${mo} tuition bill is ready:\n#${i.num} · ${i.desc}\nAmount: ${money(i.amount)}\nDue: ${fmt(due)}\n\nPay in the family portal under Billing.`, `Hola, ${fn}:\n\nSu factura de colegiatura de ${moEs} está lista:\n#${i.num} · ${i.descEs}\nMonto: ${money(i.amount)}\nVence: ${fmtEs(due)}\n\nPague en el portal familiar, en Pagos.`]);
    n++;
  }
  return n;
}

/* ---------- payment-due reminders (runs daily) ---------- */
const money = (c: number) => "$" + ((c || 0) / 100).toFixed(2);
const fmt = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
export function runReminders(S: any) {
  const B = S.billing || {};
  if (!B.auto) return 0;
  let n = 0;
  const t = today();
  for (const i of S.invoices.filter((x: any) => x.status === "open")) {
    const f = S.families.find((x: any) => x.id === i.familyId);
    if (!f) continue;
    i.rem = i.rem || [];
    const days = Math.round((Date.parse(i.due + "T12:00:00") - Date.parse(t + "T12:00:00")) / 864e5);
    let k = "";
    if (days >= 0 && days <= (B.days ?? 3) && !i.rem.some((r: any) => r.k === "soon")) k = "soon";
    else if (days < 0) { const last = i.rem.filter((r: any) => r.k === "late").map((r: any) => r.d).sort().pop(); if (!last || Date.parse(t) - Date.parse(last) >= 6048e5) k = "late"; }
    if (!k) continue;
    const first = String(f.parent || "").split(" ")[0], dEs = i.descEs || i.desc;
    tell(S, f, k === "soon" ? [`Reminder: ${money(i.amount)} due ${fmt(i.due)}`, `Recordatorio: ${money(i.amount)} vence ${fmtEs(i.due)}`] : [`Past due: bill #${i.num}`, `Vencida: factura #${i.num}`],
      k === "soon" ? [`Hi ${first}, friendly reminder that bill #${i.num} (${i.desc}) for ${money(i.amount)} is due ${fmt(i.due)}. Pay anytime in the family portal under Billing.`, `Hola, ${first}: le recordamos que la factura #${i.num} (${dEs}) por ${money(i.amount)} vence el ${fmtEs(i.due)}. Pague en el portal familiar, en Pagos.`]
        : [`Hi ${first}, bill #${i.num} (${i.desc}) for ${money(i.amount)} was due ${fmt(i.due)} and is now past due. Pay in the family portal under Billing, or text us with questions.`, `Hola, ${first}: la factura #${i.num} (${dEs}) por ${money(i.amount)} venció el ${fmtEs(i.due)}. Pague en el portal familiar o escríbanos si tiene preguntas.`],
      [`${money(i.amount)} ${k === "soon" ? "due " + fmt(i.due) : "is past due"} (#${i.num}). Pay in the family portal.`, `${money(i.amount)} ${k === "soon" ? "vence " + fmtEs(i.due) : "está vencida"} (#${i.num}). Pague en el portal familiar.`]);
    i.rem.push({ k, d: t, ts: Date.now() });
    n++;
  }
  return n;
}

/* ---------- night-before reminders for sign-up events + confirmed parties (runs daily) ---------- */
export function eventReminders(S: any) {
  const B = S.billing || {}, t = today(), tm = new Date(Date.parse(t + "T12:00:00Z") + 864e5).toISOString().slice(0, 10);
  let n = 0;
  for (const e of (S.events || []).filter((x: any) => x.date === tm && x.signup && x.remSent !== tm)) {
    const fams = [...new Set((S.signups || []).filter((s: any) => s.eventId === e.id).map((s: any) => s.familyId))];
    for (const fid of fams) {
      const f = S.families.find((x: any) => x.id === fid); if (!f) continue;
      const kids: string[] = (S.signups || []).filter((s: any) => s.eventId === e.id && s.familyId === fid).map((s: any) => (S.students.find((k: any) => k.id === s.studentId) || {}).name).filter(Boolean).map((x: string) => x.split(" ")[0]);
      const when = `tomorrow (${fmt(tm)})${e.time ? " at " + e.time : ""}`, whenEs = `mañana (${fmtEs(tm)})${e.time ? " a las " + e.time : ""}`, tEs = e.titleEs || e.title, fn = String(f.parent || "").split(" ")[0];
      tell(S, f, [`Reminder: ${e.title} is tomorrow`, `Recordatorio: ${tEs} es mañana`], [`Hi ${fn},\n\nJust a reminder: ${kids.join(" & ")} ${kids.length > 1 ? "are" : "is"} signed up for ${e.title} ${when}.${e.desc ? "\n\n" + e.desc : ""}\n\nSee you at Kicks — 601 S. Bird St.`, `Hola, ${fn}:\n\nLe recordamos que ${kids.join(" y ")} ${kids.length > 1 ? "están inscritos" : "está inscrito(a)"} en ${tEs} ${whenEs}.${(e.descEs || e.desc) ? "\n\n" + (e.descEs || e.desc) : ""}\n\nLos esperamos en Kicks: 601 S. Bird St.`], [`reminder — ${e.title} is ${when}. See you there!`, `recordatorio: ${tEs} es ${whenEs}. ¡Los esperamos!`]);
      n++;
    }
    e.remSent = tm;
  }
  for (const p of (S.parties || []).filter((x: any) => x.status === "confirmed" && x.date === tm && x.remSent !== tm)) {
    const f = S.families.find((x: any) => x.id === p.familyId); if (!f) continue;
    const fn = String(f.parent || "").split(" ")[0];
    tell(S, f, [`Reminder: ${p.child}'s party is tomorrow`, `Recordatorio: la fiesta de ${p.child} es mañana`], [`Hi ${fn},\n\nWe're excited for ${p.child}'s birthday party tomorrow (${fmt(tm)}) at Kicks! Text us at (608) 834-9992 with any last-minute changes.`, `Hola, ${fn}:\n\n¡Nos emociona la fiesta de ${p.child} mañana (${fmtEs(tm)}) en Kicks! Escríbanos al (608) 834-9992 si hay algún cambio.`]);
    p.remSent = tm; n++;
  }
  return n;
}

/* ---------- monthly studio report to the owners (runs on the 1st) ---------- */
export function monthlyReport(S: any) {
  const t = today(); if (t.slice(8) !== "01" || !S.mail || !S.mail.addr) return 0;
  const d = new Date(Date.parse(t + "T12:00:00Z") - 5 * 864e5), ym = d.toISOString().slice(0, 7);
  if (S.repSent === ym) return 0;
  const act = S.students.filter((s: any) => s.status !== "pending");
  const visits = act.reduce((n: number, s: any) => n + (s.att || []).filter((x: string) => x.slice(0, 7) === ym).length, 0);
  const inMonth = (ts: any) => ts && new Date(ts).toISOString().slice(0, 7) === ym;
  const paid = S.invoices.filter((i: any) => i.status === "paid" && inMonth(i.paidAt || i.created)).reduce((a: number, i: any) => a + i.amount, 0);
  const label = new Date(ym + "-15T12:00:00Z").toLocaleDateString("en-US", { month: "long", year: "numeric" });
  queue(S, S.mail.addr, `Studio report — ${label}`, `Kicks Unlimited — ${label}\n\nActive students: ${act.length}\nClass check-ins: ${visits}\nPromotions: ${S.promos.filter((p: any) => String(p.date).slice(0, 7) === ym).length}\nNew family sign-ups: ${S.families.filter((f: any) => inMonth(f.created)).length}\nFirst Look requests: ${S.inquiries.filter((q: any) => inMonth(q.ts)).length}\nPayments received: ${money(paid)}\nOpen invoices now: ${S.invoices.filter((i: any) => i.status === "open").length}\nIncident reports: ${(S.incidents || []).filter((i: any) => String(i.date).slice(0, 7) === ym).length}\n\nMore in Studio admin → Reports.`);
  S.repSent = ym; return 1;
}

/* ---------- daily family emails: birthdays + "we miss you" (owners can turn each off in Settings) ---------- */
export function familyAuto(S: any) {
  const B = S.billing || {}, t = today(), yr = t.slice(0, 4); let n = 0;
  if (B.bdayMail !== false) for (const s of S.students || []) {
    if (s.status === "pending" || !s.dob || String(s.dob).slice(5) !== t.slice(5)) continue;
    const f = (S.families || []).find((x: any) => x.id === s.familyId && x.status === "approved"); if (!f) continue;
    f.bdaySent = f.bdaySent || {}; if (f.bdaySent[s.id] === yr) continue; f.bdaySent[s.id] = yr;
    const fn = String(s.name).split(" ")[0];
    tell(S, f, [`Happy birthday, ${fn}! 🎂`, `¡Feliz cumpleaños, ${fn}! 🎂`], [`Hi ${String(f.parent).split(" ")[0]},\n\nEveryone at Kicks Unlimited wishes ${fn} a very happy birthday! Come celebrate at class this week. 🥋🎉`, `Hola, ${String(f.parent).split(" ")[0]}:\n\n¡Todo el equipo de Kicks Unlimited le desea a ${fn} un muy feliz cumpleaños! Vengan a celebrar en clase esta semana. 🥋🎉`]); n++;
  }
  if (B.winback !== false) {
    const d60 = new Date(Date.parse(t + "T12:00:00Z") - 60 * 864e5).toISOString().slice(0, 10), d150 = new Date(Date.parse(t + "T12:00:00Z") - 150 * 864e5).toISOString().slice(0, 10), d180 = new Date(Date.parse(t + "T12:00:00Z") - 180 * 864e5).toISOString().slice(0, 10);
    for (const f of (S.families || []).filter((x: any) => x.status === "approved")) {
      const kids = (S.students || []).filter((s: any) => s.familyId === f.id && s.status !== "pending"); if (!kids.length) continue;
      const last = kids.flatMap((k: any) => k.att || []).sort().pop(); if (!last || last >= d60 || last < d150) continue;
      if (f.winback && f.winback >= d180) continue; f.winback = t;
      const names = kids.map((k: any) => String(k.name).split(" ")[0]).join(" & ");
      tell(S, f, [`We miss you at Kicks!`, `¡Los extrañamos en Kicks!`], [`Hi ${String(f.parent).split(" ")[0]},\n\nIt's been a while since we've seen ${names} on the mat, and we miss them! Reply to this email or call (608) 834-9992 and we'll help you find a class time that works.`, `Hola, ${String(f.parent).split(" ")[0]}:\n\nHace tiempo que no vemos a ${names} en el tapete, ¡y los extrañamos! Responda este correo o llame al (608) 834-9992 y le ayudamos a encontrar un horario.`]); n++;
    }
  }
  return n;
}
