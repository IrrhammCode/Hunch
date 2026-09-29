from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
d = Path(r"C:\Users\Irham\Documents\code\metropolis\mobile\assets\tokens")
specs = {
    "mon": ("#836EF9", "M", "#FFFFFF"),
    "lit": ("#3B82F6", "L", "#FFFFFF"),
    "pump": ("#FF007A", "P", "#FFFFFF"),
}
for name, (bg, glyph, fg) in specs.items():
    p = d / (name + ".png")
    if p.exists() and p.stat().st_size > 500:
        print("keep", name)
        continue
    img = Image.new("RGBA", (128, 128), (0, 0, 0, 0))
    dr = ImageDraw.Draw(img)
    dr.ellipse((4, 4, 124, 124), fill=bg)
    try:
        font = ImageFont.truetype("arial.ttf", 72)
    except Exception:
        font = ImageFont.load_default()
    bbox = dr.textbbox((0, 0), glyph, font=font)
    w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
    dr.text(((128 - w) / 2 - bbox[0], (128 - h) / 2 - bbox[1]), glyph, font=font, fill=fg)
    img.save(p)
    print("generated", name, p.stat().st_size)
print("done")
