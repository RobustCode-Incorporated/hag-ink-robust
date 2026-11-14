// JOHN (Robust SI) monthly facts, contract john.facts/v1 (see ~/Projects/robust-john/docs/CONTRACT.md).
// Pure: the caller loads rows and gives salon-local days ("YYYY-MM-DD"). Every number JOHN says comes from here.
// Spec: specs/011-john-robust-si.md.
import { computePayroll, type PayrollStaff } from './payroll';

export type Language = 'fr' | 'en';
type Unit = 'money' | 'count' | 'percent';
type Params = Record<string, string | number | string[]>;
export type Metric = { id: string; label: string; unit: Unit; value: number; previous?: number; changePct?: number; note?: string };

export type JohnFacts = {
  contract: 'john.facts/v1';
  kind: 'monthly';
  language: Language;
  generatedAt: string;
  business: { name: string; sector: string; currency: string; locale: string };
  period: { key: string; label: string; previousLabel: string };
  headline: Metric[];
  trend: { id: string; label: string; unit: Unit; points: { label: string; value: number }[] };
  breakdown: { id: string; label: string; unit: Unit; rows: { label: string; value: number; count: number; note?: string }[] };
  result: Metric;
  alerts: { code: string; params: Params; level: 'high' | 'medium' | 'info'; text: string }[];
  actions: { code: string; params: Params; priority: number; title: string; reason: string; amount?: number }[];
  updates: { date: string; fr: string; en: string }[];
};

export type FactsSale = { staffId: string; kind: 'SERVICE' | 'PRODUCT'; cents: number; tipCents: number; day: string };
export type FactsExpense = { cents: number; description: string; status: 'PENDING' | 'APPROVED' | 'REJECTED'; day: string };

const dollars = (cents: number) => Math.round(cents) / 100;
const round1 = (v: number) => Math.round(v * 10) / 10;
const changePct = (cur: number, prev: number) => (prev > 0 ? round1(((cur - prev) / prev) * 100) : undefined);
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

export function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number);
  const i = y * 12 + (m - 1) + delta;
  return `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`;
}
const label = (key: string, year = true) => `${MONTHS[Number(key.slice(5, 7)) - 1]}${year ? ` ${key.slice(0, 4)}` : ''}`;
const de = (l: string) => (/^[aeiouyhéèêàâîôû]/i.test(l) ? `d'${l}` : `de ${l}`);
const usd = (cents: number) => `${Math.round(cents / 100).toLocaleString('fr-FR').replace(/ | /g, ' ')} dollars`;
const fmtDay = (day: string) => `${Number(day.slice(8, 10))} ${MONTHS[Number(day.slice(5, 7)) - 1]}`;

/** sales: from 5 months before the period to its end. expenses: everything up to the end of the period. */
export function buildMonthlyFacts(input: {
  periodKey: string;
  language: Language;
  business: JohnFacts['business'];
  staff: (PayrollStaff & { role: string })[];
  sales: FactsSale[];
  expenses: FactsExpense[];
  /** Release notes; those dated from the period start to `now` are included (max 5). */
  releaseNotes?: { date: string; fr: string; en: string }[];
  now?: Date;
}): JohnFacts {
  const { periodKey } = input;
  const prevKey = shiftMonth(periodKey, -1);
  const inMonth = (day: string, key: string) => day.slice(0, 7) === key;
  const services = (key: string) => input.sales.filter((s) => s.kind === 'SERVICE' && inMonth(s.day, key));
  const cur = services(periodKey);
  const prev = services(prevKey);
  const revenue = cur.reduce((n, s) => n + s.cents, 0);
  const prevRevenue = prev.reduce((n, s) => n + s.cents, 0);
  const avg = cur.length ? Math.round(revenue / cur.length) : 0;
  const prevAvg = prev.length ? Math.round(prevRevenue / prev.length) : 0;

  const barbers = input.staff.filter((s) => s.role === 'BARBER');
  const payroll = computePayroll(input.staff, input.sales.filter((s) => inMonth(s.day, periodKey)).map((s) => ({ staffId: s.staffId, kind: s.kind, amountCents: s.cents, tipCents: s.tipCents })));
  const commissions = payroll.lines.reduce((n, l) => n + l.commissionCents, 0);
  const payrollTotal = payroll.lines.reduce((n, l) => n + l.commissionCents + l.fixedCents, 0);

  const monthExp = input.expenses.filter((e) => inMonth(e.day, periodKey) && e.status !== 'REJECTED');
  const approvedMonth = monthExp.filter((e) => e.status === 'APPROVED').reduce((n, e) => n + e.cents, 0);
  const pendingAll = input.expenses.filter((e) => e.status === 'PENDING' && e.day.slice(0, 7) <= periodKey);
  const pendingTotal = pendingAll.reduce((n, e) => n + e.cents, 0);
  const balance = revenue - payrollTotal - approvedMonth;

  const per = label(periodKey);
  const prevLabel = label(prevKey);
  const rows = barbers
    .map((b) => { const mine = cur.filter((s) => s.staffId === b.id); return { label: b.name, value: dollars(mine.reduce((n, s) => n + s.cents, 0)), count: mine.length }; })
    .sort((a, b) => b.value - a.value);

  const alerts: JohnFacts['alerts'] = [];
  const actions: JohnFacts['actions'] = [];
  const ch = changePct(revenue, prevRevenue);
  if (pendingAll.length) {
    const oldest = pendingAll.reduce((a, b) => (a.day < b.day ? a : b));
    alerts.push({ code: 'expenses_pending', params: { count: pendingAll.length, total: dollars(pendingTotal), oldest: oldest.day }, level: 'high',
      text: `${pendingAll.length} dépenses attendent une validation, pour ${usd(pendingTotal)}. La plus ancienne date du ${fmtDay(oldest.day)}.` });
    actions.push({ code: 'validate_expenses', params: { count: pendingAll.length, total: dollars(pendingTotal) }, priority: 0, amount: dollars(pendingTotal),
      title: 'Valider ou rejeter les dépenses en attente',
      reason: `Tant qu'elles ne sont pas validées, le solde du mois ne tient pas compte de ${usd(pendingTotal)} de dépenses.` });
  }
  if (ch !== undefined && Math.abs(ch) >= 5) {
    alerts.push({ code: 'revenue_change', params: { pct: ch, previous: prevKey }, level: ch < 0 ? 'medium' : 'info',
      text: `Le chiffre d'affaires ${ch > 0 ? 'progresse' : 'recule'} de ${String(Math.abs(ch)).replace('.', ',')} pour cent par rapport à ${prevLabel}.` });
  }
  if (rows.length >= 2 && cur.length) {
    const avgCount = cur.length / rows.length;
    const low = rows.filter((r) => r.count < avgCount * 0.6);
    for (const r of low.slice(0, 2)) {
      alerts.push({ code: 'low_activity', params: { name: r.label, count: r.count }, level: 'medium', text: `${r.label} n'a enregistré que ${r.count} prestations ce mois-ci.` });
    }
    if (low.length) {
      actions.push({ code: 'check_staff_activity', params: { names: low.map((r) => r.label) }, priority: 0,
        title: `Vérifier les prestations de ${low.map((r) => r.label).join(' et ')}`,
        reason: "Leur nombre de prestations est très inférieur à celui de l'équipe : saisie oubliée ou absence ?" });
    }
  }
  if (commissions > 0) {
    actions.push({ code: 'pay_commissions', params: { period: periodKey, total: dollars(commissions) }, priority: 0, amount: dollars(commissions),
      title: `Préparer le versement des commissions ${de(per)}`, reason: `${usd(commissions)} à répartir entre les barbiers, selon leur taux.` });
  }
  if (monthExp.length) {
    const top = monthExp.reduce((a, b) => (a.cents >= b.cents ? a : b));
    alerts.push({ code: 'top_expense', params: { description: top.description, amount: dollars(top.cents) }, level: 'info',
      text: `La plus grosse dépense du mois est « ${top.description} », pour ${usd(top.cents)}.` });
  }
  actions.forEach((a, i) => (a.priority = i + 1));

  return {
    contract: 'john.facts/v1',
    kind: 'monthly',
    language: input.language,
    generatedAt: (input.now ?? new Date()).toISOString(),
    business: input.business,
    period: { key: periodKey, label: per, previousLabel: prevLabel },
    headline: [
      { id: 'revenue', label: "Chiffre d'affaires", unit: 'money', value: dollars(revenue), previous: dollars(prevRevenue), changePct: ch },
      { id: 'services', label: 'Prestations', unit: 'count', value: cur.length, previous: prev.length, changePct: changePct(cur.length, prev.length) },
      { id: 'avg_ticket', label: 'Panier moyen', unit: 'money', value: dollars(avg), previous: dollars(prevAvg), changePct: changePct(avg, prevAvg) },
      { id: 'payroll', label: 'Commissions et salaires', unit: 'money', value: dollars(payrollTotal) },
    ],
    trend: {
      id: 'revenue_6m', label: "Chiffre d'affaires, 6 derniers mois", unit: 'money',
      points: Array.from({ length: 6 }, (_, i) => shiftMonth(periodKey, i - 5)).map((k) => ({ label: label(k, false), value: dollars(services(k).reduce((n, s) => n + s.cents, 0)) })),
    },
    breakdown: { id: 'revenue_by_staff', label: "Chiffre d'affaires par barbier", unit: 'money',
      rows: rows.slice(0, 8).map((r) => ({ ...r, note: `${r.count} prestations` })) },
    result: { id: 'balance', label: 'Solde du mois', unit: 'money', value: dollars(balance), note: 'Recettes moins commissions, salaires et dépenses validées.' },
    alerts,
    actions,
    updates: (input.releaseNotes ?? [])
      .filter((n) => n.date >= `${periodKey}-01` && n.date <= (input.now ?? new Date()).toISOString().slice(0, 10))
      .slice(0, 5),
  };
}
