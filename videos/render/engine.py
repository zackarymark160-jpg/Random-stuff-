"""Tiny motion-graphics engine: draws frames with PIL, pipes them to ffmpeg,
and synthesizes a beat + whooshes with numpy. No external assets needed."""
import math
import subprocess
import wave
from functools import lru_cache

import numpy as np
from PIL import Image, ImageDraw, ImageFont

W, H, FPS = 1080, 1920, 30
FONT_DIR = "/usr/share/fonts/opentype/inter/"
FONTS = {
    "black": FONT_DIR + "InterDisplay-Black.otf",
    "xbold": FONT_DIR + "InterDisplay-ExtraBold.otf",
    "bold": FONT_DIR + "Inter-Bold.otf",
    "semi": FONT_DIR + "Inter-SemiBold.otf",
}


# ---------------------------------------------------------------- easing
def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def prog(t, start, dur):
    return clamp((t - start) / dur) if dur > 0 else float(t >= start)


def ease_out(p):
    return 1 - (1 - p) ** 3


def ease_in_out(p):
    return 3 * p * p - 2 * p * p * p


def ease_back(p):
    c1, c3 = 1.70158, 2.70158
    return 1 + c3 * (p - 1) ** 3 + c1 * (p - 1) ** 2


def lerp(a, b, p):
    return a + (b - a) * p


def mix(c1, c2, p):
    return tuple(int(lerp(a, b, p)) for a, b in zip(c1, c2))


# ---------------------------------------------------------------- text
@lru_cache(maxsize=64)
def font(weight, size):
    return ImageFont.truetype(FONTS[weight], size)


def wrap(text, fnt, max_w):
    words, lines, cur = text.split(), [], ""
    for w in words:
        trial = (cur + " " + w).strip()
        if fnt.getlength(trial) <= max_w or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


@lru_cache(maxsize=512)
def text_sprite(text, size, color, weight="black", stroke=0, stroke_color=(0, 0, 0),
                max_w=940, box=None, pad=28, radius=26, line_gap=1.12, align="center"):
    """Render (possibly multi-line) text to an RGBA sprite, optionally on a pill."""
    fnt = font(weight, size)
    lines = wrap(text, fnt, max_w)
    lh = int(size * line_gap)
    tw = int(max(fnt.getlength(l) for l in lines)) + stroke * 2
    th = lh * len(lines) + stroke * 2 + int(size * 0.18)
    bw, bh = tw + (pad * 2 if box else 0), th + (pad * 2 if box else 0)
    img = Image.new("RGBA", (bw, bh), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if box:
        d.rounded_rectangle([0, 0, bw - 1, bh - 1], radius=radius, fill=box)
    ox = pad if box else 0
    oy = pad if box else 0
    for i, l in enumerate(lines):
        lw = fnt.getlength(l)
        x = ox + stroke + ((tw - stroke * 2 - lw) / 2 if align == "center" else 0)
        d.text((x, oy + stroke + i * lh), l, font=fnt, fill=color,
               stroke_width=stroke, stroke_fill=stroke_color)
    return img


def paste(img, sprite, cx, cy, scale=1.0, alpha=1.0, anchor="center"):
    if scale <= 0.01 or alpha <= 0.01:
        return
    s = sprite
    if abs(scale - 1) > 0.01:
        s = s.resize((max(1, int(s.width * scale)), max(1, int(s.height * scale))), Image.BILINEAR)
    if alpha < 0.99:
        a = s.getchannel("A").point(lambda v: int(v * alpha))
        s = s.copy()
        s.putalpha(a)
    if anchor == "center":
        x, y = int(cx - s.width / 2), int(cy - s.height / 2)
    else:  # top-left
        x, y = int(cx), int(cy)
    img.paste(s, (x, y), s)


def text(img, t, size, cx, cy, color=(255, 255, 255), scale=1.0, alpha=1.0, **kw):
    paste(img, text_sprite(t, size, color, **kw), cx, cy, scale, alpha)


def pop(t, start, dur=0.35):
    """scale for a pop-in starting at `start`"""
    p = prog(t, start, dur)
    return 0 if t < start else ease_back(p)


# ---------------------------------------------------------------- shapes / icons
def pin(d, x, y, s, color, inner=(255, 255, 255)):
    d.ellipse([x - s, y - s * 2.2, x + s, y - s * 0.2], fill=color)
    d.polygon([(x - s * 0.82, y - s * 0.75), (x + s * 0.82, y - s * 0.75), (x, y + s * 0.6)], fill=color)
    r = s * 0.42
    d.ellipse([x - r, y - s * 1.2 - r, x + r, y - s * 1.2 + r], fill=inner)


def check(d, x, y, s, color, width=14):
    d.line([(x - s, y), (x - s * 0.3, y + s * 0.7), (x + s, y - s * 0.8)], fill=color, width=width, joint="curve")


def xmark(d, x, y, s, color, width=26):
    d.line([(x - s, y - s), (x + s, y + s)], fill=color, width=width)
    d.line([(x - s, y + s), (x + s, y - s)], fill=color, width=width)


def bulb(d, x, y, s, color, glow=None):
    if glow:
        d.ellipse([x - s * 1.8, y - s * 1.8, x + s * 1.8, y + s * 1.8], fill=glow)
    d.ellipse([x - s, y - s, x + s, y + s], fill=color)
    d.rounded_rectangle([x - s * 0.45, y + s * 0.8, x + s * 0.45, y + s * 1.45], radius=6, fill=(90, 90, 100))


def lock(d, x, y, s, color):
    d.arc([x - s * 0.6, y - s * 1.3, x + s * 0.6, y], 180, 360, fill=color, width=int(s * 0.22))
    d.line([(x - s * 0.6 + s * 0.11, y - s * 0.65), (x - s * 0.6 + s * 0.11, y - s * 0.1)], fill=color, width=int(s * 0.22))
    d.line([(x + s * 0.6 - s * 0.11, y - s * 0.65), (x + s * 0.6 - s * 0.11, y - s * 0.1)], fill=color, width=int(s * 0.22))
    d.rounded_rectangle([x - s, y - s * 0.2, x + s, y + s], radius=int(s * 0.18), fill=color)


def person(d, x, y, s, color):
    d.ellipse([x - s * 0.42, y - s * 1.5, x + s * 0.42, y - s * 0.66], fill=color)
    d.rounded_rectangle([x - s * 0.7, y - s * 0.55, x + s * 0.7, y + s * 0.6], radius=int(s * 0.5), fill=color)


def stamp(img, label, cx, cy, color, t, start, angle=-12, size=120):
    if t < start:
        return
    p = prog(t, start, 0.3)
    sc = lerp(2.4, 1.0, ease_out(p))
    spr = text_sprite(label, size, color, "black", box=None)
    pad = 26
    box = Image.new("RGBA", (spr.width + pad * 2, spr.height + pad * 2), (0, 0, 0, 0))
    bd = ImageDraw.Draw(box)
    bd.rounded_rectangle([4, 4, box.width - 5, box.height - 5], radius=20, outline=color, width=12)
    box.paste(spr, (pad, pad), spr)
    box = box.rotate(angle, expand=True, resample=Image.BICUBIC)
    paste(img, box, cx, cy, sc, alpha=min(1, p * 2))


# ---------------------------------------------------------------- render loop
def flash(img, a):
    if a <= 0.01:
        return img
    return Image.blend(img, Image.new("RGB", img.size, (255, 255, 255)), a)


def draw_captions(img, t, captions, style):
    for (s, e, txt) in captions:
        if s <= t < e:
            sc = 0.82 + 0.18 * ease_back(prog(t, s, 0.22))
            spr = text_sprite(txt, style.get("size", 66), style.get("color", (255, 255, 255)), "black",
                              stroke=style.get("stroke", 0), max_w=900,
                              box=style.get("box", (0, 0, 0, 200)), pad=30, radius=28)
            paste(img, spr, W / 2, style.get("y", 1500), sc)
            break


def render(path, duration, scenes, captions, bg, cap_style, overlay=None, audio=None, cut_flash=True):
    n = int(duration * FPS)
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
           "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-"]
    if audio:
        cmd += ["-i", audio, "-c:a", "aac", "-b:a", "192k", "-shortest"]
    cmd += ["-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
            "-movflags", "+faststart", path]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    starts = [s[0] for s in scenes]
    for f in range(n):
        t = f / FPS
        img = Image.new("RGB", (W, H), bg)
        d = ImageDraw.Draw(img)
        for (s, e, fn) in scenes:
            if s <= t < e:
                fn(img, d, t - s, e - s)
                break
        if overlay:
            overlay(img, ImageDraw.Draw(img), t)
        draw_captions(img, t, captions, cap_style)
        if cut_flash:
            for s in starts[1:]:
                if 0 <= t - s < 0.18:
                    img = flash(img, 0.55 * (1 - (t - s) / 0.18))
        proc.stdin.write(img.tobytes())
    proc.stdin.close()
    proc.wait()


# ---------------------------------------------------------------- audio
SR = 44100


def _env(n, attack, decay):
    a = max(1, int(attack * SR))
    e = np.exp(-np.arange(n) / (decay * SR))
    e[:a] *= np.linspace(0, 1, a)
    return e


def kick():
    n = int(0.35 * SR)
    t = np.arange(n) / SR
    f = 50 + 110 * np.exp(-t * 28)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * _env(n, 0.002, 0.12) * 1.0


def snare(rng):
    n = int(0.22 * SR)
    noise = rng.standard_normal(n)
    noise = noise - np.convolve(noise, np.ones(6) / 6, "same")  # crude high-pass
    t = np.arange(n) / SR
    tone = np.sin(2 * np.pi * 190 * t) * 0.5
    return (noise * 0.55 + tone) * _env(n, 0.001, 0.05) * 0.7


def hat(rng, open_=False):
    n = int((0.18 if open_ else 0.05) * SR)
    noise = rng.standard_normal(n)
    noise = noise - np.convolve(noise, np.ones(3) / 3, "same")
    return noise * _env(n, 0.001, 0.05 if open_ else 0.012) * 0.22


def saw(freq, n):
    t = np.arange(n) / SR
    return 2 * ((t * freq) % 1) - 1


def lowpass(x, k=8):
    return np.convolve(x, np.ones(k) / k, "same")


def whoosh(rng, dur=0.45):
    n = int(dur * SR)
    noise = lowpass(rng.standard_normal(n), 4)
    env = np.linspace(0, 1, n) ** 2.5
    env[-int(0.04 * SR):] *= np.linspace(1, 0, int(0.04 * SR))
    return noise * env * 0.35


def impact(rng):
    n = int(0.8 * SR)
    t = np.arange(n) / SR
    boom = np.sin(2 * np.pi * (40 + 60 * np.exp(-t * 10)) * t) * _env(n, 0.002, 0.3)
    return boom * 0.9 + lowpass(rng.standard_normal(n), 3) * _env(n, 0.001, 0.04) * 0.4


def make_track(path, duration, bpm, roots, cuts, impacts=(), drop=None, seed=7):
    """roots: list of bass note freqs, one per bar (cycled). cuts: times for whooshes.
    drop: (start, end) time where drums cut out for tension."""
    rng = np.random.default_rng(seed)
    n = int(duration * SR)
    mixb = np.zeros(n + SR * 2)
    beat = 60 / bpm
    K, S = kick(), snare(rng)

    def add(sig, at, gain=1.0):
        i = int(at * SR)
        if i < 0 or i >= len(mixb):
            return
        j = min(len(mixb), i + len(sig))
        mixb[i:j] += sig[: j - i] * gain

    nbeats = int(duration / beat) + 1
    for b in range(nbeats):
        tb = b * beat
        if drop and drop[0] <= tb < drop[1]:
            continue
        intro = tb < beat * 4  # first bar: just hats + bass for a cleaner hook
        bar_pos = b % 4
        if not intro:
            add(K, tb, 0.9)
            if bar_pos == 3:
                add(K, tb + beat * 0.5, 0.5)
            if bar_pos in (1, 3):
                add(S, tb, 0.8)
        for h in range(2):
            add(hat(rng, open_=(h == 1 and bar_pos == 3)), tb + h * beat / 2, 0.9)
        # bass: 8th notes on bar root
        root = roots[(b // 4) % len(roots)]
        for h in range(2):
            ln = int(beat / 2 * SR * 0.9)
            note = lowpass(saw(root * (2 if (h == 1 and bar_pos == 2) else 1), ln), 10) * _env(ln, 0.005, 0.12)
            add(note, tb + h * beat / 2, 0.32)
        # bright stab on the off-beat
        if not intro and bar_pos in (0, 2):
            ln = int(0.18 * SR)
            chord = sum(lowpass(saw(root * 4 * r, ln), 5) for r in (1, 1.26, 1.5)) / 3
            add(chord * _env(ln, 0.003, 0.06), tb + beat * 0.5, 0.16)
    for c in cuts:
        add(whoosh(rng), c - 0.42, 0.9)
    for c in impacts:
        add(impact(rng), c, 0.8)
    out = mixb[:n]
    # fade in/out
    fi, fo = int(0.05 * SR), int(1.2 * SR)
    out[:fi] *= np.linspace(0, 1, fi)
    out[-fo:] *= np.linspace(1, 0, fo)
    out = np.tanh(out * 1.2)  # soft clip glue
    out = out / (np.max(np.abs(out)) + 1e-9) * 0.7  # leave room for voiceover
    data = (out * 32767).astype(np.int16)
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())
