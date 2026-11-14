'use client';
import { btnGhost } from './ui';

export default function PrintButton() {
  return <button type="button" onClick={() => window.print()} className={btnGhost}>Imprimer / PDF</button>;
}
