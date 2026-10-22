#!/usr/bin/env python3
"""
Monte la vidéo cinématique du salon à partir des photos de /public.

Chaque "plan" est un mouvement de caméra virtuel (travelling, zoom, mise au point)
sur une photo. Les plans s'enchaînent en fondu, puis on applique un étalonnage
(contraste, tons chauds/froids, vignette, grain) et ffmpeg encode le résultat.

Usage :
    python3 scripts/build-salon-video.py              # style "cinema" (page client)
    python3 scripts/build-salon-video.py noir-rouge   # style noir & blanc, rouge conservé

Sorties (dans public/video/) :
    salon-desktop.mp4  1280x720  (paysage)
    salon-mobile.mp4   720x1280  (portrait)
    salon-poster-desktop.jpg / salon-poster-mobile.jpg

Pour ajouter des photos : déposez-les dans public/ et ajoutez des plans dans SHOTS.
Les vidéos sont encodées avec des images clés rapprochées pour que le
défilement au scroll (avant/arrière) reste fluide.
"""
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


# cx, cy : centre du cadre (0..1 dans la photo). zoom : 1 = cadre le plus large possible.
# blur : flou en pixels (pour simuler une mise au point).
#
# Photos : public/interior.jpg, public/tools.jpg, et public/salon/* (Instagram @hag_ink_barber_243).
# Les plans "intro" doivent rester en tête : la page les joue pendant les chapitres
# d'introduction (voir SALON_INTRO_SHARE dans ScrollVideoBackground.tsx).
SHOTS = [
    # --- Intro : l'espace et l'équipe ---
    dict(name="plafond", src="interior.jpg", dur=4.0, ease=ease_in_out, intro=True,
         a=dict(cx=0.45, cy=0.10, zoom=2.4, blur=6), b=dict(cx=0.50, cy=0.50, zoom=1.0, blur=0)),
    dict(name="tv-fauteuil", src="salon/fauteuil-plafond.jpg", dur=3.6, ease=ease_in_out, intro=True,
         a=dict(cx=0.40, cy=0.22, zoom=2.0), b=dict(cx=0.45, cy=0.55, zoom=1.05)),
    dict(name="mur-tableau", src="salon/locks-2.jpg", dur=3.4, ease=ease_in_out, intro=True,
         a=dict(cx=0.30, cy=0.30, zoom=1.9), b=dict(cx=0.70, cy=0.28, zoom=1.7)),
    dict(name="equipe", src="salon/equipe-salon-2.jpg", dur=3.4, ease=ease_in_out, intro=True,
         a=dict(cx=0.25, cy=0.32, zoom=1.9), b=dict(cx=0.62, cy=0.28, zoom=1.6)),
    dict(name="barbers-au-travail", src="salon/equipe-salon-1.jpg", dur=3.2, ease=ease_in_out, intro=True,
         a=dict(cx=0.62, cy=0.40, zoom=1.4), b=dict(cx=0.55, cy=0.36, zoom=2.0)),
    dict(name="anneau-lumineux", src="salon/anneau-lumineux.jpg", dur=3.2, ease=ease_in_out, intro=True,
         a=dict(cx=0.62, cy=0.08, zoom=2.6, blur=5), b=dict(cx=0.55, cy=0.35, zoom=1.4, blur=0)),
    # --- Détails : outils et coiffures ---
    dict(name="outils-large", src="tools.jpg", dur=2.8, ease=ease_in_out,
         a=dict(cx=0.50, cy=0.55, zoom=1.0, blur=4), b=dict(cx=0.50, cy=0.60, zoom=1.2, blur=0)),
    dict(name="tondeuse-ralenti", src="tools.jpg", dur=4.0, ease=speed_ramp,
         a=dict(cx=0.48, cy=0.68, zoom=2.0, blur=3), b=dict(cx=0.66, cy=0.70, zoom=2.4, blur=0)),
    dict(name="locks-ralenti", src="salon/locks-1.jpg", dur=4.0, ease=speed_ramp,
         a=dict(cx=0.50, cy=0.60, zoom=2.0, blur=4), b=dict(cx=0.44, cy=0.55, zoom=2.7, blur=0)),
    dict(name="couleur-rouge", src="salon/client-couleur-rouge.jpg", dur=3.2, ease=ease_in_out,
         a=dict(cx=0.72, cy=0.36, zoom=2.0), b=dict(cx=0.66, cy=0.45, zoom=1.4)),
    dict(name="brosse-or", src="tools.jpg", dur=3.0, ease=ease_in_out,
         a=dict(cx=0.27, cy=0.62, zoom=2.4), b=dict(cx=0.28, cy=0.50, zoom=1.9)),
    dict(name="success", src="salon/mur-success.jpg", dur=3.4, ease=ease_in_out,
         a=dict(cx=0.18, cy=0.45, zoom=1.8), b=dict(cx=0.45, cy=0.40, zoom=1.6)),
    # --- Final ---
    dict(name="final", src="interior.jpg", dur=3.6, ease=ease_in_out,
         a=dict(cx=0.50, cy=0.62, zoom=1.15), b=dict(cx=0.50, cy=0.55, zoom=1.0)),
]

# Style "Noir & Rouge" : coupes rapides, tout en noir et blanc sauf le rouge.
NOIR_ROUGE_SHOTS = [
    dict(name="tondeuse", src="tools.jpg", dur=2.6, ease=punch,
         a=dict(cx=0.62, cy=0.68, zoom=2.7), b=dict(cx=0.60, cy=0.66, zoom=2.0)),
    dict(name="rouge-face", src="salon/client-couleur-rouge-2.jpg", dur=2.6, ease=punch,
         a=dict(cx=0.74, cy=0.30, zoom=2.4), b=dict(cx=0.70, cy=0.38, zoom=1.6)),
    dict(name="rouge-dos", src="salon/fauteuil-plafond-2.jpg", dur=2.6, ease=punch,
         a=dict(cx=0.50, cy=0.45, zoom=1.8), b=dict(cx=0.48, cy=0.42, zoom=1.15)),
    dict(name="success", src="salon/mur-success.jpg", dur=2.8, ease=ease_in_out,
         a=dict(cx=0.28, cy=0.38, zoom=1.7), b=dict(cx=0.48, cy=0.42, zoom=1.9)),
    dict(name="locks", src="salon/locks-1.jpg", dur=2.8, ease=speed_ramp,
         a=dict(cx=0.42, cy=0.50, zoom=2.5), b=dict(cx=0.44, cy=0.52, zoom=1.8)),
    dict(name="equipe", src="salon/equipe-salon-1.jpg", dur=2.6, ease=punch,
         a=dict(cx=0.50, cy=0.38, zoom=1.9), b=dict(cx=0.52, cy=0.36, zoom=1.3)),
    dict(name="tv-fauteuil", src="salon/fauteuil-plafond.jpg", dur=2.6, ease=punch,
         a=dict(cx=0.40, cy=0.20, zoom=2.4), b=dict(cx=0.44, cy=0.45, zoom=1.2)),
    dict(name="anneau", src="salon/anneau-lumineux.jpg", dur=2.6, ease=punch,
         a=dict(cx=0.60, cy=0.12, zoom=2.4), b=dict(cx=0.56, cy=0.30, zoom=1.4)),
    dict(name="final", src="interior.jpg", dur=3.2, ease=ease_in_out,
         a=dict(cx=0.50, cy=0.55, zoom=1.4), b=dict(cx=0.50, cy=0.55, zoom=1.0)),
]

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
    f = lum + (f - lum) * 0.8
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


def grade_noir_rouge(frame, vignette, rng):
    f = np.clip(frame, 0, 1)
    r, g, b = f[..., 0], f[..., 1], f[..., 2]
    gray = (0.2126 * r + 0.7152 * g + 0.0722 * b)[..., None]
    # Contraste fort pour le noir et blanc
    gray = np.clip((gray - 0.5) * 1.35 + 0.47, 0, 1)
    gray = gray * gray * (3 - 2 * gray)
    # Masque du rouge : on garde la couleur là où le rouge domine nettement
    sat_red = r - np.maximum(g, b)
    red = np.clip((sat_red - 0.20) * 6, 0, 1)[..., None]
    color = np.clip(f * np.array([1.15, 0.85, 0.85]), 0, 1)
    f = gray * (1 - red) + color * red
    f = 0.02 + f * 0.96
    f = f * (vignette ** 1.4)
    f = f + rng.normal(0, 0.016, f.shape[:2])[..., None]
    return np.clip(f, 0, 1)


VARIANTS = {
    "cinema": dict(shots=SHOTS, grade=grade, crossfade=CROSSFADE, prefix="salon"),
    "noir-rouge": dict(shots=NOIR_ROUGE_SHOTS, grade=grade_noir_rouge, crossfade=0.3,
                       prefix="noir-rouge"),
}


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
    name = sys.argv[1] if len(sys.argv) > 1 else "cinema"
    v = VARIANTS[name]
    starts, total = timeline(v["shots"], v["crossfade"])
    print(f"Style {name} — début de chaque plan (part de la vidéo) :")
    for s, st in zip(v["shots"], starts):
        print(f"  {s['name']:<18} {st:5.2f}s  ({st / total:.3f})")
    if name == "cinema":
        first_detail = next(st for s, st in zip(SHOTS, starts) if not s.get("intro"))
        print(f"SALON_INTRO_SHARE à reporter dans ScrollVideoBackground.tsx : {first_detail / total:.2f}")
    for size, kind in (((1280, 720), "desktop"), ((720, 1280), "mobile")):
        build(size, f"{v['prefix']}-{kind}.mp4", v["shots"], v["grade"], v["crossfade"])
