'use client';
import { useActionState } from 'react';
import { btnGhost } from '@/components/gestion/ui';
import { portalLinkAction } from '../../../actions';

/** The secret link exists only in this component's memory: shown once, gone on reload. */
export default function PortalLink({ ambassadorId, name, hasLink }: { ambassadorId: string; name: string; hasLink: boolean }) {
  const [state, action, pending] = useActionState(portalLinkAction, null);
  return (
    <div className="mt-3 space-y-2">
      {state?.url && (
        <>
          <p className="text-sm">Lien à envoyer à {name} (WhatsApp). <b>Il n’est affiché qu’une fois</b> et ouvre son portail pendant 30 jours :</p>
          <p className="break-all rounded-lg bg-neutral-100 p-3 font-mono text-xs">{state.url}</p>
        </>
      )}
      {state?.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      <form action={action}>
        <input type="hidden" name="ambassadorId" value={ambassadorId} />
        <button disabled={pending} className={btnGhost}>{hasLink || state?.url ? 'Créer un nouveau lien (l’ancien ne marchera plus)' : 'Créer le lien du portail'}</button>
      </form>
    </div>
  );
}
