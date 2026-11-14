"""Generates HTML sources for the SPASD Student Voice images and PDFs that were missing.

Run:  python3 gen.py && node render.cjs        (from spasd-site/assets-src)
Writes build/*.html + build/manifest.json; render.cjs turns them into files in ../public.
Every fact here comes from public/index.html or the existing PDFs. Nothing invented.
"""
import json, os, html, io
import qrcode, qrcode.image.svg

HERE = os.path.dirname(os.path.abspath(__file__))
BUILD = os.path.join(HERE, "build")
os.makedirs(BUILD, exist_ok=True)
LOGO = "file://" + os.path.join(HERE, "..", "public", "icons", "icon-512.png")
SITE = "spasdstudentvoice.netlify.app"
IG = "@spasdstudentvoice"
manifest = []

def qr_svg(url):
    img = qrcode.make(url, image_factory=qrcode.image.svg.SvgPathImage, border=1, box_size=10)
    buf = io.BytesIO(); img.save(buf)
    s = buf.getvalue().decode()
    return s[s.index("<svg"):].replace("<svg ", '<svg class="qr" ', 1)

MASCOT = """<svg class="mascot" viewBox="0 0 220 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Echo, the Student Voice mascot">
  <path d="M100 18c-50 0-88 32-88 74 0 26 15 48 38 61l-10 33 36-24c8 2 16 3 24 3 50 0 88-32 88-73S150 18 100 18z" fill="#2f5da6" stroke="#1b3a66" stroke-width="6" stroke-linejoin="round"/>
  <ellipse cx="72" cy="84" rx="15" ry="17" fill="#fff"/><ellipse cx="124" cy="84" rx="15" ry="17" fill="#fff"/>
  <circle cx="75" cy="88" r="7" fill="#14233a"/><circle cx="127" cy="88" r="7" fill="#14233a"/>
  <circle cx="78" cy="85" r="2.4" fill="#fff"/><circle cx="130" cy="85" r="2.4" fill="#fff"/>
  <ellipse cx="56" cy="114" rx="10" ry="6" fill="#ff8fa3" opacity=".8"/><ellipse cx="142" cy="114" rx="10" ry="6" fill="#ff8fa3" opacity=".8"/>
  <path d="M78 116q21 22 42 0" fill="none" stroke="#14233a" stroke-width="6" stroke-linecap="round"/>
  <g transform="rotate(-14 178 120)">
    <path d="M158 108l40-20v58l-40-20z" fill="#e8561c" stroke="#9a3412" stroke-width="4" stroke-linejoin="round"/>
    <rect x="146" y="106" width="16" height="22" rx="4" fill="#ffb48a" stroke="#9a3412" stroke-width="4"/>
    <path d="M206 98l10-8M208 117h13M206 136l10 8" stroke="#e8561c" stroke-width="5" stroke-linecap="round"/>
  </g>
</svg>"""

BASE_CSS = """
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{font-family:Inter,system-ui,sans-serif;color:#14233a;-webkit-font-smoothing:antialiased}
:root{--navy:#1b3a66;--navy2:#1d3a68;--orange:#e8561c;--peach:#ffb48a;--green:#1f7a4d;--bg:#f5f7fa;--muted:#566377;--line:#d9e0e9}
.logo{background:#fff;border-radius:22%;object-fit:contain;display:block}
.kicker{display:inline-block;font-weight:800;letter-spacing:.14em;text-transform:uppercase}
.pill{display:inline-block;background:var(--orange);color:#fff;font-weight:800;letter-spacing:.12em;text-transform:uppercase;border-radius:999px}
.ring{position:absolute;border-radius:50%;border-style:solid;border-color:rgba(255,255,255,.07);pointer-events:none}
"""

def page(name, body, css, w, h, kind, out, transparent=False, scale=1):
    doc = f"""<!doctype html><html><head><meta charset="utf-8"><style>{BASE_CSS}
html,body{{width:{w}px;height:{h}px;overflow:hidden}}{css}</style></head><body>{body}</body></html>"""
    open(os.path.join(BUILD, name + ".html"), "w").write(doc)
    manifest.append(dict(src=name + ".html", out=out, w=w, h=h, kind=kind, transparent=transparent, scale=scale))

def pdf(name, body, css, out, size="Letter", landscape=False):
    doc = f"""<!doctype html><html><head><meta charset="utf-8"><style>{BASE_CSS}{css}</style></head><body>{body}</body></html>"""
    open(os.path.join(BUILD, name + ".html"), "w").write(doc)
    manifest.append(dict(src=name + ".html", out=out, kind="pdf", size=size, landscape=landscape))

e = html.escape

# ---------------------------------------------------------------- Instagram posts (1080x1350, shown at 720x900)
IG_CSS = """
.c{position:absolute;inset:0;padding:90px 84px 0;display:flex;flex-direction:column}
.navy{background:var(--navy2);color:#fff}.orange{background:var(--orange);color:#fff}.paper{background:#fff;color:#14233a}
.top{display:flex;align-items:center;gap:22px}
.top .logo{width:118px;height:118px}
.top .pill{font-size:26px;padding:12px 24px}
.orange .top .pill{background:#fff;color:var(--orange)}
h1{font-weight:900;letter-spacing:-.035em;line-height:.94;margin:56px 0 0;font-size:112px;text-transform:uppercase}
h1 .a{color:var(--peach)}.paper h1 .a,.paper .a{color:var(--orange)}.orange h1 .a{color:#14233a}
.lead{font-size:42px;line-height:1.3;font-weight:600;margin-top:34px;max-width:900px}
.navy .lead{color:#dbe4f2}.orange .lead{color:#fff3ec}
.list{margin:40px 0 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:20px}
.list li{font-size:38px;font-weight:600;line-height:1.25;display:flex;gap:20px;align-items:flex-start}
.list li b{font-weight:800}
.chip{flex:none;font-size:22px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;padding:9px 16px;border-radius:10px;margin-top:4px;min-width:150px;text-align:center}
.won{background:#e2f3ea;color:#1f7a4d}.prog{background:#fde9df;color:#9a3412}.ask{background:#e3ebf6;color:#1b3a66}.live{background:var(--peach);color:#14233a}
.dot{flex:none;width:22px;height:22px;border-radius:50%;background:var(--peach);margin-top:12px}
.paper .dot{background:var(--orange)}
.foot{position:absolute;left:84px;right:84px;bottom:64px;display:flex;justify-content:space-between;font-size:28px;font-weight:700;opacity:.85}
.box{margin-top:40px;border-radius:28px;padding:36px 40px;font-size:38px;line-height:1.35;font-weight:600}
.navy .box{background:rgba(255,255,255,.08)}.orange .box{background:rgba(0,0,0,.12)}.paper .box{background:var(--bg);border:3px solid var(--line)}
.q{font-size:74px;font-weight:900;line-height:1.02;letter-spacing:-.025em;margin-top:56px}
.blank{display:inline-block;border-bottom:4px solid currentColor;opacity:.9;padding:0 6px;color:var(--orange)}
.big{font-size:150px;font-weight:900;letter-spacing:-.04em;line-height:.9}
.mascot{position:absolute;width:250px;right:56px;bottom:110px}
"""

def ig(name, theme, pill, inner, mascot=False, foot_left=SITE, foot_right=IG):
    ring = '<div class="ring" style="width:900px;height:900px;right:-330px;top:-300px;border-width:90px"></div>' if theme != "paper" else ""
    body = f"""<div class="c {theme}">{ring}<div class="top"><img class="logo" src="{LOGO}"><span class="pill">{pill}</span></div>
{inner}{MASCOT if mascot else ''}<div class="foot"><span>{foot_left}</span><span>{foot_right}</span></div></div>"""
    page(name, body, IG_CSS, 1080, 1350, "jpg", f"images/{name}.jpg")

ig("ig-fall-update", "navy", "Fall 2026 update", """
<h1>Where things<br><span class="a">stand.</span></h1>
<ul class="list">
<li><span class="chip prog">Moving</span><span><b>Weighted grades</b> are with the School Board. Vote goal: Nov 23.</span></li>
<li><span class="chip won">Won</span><span><b>Student newsletter.</b> Every student gets it, starting in November.</span></li>
<li><span class="chip ask">Asked</span><span><b>Advisory council.</b> Pilot sent to the superintendent. His reply: "I love this idea."</span></li>
<li><span class="chip live">Live</span><span><b>Ask the District.</b> Real questions, answers posted word for word.</span></li>
</ul>""")

ig("ig-ask-1", "orange", "Ask the District #1", """
<div class="q">When is the final Board vote on weighted grades, and which students would it apply to?</div>
<div class="box">Sent to the district October 29. The answer gets posted word for word.</div>""", mascot=True)

ig("ig-ask1-answered", "paper", "#1, answered", """
<h1 style="font-size:96px">No date yet.<br><span class="a">Goal: Nov 23.</span><br>Not guaranteed.</h1>
<div class="box" style="font-size:33px">"Ideally, this recommendation would be up for formal approval at the Board Meeting on Nov 23rd - but that is not guaranteed at this time."<br><b style="display:block;margin-top:18px;font-size:30px">Dr. Curtis Mould, October 30, word for word</b></div>
<div class="lead" style="font-size:32px;color:#566377">It depends on the Board's questions on Nov 2 and Nov 9. Full answer on the site.</div>""")

ig("ig-ask2", "orange", "Ask the District #2", """
<div class="q">How are the School Board's student representatives chosen, and how can students reach them?</div>
<div class="box">Sent to the district November 4. The answer gets posted word for word.</div>""", mascot=True)

ig("ig-nov9", "navy", "Monday, Nov 9 · 6 PM", """
<h1>Students take<br><span class="a">the mic.</span></h1>
<div class="lead">Students from the work group present weighted grades to the School Board and answer its questions.</div>
<div class="box"><b>Professional Learning Center Boardroom</b><br>220 Kroncke Drive · Open to the public</div>
<div class="lead" style="font-size:32px">Want to speak too? Register online by 12:00 PM that day, or sign up on paper before the meeting starts.</div>""")

ig("ig-es-nov9", "navy", "Lunes 9 de nov. · 6:00 p. m.", """
<h1>Los estudiantes<br><span class="a">hablan.</span></h1>
<div class="lead">Estudiantes del grupo de trabajo presentan las calificaciones ponderadas a la Junta Escolar y responden sus preguntas.</div>
<div class="box"><b>Professional Learning Center Boardroom</b><br>220 Kroncke Drive · Abierto al público</div>
<div class="lead" style="font-size:32px">¿Quieres hablar tú también? Regístrate en línea antes de las 12:00 p. m. ese día, o anótate en papel antes de que empiece la reunión.</div>""")

ig("ig-phones", "paper", "The phone law", """
<h1>The phone law<br><span class="a">in 30 seconds.</span></h1>
<div class="lead">Since July 1, Wisconsin school districts must limit personal phones during class time.</div>
<div class="kicker" style="margin-top:44px;font-size:28px;color:#566377">Exceptions</div>
<ul class="list" style="margin-top:18px">
<li><span class="dot"></span><span>Emergencies</span></li>
<li><span class="dot"></span><span>Health needs</span></li>
<li><span class="dot"></span><span>IEP and 504 plans</span></li>
<li><span class="dot"></span><span>Teacher-approved use</span></li>
</ul>""")

ig("ig-vote", "navy", "Spring election 2027", """
<h1>Can you vote<br><span class="a">in April?</span></h1>
<div class="lead">If you're a senior who turns 18 by <b style="color:#fff">April 6, 2027</b>, yes.</div>
<div class="kicker" style="margin-top:44px;font-size:28px;color:var(--peach)">On the ballot</div>
<ul class="list" style="margin-top:18px">
<li><span class="dot"></span><span>Sun Prairie School Board</span></li>
<li><span class="dot"></span><span>An open Wisconsin Supreme Court seat</span></li>
</ul>
<div class="box"><b>Register at myvote.wi.gov</b></div>""")

ig("ig-money", "paper", "School budget 101", """
<h1>Where school<br>money <span class="a">comes from.</span></h1>
<ul class="list" style="gap:30px">
<li><span class="chip ask" style="min-width:64px">1</span><span><b>The state caps</b> how much a district can raise.</span></li>
<li><span class="chip prog" style="min-width:64px">2</span><span>To go past that cap, <b>districts ask voters</b> in a referendum.</span></li>
</ul>
<div class="box" style="font-size:34px">Want the full picture? Read "How the SPASD Budget Works" on the site.</div>""")

ig("ig-changed", "navy", "You said, we did", """
<h1 style="font-size:96px">What changed<br>because students<br><span class="a">spoke up.</span></h1>
<ul class="list">
<li><span class="dot"></span><span>District newsletters now go to students</span></li>
<li><span class="dot"></span><span>Students presented to the School Board</span></li>
<li><span class="dot"></span><span>Survey results made public</span></li>
<li><span class="dot"></span><span>A Student Senate</span></li>
<li><span class="dot"></span><span>A meeting with the superintendent</span></li>
</ul>""")

ig("ig-speak", "paper", "Speak at the Board", """
<h1 style="font-size:92px">Talk to the Board<br><span class="a">in 2 minutes.</span></h1>
<div class="box" style="font-size:36px;line-height:1.5">Good evening. My name is <span class="blank">name</span>, and I'm a <span class="blank">grade</span> at <span class="blank">school</span>. I'm here about <span class="blank">topic</span>. As a student, I've seen <span class="blank">one specific example</span>. I'm asking the Board to <span class="blank">one clear ask</span>. Thank you for listening.</div>
<div class="lead" style="font-size:32px;color:#566377">Fill in the blanks. Practice once out loud. That's it.</div>""")

ig("ig-your-turn", "orange", "Student survey", """
<h1>This is<br><span class="a">your turn.</span></h1>
<div class="lead">A 2-minute anonymous survey.</div>
<ul class="list">
<li><span class="dot" style="background:#fff"></span><span>Safety</span></li>
<li><span class="dot" style="background:#fff"></span><span>Clear info</span></li>
<li><span class="dot" style="background:#fff"></span><span>Fairness</span></li>
<li><span class="dot" style="background:#fff"></span><span>Stress and support</span></li>
</ul>
<div class="box"><b>Link in bio.</b> English and Spanish.</div>""")

ig("ig-join", "navy", "Now recruiting", """
<h1>Join<br><span class="a">Student Voice.</span></h1>
<div class="lead" style="font-size:52px;color:#fff;font-weight:800">We need every school.</div>
<ul class="list">
<li><span class="dot"></span><span>No experience needed</span></li>
<li><span class="dot"></span><span>Middle and high school</span></li>
<li><span class="dot"></span><span>Bring the questions your friends are asking</span></li>
</ul>
<div class="box"><b>DM us to join.</b></div>""", mascot=True)

# ---------------------------------------------------------------- Reel thumbnails (1080x1920)
P_CSS = """
.c{position:absolute;inset:0;background:var(--navy2);color:#fff;padding:260px 96px 0}
.c .logo{width:200px;height:200px}
.c .pill{font-size:32px;padding:14px 28px;margin-top:70px}
h1{font-weight:900;font-size:138px;line-height:.93;letter-spacing:-.035em;text-transform:uppercase;margin:34px 0 0}
h1 .a{color:var(--peach)}
.play{margin-top:80px;width:170px;height:170px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center}
.play:after{content:"";border-left:56px solid var(--orange);border-top:34px solid transparent;border-bottom:34px solid transparent;margin-left:14px}
.d{font-size:38px;font-weight:700;color:#dbe4f2;margin-top:32px}
"""
for name, pill, title, secs in [
    ("reel-fall-update", "Fall 2026 update", 'You said,<br><span class="a">we did.</span>', 18),
    ("reel-weighted-grades-timeline", "Weighted grades", 'Weighted grades<br><span class="a">go to the Board.</span>', 18),
    ("reel-ask-the-district", "Ask the District", 'Answers posted<br><span class="a">word for word.</span>', 19),
    ("reel-your-turn", "Student survey", 'This is<br><span class="a">your turn.</span>', 16),
    ("reel-join", "Join Student Voice", 'We need<br><span class="a">every school.</span>', 16),
]:
    page("poster-" + name, f"""<div class="c"><div class="ring" style="width:1100px;height:1100px;right:-420px;top:-260px;border-width:110px"></div>
<img class="logo" src="{LOGO}"><span class="pill">{pill}</span><h1>{title}</h1><div class="play"></div><div class="d">{secs} seconds · {IG}</div></div>""",
         P_CSS, 1080, 1920, "jpg", f"images/poster-{name}.jpg", scale=2/3)  # 720x1280: shown small, so lighter files

# ---------------------------------------------------------------- Mascot (transparent PNG)
page("mascot", MASCOT, ".mascot{width:1024px;height:auto;display:block;margin:30px 0 0 0}", 1080, 1000, "png", "images/mascot.png", transparent=True)

# ---------------------------------------------------------------- Friday Story template (1080x1920)
S_CSS = """
.c{position:absolute;inset:0;background:var(--navy2);color:#fff;padding:230px 90px 0}
.row{display:flex;align-items:center;gap:22px}.row .logo{width:110px;height:110px}
.row .pill{font-size:28px;padding:12px 24px}
h1{font-weight:900;font-size:150px;line-height:.9;letter-spacing:-.04em;margin:46px 0 0}
h1 .a{color:var(--peach)}
.date{font-size:40px;font-weight:700;color:#dbe4f2;margin-top:18px}
.card{margin-top:46px;background:rgba(255,255,255,.08);border-radius:30px;padding:34px 40px}
.card .k{font-size:28px;font-weight:800;letter-spacing:.14em;color:var(--peach)}
.line{height:64px;border-bottom:3px dashed rgba(255,255,255,.35)}
.cta{margin-top:46px;display:inline-block;background:var(--orange);font-weight:800;font-size:44px;padding:20px 34px;border-radius:22px}
.mascot{position:absolute;right:70px;top:250px;width:230px}
"""
page("story-friday", f"""<div class="c"><div class="row"><img class="logo" src="{LOGO}"><span class="pill">Weekly recap</span></div>
{MASCOT}<h1>FRIDAY<br><span class="a">RECAP.</span></h1><div class="date">Week of ________</div>
<div class="card"><div class="k">THIS WEEK</div><div class="line"></div><div class="line"></div><div class="line"></div></div>
<div class="card"><div class="k">NEXT WEEK</div><div class="line"></div><div class="line"></div></div>
<div class="cta">Ask us anything ↗ link in bio</div></div>""", S_CSS, 1080, 1920, "png", "images/story-friday.png")

# ---------------------------------------------------------------- Sticker sheet (letter @300dpi, 2550x3300)
K_CSS = """
body{background:#fff}
.sheet{position:absolute;inset:0;padding:150px 150px;display:grid;grid-template-columns:1fr 1fr;grid-auto-rows:700px;gap:80px 100px}
.cell{display:flex;align-items:center;justify-content:center}
.st{border:10px dashed #c9d2de;border-radius:60px;padding:24px;display:flex;align-items:center;justify-content:center}
.circle{border-radius:50%}
.logo{width:520px;height:520px}
.mascot{width:560px}
.txt{width:1000px;height:420px;border-radius:44px;color:#fff;font-weight:900;text-transform:uppercase;letter-spacing:-.03em;line-height:.95;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;font-size:118px}
.txt small{font-size:46px;letter-spacing:.14em;font-weight:800;margin-top:22px}
.n{background:#1d3a68}.o{background:#e8561c}.w{background:#fff;color:#1b3a66;border:14px solid #1b3a66}.g{background:#1f7a4d}
.a{color:#ffb48a}
.head{position:absolute;left:150px;right:150px;top:40px;display:flex;justify-content:space-between;font-size:40px;font-weight:700;color:#566377}
"""
stickers = [
    f'<div class="st circle"><img class="logo circle" src="{LOGO}"></div>',
    f'<div class="st circle">{MASCOT}</div>',
    '<div class="st"><div class="txt n">Your school.<br><span class="a">Your say.</span></div></div>',
    '<div class="st"><div class="txt o">Ask the<br>district.<small>Answers word for word</small></div></div>',
    '<div class="st"><div class="txt w">You said.<br><span style="color:#e8561c">We did.</span></div></div>',
    '<div class="st"><div class="txt n">Tu escuela.<br><span class="a">Tu voz.</span></div></div>',
    '<div class="st"><div class="txt g">I spoke up.<small>SPASD Student Voice</small></div></div>',
    '<div class="st"><div class="txt o" style="font-size:96px">Student-led<small>Sun Prairie, Wisconsin</small></div></div>',
]
page("sticker-sheet", f"""<div class="head"><span>SPASD Student Voice · sticker sheet</span><span>Print on 8.5×11 sticker paper at 100%. Cut on the dashed lines.</span></div>
<div class="sheet">{''.join(f'<div class="cell">{s}</div>' for s in stickers)}</div>""", K_CSS, 2550, 3300, "png", "images/sticker-sheet.png")

# ---------------------------------------------------------------- PDFs
DOC_CSS = """
@page{margin:0}
body{font-size:10.5pt;line-height:1.45}
.pg{width:8.5in;height:11in;overflow:hidden;padding:.55in .65in .7in;position:relative;page-break-after:always}
.pg:last-child{page-break-after:auto}
.hd{display:flex;gap:14px;align-items:center;border-bottom:2px solid var(--line);padding-bottom:12px}
.hd .logo{width:58px;height:58px;border:1px solid var(--line)}
.hd .k{color:var(--orange);font-weight:800;font-size:8pt;letter-spacing:.12em;text-transform:uppercase}
.hd h1{margin:2px 0 0;font-size:21pt;line-height:1.08;color:var(--navy);font-weight:900;letter-spacing:-.01em}
.intro{color:var(--muted);margin:10px 0 0;font-size:10pt}
h2{color:var(--navy);font-size:13pt;margin:18px 0 6px;font-weight:800}
table{width:100%;border-collapse:collapse;margin:6px 0;font-size:9.8pt}
th{background:var(--navy);color:#fff;text-align:left;padding:7px 9px;font-weight:700}
td{border-bottom:1px solid var(--line);padding:7px 9px;vertical-align:top}
tr:nth-child(even) td{background:#f8fafc}
.call{background:#fde9df;border-left:5px solid var(--orange);padding:10px 14px;margin:10px 0;border-radius:4px}
.ft{position:absolute;left:.65in;right:.65in;bottom:.35in;text-align:center;color:var(--muted);font-size:8pt;border-top:1px solid var(--line);padding-top:6px}
.draft{position:absolute;top:.3in;right:.65in;background:var(--orange);color:#fff;font-weight:800;font-size:8pt;letter-spacing:.12em;padding:4px 10px;border-radius:999px}
.note{color:var(--muted);font-size:8.6pt;margin-top:12px}
p{margin:6px 0}
"""

def hd(kicker, title, intro=""):
    return f"""<div class="hd"><img class="logo" src="{LOGO}"><div><div class="k">{kicker}</div><h1>{title}</h1></div></div>{f'<p class="intro">{intro}</p>' if intro else ''}"""

def ft(n, total):
    return f'<div class="ft">SPASD Student Voice · {SITE} · {n}/{total}</div>'

# Spanish family explainer (translation of weighted-grades-family-explainer-draft.pdf, usted)
pdf("calificaciones-ponderadas-familias-borrador", f"""
<div class="pg"><div class="draft">BORRADOR</div>
{hd("Calificaciones ponderadas · borrador estudiantil para el grupo de trabajo", "Calificaciones ponderadas: lo que las familias necesitan saber",
 "Una explicación breve escrita por un estudiante miembro del grupo de trabajo sobre calificaciones ponderadas del SPASD (Distrito Escolar del Área de Sun Prairie), octubre de 2026. Esto es una recomendación. La Junta Escolar toma la decisión final.")}
<h2>Qué está cambiando</h2>
<p>Hoy, el SPASD usa un promedio (GPA) no ponderado de 4.0, así que una A vale lo mismo en todas las clases. El grupo de trabajo recomienda una escala de 5.0 para las clases más exigentes. En una clase ponderada, una A valdría 5.0 en lugar de 4.0.</p>
<h2>Qué clases serían ponderadas</h2>
<table><tr><th style="width:50%">Ponderadas (escala de 5.0)</th><th>No ponderadas</th></tr>
<tr><td>Cursos AP</td><td>Clases con crédito universitario o certificación que equivalen a una clase que la preparatoria ya ofrece</td></tr>
<tr><td>Clases <i>capstone</i> (culminantes), incluidos los cursos de música con audición</td><td>Clases que no se transfieren como crédito a las universidades y colegios de Universities of Wisconsin</td></tr>
<tr><td>Clases que otorgan crédito universitario o una certificación de la industria</td><td></td></tr></table>
<p>Los consejeros están revisando ahora la lista de clases de Madison College. Cada clase ponderada estará marcada en la guía de cursos para que los estudiantes lo sepan antes de elegir.</p>
<h2>A quién se aplica</h2>
<p>La recomendación es empezar con los estudiantes que entren a 9.º grado en el otoño de 2027 (la generación de 2031) y agregar un grado cada año después.</p>
<div class="call"><b>¿Por qué no a los estudiantes actuales?</b> Los estudiantes que ya están en la preparatoria eligieron sus clases con las reglas anteriores. Cambiar las reglas a mitad del camino premiaría algunas decisiones después de tomarlas y otras no, y cambiaría la clasificación (<i>class rank</i>) de estudiantes a quienes ya se está clasificando. Empezar con una generación nueva significa que todos sus estudiantes conocen las reglas antes de elegir una sola clase.
<p style="margin-top:8px"><b>Pregunta abierta para el grupo de trabajo:</b> el 69% de los padres y cuidadores de estudiantes actuales de preparatoria pidió que se aplique ya. Una opción a considerar es ponderar las clases tomadas desde 2027–28 para todos los estudiantes, sin recalcular calificaciones anteriores.</p></div>
{ft(1,2)}</div>
<div class="pg"><div class="draft">BORRADOR</div>
<h2 style="margin-top:0">Preguntas de las familias</h2>
<p><b>¿Se aplica a mi estudiante?</b> Según la recomendación, solo a los estudiantes que empiecen 9.º grado en el otoño de 2027 o después.</p>
<p><b>¿Se recalcularán las calificaciones anteriores?</b> No. Las calificaciones ya obtenidas se quedan como están.</p>
<p><b>¿Cómo se relaciona con la Ley 95 (Act 95) y la universidad?</b> La Ley 95 garantiza la admisión a las universidades de Universities of Wisconsin para los estudiantes que estén en el 10% más alto de su clase (5% más alto para UW–Madison), así que la clasificación importa. Muchas universidades también recalculan el promedio a su manera. [El distrito debe confirmar cómo se usará el promedio ponderado para la clasificación y cómo aparecerá en el expediente académico.]</p>
<p><b>¿Es justo para los estudiantes que no pueden tomar AP?</b> Las clases ponderadas tienen que estar abiertas a todos los estudiantes que cumplan los requisitos previos. [El distrito debe agregar cómo se apoya a los estudiantes para tener acceso a estas clases.]</p>
<p><b>¿Cómo puedo dar mi opinión?</b> El plan va al Comité de Enseñanza y Aprendizaje de la Junta el 2 de noviembre (4:45 p. m., District Service Center) y a la Junta completa el 9 de noviembre. Ambas reuniones son abiertas al público.</p>
<p class="note">Basado en las recomendaciones del grupo de trabajo del 15 y 20 de octubre y en la encuesta a padres y cuidadores (531 respuestas, del 16 al 22 de octubre de 2026). Lo que está entre corchetes necesita confirmación del distrito antes de compartirse con las familias. Traducción del borrador en inglés <i>Weighted Grades: What Families Need to Know</i>.</p>
{ft(2,2)}</div>""", DOC_CSS, "resources/calificaciones-ponderadas-familias-borrador.pdf")

# Spanish board summary (translation of the one-page board handout)
pdf("calificaciones-ponderadas-resumen-junta", f"""
<div class="pg">
{hd("Resumen de una página para los miembros de la Junta", "Lo que dijeron los estudiantes y las familias", "Calificaciones ponderadas del SPASD · resumen estudiantil · noviembre de 2026")}
<table style="margin-top:16px"><tr><th style="width:30%">Encuesta</th><th style="width:16%">Respuestas</th><th>Hallazgo principal</th></tr>
<tr><td>Encuesta estudiantil sobre la Ley 95 (dic. de 2025 – ene. de 2026)</td><td>903 estudiantes</td><td>El 78% de los estudiantes que eligieron una opción de clasificación prefirió un promedio ponderado. El 55% casi no sabía de la Ley 95 antes.</td></tr>
<tr><td>Encuesta a padres y cuidadores (16–22 de oct. de 2026)</td><td>531 padres y cuidadores</td><td>El 70% apoya las calificaciones ponderadas. West 68%, East 73%.</td></tr>
<tr><td>Encuesta a padres y cuidadores: cuándo empezar</td><td>462 respondieron</td><td>Familias con estudiantes actuales de preparatoria: el 69% quiere que se aplique ya. Familias solo con hijos más pequeños: el 74% prefiere empezar el próximo año.</td></tr>
<tr><td>Encuesta a padres y cuidadores: clases</td><td>531 padres y cuidadores</td><td>El 85% quiere que AP sea ponderada. Factor principal: la exigencia académica (75%).</td></tr>
<tr><td>Encuesta a padres y cuidadores: comunicación</td><td>531 padres y cuidadores</td><td>El 72% quiere una explicación escrita y detallada.</td></tr></table>
<div class="call"><b>Lo que las familias quieren saber:</b> ¿Se aplica a mi estudiante? ¿Cómo afecta la Ley 95 y la admisión a la universidad? ¿Qué clases cuentan? ¿Es justo para los estudiantes sin acceso? ¿Ya se tomó la decisión?</div>
<div class="call" style="background:#e3ebf6;border-color:var(--navy)"><b>Lo que piden los estudiantes:</b> Aprobar el plan y compartirlo con una explicación escrita y clara que responda directamente a las familias actuales.</div>
<p class="note">Ambas encuestas fueron de participación voluntaria. Análisis completo (en inglés): {SITE}/resources/caregiver-survey-key-findings.pdf. Traducción del resumen en inglés <i>What Students and Families Said</i>.</p>
{ft(1,1)}</div>""", DOC_CSS, "resources/calificaciones-ponderadas-resumen-junta.pdf")

# Advisory council application, English + Spanish
APP_CSS = DOC_CSS + """
.qs{margin:10px 0 0;padding:0;list-style:none;counter-reset:q}
.qs li{counter-increment:q;margin:0 0 6px;break-inside:avoid}
.qs li:before{content:counter(q);display:inline-flex;width:20px;height:20px;border-radius:50%;background:var(--navy);color:#fff;font-size:8.5pt;font-weight:800;align-items:center;justify-content:center;margin-right:8px}
.qs b{font-weight:700}
.ln{border-bottom:1px solid #9aa7b8;height:19px}
.pg{padding-top:.45in;padding-bottom:.6in}
.opt{display:inline-block;margin:6px 18px 0 28px}.opt:before{content:"";display:inline-block;width:11px;height:11px;border:1.5px solid var(--navy);border-radius:2px;margin-right:6px;vertical-align:-1px}
.rec{border:2px dashed var(--orange);border-radius:8px;padding:10px 14px;margin-top:12px}
"""
def app_page(lang):
    en = lang == "en"
    t = (lambda a, b: a if en else b)
    L = lambda n=1: '<div class="ln"></div>' * n
    qs = [
        (t("Your name (or the name you go by)", "Tu nombre (o el nombre que usas)"), L()),
        (t("Your school", "Tu escuela"), L()),
        (t("Your grade", "Tu grado"), L()),
        (t("Best way to reach you (school email or phone)", "La mejor forma de contactarte (correo escolar o teléfono)"), L()),
        (t("Which language do you want council materials in?", "¿En qué idioma quieres recibir los materiales del consejo?"),
         f'<span class="opt">{t("English","Inglés")}</span><span class="opt">{t("Spanish","Español")}</span><span class="opt">{t("Both","Los dos")}</span>'),
        (t("Why do you want to be on the council? (2–3 sentences)", "¿Por qué quieres estar en el consejo? (2 o 3 oraciones)"), L(3)),
        (t("What's one thing at your school you'd change, and why?", "¿Qué es algo de tu escuela que cambiarías y por qué?"), L(3)),
        (t("Whose voice do you think the district hears the least? How would you bring it in?", "¿A quién crees que el distrito escucha menos? ¿Cómo incluirías esa voz?"), L(3)),
        (t("Meetings are 60 minutes in January, February, April and May 2027, during the school day or right after. Can you make most of them?",
           "Las reuniones duran 60 minutos en enero, febrero, abril y mayo de 2027, durante el día escolar o justo después. ¿Puedes ir a la mayoría?"),
         f'<span class="opt">{t("Yes","Sí")}</span><span class="opt">{t("Not sure","No estoy seguro/a")}</span><span class="opt">{t("I'd need a ride or the virtual option","Necesitaría transporte o la opción virtual")}</span>'),
        (t("Anything else we should know? (optional)", "¿Algo más que debamos saber? (opcional)"), L(2)),
    ]
    items = "".join(f"<li><b>{q}</b>{a}</li>" for q, a in qs)
    rec = t(
        "<b>Saved seat, one per school.</b> For a student who isn't already in a leadership role, recommended by a counselor or teacher. Recommender's name and role: ",
        "<b>Lugar reservado, uno por escuela.</b> Para un estudiante que todavía no tiene un rol de liderazgo, recomendado por un consejero o maestro. Nombre y cargo de quien recomienda: ")
    return f"""<div class="pg"><div class="draft">{t("DRAFT · NOT OPEN YET","BORRADOR")}</div>
{hd(t("Student Advisory Council · spring 2027 pilot","Consejo Asesor Estudiantil · prueba piloto, primavera de 2027"),
    t("Advisory Council Application","Solicitud para el Consejo Asesor"),
    t("3–5 students from every SPASD middle and high school, across grades. Four meetings, January to May 2027. No experience needed. Applications open once the district approves the pilot.",
      "De 3 a 5 estudiantes de cada escuela intermedia y preparatoria del SPASD, de todos los grados. Cuatro reuniones, de enero a mayo de 2027. No necesitas experiencia. La solicitud se abre cuando el distrito apruebe la prueba piloto."))}
<ol class="qs">{items}</ol>
<div class="rec">{rec}<div class="ln"></div></div>
<p class="note">{t("Your answers are used only to choose council members. Student names never go on the Student Voice website. Questions? DM @spasdstudentvoice.",
 "Tus respuestas solo se usan para elegir a los miembros del consejo. Los nombres de los estudiantes nunca se publican en el sitio de Student Voice. ¿Preguntas? Escríbenos por DM a @spasdstudentvoice.")}</p>
{ft(1 if en else 2, 2)}</div>"""
pdf("advisory-council-application", app_page("en") + app_page("es"), APP_CSS, "resources/advisory-council-application.pdf")

# Poster 11x17
PO_CSS = """
@page{margin:0}
.pg{width:11in;height:17in;position:relative;overflow:hidden;background:#fff}
.top{background:var(--navy2);color:#fff;padding:.6in .9in .5in;position:relative;overflow:hidden}
.top .row{display:flex;gap:22px;align-items:center}.top .logo{width:1.5in;height:1.5in}
.top .pill{font-size:17pt;padding:10px 22px}
.top h1{font-size:92pt;line-height:.88;font-weight:900;letter-spacing:-.04em;margin:.35in 0 0;text-transform:uppercase}
.top h1 .a{color:var(--peach)}
.top p{font-size:19pt;line-height:1.35;color:#dbe4f2;margin:.25in 0 0;max-width:8.5in}
.band{height:.22in;background:var(--orange)}
.win{margin:.45in .9in 0;border:4px solid var(--orange);border-radius:22px;padding:.3in .4in;font-size:20pt;line-height:1.35}
.win b{color:var(--orange);letter-spacing:.12em;font-size:13pt;display:block}
.three{display:grid;grid-template-columns:1fr 1fr 1fr;gap:.4in;margin:.45in .9in 0}
.three h3{font-size:30pt;font-weight:900;color:var(--navy);margin:0;border-top:6px solid var(--navy);padding-top:10px}
.three p{font-size:15pt;line-height:1.35;color:#3f4a5a;margin:8px 0 0}
.scan{margin:.45in .9in 0;background:#fde9df;border-radius:26px;padding:.35in .4in;display:flex;align-items:center;justify-content:space-between;gap:.4in}
.scan h2{font-size:46pt;font-weight:900;line-height:.92;margin:0;color:#14233a;text-transform:uppercase}.scan h2 span{color:var(--orange)}
.scan p{font-size:15pt;margin:8px 0 0;font-weight:600}
.qr{width:2.8in;height:2.8in;background:#fff;padding:12px;border-radius:14px}
.disc{margin:.3in .9in 0;text-align:center;font-size:11pt;color:var(--muted)}
.mascot{position:absolute;width:3in;right:.6in;top:.9in}
"""
pdf("student-voice-poster", f"""<div class="pg"><div class="top">{MASCOT}<div class="row"><img class="logo" src="{LOGO}"><span class="pill">Student-led · Sun Prairie</span></div>
<h1>Your school.<br><span class="a">Your say.</span></h1>
<p>SPASD Student Voice tracks what students in the Sun Prairie Area School District ask for, what district leaders say, and what actually changes.</p></div>
<div class="band"></div>
<div class="win"><b>IT'S ALREADY WORKING</b>Students said they'd never gotten a district newsletter. Starting in November, every student gets one.</div>
<div class="three"><div><h3>ASK IT</h3><p>Send the district a question, anonymously if you want. The real answer gets posted word for word.</p></div>
<div><h3>TRACK IT</h3><p>A public scoreboard of every promise made to students: done, in progress, or waiting.</p></div>
<div><h3>JOIN IT</h3><p>We need every school. No experience needed. DM us on Instagram.</p></div></div>
<div class="scan"><div><h2>Scan to<br><span>follow along</span></h2><p>{SITE}</p><p>Instagram {IG}<br>TikTok @spasd.student.voi</p><p>¿Hablas español? Hay una sección en español.</p></div>{qr_svg("https://" + SITE)}</div>
<div class="disc">Independent and student-led. Not an official Sun Prairie Area School District site and does not speak for the district.</div></div>""",
    PO_CSS, "resources/student-voice-poster.pdf", size="Tabloid")

# Lunch table tent sign: letter landscape, fold along the middle. Top half is upside down.
TS_CSS = """
@page{margin:0}
.pg{width:11in;height:8.5in;position:relative;overflow:hidden}
.half{position:absolute;left:0;right:0;height:4.25in;padding:.35in .55in;display:flex;align-items:center;gap:.4in;background:var(--navy2);color:#fff}
.half.t{top:0;transform:rotate(180deg)}.half.b{bottom:0}
.fold{position:absolute;left:0;right:0;top:4.25in;border-top:2px dashed #fff;z-index:2}
.fold span{position:absolute;right:.3in;top:-.2in;font-size:8pt;color:#fff;background:var(--navy2);padding:0 6px}
.half .logo{width:1.1in;height:1.1in;margin-bottom:12px}
.half h1{font-size:42pt;font-weight:900;line-height:.92;margin:0;text-transform:uppercase;letter-spacing:-.03em}
.half h1 span{color:var(--peach)}
.half p{font-size:15pt;margin:10px 0 0;color:#dbe4f2;line-height:1.3}
.half .u{font-weight:800;color:#fff}
.qr{width:2.6in;height:2.6in;background:#fff;padding:10px;border-radius:12px;flex:none}
"""
qr = qr_svg("https://" + SITE)
pdf("lunch-table-sign", f"""<div class="pg">
<div class="half t"><div style="flex:1"><img class="logo" src="{LOGO}"><h1>¿Tienes una pregunta <span>sobre la escuela?</span></h1>
<p>Pregúntale al distrito. Nosotros buscamos la respuesta y la publicamos palabra por palabra. Puede ser anónima.</p><p class="u">{SITE}</p></div>{qr}</div>
<div class="fold"><span>fold · doblar</span></div>
<div class="half b"><div style="flex:1"><img class="logo" src="{LOGO}"><h1>Got a question <span>about school?</span></h1>
<p>Ask the district. We chase the answer and post it word for word. Anonymous is fine.</p><p class="u">{SITE} · {IG}</p></div>{qr}</div>
</div>""", TS_CSS, "resources/lunch-table-sign.pdf", size="Letter", landscape=True)

json.dump(manifest, open(os.path.join(BUILD, "manifest.json"), "w"), indent=1)
print(len(manifest), "sources written")
