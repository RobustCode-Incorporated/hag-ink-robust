# Spec 001 — Public site with scroll-driven video

**Goal.** A brand site that feels like walking into the salon, in FR/ES/NL/EN, converting to bookings.
**Origin.** Hag & Ink `ScrollVideoBackground` + `LogoReveal`, Debs i18n/SEO.

## Scope
- Fixed background video built from salon photos (`scripts/video-shots.json` → `build-scroll-video.py`), desktop 1280×720 + mobile 720×1280, poster images.
- Playhead follows scroll with smoothing; intro section uses the first 45 % (`INTRO_SHARE`).
- 300 vh logo reveal: "LATINO'S / BARBER SHOP" cut out of black; scales up and fades.
- Sections: hero (rating 4.5/5 · 95 Planity), 3 chapters, services & prices (DB), barbers (DB), hours (DB) + map + Instagram, footer with Robust Code credit.
- JSON-LD `BarberShop` with address, geo, hours, offers, rating; sitemap, robots, hreflang.

## Acceptance criteria
1. `/`, `/es`, `/nl`, `/en` render with translated texts; switching language keeps the page.
2. Scrolling forward/backward scrubs the video smoothly; reduced-motion shows the poster only.
3. Changing a price in `/gestion/prestations` appears on the home page within 5 min (ISR) — immediately after the save (revalidatePath).
4. Every "Réserver" button leads to `/reserver`, pre-filled with service or barber when clicked from a card.
5. Lighthouse SEO ≥ 90; private pages not indexed.
