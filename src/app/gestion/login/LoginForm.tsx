'use client';
import { FormEvent, useState } from 'react';
import { input, btn } from '@/components/gestion/ui';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      const data = (await res.json()) as { error?: string; redirectTo?: string };
      if (!res.ok) throw new Error(data.error ?? 'Connexion impossible.');
      window.location.assign(data.redirectTo ?? '/gestion');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connexion impossible.');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block text-sm">Email
        <input type="email" required autoComplete="username" className={`${input} mt-1`} value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label className="block text-sm">Mot de passe
        <input type="password" required autoComplete="current-password" className={`${input} mt-1`} value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <button type="submit" disabled={loading} className={`${btn} w-full py-3`}>{loading ? 'Connexion…' : 'Se connecter'}</button>
    </form>
  );
}
