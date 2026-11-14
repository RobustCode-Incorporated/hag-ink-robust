'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** Refreshes the page every 5 s while a report is being prepared. */
export default function AutoRefresh({ active }: { active: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(t);
  }, [active, router]);
  return null;
}
