"use client";

import { FormEvent, useEffect, useState } from 'react';

type Barber = { id: string; firstName: string; lastName: string; phone: string | null; };

export default function ManagerBarbersPage() {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadBarbers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/barbers');
      if (res.ok) setBarbers(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadBarbers(); }, []);

  const createBarber = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch('/api/barbers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, phone }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Erreur création barbier');
      setMessage('Barbier ajouté avec succès.');
      setFirstName('');
      setLastName('');
      setPhone('');
      await loadBarbers();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erreur serveur');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-slate-700">Chargement des barbiers...</div>;
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Espace manager</p>
        <h1 className="text-2xl font-black">Coiffeurs</h1>
        <p className="text-sm text-slate-500">Liste de barbiers pour le manager.</p>
      </div>

      <section className="rounded-2xl border bg-white p-6 shadow-sm mb-8">
        <h2 className="font-semibold">Barbiers enregistrés</h2>
        <div className="mt-4 space-y-3">
          {barbers.map(barber => (
            <div key={barber.id} className="rounded-xl border p-4">
              <p className="font-semibold">{barber.firstName} {barber.lastName}</p>
              <p className="text-sm text-slate-500">Tel: {barber.phone ?? 'non renseigné'}</p>
            </div>
          ))}
          {barbers.length === 0 && <p className="text-sm text-slate-500">Aucun barbier enregistré.</p>}
        </div>
      </section>
    </div>
  );
}
