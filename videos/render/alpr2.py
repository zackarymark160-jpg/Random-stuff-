"""SP-ALPR v2 — voiced, in-car dash-cam hook, driver walk-in, ~40s."""
import math
import sys

from PIL import Image, ImageDraw

import alpr as A
from engine2 import *  # noqa

BG = A.BG
CYAN, RED, YEL, WHITE, GREY, CARD = A.CYAN, A.RED, A.YEL, A.WHITE, A.GREY, A.CARD
ROAD_Y = A.ROAD_Y

DRIVER = {"skin": (226, 176, 134), "hair": (84, 56, 36), "top": (58, 84, 132), "pants": (36, 38, 48), "shoe": (25, 25, 28)}

LINES = [
    ("hook1", "This camera has probably read your license plate.", 0.0),
    ("hook2", "And Sun Prairie just made a big call about it.", 0.1),
    ("ride", "Let's ride.", 0.1),
    ("see", "See that? That's an A.L.P.R. An automatic license plate reader.", 0.1),
    ("snap", "It snaps every plate that passes,", 0.0),
    ("hot", "checks it against hotlists, like stolen cars and Amber Alerts,", 0.0),
    ("ping", "and pings police when there's a match.", 0.1),
    ("pd", "Police say it's helped in seventy-plus incidents in two years.", 0.15),
    ("flock", "But in September, the city announced it's dropping Flock, the company behind its nine cameras.", 0.05),
    ("dark", "Six go dark December thirty-first. The last three, in March.", 0.15),
    ("axon", "Next up might be Axon cameras, with new rules for your data. But that deal? Still pending.", 0.15),
    ("cta1", "Safety and privacy both matter. So pull up to a city meeting.", 0.05),
    ("cta2", "Full map and facts, at the link.", 0.0),
]


def driver_head_in_car(d, x, y, s):
    hx, hy = x - 30 * s, y - 98 * s
    d.ellipse([hx - 24 * s, hy - 24 * s, hx + 24 * s, hy + 24 * s], fill=DRIVER["skin"])
    d.chord([hx - 26 * s, hy - 30 * s, hx + 26 * s, hy + 12 * s], 180, 360, fill=DRIVER["hair"])


# ---------------------------------------------------------------- scenes
def s_car(img, d, t, dur, tg):
    A.street(img, d, 2000 + tg * 420)
    # interior frame
    d.polygon([(0, 0), (W, 0), (W, 150), (W / 2, 210), (0, 150)], fill=(24, 24, 30))
    d.polygon([(0, 0), (170, 0), (70, H), (0, H)], fill=(30, 30, 36))
    d.polygon([(W, 0), (W - 170, 0), (W - 70, H), (W, H)], fill=(30, 30, 36))
    d.rounded_rectangle([W / 2 - 170, 560, W / 2 + 170, 940], radius=60, fill=(46, 46, 54))  # headrest
    d.rectangle([W / 2 - 260, 900, W / 2 + 260, H], fill=(40, 40, 48))  # seat back
    person(d, W / 2, 1730, 1.62, DRIVER, "front", mouth_open=mouth(tg), backpack=False, blink=(int(tg * 10) % 31 == 0))
    d.line([(W / 2 + 150, 1010), (W / 2 - 150, 1500)], fill=(70, 70, 78), width=36)  # seatbelt
    d.ellipse([W / 2 - 380, 1260, W / 2 + 380, 1800], outline=(22, 22, 26), width=52)  # wheel
    d.rectangle([0, 1560, W, H], fill=(26, 26, 32))
    # hud
    if int(tg * 2) % 2 == 0:
        d.ellipse([200, 250, 232, 282], fill=RED)
    paste(img, text_sprite("DASH CAM", 34, WHITE, "black"), 250, 248, anchor="tl")
    text(img, "IT'S READ", 130, W / 2, 380, color=WHITE, scale=pop(tg, 0.15), stroke=10, stroke_color=BG)
    text(img, "YOUR PLATE", 130, W / 2, 510, color=RED, scale=pop(tg, 0.45), stroke=10, stroke_color=BG)
    h2 = at("hook2")
    if tg > h2:
        stamp(img, "BIG NEWS", W / 2 + 200, 650, YEL, tg, at("hook2", 0.55), angle=-8, size=72)


def s_drive(img, d, t, dur, tg):
    s0 = tg - t
    ts = at("see") + 0.3
    v, dec = 620, 1.5
    if tg < ts:
        scroll = v * (tg - s0)
        decel = 0
    else:
        p = prog(tg, ts, dec)
        scroll = v * (ts - s0) + v * dec * (p - p * p / 2)
        decel = v * dec * (p - p * p / 2)
    D = v * dec / 2
    A.street(img, d, 6000 + scroll)
    pole_x = 830 + (D - decel) if tg >= ts else 830 + D + 2000
    lens = A.alpr_pole(d, pole_x, ROAD_Y + 20, 1.0)
    cx = 340
    bounce = int(4 * math.sin(tg * 18)) if tg < ts + dec else 0
    A.car_side(d, cx, ROAD_Y + 140, 1.1, bounce=bounce)
    driver_head_in_car(d, cx, ROAD_Y + 140 + bounce, 1.1)
    if tg < at("see"):
        text(img, "LET'S", 140, W / 2, 330, scale=pop(tg, s0 + 0.05), stroke=8, stroke_color=BG)
        text(img, "RIDE", 170, W / 2, 480, color=CYAN, scale=pop(tg, s0 + 0.2), stroke=8, stroke_color=BG)
    else:
        if tg > ts + dec * 0.6:
            r = 120 + 10 * math.sin(tg * 8)
            cx2, cy2 = lens[0] + 50, lens[1] - 20
            d.ellipse([cx2 - r, cy2 - r, cx2 + r, cy2 + r], outline=RED, width=12)
            spr = text_sprite("ALPR CAMERA", 56, WHITE, "black", box=RED, pad=22, radius=20)
            paste(img, spr, min(W - spr.width / 2 - 30, cx2), cy2 + r + 55, pop(tg, ts + dec * 0.6))
        text(img, "SEE THAT?", 120, W / 2, 330, color=WHITE, scale=pop(tg, at("see")), stroke=8, stroke_color=BG)
        if tg > at("see", 0.45):
            paste(img, text_sprite("AUTOMATIC LICENSE PLATE READER", 44, BG, "black", box=CYAN, pad=18, radius=20, max_w=960),
                  W / 2, 450, pop(tg, at("see", 0.45)))


def s_how(img, d, t, dur, tg):
    d.rectangle([0, 0, W, H], fill=BG)
    text(img, "HOW IT WORKS", 84, W / 2, 262, color=CYAN, scale=pop(t, 0.0))
    steps = [(at("snap"), 0, "SNAPS EVERY PLATE", "every car that passes"),
             (at("hot"), 2, "CHECKS HOTLISTS", "stolen cars, Amber Alerts"),
             (at("ping"), 3, "MATCH = ALERT", "police get pinged")]
    top, ch, gap = 360, 250, 40
    for i, (st, icon, title, sub) in enumerate(steps):
        if tg < st:
            continue
        nxt = steps[i + 1][0] if i + 1 < len(steps) else 999
        active = st <= tg < nxt
        y0 = top + i * (ch + gap)
        x0 = lerp(W, 60, ease_out(prog(tg, st, 0.3)))
        border = (RED if i == 2 else CYAN) if active else (50, 58, 78)
        d.rounded_rectangle([x0, y0, x0 + W - 120, y0 + ch], radius=30, fill=CARD, outline=border, width=7)
        if icon == 0:
            d.rounded_rectangle([x0 + 70, y0 + ch / 2 - 40, x0 + 210, y0 + ch / 2 + 40], radius=10, fill=WHITE)
            text(img, "ABC 1234", 30, x0 + 140, y0 + ch / 2 + 2, color=(20, 40, 110))
            A.brackets(d, (x0 + 55, y0 + ch / 2 - 56, x0 + 225, y0 + ch / 2 + 56), CYAN if active else GREY, 22, 7)
        else:
            A.icon_step(img, d, icon, x0 + 140, y0 + ch / 2, tg, active)
        paste(img, text_sprite(title, 54, WHITE if active else (180, 186, 200), "black", max_w=700, align="left"), x0 + 260, y0 + 66, anchor="tl")
        paste(img, text_sprite(sub, 40, (170, 178, 196), "semi", max_w=700, align="left"), x0 + 260, y0 + 146, anchor="tl")


def s_pd(img, d, t, dur, tg):
    d.rectangle([0, 0, W, H], fill=BG)
    base = 820 + (1 - ease_out(prog(t, 0, 0.45))) * 300
    A.building(d, W / 2, base, 640, 420, (52, 70, 120))
    d.rectangle([W / 2 - 100, base - 150, W / 2 + 100, base], fill=(30, 40, 70))
    paste(img, text_sprite("POLICE", 64, WHITE, "black", box=(20, 30, 60), pad=16, radius=12), W / 2, base - 455)
    on = int(tg * 6) % 2
    d.rounded_rectangle([W / 2 - 120, base - 530, W / 2, base - 500], radius=10, fill=RED if on else (90, 20, 30))
    d.rounded_rectangle([W / 2, base - 530, W / 2 + 120, base - 500], radius=10, fill=(40, 120, 255) if not on else (20, 40, 90))
    d.rectangle([0, base, W, base + 12], fill=(90, 96, 110))
    st = at("pd", 0.4)
    if tg > st:
        n = int(lerp(0, 70, ease_out(prog(tg, st, 0.9))))
        text(img, f"{n}+", 240, W / 2, 1010, color=YEL, scale=pop(tg, st))
        text(img, "incidents in 2 years (per police)", 46, W / 2, 1170, weight="bold", max_w=900)


def s_ch(img, d, t, dur, tg):
    d.rectangle([0, 0, W, H], fill=BG)
    base = 520
    d.polygon([(W / 2 - 300, base - 230), (W / 2, base - 310), (W / 2 + 300, base - 230)], fill=(200, 196, 186))
    d.rectangle([W / 2 - 300, base - 230, W / 2 + 300, base - 205], fill=(180, 176, 166))
    for k in range(6):
        x = W / 2 - 250 + k * 100
        d.rectangle([x - 18, base - 205, x + 18, base - 30], fill=(225, 222, 212))
    d.rectangle([W / 2 - 320, base - 30, W / 2 + 320, base], fill=(180, 176, 166))
    paste(img, text_sprite("CITY HALL", 40, BG, "black", box=YEL, pad=14, radius=12), W / 2, base + 42)
    fy = 680
    paste(img, text_sprite("FLOCK", 72, WHITE, "black", box=(44, 52, 74), pad=24, radius=24), W / 2 - 140, fy, pop(tg, at("flock", 0.3)))
    stamp(img, "DROPPED", W / 2 + 200, fy, RED, tg, at("flock", 0.5), angle=-8, size=66)
    t9 = at("flock", 0.82)
    t6, t3 = at("dark", 0.05), at("dark", 0.62)
    for i in range(9):
        r, c = divmod(i, 3)
        cx, cy = W / 2 - 280 + c * 280, 870 + r * 120
        if tg < t9 + i * 0.05:
            continue
        off = (i < 6 and tg > t6) or (i >= 6 and tg > t3)
        A.cam_icon(d, cx, cy, 1.0, (70, 76, 92) if off else CYAN)
        if off:
            xmark(d, cx - 10, cy, 30, RED, 10)
    if tg > t9:
        paste(img, text_sprite("9 CAMERAS", 40, CYAN, "black"), W / 2, 805, pop(tg, t9))
    if tg > t6:
        paste(img, text_sprite("6 OFF: DEC 31, 2026", 32, WHITE, "black", box=RED, pad=12, radius=12), W / 2 - 235, 1195, pop(tg, t6))
    if tg > t3:
        paste(img, text_sprite("3 OFF: MAR 31, 2027", 32, WHITE, "black", box=RED, pad=12, radius=12), W / 2 + 235, 1195, pop(tg, t3))


def s_axon(img, d, t, dur, tg):
    d.rectangle([0, 0, W, H], fill=BG)
    text(img, "NEXT UP?", 70, W / 2, 270, color=GREY, scale=pop(t, 0.0))
    text(img, "AXON", 200, W / 2, 440, color=WHITE, scale=pop(tg, at("axon", 0.15)))
    text(img, "CAMERAS", 110, W / 2, 590, color=CYAN, scale=pop(tg, at("axon", 0.2)))
    st = at("axon", 0.4)
    if tg > st:
        card = Image.new("RGBA", (920, 170), (0, 0, 0, 0))
        cd = ImageDraw.Draw(card)
        cd.rounded_rectangle([0, 0, 919, 169], radius=30, fill=CARD + (255,))
        lock(cd, 100, 95, 46, CYAN)
        sp = text_sprite("New rules for how long data is kept + who sees it", 42, WHITE, "black", max_w=700, align="left")
        card.paste(sp, (190, int(85 - sp.height / 2)), sp)
        paste(img, card, W / 2, 860, pop(tg, st))
    stamp(img, "PENDING", W / 2, 1110, YEL, tg, at("axon", 0.86), angle=-6, size=110)


def s_cta(img, d, t, dur, tg):
    d.rectangle([0, 0, W, H], fill=BG)
    # city hall silhouette backdrop
    base = 1300
    d.polygon([(80, base - 380), (420, base - 470), (760, base - 380)], fill=(36, 44, 66))
    for k in range(6):
        x = 140 + k * 112
        d.rectangle([x - 20, base - 370, x + 20, base - 30], fill=(40, 50, 74))
    d.rectangle([60, base - 30, 780, base], fill=(36, 44, 66))
    d.rectangle([0, base, W, H], fill=(30, 36, 54))
    # scale
    cx, cy = W / 2, 330
    tilt = math.sin(tg * 2.2) * 0.05
    d.rectangle([cx - 7, cy - 90, cx + 7, cy + 90], fill=WHITE)
    lx, ly, rx, ry = cx - 220, cy - 70 - 220 * tilt, cx + 220, cy - 70 + 220 * tilt
    d.line([(lx, ly), (rx, ry)], fill=WHITE, width=10)
    for (px, py, label, col) in [(lx, ly, "SAFETY", CYAN), (rx, ry, "PRIVACY", YEL)]:
        d.line([(px, py), (px - 60, py + 90)], fill=(200, 200, 210), width=4)
        d.line([(px, py), (px + 60, py + 90)], fill=(200, 200, 210), width=4)
        d.chord([px - 95, py + 40, px + 95, py + 140], 0, 180, fill=col)
        text(img, label, 38, px, py + 180, color=col, scale=pop(t, 0.2))
    m = at("cta1", 0.5)
    if tg > m:
        text(img, "PULL UP TO A", 64, W / 2, 620, scale=pop(tg, m))
        text(img, "CITY MEETING", 92, W / 2, 710, color=CYAN, scale=pop(tg, m + 0.15))
    u = at("cta2")
    if tg > u:
        paste(img, text_sprite("sunprairiealpr.netlify.app", 50, BG, "black", box=CYAN, pad=24, radius=26), W / 2, 850,
              pop(tg, u) * (1 + 0.03 * math.sin(tg * 6)))
        text(img, "Facts: City of Sun Prairie + local news, Sept 2026. Illustrative graphics.", 24, W / 2, 935, color=GREY, weight="semi", max_w=900)
    walker(d, tg, tg - t + 0.2, tg - t + 1.5, W + 220, 850, 1310, 0.62, DRIVER, after="point", target=(W / 2, 850), backpack=False)


def overlay(img, d, tg):
    if tg >= at("ride") - 0.1:
        pin(d, 74, 190, 20, RED)
        paste(img, text_sprite("SUN PRAIRIE, WI", 34, WHITE, "black"), 105, 152, anchor="tl")


def setup():
    v, total = build_voice(LINES, "am_puck", 1.12)
    compute_env(v, total)
    ids = [("hook1", s_car), ("ride", s_drive), ("snap", s_how), ("pd", s_pd), ("flock", s_ch), ("axon", s_axon), ("cta1", s_cta)]
    scenes = []
    for i, (lid, fn) in enumerate(ids):
        s = 0 if i == 0 else at(lid) - 0.1
        e = (at(ids[i + 1][0]) - 0.1) if i + 1 < len(ids) else total
        scenes.append((s, e, fn))
    return v, total, scenes, build_chunks(LINES)


if __name__ == "__main__":
    out = sys.argv[1]
    v, total, scenes, chunks = setup()
    print("duration", round(total, 2))
    music = out.replace(".mp4", "_music.wav")
    hits = [at("hook2", 0.55), at("flock", 0.5), at("axon", 0.86)]
    make_track(music, total, 124, [55.0, 43.65, 65.41, 49.0], cuts=[s for s, _, _ in scenes[1:]], impacts=hits, seed=7)
    mixwav = out.replace(".mp4", "_mix.wav")
    mix_audio(v, music, mixwav, total)
    render2(out, total, scenes, chunks, BG, mixwav, overlay=overlay, shakes=hits)
    print("done", out)
