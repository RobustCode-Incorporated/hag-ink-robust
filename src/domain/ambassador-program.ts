// Ambassador program phases 4-6 rules (pure). Spec 010. Adapted from Debs Hair & Beauty.

/* ---------------- 4. Service allowances ---------------- */

export type LedgerKind = 'ALLOCATION' | 'CONSUMPTION' | 'EXPIRATION' | 'ADJUSTMENT' | 'REVERSAL';
export type LedgerEntry = { id: number; kind: LedgerKind; qty: number; reversesId: number | null };

/**
 * Balance always recomputed from the ledger: available = allocated - consumed - expired + adjusted.
 * A reversal cancels its target in the target's own bucket (a reversed consumption is no longer "consumed").
 */
export function allowanceBalance(entries: LedgerEntry[]) {
  const b = { allocated: 0, consumed: 0, expired: 0, adjusted: 0 };
  const bucket = (kind: LedgerKind): keyof typeof b =>
    kind === 'ALLOCATION' ? 'allocated' : kind === 'CONSUMPTION' ? 'consumed' : kind === 'EXPIRATION' ? 'expired' : 'adjusted';
  const sign = (kind: LedgerKind) => (kind === 'CONSUMPTION' || kind === 'EXPIRATION' ? -1 : 1);
  const byId = new Map(entries.map((e) => [e.id, e]));
  for (const e of entries) {
    const target = e.kind === 'REVERSAL' && e.reversesId !== null ? byId.get(e.reversesId) : undefined;
    const kind = target ? target.kind : e.kind;
    b[bucket(kind)] += sign(kind) * e.qty;
  }
  const clean = (n: number) => n || 0;
  return { allocated: clean(b.allocated), consumed: clean(b.consumed), expired: clean(b.expired), adjusted: clean(b.adjusted),
    available: clean(b.allocated - b.consumed - b.expired + b.adjusted) };
}

/** A reversal cancels one entry exactly once (never a reversal, never twice). */
export function canReverse(target: LedgerEntry, entries: LedgerEntry[]): boolean {
  return target.kind !== 'REVERSAL' && !entries.some((e) => e.kind === 'REVERSAL' && e.reversesId === target.id);
}

/* ---------------- 5. Scoring ---------------- */

export const CRITERIA = [
  { key: 'audience', label: 'Audience locale pertinente', max: 25, phases: ['POTENTIAL'] },
  { key: 'engagement', label: 'Engagement authentique', max: 20, phases: ['POTENTIAL'] },
  { key: 'content', label: 'Qualité et régularité du contenu', max: 20, phases: ['POTENTIAL'] },
  { key: 'bookings', label: 'Réservations et acquisition', max: 25, phases: ['PERFORMANCE'] },
  { key: 'professionalism', label: 'Professionnalisme et fiabilité', max: 10, phases: ['POTENTIAL', 'PERFORMANCE'] },
] as const;
export type CriterionKey = (typeof CRITERIA)[number]['key'];
export type Phase = 'POTENTIAL' | 'PERFORMANCE';
export type Scores = Partial<Record<CriterionKey, number | null>>;

/** Validates raw marks: integer in [0, max] or null (= not assessed, never zero). */
export function cleanScores(raw: Record<string, unknown>): Scores {
  const out: Scores = {};
  for (const c of CRITERIA) {
    const v = raw[c.key];
    if (v === null || v === undefined || v === '') { out[c.key] = null; continue; }
    const n = Number(v);
    if (!Number.isInteger(n) || n < 0 || n > c.max) throw new Error(`${c.label}: note entre 0 et ${c.max}`);
    out[c.key] = n;
  }
  return out;
}

export type Recommendation = 'NONE' | 'PONCTUEL' | 'ENVELOPPE_LIMITEE' | 'PARTENARIAT';
export const RECO_LABEL: Record<Recommendation, string> = {
  NONE: 'Pas d’enveloppe récurrente', PONCTUEL: 'Collaboration ponctuelle',
  ENVELOPPE_LIMITEE: 'Enveloppe limitée à étudier', PARTENARIAT: 'Partenariat renforcé à étudier',
};

/** Score /100 on assessed criteria only; no recommendation while a criterion of the phase is missing. */
export function scoreOf(scores: Scores, phase?: Phase): { score: number | null; recommendation: Recommendation | null; missing: string[] } {
  const relevant = phase ? CRITERIA.filter((c) => (c.phases as readonly string[]).includes(phase)) : CRITERIA;
  const noted = relevant.filter((c) => typeof scores[c.key] === 'number');
  const missing = relevant.filter((c) => typeof scores[c.key] !== 'number').map((c) => c.label);
  if (!noted.length) return { score: null, recommendation: null, missing };
  const got = noted.reduce((n, c) => n + (scores[c.key] as number), 0);
  const max = noted.reduce((n, c) => n + c.max, 0);
  const score = Math.round((got / max) * 1000) / 10;
  const recommendation: Recommendation | null = missing.length ? null
    : score >= 85 ? 'PARTENARIAT' : score >= 70 ? 'ENVELOPPE_LIMITEE' : score >= 50 ? 'PONCTUEL' : 'NONE';
  return { score, recommendation, missing };
}

/** Global view: for each criterion the most recent mark across assessments (oldest first in input). */
export function latestScores(assessments: { criteria: Scores }[]): Scores {
  const out: Scores = {};
  for (const a of assessments) for (const c of CRITERIA) if (typeof a.criteria[c.key] === 'number') out[c.key] = a.criteria[c.key];
  return out;
}

/* ---------------- 6. CSV ---------------- */

/** RFC 4180 cell; neutralises spreadsheet formulas (=, +, -, @, tab, CR) to prevent CSV injection. */
export function csvCell(v: unknown): string {
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+([.,]\d+)?$/.test(s)) s = `'${s}`;
  return /[",;\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(head: string[], rows: unknown[][]): string {
  return '﻿' + [head, ...rows].map((r) => r.map(csvCell).join(';')).join('\r\n') + '\r\n';
}
