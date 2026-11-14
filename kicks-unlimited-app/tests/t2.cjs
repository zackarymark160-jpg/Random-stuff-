const { chromium, ok, B, ctx, login, text, api, R } = require("./lib.cjs");
const fs = require("fs");
(async () => { const b = await chromium.launch();
 const own = await ctx(b, "10.0.1.1"); let r = await login(own, "#/admin", "Seth Degnan", "Owner-Real-Pass1", "3152"); ok(r.status === 200, "Owner logged in for staff tests");
 // add Test Coach via the real Add staff form
 await own.evaluate(() => ACT.newStaff()); await own.waitForSelector("#nsn"); await own.fill("#nsn", "Test Coach"); await own.selectOption("#nsr", "coach");
 const resp = own.waitForResponse(x => x.url().includes("admin/new-staff")); await own.locator("#nsn").evaluate(el => el.form.requestSubmit()); const nr = await (await resp).json();
 await own.waitForTimeout(700); const t = await text(own);
 ok(/One-time password/.test(t) && nr.temp && t.includes(nr.temp), "Adding staff shows a one-time password popup", nr.temp);
 await own.screenshot({ path: "onetime.png" });
 await own.evaluate(() => typeof closeModal === "function" && closeModal());
 // Test Coach first login
 const tc = await ctx(b, "10.0.1.2"); r = await login(tc, "#/staff", "Test Coach", nr.temp, "2534"); ok(r.status === 200 && r.body.pwDefault, "One-time password logs in and forces a new one");
 await tc.fill("#ow1", "Coach-Own-Pass1"); await tc.fill("#ow2", "Coach-Own-Pass1"); await tc.click("form[data-form=ownPw] button"); await tc.waitForTimeout(800);
 r = await login(await ctx(b, "10.0.1.3"), "#/staff", "Test Coach", nr.temp, "2534"); ok(r.status === 401, "One-time password stops working after first use");
 // owner resets Test Coach via the real reset button handler
 const st = await api(own, "state"); const coachId = st.r.view.staff.find(m => m.name === "Test Coach").id;
 const rr = own.waitForResponse(x => x.url().includes("admin/reset-staff")); await own.evaluate(id => ACT.staffPin({ dataset: { id } }), coachId); const rj = await (await rr).json(); await own.waitForTimeout(600);
 ok(rj.temp && rj.temp !== nr.temp && (await text(own)).includes(rj.temp), "Owner reset shows a fresh one-time password", rj.temp);
 await own.evaluate(() => typeof closeModal === "function" && closeModal());
 r = await login(await ctx(b, "10.0.1.4"), "#/staff", "Test Coach", "Coach-Own-Pass1", "2534"); ok(r.status === 401, "Old password dead after owner reset");
 const tc2 = await ctx(b, "10.0.1.5"); r = await login(tc2, "#/staff", "Test Coach", rj.temp, "2534"); ok(r.status === 200 && r.body.pwDefault, "New one-time password works");
 await tc2.fill("#ow1", "Coach-Own-Pass2"); await tc2.fill("#ow2", "Coach-Own-Pass2"); await tc2.click("form[data-form=ownPw] button"); await tc2.waitForTimeout(800);
 // sub finder: add an instructor, coach posts a sub request, instructor sees it
 const ir = await api(own, "admin/new-staff", { name: "Test Instructor", role: "ema" });
 const ti = await ctx(b, "10.0.1.6"); r = await login(ti, "#/staff", "Test Instructor", ir.r.temp, "4213"); await ti.fill("#ow1", "Instr-Own-Pass1"); await ti.fill("#ow2", "Instr-Own-Pass1"); await ti.click("form[data-form=ownPw] button"); await ti.waitForTimeout(800);
 const me = (await api(tc2, "state")).r.me.id; const d = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10);
 let a = await api(tc2, "sync", { changes: [{ c: "subs", op: "put", id: "subT1", v: { id: "subT1", shiftId: "x", date: d, by: me, note: "test", status: "open" } }] }); ok(a.ok && !(a.r.rejected || []).length, "Coach posts a sub request");
 const iv = (await api(ti, "state")).r.view; ok(iv.subs.some(s => s.id === "subT1"), "Instructor can see the sub request (was hidden before)");
 a = await api(ti, "sync", { changes: [{ c: "subs", op: "patch", id: "subT1", set: { status: "claimed", cover: iv.staff.find(m => m.name === "Test Instructor").id } }] });
 const ov = (await api(own, "state")).r.view; ok(ov.subs.find(s => s.id === "subT1").status === "claimed", "Instructor covers it, owner sees it covered");
 // lockouts
 const bad = await ctx(b, "10.6.6.6"); let last; for (let i = 0; i < 7; i++) last = await login(bad, "#/staff", "Test Coach", "wrong-pass-" + i, "2534");
 ok(last.status === 429, "7 wrong tries from one device: locked", last.body.error);
 r = await login(await ctx(b, "10.0.1.7"), "#/staff", "Test Coach", "Coach-Own-Pass2", "2534"); ok(r.status === 200, "Same person on a different device still gets in");
 // staff with no email -> owners get the request
 const fp = await ctx(b, "10.0.1.8"); await fp.goto(B + "#/staff"); await fp.waitForSelector("#sn");
 a = await api(fp, "forgot", { kind: "staff", who: "Test Coach" }); ok(a.ok && /reset request to the owners/.test(a.r.msg || ""), "Staff with no email: reset request goes to owners");
 ok((await api(own, "state")).r.view.resetReqs.some(x => x.staff === coachId), "Owner sees the reset request");
 // Coach can't open studio admin / see owner things
 r = await login(await ctx(b, "10.0.1.9"), "#/admin", "Test Coach", "Coach-Own-Pass2", "2534"); ok(r.status === 403, "Coach can't log into studio admin", r.body.error);
 const cv = (await api(tc2, "state")).r.view; ok(!JSON.stringify(cv.staff).includes("s1$") && !Object.values(cv.rankCodes || {}).some(Boolean) && !(cv.newsSubs || []).length && !(cv.outbox || []).length, "Coach view has no passwords, codes, subscriber list or outbox");
 console.log("pageerrors", own.errs, tc.errs, tc2.errs); fs.writeFileSync("r2.json", JSON.stringify(R)); await b.close(); })();
