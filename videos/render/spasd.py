"""SPASD Student Voice: 'Who Decides?' — 52s vertical motion-graphics video."""
import sys

from PIL import Image, ImageDraw

from engine import *  # noqa

BG = (16, 24, 52)
NAVY2 = (28, 40, 80)
ORANGE = (255, 138, 0)
SKY = (110, 180, 255)
WHITE = (255, 255, 255)
GREY = (150, 160, 185)
DUR = 52


def s_hook(img, d, t, dur):
    # hallway light behind opening doors
    for y in range(0, H, 8):
        d.rectangle([0, y, W, y + 8], fill=mix((255, 214, 150), (255, 150, 60), y / H))
    open_ = ease_in_out(prog(t, 0.15, 0.7))
    half = W / 2 * (1 - open_ * 0.92)
    for side in (0, 1):
        x0 = 0 if side == 0 else W - half
        d.rectangle([x0, 0, x0 + half, H], fill=NAVY2)
        if half > 60:
            wx = x0 + half / 2 - 90
            d.rounded_rectangle([wx, 360, wx + 180, 700], radius=14, fill=(120, 170, 230))
            hx = x0 + half - 70 if side == 0 else x0 + 40
            d.rounded_rectangle([hx, 900, hx + 30, 1080], radius=10, fill=(200, 200, 210))
    text(img, "WHO", 220, W / 2, 620, color=BG, scale=pop(t, 0.6), stroke=0)
    text(img, "DECIDES?", 170, W / 2, 820, color=WHITE, scale=pop(t, 0.9), stroke=10, stroke_color=BG)


LOCKER_COLS = [(60, 110, 200), (70, 120, 210)]


def s_hall(img, d, t, dur):
    d.rectangle([0, 0, W, H], fill=BG)
    scroll = t * 260
    lw = 150
    off = int(scroll) % (lw * 2)
    for i, x in enumerate(range(-off, W + lw * 2, lw)):
        d.rectangle([x + 4, 760, x + lw - 4, 1240], fill=LOCKER_COLS[i % 2])
        for vy in range(800, 880, 18):
            d.rectangle([x + 30, vy, x + lw - 30, vy + 6], fill=(40, 80, 160))
        d.rounded_rectangle([x + lw - 40, 1000, x + lw - 26, 1060], radius=6, fill=(220, 220, 230))
    d.rectangle([0, 1240, W, 1260], fill=(80, 90, 120))
    chips = [(0.0, "YOUR SCHEDULE", 330, 320, -6, ORANGE), (1.2, "YOUR CLASSES", 740, 450, 5, SKY),
             (2.5, "THE BUDGET", 330, 580, 4, WHITE), (3.6, "PHONE RULES", 730, 690, -5, ORANGE)]
    for st, label, cx, cy, ang, col in chips:
        if t < st:
            continue
        spr = text_sprite(label, 58, BG, "black", box=col, pad=24, radius=40)
        spr = spr.rotate(ang, expand=True, resample=Image.BICUBIC)
        paste(img, spr, cx, cy, pop(t, st, 0.4))


def s_class(img, d, t, dur):
    d.rectangle([0, 0, W, H], fill=(236, 226, 206))
    # whiteboard
    d.rounded_rectangle([90, 250, W - 90, 760], radius=20, fill=(180, 186, 196))
    d.rounded_rectangle([110, 270, W - 110, 740], radius=14, fill=WHITE)
    text(img, "OUR IDEAS", 52, W / 2, 320, color=(60, 70, 110))
    notes = [(0.4, 240, 450, (255, 230, 90), "later start"), (1.0, 480, 430, (255, 170, 190), "more clubs"),
             (1.6, 740, 460, (160, 230, 170), "better lunch"), (2.2, 330, 620, (150, 210, 255), "mental health days"),
             (2.8, 650, 630, (255, 200, 120), "phone policy")]
    dim = ease_out(prog(t, 4.6, 0.6))
    for st, cx, cy, col, label in notes:
        if t < st:
            continue
        c = mix(col, (205, 205, 205), dim * 0.8)
        note = Image.new("RGBA", (220, 140), c + (255,))
        sp = text_sprite(label, 30, (40, 40, 60), "bold", max_w=190)
        note.paste(sp, (int(110 - sp.width / 2), int(70 - sp.height / 2)), sp)
        note = note.rotate((cx % 7) - 3, expand=True, resample=Image.BICUBIC)
        paste(img, note, cx, cy, pop(t, st))
    # desks + students
    for k, x in enumerate((200, 420, 660, 880)):
        person(d, x, 1000, 80, [ORANGE, (90, 120, 200), (200, 80, 90), (60, 150, 110)][k])
        d.rounded_rectangle([x - 110, 1050, x + 110, 1090], radius=10, fill=(150, 100, 60))
        d.rectangle([x - 95, 1090, x - 80, 1240], fill=(120, 80, 50))
        d.rectangle([x + 80, 1090, x + 95, 1240], fill=(120, 80, 50))
    if 1.8 < t:
        g = 0.5 + 0.5 * math.sin(t * 6)
        s = pop(t, 1.8)
        if s > 0.1:
            bulb(d, 880, 820 - 40 * s, 45 * s, (255, 220, 60), glow=mix((236, 226, 206), (255, 240, 170), g))
    if t > 4.6:
        spr = text_sprite("...but who hears them?", 60, WHITE, "black", box=BG, pad=26, radius=30)
        paste(img, spr, W / 2, 520, pop(t, 4.6))


def s_trans(img, d, t, dur):
    d.rectangle([0, 0, W, H], fill=BG)
    # school (left) -> road -> mystery building (right)
    d.rectangle([60, 860, 380, 1160], fill=(170, 80, 60))
    d.polygon([(40, 860), (220, 760), (400, 860)], fill=(130, 60, 45))
    for wy in (900, 1000):
        for wx in (100, 190, 280):
            d.rectangle([wx, wy, wx + 60, wy + 60], fill=(255, 220, 150))
    d.rectangle([180, 1080, 260, 1160], fill=(90, 50, 40))
    d.rectangle([0, 1160, W, 1180], fill=(90, 100, 130))
    p = ease_in_out(prog(t, 0.4, 2.6))
    x_end = lerp(400, 760, p)
    for x in range(400, int(x_end), 40):
        d.ellipse([x, 1070, x + 18, 1088], fill=ORANGE)
    if p > 0.95:
        d.polygon([(760, 1050), (800, 1079), (760, 1108)], fill=ORANGE)
    q = pop(t, 2.8)
    if q > 0:
        d.rounded_rectangle([820, 1160 - 340 * q, 1040, 1160], radius=10, fill=(60, 75, 120))
        text(img, "?", 160, 930, 1160 - 170 * q, color=ORANGE, scale=q)
    text(img, "WHERE DO", 110, W / 2, 330, scale=pop(t, 0.3))
    text(img, "IDEAS GET", 110, W / 2, 460, scale=pop(t, 0.5))
    text(img, "HEARD?", 150, W / 2, 610, color=ORANGE, scale=pop(t, 0.7))


def s_district(img, d, t, dur):
    d.rectangle([0, 0, W, H], fill=BG)
    rise = ease_out(prog(t, 0, 0.6))
    base = 830 + (1 - rise) * 400
    d.rectangle([180, base - 480, 900, base], fill=(70, 90, 140))
    for gx in range(200, 880, 85):
        for gy in range(int(base - 460), int(base - 40), 85):
            d.rectangle([gx, gy, gx + 70, gy + 70], fill=(140, 190, 240))
    d.rectangle([460, base - 140, 620, base], fill=(40, 50, 80))
    d.rectangle([140, base, 940, base + 16], fill=(100, 110, 140))
    drop = ease_out(prog(t, 0.6, 0.5))
    if t > 0.6:
        pin(d, 540, lerp(0, base - 520, drop), 60, ORANGE)
    if t > 1.2:
        paste(img, text_sprite("SPASD DISTRICT CENTER", 54, BG, "black", box=ORANGE, pad=22, radius=22), W / 2, base + 80, pop(t, 1.2))
    chips = [(2.6, "POLICIES"), (3.6, "BUDGETS"), (4.6, "EVERY SPASD SCHOOL")]
    y = base + 200
    for i, (st, label) in enumerate(chips):
        if t < st:
            continue
        cx = [260, 640, W / 2][i]
        cy = y if i < 2 else y + 110
        paste(img, text_sprite(label, 46, WHITE, "black", box=NAVY2, pad=20, radius=30), cx, cy, pop(t, st))


def s_board(img, d, t, dur):
    d.rectangle([0, 0, W, H], fill=BG)
    text(img, "THE SCHOOL BOARD", 78, W / 2, 270, color=WHITE, scale=pop(t, 0.0))
    # curved table
    cx, cy, R = W / 2, 1110, 380
    d.arc([cx - R, cy - R * 0.9, cx + R, cy + R * 0.9], 200, 340, fill=(150, 100, 60), width=60)
    seats = []
    for i in range(9):
        a = math.radians(205 + i * (130 / 8))
        seats.append((cx + (R + 70) * math.cos(a), cy + (R * 0.9 + 70) * math.sin(a)))
    order = [0, 1, 2, 3, 4, 5, 6]  # elected
    students = [7, 8]
    for k, idx in enumerate(order):
        st = 2.4 + k * 0.18
        if t >= st:
            sx, sy = seats[idx]
            s = pop(t, st)
            person(d, sx, sy + 30, 55 * s, SKY)
    for k, idx in enumerate(students):
        st = 5.0 + k * 0.25
        if t >= st:
            sx, sy = seats[idx]
            s = pop(t, st)
            person(d, sx, sy + 30, 62 * s, ORANGE)
    if t > 2.4:
        n = min(7, int((t - 2.4) / 0.18) + 1)
        paste(img, text_sprite(f"{n} ELECTED MEMBERS", 50, SKY, "black"), W / 2, 380, pop(t, 2.4))
    if t > 5.0:
        paste(img, text_sprite("+ 2 STUDENT SEATS", 64, BG, "black", box=ORANGE, pad=20, radius=24), W / 2, 470, pop(t, 5.0))
        text(img, "(non-voting, 1-year terms)", 34, W / 2, 545, color=GREY, weight="semi")
    if t > 7.4:  # podium
        s = pop(t, 7.4)
        px, py = W / 2, 1130
        person(d, px, py - 40, 70 * s, ORANGE)
        d.polygon([(px - 90 * s, py), (px + 90 * s, py), (px + 70 * s, py + 130 * s), (px - 70 * s, py + 130 * s)], fill=(120, 80, 50))
        d.line([(px + 40 * s, py), (px + 10 * s, py - 70 * s)], fill=(200, 200, 210), width=6)
        d.ellipse([px - 4 * s, py - 92 * s, px + 24 * s, py - 64 * s], fill=(60, 60, 70))


def s_kinetic(img, d, t, dur):
    d.rectangle([0, 0, W, H], fill=ORANGE)
    words = [(0.9, "NOTHING", 190, BG, 470), (1.8, "ABOUT US", 150, WHITE, 680), (2.8, "WITHOUT US", 150, BG, 870)]
    for st, w, size, col, y in words:
        if t >= st:
            shake = 6 * math.sin(t * 40) * max(0, 1 - (t - st) * 4)
            text(img, w, size, W / 2 + shake, y, color=col, scale=pop(t, st, 0.3), max_w=1040)
    if t > 3.6:
        paste(img, text_sprite("STUDENT VOICE", 54, ORANGE, "black", box=BG, pad=20, radius=26), W / 2, 1080, pop(t, 3.6))


def s_cta(img, d, t, dur):
    d.rectangle([0, 0, W, H], fill=BG)
    rows = [(0.1, "APPLY", "for a student board seat"), (2.3, "JOIN", "Student Voice"), (4.0, "SHOW UP", "to a board meeting")]
    for i, (st, big, small) in enumerate(rows):
        if t < st:
            continue
        y = 330 + i * 210
        s = pop(t, st)
        r = 62 * s
        d.ellipse([170 - r, y - r, 170 + r, y + r], fill=ORANGE)
        if s > 0.6:
            check(d, 170, y, 30, BG, 14)
        sx = lerp(W, 270, ease_out(prog(t, st, 0.35)))
        paste(img, text_sprite(big, 84, WHITE, "black", align="left"), sx, y - 70, anchor="tl")
        paste(img, text_sprite(small, 40, GREY, "bold", align="left", max_w=760), sx, y + 22, anchor="tl")
    if t > 5.0:
        text(img, "YOUR VOICE COUNTS.", 76, W / 2, 1000, color=ORANGE, scale=pop(t, 5.0))
        paste(img, text_sprite("sunprairieschools.org", 52, BG, "black", box=WHITE, pad=24, radius=26), W / 2, 1120, pop(t, 5.3))
        text(img, "Board: 7 elected members + 2 non-voting student members (per SPASD). Graphics are illustrative.",
             24, W / 2, 1225, color=GREY, weight="semi", max_w=900)


SCENES = [
    (0, 3, s_hook), (3, 8, s_hall), (8, 15, s_class), (15, 20, s_trans),
    (20, 28, s_district), (28, 38, s_board), (38, 45, s_kinetic), (45, 52, s_cta),
]

CAPTIONS = [
    (0.2, 1.6, "Ever wonder who ACTUALLY"),
    (1.6, 3.0, "decides what happens at your school?"),
    (3.0, 5.5, "Your schedule. Your classes."),
    (5.5, 8.0, "The budget. Even the phone rules."),
    (8.0, 9.8, "It starts right here."),
    (9.8, 12.4, "Students have ideas every single day."),
    (12.4, 15.0, "But ideas don't change anything unless someone hears them."),
    (15.4, 19.6, "So where do they actually get heard?"),
    (20.0, 22.2, "The District Center."),
    (22.2, 25.0, "Where policies and budgets"),
    (25.0, 28.0, "for every SPASD school get worked out."),
    (28.0, 30.4, "And this is the School Board."),
    (30.4, 33.0, "Seven elected members..."),
    (33.0, 35.4, "...plus TWO student seats."),
    (35.4, 38.0, "Meetings are public. Students can speak."),
    (38.0, 40.6, "That's what Student Voice is about:"),
    (40.6, 45.0, "making sure decisions about us include us."),
    (45.0, 47.3, "Apply for a student board seat."),
    (47.3, 49.0, "Join Student Voice."),
    (49.0, 52.0, "Or just show up. Your voice counts."),
]

CAP = {"size": 60, "y": 1390, "box": (0, 0, 0, 215)}


def overlay(img, d, t):
    if t >= 3 and not (38 <= t < 45):
        pin(d, 74, 190, 20, ORANGE)
        paste(img, text_sprite("SUN PRAIRIE, WI", 34, WHITE if not (8 <= t < 15) else BG, "black"), 105, 152, anchor="tl")


if __name__ == "__main__":
    out = sys.argv[1]
    audio = out.replace(".mp4", "_music.wav")
    make_track(audio, DUR, 128, [65.41, 49.0, 55.0, 43.65],
               cuts=[s for s, _, _ in SCENES[1:]], impacts=[0.9, 33.0, 38.9], drop=(37.1, 38.0), seed=11)
    render(out, DUR, SCENES, CAPTIONS, BG, CAP, overlay=overlay, audio=audio)
    print("done", out)
