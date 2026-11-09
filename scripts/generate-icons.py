"""Builds the PWA icon set from public/icons/logo-mark.png (the P mark, transparent).

    npm run icons        (needs Pillow: pip install pillow)

Black square, white mark centred. The "maskable" ones keep the mark inside the safe zone
(the OS may crop to a circle), so it is a little smaller.
"""
import base64
from pathlib import Path

from PIL import Image

ICONS = Path(__file__).resolve().parent.parent / "public" / "icons"
mark = Image.open(ICONS / "logo-mark.png").convert("RGBA")

# (file, size, share of the icon's height the mark takes)
SET = [
    ("icon-192.png", 192, 0.62),
    ("icon-512.png", 512, 0.62),
    ("icon-192-maskable.png", 192, 0.5),
    ("icon-512-maskable.png", 512, 0.5),
    ("apple-touch-icon.png", 180, 0.6),
]


def render(size: int, share: float) -> Image.Image:
    ss = size * 2  # draw at 2x, shrink: smooth edges
    canvas = Image.new("RGBA", (ss, ss), (0, 0, 0, 255))
    h = round(ss * share)
    w = round(mark.width * h / mark.height)
    m = mark.resize((w, h), Image.LANCZOS)
    canvas.alpha_composite(m, ((ss - w) // 2, (ss - h) // 2))
    return canvas.resize((size, size), Image.LANCZOS).convert("RGBA")


for name, size, share in SET:
    render(size, share).save(ICONS / name, optimize=True)
    print("wrote", name)

# icon.svg (favicon / "any" in the manifest): the same, with the mark embedded.
b64 = base64.b64encode((ICONS / "logo-mark.png").read_bytes()).decode()
mw = 64 * 0.62 * mark.width / mark.height
svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="PERFORMANCE">
  <rect width="64" height="64" rx="14" fill="#000"/>
  <image href="data:image/png;base64,{b64}" x="{(64 - mw) / 2:.2f}" y="{64 * 0.19:.2f}" width="{mw:.2f}" height="{64 * 0.62:.2f}"/>
</svg>
"""
(ICONS / "icon.svg").write_text(svg, encoding="utf-8")
print("wrote icon.svg")
