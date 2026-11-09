"""SP-ALPR v3 — voice am_michael, @sunprairiealpr end card. Variants: full (~40s) and teaser (~15s).
Usage: python3 alpr3.py OUT.mp4 [full|teaser]"""
import math
import sys

import alpr2 as V2
from engine2 import *  # noqa

BG, CYAN, RED, YEL, WHITE, GREY = V2.BG, V2.CYAN, V2.RED, V2.YEL, V2.WHITE, V2.GREY
DRIVER = V2.DRIVER
HANDLE = "@sunprairiealpr"

_TRIM = {
    "see": "See that? That's an automatic license plate reader.",
    "hot": "checks it against hotlists, like stolen cars and Amber Alerts,",
    "flock": "But in September, the city said it's dropping Flock, the company behind its nine cameras.",
    "cta2": "Full map at the link. Follow for updates.",
}
FULL = [(lid, _TRIM.get(lid, txt), p) for lid, txt, p in V2.LINES]

TEASER = [
    ("hook1", "This camera has probably read your license plate.", 0.0),
    ("hook2", "And Sun Prairie just made a big call about it.", 0.1),
    ("flock", "Now the city is dropping Flock.", 0.05),
    ("dark", "All nine cameras go dark by March.", 0.1),
    ("axon", "What replaces them? Still pending.", 0.1),
    ("fol", "Follow for the full breakdown.", 0.0),
]

LINES = FULL
VARIANT = "full"


def end_card(img, tg, t_show, x, y):
    if tg < t_show:
        return
    paste(img, text_sprite("FOLLOW", 42, BG, "black", box=CYAN, pad=16, radius=18), x, y - 80, pop(tg, t_show))
    paste(img, text_sprite(HANDLE, 60, WHITE, "black", box=(30, 38, 58), pad=24, radius=28), x, y + 15, pop(tg, t_show + 0.15))


def s_cta(img, d, t, dur, tg):
    V2.s_cta(img, d, t, dur, tg)
    end_card(img, tg, at("cta2", 0.55), 440, 1060)


def s_follow(img, d, t, dur, tg):
    d.rectangle([0, 0, W, H], fill=BG)
    for k in range(16):
        a = k / 16 * 2 * math.pi + tg * 0.4
        d.polygon([(W / 2, 900), (W / 2 + math.cos(a) * 1600, 900 + math.sin(a) * 1600),
                   (W / 2 + math.cos(a + 0.09) * 1600, 900 + math.sin(a + 0.09) * 1600)], fill=(22, 30, 46))
    text(img, "FULL BREAKDOWN", 92, W / 2, 330, color=CYAN, scale=pop(tg, at("fol")))
    end_card(img, tg, at("fol", 0.3), W / 2, 560)
    walker(d, tg, tg - t, tg - t + 1.0, W + 220, W / 2, 1310, 0.82, DRIVER, after="wave", backpack=False)


def overlay(img, d, tg):
    if tg >= L("hook2")[1] + 0.1:
        pin(d, 74, 190, 20, RED)
        paste(img, text_sprite("SUN PRAIRIE, WI", 34, WHITE, "black"), 105, 152, anchor="tl")


def setup(variant=None):
    global LINES, VARIANT
    VARIANT = variant or VARIANT
    LINES = FULL if VARIANT == "full" else TEASER
    v, total = build_voice(LINES, "am_michael", 1.22 if VARIANT == "full" else 1.26, tail=1.8)
    compute_env(v, total)
    if VARIANT == "full":
        ids = [("hook1", V2.s_car), ("ride", V2.s_drive), ("snap", V2.s_how), ("pd", V2.s_pd), ("flock", V2.s_ch),
               ("axon", V2.s_axon), ("cta1", s_cta)]
    else:
        ids = [("hook1", V2.s_car), ("flock", V2.s_ch), ("axon", V2.s_axon), ("fol", s_follow)]
    scenes = []
    for i, (lid, fn) in enumerate(ids):
        s = 0 if i == 0 else at(lid) - 0.1
        e = (at(ids[i + 1][0]) - 0.1) if i + 1 < len(ids) else total
        scenes.append((s, e, fn))
    return v, total, scenes, build_chunks(LINES)


BG = V2.BG

if __name__ == "__main__":
    out = sys.argv[1]
    v, total, scenes, chunks = setup(sys.argv[2] if len(sys.argv) > 2 else "full")
    print(VARIANT, "duration", round(total, 2))
    music = out.replace(".mp4", "_music.wav")
    hits = [at("hook2", 0.55), at("flock", 0.5), at("axon", 0.86)]
    make_track(music, total, 124, [55.0, 43.65, 65.41, 49.0], cuts=[s for s, _, _ in scenes[1:]], impacts=hits, seed=7)
    mixwav = out.replace(".mp4", "_mix.wav")
    mix_audio(v, music, mixwav, total)
    render2(out, total, scenes, chunks, BG, mixwav, overlay=overlay, shakes=hits)
    print("done", out)
