"use client";
import { useState, useEffect } from 'react';

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    setMounted(true);
    const isDarkMode = document.documentElement.classList.contains('dark');
    setIsDark(isDarkMode);
  }, []);

  const toggle = () => {
    const root = document.documentElement;
    root.classList.toggle('dark');
    setIsDark(!isDark);
  };

  if (!mounted) return null;

  return (
    <button onClick={toggle} className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 transition-all text-sm">
      {isDark ? '☀️' : '🌙'}
    </button>
  );
}