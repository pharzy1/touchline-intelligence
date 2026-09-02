from pathlib import Path
import sys
from PIL import Image, ImageDraw, ImageFont

source = Path(sys.argv[1] if len(sys.argv) > 1 else "/private/tmp/touchline-demo-frames")
target = Path(sys.argv[2] if len(sys.argv) > 2 else "public/demo.gif")
spec = [
    ("01-valuation-baseline.png", "01  VALUATION", "Start with a player profile", 1500),
    ("02-valuation-updated.png", "01  VALUATION", "Change the inputs. Inspect the estimate.", 1900),
    ("03-scouting-search.png", "02  SCOUTING", "Search 414 Premier League profiles", 1500),
    ("04-scouting-results.png", "02  SCOUTING", "Explain the closest alternatives", 2200),
    ("05-transfer-builder.png", "03  TRANSFERS", "Build a replacement shortlist", 1700),
    ("06-transfer-comparison.png", "03  TRANSFERS", "Inspect replacement cost and savings", 2300),
]

font_path = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
small_font = ImageFont.truetype(font_path, 17)
large_font = ImageFont.truetype(font_path, 25)
frames, durations = [], []
for filename, section, caption, duration in spec:
    image = Image.open(source / filename).convert("RGB").resize((960, 540), Image.Resampling.LANCZOS)
    draw = ImageDraw.Draw(image, "RGBA")
    draw.rounded_rectangle((24, 22, 585, 96), radius=9, fill=(16, 26, 21, 235))
    draw.text((45, 36), section, font=small_font, fill=(217, 255, 67))
    draw.text((45, 60), caption, font=large_font, fill=(255, 255, 255))
    frames.append(image.quantize(colors=128, method=Image.Quantize.MEDIANCUT))
    durations.append(duration)

target.parent.mkdir(parents=True, exist_ok=True)
frames[0].save(target, save_all=True, append_images=frames[1:], duration=durations, loop=0, optimize=True, disposal=2)
print(f"Wrote {target} ({sum(durations) / 1000:.1f}s)")
