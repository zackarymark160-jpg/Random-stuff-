// unit checks for the change-file design
const APP = process.argv[2]; process.env.KF_LOCAL = process.argv[3];
const st = await import(APP + "/netlify/lib/state.mts"); const { kv } = await import(APP + "/netlify/lib/store.mts");
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) process.exitCode = 1; };
// 1) two copies load the same data, change different things, both save -> both kept
let A = await st.loadState(), B = await st.loadState();
A.news.push({ id: "nA", title: "A" }); A.checks["d:2026-11-14"] = { ...(A.checks["d:2026-11-14"] || {}), a: true };
B.news.unshift({ id: "nB", title: "B" }); B.checks["d:2026-11-14"] = { ...(B.checks["d:2026-11-14"] || {}), b: true }; B.invoices.push({ id: "i1", status: "paid" });
await st.saveState(A); await st.saveState(B);
let C = await st.loadState();
ok(C.news.some(n => n.id === "nA") && C.news[0].id === "nB" && C.checks["d:2026-11-14"].a && C.checks["d:2026-11-14"].b && C.invoices[0].status === "paid", "two simultaneous saves of different things both kept (news order kept too)");
// 2) same record: last save wins, record not duplicated
A = await st.loadState(); B = await st.loadState(); A.invoices[0].status = "void"; B.invoices[0].note = "x"; await st.saveState(A); await st.saveState(B);
C = await st.loadState(); ok(C.invoices.length === 1 && C.invoices[0].note === "x", "same record changed twice: one copy, last save wins");
// 3) delete
A = await st.loadState(); A.news = A.news.filter(n => n.id !== "nA"); await st.saveState(A); C = await st.loadState(); ok(!C.news.some(n => n.id === "nA"), "deleting a record sticks");
// 4) compaction keeps everything and removes change files
const db = await kv(); const before = JSON.stringify((await st.loadState())); const nJ = (await db.list("j/")).length;
const realNow = Date.now; Date.now = () => realNow() + 60000; const folded = await st.compact(); Date.now = realNow;
const after = await st.loadState(); delete after.jUpto; const b2 = JSON.parse(before); delete b2.jUpto;
ok(folded === nJ && (await db.list("j/")).length === 0 && JSON.stringify(after) === JSON.stringify(b2), `compaction folded ${folded} change files, data identical afterwards`);
// 5) a new section's first entries from two saves at once
A = await st.loadState(); B = await st.loadState(); A.brandNew = [{ id: "x1" }]; B.brandNew = [{ id: "x2" }]; await st.saveState(A); await st.saveState(B);
C = await st.loadState(); ok((C.brandNew || []).length === 2, "brand-new section: both first entries kept");
// 6) reset replaces everything, older change files ignored
A = await st.loadState(); A.news.push({ id: "old" }); await st.saveState(A); const R = await st.resetState(); C = await st.loadState(); ok(!C.news.some(n => n.id === "old"), "studio reset isn't undone by older change files");
