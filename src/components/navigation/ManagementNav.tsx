import Link from 'next/link';
import type { AuthRole } from '@/lib/auth';
import { managementMenuByRole } from '@/lib/management-navigation';

type Props = {
  role: AuthRole;
  onLogout: () => void;
};

export default function ManagementNav({ role, onLogout }: Props) {
  const menuItems = managementMenuByRole(role);

  return (
    <nav className="flex items-center gap-6" aria-label="Management navigation">
      {menuItems.map((item) => (
        <Link key={item.id} href={item.href} className="text-gray-400 hover:text-white text-xs uppercase transition-colors">
          {item.label}
        </Link>
      ))}

      <button type="button" onClick={onLogout} className="px-4 py-1.5 border border-gray-700 rounded-full text-[10px] uppercase hover:bg-white hover:text-black transition-all">
        Deconnexion
      </button>
    </nav>
  );
}