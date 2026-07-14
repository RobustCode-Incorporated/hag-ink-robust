export type StaffRole = 'MANAGER' | 'BARBER' | 'CLEANER';

export interface StaffMember {
  id: string;
  name: string;
  role: StaffRole;
  isFixed: boolean;
  fixedAmount?: number;
  commissionRate?: number;
}

export interface ExecutedService {
  id: string;
  barberId: string;
  amount: number;
}

export interface PaymentDetail {
  staffId: string;
  name: string;
  role: StaffRole;
  baseSalary: number;
  commissionsEarned: number;
  amountEarned: number;
}

export interface PayrollReport {
  totalFixedSalaries: number;
  totalCommissions: number;
  totalMasseSalariale: number;
  details: PaymentDetail[];
}

/**
 * Calculateur de paie ROBUST aligné sur les règles d'affaires de Hag-Ink.
 * Traite les salaires fixes et applique les paliers de commissions (Bilal 30% / Autres Barbiers 25%).
 */
export function calculatePayroll(staff: StaffMember[], services: ExecutedService[]): PayrollReport {
  let totalFixedSalaries = 0;
  let totalCommissions = 0;
  const details: PaymentDetail[] = [];

  // 1. Calcul du volume de CA généré par chaque barbier
  const caPerBarber: Record<string, number> = {};
  services.forEach(service => {
    caPerBarber[service.barberId] = (caPerBarber[service.barberId] || 0) + service.amount;
  });

  // 2. Traitement individuel de chaque membre du personnel
  staff.forEach(member => {
    let baseSalary = 0;
    let commissionsEarned = 0;

    if (member.isFixed) {
      baseSalary = member.fixedAmount || 0;
      totalFixedSalaries += baseSalary;
    }

    if (member.role === 'BARBER') {
      const totalVolumeGenerated = caPerBarber[member.id] || 0;
      const commissionRate = member.commissionRate ?? 0.25;

      commissionsEarned = totalVolumeGenerated * commissionRate;
      totalCommissions += commissionsEarned;
    }

    const amountEarned = baseSalary + commissionsEarned;

    details.push({
      staffId: member.id,
      name: member.name,
      role: member.role,
      baseSalary,
      commissionsEarned,
      amountEarned
    });
  });

  return {
    totalFixedSalaries,
    totalCommissions,
    totalMasseSalariale: totalFixedSalaries + totalCommissions,
    details
  };
}