import LoginForm from './LoginForm';
import { SALON } from '@/config/salon';

export const metadata = { title: 'Connexion' };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col md:flex-row">
      <div className="flex flex-col items-center justify-center bg-black px-8 py-12 text-white md:w-[40%]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/RobustCodelogowhite.png" alt="Robust Code" className="h-24 w-24 object-contain" />
        <p className="mt-4 text-center font-[family-name:var(--font-brand)] text-2xl font-thin uppercase tracking-[0.25em]">Robust Enterprise<br />Management</p>
        <p className="mt-6 text-xs uppercase tracking-[0.3em] text-rem-grey">{SALON.name}</p>
      </div>
      <div className="flex flex-1 items-center justify-center bg-snow px-6 py-12">
        <div className="w-full max-w-sm">
          <h1 className="mb-1 text-2xl">Connexion</h1>
          <p className="mb-8 text-sm text-neutral-500">Espace de gestion du salon</p>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
