# Social Video Kits

AI-generated vertical (9:16) videos for TikTok and Reels, ~50–55 sec each.

| Video | Hook | Kit |
|-------|------|-----|
| SPASD Student Voice | "Ever wonder who actually decides what happens at your school?" | [01-SPASD-student-voice.md](01-SPASD-student-voice.md) |
| SP-ALPR ride-along | "There's a camera in Sun Prairie that's probably read your license plate." | [02-SP-ALPR-ride-along.md](02-SP-ALPR-ride-along.md) |

Each kit includes: character sheet → shot-by-shot script (VO + on-screen text) → AI video prompts → CapCut editing recipe → caption/hashtags → fact-check list.

## 🎥 Rendered videos (`out/`)

| File | Length |
|------|--------|
| `out/SP-ALPR_its-read-your-plate.mp4` | 55s · 1080×1920 · animated graphics + captions + beat |
| `out/SPASD_who-decides.mp4` | 52s · 1080×1920 · animated graphics + captions + beat |

These are motion-graphics videos (illustrations + kinetic captions + an original synth beat), with no AI people or fake footage. The captions carry the full script, so they work sound-off. To add a voice, record the script over them in CapCut and drop the music to ~20%.

**Re-render after editing the text or timing:**
```bash
cd videos/render
python3 alpr.py ../out/SP-ALPR_its-read-your-plate.mp4
python3 spasd.py ../out/SPASD_who-decides.mp4
python3 preview.py alpr /tmp 1.5 12 39   # quick contact-sheet of frames at given seconds
```
Needs only Python 3 + Pillow + numpy + ffmpeg. Captions live in the `CAPTIONS` list in each file.
