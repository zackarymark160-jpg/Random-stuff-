"""SPASD Student Voice v2 — voiced, walk-ins, ~37s."""
import math
import sys

from PIL import Image, ImageDraw

import engine2 as E
from engine2 import *  # noqa

BG = (16, 24, 52)
NAVY2 = (28, 40, 80)
ORANGE = (255, 138, 0)
SKY = (110, 180, 255)
WHITE = (255, 255, 255)
GREY = (150, 160, 185)
YEL = (255, 214, 0)

STUDENT = {"skin": (141, 85, 54), "hair": (28, 20, 18), "top": ORANGE, "pants": (34, 40, 70),
           "shoe": (245, 245, 245), "bag": (30, 60, 140)}

LINES = [
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
    ("cta2", "Your voice counts.", 0.0),
]


# ---------------------------------------------------------------- scenes
def s_hook(img, d, t, dur, tg):
    # spotlight gradient
    for y in range(0, H, 10):
        d.rectangle([0, y, W, y + 10], fill=mix((255, 170, 60), (255, 110, 0), y / H))
    # radial burst lines
    cx, cy = W / 2, 560
    for k in range(18):
        a = k / 18 * 2 * math.pi + tg * 0.4
        d.polygon([(cx, cy), (cx + math.cos(a) * 1600, cy + math.sin(a) * 1600),
                   (cx + math.cos(a + 0.09) * 1600, cy + math.sin(a + 0.09) * 1600)], fill=(255, 158, 40))
    walker(d, tg, 0.0, 0.7, -200, W / 2, 1290, 1.05, STUDENT, after="front" if tg < at("hook3") else "point",
           target=(W / 2 + 300, 200))
    h2 = at("hook2")
    if tg > h2:
        text(img, "STUDENTS", 150, W / 2, 260, color=WHITE, scale=pop(tg, h2), stroke=10, stroke_color=BG)
        text(img, "ON THE SCHOOL", 92, W / 2, 390, color=BG, scale=pop(tg, h2 + 0.35))
        text(img, "BOARD?!", 150, W / 2, 510, color=WHITE, scale=pop(tg, h2 + 0.7), stroke=10, stroke_color=BG)
    else:
        text(img, "WAIT...", 170, W / 2, 380, color=WHITE, scale=pop(tg, 0.15), stroke=10, stroke_color=BG)
    h3 = at("hook3")
    if tg > h3:
        spr = text_sprite("4 SEATS", 92, BG, "black", box=YEL, pad=26, radius=30).rotate(8, expand=True)
        paste(img, spr, W / 2 + 290, 680, pop(tg, h3))


def s_class(img, d, t, dur, tg):
    d.rectangle([0, 0, W, H], fill=(236, 226, 206))
    d.rectangle([0, 1290, W, H], fill=(196, 160, 120))
    d.rounded_rectangle([90, 250, W - 90, 760], radius=20, fill=(180, 186, 196))
    d.rounded_rectangle([110, 270, W - 110, 740], radius=14, fill=WHITE)
    text(img, "STUDENT IDEAS", 50, W / 2, 320, color=(60, 70, 110))
    s2, e2 = L("cls2")
    notes = [(s2, 270, 470, (255, 230, 90), "LATER START"), (at("cls2", 0.36), 540, 450, (255, 170, 190), "PHONE RULES"),
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
        spr = text_sprite("WHO HEARS THEM?", 70, WHITE, "black", box=BG, pad=26, radius=30)
        paste(img, spr, W / 2, 640, pop(tg, c3 + 0.6))
    start = tg - t  # scene start (global)
    walker(d, tg, start, start + 1.0, W + 200, 700, 1300, 0.95, STUDENT,
           after="point" if tg < c3 else "front", target=(W / 2, 450))


def s_dc(img, d, t, dur, tg):
    d.rectangle([0, 0, W, H], fill=BG)
    for i in range(40):  # stars-ish dots
        d.ellipse([(i * 211) % W, (i * 137) % 900, (i * 211) % W + 4, (i * 137) % 900 + 4], fill=(60, 74, 120))
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
    chips = [(at("dc", 0.45), "BUDGETS", 300, 420), (at("dc", 0.6), "POLICIES", 720, 420), (at("dc", 0.75), "EVERY SCHOOL", W / 2, 520)]
    for st, label, cx, cy in chips:
        if tg >= st:
            paste(img, text_sprite(label, 50, WHITE, "black", box=NAVY2, pad=20, radius=30), cx, cy, pop(tg, st))
    walker(d, tg, tg - t, tg - t + 1.3, -200, 260, 1300, 0.9, STUDENT, after="point", target=(735, 700))


def s_board(img, d, t, dur, tg):
    d.rectangle([0, 0, W, H], fill=BG)
    text(img, "BOARD OF EDUCATION", 74, W / 2, 230, color=WHITE, scale=pop(t, 0.0))
    cx, cy, R = W / 2, 1180, 400
    d.arc([cx - R, cy - R * 0.9, cx + R, cy + R * 0.9], 196, 344, fill=(150, 100, 60), width=60)
    seats = []
    for i in range(11):
        a = math.radians(192 + i * (156 / 10))
        seats.append((cx + (R + 80) * math.cos(a), cy + (R * 0.9 + 80) * math.sin(a)))
    elected = [2, 3, 4, 5, 6, 7, 8]
    students = [0, 1, 9, 10]
    b1, b2, b3 = at("boe1"), at("boe2"), at("boe3")
    for k, idx in enumerate(elected):
        st = b1 + 0.6 + k * 0.17
        if tg >= st:
            sx, sy = seats[idx]
            E.engine_person_icon(d, sx, sy + 30, 52 * pop(tg, st), SKY)
    for k, idx in enumerate(students):
        st = b2 + 0.2 + k * 0.15
        if tg >= st:
            sx, sy = seats[idx]
            E.engine_person_icon(d, sx, sy + 30, 60 * pop(tg, st), ORANGE)
    if tg > b1 + 0.6:
        paste(img, text_sprite("7 ELECTED MEMBERS", 60, SKY, "black"), W / 2, 350, pop(tg, b1 + 0.6))
        paste(img, text_sprite("3-YEAR TERMS", 44, BG, "black", box=SKY, pad=14, radius=18), W / 2, 430, pop(tg, at("boe1", 0.7)))
    if tg > b2:
        paste(img, text_sprite("+ 4 STUDENT MEMBERS", 62, BG, "black", box=ORANGE, pad=20, radius=24), W / 2, 540, pop(tg, b2))
        paste(img, text_sprite("2-YEAR TERMS", 44, ORANGE, "black"), W / 2, 625, pop(tg, at("boe2", 0.6)))
    if tg > b3:
        paste(img, text_sprite("2 EAST HIGH", 40, WHITE, "black", box=(200, 40, 50), pad=14, radius=16), 200, 1000, pop(tg, b3))
    if tg > at("boe3", 0.5):
        paste(img, text_sprite("2 WEST HIGH", 40, WHITE, "black", box=(30, 110, 200), pad=14, radius=16), W - 200, 1000, pop(tg, at("boe3", 0.5)))


def s_sv(img, d, t, dur, tg):
    d.rectangle([0, 0, W, H], fill=ORANGE)
    for k in range(14):
        a = k / 14 * 2 * math.pi - tg * 0.3
        d.polygon([(W / 2, 560), (W / 2 + math.cos(a) * 1600, 560 + math.sin(a) * 1600),
                   (W / 2 + math.cos(a + 0.12) * 1600, 560 + math.sin(a + 0.12) * 1600)], fill=(255, 152, 30))
    paste(img, text_sprite("STUDENT VOICE", 64, ORANGE, "black", box=BG, pad=22, radius=26), W / 2, 250, pop(tg, at("sv")))
    w1, w2 = at("sv", 0.4), at("sv", 0.75)
    if tg > w1:
        text(img, "ABOUT US", 150, W / 2, 420, color=BG, scale=pop(tg, w1))
    if tg > w2:
        text(img, "WITH US", 170, W / 2, 580, color=WHITE, scale=pop(tg, w2), stroke=10, stroke_color=BG)
    person(d, W / 2, 1300, 0.95, STUDENT, "hype" if tg > w2 else "front", mouth_open=mouth(tg), wave_t=tg)


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
        text(img, "YOUR VOICE", 96, W / 2, 900, color=ORANGE, scale=pop(tg, c2))
        text(img, "COUNTS.", 96, W / 2, 1005, color=ORANGE, scale=pop(tg, c2 + 0.25))
    if tg > c2 + 0.8:
        paste(img, text_sprite("sunprairieschools.org", 46, BG, "black", box=WHITE, pad=20, radius=24), W / 2, 1130, pop(tg, c2 + 0.8))
    walker(d, tg, tg - t, tg - t + 1.0, W + 200, 940, 1300, 0.55, STUDENT, after="wave" if tg > c2 else "point",
           target=(300, 500))


# small icon person used for board seats
def _icon(d, x, y, s, color):
    if s <= 1:
        return
    d.ellipse([x - s * 0.42, y - s * 1.5, x + s * 0.42, y - s * 0.66], fill=color)
    d.rounded_rectangle([x - s * 0.7, y - s * 0.55, x + s * 0.7, y + s * 0.6], radius=int(s * 0.5), fill=color)


E.engine_person_icon = _icon


def overlay(img, d, tg):
    if tg >= at("cls1") and not (at("sv") <= tg < at("cta1")):
        dark = at("cls1") <= tg < at("dc")
        pin(d, 74, 190, 20, ORANGE)
        paste(img, text_sprite("SUN PRAIRIE, WI", 34, BG if dark else WHITE, "black"), 105, 152, anchor="tl")


def setup():
    v, total = build_voice(LINES, "af_heart", 1.12)
    compute_env(v, total)
    scene_ids = [("hook1", s_hook), ("cls1", s_class), ("dc", s_dc), ("boe1", s_board), ("sv", s_sv), ("cta1", s_cta)]
    scenes = []
    for i, (lid, fn) in enumerate(scene_ids):
        s = 0 if i == 0 else at(lid) - 0.1
        e = (at(scene_ids[i + 1][0]) - 0.1) if i + 1 < len(scene_ids) else total
        scenes.append((s, e, fn))
    chunks = build_chunks(LINES)
    return v, total, scenes, chunks


if __name__ == "__main__":
    out = sys.argv[1]
    v, total, scenes, chunks = setup()
    print("duration", round(total, 2))
    music = out.replace(".mp4", "_music.wav")
    make_track(music, total, 128, [65.41, 49.0, 55.0, 43.65], cuts=[s for s, _, _ in scenes[1:]],
               impacts=[at("hook2"), at("hook3"), at("boe2"), at("sv", 0.75)], seed=11)
    mixwav = out.replace(".mp4", "_mix.wav")
    mix_audio(v, music, mixwav, total)
    render2(out, total, scenes, chunks, BG, mixwav, overlay=overlay,
            shakes=[at("hook3"), at("boe2"), at("sv", 0.75)])
    print("done", out)
