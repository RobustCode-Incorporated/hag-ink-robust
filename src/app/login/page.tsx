"use client";

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Lock, Mail, User } from 'lucide-react';
import Image from 'next/image';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'CEO' | 'MANAGER'>('CEO');
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    router.push(role === 'CEO' ? '/ceo' : '/manager');
  };

  return (
    <main className="relative min-h-screen flex items-center justify-center p-6">
      {/* Arrière-plan avec Image */}
      <div className="absolute inset-0 z-0">
        <Image 
          src="/interior.jpg" 
          alt="Background" 
          fill 
          className="object-cover object-center grayscale-[50%]" 
          priority
        />
        {/* Overlay sombre pour la lisibilité */}
        <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"></div>
      </div>

      {/* Formulaire */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md bg-[#0a0a0a]/90 border border-neutral-800 p-10 shadow-2xl backdrop-blur-md"
      >
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-black text-white uppercase tracking-widest mb-2">Login</h1>
          <div className="w-12 h-[2px] bg-neutral-600 mx-auto"></div>
        </div>

        <form onSubmit={submit} className="space-y-6">
          <div className="relative">
            <Mail className="absolute left-3 top-3 w-5 h-5 text-neutral-600" />
            <input
              type="email"
              placeholder="Email"
              className="w-full bg-[#050505]/50 border border-neutral-800 py-3 pl-12 pr-4 text-sm focus:border-white transition-all outline-none text-white"
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-3 w-5 h-5 text-neutral-600" />
            <input
              type="password"
              placeholder="Mot de passe"
              className="w-full bg-[#050505]/50 border border-neutral-800 py-3 pl-12 pr-4 text-sm focus:border-white transition-all outline-none text-white"
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="relative">
            <User className="absolute left-3 top-3 w-5 h-5 text-neutral-600" />
            <select
              className="w-full bg-[#050505]/50 border border-neutral-800 py-3 pl-12 pr-4 text-sm appearance-none outline-none text-white"
              onChange={(e) => setRole(e.target.value as 'CEO' | 'MANAGER')}
            >
              <option value="CEO">CEO</option>
              <option value="MANAGER">MANAGER</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-white text-black font-bold uppercase text-xs tracking-[0.2em] hover:bg-neutral-200 transition-colors"
          >
            {loading ? 'Connexion...' : 'Accéder au Dashboard'}
          </button>
        </form>
      </motion.div>
    </main>
  );
}