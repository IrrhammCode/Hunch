"""Generate Hunch brand icons/splash — dark bg + lime UP/DOWN swipe mark."""
from pathlib import Path

from PIL import Image, ImageDraw

BG = (10, 11, 13, 255)  # #0A0B0D
LIME = (214, 255, 63, 255)  # #D6FF3F
INK = (242, 241, 236, 255)

OUT = Path(__file__).resolve().parent.parent / "mobile" / "assets" / "images"
OUT.mkdir(parents=True, exist_ok=True)


def draw_mark(size: int, bg=None, mark=LIME, pad_ratio=0.18):
    """Chevron pair: UP above, DOWN below — swipe/speed silhouette."""
    img = Image.new("RGBA", (size, size), bg if bg is not None else BG)
    d = ImageDraw.Draw(img)
    pad = size * pad_ratio
    # usable square
    x0, y0 = pad, pad
    x1, y1 = size - pad, size - pad
    w = x1 - x0
    h = y1 - y0
    cx = size / 2
    stroke = max(2, int(size * 0.085))
    # UP chevron (top half)
    up_y = y0 + h * 0.32
    up_h = h * 0.28
    d.line(
        [(cx - w * 0.32, up_y + up_h), (cx, up_y), (cx + w * 0.32, up_y + up_h)],
        fill=mark,
        width=stroke,
        joint="curve",
    )
    # center slash bar (speed)
    mid_y = y0 + h * 0.52
    d.line(
        [(cx - w * 0.22, mid_y), (cx + w * 0.22, mid_y)],
        fill=mark,
        width=max(2, stroke - 1),
    )
    # DOWN chevron (bottom half)
    dn_y = y0 + h * 0.70
    dn_h = h * 0.28
    d.line(
        [(cx - w * 0.32, dn_y), (cx, dn_y + dn_h), (cx + w * 0.32, dn_y)],
        fill=mark,
        width=stroke,
        joint="curve",
    )
    return img


def save_icon(path: Path, size: int):
    draw_mark(size).save(path, "PNG")
    print(f"wrote {path} {size}x{size}")


def save_splash(path: Path, size: int = 1024):
    """Full-bleed dark splash with centered mark + tiny wordmark."""
    img = Image.new("RGBA", (size, size), BG)
    # soft top wash
    d = ImageDraw.Draw(img)
    for i in range(int(size * 0.45)):
        a = int(18 * (1 - i / (size * 0.45)))
        d.line([(0, i), (size, i)], fill=(14, 17, 12, a))
    mark = draw_mark(int(size * 0.42), bg=None, mark=LIME, pad_ratio=0.12)
    mw = mark.width
    img.alpha_composite(mark, ((size - mw) // 2, int(size * 0.28)))
    # tiny tagline bar as pure geometry (no font dependency issues at splash)
    tag_w = int(size * 0.28)
    tag_h = max(3, int(size * 0.008))
    tag_y = int(size * 0.72)
    d = ImageDraw.Draw(img)
    d.rounded_rectangle(
        [(size - tag_w) // 2, tag_y, (size + tag_w) // 2, tag_y + tag_h],
        radius=tag_h // 2,
        fill=(139, 142, 151, 180),
    )
    img.save(path, "PNG")
    print(f"wrote {path} {size}x{size}")


def save_adaptive_foreground(path: Path, size: int = 1024):
    """Foreground with more padding for Android adaptive safe zone (~66%)."""
    draw_mark(size, bg=(0, 0, 0, 0), mark=LIME, pad_ratio=0.28).save(path, "PNG")
    print(f"wrote {path} {size}x{size} (transparent fg)")


def save_adaptive_background(path: Path, size: int = 1024):
    Image.new("RGBA", (size, size), BG).save(path, "PNG")
    print(f"wrote {path} {size}x{size}")


def save_monochrome(path: Path, size: int = 1024):
    draw_mark(size, bg=(0, 0, 0, 0), mark=(242, 241, 236, 255), pad_ratio=0.28).save(path, "PNG")
    print(f"wrote {path} {size}x{size}")


if __name__ == "__main__":
    save_icon(OUT / "icon.png", 1024)
    save_icon(OUT / "favicon.png", 48)
    save_splash(OUT / "splash-icon.png", 1024)
    save_adaptive_foreground(OUT / "android-icon-foreground.png", 1024)
    save_adaptive_background(OUT / "android-icon-background.png", 1024)
    save_monochrome(OUT / "android-icon-monochrome.png", 1024)
    # also a 512 marketing/PFP-ish square
    save_icon(OUT / "icon-512.png", 512)
    print("done")
