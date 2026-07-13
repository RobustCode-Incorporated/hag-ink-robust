import { describe, it, expect } from 'vitest';
import { calculatePayroll, StaffMember, ExecutedService } from './payroll';

describe('Domaine Paie - Calcul des Émoluments et des Commissions', () => {
  it('doit calculer avec exactitude les salaires fixes, les commissions spécifiques (Bilal 30% / Autres 25%) et le coût global', () => {
    // Given (Le personnel de Hag-Ink enregistré par le CEO)
    const staff: StaffMember[] = [
      { id: '1', name: 'Henock Lubo Lubo', role: 'MANAGER', isFixed: true, fixedAmount: 2000 },
      { id: '2', name: 'Medy Tshibwabwa', role: 'BARBER', isFixed: false },
      { id: '3', name: 'Arnold Bopioko Bosondjolo', role: 'BARBER', isFixed: false },
      { id: '4', name: 'Victor Mulamba Abedi', role: 'CLEANER', isFixed: true, fixedAmount: 1200 },
      { id: '5', name: 'Guyston Biango', role: 'BARBER', isFixed: false },
      { id: '6', name: 'Bilal Akuma Soumaré', role: 'BARBER', isFixed: false },
      { id: '7', name: 'Martins Lizanga Lobonyo', role: 'BARBER', isFixed: false },
    ];

    // Les services saisis par Henock sur une période donnée
    const services: ExecutedService[] = [
      { id: 'cut-1', barberId: '6', amount: 150 },  // Coupe complexe par Bilal
      { id: 'cut-2', barberId: '6', amount: 70 },   // Locks par Bilal (Total Bilal = 220)
      { id: 'cut-3', barberId: '2', amount: 40 },   // Standard Adulte par Medy (Total Medy = 40)
      { id: 'cut-4', barberId: '3', amount: 100 },  // Prestations par Arnold (Total Arnold = 100)
    ];

    // When (Calcul du domaine)
    const payrollReport = calculatePayroll(staff, services);

    // Then (Assertions de conformité comptable)
    
    // 1. Vérification des salaires fixes cumulés (Henock 2000 + Victor 1200 = 3200)
    expect(payrollReport.totalFixedSalaries).toBe(3200);

    // 2. Vérification de la règle d'exception : Bilal Soumaré (30% de 220$ = 66$)
    const bilalPayment = payrollReport.details.find(p => p.staffId === '6');
    expect(bilalPayment?.amountEarned).toBe(66);

    // 3. Vérification de la règle standard : Medy (25% de 40$ = 10$)
    const medyPayment = payrollReport.details.find(p => p.staffId === '2');
    expect(medyPayment?.amountEarned).toBe(10);

    // 4. Vérification de la règle standard : Arnold (25% de 100$ = 25$)
    const arnoldPayment = payrollReport.details.find(p => p.staffId === '3');
    expect(arnoldPayment?.amountEarned).toBe(25);

    // 5. Masse salariale totale sur la période : 3200 (fixes) + 66 (Bilal) + 10 (Medy) + 25 (Arnold) = 3301
    expect(payrollReport.totalMasseSalariale).toBe(3301);
  });
});