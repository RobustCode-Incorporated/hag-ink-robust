import type { Metadata } from 'next';
import { ABeeZee, Ysabeau_Office } from 'next/font/google';
import '../globals.css';
import { SALON } from '@/config/salon';

const abeezee = ABeeZee({ weight: '400', subsets: ['latin'], variable: '--font-abeezee' });
const ysabeau = Ysabeau_Office({ subsets: ['latin'], weight: ['100', '300', '500'], variable: '--font-ysabeau' });

export const metadata: Metadata = {
  title: { default: `Gestion — ${SALON.name}`, template: '%s — Robust Enterprise Management' },
  robots: { index: false, follow: false },
};

export default function GestionRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${abeezee.variable} ${ysabeau.variable}`}>
      <body className="min-h-screen bg-snow font-[family-name:var(--font-rem)] text-black">{children}</body>
    </html>
  );
}
