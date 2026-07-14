export function normalizeSelectedMonth(value?: string | string[] | null): string {
  const rawValue = Array.isArray(value) ? value[0] : value;

  if (typeof rawValue === 'string' && /^\d{4}-\d{2}$/.test(rawValue)) {
    return rawValue;
  }

  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
}

export function getMonthRange(selectedMonth: string): { start: Date; end: Date } {
  const [year, month] = selectedMonth.split('-').map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  return { start, end };
}

export function formatMonthLabel(selectedMonth: string): string {
  const [year, month] = selectedMonth.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });
}
