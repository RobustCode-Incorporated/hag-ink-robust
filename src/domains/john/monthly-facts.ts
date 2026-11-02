import { calculatePayroll, type StaffMember } from '../payroll/payroll';

// JOHN monthly facts (contract john.facts/v1, see robust-john/docs/CONTRACT.md).
// Every number JOHN says comes from here. Keep this pure and tested.

export type Language = 'fr' | 'en';
export type Unit = 'money' | 'count' | 'percent';
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
  breakdown: { id: string; label: string; unit: Unit; rows: { label: string; value: number; count?: number; note?: string }[] };
  result: Metric;
  // code + params let JOHN word alerts and actions in any language; text/title/reason are the French fallback.
  alerts: { code: string; params: Record<string, string | number | string[]>; level: 'high' | 'medium' | 'info'; text: string }[];
  actions: { code: string; params: Record<string, string | number | string[]>; priority: number; title: string; reason: string; amount?: number }[];
};

export type BarberRow = { id: string; firstName: string; lastName: string; salaryType: string; fixedSalary: number; commissionRate: number };
export type ServiceRow = { barberId: string; amount: number; createdAt: Date };
export type ExpenseRow = { amount: number; description: string; isValidated: boolean; createdAt: Date };

export const round2 = (v: number) => Math.round(v * 100) / 100;
const round1 = (v: number) => Math.round(v * 10) / 10;
const sum = (xs: number[]) => round2(xs.reduce((a, b) => a + b, 0));
const changePct = (cur: number, prev: number) => (prev > 0 ? round1(((cur - prev) / prev) * 100) : undefined);
const money = (v: number) => `${Math.round(v).toLocaleString('fr-FR').replace(/ | /g, ' ')} dollars`;

export function monthKeyShift(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(key: string, withYear = true): string {
  const [y, m] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('fr-FR', withYear ? { month: 'long', year: 'numeric', timeZone: 'UTC' } : { month: 'long', timeZone: 'UTC' });
}

/** French elision: « de octobre » -> « d'octobre ». */
export const deLabel = (label: string) => (/^[aeiouyhéèêàâîôû]/i.test(label) ? `d'${label}` : `de ${label}`);

const keyOf = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
const dayLabel = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', timeZone: 'UTC' });

/**
 * services: every service from 5 months before `periodKey` to the end of `periodKey` (trend + comparison).
 * expenses: every expense up to the end of `periodKey` (pending ones from earlier months stay open).
 */
export function buildMonthlyFacts(input: {
  periodKey: string;
  business: JohnFacts['business'];
  barbers: BarberRow[];
  services: ServiceRow[];
  expenses: ExpenseRow[];
  language?: Language;
  now?: Date;
}): JohnFacts {
  const { periodKey, barbers } = input;
  const prevKey = monthKeyShift(periodKey, -1);
  const cur = input.services.filter((s) => keyOf(s.createdAt) === periodKey);
  const prev = input.services.filter((s) => keyOf(s.createdAt) === prevKey);

  const revenue = sum(cur.map((s) => s.amount));
  const prevRevenue = sum(prev.map((s) => s.amount));
  const avg = cur.length ? round2(revenue / cur.length) : 0;
  const prevAvg = prev.length ? round2(prevRevenue / prev.length) : 0;

  const staff: StaffMember[] = barbers.map((b) => ({
    id: b.id,
    name: `${b.firstName} ${b.lastName}`.trim(),
    role: 'BARBER',
    isFixed: b.salaryType === 'FIXED' || b.salaryType === 'MIXED',
    fixedAmount: b.salaryType === 'FIXED' || b.salaryType === 'MIXED' ? b.fixedSalary : undefined,
    commissionRate: b.commissionRate,
  }));
  const payroll = calculatePayroll(staff, cur.map((s, i) => ({ id: String(i), barberId: s.barberId, amount: s.amount })));
  const payrollTotal = round2(payroll.totalMasseSalariale);

  const monthExpenses = input.expenses.filter((e) => keyOf(e.createdAt) === periodKey);
  const validatedMonth = sum(monthExpenses.filter((e) => e.isValidated).map((e) => e.amount));
  const pendingAll = input.expenses.filter((e) => !e.isValidated && keyOf(e.createdAt) <= periodKey);
  const pendingAllTotal = sum(pendingAll.map((e) => e.amount));
  const balance = round2(revenue - payrollTotal - validatedMonth);

  const label = monthLabel(periodKey);
  const prevLabel = monthLabel(prevKey);

  const trendKeys = Array.from({ length: 6 }, (_, i) => monthKeyShift(periodKey, i - 5));
  const trend = trendKeys.map((k) => ({
    label: monthLabel(k, false),
    value: sum(input.services.filter((s) => keyOf(s.createdAt) === k).map((s) => s.amount)),
  }));

  const rows = barbers
    .map((b) => {
      const mine = cur.filter((s) => s.barberId === b.id);
      return { label: `${b.firstName} ${b.lastName}`.trim(), value: sum(mine.map((s) => s.amount)), count: mine.length };
    })
    .sort((a, b) => b.value - a.value);

  // ---- rules: alerts and ranked actions (deterministic) ----
  const alerts: JohnFacts['alerts'] = [];
  const actions: JohnFacts['actions'] = [];
  const ch = changePct(revenue, prevRevenue);

  if (pendingAll.length > 0) {
    const oldest = pendingAll.reduce((a, b) => (a.createdAt < b.createdAt ? a : b));
    alerts.push({
      code: 'expenses_pending',
      params: { count: pendingAll.length, total: pendingAllTotal, oldest: oldest.createdAt.toISOString().slice(0, 10) },
      level: 'high',
      text: `${pendingAll.length} dépenses attendent une validation, pour ${money(pendingAllTotal)}. La plus ancienne date du ${dayLabel(oldest.createdAt)}.`,
    });
    actions.push({
      code: 'validate_expenses',
      params: { count: pendingAll.length, total: pendingAllTotal },
      priority: 0,
      title: 'Valider ou rejeter les dépenses en attente',
      reason: `Tant qu'elles ne sont pas validées, le solde du mois ne tient pas compte de ${money(pendingAllTotal)} de dépenses.`,
      amount: pendingAllTotal,
    });
  }
  if (ch !== undefined && ch <= -5) {
    alerts.push({ code: 'revenue_change', params: { pct: ch, previous: prevKey }, level: 'medium', text: `Le chiffre d'affaires recule de ${String(Math.abs(ch)).replace('.', ',')} pour cent par rapport à ${prevLabel}.` });
  } else if (ch !== undefined && ch >= 5) {
    alerts.push({ code: 'revenue_change', params: { pct: ch, previous: prevKey }, level: 'info', text: `Le chiffre d'affaires progresse de ${String(ch).replace('.', ',')} pour cent par rapport à ${prevLabel}.` });
  }
  if (rows.length >= 2 && cur.length > 0) {
    const avgCount = cur.length / rows.length;
    const low = rows.filter((r) => r.count < avgCount * 0.6);
    for (const r of low.slice(0, 2)) {
      alerts.push({ code: 'low_activity', params: { name: r.label, count: r.count }, level: 'medium', text: `${r.label} n'a enregistré que ${r.count} prestations ce mois-ci.` });
    }
    if (low.length) {
      actions.push({
        code: 'check_staff_activity',
        params: { names: low.map((r) => r.label) },
        priority: 0,
        title: `Vérifier les prestations de ${low.map((r) => r.label).join(' et ')}`,
        reason: 'Leur nombre de prestations est très inférieur à celui de l’équipe : saisie oubliée ou absence ?',
      });
    }
  }
  if (payroll.totalCommissions > 0) {
    actions.push({
      code: 'pay_commissions',
      params: { period: periodKey, total: round2(payroll.totalCommissions) },
      priority: 0,
      title: `Préparer le versement des commissions ${deLabel(label)}`,
      reason: `${money(round2(payroll.totalCommissions))} à répartir entre les barbiers, selon leur taux.`,
      amount: round2(payroll.totalCommissions),
    });
  }
  if (monthExpenses.length > 0) {
    const top = monthExpenses.reduce((a, b) => (a.amount >= b.amount ? a : b));
    alerts.push({ code: 'top_expense', params: { description: top.description, amount: top.amount }, level: 'info', text: `La plus grosse dépense du mois est « ${top.description} », pour ${money(top.amount)}.` });
  }
  actions.forEach((a, i) => (a.priority = i + 1));

  return {
    contract: 'john.facts/v1',
    kind: 'monthly',
    language: input.language ?? 'fr',
    generatedAt: (input.now ?? new Date()).toISOString(),
    business: input.business,
    period: { key: periodKey, label, previousLabel: prevLabel },
    headline: [
      { id: 'revenue', label: "Chiffre d'affaires", unit: 'money', value: revenue, previous: prevRevenue, changePct: ch },
      { id: 'services', label: 'Prestations', unit: 'count', value: cur.length, previous: prev.length, changePct: changePct(cur.length, prev.length) },
      { id: 'avg_ticket', label: 'Panier moyen', unit: 'money', value: avg, previous: prevAvg, changePct: changePct(avg, prevAvg) },
      { id: 'payroll', label: 'Commissions et salaires', unit: 'money', value: payrollTotal },
    ],
    trend: { id: 'revenue_6m', label: "Chiffre d'affaires, 6 derniers mois", unit: 'money', points: trend },
    breakdown: {
      id: 'revenue_by_staff',
      label: "Chiffre d'affaires par barbier",
      unit: 'money',
      rows: rows.slice(0, 8).map((r) => ({ label: r.label, value: r.value, count: r.count, note: `${r.count} prestations` })),
    },
    result: {
      id: 'balance',
      label: 'Solde du mois',
      unit: 'money',
      value: balance,
      note: 'Recettes moins commissions, salaires et dépenses validées.',
    },
    alerts,
    actions,
  };
}
