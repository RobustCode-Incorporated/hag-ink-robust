"use client";

import { FormEvent, useEffect, useState } from 'react';

type Barber = { id: string; firstName: string; lastName: string; phone: string | null; commissionRate: number; salaryType: string; };
type Cleaner = { id: string; email: string; role: string; };

type StaffRole = 'MANAGER' | 'BARBER' | 'CLEANER';

export default function CEOHRPage() {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [loading, setLoading] = useState(true);
  const [staffRole, setStaffRole] = useState<StaffRole>('MANAGER');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffFirstName, setStaffFirstName] = useState('');
  const [staffLastName, setStaffLastName] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [barberRes, cleanerRes] = await Promise.all([fetch('/api/barbers'), fetch('/api/cleaners')]);
      if (barberRes.ok) setBarbers(await barberRes.json());
      if (cleanerRes.ok) setCleaners(await cleanerRes.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadData(); }, []);

  const createStaff = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    const body: Record<string, unknown> = { role: staffRole };

    if (staffRole === 'MANAGER') {
      body.email = staffEmail;
      body.password = staffPassword;
      body.phone = staffPhone;
    }

    if (staffRole === 'BARBER') {
      body.email = staffEmail;
    }

    if (staffRole === 'CLEANER') {
      body.firstName = staffFirstName;
      body.lastName = staffLastName;
      body.phone = staffPhone;
    }

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Erreur création collaborateur');

      setMessage(`${staffRole.charAt(0) + staffRole.slice(1).toLowerCase()} créé avec succès.`);
      setStaffEmail('');
      setStaffPassword('');
      setStaffFirstName('');
      setStaffLastName('');
      setStaffPhone('');
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erreur serveur');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-slate-700">Chargement des ressources humaines...</div>;
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Espace CEO</p>
        <h1 className="text-2xl font-black">Ressources Humaines</h1>
        <p className="text-sm text-slate-500">Liste du personnel et création de collaborateurs par rôle.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2 mb-8">
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="font-semibold">Barbiers enregistrés</h2>
          <div className="mt-4 space-y-3">
            {barbers.map(barber => (
              <div key={barber.id} className="rounded-xl border p-4">
                <p className="font-semibold">{barber.firstName} {barber.lastName}</p>
                <p className="text-sm text-slate-500">Tel: {barber.phone ?? 'non renseigné'}</p>
                <p className="text-sm text-slate-500">Commission: {Math.round(barber.commissionRate * 100)}%</p>
              </div>
            ))}
            {barbers.length === 0 && <p className="text-sm text-slate-500">Aucun barbier enregistré.</p>}
          </div>
        </section>

        <div className="grid gap-6">
          <section className="rounded-2xl border bg-white p-6 shadow-sm max-h-[320px] overflow-hidden">
            <h2 className="font-semibold">Cleaners enregistrés</h2>
            <div className="mt-4 space-y-3 overflow-y-auto pr-2" style={{ maxHeight: '260px' }}>
              {cleaners.map(cleaner => (
                <div key={cleaner.id} className="rounded-xl border p-4">
                  <p className="font-semibold">{cleaner.email}</p>
                  <p className="text-sm text-slate-500">Role: {cleaner.role}</p>
                </div>
              ))}
              {cleaners.length === 0 && <p className="text-sm text-slate-500">Aucun cleaner enregistré.</p>}
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="font-semibold">Enregistrer un collaborateur</h2>
            <form onSubmit={createStaff} className="mt-4 space-y-4">
              <label className="block text-sm font-medium">
                Rôle
                <select required value={staffRole} onChange={(e) => setStaffRole(e.target.value as StaffRole)} className="mt-2 w-full rounded-lg border p-3">
                  <option value="MANAGER">MANAGER</option>
                  <option value="BARBER">BARBER</option>
                  <option value="CLEANER">CLEANER</option>
                </select>
              </label>

              {staffRole === 'MANAGER' && (
                <>
                  <label className="block text-sm font-medium">
                    Email
                    <input required type="email" value={staffEmail} onChange={(e) => setStaffEmail(e.target.value)} className="mt-2 w-full rounded-lg border p-3" />
                  </label>
                  <label className="block text-sm font-medium">
                    Téléphone
                    <input required value={staffPhone} onChange={(e) => setStaffPhone(e.target.value)} className="mt-2 w-full rounded-lg border p-3" />
                  </label>
                  <label className="block text-sm font-medium">
                    Mot de passe
                    <input required type="password" value={staffPassword} onChange={(e) => setStaffPassword(e.target.value)} className="mt-2 w-full rounded-lg border p-3" />
                  </label>
                </>
              )}

              {staffRole === 'BARBER' && (
                <label className="block text-sm font-medium">
                  Email
                  <input required type="email" value={staffEmail} onChange={(e) => setStaffEmail(e.target.value)} className="mt-2 w-full rounded-lg border p-3" />
                </label>
              )}

              {staffRole === 'CLEANER' && (
                <>
                  <label className="block text-sm font-medium">
                    Prénom
                    <input required value={staffFirstName} onChange={(e) => setStaffFirstName(e.target.value)} className="mt-2 w-full rounded-lg border p-3" />
                  </label>
                  <label className="block text-sm font-medium">
                    Nom
                    <input required value={staffLastName} onChange={(e) => setStaffLastName(e.target.value)} className="mt-2 w-full rounded-lg border p-3" />
                  </label>
                  <label className="block text-sm font-medium">
                    Téléphone
                    <input required value={staffPhone} onChange={(e) => setStaffPhone(e.target.value)} className="mt-2 w-full rounded-lg border p-3" />
                  </label>
                </>
              )}

              {message && <p className="text-sm text-slate-600">{message}</p>}
              <button disabled={saving} className="mt-2 w-full rounded-lg bg-slate-950 p-3 text-white font-bold disabled:opacity-60">
                {saving ? 'Enregistrement en cours…' : `Créer ${staffRole.toLowerCase()}`}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
