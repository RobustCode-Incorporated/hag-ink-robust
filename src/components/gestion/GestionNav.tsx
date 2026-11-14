'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import type { NavItem } from '@/lib/nav';

export default function GestionNav({ items, userName, role }: { items: NavItem[]; userName: string; role: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => (href === '/gestion' ? pathname === href : pathname.startsWith(href));

  return (
    <header className="no-print sticky top-0 z-40 bg-black text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/gestion" className="flex shrink-0 flex-col items-center leading-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/RobustCodelogowhite.png" alt="Robust Code" className="h-12 w-12 object-contain" />
          <span className="mt-1 font-[family-name:var(--font-brand)] text-[9px] font-light uppercase tracking-[0.18em]">Robust Enterprise Management</span>
        </Link>
        <nav className="hidden flex-1 flex-wrap items-center justify-center gap-x-4 gap-y-1 lg:flex" aria-label="Gestion">
          {items.filter((i) => i.href !== '/gestion/moi' || items.length <= 2).map((i) => (
            <Link key={i.href} href={i.href}
              className={`text-xs uppercase tracking-wider transition-colors ${isActive(i.href) ? 'text-white' : 'text-rem-grey hover:text-white'}`}>
              {i.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-3 lg:flex">
          <Link href="/gestion/moi" title="Mon espace" className={`text-right text-[10px] uppercase leading-tight hover:text-white ${isActive('/gestion/moi') ? 'text-white' : 'text-rem-grey'}`}>{userName}<br />{role}</Link>
          <form action="/api/auth/logout" method="post">
            <button className="rounded-full border border-[#333] px-4 py-1.5 text-[10px] uppercase tracking-wider hover:bg-white hover:text-black">Déconnexion</button>
          </form>
        </div>
        <button type="button" className="lg:hidden" aria-label="Menu" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
      </div>
      {open && (
        <nav className="border-t border-[#222] px-4 pb-4 lg:hidden">
          {items.map((i) => (
            <Link key={i.href} href={i.href} onClick={() => setOpen(false)}
              className={`block py-2 text-sm uppercase tracking-wider ${isActive(i.href) ? 'text-white' : 'text-rem-grey'}`}>{i.label}</Link>
          ))}
          <form action="/api/auth/logout" method="post" className="mt-2">
            <button className="rounded-full border border-[#333] px-4 py-1.5 text-[10px] uppercase">Déconnexion</button>
          </form>
        </nav>
      )}
    </header>
  );
}
