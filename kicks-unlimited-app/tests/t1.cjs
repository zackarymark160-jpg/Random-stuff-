const { chromium, ok, B, ctx, login, text, api, R } = require("./lib.cjs");
(async () => { const b = await chromium.launch(); const p = await ctx(b, "10.0.0.1");
 // bundle
 for (const f of ["app.js", "portal.js"]) { const s = await (await fetch(B + f)).text(); const bad = ["kicks2026", "1525", "3412", "4253", "5341", "2135", "Starter-Test-2026", "3152", "7103"].filter(x => s.includes(x)); ok(!bad.length, `${f} contains no passwords or codes`, bad.join(",")); }
 const O = "Seth Degnan";
 let r = await login(p, "#/admin", O, "kicks2026", "3152"); ok(r.status === 401, "Old starter password refused", r.body.error);
 r = await login(p, "#/admin", O, "Starter-Test-2026", "1525"); ok(r.status === 401, "Old admin rank code refused", r.body.error);
 r = await login(p, "#/admin", O, "Starter-Test-2026", "3152"); ok(r.status === 200 && r.body.pwDefault, "Starter + new code logs in, flagged must-change");
 await p.waitForTimeout(800); ok(/Pick your own password/.test(await text(p)), "\"Pick your own password\" popup appears");
 await p.screenshot({ path: "owner-force.png" });
 let a = await api(p, "sync", { changes: [{ c: "news", op: "put", id: "nX", v: { id: "nX", title: "x" } }] }); ok(!a.ok && /Pick your own password first/.test(a.msg), "Nothing saves before choosing a password", a.msg);
 // try reusing starter in popup
 await p.fill("#ow1", "Starter-Test-2026"); await p.fill("#ow2", "Starter-Test-2026"); await p.click("form[data-form=ownPw] button"); await p.waitForTimeout(800);
 ok(/isn't the starter or temporary/.test(await text(p)), "Popup refuses keeping the starter password");
 await p.fill("#ow1", "Owner-Real-Pass1"); await p.fill("#ow2", "Owner-Real-Pass1"); await p.click("form[data-form=ownPw] button"); await p.waitForTimeout(900);
 a = await api(p, "sync", { changes: [] }); ok(a.ok, "After choosing, same session can save", a.msg || "");
 const p2 = await ctx(b, "10.0.0.2"); r = await login(p2, "#/admin", O, "Owner-Real-Pass1", "3152"); ok(r.status === 200 && !r.body.pwDefault, "Owner logs in with own password, no popup");
 await p2.waitForTimeout(500); ok(!/Pick your own password/.test(await text(p2)), "No popup on normal login");
 await p2.screenshot({ path: "owner-in.png" });
 r = await login(await ctx(b, "10.0.0.3"), "#/admin", O, "Starter-Test-2026", "3152"); ok(r.status === 401, "Starter no longer works for owner after change");
 console.log("pageerrors:", p.errs, p2.errs); require("fs").writeFileSync("r1.json", JSON.stringify(R)); await b.close(); })();
