"""v2 engine: voiceover-driven timeline, karaoke captions, animated people,
lip-flap from the voice envelope, sidechain-ducked music, zoom punches + shake."""
import math
import os
import random
import subprocess
import wave
from functools import lru_cache

import numpy as np
from PIL import Image, ImageDraw

from engine import (FPS, H, W, clamp, ease_back, ease_in_out, ease_out, font, lerp, make_track, mix,  # noqa
                    paste, pin, pop, prog, text, text_sprite, check, xmark, stamp, lock, bulb)

KOKORO_DIR = os.environ.get("KOKORO_DIR", os.path.expanduser("~/kokoro"))
VSR = 24000
ASR = 44100

# ---------------------------------------------------------------- voice
_TL = {}          # line id -> (start, end)
_ENV = None       # per-frame mouth openness 0..1


def L(lid):
    return _TL[lid]


def at(lid, frac=0.0):
    s, e = _TL[lid]
    return s + (e - s) * frac


def _trim(x, thr=0.012):
    idx = np.where(np.abs(x) > thr)[0]
    if len(idx) == 0:
        return x
    a = max(0, idx[0] - int(0.02 * VSR))
    b = min(len(x), idx[-1] + int(0.06 * VSR))
    return x[a:b]


def build_voice(lines, voice, speed, lead=0.15, tail=1.6, gap=0.08):
    """lines: list of (id, text, extra_pause_after). Returns total duration."""
    from kokoro_onnx import Kokoro
    k = Kokoro(os.path.join(KOKORO_DIR, "kokoro-v1.0.fp16.onnx"), os.path.join(KOKORO_DIR, "voices-v1.0.bin"))
    parts, t = [], lead
    parts.append(np.zeros(int(lead * VSR), dtype=np.float32))
    for lid, txt, pause in lines:
        s, sr = k.create(txt, voice=voice, speed=speed, lang="en-us")
        s = _trim(np.asarray(s, dtype=np.float32))
        dur = len(s) / VSR
        _TL[lid] = (t, t + dur)
        parts.append(s)
        g = gap + pause
        parts.append(np.zeros(int(g * VSR), dtype=np.float32))
        t += dur + g
    total = t + tail
    v = np.concatenate(parts)
    v = np.pad(v, (0, max(0, int(total * VSR) - len(v))))
    return v, total


def compute_env(v, total):
    global _ENV
    n = int(total * FPS)
    hop = VSR // FPS
    env = np.zeros(n)
    for f in range(n):
        seg = v[f * hop:(f + 1) * hop]
        env[f] = np.sqrt(np.mean(seg ** 2)) if len(seg) else 0
    ref = np.percentile(env[env > 0.005], 90) if np.any(env > 0.005) else 1
    env = np.clip(env / ref, 0, 1)
    # make it flap: emphasize changes
    _ENV = env


def mouth(tg):
    if _ENV is None:
        return 0
    f = int(tg * FPS)
    return float(_ENV[f]) if 0 <= f < len(_ENV) else 0.0


def resample(x, sr_from, sr_to):
    n = int(len(x) * sr_to / sr_from)
    return np.interp(np.linspace(0, len(x) - 1, n), np.arange(len(x)), x).astype(np.float32)


def mix_audio(voice24, music_wav, out_wav, total, music_gain=0.55):
    v = resample(voice24, VSR, ASR)
    with wave.open(music_wav) as w:
        m = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32767
    n = int(total * ASR)
    v = np.pad(v, (0, max(0, n - len(v))))[:n]
    m = np.pad(m, (0, max(0, n - len(m))))[:n]
    env = np.convolve(np.abs(v), np.ones(int(0.12 * ASR)) / int(0.12 * ASR), "same")
    duck = 1 - 0.6 * np.clip(env / 0.03, 0, 1)
    out = v / (np.max(np.abs(v)) + 1e-9) * 0.92 + m * music_gain * duck
    out = np.tanh(out * 1.05)
    out = out / (np.max(np.abs(out)) + 1e-9) * 0.95
    with wave.open(out_wav, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(ASR)
        w.writeframes((out * 32767).astype(np.int16).tobytes())


# ---------------------------------------------------------------- karaoke captions
def build_chunks(lines, max_words=5):
    chunks = []
    for lid, txt, _ in lines:
        s, e = _TL[lid]
        words = txt.split()
        wts = [len(w.strip(",.?!:;")) + 2 + (4 if w[-1] in ",.?!:;" else 0) for w in words]
        tot = sum(wts)
        times, acc = [], 0
        for wt in wts:
            times.append(s + (e - s) * acc / tot)
            acc += wt
        cur = []
        for i, w in enumerate(words):
            cur.append((times[i], w))
            if len(cur) >= max_words or (w[-1] in ".?!" and i < len(words) - 1):
                chunks.append(cur)
                cur = []
        if cur:
            chunks.append(cur)
    out = []
    for i, c in enumerate(chunks):
        start = c[0][0]
        end = chunks[i + 1][0][0] if i + 1 < len(chunks) else start + 3
        end = min(end, start + 3.2)
        out.append((start, end, c))
    return out


@lru_cache(maxsize=1024)
def chunk_sprite(words, hi, size=66, hicol=(255, 214, 0), box=(0, 0, 0, 220)):
    fnt = font("black", size)
    space = fnt.getlength(" ")
    lines, cur, cw = [], [], 0
    for i, w in enumerate(words):
        lw = fnt.getlength(w)
        if cur and cw + space + lw > 900:
            lines.append(cur)
            cur, cw = [], 0
        cur.append((i, w, lw))
        cw += (space if len(cur) > 1 else 0) + lw
    if cur:
        lines.append(cur)
    lh = int(size * 1.15)
    widths = [sum(x[2] for x in l) + space * (len(l) - 1) for l in lines]
    pad = 30
    bw, bh = int(max(widths)) + pad * 2, lh * len(lines) + pad * 2 + 8
    img = Image.new("RGBA", (bw, bh), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, bw - 1, bh - 1], radius=28, fill=box)
    for li, l in enumerate(lines):
        x = pad + (max(widths) - widths[li]) / 2
        for (i, w, lw) in l:
            col = hicol if i == hi else (255, 255, 255)
            d.text((x, pad + li * lh), w, font=fnt, fill=col)
            x += lw + space
    return img


def draw_karaoke(img, tg, chunks, y=1420):
    for (s, e, c) in chunks:
        if s <= tg < e:
            hi = 0
            for i, (wt, _) in enumerate(c):
                if tg >= wt:
                    hi = i
            spr = chunk_sprite(tuple(w for _, w in c), hi)
            sc = 0.85 + 0.15 * ease_back(prog(tg, s, 0.18))
            paste(img, spr, W / 2, y, sc)
            return


# ---------------------------------------------------------------- people
def _shade(c, k):
    return tuple(int(v * k) for v in c)


def person(d, x, y, s, pal, pose="front", phase=0.0, facing=1, mouth_open=0.0, target=None,
           blink=False, backpack=True, wave_t=0.0):
    """Flat illustrated person. (x, y) = point between the feet. ~600*s px tall.
    pose: 'walk' (side view, facing ±1), 'front', 'point' (front, arm toward target), 'wave'."""
    skin, hair, top, pants, shoe = pal["skin"], pal["hair"], pal["top"], pal["pants"], pal["shoe"]
    if pose == "walk":
        bob = abs(math.sin(phase)) * 12 * s
        y0 = y - bob
        hip = (x, y0 - 240 * s)
        sw = math.sin(phase) * 0.55
        sh = (x + facing * 4 * s, y0 - 420 * s)

        def leg(sign, k):
            a = sign * sw
            knee = (hip[0] + math.sin(a) * 125 * s, hip[1] + math.cos(a) * 125 * s)
            a2 = a - (0.35 if sign * sw > 0 else 0.0) * facing * 0
            foot = (knee[0] + math.sin(a2 - 0.15 * facing * max(0, -sign * math.cos(phase))) * 120 * s, knee[1] + 120 * s)
            d.line([hip, knee, foot], fill=_shade(pants, k), width=int(44 * s), joint="curve")
            d.ellipse([foot[0] - 30 * s + facing * 14 * s, foot[1] - 16 * s, foot[0] + 30 * s + facing * 14 * s, foot[1] + 14 * s], fill=_shade(shoe, k))

        def arm(sign, k):
            a = -sign * sw * 0.9
            elbow = (sh[0] + math.sin(a) * 100 * s, sh[1] + math.cos(a) * 100 * s)
            hand = (elbow[0] + math.sin(a + 0.35 * facing) * 95 * s, elbow[1] + math.cos(a + 0.35 * facing) * 95 * s)
            d.line([sh, elbow, hand], fill=_shade(top, k), width=int(34 * s), joint="curve")
            d.ellipse([hand[0] - 18 * s, hand[1] - 18 * s, hand[0] + 18 * s, hand[1] + 18 * s], fill=_shade(skin, k))

        arm(-1, 0.72)
        leg(-1, 0.72)
        if backpack:
            bx = x - facing * 70 * s
            d.rounded_rectangle([bx - 38 * s, y0 - 440 * s, bx + 38 * s, y0 - 270 * s], radius=int(20 * s), fill=pal.get("bag", (40, 50, 90)))
        leg(1, 1.0)
        d.rounded_rectangle([x - 58 * s, y0 - 460 * s, x + 58 * s, y0 - 220 * s], radius=int(44 * s), fill=top)
        d.rectangle([x - 16 * s, y0 - 485 * s, x + 16 * s, y0 - 450 * s], fill=_shade(skin, 0.9))
        hx, hy = x + facing * 8 * s, y0 - 540 * s
        if pal.get("style") == "long":
            d.rounded_rectangle([hx - facing * 20 * s - 64 * s, hy - 60 * s, hx - facing * 20 * s + 64 * s, hy + 120 * s], radius=int(40 * s), fill=hair)
        if pal.get("style") == "puff":
            d.ellipse([hx - 60 * s, hy - 130 * s, hx + 60 * s, hy - 20 * s], fill=hair)
        d.ellipse([hx - 66 * s, hy - 66 * s, hx + 66 * s, hy + 66 * s], fill=skin)
        d.pieslice([hx - 72 * s, hy - 78 * s, hx + 72 * s, hy + 50 * s], 180, 360, fill=hair)
        d.ellipse([hx - facing * 70 * s - 26 * s, hy - 40 * s, hx - facing * 70 * s + 26 * s, hy + 18 * s], fill=hair)
        ex = hx + facing * 34 * s
        d.ellipse([ex - 7 * s, hy - 8 * s, ex + 7 * s, hy + 8 * s], fill=(30, 25, 30))
        mx = hx + facing * 38 * s
        mo = mouth_open
        d.ellipse([mx - 12 * s, hy + 26 * s - 3 * s, mx + 12 * s, hy + 26 * s + (4 + 16 * mo) * s], fill=(120, 30, 40))
        arm(1, 1.0)
        return

    # ---------------- front-facing
    hipy = y - 240 * s
    for sx in (-1, 1):
        d.line([(x + sx * 30 * s, hipy), (x + sx * 34 * s, y - 10 * s)], fill=pants, width=int(48 * s))
        d.ellipse([x + sx * 38 * s - 36 * s, y - 26 * s, x + sx * 38 * s + 36 * s, y + 12 * s], fill=shoe)
    if backpack:
        for sx in (-1, 1):
            d.rounded_rectangle([x + sx * 78 * s - 10 * s, y - 450 * s, x + sx * 78 * s + 10 * s, y - 300 * s], radius=int(8 * s), fill=pal.get("bag", (40, 50, 90)))
    d.rounded_rectangle([x - 78 * s, y - 470 * s, x + 78 * s, y - 220 * s], radius=int(50 * s), fill=top)
    d.rounded_rectangle([x - 46 * s, y - 330 * s, x + 46 * s, y - 270 * s], radius=int(14 * s), fill=_shade(top, 0.85))
    d.line([(x - 14 * s, y - 455 * s), (x - 18 * s, y - 380 * s)], fill=(240, 240, 240), width=int(6 * s))
    d.line([(x + 14 * s, y - 455 * s), (x + 18 * s, y - 380 * s)], fill=(240, 240, 240), width=int(6 * s))
    shl, shr = (x - 70 * s, y - 440 * s), (x + 70 * s, y - 440 * s)

    def arm_to(sh, hand, k=1.0):
        mid = ((sh[0] + hand[0]) / 2 + (sh[0] - x) * 0.25, (sh[1] + hand[1]) / 2 + 20 * s)
        d.line([sh, mid, hand], fill=_shade(top, k), width=int(36 * s), joint="curve")
        d.ellipse([hand[0] - 20 * s, hand[1] - 20 * s, hand[0] + 20 * s, hand[1] + 20 * s], fill=skin)

    left_hand = (x - 104 * s, y - 250 * s)
    right_hand = (x + 104 * s, y - 250 * s)
    if pose == "point" and target is not None:
        side = 1 if target[0] >= x else -1
        sh = shr if side > 0 else shl
        dx, dy = target[0] - sh[0], target[1] - sh[1]
        n = math.hypot(dx, dy) or 1
        hand = (sh[0] + dx / n * 200 * s, sh[1] + dy / n * 200 * s)
        if side > 0:
            right_hand = None
            arm_to(shl, left_hand)
            arm_to(sh, hand)
            # finger
            d.line([hand, (hand[0] + dx / n * 34 * s, hand[1] + dy / n * 34 * s)], fill=skin, width=int(12 * s))
        else:
            left_hand = None
            arm_to(shr, right_hand)
            arm_to(sh, hand)
            d.line([hand, (hand[0] + dx / n * 34 * s, hand[1] + dy / n * 34 * s)], fill=skin, width=int(12 * s))
    elif pose == "wave":
        arm_to(shl, left_hand)
        a = math.sin(wave_t * 12) * 0.35
        hand = (shr[0] + math.sin(0.5 + a) * 190 * s, shr[1] - math.cos(0.5 + a) * 190 * s)
        arm_to(shr, hand)
    elif pose == "hype":  # both fists up
        for sh, sx in ((shl, -1), (shr, 1)):
            arm_to(sh, (sh[0] + sx * 80 * s, sh[1] - 170 * s - 10 * s * math.sin(wave_t * 14)))
    else:
        arm_to(shl, left_hand)
        arm_to(shr, right_hand)
    # head
    d.rectangle([x - 20 * s, y - 500 * s, x + 20 * s, y - 460 * s], fill=_shade(skin, 0.9))
    hx, hy = x, y - 560 * s
    d.ellipse([hx - 84 * s, hy - 70 * s, hx + 84 * s, hy + 40 * s], fill=hair)  # back hair
    if pal.get("style") == "long":
        d.rounded_rectangle([hx - 92 * s, hy - 60 * s, hx + 92 * s, hy + 130 * s], radius=int(46 * s), fill=hair)
    if pal.get("style") == "puff":
        d.ellipse([hx - 70 * s, hy - 150 * s, hx + 70 * s, hy - 30 * s], fill=hair)
    d.ellipse([hx - 70 * s, hy - 72 * s, hx + 70 * s, hy + 72 * s], fill=skin)
    d.ellipse([hx - 80 * s, hy - 12 * s, hx - 62 * s, hy + 18 * s], fill=_shade(skin, 0.92))
    d.ellipse([hx + 62 * s, hy - 12 * s, hx + 80 * s, hy + 18 * s], fill=_shade(skin, 0.92))
    d.chord([hx - 76 * s, hy - 86 * s, hx + 76 * s, hy + 30 * s], 180, 360, fill=hair)
    for sx in (-1, 1):
        ex = hx + sx * 27 * s
        if blink:
            d.line([(ex - 9 * s, hy), (ex + 9 * s, hy)], fill=(30, 25, 30), width=int(5 * s))
        else:
            d.ellipse([ex - 9 * s, hy - 11 * s, ex + 9 * s, hy + 11 * s], fill=(30, 25, 30))
            d.ellipse([ex - 3 * s, hy - 8 * s, ex + 3 * s, hy - 2 * s], fill=(255, 255, 255))
        d.line([(ex - 14 * s, hy - 24 * s - 4 * s * mouth_open), (ex + 12 * s, hy - 27 * s - 4 * s * mouth_open)], fill=_shade(hair, 0.8), width=int(6 * s))
    mo = mouth_open
    if mo < 0.12:
        d.arc([hx - 22 * s, hy + 14 * s, hx + 22 * s, hy + 40 * s], 20, 160, fill=(120, 30, 40), width=int(6 * s))
    else:
        d.ellipse([hx - (16 + 6 * mo) * s, hy + 24 * s, hx + (16 + 6 * mo) * s, hy + (30 + 26 * mo) * s], fill=(120, 30, 40))
        d.rectangle([hx - 12 * s, hy + 24 * s, hx + 12 * s, hy + 29 * s], fill=(250, 250, 250))


def walker(d, tg, t_in, t_stop, x_from, x_to, y, s, pal, after="front", target=None, backpack=True, talk=True, **kw):
    """Walk from x_from to x_to between t_in..t_stop, then hold pose `after` and talk."""
    if tg < t_in:
        return None
    facing = 1 if x_to >= x_from else -1
    if tg < t_stop:
        p = (tg - t_in) / (t_stop - t_in)
        x = lerp(x_from, x_to, p)
        person(d, x, y, s, pal, "walk", phase=(tg - t_in) * 11, facing=facing, mouth_open=mouth(tg) if talk else 0, backpack=backpack)
        return x
    blink = (int((tg + x_to / 97) * 10) % 37) == 0
    person(d, x_to, y, s, pal, after, mouth_open=mouth(tg) if talk else 0, target=target, blink=blink, backpack=backpack,
           wave_t=tg, **kw)
    return x_to


# ---------------------------------------------------------------- render
def render2(path, total, scenes, chunks, bg, audio, overlay=None, shakes=(), cap_y=1420):
    n = int(total * FPS)
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
           "-r", str(FPS), "-i", "-", "-i", audio, "-c:a", "aac", "-b:a", "192k", "-shortest",
           "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart", path]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    rng = random.Random(3)
    starts = [s for s, _, _ in scenes]
    for f in range(n):
        tg = f / FPS
        img = Image.new("RGB", (W, H), bg)
        d = ImageDraw.Draw(img)
        for (s, e, fn) in scenes:
            if s <= tg < e:
                fn(img, d, tg - s, e - s, tg)
                break
        # zoom punch on cuts
        for s in starts[1:]:
            if 0 <= tg - s < 0.3:
                z = 1 + 0.09 * (1 - (tg - s) / 0.3) ** 2
                zw, zh = int(W / z), int(H / z)
                img = img.crop(((W - zw) // 2, (H - zh) // 2, (W - zw) // 2 + zw, (H - zh) // 2 + zh)).resize((W, H), Image.BILINEAR)
        for s in shakes:
            if 0 <= tg - s < 0.3:
                a = 22 * (1 - (tg - s) / 0.3)
                ox, oy = int(rng.uniform(-a, a)), int(rng.uniform(-a, a))
                base = Image.new("RGB", (W, H), bg)
                base.paste(img, (ox, oy))
                img = base
        d = ImageDraw.Draw(img)
        if overlay:
            overlay(img, d, tg)
        draw_karaoke(img, tg, chunks, cap_y)
        for s in starts[1:]:
            if 0 <= tg - s < 0.12:
                img = Image.blend(img, Image.new("RGB", (W, H), (255, 255, 255)), 0.5 * (1 - (tg - s) / 0.12))
        proc.stdin.write(img.tobytes())
    proc.stdin.close()
    proc.wait()
