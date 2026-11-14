# Decisions & open questions

## Taken (by Robust Code, reversible)
| # | Decision |
|---|---|
| D1 | Prices, durations, hours and the 9 collaborators imported from Planity (Oct 2026). |
| D2 | Default pay = **50 % commission** on service revenue for every barber; tips 100 % to the barber. Editable per barber. |
| D3 | Payment on site; no online payment in v1. |
| D4 | "Produit" (€10) moved from services to the stock module (retail product). |
| D7 | Photos: 2 salon photos from the public Planity listing used for the scroll video. Instagram blocked automated access — replace/add photos from @machiner_4k when the salon sends them (rebuild: `npm run video:build`). |

## To confirm with the salon (before go-live)
| # | Question |
|---|---|
| Q1 | Real commission rate / fixed salary per barber? Who is manager? |
| Q2 | Salon phone number + WhatsApp (shown on site, used for notifications)? |
| Q3 | Is "Pato Lucas" a service to keep online? Exact name/description? |
| Q4 | Which of the 9 Planity collaborators are active? Photos/Instagram for each? |
| Q5 | Legal identity (company name, VAT, address) for the privacy page. |
| Q6 | Domain name (e.g. latinosbarbershop.be) to attach to Vercel. |
| Q7 | Keep Planity in parallel (double agenda risk) or switch fully? |
| Q8 | Email sender: use robust-code.com (already verified in Resend) or the salon's domain? |
