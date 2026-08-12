"use client";
import { Geist, Geist_Mono } from "next/font/google";
import Link from 'next/link';
import { usePathname, useRouter } from "next/navigation";
import { managementRoleFromPath } from '@/lib/management-navigation';
import ManagementNav from '@/components/navigation/ManagementNav';
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const role = managementRoleFromPath(pathname);

  const hideNav = role === null;

  const logout = async () => {
    window.location.assign('/api/auth/logout');
    router.refresh();
  };

  return (
    <html lang="fr" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-50 transition-colors duration-300">
        
        {/* Navbar (S'affiche partout SAUF sur les pages /client et /login) */}
        {!hideNav && (
          <header className="flex items-center justify-between p-4 bg-black text-white border-b border-gray-800">
            <div className="flex items-center gap-4">
              <img src="/RobustCodelogowhite.png" alt="Logo" className="w-10 h-10 object-contain" />
              <h1 className="text-[10px] font-bold tracking-widest uppercase">Robust Enterprise Management</h1>
            </div>

            {role && <ManagementNav role={role} onLogout={logout} />}
          </header>
        )}

        {/* Contenu principal */}
        <main className="flex-grow">{children}</main>
      </body>
    </html>
  );
}