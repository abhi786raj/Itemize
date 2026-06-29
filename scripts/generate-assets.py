"""Generate PNG icons and mobile splash screens."""

from __future__ import annotations

import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
SPLASH = ASSETS / "splash"

ICON_SIZES = (16, 48, 128, 192, 512)
MASKABLE_SIZE = 512

SPLASH_SCREENS = (
    (1290, 2796, "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"),
    (1179, 2556, "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"),
    (1170, 2532, "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"),
    (1284, 2778, "(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"),
    (828, 1792, "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"),
    (750, 1334, "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"),
    (1668, 2388, "(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"),
    (2048, 2732, "(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"),
)

BG = (15, 23, 42)
BG_TOP = (129, 140, 248)
BG_BOTTOM = (67, 56, 202)
WHITE = (255, 255, 255, 255)
INDIGO = (79, 70, 229, 255)
LINE_COLORS = [
    (99, 102, 241, 140),
    (99, 102, 241, 115),
    (99, 102, 241, 90),
    (99, 102, 241, 72),
]


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def blend(bg: tuple[int, int, int], fg: tuple[int, int, int, int]) -> tuple[int, int, int, int]:
    fr, fg_c, fb, fa = fg
    if fa <= 0:
        return (*bg, 255)
    alpha = fa / 255
    inv = 1 - alpha
    return (
        int(fr * alpha + bg[0] * inv),
        int(fg_c * alpha + bg[1] * inv),
        int(fb * alpha + bg[2] * inv),
        255,
    )


def rounded_rect_mask(x: float, y: float, w: float, h: float, r: float, px: float, py: float) -> bool:
    if px < x or py < y or px > x + w or py > y + h:
        return False
    r = min(r, w / 2, h / 2)
    if px < x + r and py < y + r:
        return (px - (x + r)) ** 2 + (py - (y + r)) ** 2 <= r ** 2
    if px > x + w - r and py < y + r:
        return (px - (x + w - r)) ** 2 + (py - (y + r)) ** 2 <= r ** 2
    if px < x + r and py > y + h - r:
        return (px - (x + r)) ** 2 + (py - (y + h - r)) ** 2 <= r ** 2
    if px > x + w - r and py > y + h - r:
        return (px - (x + w - r)) ** 2 + (py - (y + h - r)) ** 2 <= r ** 2
    return True


def render_icon(size: int, *, on_dark: bool = False) -> list[tuple[int, int, int, int]]:
    pixels: list[tuple[int, int, int, int]] = []
    scale = size / 512

    def s(v: float) -> float:
        return v * scale

    for py in range(size):
        if on_dark:
            row_bg = BG
        else:
            t = py / max(size - 1, 1)
            row_bg = (
                int(lerp(BG_TOP[0], BG_BOTTOM[0], t)),
                int(lerp(BG_TOP[1], BG_BOTTOM[1], t)),
                int(lerp(BG_TOP[2], BG_BOTTOM[2], t)),
            )
        for px in range(size):
            color = (*row_bg, 255)

            if rounded_rect_mask(s(0), s(0), s(512), s(512), s(112), px + 0.5, py + 0.5):
                if not on_dark:
                    shine = blend(row_bg, (255, 255, 255, int(255 * 0.18)))
                    if rounded_rect_mask(s(72), s(72), s(368), s(200), s(100), px + 0.5, py + 0.5):
                        color = shine
                    else:
                        color = (*row_bg, 255)

                if rounded_rect_mask(s(148), s(124), s(216), s(264), s(28), px + 0.5, py + 0.5):
                    color = WHITE
                elif rounded_rect_mask(s(188), s(188), s(136), s(22), s(11), px + 0.5, py + 0.5):
                    color = INDIGO
                else:
                    lines = [
                        (236, 104, 16, 8, LINE_COLORS[0]),
                        (272, 120, 16, 8, LINE_COLORS[1]),
                        (308, 88, 16, 8, LINE_COLORS[2]),
                        (344, 108, 16, 8, LINE_COLORS[3]),
                    ]
                    for ly, lw, lh, lr, lc in lines:
                        if rounded_rect_mask(s(188), s(ly), s(lw), s(lh), s(lr), px + 0.5, py + 0.5):
                            color = blend(row_bg, lc)
                            break

            pixels.append(color)
    return pixels


def render_maskable_icon(size: int) -> list[tuple[int, int, int, int]]:
    icon_size = int(size * 0.62)
    icon = render_icon(icon_size)
    offset = (size - icon_size) // 2
    pixels = [(*BG, 255)] * (size * size)

    for y in range(icon_size):
        for x in range(icon_size):
            pixels[(offset + y) * size + offset + x] = icon[y * icon_size + x]
    return pixels


def render_splash(width: int, height: int) -> list[tuple[int, int, int, int]]:
    icon_size = min(width, height) // 4
    icon = render_icon(icon_size)
    center_x = width // 2
    center_y = int(height * 0.42)
    offset_x = center_x - icon_size // 2
    offset_y = center_y - icon_size // 2

    pixels = [(*BG, 255)] * (width * height)

    for y in range(icon_size):
        for x in range(icon_size):
            ix = offset_x + x
            iy = offset_y + y
            if 0 <= ix < width and 0 <= iy < height:
                pixels[iy * width + ix] = icon[y * icon_size + x]

    return pixels


def write_png(path: Path, width: int, height: int, pixels: list[tuple[int, int, int, int]]) -> None:
    raw = bytearray()
    for y in range(height):
        raw.append(0)
        start = y * width
        for x in range(width):
            r, g, b, a = pixels[start + x]
            raw.extend((r, g, b, a))

    compressed = zlib.compress(bytes(raw), 9)

    def chunk(tag: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", compressed) + chunk(b"IEND", b"")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(png)


def main() -> None:
    ASSETS.mkdir(parents=True, exist_ok=True)
    SPLASH.mkdir(parents=True, exist_ok=True)

    for size in ICON_SIZES:
        out = ASSETS / f"icon-{size}.png"
        write_png(out, size, size, render_icon(size))
        print(f"Wrote {out.relative_to(ROOT)}")

    maskable = ASSETS / "icon-512-maskable.png"
    write_png(maskable, MASKABLE_SIZE, MASKABLE_SIZE, render_maskable_icon(MASKABLE_SIZE))
    print(f"Wrote {maskable.relative_to(ROOT)}")

    splash_links: list[str] = []
    for width, height, media in SPLASH_SCREENS:
        filename = f"splash-{width}x{height}.png"
        out = SPLASH / filename
        write_png(out, width, height, render_splash(width, height))
        splash_links.append(
            f'    <link rel="apple-touch-startup-image" media="{media}" href="./assets/splash/{filename}" />'
        )
        print(f"Wrote {out.relative_to(ROOT)}")

    snippet = ROOT / "assets" / "splash-links.html"
    snippet.write_text("\n".join(splash_links) + "\n", encoding="utf-8")
    print(f"Wrote {snippet.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
