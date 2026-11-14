# Spec 012 — Packs payés en ligne via FlexPay (désactivé)

**Décision du 2026-11-14.** On garde le paiement FlexPay de l'ancien site Hag & Ink, mais les packs ne sont
pas affichés sur le site officiel pour l'instant. Pareil pour la tombola (spec 009). Le code reste en place,
prêt pour plus tard : `SALON.features.memberships` / `SALON.features.tombola` dans `src/config/salon.ts`.

| Pièce | Fichier | Quand l'interrupteur est éteint |
|---|---|---|
| Formules (prix, durée, tickets) | `src/domain/memberships.ts` | inchangé |
| Section « Packs » + formulaire de paiement | `src/components/site/Packs.tsx` | non affichée |
| Démarrer un paiement (Mobile Money type 1, carte type 2) | `POST /api/payments/flexpay` | répond 404 |
| Callback FlexPay | `POST /api/payments/webhook` | **toujours actif** (un paiement déjà lancé n'est jamais perdu) |
| Suivi | `/gestion/abonnements` | page et menu masqués |
| Tables | `membership_payments`, `client_memberships` | inchangé |

Prix repris tels quels de l'ancien site : Standard Enfant 49 $, Standard Adulte 89 $, Braids A 89 $, Braids B 189 $,
Locks A 209 $, Locks B 329 $, Limited Edition 229 $ (2 tickets de tombola). Durée 1 mois.

## Règles
1. Le paiement est créé `PENDING` avec l'`orderNumber` FlexPay. Le webhook le passe `PAID` une seule fois
   (verrou `FOR UPDATE`) et ouvre l'abonnement (fin = même jour le mois suivant).
2. Le montant enregistré doit égaler le prix du pack, sinon le webhook refuse.
3. Mobile Money exige un numéro RDC (243 + 9 chiffres).
4. Tickets de tombola donnés avec un pack payé seulement si `features.tombola` est actif.

## Réactiver
Mettre `memberships: true` (et/ou `tombola: true`), vérifier les variables `FLEXPAY_*` sur Vercel, déployer.
