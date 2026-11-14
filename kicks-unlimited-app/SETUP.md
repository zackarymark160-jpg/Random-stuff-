# Kicks Unlimited app — setup

## What's in here
- `public/` — the app (website, family portal, staff hub, studio admin) plus the phone-app files (icons, manifest, offline support)
- `netlify/functions/api.mts` — the shared backend: logins, the studio's data, emails and texts
- `netlify/functions/reminders.mts` — runs every morning: monthly tuition invoices (if autopilot is on), payment-due and event reminders, sends anything waiting in the outbox, and moves chat, sent emails and check-ins older than 60 days into the archive (Settings → Backup → Download archive)
- `netlify/functions/class-reminders.mts` — runs every 5 minutes: phone pings to families who turned on class reminders, about 10 minutes before their kids' classes (needs the phone-notification keys below)
- `netlify/lib/seed.mts` — starting data (staff roster, weekly shifts, October events, checklists). No families or students.

## Deploy (the backend needs one of these — drag-and-drop only uploads the website part)
**Option A — Netlify CLI (easiest from a computer)**
1. Install Node.js, then open a terminal in this folder.
2. `npm install`
3. `npx netlify-cli login`
4. `npx netlify-cli deploy --prod` (pick "Create & configure a new project" the first time)

**Option B — GitHub**
1. Put this folder in a GitHub repo.
2. In Netlify: Add new project → Import an existing project → pick the repo. Netlify reads `netlify.toml` and builds everything.

Data is saved in Netlify Blobs automatically — no database to set up.

## First login (do this before the first deploy)
In Netlify → Project configuration → Environment variables, add:
- `KICKS_RANK_CODES` = `admin=####,ema=####,coach=####,lit=####,desk=####` — pick five new codes, **4 digits each using only the numbers 1–5** (the login screen rejects anything else), e.g. `admin=3152`. **Don't reuse the old ones**; they were visible in the public app files.
- `KICKS_STARTER_PW` = a new private starter password (8+ characters, not `kicks2026`). Tell staff in person. Only needed until everyone has picked their own; you can delete it after.
- `SESSION_SECRET` = any long random text (signs newsletter unsubscribe links).

If either one is missing, the login screen says exactly which one to add.

**Owner locked out?** If there's another owner, use Forgot password (or they reset you). If you're the only owner, set `KICKS_RESET_ACCOUNT` = your full name in Netlify, redeploy, log in with the starter password, pick a new one, then delete `KICKS_RESET_ACCOUNT`.

**Reset codes:** families and staff with a verified email get a 6-digit code by email. Until email is connected, the code waits in Studio admin → Email & text outbox for an owner to pass on. It's blanked there once it's used or expires. Staff without a verified email ask an owner, who gives them a one-time password.

Staff log in with first + last name, the starter password and their rank code. The app then makes them pick their own password before anything else works. New staff and password resets show the owner a one-time password to pass on.

## Turn on automatic email (optional but recommended)
In Netlify → Project configuration → Environment variables, add ONE of these:
- **Gmail / Google Workspace:** `SMTP_USER` = the studio email, `SMTP_PASS` = an App Password (Google Account → Security → App passwords)
- **Resend:** `RESEND_API_KEY`
Optional: `MAIL_FROM` like `Kicks Unlimited <info@KicksSP.com>`

## Turn on automatic texts (optional)
Add `TWILIO_SID`, `TWILIO_TOKEN`, `TWILIO_FROM` (your Twilio number).

Until email/texts are connected, everything waits in **Studio admin → Email & text outbox** with a Send button that opens the studio's own email or texting app. Family password-reset codes also wait there, so the front desk can pass them on.

## Turn on phone notifications (optional)
Staff can get a ping for team chat, @mentions, sub requests, shift trades and tips; owners also get incident reports and time-off requests.
1. On your computer, run `npx web-push generate-vapid-keys` (needs Node). It prints a public key and a private key.
2. In Netlify → Site configuration → Environment variables, add `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` = `mailto:info@kickssp.com`. Redeploy.
3. Each staff member opens **My profile → Phone notifications → Turn on**. On iPhone they must first tap Share → **Add to Home Screen** and open Kicks from there.

## Backups
On the live site the server saves a full copy of everything every night and keeps 30 days (Settings → Backups → See backups to download one). You can also use Studio admin → **Settings → Backup**, which downloads spreadsheets (students, families, attendance, invoices, hours, promotions, incidents, inventory) and a full backup file. Do one at the start of each month.

## Check-in kiosk
On a tablet at the front door, log in as an owner, EMA instructor or coach → Today → **Start check-in kiosk** and set a 4-digit exit code. Students type their first name, tap their picture, then pick the class they're here for. Staff add each kid's picture from a saved photo (student card → Kiosk picture).

**Scan-in cards and keytags:** Studio admin → Classes → Check-in cards gives every student a card number and prints cards with a QR code and a barcode. At the kiosk, kids tap **Scan my card** and hold the card up to the tablet camera. The camera only reads codes and never looks for faces; nothing is recorded or saved. For keytags, plug a USB keytag/barcode reader into the tablet, scan each fob into the student's Keytag box once, and after that a tap checks them in. If the tablet goes offline during class hours for 20+ minutes, owners get a phone notification (needs phone notifications turned on).

## Website QR code
Studio admin → Settings → Website QR code makes a printable QR that opens the website. It's the only QR code in the app.

## Spanish
Every screen has an EN/ES switch. Families pick their language in Account, and their emails and texts go out in it. Things you type (news, events, FAQ, programs) have a Spanish box next to the English one — leave it empty and the English shows.

## Website content (Studio admin → Website)
- **Social & reviews:** paste the studio's real Facebook, Instagram and Google review links.
- **Team:** pick who shows on the site (L.I.T.s start hidden), add short bios and photos.
- **FAQ:** edit, reorder or add questions.
- **Gallery:** upload photos — only of kids whose families gave photo consent.
- **Parent reviews:** copy real reviews from Google/Facebook exactly as written.
- **Program pages:** extra details per program, plus the schools After School picks up from.
- **Studio map:** lay out the inside of the studio, level by level.

## Card payments (Stripe)
1. Make a Stripe account at stripe.com and finish the business setup (bank account for payouts).
2. Stripe dashboard → Developers → API keys → copy the **Secret key** (`sk_live_…`).
3. Developers → Webhooks → **Add endpoint**: URL `https://YOUR-SITE/api/stripe-webhook`, event `checkout.session.completed` (this one event covers both card payments and families saving a card for autopay). Copy its **Signing secret** (`whsec_…`).
4. Netlify → Site configuration → Environment variables: add `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`, then redeploy.
5. Studio admin → Settings → Payments should say **Stripe: on**. Families now see **Pay with card** on each bill; it's marked paid automatically and they get a receipt in their language.

No Stripe yet? Paste any payment link (Square, PayPal) in Settings → Payments and families get a "Pay online" button instead. Use test keys (`sk_test_…`) first if you want to try it.

## Works without wifi
Once someone has opened the app, it opens instantly next time and keeps working if the wifi drops — changes wait on that device and save the moment it's back online (the pill at the top says Saved / Saving / Offline). Kid pictures are cached too, so the kiosk keeps working.

## Turn things on and off
Studio admin → Settings → **Features**: hide anything the studio isn't using (shop, lost & found, Parent's Night Out, camp crew, leaderboard and so on). Hidden features disappear for families and staff; nothing is deleted.

## Kicks Code, guest waivers, Parent's Night Out
- **Kicks Code:** Settings → Kicks Code. Type the studio's real code in English (and Spanish if you have it). It shows on the website and in Learn.
- **Guest waivers:** kids who aren't students (party guests, Parent's Night Out, camp, trials) sign at `/#/waiver`. Studio admin → Leads → Guest waivers lists them.
- **Parent's Night Out:** News & events → add an event, type "Parent's Night Out", set the fee per child and the number of spots. Families sign up and get billed; guests sign the waiver and pay at drop-off.

## Test it on your computer
`node test/serve.mts` then open http://localhost:8888 (Node 22+).

## Newer owner tools (Studio admin)
- **Family requests:** private lessons, membership pauses, uniform/belt size orders and questions for instructors all land here. Approving a pause stops tuition bills for those weeks.
- **Website chats:** messages from the chat bubble on the website. Replies go out by email or text.
- **Money dashboard, Codes & gift cards, Expenses, Equipment, Surveys, Videos & trivia** — each has its own page. Gift cards are sold at the front desk; families type the code in Billing.
- **Settings → Automatic emails & texts:** birthday emails, "we miss you" after 60 days, waitlist move-ups and class reminders. Each can be turned off.
- **Settings → Membership agreement:** paste the real agreement and families sign it in their portal.
- **Settings → Features:** every new family feature (lessons, videos, album, trivia, ratings, chat bubble, holiday themes, countdown, instructor vote) can be turned off.
- **Lobby TV:** on a TV or tablet, log in as staff → Work → Lobby TV.

## Round 3 setup checklist
Most of the new features work as soon as you deploy. These need a one-time step from you:

| Feature | What to do |
|---|---|
| **AI helpers** (parent help box, class-plan drafts, Translate on messages) | Make an API key at console.anthropic.com → Netlify environment variable `ANTHROPIC_API_KEY` → redeploy. They stay hidden until then. Optional: `ANTHROPIC_MODEL` to pick a different model. |
| **Autopay** | Needs Stripe set up (above). Families turn it on in Billing. Failed charges retry twice, 3 days apart, and the family gets an email/text each time. |
| **Two-way texting** | Needs Twilio (above). In the Twilio console → Phone numbers → your number → "A message comes in" → Webhook `https://YOUR-SITE/api/sms-in` (HTTP POST). Texts from a family's phone number land in their Messages thread. |
| **Hmong** | The main buttons, menus and the kiosk are in Hmong (tap the language button twice). A native speaker should read it over before you tell families. Emails and texts still go out in English or Spanish. |
| **Privacy policy & terms** | Starter drafts are in Website → Privacy policy & terms. Have a lawyer read them, edit, then tick **Reviewed — publish**. They don't appear on the website until then. |
| **Membership plans** | Add your real prices in Money → Plans. They show on the website's **Enroll online** page and in Billing → Tuition. |
| **Google review link** | Settings → Reviews & follow-ups. Paste your Google review link, then turn on review requests. |
| **Late fees, review asks, First Look follow-ups, promo pop-up** | All start OFF. Turn each on in Settings when you're ready. |
| **Front desk role** | Staff & codes → change someone's role to Front desk. Rank code 2135 (change it in Settings → Passwords). |
| **Per-person passwords** | Always on now: anyone on the starter or a one-time password must pick their own right after logging in. |
| **Studio email** | resend.com is easiest: verify kickssp.com, then add `RESEND_API_KEY` and `MAIL_FROM`. |
| **App stores** | Optional. pwabuilder.com → enter the site address → Package for stores. Google Play is $25 once; Apple needs a $99/year developer account and a Mac. Families can already "Add to Home Screen" without this. |
| **Google hours** | Google doesn't let small apps change your hours. The Overview reminds you a week before each closure; update Special hours at business.google.com. |

Short links: `kickssp.com/es` opens the site in Spanish and `kickssp.com/hmn` in Hmong.

## Round 4 setup notes
| Feature | What to do |
|---|---|
| **Google reviews on the website** | Google Cloud → enable *Places API (New)* → make an API key. Find your Place ID with Google's Place ID Finder. Add `GOOGLE_PLACES_KEY` and `GOOGLE_PLACE_ID` in Netlify → redeploy. Shows real 4–5 star reviews, refreshed daily. Hidden until set up. |
| **Online shop & gift cards** | Need Stripe (above). Tick "Sell online" on items in Website → Tools, and "Sell gift cards online". The same Stripe webhook covers these. |
| **Tracking pixels** | Website → Tools → paste a Meta Pixel ID and/or a GA4 ID. They load only on the public site, only after a visitor taps OK on the cookie notice. |
| **Info pages** (parents' guide, safety, anti-bullying, adult classes) | Website → Tools → write each page and tick Published. Nothing shows until you do. Only write what's true for Kicks. |
| **Short links & flyer QR codes** | Website → Tools. `kickssp.com/camp` style links work once the site is on your own domain. Each flyer QR shows up in Settings → Visitor analytics. |
| **Staff clock-in at the studio only** | Team → Details → tick the box, then tap "I'm at the studio — save this spot" while standing in the studio. Off by default. |
| **Emergency steps, rank path, rubric, checklists, habits, gear lists** | Team → Details. The standard checklists and habits work until you replace them. Emergency steps are blank until you write them. |
| **Handbook signatures** | Paste the handbook in Team → Details, then tap "Ask everyone to sign". |
| **Hmong emails & texts** | Families who pick Hmong get emails/texts machine-translated (with English underneath) only when the AI key is set. Without it they get English. |
| **Recurring expenses** | Reports → Owner desk. Added to Expenses automatically each month. |

## Round 5 setup notes
| Feature | What to do |
|---|---|
| **Launch kit** | Settings → Launch kit. Guided tour, sign-off checklist (type the owners' names), launch plan, pilot mode, staff beta week, old way vs app, who-does-what, feature switchboard, rollback steps, training slides, privacy one-pager. |
| **Pilot mode** | Launch kit → tick "Only pilot families can log in", then add families. Everyone else sees a "coming soon" message after typing a correct password. Untick to open to all. |
| **First-week emails / yearly info check** | Off by default. Settings → Features → "First-week welcome emails" and "Yearly info check". |
| **Shift texts** | Each staff member ticks "Text me before my shifts" on their Me page. Needs texting set up. |
| **Owner digest** | Emailed to owners on the 1st of each month. Nothing to set. |
| **Trial reminders** | First Look families get a reminder text/email the day before. Nothing to set. |
| **Stripe payouts** | Money & growth → Load payouts. Needs Stripe. |
| **Owner-written content** | Community & fun: parent tips, moves dictionary, sparring rules, size guide, belt test practice lists, cooldown guide, safety pages, black belt stories, drives, deals, alumni, contests, spirit week, TV settings, music links. Website pages to write: party packages, camp day, school break camps, partnerships, self-defense, anti-bullying, child safety, snack policy, concussion, anniversary. **All hidden until you write them.** |
| **SEO pages** | Built automatically: `/karate-sun-prairie/`, `/kids-martial-arts-sun-prairie/`, `/after-school-program-sun-prairie/`, `/es/karate-sun-prairie/`, `/es/artes-marciales-ninos-sun-prairie/`. Uses only real program info. |
| **Carpool** | Removed everywhere. |
