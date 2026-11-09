"""Usage: python3 preview2.py spasd2 OUTDIR [seconds...]  (no seconds = list scene/line timings)"""
import sys, importlib
from PIL import Image, ImageDraw
import engine2 as E
mod = importlib.import_module(sys.argv[1]); outdir = sys.argv[2]
import os
if os.environ.get("VARIANT"): mod.VARIANT = os.environ["VARIANT"]
v, total, scenes, chunks = mod.setup()
print("total", round(total, 2)); print({k: (round(a, 2), round(b, 2)) for k, (a, b) in E._TL.items()})
times = [float(x) for x in sys.argv[3:]]
thumbs = []
for T in times:
    img = Image.new("RGB", (E.W, E.H), mod.BG); d = ImageDraw.Draw(img)
    for s, e, fn in scenes:
        if s <= T < e: fn(img, d, T - s, e - s, T); break
    mod.overlay(img, ImageDraw.Draw(img), T)
    E.draw_karaoke(img, T, chunks)
    thumbs.append(img.resize((360, 640)))
if thumbs:
    sheet = Image.new("RGB", (360 * len(thumbs), 640))
    for i, th in enumerate(thumbs): sheet.paste(th, (i * 360, 0))
    sheet.save(f"{outdir}/{sys.argv[1]}_sheet.png")
