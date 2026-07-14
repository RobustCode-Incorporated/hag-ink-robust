'use client';

import { useRouter } from 'next/navigation';

type TreasuryActionsProps = {
  selectedMonth: string;
  monthOptions: string[];
};

export function TreasuryActions({ selectedMonth, monthOptions }: TreasuryActionsProps) {
  const router = useRouter();

  return (
    <div className="no-print flex flex-wrap items-center gap-3">
      <label className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm">
        <span className="font-medium">Mois</span>
        <select
          value={selectedMonth}
          onChange={(event) => {
            router.push(`/ceo/treasury?month=${event.target.value}`);
          }}
          className="bg-transparent pr-2 outline-none"
        >
          {monthOptions.map((month) => (
            <option key={month} value={month}>
              {month}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        onClick={() => window.print()}
        className="rounded-full bg-slate-950 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
      >
        Générer PDF
      </button>
    </div>
  );
}
