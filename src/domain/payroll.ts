// Payroll rules (pure). Spec: specs/005-payroll.md. Origin: Hag & Ink payroll domain,
// generalised: every staff member has either a commission rate or a fixed salary.
// Commission applies to SERVICE revenue only; tips go 100 % to the barber;
// product sales are salon revenue.

export type PayrollStaff = {
  id: string;
  name: string;
  payType: 'COMMISSION' | 'FIXED';
  commissionRate: number; // 0..1
  fixedSalaryCents: number;
};

export type PayrollSale = {
  staffId: string;
  kind: 'SERVICE' | 'PRODUCT';
  amountCents: number;
  tipCents: number;
};

export type PayrollLine = {
  staffId: string;
  name: string;
  payType: PayrollStaff['payType'];
  serviceCount: number;
  serviceRevenueCents: number;
  productRevenueCents: number;
  tipsCents: number;
  commissionCents: number;
  fixedCents: number;
  totalDueCents: number;
};

export type PayrollSummary = {
  lines: PayrollLine[];
  totalDueCents: number;
  serviceRevenueCents: number;
  salonShareCents: number; // service revenue kept by the salon after commissions
};

export function computePayroll(staff: PayrollStaff[], sales: PayrollSale[]): PayrollSummary {
  const lines = staff.map<PayrollLine>((s) => {
    const own = sales.filter((x) => x.staffId === s.id);
    const services = own.filter((x) => x.kind === 'SERVICE');
    const serviceRevenueCents = services.reduce((n, x) => n + x.amountCents, 0);
    const productRevenueCents = own.filter((x) => x.kind === 'PRODUCT').reduce((n, x) => n + x.amountCents, 0);
    const tipsCents = own.reduce((n, x) => n + x.tipCents, 0);
    const rate = Math.min(Math.max(s.commissionRate, 0), 1);
    const commissionCents = s.payType === 'COMMISSION' ? Math.round(serviceRevenueCents * rate) : 0;
    const fixedCents = s.payType === 'FIXED' ? s.fixedSalaryCents : 0;
    return {
      staffId: s.id,
      name: s.name,
      payType: s.payType,
      serviceCount: services.length,
      serviceRevenueCents,
      productRevenueCents,
      tipsCents,
      commissionCents,
      fixedCents,
      totalDueCents: commissionCents + fixedCents + tipsCents,
    };
  });
  const serviceRevenueCents = lines.reduce((n, l) => n + l.serviceRevenueCents, 0);
  const commissions = lines.reduce((n, l) => n + l.commissionCents, 0);
  return {
    lines,
    totalDueCents: lines.reduce((n, l) => n + l.totalDueCents, 0),
    serviceRevenueCents,
    salonShareCents: serviceRevenueCents - commissions,
  };
}
