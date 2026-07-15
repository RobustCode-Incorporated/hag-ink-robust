import Link from 'next/link';

export default function LoginPortalPage() {
  return (
    <main className="min-h-screen bg-black text-white p-6 md:p-10">
      <div className="mx-auto max-w-4xl">
        <p className="text-[11px] uppercase tracking-[0.25em] text-neutral-400">Hag & Ink</p>
        <h1 className="mt-3 text-4xl font-black uppercase tracking-tight">Portail de connexion gestion</h1>
        <p className="mt-4 max-w-2xl text-neutral-400">
          Choisissez votre espace pour vous connecter. Le portail client public est desactive pendant cette phase de mise en ligne.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <Link
            href="/login/ceo"
            className="block rounded-2xl border border-neutral-800 bg-neutral-950 p-8 hover:border-white transition-colors"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Acces administrateur</p>
            <h2 className="mt-3 text-2xl font-bold uppercase">CEO / Admin</h2>
            <p className="mt-4 text-sm text-neutral-400">Tableau de bord global, analyses et supervision business.</p>
          </Link>

          <Link
            href="/login/manager"
            className="block rounded-2xl border border-neutral-800 bg-neutral-950 p-8 hover:border-white transition-colors"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Acces operationnel</p>
            <h2 className="mt-3 text-2xl font-bold uppercase">Manager</h2>
            <p className="mt-4 text-sm text-neutral-400">Gestion des prestations, depenses et suivi quotidien de l'activite.</p>
          </Link>
        </div>
      </div>
    </main>
  );
}
