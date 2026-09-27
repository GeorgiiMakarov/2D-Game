"""Chroma-key + slice sprite sheets into game-ready PNGs.

Legacy: герой и слизни теперь рисуются полностью процедурно
(src/render/hero.js, src/render/creatures.js, src/game/slime.js),
поэтому обработка их листов отключена. Скрипт оставлен для истории.
"""
import os
import json
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ART = os.path.join(HERE, '..', 'public', 'art')
OUT = os.path.join(HERE, '..', 'public', 'sprites')
os.makedirs(OUT, exist_ok=True)


def key_magenta(path):
    im = Image.open(path).convert('RGBA')
    a = np.array(im).astype(np.int16)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mask = (r > 150) & (b > 150) & (g < 130) & (np.abs(r - b) < 90)
    a[..., 3] = np.where(mask, 0, 255)
    halo = (~mask) & (r > 140) & (b > 140) & (g < 160)
    a[halo, 3] = 90
    return Image.fromarray(a.astype(np.uint8))


def slice_frames(im, min_gap=14):
    alpha = np.array(im)[..., 3]
    cols = (alpha > 32).sum(axis=0) > 8
    frames, start, gap = [], None, 0
    for x, filled in enumerate(cols):
        if filled:
            if start is None:
                start = x
            gap = 0
        elif start is not None:
            gap += 1
            if gap >= min_gap:
                frames.append((start, x - gap))
                start = None
    if start is not None:
        frames.append((start, len(cols) - 1))
    return [f for f in frames if f[1] - f[0] > 20]


def trim(im):
    bbox = im.getbbox()
    return im.crop(bbox) if bbox else im


def pixelate(im, target_h):
    w, h = im.size
    tw = max(1, round(w * target_h / h))
    return im.resize((tw, target_h), Image.NEAREST)


def process(name, src, target_h):
    im = key_magenta(os.path.join(ART, src))
    spans = slice_frames(im)
    out = []
    for i, (x0, x1) in enumerate(spans):
        fr = pixelate(trim(im.crop((x0, 0, x1 + 1, im.height))), target_h)
        p = f'{name}{i}.png'
        fr.save(os.path.join(OUT, p))
        out.append('sprites/' + p)
        print(f'  {p} {fr.size}')
    return out


if __name__ == '__main__':
    print('Герой, враги и слизни — процедурный пиксель-арт, листы больше не нужны.')
