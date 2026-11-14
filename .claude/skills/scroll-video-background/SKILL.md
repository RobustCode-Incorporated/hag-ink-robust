---
name: scroll-video-background
description: Build a cinematic scroll-driven video background (Hag & Ink / Latino's style) from a few still photos — virtual camera moves, crossfades, film grade, grain — plus the React components that scrub it with the scroll and reveal it through the brand name. Use when a site should have "le même animation background", a scroll video, or a logo-reveal intro for any business (salon, restaurant, venue, shop).
---

# Scroll video background

Assets in `assets/`: `build-scroll-video.py` (renderer), `video-shots.json` (example shot list),
`ScrollVideoBackground.tsx` (fixed video, playhead follows scroll with smoothing), `LogoReveal.tsx`
(black screen cut out by the brand name, scales ×28 while scrolling).

## 1. Photos
- 2–10 photos, ≥ 1280 px wide, of the real place (interior, details, team, products). Two good photos are enough: vary crops a lot.
- Sources: client's files, their public booking listing (Planity Cloudinary ids), their website. Instagram blocks automated downloads — ask the client instead of scraping.
- Put them in `public/<folder>/`. Look at each photo (Read tool) and note interesting regions in 0..1 coordinates.

## 2. Shot list (`scripts/video-shots.json`)
Each shot: `src`, `dur` (s), `ease` (`ease_in_out` calm · `punch` fast zoom that brakes · `speed_ramp` slow-motion middle),
`a`/`b` = start/end framing `{cx, cy, zoom, blur}` (zoom 1 = widest; 2–2.8 for details; blur 3–6 px → 0 = focus pull).
Put **intro** shots (the space, the atmosphere) first with `"intro": true`; details next; a wide calm **final** shot last.
Aim for 10–13 shots, 28–34 s total, crossfade 0.7 s; `saturation` 0.8 (film) to 0.95 (neon/colourful places).

## 3. Render
```bash
python3 scripts/build-scroll-video.py scripts/video-shots.json   # NOT python3 -I (hides numpy/Pillow)
```
Needs numpy, Pillow, ffmpeg. Outputs `public/video/<prefix>-{desktop,mobile}.mp4` (1280×720 / 720×1280,
keyframe every 6 frames so backward scrubbing is smooth, CRF 29 ≈ 8–11 MB) and posters. Takes ~3 min; run in background.
The script prints `INTRO_SHARE` → copy it into `ScrollVideoBackground.tsx`.
Check 2–3 frames: `ffmpeg -ss 8 -i public/video/<prefix>-desktop.mp4 -frames:v 1 f.jpg` and look at them.

## 4. Page
```tsx
const introRef = useRef<HTMLElement>(null);
<main className="relative bg-black">
  <ScrollVideoBackground introRef={introRef} />
  <div className="relative z-10">
    <section ref={introRef}>
      <LogoReveal word="BRAND" sub="TAGLINE" hint="Scroll" />   {/* 300vh */}
      {/* hero (100vh) + 2–3 chapters (100vh each, text left/right over the video) */}
    </section>
    {/* normal sections with bg-black/70 + backdrop-blur */}
  </div>
</main>
```
`LogoReveal` uses CSS variables `--font-anton` / `--font-archivo` (swap for the brand fonts). Needs `framer-motion`.
CSP must allow `media-src 'self' blob:`. Respect `prefers-reduced-motion` (component shows the poster only).
Cache videos: `Cache-Control: public, max-age=31536000, immutable` on `/video/*`.
