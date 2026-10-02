"""Generate Hunch brand icons & transparent assets — Electric Lime theme (#D6FF3F)."""
from pathlib import Path
from PIL import Image
import numpy as np

SOURCE_IMAGE = Path(__file__).resolve().parent / "hunch_lime_source.png"
OUT = Path(__file__).resolve().parent.parent / "mobile" / "assets" / "images"
OUT.mkdir(parents=True, exist_ok=True)
BG_COLOR = (10, 11, 13)  # #0A0B0D


def extract_transparent_emblem(img_path: Path) -> Image.Image:
    """Extract transparent RGBA emblem using precision dehalo alpha matte."""
    img = Image.open(img_path).convert("RGB")
    arr = np.array(img, dtype=float)
    max_c = arr.max(axis=2)

    low_thresh = 18.0
    high_thresh = 120.0
    norm = np.clip((max_c - low_thresh) / (high_thresh - low_thresh), 0.0, 1.0)
    alpha = norm * norm * (3 - 2 * norm)

    alpha_safe = np.maximum(alpha, 0.15)[:, :, None]
    unpremul = arr / alpha_safe
    clean_rgb = np.clip(unpremul, 0, 255)

    rgba = np.zeros((1024, 1024, 4), dtype=np.uint8)
    rgba[:, :, :3] = clean_rgb.astype(np.uint8)
    rgba[:, :, 3] = (alpha * 255.0).astype(np.uint8)
    return Image.fromarray(rgba, "RGBA")


def build_all_assets():
    if not SOURCE_IMAGE.exists():
        fallback = OUT / "hunch-logo-transparent.png"
        if fallback.exists():
            master_transparent = Image.open(fallback).convert("RGBA")
        else:
            raise FileNotFoundError(f"Source image not found: {SOURCE_IMAGE}")
    else:
        master_transparent = extract_transparent_emblem(SOURCE_IMAGE)

    # 1. Master transparent logo (1024x1024)
    master_transparent.save(OUT / "hunch-logo-transparent.png", "PNG")

    # 2. iOS App Store Icon (1024x1024 solid RGB, NO alpha)
    icon_canvas = Image.new("RGBA", (1024, 1024), (*BG_COLOR, 255))
    emblem_78 = master_transparent.resize(
        (int(1024 * 0.80), int(1024 * 0.80)), Image.Resampling.LANCZOS
    )
    ox = (1024 - emblem_78.width) // 2
    oy = (1024 - emblem_78.height) // 2
    icon_canvas.alpha_composite(emblem_78, (ox, oy))
    icon_rgb = icon_canvas.convert("RGB")
    icon_rgb.save(OUT / "icon.png", "PNG")

    # 3. 512 Icon
    icon_rgb.resize((512, 512), Image.Resampling.LANCZOS).save(OUT / "icon-512.png", "PNG")

    # 4. Android adaptive foreground (transparent safe-zone ~62%)
    fg_canvas = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    emblem_62 = master_transparent.resize(
        (int(1024 * 0.62), int(1024 * 0.62)), Image.Resampling.LANCZOS
    )
    fox = (1024 - emblem_62.width) // 2
    foy = (1024 - emblem_62.height) // 2
    fg_canvas.alpha_composite(emblem_62, (fox, foy))
    fg_canvas.save(OUT / "android-icon-foreground.png", "PNG")

    # 5. Android background
    Image.new("RGBA", (1024, 1024), (*BG_COLOR, 255)).save(OUT / "android-icon-background.png", "PNG")

    # 6. Android monochrome
    mono_arr = np.zeros((1024, 1024, 4), dtype=np.uint8)
    mono_arr[:, :, :3] = 240
    mono_arr[:, :, 3] = np.array(fg_canvas)[:, :, 3]
    Image.fromarray(mono_arr, "RGBA").save(OUT / "android-icon-monochrome.png", "PNG")

    # 7. Splash icon (transparent)
    splash_canvas = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    emblem_splash = master_transparent.resize(
        (int(1024 * 0.48), int(1024 * 0.48)), Image.Resampling.LANCZOS
    )
    sox = (1024 - emblem_splash.width) // 2
    soy = (1024 - emblem_splash.height) // 2
    splash_canvas.alpha_composite(emblem_splash, (sox, soy))
    splash_canvas.save(OUT / "splash-icon.png", "PNG")

    # 8. Favicon
    master_transparent.resize((48, 48), Image.Resampling.LANCZOS).save(OUT / "favicon.png", "PNG")
    print("All Hunch brand assets updated successfully!")


if __name__ == "__main__":
    build_all_assets()
