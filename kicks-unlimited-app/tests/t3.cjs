const { chromium, ok, B, ctx, login, text, api, R } = require("./lib.cjs");
const fs = require("fs"), crypto = require("crypto");
const H = p => crypto.createHash("sha256").update("kicks-sp:" + p).digest("hex");
const raw = async (path, body, tok, ip = "10.9.9.9", extraH = {}) => { const r = await fetch(B + "api/" + path, { method: "POST", headers: { "content-type": "application/json", "x-test-ip": ip, ...(tok ? { authorization: "Bearer " + tok } : {}), ...extraH }, body: typeof body === "string" ? body : JSON.stringify(body) }); return { s: r.status, j: await r.json().catch(() => ({})) }; };
async function famLogin(p, email, pw) { await p.goto(B + "#/family"); await p.waitForSelector("#fe"); await p.fill("#fe", email); await p.fill("#fp", pw); const w = p.waitForResponse(x => x.url().includes("/api/login")); await p.press("#fp", "Enter"); const r = await w; await p.waitForTimeout(900); return { status: r.status(), body: await r.json() }; }
(async () => { const b = await chromium.launch();
 const own = await ctx(b, "10.0.2.1"); await login(own, "#/admin", "Seth Degnan", "Owner-Real-Pass1", "3152");
 const outboxCode = async (to) => { const v = (await api(own, "state")).r.view; const m = v.outbox.find(o => o.to === to && /reset code/.test(o.subject) && /\d{6}/.test(o.body)); return m && m.body.match(/\d{6}/)[0]; };
 // family signup
 const fam = await ctx(b, "10.0.2.2"); await fam.goto(B + "#/family"); await fam.waitForSelector("#fe");
 const su = await fam.evaluate(async () => { try { return await apiCall("signup", { parent: "Pat Tester", email: "pat.tester@example.com", phone: "6085550100", pw: await hash("Family-Pass-1"), kids: [{ name: "Riley Tester", prog: "kids" }], sig: "Pat Tester", lang: "en" }); } catch (e) { return { err: e.message }; } });
 ok(su.token, "Family signs up", su.err || "");
 const fid = su.me.id;
 await api(own, "sync", { changes: [{ c: "families", op: "patch", id: fid, set: { status: "approved" } }] });
 let r = await famLogin(fam, "pat.tester@example.com", "Family-Pass-1"); ok(r.status === 200, "Family logs in through the family login screen");
 await fam.screenshot({ path: "family-home.png" });
 // messages both ways
 let a = await api(fam, "sync", { changes: [{ c: "messages", op: "put", id: "mT1", v: { id: "mT1", familyId: fid, from: "family", by: "Pat Tester", text: "Is class on tonight?", ts: Date.now(), read: false } }] });
 let ov = (await api(own, "state")).r.view; ok(ov.messages.some(m => m.id === "mT1" && m.text === "Is class on tonight?"), "Family message reaches the studio");
 await api(own, "sync", { changes: [{ c: "messages", op: "put", id: "mT2", v: { id: "mT2", familyId: fid, from: "studio", text: "Yes, see you at 5!", ts: Date.now(), read: false } }] });
 ok((await api(fam, "state")).r.view.messages.some(m => m.id === "mT2"), "Studio reply reaches the family");
 // family reset code (email not connected -> owner outbox)
 const anon = await ctx(b, "10.0.2.3"); await anon.goto(B + "#/family"); await anon.waitForSelector("#fe");
 a = await api(anon, "forgot", { kind: "family", who: "pat.tester@example.com" }); let code = await outboxCode("pat.tester@example.com");
 ok(a.ok && code, "Forgot password: code waits in the owner's outbox", code ? "code ******" : JSON.stringify(a));
 a = await anon.evaluate(async c => { try { return await apiCall("reset", { kind: "family", who: "pat.tester@example.com", code: c, pw: await hash("Family-Pass-2") }); } catch (e) { return { err: e.message }; } }, code);
 ok(a.ok, "Right code resets the password", a.err || "");
 ov = (await api(own, "state")).r.view; ok(!ov.outbox.some(o => o.body.includes(code)) && ov.outbox.some(o => o.body.includes("••••••")), "Used code is blanked in the outbox");
 r = await famLogin(await ctx(b, "10.0.2.4"), "pat.tester@example.com", "Family-Pass-2"); ok(r.status === 200, "New password works");
 // burn test
 await api(anon, "forgot", { kind: "family", who: "pat.tester@example.com" }); code = await outboxCode("pat.tester@example.com");
 for (let i = 0; i < 5; i++) await anon.evaluate(async () => { try { await apiCall("reset", { kind: "family", who: "pat.tester@example.com", code: "000000", pw: await hash("Hacked-Pass-1") }); } catch (e) {} });
 a = await anon.evaluate(async c => { try { return await apiCall("reset", { kind: "family", who: "pat.tester@example.com", code: c, pw: await hash("Hacked-Pass-1") }); } catch (e) { return { err: e.message }; } }, code);
 ok(a.err && /isn't right|expired|Too many/.test(a.err), "After 5 wrong guesses the real code no longer works", a.err);
 a = await api(anon, "forgot", { kind: "family", who: "pat.tester@example.com" }); code = await outboxCode("pat.tester@example.com");
 a = await anon.evaluate(async c => { try { return await apiCall("reset", { kind: "family", who: "pat.tester@example.com", code: c, pw: await hash("Family-Pass-3") }); } catch (e) { return { err: e.message }; } }, code);
 ok(a.ok, "Asking for a fresh code works right away", a.err || "");
 // view-only guardian
 const famRec = (await api(fam, "state")).r.view.families[0];
 a = await api(fam, "sync", { changes: [{ c: "families", op: "patch", id: fid, set: { guardians: [{ name: "Grandma Tester", email: "grandma.tester@example.com", view: true }] } }] });
 await api(anon, "forgot", { kind: "family", who: "grandma.tester@example.com" }); code = await outboxCode("grandma.tester@example.com");
 await anon.evaluate(async c => { try { await apiCall("reset", { kind: "family", who: "grandma.tester@example.com", code: c, pw: await hash("Grandma-Pass-1") }); } catch (e) {} }, code);
 const gm = await ctx(b, "10.0.2.5"); r = await famLogin(gm, "grandma.tester@example.com", "Grandma-Pass-1"); ok(r.status === 200, "View-only grandparent logs in");
 const gv = (await api(gm, "state")).r.view; ok(gv.students.some(s => s.name === "Riley Tester"), "Grandparent can see the family's student");
 const blocked = []; for (const [path, body] of [["pay", { invoiceIds: ["x"] }], ["redeem", { code: "X" }], ["autopay-off", {}], ["media", { data: "data:image/png;base64,AAAA" }], ["sync", { changes: [{ c: "messages", op: "put", id: "g1", v: { id: "g1", familyId: fid, from: "family", text: "hi" } }] }]]) { const x = await api(gm, path, body); if (x.ok || !/view-only/i.test(x.msg)) blocked.push(path + ":" + (x.msg || "allowed")); }
 ok(!blocked.length, "Grandparent can't pay, use codes, change autopay, upload or post", blocked.join(" | "));
 // newsletter
 await raw("sub", { email: "fan.tester@example.com", lang: "en" });
 ov = (await api(own, "state")).r.view; ok(ov.newsSubs.some(x => x.email === "fan.tester@example.com") && !ov.subs.some(x => x.email), "Newsletter sign-up lands in its own list");
 // payments: bill + online pay without Stripe + signed Stripe webhook during a busy moment
 await api(own, "sync", { changes: [{ c: "invoices", op: "put", id: "invT1", v: { id: "invT1", num: 5001, familyId: fid, desc: "Test bill", amount: 2500, due: "2026-11-14", status: "open" } }] });
 a = await api(fam, "pay", { invoiceIds: ["invT1"] }); ok(!a.ok && /aren't set up/.test(a.msg), "Pay button without Stripe gives a clear message", a.msg);
 // busy moment: 30 owner saves at once + the Stripe webhook
 const tok = (await raw("login", { kind: "admin", name: "Seth Degnan", pw: H("Owner-Real-Pass1"), code: "3152" }, "", "10.0.2.9")).j.token;
 const ev = JSON.stringify({ type: "checkout.session.completed", data: { object: { id: "cs_test_1", mode: "payment", payment_status: "paid", amount_total: 2500, metadata: { invoices: "invT1", family: fid } } } });
 const t = Math.floor(Date.now() / 1000), sig = crypto.createHmac("sha256", "whsec_localtest").update(`${t}.${ev}`).digest("hex");
 const jobs = []; for (let i = 0; i < 30; i++) jobs.push(raw("sync", { changes: [{ c: "checks", op: "put", id: "busy-test", sub: "k" + i, v: true }] }, tok, "10.0.2.9"));
 jobs.splice(15, 0, raw("stripe-webhook", ev, "", "10.0.2.9", { "stripe-signature": `t=${t},v1=${sig}` }));
 const res = await Promise.all(jobs); const fails = res.filter(x => x.s !== 200).map(x => x.s + " " + (x.j.error || ""));
 const S = (await raw("state", {}, tok, "10.0.2.9")).j.view; const saved = Object.keys((S.checks || {})["busy-test"] || {}).length; const inv = S.invoices.find(i => i.id === "invT1");
 ok(!fails.length && saved === 30 && inv.status === "paid", `31 saves at the same moment: nothing lost`, `${saved}/30 check-ins saved, bill ${inv.status}${fails.length ? ", errors: " + fails.join(";") : ""}`);
 r = await raw("stripe-webhook", ev, "", "10.0.2.9", { "stripe-signature": `t=${t},v1=${"0".repeat(64)}` }); ok(r.s === 400, "Fake Stripe message with a bad signature is refused");
 ok((await api(fam, "state")).r.view.invoices.find(i => i.id === "invT1").status === "paid", "Family sees the bill as paid");
 console.log("pageerrors", own.errs, fam.errs, gm.errs); fs.writeFileSync("r3.json", JSON.stringify(R)); await b.close(); })();
