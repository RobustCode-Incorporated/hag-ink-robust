"use client";

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, Mail } from 'lucide-react';
import Image from 'next/image';
import type { AuthRole } from '@/lib/auth';

type Props = {
  role: AuthRole;
};

export default function LoginScreen({ role }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const roleLabel = useMemo(() => (role === 'CEO' ? 'Administrateur' : 'Manager'), [role]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role }),
      });
      const data = (await response.json()) as { error?: string; redirectTo?: string };
      if (!response.ok) throw new Error(data.error ?? 'Connexion impossible.');
      router.push(data.redirectTo ?? (role === 'CEO' ? '/ceo' : '/manager'));
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Connexion impossible.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen flex items-center justify-center p-6">
      <div className="absolute inset-0 z-0">
        <Image
          src="/interior.jpg"
          alt="Background"
          fill
          className="object-cover object-center grayscale-[50%]"
          priority
        />
        <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" />
      </div>

      <div className="relative z-10 w-full max-w-md bg-[#0a0a0a]/90 border border-neutral-800 p-10 shadow-2xl backdrop-blur-md">
        <div className="mb-8 text-center">
          <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-400">Acces Gestion</p>
          <h1 className="mt-2 text-3xl font-black text-white uppercase tracking-widest">{roleLabel}</h1>
          <div className="w-12 h-[2px] bg-neutral-600 mx-auto mt-3" />
        </div>

        <form onSubmit={submit} className="space-y-6">
          <div className="relative">
            <Mail className="absolute left-3 top-3 w-5 h-5 text-neutral-600" />
            <input
              type="text"
              placeholder="Email ou identifiant"
              className="w-full bg-[#050505]/50 border border-neutral-800 py-3 pl-12 pr-4 text-sm focus:border-white transition-all outline-none text-white"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-3 w-5 h-5 text-neutral-600" />
            <input
              type="password"
              placeholder="Mot de passe"
              className="w-full bg-[#050505]/50 border border-neutral-800 py-3 pl-12 pr-4 text-sm focus:border-white transition-all outline-none text-white"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          {error && <p role="alert" className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-white text-black font-bold uppercase text-xs tracking-[0.2em] hover:bg-neutral-200 transition-colors disabled:opacity-60"
          >
            {loading ? 'Connexion...' : 'Acceder au Dashboard'}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between text-xs uppercase tracking-wider text-neutral-500">
          <Link href="/login" className="hover:text-white transition-colors">Portail login</Link>
          <Link
            href={role === 'CEO' ? '/login/manager' : '/login/ceo'}
            className="hover:text-white transition-colors"
          >
            {role === 'CEO' ? 'Login Manager' : 'Login Admin'}
          </Link>
        </div>
      </div>
    </main>
  );
}
