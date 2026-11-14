'use client';
// Black screen cut out by the salon name: the video shows through the letters,
// which grow while scrolling until the black disappears. Origin: Hag & Ink.
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';

export default function LogoReveal({ word, sub, hint }: { word: string; sub: string; hint: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const scale = useTransform(scrollYProgress, [0, 0.7], [1, 28]);
  const maskOpacity = useTransform(scrollYProgress, [0.3, 0.65], [1, 0]);
  const hintOpacity = useTransform(scale, [1, 1.4], [1, 0]);

  return (
    <div ref={ref} className="relative h-[300vh]">
      <div className="sticky top-0 h-screen overflow-hidden">
        <motion.svg
          style={{ scale, opacity: maskOpacity }}
          className="pointer-events-none absolute inset-0 h-full w-full origin-[50%_48%] overflow-visible"
          viewBox="0 0 1000 600"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden
        >
          <defs>
            <mask id="salon-mask" maskUnits="userSpaceOnUse" x="-5000" y="-5000" width="11000" height="11000">
              <rect x="-5000" y="-5000" width="11000" height="11000" fill="white" />
              <text x="500" y="318" textAnchor="middle" fontSize="190" letterSpacing="4" fill="black"
                style={{ fontFamily: 'var(--font-anton), Impact, sans-serif' }}>{word}</text>
              <text x="500" y="372" textAnchor="middle" fontSize="34" letterSpacing="22" fill="black"
                style={{ fontFamily: 'var(--font-archivo), sans-serif', fontWeight: 700 }}>{sub}</text>
            </mask>
          </defs>
          <rect x="-5000" y="-5000" width="11000" height="11000" fill="#050505" mask="url(#salon-mask)" />
        </motion.svg>
        <motion.div style={{ opacity: hintOpacity }}
          className="absolute bottom-10 left-0 right-0 flex flex-col items-center gap-2 text-[10px] uppercase tracking-[0.5em] text-neutral-400">
          {hint}
          <motion.span animate={{ scaleY: [0.3, 1, 0.3], opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="block h-10 w-px origin-top bg-neutral-300" />
        </motion.div>
      </div>
    </div>
  );
}
