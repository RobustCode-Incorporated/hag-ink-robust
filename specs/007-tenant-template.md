# Spec 007 — Reusable tenant template (Robust Salon System)

**Goal.** Launch the next salon in about half a day, without touching business code.

Tenant surface (everything else is product code):
| File | Content |
|---|---|
| `src/config/salon.ts` | name, address, geo, links, rating, timezone, booking rules, seed services/team/products |
| `public/salon/*`, `scripts/video-shots.json` | photos and the scroll-video shot list |
| `messages/*.json` | marketing copy (hero, chapters) |
| `src/app/globals.css` (public tokens) | salon colours/fonts |

Procedure: `.claude/skills/robust-salon-system/SKILL.md`. Video: `.claude/skills/scroll-video-background/SKILL.md`.

## Acceptance criteria
1. `grep -ri "latino" src --exclude-dir=config` returns only copy in messages/ or neutral comments.
2. A new Neon DB + `db:migrate` + `db:seed` + Vercel env gives a working site and owner login.
