'use client';
// Password field with an eye button to show / hide what is typed.
import { Eye, EyeOff } from 'lucide-react';
import { useState, type InputHTMLAttributes } from 'react';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

export default function PasswordInput({ className = '', ...props }: Props) {
  const [visible, setVisible] = useState(false);
  return (
    <span className="relative block">
      <input {...props} type={visible ? 'text' : 'password'} className={`${className} pr-10`} />
      <button type="button" onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} aria-pressed={visible}
        title={visible ? 'Masquer' : 'Afficher'}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-neutral-400 hover:text-black">
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </span>
  );
}
