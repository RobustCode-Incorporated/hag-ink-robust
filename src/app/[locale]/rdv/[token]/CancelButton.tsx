'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function CancelButton({ token, labels }: { token: string; labels: { cancel: string; confirm: string; tooLate: string } }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="flex-1">
      <button type="button" disabled={busy}
        onClick={async () => {
          if (!window.confirm(labels.confirm)) return;
          setBusy(true);
          const res = await fetch(`/api/bookings/${token}/cancel`, { method: 'POST' });
          setBusy(false);
          if (res.status === 409) setMsg(labels.tooLate);
          else router.refresh();
        }}
        className="w-full rounded-sm border border-white/25 px-4 py-3 text-sm font-bold uppercase tracking-wider text-white hover:border-cabinet hover:bg-cabinet disabled:opacity-60">
        {labels.cancel}
      </button>
      {msg && <p className="mt-2 text-xs text-red-300">{msg}</p>}
    </div>
  );
}
