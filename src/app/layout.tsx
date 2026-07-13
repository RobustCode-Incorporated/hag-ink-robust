"use client";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const menuItems = [
    { id: 'coupes', label: 'Gestion des Coupes' },
    { id: 'produits', label: 'Produits' },
    { id: 'rh', label: 'Ressources Humaines' },
    { id: 'tresorerie', label: 'Trésorerie & Salaires' },
    { id: 'depenses', label: 'Dépenses' },
    { id: 'robust', label: 'ROBUST IA' },
  ];

  return (
    <html lang="fr" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-50 transition-colors duration-300">
        
        {/* Navbar */}
        <header className="flex items-center justify-between p-4 bg-black text-white border-b border-gray-800">
          <div className="flex items-center gap-4">
            <img src="/RobustCodelogowhite.png" alt="Logo" className="w-10 h-10 object-contain" />
            <h1 className="text-[10px] font-bold tracking-widest uppercase">Robust Enterprise Management</h1>
          </div>

          <nav className="flex items-center gap-6">
            {menuItems.map(item => (
              <button key={item.id} className="text-gray-400 hover:text-white text-xs uppercase transition-colors">
                {item.label}
              </button>
            ))}
            
            <button className="px-4 py-1.5 border border-gray-700 rounded-full text-[10px] uppercase hover:bg-white hover:text-black transition-all">
              Déconnexion
            </button>
          </nav>
        </header>

        {/* Contenu principal */}
        <main className="flex-grow">{children}</main>
      </body>
    </html>
  );
}