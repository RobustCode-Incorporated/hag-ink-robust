import prisma from '@/lib/prisma';
import { calculatePayroll, type ExecutedService, type StaffMember } from '../../../domains/payroll/payroll';
import { TreasuryActions } from './TreasuryActions';
import { formatMonthLabel, getMonthRange, normalizeSelectedMonth } from './treasury-data';

const currency = (value: number) => `$${value.toFixed(2)}`;

async function getTreasuryData(selectedMonth: string) {
  const { start, end } = getMonthRange(selectedMonth);

  const [barbers, services, expenses] = await Promise.all([
    prisma.barber.findMany({ orderBy: [{ firstName: 'asc' }] }),
    prisma.service.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.expense.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const staff: StaffMember[] = barbers.map((barber) => ({
    id: barber.id,
    name: `${barber.firstName} ${barber.lastName}`.trim(),
    role: 'BARBER',
    isFixed: barber.salaryType === 'FIXED' || barber.salaryType === 'MIXED',
    fixedAmount: barber.salaryType === 'FIXED' || barber.salaryType === 'MIXED' ? barber.fixedSalary : undefined,
    commissionRate: barber.commissionRate,
  }));

  const executedServices: ExecutedService[] = services.map((service) => ({
    id: service.id,
    barberId: service.barberId,
    amount: Number(service.amount),
  }));

  const payrollReport = calculatePayroll(staff, executedServices);

  const validatedExpenses = expenses.filter((expense) => expense.isValidated);
  const pendingExpenses = expenses.filter((expense) => !expense.isValidated);

  const totalRevenue = executedServices.reduce((sum, service) => sum + service.amount, 0);
  const totalExpense = validatedExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const totalPendingExpense = pendingExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const treasuryBalance = totalRevenue - payrollReport.totalMasseSalariale - totalExpense;

  return {
    payrollReport,
    selectedMonth,
    monthLabel: formatMonthLabel(selectedMonth),
    validatedExpenses: validatedExpenses.map((expense) => ({
      id: expense.id,
      date: new Date(expense.createdAt).toLocaleDateString('fr-FR'),
      description: expense.description,
      amount: Number(expense.amount),
      status: expense.isValidated ? 'Validée' : 'À valider',
    })),
    pendingExpenses: pendingExpenses.map((expense) => ({
      id: expense.id,
      due: new Date(expense.createdAt).toLocaleDateString('fr-FR'),
      vendor: expense.description,
      amount: Number(expense.amount),
      status: expense.isValidated ? 'Validée' : 'À valider',
    })),
    totalRevenue,
    totalExpense,
    totalPendingExpense,
    treasuryBalance,
  };
}

export default async function CEOTreasuryPage({
  searchParams,
}: {
  searchParams?: Promise<{ month?: string | string[] | null }>;
}) {
  const params = await searchParams;
  const selectedMonth = normalizeSelectedMonth(params?.month);
  const { payrollReport, validatedExpenses, pendingExpenses, totalRevenue, totalExpense, totalPendingExpense, treasuryBalance, monthLabel } = await getTreasuryData(selectedMonth);

  const monthOptions = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - index);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  });

  return (
    <div className="min-h-screen bg-slate-50 p-8 text-slate-900">
      <div className="mx-auto max-w-7xl">
        <div className="printable-report mb-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="print-only mb-4 hidden border-b border-slate-200 pb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Hag-Ink • Rapport de paie</p>
            <h2 className="mt-2 text-2xl font-black">{monthLabel}</h2>
          </div>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Centre financier — CEO</p>
              <h1 className="mt-4 text-3xl font-black">Trésorerie & Salaires</h1>
              <p className="mt-3 max-w-2xl text-sm text-slate-500">
                Vue synthétique des coûts salariaux, des dépenses validées et des charges à traiter. Les métriques sont calculées à partir des données
                enregistrées dans la base de données pour le mois sélectionné.
              </p>
            </div>
            <TreasuryActions selectedMonth={selectedMonth} monthOptions={monthOptions} />
          </div>
          <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            Période affichée : <span className="font-semibold">{monthLabel}</span>
          </div>
        </div>

        <div className="printable-report mb-8 grid gap-6 md:grid-cols-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Masse salariale</p>
            <p className="mt-4 text-3xl font-black">{currency(payrollReport.totalMasseSalariale)}</p>
            <p className="mt-2 text-sm text-slate-500">Inclut salaires fixes et commissions calculées par barbier.</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Commissions</p>
            <p className="mt-4 text-3xl font-black">{currency(payrollReport.totalCommissions)}</p>
            <p className="mt-2 text-sm text-slate-500">Basées sur les taux enregistrés pour chaque barbier.</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Dépenses validées</p>
            <p className="mt-4 text-3xl font-black">{currency(totalExpense)}</p>
            <p className="mt-2 text-sm text-slate-500">Coûts opérationnels confirmés dans la base.</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Solde disponible</p>
            <p className="mt-4 text-3xl font-black">{currency(treasuryBalance)}</p>
            <p className="mt-2 text-sm text-slate-500">CA généré moins salaires et dépenses validées.</p>
          </div>
        </div>

        <div className="mb-8 grid gap-6 xl:grid-cols-[2fr_1fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">Fiche de paie — détails</h2>
                <p className="mt-2 text-sm text-slate-500">Calcul des revenus salariaux par employé, basé sur les règles de paie du domaine.</p>
              </div>
                <div className="no-print">
                <TreasuryActions selectedMonth={selectedMonth} monthOptions={monthOptions} />
              </div>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="py-3 uppercase">Employé</th>
                    <th className="py-3 uppercase">Rôle</th>
                    <th className="py-3 uppercase">Fixe</th>
                    <th className="py-3 uppercase">Commission</th>
                    <th className="py-3 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {payrollReport.details.map((item) => (
                    <tr key={item.staffId} className="border-b border-slate-100">
                      <td className="py-3 font-semibold text-slate-900">{item.name}</td>
                      <td className="py-3 text-slate-500">{item.role}</td>
                      <td className="py-3 text-slate-900">{currency(item.baseSalary)}</td>
                      <td className="py-3 text-slate-900">{currency(item.commissionsEarned)}</td>
                      <td className="py-3 font-bold text-slate-900">{currency(item.amountEarned)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="printable-report rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">Résumé des charges</h2>
            <p className="mt-2 text-sm text-slate-500">Dépenses validées et charges à traiter enregistrées dans la base.</p>

            <div className="mt-6 space-y-4">
              {validatedExpenses.map((item) => (
                <div key={item.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold">{item.description}</p>
                      <p className="text-sm text-slate-500">{item.date}</p>
                    </div>
                    <p className="font-semibold text-slate-900">{currency(item.amount)}</p>
                  </div>
                  <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-400">{item.status}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-950 p-4 text-white">
              <p className="text-sm font-semibold">Flux de trésorerie projeté</p>
              <p className="mt-3 text-sm leading-6 text-slate-200">Le solde est recalculé à partir du chiffre d’affaires, de la masse salariale et des dépenses validées.</p>
              <div className="mt-4 flex items-center justify-between text-sm text-slate-300">
                <span>CA généré</span>
                <span>{currency(totalRevenue)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm text-slate-300">
                <span>Charges en attente</span>
                <span>{currency(totalPendingExpense)}</span>
              </div>
            </div>
          </section>
        </div>

        <section className="printable-report rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">Charges à venir</h2>
              <p className="mt-2 text-sm text-slate-500">Liste des dépenses enregistrées mais encore à valider.</p>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="py-3 uppercase">Fournisseur</th>
                  <th className="py-3 uppercase">Date</th>
                  <th className="py-3 uppercase">Montant</th>
                  <th className="py-3 uppercase">Statut</th>
                </tr>
              </thead>
              <tbody>
                {pendingExpenses.map((expense) => (
                  <tr key={expense.id} className="border-b border-slate-100">
                    <td className="py-3 font-semibold text-slate-900">{expense.vendor}</td>
                    <td className="py-3 text-slate-500">{expense.due}</td>
                    <td className="py-3 text-slate-900">{currency(expense.amount)}</td>
                    <td className="py-3 font-semibold text-slate-900">{expense.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
