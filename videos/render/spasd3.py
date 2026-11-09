"""SPASD Student Voice v3 — student crew in East/West colors, voice am_liam,
@spasdstudentvoice end card. Variants: full (~36s) and teaser (~15s).
Usage: python3 spasd3.py OUT.mp4 [full|teaser]"""
import math
import sys

from PIL import Image, ImageDraw

from engine2 import *  # noqa

BG = (16, 24, 52)
NAVY2 = (28, 40, 80)
ORANGE = (255, 138, 0)
WHITE = (255, 255, 255)
GREY = (150, 160, 185)
YEL = (255, 214, 0)
EAST_RED = (196, 30, 45)
EAST_BLK = (26, 26, 30)
WEST_NAVY = (26, 48, 108)
WEST_SKY = (120, 186, 242)
HANDLE = "@spasdstudentvoice"

# the crew: 2 East (red/black), 2 West (navy/sky)
NARR = {"skin": (141, 85, 54), "hair": (28, 20, 18), "top": EAST_RED, "pants": EAST_BLK, "shoe": (245, 245, 245), "bag": EAST_BLK}
WEST1 = {"skin": (240, 198, 162), "hair": (196, 146, 64), "top": WEST_NAVY, "pants": (62, 72, 96), "shoe": (245, 245, 245),
         "bag": WEST_SKY, "style": "long"}
EAST2 = {"skin": (198, 134, 90), "hair": (46, 28, 20), "top": EAST_BLK, "pants": (60, 60, 70), "shoe": EAST_RED, "bag": EAST_RED,
         "style": "long"}
WEST2 = {"skin": (92, 58, 42), "hair": (16, 12, 12), "top": WEST_SKY, "pants": WEST_NAVY, "shoe": (245, 245, 245),
         "bag": WEST_NAVY, "style": "puff"}

FULL = [
    ("hook1", "Okay, wait.", 0.0),
    ("hook2", "Students in Sun Prairie get seats on the School Board?", 0.05),
    ("hook3", "Four of them. Let me show you.", 0.15),
    ("cls1", "Every idea starts in class.", 0.0),
    ("cls2", "Later start times. Phone rules. Better lunch.", 0.05),
    ("cls3", "But ideas only matter if someone hears them.", 0.15),
    ("dc", "That happens at the District Center, where budgets and policies for every school in the district get decided.", 0.15),
    ("boe1", "The Board of Education has seven elected members, serving three-year terms.", 0.05),
    ("boe2", "Plus four student members, serving two years.", 0.0),
    ("boe3", "Two from Sun Prairie East. Two from Sun Prairie West.", 0.15),
    ("sv", "That's Student Voice. Decisions about us, made with us.", 0.15),
    ("cta1", "So apply, join, or just pull up to a meeting.", 0.0),
    ("cta2", "Your voice counts. Follow Student Voice.", 0.0),
]

TEASER = [
    ("hook1", "Okay, wait.", 0.0),
    ("hook2", "Students in Sun Prairie get seats on the School Board?", 0.05),
    ("hook3", "Four of them.", 0.1),
    ("boe1", "Seven elected members, three-year terms.", 0.0),
    ("boe2", "Plus four students, two-year terms.", 0.0),
    ("boe3", "Two from East. Two from West.", 0.1),
    ("fol", "Want one of those seats? Follow Student Voice.", 0.0),
]

LINES = FULL


# ---------------------------------------------------------------- scenes
def rays(d, tg, c1, c2, cy=560, n=18):
    for y in range(0, H, 10):
        d.rectangle([0, y, W, y + 10], fill=mix(c1, c2, y / H))
    for k in range(n):
        a = k / n * 2 * math.pi + tg * 0.4
        d.polygon([(W / 2, cy), (W / 2 + math.cos(a) * 1600, cy + math.sin(a) * 1600),
                   (W / 2 + math.cos(a + 0.09) * 1600, cy + math.sin(a + 0.09) * 1600)], fill=mix(c1, (255, 255, 255), 0.12))


def crew(d, tg, t0, y=1300, s=0.74, hype_from=None, xs=(170, 410, 660, 900)):
    """4 students walk in from the left, staggered; narrator (index 1) talks."""
    pals = [WEST1, NARR, EAST2, WEST2]
    for i in (0, 2, 3, 1):  # narrator drawn last (in front)
        ti = t0 + i * 0.12
        pose = "hype" if hype_from is not None and tg > hype_from + i * 0.05 else "front"
        walker(d, tg, ti, ti + 0.75, -220 - i * 140, xs[i], y, s if i != 1 else s * 1.08, pals[i], after=pose,
               talk=(i == 1))


def s_hook(img, d, t, dur, tg):
    rays(d, tg, (255, 170, 60), (255, 110, 0))
    h2, h3 = at("hook2"), at("hook3")
    crew(d, tg, 0.0, hype_from=h3)
    if tg > h2:
        text(img, "STUDENTS", 150, W / 2, 270, color=WHITE, scale=pop(tg, h2), stroke=10, stroke_color=BG)
        text(img, "ON THE SCHOOL", 92, W / 2, 400, color=BG, scale=pop(tg, h2 + 0.35))
        text(img, "BOARD?!", 150, W / 2, 520, color=WHITE, scale=pop(tg, h2 + 0.7), stroke=10, stroke_color=BG)
    else:
        text(img, "WAIT...", 170, W / 2, 400, color=WHITE, scale=pop(tg, 0.15), stroke=10, stroke_color=BG)
    if tg > h3:
        spr = text_sprite("4 SEATS", 92, BG, "black", box=YEL, pad=26, radius=30).rotate(8, expand=True)
        paste(img, spr, W / 2 + 270, 680, pop(tg, h3))


def s_class(img, d, t, dur, tg):
    d.rectangle([0, 0, W, H], fill=(236, 226, 206))
    d.rectangle([0, 1290, W, H], fill=(196, 160, 120))
    d.rounded_rectangle([90, 250, W - 90, 760], radius=20, fill=(180, 186, 196))
    d.rounded_rectangle([110, 270, W - 110, 740], radius=14, fill=WHITE)
    text(img, "STUDENT IDEAS", 50, W / 2, 320, color=(60, 70, 110))
    notes = [(at("cls2"), 270, 470, (255, 230, 90), "LATER START"), (at("cls2", 0.36), 540, 450, (255, 170, 190), "PHONE RULES"),
             (at("cls2", 0.68), 810, 480, (160, 230, 170), "BETTER LUNCH")]
    c3 = at("cls3")
    dim = ease_out(prog(tg, c3 + 0.6, 0.5))
    for st, cx, cy, col, label in notes:
        if tg < st:
            continue
        c = mix(col, (205, 205, 205), dim * 0.8)
        note = Image.new("RGBA", (240, 170), c + (255,))
        sp = text_sprite(label, 40, (40, 40, 60), "black", max_w=210)
        note.paste(sp, (int(120 - sp.width / 2), int(85 - sp.height / 2)), sp)
        note = note.rotate((cx % 7) - 3, expand=True, resample=Image.BICUBIC)
        paste(img, note, cx, cy, pop(tg, st))
    if tg > c3 + 0.6:
        paste(img, text_sprite("WHO HEARS THEM?", 70, WHITE, "black", box=BG, pad=26, radius=30), W / 2, 640, pop(tg, c3 + 0.6))
    start = tg - t
    walker(d, tg, start + 0.25, start + 1.2, -200, 250, 1300, 0.82, WEST2, after="front", talk=False)
    walker(d, tg, start, start + 1.0, W + 200, 720, 1300, 0.95, NARR,
           after="point" if tg < c3 else "front", target=(W / 2, 450))


def s_dc(img, d, t, dur, tg):
    d.rectangle([0, 0, W, H], fill=BG)
    rise = ease_out(prog(t, 0, 0.6))
    base = 1290
    top = base - 620 * rise
    d.rectangle([430, top, 1040, base], fill=(70, 90, 140))
    for gx in range(450, 1020, 82):
        for gy in range(int(top + 20), base - 60, 82):
            d.rectangle([gx, gy, gx + 66, gy + 66], fill=(140, 190, 240))
    d.rectangle([660, base - 150, 800, base], fill=(40, 50, 80))
    d.rectangle([0, base, W, H], fill=(60, 70, 100))
    if t > 0.5:
        pin(d, 735, lerp(0, top - 30, ease_out(prog(t, 0.5, 0.45))), 56, ORANGE)
    if t > 0.9:
        paste(img, text_sprite("SPASD DISTRICT CENTER", 56, BG, "black", box=ORANGE, pad=22, radius=22), W / 2, 290, pop(t, 0.9))
    for st, label, cx, cy in [(at("dc", 0.45), "BUDGETS", 300, 420), (at("dc", 0.6), "POLICIES", 720, 420),
                              (at("dc", 0.75), "EVERY SCHOOL", W / 2, 520)]:
        if tg >= st:
            paste(img, text_sprite(label, 50, WHITE, "black", box=NAVY2, pad=20, radius=30), cx, cy, pop(tg, st))
    s0 = tg - t
    walker(d, tg, s0 + 0.2, s0 + 1.5, -260, 130, 1300, 0.78, WEST1, after="front", talk=False)
    walker(d, tg, s0, s0 + 1.3, -200, 320, 1300, 0.9, NARR, after="point", target=(735, 700))


def _icon(d, x, y, s, color):
    if s <= 1:
        return
    d.ellipse([x - s * 0.42, y - s * 1.5, x + s * 0.42, y - s * 0.66], fill=color)
    d.rounded_rectangle([x - s * 0.7, y - s * 0.55, x + s * 0.7, y + s * 0.6], radius=int(s * 0.5), fill=color)


def s_board(img, d, t, dur, tg):
    d.rectangle([0, 0, W, H], fill=BG)
    text(img, "BOARD OF EDUCATION", 74, W / 2, 240, color=WHITE, scale=pop(t, 0.0))
    cx, cy, R = W / 2, 1180, 400
    d.arc([cx - R, cy - R * 0.9, cx + R, cy + R * 0.9], 196, 344, fill=(150, 100, 60), width=60)
    seats = [(cx + (R + 80) * math.cos(math.radians(192 + i * 15.6)), cy + (R * 0.9 + 80) * math.sin(math.radians(192 + i * 15.6)))
             for i in range(11)]
    b1, b2, b3 = at("boe1"), at("boe2"), at("boe3")
    for k, idx in enumerate([2, 3, 4, 5, 6, 7, 8]):
        st = b1 + 0.4 + k * 0.15
        if tg >= st:
            _icon(d, seats[idx][0], seats[idx][1] + 30, 52 * pop(tg, st), (230, 232, 240))
    for k, (idx, col) in enumerate([(0, EAST_RED), (1, EAST_RED), (9, WEST_SKY), (10, WEST_SKY)]):
        st = b2 + 0.2 + k * 0.15
        if tg >= st:
            _icon(d, seats[idx][0], seats[idx][1] + 30, 62 * pop(tg, st), col)
    if tg > b1 + 0.4:
        paste(img, text_sprite("7 ELECTED MEMBERS", 60, WHITE, "black"), W / 2, 360, pop(tg, b1 + 0.4))
        paste(img, text_sprite("3-YEAR TERMS", 44, BG, "black", box=(230, 232, 240), pad=14, radius=18), W / 2, 440, pop(tg, at("boe1", 0.6)))
    if tg > b2:
        paste(img, text_sprite("+ 4 STUDENT MEMBERS", 62, BG, "black", box=ORANGE, pad=20, radius=24), W / 2, 550, pop(tg, b2))
        paste(img, text_sprite("2-YEAR TERMS", 44, ORANGE, "black"), W / 2, 635, pop(tg, at("boe2", 0.6)))
    if tg > b3:
        paste(img, text_sprite("2 EAST HIGH", 40, WHITE, "black", box=EAST_RED, pad=14, radius=16), 200, 1000, pop(tg, b3))
    if tg > at("boe3", 0.5):
        paste(img, text_sprite("2 WEST HIGH", 40, WEST_NAVY, "black", box=WEST_SKY, pad=14, radius=16), W - 200, 1000, pop(tg, at("boe3", 0.5)))


def s_sv(img, d, t, dur, tg):
    rays(d, tg, ORANGE, (255, 120, 0), n=14)
    paste(img, text_sprite("STUDENT VOICE", 64, ORANGE, "black", box=BG, pad=22, radius=26), W / 2, 250, pop(tg, at("sv")))
    w1, w2 = at("sv", 0.4), at("sv", 0.75)
    if tg > w1:
        text(img, "ABOUT US", 150, W / 2, 420, color=BG, scale=pop(tg, w1))
    if tg > w2:
        text(img, "WITH US", 170, W / 2, 580, color=WHITE, scale=pop(tg, w2), stroke=10, stroke_color=BG)
    crew(d, tg, tg - t - 5, hype_from=w2)  # already standing


def end_card(img, d, tg, t_show, y=1000):
    if tg < t_show:
        return
    paste(img, text_sprite("FOLLOW", 44, BG, "black", box=ORANGE, pad=16, radius=18), W / 2, y - 80, pop(tg, t_show))
    paste(img, text_sprite(HANDLE, 66, WHITE, "black", box=BG, pad=26, radius=30), W / 2, y + 20, pop(tg, t_show + 0.15))


def s_cta(img, d, t, dur, tg):
    d.rectangle([0, 0, W, H], fill=BG)
    rows = [(at("cta1", 0.05), "APPLY"), (at("cta1", 0.2), "JOIN"), (at("cta1", 0.55), "PULL UP")]
    subs = ["for a student board seat", "Student Voice", "to a board meeting"]
    for i, (st, big) in enumerate(rows):
        if tg < st:
            continue
        y = 300 + i * 190
        s = pop(tg, st)
        r = 56 * s
        d.ellipse([110 - r, y - r, 110 + r, y + r], fill=ORANGE)
        if s > 0.6:
            check(d, 110, y, 28, BG, 13)
        sx = lerp(W, 200, ease_out(prog(tg, st, 0.3)))
        paste(img, text_sprite(big, 80, WHITE, "black", align="left"), sx, y - 64, anchor="tl")
        paste(img, text_sprite(subs[i], 36, GREY, "bold", align="left", max_w=560), sx, y + 22, anchor="tl")
    c2 = at("cta2")
    if tg > c2:
        text(img, "YOUR VOICE COUNTS.", 76, W / 2, 870, color=ORANGE, scale=pop(tg, c2))
    end_card(img, d, tg, at("cta2", 0.45), y=1040)
    if tg > at("cta2", 0.45):
        text(img, "sunprairieschools.org", 34, W / 2, 1160, color=GREY, weight="bold")
    walker(d, tg, tg - t, tg - t + 1.0, W + 200, 960, 1300, 0.5, NARR, after="wave" if tg > c2 else "point", target=(300, 500))


def s_follow(img, d, t, dur, tg):  # teaser ending
    rays(d, tg, (30, 42, 84), BG, cy=900, n=16)
    f = at("fol")
    text(img, "WANT A SEAT?", 110, W / 2, 330, color=ORANGE, scale=pop(tg, f))
    end_card(img, d, tg, at("fol", 0.45), y=560)
    crew(d, tg, tg - t - 5, hype_from=at("fol", 0.5))


def overlay(img, d, tg):
    if "cls1" not in E_TL_KEYS():
        return
    if tg >= at("cls1") and not (at("sv") <= tg < at("cta1")):
        dark = at("cls1") <= tg < at("dc")
        pin(d, 74, 190, 20, ORANGE)
        paste(img, text_sprite("SUN PRAIRIE, WI", 34, BG if dark else WHITE, "black"), 105, 152, anchor="tl")


def E_TL_KEYS():
    import engine2
    return engine2._TL.keys()


VARIANT = "full"


def setup(variant=None):
    global LINES, VARIANT
    VARIANT = variant or VARIANT
    LINES = FULL if VARIANT == "full" else TEASER
    v, total = build_voice(LINES, "am_michael", 1.22 if VARIANT == "full" else 1.26, tail=1.8)
    compute_env(v, total)
    if VARIANT == "full":
        ids = [("hook1", s_hook), ("cls1", s_class), ("dc", s_dc), ("boe1", s_board), ("sv", s_sv), ("cta1", s_cta)]
    else:
        ids = [("hook1", s_hook), ("boe1", s_board), ("fol", s_follow)]
    scenes = []
    for i, (lid, fn) in enumerate(ids):
        s = 0 if i == 0 else at(lid) - 0.1
        e = (at(ids[i + 1][0]) - 0.1) if i + 1 < len(ids) else total
        scenes.append((s, e, fn))
    return v, total, scenes, build_chunks(LINES)


if __name__ == "__main__":
    out = sys.argv[1]
    v, total, scenes, chunks = setup(sys.argv[2] if len(sys.argv) > 2 else "full")
    print(VARIANT, "duration", round(total, 2))
    music = out.replace(".mp4", "_music.wav")
    hits = [at("hook3"), at("boe2")] + ([at("sv", 0.75)] if VARIANT == "full" else [])
    make_track(music, total, 128, [65.41, 49.0, 55.0, 43.65], cuts=[s for s, _, _ in scenes[1:]], impacts=hits, seed=11)
    mixwav = out.replace(".mp4", "_mix.wav")
    mix_audio(v, music, mixwav, total)
    render2(out, total, scenes, chunks, BG, mixwav, overlay=overlay, shakes=hits)
    print("done", out)
