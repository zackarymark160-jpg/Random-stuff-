# Kicks app: security and code review (Nov 2026)

What was found, what was fixed and what the owner still has to do. Full test run (Nov 14): the real site and backend ran locally and were driven through a real browser. **57 of 57 checks pass**: 46 browser tests plus 11 owner-recovery and setup checks. Busy-moment test with 4 backend copies sharing one data file, as on Netlify: the original kept only 17–25 of 40 check-ins, and lost 2 of 5 card payments. The fixed version kept 40 of 40 and every payment, 5 runs out of 5.

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
| 11 | High | Six wrong passwords locked a name for 10 minutes from anywhere. A stranger could keep the owner locked out by typing bad guesses. | The 6-try lockout now applies to one name on one device. The name is locked everywhere only after 40 wrong tries. |
| 12 | Medium | The only owner, with no verified email, couldn't recover a forgotten password: the reset request went to… themselves. | Owner recovery through the `KICKS_RESET_ACCOUNT` setting in Netlify (SETUP.md). If setup is missing, the login screen says which setting to add. |
| 13 | Medium | Reset codes stayed readable in the outbox forever. | Codes are blanked once they're sent, used or expired. |
| 14 | High | The staff guide text in `app.js` still printed the instructor, coach and L.I.T. rank codes ("rank code 3412" and so on). Found during the full test run. | That text now says to get the code from an owner. Automated test: the public files contain no old or new codes. |
| 15 | High | If the data ever failed to load (for example a storage glitch), the backend treated the site as brand new and wrote the starter data over the whole studio. | Starting data is now written only when nothing is stored at all. A failed read retries and never overwrites. |
| 16 | Low | After 5 wrong reset-code guesses, the person had to wait 10 minutes before a fresh code would work. | Asking for a new code gives it a fresh 5 guesses. Requesting codes is still limited to 6 per 10 minutes. |
| 9 | Low | Calling `sync` while logged out crashed with a 500 error. | Returns a clean "please log in" (401). |
| 10 | Low | Unlimited family sign-ups from a single IP. | Same lockout as the other public forms. |

## Not changed (worth knowing)
- **The `src/` folder and `build.mjs` are missing.** HANDOFF.md says to edit `src/` and run `node build.mjs`, but this zip only contains the built, minified files. The two front-end files were patched directly. Find the original source, apply the same changes there, or the next build will undo them.
- **`/api/beat`** (the kiosk heartbeat) needs no login, so anyone could fake "kiosk online". Low risk.
- **Unsubscribe links**: without `SESSION_SECRET`, they're signed with a fixed fallback key, so someone could unsubscribe other people. Setting the variable fixes it.
- **The whole studio lives in one data file** that is loaded and saved on every request. That's fine at studio size, but it gets slower as data grows. The 60-day archive helps.
- **Owners can see password-reset codes in the outbox.** That's on purpose (the front desk passes codes on when email isn't set up). Owner accounts are the keys to everything.
- **A save collision re-runs the whole request.** On rare collisions, an email or text queued during the first attempt could go out twice. That's a small price for not losing payments.
