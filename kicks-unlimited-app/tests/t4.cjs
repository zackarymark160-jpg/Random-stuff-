// XSS sweep: put booby-trapped text in every field families, the public and staff can write, then open every screen
const { chromium, ok, B, ctx, login, text, api, R } = require("./lib.cjs");
const crypto = require("crypto"); const H = p => crypto.createHash("sha256").update("kicks-sp:" + p).digest("hex");
const F = []; const X = (name) => { F.push(name); const i = F.length - 1; return `<img src=x onerror=__x.push(${i})>${name}`; };
const raw = async (path, body, tok, ip = "10.7.7." + (1 + Math.floor(Math.random() * 200))) => { const r = await fetch(B + "api/" + path, { method: "POST", headers: { "content-type": "application/json", "x-test-ip": ip, ...(tok ? { authorization: "Bearer " + tok } : {}) }, body: JSON.stringify(body) }); return { s: r.status, j: await r.json().catch(() => ({})) }; };
async function setup(b) {
  const own = await ctx(b, "10.0.5.1"); await own.addInitScript(() => { window.__x = []; });
  let r = await login(own, "#/admin", "Seth Degnan", "Starter-Test-2026", "3152"); await own.fill("#ow1", "Owner-Real-Pass1"); await own.fill("#ow2", "Owner-Real-Pass1"); await own.click("form[data-form=ownPw] button"); await own.waitForTimeout(700);
  const st = await api(own, "admin/new-staff", { name: "Test Coach", role: "coach" }); const se = await api(own, "admin/new-staff", { name: "Test Instructor", role: "ema" });
  // public forms
  await raw("inquiry", { child: X("inquiry child"), age: "7", phone: "6085550111", parent: X("inquiry parent"), notes: X("inquiry notes"), heard: X("inquiry heard"), interest: X("inquiry interest") });
  await raw("guest-waiver", { parent: X("waiver parent"), phone: "6085550112", kids: [{ name: X("waiver kid"), age: "8" }], sig: X("waiver sig"), emergency: X("waiver emergency"), med: X("waiver med"), purpose: "visit" });
  await raw("space-req", { name: X("space name"), phone: "6085550113", group: X("space group"), note: X("space note") });
  await raw("alumni", { name: X("alumni name"), email: "al@example.com", note: X("alumni note"), ok: true });
  await raw("sub", { email: '"<img/src=x/onerror=__x.push(' + F.length + ')>"@x.co' }); F.push("newsletter email");
  // family
  const fam = await ctx(b, "10.0.5.2"); await fam.addInitScript(() => { window.__x = []; }); await fam.goto(B + "#/family"); await fam.waitForSelector("#fe");
  const su = await fam.evaluate(async ([p, k]) => apiCall("signup", { parent: p, email: "x.tester@example.com", phone: "6085550100", pw: await hash("Family-Pass-1"), kids: [{ name: k, prog: "kids" }], sig: "x", lang: "en" }), [X("family parent name"), X("kid name")]);
  const fid = su.me.id, kid = su.view.students[0].id;
  await api(own, "sync", { changes: [{ c: "families", op: "patch", id: fid, set: { status: "approved" } }, { c: "students", op: "patch", id: kid, set: { status: "active" } }] });
  await fam.goto(B + "#/family"); await fam.fill("#fe", "x.tester@example.com"); await fam.fill("#fp", "Family-Pass-1"); await fam.press("#fp", "Enter"); await fam.waitForTimeout(900);
  const d = new Date(Date.now() + 5 * 864e5).toISOString().slice(0, 10), now = Date.now();
  const ch = [
    { c: "messages", op: "put", id: "m1", v: { id: "m1", familyId: fid, from: "family", text: X("family message") } },
    { c: "families", op: "patch", id: fid, set: { emergency: X("family emergency"), pickup: [X("pickup person")], custody: { note: X("custody note"), days: {} } } },
    { c: "students", op: "patch", id: kid, set: { med: { allergies: X("allergies"), conditions: X("conditions"), notes: X("med notes") }, favMove: X("fav move"), dream: X("dream") } },
    { c: "absences", op: "put", id: "ab1", v: { id: "ab1", studentId: kid, date: d, note: X("absence note"), reason: X("absence reason") } },
    { c: "parties", op: "put", id: "pt1", v: { id: "pt1", familyId: fid, date: d, kid: X("party kid"), note: X("party note"), theme: X("party theme") } },
    { c: "requests", op: "put", id: "rq1", v: { id: "rq1", kind: "question", studentId: kid, text: X("request text"), skill: X("request skill") } },
    { c: "makeups", op: "put", id: "mk1", v: { id: "mk1", studentId: kid, due: d, note: X("makeup note") } },
    { c: "journal", op: "put", id: "j1", v: { id: "j1", studentId: kid, text: X("journal"), share: true } },
    { c: "testimonials", op: "put", id: "ts1", v: { id: "ts1", text: X("testimonial") } },
    { c: "posts", op: "put", id: "po1", v: { id: "po1", text: X("community post") } },
    { c: "swapItems", op: "put", id: "sw1", v: { id: "sw1", item: X("swap item"), note: X("swap note") } },
    { c: "goals", op: "put", id: "g1", v: { id: "g1", text: X("goal") } },
    { c: "askBox", op: "put", id: "ak1", v: { id: "ak1", studentId: kid, q: X("ask box") } },
    { c: "suggest", op: "put", id: "sg1", v: { id: "sg1", text: X("suggestion box") } },
    { c: "schApps", op: "put", id: "sa1", v: { id: "sa1", reason: X("scholarship reason"), kids: X("scholarship kids") } },
    { c: "thanks", op: "put", id: "th1", v: { id: "th1", studentId: kid, to: "sd", text: X("thank you note") } },
    { c: "homework", op: "put", id: "hw1", v: { id: "hw1", studentId: kid, url: "https://example.com", what: X("homework what") } },
  ];
  const fr = await api(fam, "sync", { changes: ch }); 
  // staff
  const tc = await ctx(b, "10.0.5.3"); await login(tc, "#/staff", "Test Coach", st.r.temp, "2534"); await tc.fill("#ow1", "Coach-Own-Pass1"); await tc.fill("#ow2", "Coach-Own-Pass1"); await tc.click("form[data-form=ownPw] button"); await tc.waitForTimeout(700);
  const cme = (await api(tc, "state")).r.me.id;
  await api(tc, "sync", { changes: [
    { c: "chat", op: "put", id: "c1", v: { id: "c1", ch: "all", text: X("staff chat") } },
    { c: "incidents", op: "put", id: "i1", v: { id: "i1", studentId: kid, where: X("incident where"), what: X("incident what"), injury: X("incident injury") } },
    { c: "subs", op: "put", id: "s1", v: { id: "s1", shiftId: "x", date: d, by: cme, note: X("sub note"), status: "open" } },
    { c: "timeoff", op: "put", id: "to1", v: { id: "to1", from: d, note: X("time off note") } },
    { c: "staffQ", op: "put", id: "q1", v: { id: "q1", q: X("staff question") } },
    { c: "kudos", op: "put", id: "k1", v: { id: "k1", to: "sd", text: X("kudos") } },
    { c: "staff", op: "patch", id: cme, set: { schedPref: X("sched pref"), trainGoal: X("train goal"), favMove: X("staff fav move") } },
  ] });
  const ti = await ctx(b, "10.0.5.4"); await login(ti, "#/staff", "Test Instructor", se.r.temp, "4213"); await ti.fill("#ow1", "Instr-Own-Pass1"); await ti.fill("#ow2", "Instr-Own-Pass1"); await ti.click("form[data-form=ownPw] button"); await ti.waitForTimeout(700);
  await own.addInitScript(() => { window.__x = []; }); await ti.addInitScript(() => { window.__x = []; }); await tc.addInitScript(() => { window.__x = []; });
  return { own, fam, tc, ti, fr };
}
(async () => { const b = await chromium.launch(); const { own, fam, tc, ti, fr } = await setup(b);
 console.log("family writes rejected:", JSON.stringify((fr.r || {}).rejected || fr.msg));
 const hits = {}; const visit = async (p, who, routes) => { for (const rt of routes) { try { await p.goto(B + rt); await p.waitForTimeout(700); const x = await p.evaluate(() => window.__x || []); for (const i of x) (hits[F[i]] = hits[F[i]] || new Set()).add(who + " " + rt); await p.evaluate(() => { window.__x = []; }); } catch (e) { console.log("visit error", rt, e.message.slice(0, 80)); } } };
 const A = "approvals billing calendar chat chats community docs families incident insights inventory launch leads money news overview payroll requests schedule settings staff website webtools".split(" ").map(r => "#/admin/" + r);
 const S = "chat desk inbox incident kit tips today".split(" ").map(r => "#/staff/" + r);
 const FM = "account billing events growth home kid messages quest survey trivia".split(" ").map(r => "#/family/" + r);
 await visit(own, "owner", A); await visit(ti, "instructor", S); await visit(tc, "coach", S); await visit(fam, "family", FM);
 const pub = await ctx(b, "10.0.5.9"); await pub.addInitScript(() => { window.__x = []; }); await visit(pub, "public", ["#/", "#/tv", "#/kiosk", "#/shop", "#/gift"]);
 const found = Object.entries(hits);
 ok(!found.length, "No booby-trapped text runs code on any screen (" + F.length + " fields × " + (A.length + 2 * S.length + FM.length + 5) + " screens)", found.map(([f, s]) => f + " @ " + [...s].slice(0, 3).join(", ")).join(" | "));
 console.log("page errors:", [own, ti, tc, fam, pub].map(p => p.errs.length));
 require("fs").writeFileSync("r4.json", JSON.stringify({ R, hits: found.map(([f, s]) => [f, [...s]]) })); await b.close(); })();
