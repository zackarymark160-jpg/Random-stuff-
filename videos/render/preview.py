import sys, importlib
from PIL import Image, ImageDraw
import engine
mod = importlib.import_module(sys.argv[1]); outdir = sys.argv[2]
times = [float(x) for x in sys.argv[3:]]
thumbs = []
for T in times:
    img = Image.new("RGB", (engine.W, engine.H), mod.BG); d = ImageDraw.Draw(img)
    for s, e, fn in mod.SCENES:
        if s <= T < e: fn(img, d, T - s, e - s); break
    if hasattr(mod, "overlay"): mod.overlay(img, ImageDraw.Draw(img), T)
    engine.draw_captions(img, T, mod.CAPTIONS, mod.CAP)
    thumbs.append(img.resize((360, 640)))
sheet = Image.new("RGB", (360 * len(thumbs), 640), (0, 0, 0))
for i, th in enumerate(thumbs): sheet.paste(th, (i * 360, 0))
sheet.save(f"{outdir}/{sys.argv[1]}_sheet.png")
