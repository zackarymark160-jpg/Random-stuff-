# SPASD Student Voice: TikTok kit (Nov 15–24, 2026)

Account: **@spasd.student.voi**. ⚠️ Check that this is really the handle and not a typo for `@spasd.student.voice`. The site links to it in 4 places.

All facts below come from the site (index.html). Nothing is made up. If something changes, for example the Nov 23 vote moves, update the caption before you post.

## Before the first post (5 min)
- **Bio:** `Student-run 🎤 Sun Prairie schools · Ask the district anything ↓` + link `spasdstudentvoice.netlify.app`
- **Profile pic:** the speech-bubble logo (`public/icons/icon-512.png`)
- **Pin:** post 1 (the tutorial), so new followers learn how to ask a question
- Turn on **auto captions** when you post. Two reels are music-only, so add a trending sound at about 20% volume in the TikTok editor.

## The 5 videos (ready in `tiktok/out/`)
Each one is the original Reel plus a 2.5-second end card with the **TikTok** handle (the Reels end on the Instagram handle).

| # | Post date | File | Length |
|---|---|---|---|
| 1 | Sat Nov 15 | `tiktok-reel-tutorial.mp4` | 23s |
| 2 | Mon Nov 17 | `tiktok-reel-myth.mp4` | 25s |
| 3 | Wed Nov 19 | `tiktok-reel-caregiver-survey.mp4` | 22s (add sound) |
| 4 | Fri Nov 21 | `tiktok-reel-newsletter.mp4` | 17s (add sound) |
| 5 | Sun Nov 23, before 6 PM | `tiktok-reel-launch.mp4` | 11s |

Best times for a student audience: **3:30–5 PM on weekdays**, **11 AM–1 PM on weekends**.

---

### 1 · How to ask the district anything (pin this)
**Cover text:** `ASK THE DISTRICT ANYTHING`
**Caption:**
> You can ask SPASD a real question and get a real answer, posted word for word. Takes 20 seconds. Student names never go on the site. Link in bio 🎤
> #sunprairie #spasd #studentvoice #wisconsin #highschool

**First comment (from us):** `Drop a question you want answered 👇 we'll send the good ones in`

### 2 · Weighted grades: myth or fact?
**Cover text:** `WEIGHTED GRADES: MYTH OR FACT?`
**Caption:**
> 3 myths about weighted grades. Regular classes stay on the 4.0 scale. Only AP, capstone and qualifying college-credit classes would count on 5.0, starting with fall 2027 freshmen, if the Board approves it. Possible final vote: Nov 23 🗳️
> #weightedgrades #gpa #apclasses #sunprairie #spasd

**First comment:** `What myth did you hear? We'll fact-check it`

### 3 · What 531 families said
**Cover text:** `531 FAMILIES WEIGHED IN`
**Caption:**
> 531 parents and caregivers answered the district's weighted grades survey in one week (Oct 16–22). 70% support it. But families of current high schoolers want it to apply now, not just to future freshmen. Full analysis at the link in bio.
> #weightedgrades #sunprairie #spasd #parents #schoolboard

**First comment:** `Should it apply to current students? Tell us 👇`

### 4 · You said, we did: newsletters
**Cover text:** `STUDENTS SAID IT. THE DISTRICT DID IT.`
**Caption:**
> Students said they'd never gotten a district newsletter. On Oct 20 we brought it up with district leaders. On Oct 21 they confirmed in writing: newsletters go to every student starting in November. That's our first "you said, we did" ✅
> #studentvoice #spasd #sunprairie #youthvoice

**First comment:** `Did you get yours yet? Let us know`

### 5 · Your school. Your say. (vote day)
**Cover text:** `TONIGHT: WEIGHTED GRADES`
**Caption:**
> The School Board's goal is a final weighted grades vote tonight, Nov 23, 6 PM, Professional Learning Center boardroom. Not guaranteed. Follow for what happens 👀
> #sunprairie #schoolboard #weightedgrades #spasd

⚠️ On Nov 23, check the Board agenda first. If the vote moved, change the caption to the new date.

---

## 4 new TikToks to film yourself (fast, phone-only)
TikTok rewards a real person talking more than graphics. Each of these takes about 10 minutes.

1. **"I asked the district so you don't have to"** (green screen): put the Ask the District #1 answer behind you and read it out. Fact from the site: there was no final vote date yet, and the goal was November 23 but not guaranteed.
2. **"What happened at the Board on Nov 9"** (talking head, 30s): your own recap of the meeting. Only say what actually happened. No student names.
3. **Vote-night update (Nov 23 or 24):** a quick result post. Have a "passed" version and a "delayed" version ready to go.
4. **"POV: you find out the district has to answer you"** (trend format): text overlay plus a trending sound, ending with the site link.

## Rules (same as the site)
- No students named or shown without their OK. Film hands, the screen, or yourself only.
- Quote district answers word for word. Never paraphrase them as facts.
- Every claim needs a source on the site. If it's not there, don't say it.

## Rebuilding the videos
`cd tiktok/render && bash build.sh` rebuilds all 5 from `public/videos/`. To change the end card, edit `endcard.html`, then run `node shot.cjs $PWD/endcard.html $PWD/endcard.png`.
