"use client";
import { Geist, Geist_Mono } from "next/font/google";
import Link from 'next/link';
import { usePathname } from "next/navigation";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Récupération de l'URL actuelle
  const pathname = usePathname();
  // On vérifie si l'utilisateur se trouve sur le portail client ou sur la page de connexion
  const isClientPage = pathname?.startsWith('/client');
  const isLoginPage = pathname?.startsWith('/login');

  const hideNav = isClientPage || isLoginPage;

  const menuItems = [
    { id: 'coupes', label: 'Accueil' },
    { id: 'produits', label: 'Produits' },
    { id: 'rh', label: pathname?.startsWith('/manager') ? 'Coiffeurs' : 'Ressources Humaines' },
    { id: 'tresorerie', label: 'Trésorerie & Salaires' },
    { id: 'depenses', label: 'Dépenses' },
    { id: 'robust', label: 'ROBUST IA' },
  ];

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

            <nav className="flex items-center gap-6">
              {menuItems.map(item => {
                if (item.id === 'coupes') {
                  const href = pathname?.startsWith('/manager') ? '/manager' : '/ceo';
                  return (
                    <Link key={item.id} href={href} className="text-gray-400 hover:text-white text-xs uppercase transition-colors">
                      {item.label}
                    </Link>
                  );
                }
                if (item.id === 'produits') {
                  const href = pathname?.startsWith('/ceo') ? '/ceo/products' : pathname?.startsWith('/manager') ? '/manager/products' : '/ceo/products';
                  return (
                    <Link key={item.id} href={href} className="text-gray-400 hover:text-white text-xs uppercase transition-colors">
                      {item.label}
                    </Link>
                  );
                }
                if (item.id === 'rh') {
                  const href = pathname?.startsWith('/manager') ? '/manager/coiffeurs' : '/ceo/hr';
                  return (
                    <Link key={item.id} href={href} className="text-gray-400 hover:text-white text-xs uppercase transition-colors">
                      {item.label}
                    </Link>
                  );
                }
                if (item.id === 'tresorerie') {
                  if (pathname?.startsWith('/manager')) {
                    return null;
                  }
                  const href = '/ceo/treasury';
                  return (
                    <Link key={item.id} href={href} className="text-gray-400 hover:text-white text-xs uppercase transition-colors">
                      {item.label}
                    </Link>
                  );
                }
                if (item.id === 'depenses') {
                  const href = pathname?.startsWith('/manager') ? '/manager/depenses' : '/ceo/depenses';
                  return (
                    <Link key={item.id} href={href} className="text-gray-400 hover:text-white text-xs uppercase transition-colors">
                      {item.label}
                    </Link>
                  );
                }
                return (
                  <button key={item.id} className="text-gray-400 hover:text-white text-xs uppercase transition-colors">
                    {item.label}
                  </button>
                );
              })}

              <button className="px-4 py-1.5 border border-gray-700 rounded-full text-[10px] uppercase hover:bg-white hover:text-black transition-all">
                Déconnexion
              </button>
            </nav>
          </header>
        )}

        {/* Contenu principal */}
        <main className="flex-grow">{children}</main>
      </body>
    </html>
  );
}