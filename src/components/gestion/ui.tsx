// Robust/REM UI primitives for the management workspace.
import type { ReactNode } from 'react';

export const input = 'w-full rounded-lg border border-rem-line bg-white px-3 py-2 text-sm outline-none focus:border-black';
export const btn = 'inline-flex items-center justify-center gap-2 rounded-lg bg-black px-4 py-2 text-sm text-white hover:bg-[#222] disabled:opacity-50';
export const btnGhost = 'inline-flex items-center justify-center gap-2 rounded-lg border border-rem-line bg-white px-3 py-1.5 text-xs hover:border-black';
export const btnDanger = 'inline-flex items-center justify-center gap-2 rounded-lg border border-danger px-3 py-1.5 text-xs text-danger hover:bg-danger hover:text-white';

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-[family-name:var(--font-brand)] text-3xl font-light uppercase tracking-[0.12em]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>}
      </div>
      {actions && <div className="no-print flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'ok' | 'danger' }) {
  return (
    <div className="rounded-xl bg-black p-5 text-white">
      <p className="text-[10px] uppercase tracking-[0.2em] text-rem-grey">{label}</p>
      <p className={`mt-2 text-3xl ${tone === 'danger' ? 'text-red-400' : tone === 'ok' ? 'text-green-400' : 'text-white'}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-rem-grey">{hint}</p>}
    </div>
  );
}

export function Card({ title, children, actions, className = '' }: { title?: string; children: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-rem-line bg-white p-5 ${className}`}>
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between gap-2">
          {title && <h2 className="text-xs uppercase tracking-[0.2em] text-neutral-500">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Table({ head, children, empty }: { head: string[]; children: ReactNode; empty?: string | false }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead><tr className="border-b border-rem-line text-[10px] uppercase tracking-wider text-neutral-500">{head.map((h) => <th key={h} className="px-2 py-2 font-normal">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-[#eee]">{children}</tbody>
      </table>
      {empty && <p className="py-6 text-center text-sm text-neutral-400">{empty}</p>}
    </div>
  );
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'ok' | 'danger' | 'warn' | 'dark' }) {
  const cls = { neutral: 'bg-neutral-100 text-neutral-700', ok: 'bg-green-50 text-ok', danger: 'bg-red-50 text-danger', warn: 'bg-amber-50 text-amber-800', dark: 'bg-black text-white' }[tone];
  return <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${cls}`}>{children}</span>;
}

export function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block text-xs text-neutral-600 ${className}`}>
      <span className="mb-1 block uppercase tracking-wider">{label}</span>
      {children}
    </label>
  );
}

export function Flash({ msg, error }: { msg?: string; error?: string }) {
  if (error) return <p role="alert" className="mb-4 rounded-lg border border-danger bg-red-50 px-4 py-2 text-sm text-danger">{error}</p>;
  if (msg) return <p role="status" className="mb-4 rounded-lg border border-ok bg-green-50 px-4 py-2 text-sm text-ok">{msg}</p>;
  return null;
}
