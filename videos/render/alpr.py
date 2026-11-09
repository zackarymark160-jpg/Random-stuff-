"""SP-ALPR: 'It's Read Your Plate' — 55s vertical motion-graphics video."""
import random
import sys

from PIL import Image, ImageDraw

from engine import *  # noqa

BG = (14, 18, 28)
CYAN = (0, 229, 255)
RED = (255, 59, 72)
YEL = (255, 204, 0)
WHITE = (255, 255, 255)
GREY = (120, 128, 145)
CARD = (28, 34, 50)

ROAD_Y = 1000  # top of road
DUR = 55

# ---------------------------------------------------------------- pre-rendered city strip
STRIP_W = 2600
random.seed(4)


def build_strip():
    far = Image.new("RGBA", (STRIP_W, 600), (0, 0, 0, 0))
    near = Image.new("RGBA", (STRIP_W, 700), (0, 0, 0, 0))
    fd, nd = ImageDraw.Draw(far), ImageDraw.Draw(near)
    x = 0
    while x < STRIP_W:
        w, h = random.randint(140, 260), random.randint(180, 420)
        c = random.choice([(34, 42, 62), (40, 48, 70), (30, 36, 54)])
        fd.rectangle([x, 600 - h, x + w, 600], fill=c)
        for wy in range(600 - h + 30, 590, 55):
            for wx in range(x + 22, x + w - 30, 48):
                if random.random() < 0.55:
                    fd.rectangle([wx, wy, wx + 22, wy + 28], fill=(255, 214, 120) if random.random() < 0.5 else (60, 72, 100))
        x += w + random.randint(8, 30)
    x = 0
    while x < STRIP_W:
        kind = random.random()
        if kind < 0.45:  # storefront
            w, h = random.randint(200, 300), random.randint(230, 330)
            c = random.choice([(150, 70, 60), (120, 90, 70), (90, 100, 120), (160, 120, 80)])
            nd.rectangle([x, 700 - h, x + w, 700], fill=c)
            nd.rectangle([x, 700 - h, x + w, 700 - h + 26], fill=tuple(v - 30 for v in c))
            nd.rectangle([x + 20, 700 - 150, x + w - 20, 700 - 20], fill=(255, 220, 150))
            nd.rectangle([x + 20, 700 - 175, x + w - 20, 700 - 150], fill=random.choice([(220, 60, 60), (40, 140, 90), (40, 90, 170)]))
            x += w + random.randint(10, 40)
        elif kind < 0.8:  # tree
            tx = x + 60
            nd.rectangle([tx - 10, 560, tx + 10, 700], fill=(80, 55, 40))
            for (ox, oy, r) in [(0, 500, 70), (-45, 540, 55), (45, 540, 55)]:
                nd.ellipse([tx + ox - r, oy - r, tx + ox + r, oy + r], fill=random.choice([(214, 120, 40), (196, 80, 40), (60, 120, 70)]))
            x += 140
        else:  # lamp post
            nd.rectangle([x + 20, 420, x + 30, 700], fill=(70, 76, 90))
            nd.rectangle([x + 20, 420, x + 80, 430], fill=(70, 76, 90))
            nd.ellipse([x + 62, 424, x + 92, 446], fill=(255, 230, 160))
            x += 120
    return far, near


FAR, NEAR = build_strip()

SKY = Image.new("RGB", (W, H), BG)
_sd = ImageDraw.Draw(SKY)
for y in range(0, ROAD_Y):
    p = y / ROAD_Y
    _sd.line([(0, y), (W, y)], fill=mix((10, 14, 30), (52, 40, 78), p))


def strip_paste(img, layer, offset, y):
    off = int(offset) % STRIP_W
    a = layer.crop((off, 0, min(STRIP_W, off + W), layer.height))
    img.paste(a, (0, y), a)
    if a.width < W:
        b = layer.crop((0, 0, W - a.width, layer.height))
        img.paste(b, (a.width, y), b)


def street(img, d, scroll):
    img.paste(SKY, (0, 0))
    strip_paste(img, FAR, scroll * 0.35, ROAD_Y - 600 - 40)
    strip_paste(img, NEAR, scroll, ROAD_Y - 700)
    d.rectangle([0, ROAD_Y, W, ROAD_Y + 40], fill=(90, 96, 110))  # sidewalk
    d.rectangle([0, ROAD_Y + 40, W, ROAD_Y + 300], fill=(38, 40, 48))  # road
    off = int(scroll * 1.3) % 200
    for x in range(-off, W + 200, 200):
        d.rectangle([x, ROAD_Y + 165, x + 110, ROAD_Y + 177], fill=(230, 210, 120))
    d.rectangle([0, ROAD_Y + 300, W, H], fill=BG)


def car_side(d, x, y, s=1.0, body=(225, 60, 70), bounce=0):
    y += bounce
    d.rounded_rectangle([x - 190 * s, y - 70 * s, x + 190 * s, y + 20 * s], radius=int(34 * s), fill=body)
    d.polygon([(x - 110 * s, y - 70 * s), (x - 60 * s, y - 135 * s), (x + 80 * s, y - 135 * s), (x + 135 * s, y - 70 * s)], fill=body)
    d.polygon([(x - 92 * s, y - 74 * s), (x - 52 * s, y - 124 * s), (x + 5 * s, y - 124 * s), (x + 5 * s, y - 74 * s)], fill=(150, 200, 230))
    d.polygon([(x + 18 * s, y - 74 * s), (x + 18 * s, y - 124 * s), (x + 74 * s, y - 124 * s), (x + 116 * s, y - 74 * s)], fill=(150, 200, 230))
    d.rectangle([x + 170 * s, y - 50 * s, x + 192 * s, y - 30 * s], fill=(255, 240, 180))  # headlight
    d.rectangle([x - 192 * s, y - 50 * s, x - 176 * s, y - 28 * s], fill=(255, 60, 60))  # taillight
    d.rectangle([x - 196 * s, y - 20 * s, x - 182 * s, y + 4 * s], fill=WHITE)  # plate edge
    for wx in (x - 110 * s, x + 110 * s):
        d.ellipse([wx - 46 * s, y - 26 * s, wx + 46 * s, y + 66 * s], fill=(20, 20, 24))
        d.ellipse([wx - 20 * s, y - 0 * s, wx + 20 * s, y + 40 * s], fill=(150, 150, 160))


def car_rear(img, d, cx, cy, s=1.0, plate="ABC 1234"):
    body = (225, 60, 70)
    d.polygon([(cx - 200 * s, cy - 120 * s), (cx - 150 * s, cy - 260 * s), (cx + 150 * s, cy - 260 * s), (cx + 200 * s, cy - 120 * s)], fill=(190, 45, 55))
    d.polygon([(cx - 170 * s, cy - 130 * s), (cx - 130 * s, cy - 240 * s), (cx + 130 * s, cy - 240 * s), (cx + 170 * s, cy - 130 * s)], fill=(120, 170, 210))
    d.rounded_rectangle([cx - 290 * s, cy - 130 * s, cx + 290 * s, cy + 110 * s], radius=int(50 * s), fill=body)
    for sx in (-1, 1):
        d.rounded_rectangle([cx + sx * 270 * s - 70 * s, cy - 90 * s, cx + sx * 270 * s + 0 * s if sx < 0 else cx + sx * 270 * s + 70 * s, cy - 30 * s], radius=12, fill=(255, 40, 50))
    d.rounded_rectangle([cx - 290 * s, cy + 60 * s, cx + 290 * s, cy + 130 * s], radius=int(30 * s), fill=(40, 40, 46))
    for sx in (-1, 1):
        d.rounded_rectangle([cx + sx * 215 * s - 50 * s, cy + 100 * s, cx + sx * 215 * s + 50 * s, cy + 190 * s], radius=16, fill=(20, 20, 24))
    pw, ph = 230 * s, 115 * s
    d.rounded_rectangle([cx - pw / 2, cy - 25 * s, cx + pw / 2, cy - 25 * s + ph], radius=12, fill=(245, 245, 240), outline=(30, 60, 140), width=6)
    text(img, plate, int(44 * s), cx, cy - 25 * s + ph / 2 + 4, color=(20, 40, 110), weight="black")


def brackets(d, box, color, L=40, w=10):
    x0, y0, x1, y1 = box
    for (x, y, dx, dy) in [(x0, y0, 1, 1), (x1, y0, -1, 1), (x0, y1, 1, -1), (x1, y1, -1, -1)]:
        d.line([(x, y), (x + dx * L, y)], fill=color, width=w)
        d.line([(x, y), (x, y + dy * L)], fill=color, width=w)


def alpr_pole(d, x, base_y, s=1.0):
    d.rectangle([x - 9 * s, base_y - 520 * s, x + 9 * s, base_y], fill=(110, 116, 130))
    d.rectangle([x - 120 * s, base_y - 520 * s, x + 9 * s, base_y - 505 * s], fill=(110, 116, 130))
    # solar panel
    d.polygon([(x - 10 * s, base_y - 600 * s), (x + 90 * s, base_y - 640 * s), (x + 110 * s, base_y - 590 * s), (x + 10 * s, base_y - 550 * s)], fill=(30, 60, 130), outline=(160, 180, 220))
    d.line([(x, base_y - 520 * s), (x + 20 * s, base_y - 560 * s)], fill=(110, 116, 130), width=int(8 * s))
    # camera
    d.rounded_rectangle([x - 175 * s, base_y - 545 * s, x - 75 * s, base_y - 480 * s], radius=int(12 * s), fill=(18, 18, 22))
    d.ellipse([x - 190 * s, base_y - 530 * s, x - 150 * s, base_y - 494 * s], fill=CYAN)
    return (x - 170 * s, base_y - 512 * s)  # lens position


# ---------------------------------------------------------------- scenes
def s_hook(img, d, t, dur):
    d.rectangle([0, 0, W, H], fill=(8, 10, 16))
    for i in range(0, H, 6):  # subtle scanlines
        d.line([(0, i), (W, i)], fill=(12, 15, 22))
    car_rear(img, d, W / 2, 860, 1.25)
    if t > 0.55:
        bx = (W / 2 - 175, 860 - 50, W / 2 + 175, 860 + 140)
        brackets(d, bx, CYAN, 46, 10)
        p = prog(t, 0.55, 0.6)
        y = lerp(bx[1], bx[3], (p * 2) % 1) if p < 1 else None
        if y:
            d.line([(bx[0], y), (bx[2], y)], fill=CYAN, width=6)
        if t > 1.1:
            text(img, "PLATE READ", 40, W / 2, bx[3] + 60, color=CYAN, weight="black", scale=pop(t, 1.1))
    text(img, "IT'S READ", 140, W / 2, 330, color=WHITE, scale=pop(t, 0.05))
    text(img, "YOUR PLATE", 140, W / 2, 480, color=RED, scale=pop(t, 0.25))
    # REC dot
    if int(t * 2) % 2 == 0:
        d.ellipse([70, 160, 102, 192], fill=RED)
    text(img, "REC", 40, 150, 178, color=WHITE, weight="bold")


def s_drive(img, d, t, dur):
    street(img, d, t * 520)
    car_side(d, W / 2, ROAD_Y + 140, 1.1, bounce=int(4 * math.sin(t * 18)))
    text(img, "LET'S GO", 120, W / 2, 330, scale=pop(t, 0.1))
    text(img, "FIND ONE", 120, W / 2, 470, color=CYAN, scale=pop(t, 0.3))


def s_pole(img, d, t, dur):
    # car decelerates: scroll distance with ease-out to a stop at 2.2s
    p = ease_out(prog(t, 0, 2.2))
    scroll = 5000 + p * 900
    street(img, d, scroll)
    pole_x = lerp(W + 300, 820, p)
    lens = alpr_pole(d, pole_x, ROAD_Y + 20, 1.0)
    car_side(d, 360, ROAD_Y + 140, 1.1)
    if t > 2.6:  # scan cone
        k = (t - 2.6) % 1.4
        if k < 0.7:
            a = 1 - k / 0.7
            cone = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            cd = ImageDraw.Draw(cone)
            cd.polygon([lens, (120, ROAD_Y + 60), (600, ROAD_Y + 220)], fill=(0, 229, 255, int(90 * a)))
            img.paste(cone, (0, 0), cone)
    if t > 2.3:
        r = 120 + 10 * math.sin(t * 8)
        cx, cy = lens[0] + 50, lens[1] - 20
        d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=RED, width=12)
        spr = text_sprite("ALPR CAMERA", 56, WHITE, "black", box=RED, pad=22, radius=20)
        paste(img, spr, min(W - spr.width / 2 - 30, cx), cy + r + 55, pop(t, 2.4))
    text(img, "RIGHT", 120, 300, 280, scale=pop(t, 0.2))
    text(img, "THERE.", 120, 300, 410, color=RED, scale=pop(t, 0.4))


STEPS = [
    (0.0, "SNAPS A PHOTO", "of every car that passes"),
    (2.5, "READS THE PLATE", "turns the image into text"),
    (4.5, "CHECKS HOTLISTS", "stolen cars, Amber Alerts, wanted"),
    (7.5, "MATCH = ALERT", "police get notified"),
]


def icon_step(img, d, i, cx, cy, t, active):
    col = CYAN if active else GREY
    if i == 0:
        d.rounded_rectangle([cx - 55, cy - 38, cx + 55, cy + 42], radius=14, fill=col)
        d.rectangle([cx - 20, cy - 52, cx + 20, cy - 36], fill=col)
        d.ellipse([cx - 26, cy - 22, cx + 26, cy + 30], fill=CARD)
        d.ellipse([cx - 14, cy - 10, cx + 14, cy + 18], fill=col)
    elif i == 1:
        d.rounded_rectangle([cx - 70, cy - 34, cx + 70, cy + 34], radius=10, fill=WHITE)
        text(img, "ABC 1234", 26, cx, cy + 2, color=(20, 40, 110))
        brackets(d, (cx - 84, cy - 48, cx + 84, cy + 48), col, 20, 6)
    elif i == 2:
        for k in range(3):
            y = cy - 40 + k * 38
            d.rounded_rectangle([cx - 60, y - 12, cx + 60, y + 14], radius=6, fill=col if active and int(t * 6) % 3 == k else (70, 78, 96))
    else:
        c = RED if active else GREY
        if active and int(t * 5) % 2 == 0:
            d.ellipse([cx - 80, cy - 80, cx + 80, cy + 80], fill=(90, 20, 30))
        d.pieslice([cx - 50, cy - 60, cx + 50, cy + 40], 180, 360, fill=c)
        d.rectangle([cx - 50, cy - 10, cx + 50, cy + 30], fill=c)
        d.rectangle([cx - 65, cy + 30, cx + 65, cy + 50], fill=c)


def s_how(img, d, t, dur):
    d.rectangle([0, 0, W, H], fill=BG)
    text(img, "HOW IT WORKS", 84, W / 2, 262, color=CYAN, scale=pop(t, 0.0))
    top, ch, gap = 335, 200, 24
    for i, (st, title, sub) in enumerate(STEPS):
        if t < st:
            continue
        nxt = STEPS[i + 1][0] if i + 1 < len(STEPS) else 99
        active = st <= t < nxt
        y0 = top + i * (ch + gap)
        slide = ease_out(prog(t, st, 0.35))
        x0 = lerp(W, 60, slide)
        border = CYAN if active else (50, 58, 78)
        if i == 3 and active:
            border = RED
        d.rounded_rectangle([x0, y0, x0 + W - 120, y0 + ch], radius=30, fill=CARD, outline=border, width=6)
        icon_step(img, d, i, x0 + 130, y0 + ch / 2, t, active)
        num = text_sprite(str(i + 1), 40, BG, "black", box=border if active else GREY, pad=12, radius=40)
        paste(img, num, x0 + 40, y0 + 40)
        paste(img, text_sprite(title, 58, WHITE if active else (180, 186, 200), "black", max_w=700, align="left"), x0 + 250, y0 + 50, anchor="tl")
        paste(img, text_sprite(sub, 38, (170, 178, 196), "semi", max_w=700, align="left"), x0 + 250, y0 + 125, anchor="tl")


def building(d, cx, base, w, h, color, roof=None):
    d.rectangle([cx - w / 2, base - h, cx + w / 2, base], fill=color)
    for wy in range(int(base - h + 40), int(base - 70), 70):
        for wx in range(int(cx - w / 2 + 40), int(cx + w / 2 - 60), 80):
            d.rectangle([wx, wy, wx + 44, wy + 40], fill=(180, 210, 240))


def s_pd(img, d, t, dur):
    d.rectangle([0, 0, W, H], fill=BG)
    rise = ease_out(prog(t, 0, 0.5))
    base = 820 + (1 - rise) * 300
    building(d, W / 2, base, 640, 420, (52, 70, 120))
    d.rectangle([W / 2 - 100, base - 150, W / 2 + 100, base], fill=(30, 40, 70))
    spr = text_sprite("POLICE", 64, WHITE, "black", box=(20, 30, 60), pad=16, radius=12)
    paste(img, spr, W / 2, base - 455)
    # light bar
    on = int(t * 6) % 2
    d.rounded_rectangle([W / 2 - 120, base - 530, W / 2, base - 500], radius=10, fill=RED if on else (90, 20, 30))
    d.rounded_rectangle([W / 2, base - 530, W / 2 + 120, base - 500], radius=10, fill=(40, 120, 255) if not on else (20, 40, 90))
    for k, cx in enumerate((W / 2 - 230, W / 2 + 230)):
        pass
    pin(d, W / 2 + 330, base - 400, 44, RED)
    d.rectangle([0, base, W, base + 12], fill=(90, 96, 110))
    n = int(lerp(0, 70, ease_out(prog(t, 1.6, 1.4))))
    if t > 1.6:
        text(img, f"{n}+", 230, W / 2, 1010, color=YEL, scale=pop(t, 1.6))
        text(img, "incidents the cameras helped with, over 2 years", 44, W / 2, 1160, weight="bold", max_w=860)
        text(img, "(according to police)", 34, W / 2, 1232, color=GREY, weight="semi")


def cam_icon(d, cx, cy, s, color):
    d.rounded_rectangle([cx - 50 * s, cy - 26 * s, cx + 40 * s, cy + 26 * s], radius=int(10 * s), fill=color)
    d.ellipse([cx - 70 * s, cy - 18 * s, cx - 36 * s, cy + 18 * s], fill=color)
    d.rectangle([cx + 30 * s, cy - 8 * s, cx + 60 * s, cy + 8 * s], fill=color)


def s_cityhall(img, d, t, dur):
    d.rectangle([0, 0, W, H], fill=BG)
    # City hall
    base = 520
    d.polygon([(W / 2 - 300, base - 230), (W / 2, base - 310), (W / 2 + 300, base - 230)], fill=(200, 196, 186))
    d.rectangle([W / 2 - 300, base - 230, W / 2 + 300, base - 205], fill=(180, 176, 166))
    for k in range(6):
        x = W / 2 - 250 + k * 100
        d.rectangle([x - 18, base - 205, x + 18, base - 30], fill=(225, 222, 212))
    d.rectangle([W / 2 - 320, base - 30, W / 2 + 320, base], fill=(180, 176, 166))
    paste(img, text_sprite("CITY HALL", 40, BG, "black", box=YEL, pad=14, radius=12), W / 2, base + 42)
    # Flock pill
    fy = 680
    paste(img, text_sprite("FLOCK", 72, WHITE, "black", box=(44, 52, 74), pad=24, radius=24), W / 2 - 140, fy, pop(t, 0.6))
    stamp(img, "ENDING", W / 2 + 160, fy, RED, t, 2.6, angle=-8, size=72)
    # 9 cameras
    t6, t3 = 6.6, 8.4
    for i in range(9):
        r, c = divmod(i, 3)
        cx, cy = W / 2 - 280 + c * 280, 870 + r * 120
        if t < 4.4 + i * 0.08:
            continue
        off = (i < 6 and t > t6) or (i >= 6 and t > t3)
        cam_icon(d, cx, cy, 1.0, (70, 76, 92) if off else CYAN)
        if off:
            xmark(d, cx - 10, cy, 30, RED, 10)
    if t > 4.4:
        paste(img, text_sprite("9 CAMERAS", 40, CYAN, "black"), W / 2, 805, pop(t, 4.4))
    if t > t6:
        paste(img, text_sprite("6 OFF: DEC 31, 2026", 32, WHITE, "black", box=RED, pad=12, radius=12), W / 2 - 235, 1195, pop(t, t6))
    if t > t3:
        paste(img, text_sprite("3 OFF: MAR 31, 2027", 32, WHITE, "black", box=RED, pad=12, radius=12), W / 2 + 235, 1195, pop(t, t3))


def s_axon(img, d, t, dur):
    d.rectangle([0, 0, W, H], fill=BG)
    text(img, "NEXT UP?", 70, W / 2, 260, color=GREY, scale=pop(t, 0.0))
    text(img, "AXON", 190, W / 2, 420, color=WHITE, scale=pop(t, 0.2))
    text(img, "CAMERAS", 110, W / 2, 560, color=CYAN, scale=pop(t, 0.35))
    stamp(img, "PENDING", W / 2, 690, YEL, t, 1.2, angle=-6, size=84)
    if t > 2.3:
        y = 880
        s = pop(t, 2.3)
        card = Image.new("RGBA", (920, 170), (0, 0, 0, 0))
        cd = ImageDraw.Draw(card)
        cd.rounded_rectangle([0, 0, 919, 169], radius=30, fill=CARD + (255,))
        lock(cd, 100, 95, 46, CYAN)
        sp = text_sprite("City says it keeps control of the data", 44, WHITE, "black", max_w=700, align="left")
        card.paste(sp, (190, int(85 - sp.height / 2)), sp)
        paste(img, card, W / 2, y, s)
    if t > 3.6:
        s = pop(t, 3.6)
        card = Image.new("RGBA", (920, 170), (0, 0, 0, 0))
        cd = ImageDraw.Draw(card)
        cd.rounded_rectangle([0, 0, 919, 169], radius=30, fill=CARD + (255,))
        cd.ellipse([50, 40, 140, 130], outline=YEL, width=10)
        cd.line([(95, 60), (95, 88), (118, 102)], fill=YEL, width=10)
        sp = text_sprite("How long data is kept + who it's shared with: rules changing", 40, WHITE, "black", max_w=700, align="left")
        card.paste(sp, (190, int(85 - sp.height / 2)), sp)
        paste(img, card, W / 2, 1075, s)


def s_cta(img, d, t, dur):
    d.rectangle([0, 0, W, H], fill=BG)
    # balance scale
    cx, cy = W / 2, 400
    tilt = math.sin(t * 2.2) * 0.06 * max(0, 1 - t / 4)
    d.rectangle([cx - 8, cy - 120, cx + 8, cy + 130], fill=WHITE)
    d.rounded_rectangle([cx - 90, cy + 120, cx + 90, cy + 145], radius=10, fill=WHITE)
    lx, ly = cx - 250, cy - 100 - 250 * tilt
    rx, ry = cx + 250, cy - 100 + 250 * tilt
    d.line([(lx, ly), (rx, ry)], fill=WHITE, width=12)
    for (px, py, label, col) in [(lx, ly, "SAFETY", CYAN), (rx, ry, "PRIVACY", YEL)]:
        d.line([(px, py), (px - 70, py + 110)], fill=(200, 200, 210), width=4)
        d.line([(px, py), (px + 70, py + 110)], fill=(200, 200, 210), width=4)
        d.chord([px - 110, py + 50, px + 110, py + 170], 0, 180, fill=col)
        text(img, label, 40, px, py + 215, color=col, scale=pop(t, 0.3))
    if t > 2.4:
        text(img, "CITY MEETINGS ARE PUBLIC", 62, W / 2, 790, scale=pop(t, 2.4), max_w=960)
        text(img, "Your voice counts.", 46, W / 2, 870, color=GREY, weight="bold", scale=pop(t, 2.6))
    if t > 4.3:
        text(img, "FULL MAP + FACTS", 44, W / 2, 1000, color=CYAN, scale=pop(t, 4.3))
        spr = text_sprite("sunprairiealpr.netlify.app", 58, BG, "black", box=CYAN, pad=28, radius=28)
        paste(img, spr, W / 2, 1100, pop(t, 4.45) * (1 + 0.03 * math.sin(t * 6)))
        text(img, "Facts: City of Sun Prairie + local news, Sept 2026. Graphics are illustrative.",
             26, W / 2, 1230, color=GREY, weight="semi", max_w=900)


SCENES = [
    (0, 3, s_hook), (3, 8, s_drive), (8, 14, s_pole), (14, 24, s_how),
    (24, 30, s_pd), (30, 40, s_cityhall), (40, 47, s_axon), (47, 55, s_cta),
]

CAPTIONS = [
    (0.2, 1.6, "There's a camera in Sun Prairie"),
    (1.6, 3.0, "that's probably read your plate."),
    (3.0, 4.5, "Let's go find it."),
    (4.5, 6.3, "If you've driven around town today,"),
    (6.3, 8.0, "you've likely passed one."),
    (8.3, 9.6, "Right there."),
    (9.6, 11.2, "That's an ALPR:"),
    (11.2, 14.0, "Automatic License Plate Reader."),
    (14.0, 16.5, "It snaps a photo of every car that passes,"),
    (16.5, 18.5, "reads the plate,"),
    (18.5, 21.5, "and checks it against lists like stolen cars or Amber Alerts."),
    (21.5, 24.0, "Match? Police get an alert."),
    (24.0, 26.4, "Those alerts go to Sun Prairie PD."),
    (26.4, 30.0, "Police say the cameras helped in 70+ incidents over two years."),
    (30.0, 32.0, "But here's the news:"),
    (32.0, 34.8, "in September, the city said it's dropping Flock,"),
    (34.8, 37.0, "the company running its 9 cameras."),
    (37.0, 40.0, "6 shut off Dec 31. The last 3 in March."),
    (40.0, 42.3, "Police want to switch to Axon cameras."),
    (42.3, 45.0, "The city says it'll keep control of the data and update its rules."),
    (45.0, 47.0, "That contract? Still being decided."),
    (47.0, 49.5, "Public safety AND privacy both matter."),
    (49.5, 51.5, "City meetings are public."),
    (51.5, 55.0, "Full map + facts at the link."),
]


CAP = {"size": 60, "y": 1390, "box": (0, 0, 0, 215)}


def overlay(img, d, t):
    if t >= 3:
        pin(d, 74, 190, 20, RED)
        paste(img, text_sprite("SUN PRAIRIE, WI", 34, WHITE, "black"), 105, 152, anchor="tl")


if __name__ == "__main__":
    out = sys.argv[1]
    audio = out.replace(".mp4", "_music.wav")
    make_track(audio, DUR, 124, [55.0, 43.65, 65.41, 49.0],
               cuts=[s for s, _, _ in SCENES[1:]], impacts=[0.6, 30.0, 32.6, 41.2], drop=(28.9, 30.0))
    render(out, DUR, SCENES, CAPTIONS, BG,
           CAP, overlay=overlay, audio=audio)
    print("done", out)
