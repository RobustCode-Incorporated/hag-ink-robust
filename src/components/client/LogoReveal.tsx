"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { Black_Ops_One } from "next/font/google";
import { useRef } from "react";

const blackOpsOne = Black_Ops_One({ weight: "400", subsets: ["latin"] });

/**
 * Écran noir troué par les lettres HAG&INK : la vidéo de fond n'apparaît qu'à
 * travers le texte. En scrollant, les lettres grandissent puis le noir disparaît.
 */
export default function LogoReveal() {
  const revealRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: revealRef, offset: ["start start", "end end"] });

  const scale = useTransform(scrollYProgress, [0, 0.7], [1, 30]);
  const maskOpacity = useTransform(scrollYProgress, [0.3, 0.65], [1, 0]);
  const hintOpacity = useTransform(scale, [1, 1.4], [1, 0]);

  return (
    <div ref={revealRef} className="relative h-[300vh]">
      <div className="sticky top-0 h-screen overflow-hidden">
        <motion.svg
          style={{ scale, opacity: maskOpacity }}
          className="pointer-events-none absolute inset-0 h-full w-full origin-[50%_52%] overflow-visible"
          viewBox="0 0 1000 600"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden
        >
          <defs>
            <mask id="hag-ink-mask" maskUnits="userSpaceOnUse" x="-5000" y="-5000" width="11000" height="11000">
              <rect x="-5000" y="-5000" width="11000" height="11000" fill="white" />
              <text x="500" y="335" textAnchor="middle" fontSize="150" letterSpacing="6" className={blackOpsOne.className} fill="black">
                HAG&amp;INK
              </text>
            </mask>
          </defs>
          {/* Le cache déborde du cadre pour couvrir tout l'écran, même en portrait. */}
          <rect x="-5000" y="-5000" width="11000" height="11000" fill="#050505" mask="url(#hag-ink-mask)" />
        </motion.svg>
        <motion.div
          style={{ opacity: hintOpacity }}
          className="absolute bottom-10 left-0 right-0 flex flex-col items-center gap-2 text-[10px] uppercase tracking-[0.5em] text-neutral-400"
        >
          Scroll pour entrer
          <motion.span
            animate={{ scaleY: [0.3, 1, 0.3], opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="block h-10 w-px origin-top bg-neutral-300"
          />
        </motion.div>
      </div>
    </div>
  );
}
