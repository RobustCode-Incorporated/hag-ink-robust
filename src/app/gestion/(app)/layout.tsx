import GestionNav from '@/components/gestion/GestionNav';
import { requireRole } from '@/lib/auth';
import { navFor } from '@/lib/nav';
import { SALON } from '@/config/salon';

export const dynamic = 'force-dynamic';

const ROLE_LABEL = { OWNER: 'Direction', MANAGER: 'Manager', BARBER: 'Barber' } as const;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole();
  return (
    <>
      <GestionNav items={navFor(user.role)} userName={user.name} role={ROLE_LABEL[user.role]} />
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
      <footer className="no-print py-6 text-center text-[10px] uppercase tracking-[0.2em] text-neutral-400">
        {SALON.name} · Robust Enterprise Management · Robust Code
      </footer>
    </>
  );
}
