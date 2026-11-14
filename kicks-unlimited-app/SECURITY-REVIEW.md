# Kicks app: security and code review (Nov 2026)

What was found, what was fixed and what the owner still has to do. The fixes were tested on a local copy of the backend: 25 checks, all passing.

## Owner to-do before the next deploy
1. In Netlify, add these environment variables: `KICKS_RANK_CODES`, `KICKS_STARTER_PW` and `SESSION_SECRET` (SETUP.md → First login explains each one).
2. Deploy. Every staff member logs in once with the new starter password and picks their own password.
3. Once everyone has their own password, delete `KICKS_STARTER_PW`.
4. If the old version is live now, treat the old password and codes as known to anyone. Change the rank codes in Studio admin → Staff & codes **today**, even before redeploying.

## Fixed

| # | Severity | Problem | Fix |
|---|---|---|---|
| 1 | Critical | The shared staff password and all five rank codes, owner included, were written into `public/app.js`. Anyone could read them with view-source. Since staff names are shown on the website, anyone could log in as the owner. | The password and codes are gone from the browser files. The old password is refused. Rank codes come from `KICKS_RANK_CODES`, and the old codes are replaced automatically. |
| 2 | Critical | The 6-digit password-reset code had no limit on wrong guesses. Someone could request a reset for the owner and try codes until one worked. | Lockout per person and per IP after 6 wrong tries. The code is also deleted after 5 wrong guesses. |
| 3 | High | Everyone shared one starter password, and choosing your own was optional ("built but off"). | Logging in with the starter password or a one-time password now gives a 30-minute session that can do nothing except set a new password. New staff and resets get a random one-time password, shown to the owner. |
| 4 | High | Two saves at the same moment could silently erase each other, because all the studio data is one file. For example, a Stripe payment could be overwritten by the kiosk check-in a second later: the family has paid but the app shows the bill as open. Autopay could then charge them again. | Each save checks the file's version tag (Netlify Blobs etag). If someone else saved in between, the request re-runs on fresh data. Autopay charges now send a Stripe idempotency key, so a re-run can't charge twice. `@netlify/blobs` upgraded to v10 for this. |
| 5 | High | Passwords were stored as the same SHA-256 value the browser sends. Anyone holding a backup file could log in as anyone without cracking anything. | Passwords are now stored as salted scrypt hashes. Old accounts are upgraded automatically at their next login. Password checks use a constant-time compare. |
| 6 | Medium | Newsletter sign-ups and shift sub requests were saved in the same list (`subs`). Newsletter emails went out to sub-request rows. To hide subscriber emails, that list was blanked for staff, which broke the sub finder for instructors and coaches. | Newsletter subscribers moved to their own list (`newsSubs`, migrated automatically). Staff can see sub requests again; only owners see subscribers. |
| 7 | Medium | View-only logins (grandparents) were blocked only from saving data. They could still start payments, buy packs, use gift cards and discount codes, turn autopay on or off and upload files. | All of those are blocked for view-only logins. |
| 8 | Low | Family messages were saved exactly as the browser sent them, so a family could add hidden fields, like `sendAt`, or extra junk data. | Only the expected fields are kept, and message text is capped at 4,000 characters. |
| 9 | Low | Calling `sync` while logged out crashed with a 500 error. | Returns a clean "please log in" (401). |
| 10 | Low | Unlimited family sign-ups from a single IP. | Same lockout as the other public forms. |

## Not changed (worth knowing)
- **The `src/` folder and `build.mjs` are missing.** HANDOFF.md says to edit `src/` and run `node build.mjs`, but this zip only contains the built, minified files. The two front-end files were patched directly. Find the original source, apply the same changes there, or the next build will undo them.
- **`/api/beat`** (the kiosk heartbeat) needs no login, so anyone could fake "kiosk online". Low risk.
- **Unsubscribe links**: without `SESSION_SECRET`, they're signed with a fixed fallback key, so someone could unsubscribe other people. Setting the variable fixes it.
- **The whole studio lives in one data file** that is loaded and saved on every request. That's fine at studio size, but it gets slower as data grows. The 60-day archive helps.
- **Owners can see password-reset codes in the outbox.** That's on purpose (the front desk passes codes on when email isn't set up). Owner accounts are the keys to everything.
- **A save collision re-runs the whole request.** On rare collisions, an email or text queued during the first attempt could go out twice. That's a small price for not losing payments.
