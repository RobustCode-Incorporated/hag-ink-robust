#!/usr/bin/env python3
"""
Monte la vidéo cinématique du salon à partir des photos de /public.

Chaque "plan" est un mouvement de caméra virtuel (travelling, zoom, mise au point)
sur une photo. Les plans s'enchaînent en fondu, puis on applique un étalonnage
(contraste, tons chauds/froids, vignette, grain) et ffmpeg encode le résultat.

Usage :
    python3 scripts/build-scroll-video.py [scripts/video-shots.json]

Les plans (photo, cadrage, zoom, flou, courbe) sont décrits dans le JSON :
aucun code à toucher pour un nouveau salon.

Sorties (dans public/video/) :
    <prefix>-desktop.mp4  1280x720  (paysage)
    <prefix>-mobile.mp4   720x1280  (portrait)
    <prefix>-poster-desktop.jpg / <prefix>-poster-mobile.jpg

Les vidéos sont encodées avec des images clés rapprochées pour que le
défilement au scroll (avant/arrière) reste fluide.
"""
import json
import math
import os
import subprocess
import sys

import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC = os.path.join(ROOT, "public")
OUT_DIR = os.path.join(PUBLIC, "video")

FPS = 30
CROSSFADE = 0.7  # secondes de fondu entre deux plans


def ease_in_out(t):
    return 0.5 - 0.5 * math.cos(math.pi * t)


def punch(t):
    # Démarre vite puis freine : effet "coup de zoom".
    return 1 - (1 - t) ** 3


def speed_ramp(t):
    # Rapide au début et à la fin, très lent au milieu : effet "ralenti".
    return t - 0.8 * math.sin(2 * math.pi * t) / (2 * math.pi)


EASES = {"ease_in_out": ease_in_out, "punch": punch, "speed_ramp": speed_ramp}


def load_config(path):
    with open(path, encoding="utf-8") as f:
        cfg = json.load(f)
    for shot in cfg["shots"]:
        shot["ease"] = EASES[shot.get("ease", "ease_in_out")]
    return cfg


CONFIG_PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "scripts", "video-shots.json")
CONFIG = load_config(CONFIG_PATH)
SHOTS = CONFIG["shots"]
FPS = CONFIG.get("fps", FPS)
CROSSFADE = CONFIG.get("crossfade", CROSSFADE)
SATURATION = CONFIG.get("saturation", 0.8)

_cache = {}


def load(src):
    if src not in _cache:
        img = Image.open(os.path.join(PUBLIC, src)).convert("RGB")
        _cache[src] = img
    return _cache[src]


def lerp(a, b, t):
    return a + (b - a) * t


def render_shot(shot, t_local, size):
    W, H = size
    img = load(shot["src"])
    sw, sh = img.size
    p = shot["ease"](min(max(t_local / shot["dur"], 0.0), 1.0))
    a, b = shot["a"], shot["b"]
    cx = lerp(a["cx"], b["cx"], p) * sw
    cy = lerp(a["cy"], b["cy"], p) * sh
    zoom = lerp(a["zoom"], b["zoom"], p)
    blur = lerp(a.get("blur", 0), b.get("blur", 0), p)

    aspect = W / H
    fit_h = min(sh, sw / aspect)
    ch = fit_h / zoom
    cw = ch * aspect
    x0 = min(max(cx - cw / 2, 0), sw - cw)
    y0 = min(max(cy - ch / 2, 0), sh - ch)
    # EXTENT accepte des coordonnées flottantes : mouvement sans saccade.
    frame = img.transform((W, H), Image.Transform.EXTENT, (x0, y0, x0 + cw, y0 + ch),
                          Image.Resampling.BICUBIC)
    frame = frame.filter(ImageFilter.UnsharpMask(radius=1.4, percent=60, threshold=2))
    if blur > 0.3:
        frame = frame.filter(ImageFilter.GaussianBlur(blur))
    return np.asarray(frame, dtype=np.float32) / 255.0


def timeline(shots=None, crossfade=CROSSFADE):
    starts, t = [], 0.0
    for s in shots or SHOTS:
        starts.append(t)
        t += s["dur"] - crossfade
    return starts, t + crossfade


def make_grade(size):
    W, H = size
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    nx = (x - W / 2) / (W / 2)
    ny = (y - H / 2) / (H / 2)
    r = np.sqrt(nx ** 2 + ny ** 2) / math.sqrt(2)
    vignette = 1.0 - 0.55 * np.clip(r, 0, 1) ** 2.2
    return vignette[..., None]


def grade(frame, vignette, rng):
    f = frame
    # Désaturation légère
    lum = (0.2126 * f[..., 0] + 0.7152 * f[..., 1] + 0.0722 * f[..., 2])[..., None]
    f = lum + (f - lum) * SATURATION
    # Courbe en S (contraste "film")
    f = np.clip(f, 0, 1)
    f = f * f * (3 - 2 * f) * 0.6 + f * 0.4
    # Ombres froides, hautes lumières chaudes
    lum = lum.squeeze(-1)
    shadow = (1 - lum)[..., None] ** 2
    high = lum[..., None] ** 2
    f = f + shadow * np.array([-0.015, 0.0, 0.025]) + high * np.array([0.035, 0.015, -0.02])
    # Noirs légèrement relevés
    f = 0.03 + f * 0.95
    f = f * vignette
    # Grain
    f = f + rng.normal(0, 0.011, f.shape[:2])[..., None]
    return np.clip(f, 0, 1)


def build(size, out_name, shots=SHOTS, grade_fn=grade, crossfade=CROSSFADE):
    W, H = size
    os.makedirs(OUT_DIR, exist_ok=True)
    out_path = os.path.join(OUT_DIR, out_name)
    starts, total = timeline(shots, crossfade)
    n_frames = int(round(total * FPS))
    vignette = make_grade(size)
    rng = np.random.default_rng(7)

    cmd = [
        "ffmpeg", "-y", "-loglevel", "error",
        "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
        "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "29",
        "-pix_fmt", "yuv420p", "-profile:v", "high",
        # Image clé toutes les 6 images : le scroll arrière reste fluide.
        "-g", "6", "-keyint_min", "6", "-sc_threshold", "0",
        "-movflags", "+faststart", out_path,
    ]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    poster = None
    for i in range(n_frames):
        t = i / FPS
        frame, weight = None, 0.0
        for shot, start in zip(shots, starts):
            local = t - start
            if local < 0 or local > shot["dur"]:
                continue
            # Poids de fondu : monte au début du plan, descend à la fin.
            w = min(1.0, local / crossfade if start > 0 else 1.0,
                    (shot["dur"] - local) / crossfade if shot is not shots[-1] else 1.0)
            w = max(w, 0.0)
            img = render_shot(shot, local, size)
            frame = img * w if frame is None else frame + img * w
            weight += w
        frame = frame / max(weight, 1e-6)
        out = (grade_fn(frame, vignette, rng) * 255).astype(np.uint8)
        if i == 0:
            poster = out
        proc.stdin.write(out.tobytes())
        if i % 60 == 0:
            sys.stdout.write(f"\r{out_name}: {i}/{n_frames}")
            sys.stdout.flush()
    proc.stdin.close()
    proc.wait()
    base, kind = out_name[:-4].rsplit("-", 1)
    Image.fromarray(poster).save(os.path.join(OUT_DIR, f"{base}-poster-{kind}.jpg"), quality=82)
    print(f"\r{out_name}: {n_frames} images, {total:.1f}s -> {out_path}")


if __name__ == "__main__":
    starts, total = timeline(SHOTS, CROSSFADE)
    print(f"{len(SHOTS)} plans, {total:.1f}s — début de chaque plan (part de la vidéo) :")
    for s_, st in zip(SHOTS, starts):
        print(f"  {s_['name']:<22} {st:5.2f}s  ({st / total:.3f})")
    first_detail = next((st for s_, st in zip(SHOTS, starts) if not s_.get("intro")), total)
    print(f"INTRO_SHARE à reporter dans src/components/site/ScrollVideoBackground.tsx : {first_detail / total:.2f}")
    prefix = CONFIG.get("prefix", "salon")
    for size, kind in (((1280, 720), "desktop"), ((720, 1280), "mobile")):
        build(size, f"{prefix}-{kind}.mp4", SHOTS, grade, CROSSFADE)
