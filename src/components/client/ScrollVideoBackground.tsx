"use client";

import { RefObject, useEffect, useRef } from "react";

// Vidéos générées par scripts/build-salon-video.py.
const SOURCES = {
  landscape: { src: "/video/salon-desktop.mp4", poster: "/video/salon-poster-desktop.jpg" },
  portrait: { src: "/video/salon-mobile.mp4", poster: "/video/salon-poster-mobile.jpg" },
};

// Part de la vidéo jouée pendant l'intro (plans de l'intérieur du salon).
// Le reste de la page joue les plans des outils puis le plan final.
// Valeur tirée des temps affichés par le script de montage.
const INTRO_SHARE = 0.46;

type Props = {
  /** Section dont la hauteur de scroll couvre les plans de l'intérieur. */
  introRef: RefObject<HTMLElement | null>;
};

export default function ScrollVideoBackground({ introRef }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const portrait = window.matchMedia("(orientation: portrait)").matches;
    const source = portrait ? SOURCES.portrait : SOURCES.landscape;
    video.poster = source.poster;

    // Mouvement réduit demandé : on garde l'image fixe, sans vidéo.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    video.src = source.src;
    video.load();

    let target = 0;
    let current = 0;
    let frame = 0;

    const computeTarget = () => {
      const intro = introRef.current;
      const scrollY = window.scrollY;
      const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      const introLength = intro ? Math.max(intro.offsetHeight - window.innerHeight, 1) : maxScroll;
      let progress: number;
      if (scrollY <= introLength) {
        progress = (scrollY / introLength) * INTRO_SHARE;
      } else {
        const rest = Math.max(maxScroll - introLength, 1);
        progress = INTRO_SHARE + ((scrollY - introLength) / rest) * (1 - INTRO_SHARE);
      }
      target = Math.min(Math.max(progress, 0), 1);
    };

    const tick = () => {
      const duration = video.duration;
      if (duration && Number.isFinite(duration)) {
        // Lissage : la vidéo rattrape la position du scroll en douceur.
        current += (target - current) * 0.12;
        const time = current * duration;
        if (!video.seeking && Math.abs(video.currentTime - time) > 1 / 60) {
          video.currentTime = time;
        }
      }
      frame = requestAnimationFrame(tick);
    };

    // iOS n'affiche pas d'image tant que la vidéo n'a jamais été lancée.
    const prime = () => {
      video.play().then(() => video.pause()).catch(() => {});
    };

    computeTarget();
    current = target;
    video.addEventListener("loadedmetadata", prime, { once: true });
    window.addEventListener("scroll", computeTarget, { passive: true });
    window.addEventListener("resize", computeTarget);
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      video.removeEventListener("loadedmetadata", prime);
      window.removeEventListener("scroll", computeTarget);
      window.removeEventListener("resize", computeTarget);
    };
  }, [introRef]);

  return (
    <div aria-hidden className="fixed inset-0 z-0 overflow-hidden bg-black">
      <video
        ref={videoRef}
        muted
        playsInline
        preload="auto"
        disablePictureInPicture
        className="h-full w-full object-cover"
      />
      {/* Assombrit les bords pour garder le texte lisible */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-black/70" />
    </div>
  );
}
