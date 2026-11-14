# 08 — Frontend specification

## Two design systems (ADR-007)
### A. Public site — salon brand
Derived from the salon itself (neon hexagon ceiling, graffiti, red tool cabinets, Ecuadorian roots).
| Token | Value | Use |
|---|---|---|
| `ink` | #050505 | background |
| `neon` | #f4f7ff + glow (`.neon-text`) | headlines |
| `graffiti` | #ffb21e | primary CTA, accents |
| `pink` | #ff6fae · `cabinet` #d7263d | secondary accents, errors |
| Display font | Anton (uppercase) | titles, prices |
| Body font | Archivo | text |

Page flow (same as Hag & Ink): fixed scroll-video background → 300 vh logo reveal (salon name cut out of
black, scales ×28) → hero → 3 chapters over the video → services → team (hex-grid texture) → hours & map → footer
("Système de gestion par Robust Code"). `prefers-reduced-motion` shows the poster only.

Booking `/reserver`: 4 stacked steps with checkmarks and "Modifier"; day chips (open days only, student
service limited to Mon–Thu); slot grid; honeypot field; consent checkbox; summary with "paiement sur place".

### B. Management — Robust REM (DEC-005)
Snow #FFFAFA page, black top bar with Robust logo + "Robust Enterprise Management" in Ysabeau Office small caps,
grey #A0A0A0 links → white active, pill "Déconnexion" with #333 border, split login (40 % black panel),
inputs #ddd radius 8 px, black buttons, black stat cards with white figures, green #1b5e20 / red #d32f2f.
Primitives: `src/components/gestion/ui.tsx` (PageHeader, Stat, Card, Table, Badge, Field, Flash).

## Routes
Public: `/`, `/reserver`, `/rdv/[token]` × `fr` (unprefixed) / `es` / `nl` / `en`.
Management (FR): `/gestion/login`, `/gestion`, `/gestion/{agenda,caisse,clients,equipe,salaires,depenses,produits,prestations,reglages,moi}`.
