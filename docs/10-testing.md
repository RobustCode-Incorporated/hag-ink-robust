# 10 — Testing strategy

| Level | What | How | Status |
|---|---|---|---|
| Unit | slot engine (duration overlap, closing time, lead time, closures, multi-barber, fair assignment), payroll (commission, fixed, tips, rounding, clamping), timezone (winter/summer/DST switch days), phone & money parsing | Vitest, `npm test` | 14 tests ✅ |
| Integration (DB) | booking create → 409 on same barber/slot, cancel, ICS, login OK/KO, role redirects | scripted HTTP smoke test against Neon (local `next start` + production) | ✅ 2026-10-30 |
| E2E (browser) | phone booking, overlap refusal, cash-in, walk-in, product sale + stock, void, expense, absence; screenshots desktop + mobile | Playwright (headless Chrome) script | ✅ 2026-10-30 |
| Static | `tsc --noEmit`, ESLint (next core-web-vitals + TS) | `npm run typecheck`, `npm run lint` | ✅ |

Gate before each deploy: typecheck + lint + unit tests + build.
Next: DB integration tests on a dedicated Neon branch (`test`) so test data never touches `main`.
