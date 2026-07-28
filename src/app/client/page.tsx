"use client";

import { motion } from "framer-motion";
import { 
  Calendar, Star, Scissors, Check, 
  Trophy, Medal, Award, Camera, 
  ShoppingBag, Ticket, Sparkles, Coffee, Gift, Phone, MapPin
} from "lucide-react";
import Image from "next/image";
import { Black_Ops_One } from "next/font/google";
import { useState } from "react";
import SlideOver from "@/components/SlideOver";
import BookingSlideOver from "@/components/BookingSlideOver";

const blackOpsOne = Black_Ops_One({ weight: '400', subsets: ['latin'] });

// SVG icons for social networks not in lucide-react
function IconInstagram({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  );
}

function IconSnapchat({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301.165-.088.344-.104.464-.104.182 0 .359.029.509.09.45.149.734.479.734.838.015.449-.39.839-1.213 1.168-.089.029-.209.075-.344.119-.45.135-1.139.36-1.333.81-.09.224-.061.524.12.868l.015.015c.06.136 1.526 3.475 4.791 4.014.255.044.435.27.42.509 0 .075-.015.149-.045.225-.24.569-1.273.988-3.146 1.271-.059.091-.12.375-.164.57-.029.179-.074.36-.134.553-.076.271-.27.405-.555.405h-.03c-.135 0-.313-.031-.538-.074-.36-.075-.765-.135-1.273-.135-.3 0-.599.015-.913.074-.6.104-1.123.464-1.723.884-.853.599-1.826 1.288-3.294 1.288-.06 0-.119-.015-.18-.015h-.149c-1.468 0-2.427-.675-3.279-1.288-.599-.42-1.107-.779-1.707-.884-.314-.045-.629-.074-.928-.074-.54 0-.958.089-1.272.149-.211.043-.391.074-.54.074-.299 0-.465-.135-.54-.405-.046-.165-.091-.36-.136-.554-.046-.195-.105-.48-.164-.57-1.918-.222-2.95-.642-3.189-1.226-.031-.063-.052-.14-.055-.216-.015-.239.165-.465.42-.509 3.264-.54 4.73-3.879 4.791-4.02l.016-.029c.18-.345.224-.645.119-.869-.195-.434-.884-.658-1.332-.809-.121-.029-.24-.074-.346-.119-1.107-.435-1.257-.93-1.197-1.273.09-.479.674-.793 1.168-.793.146 0 .27.029.383.074.42.194.789.3 1.104.3.234 0 .384-.06.465-.105l-.046-.569c-.098-1.626-.225-3.651.307-4.837C7.392 1.077 10.739.807 11.727.807l.419-.015h.06z"/>
    </svg>
  );
}

function IconTikTok({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.16 8.16 0 004.77 1.52V6.75a4.85 4.85 0 01-1-.06z"/>
    </svg>
  );
}

export default function ClientPage() {
  const [selectedPlan, setSelectedPlan] = useState<{ code: string; name: string; price: number } | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', email: '' });
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const memberships = [
    { code: "STANDARD_ENFANT", name: "Standard Enfant", target: "Enfants", value: 50, price: 49, desc: "Jusqu'à 5 coiffures (minimum conseillé : 3)", perks: ["Flexibilité totale", "Accès à la loterie"] },
    { code: "STANDARD_ADULTE", name: "Standard Adulte", target: "Hommes / Femmes", value: 100, price: 89, desc: "Jusqu'à 5 coiffures (minimum conseillé : 3)", perks: ["11$ d'économie", "Accès VIP au programme fidélité"] },
    { code: "BRAIDS_A", name: "Braids A", target: "Tresses classiques", value: 100, price: 89, desc: "Jusqu'à 5 prestations", perks: ["11$ d'économie"] },
    { code: "BRAIDS_B", name: "Braids B", target: "Braids Premium", value: 200, price: 189, desc: "Jusqu'à 5 prestations", perks: ["11$ d'économie"] },
    { code: "LOCKS_A", name: "Locks A", target: "Entretien Locks", value: 225, price: 209, desc: "Jusqu'à 5 prestations", perks: ["Prix préférentiel", "Priorité de réservation"] },
    { code: "LOCKS_B", name: "Locks B", target: "Locks Premium", value: 350, price: 329, desc: "Jusqu'à 5 prestations", perks: ["Économie majeure", "Service ultra-prioritaire"] },
  ];

  const startCheckout = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedPlan) return;
    setCheckoutError(null); setIsSubmitting(true);
    try {
      const response = await fetch('/api/payments/create-checkout-session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, planName: selectedPlan.code }) });
      const data: { url?: string; error?: string } = await response.json();
      if (!response.ok || !data.url) throw new Error(data.error ?? 'Impossible de préparer le paiement.');
      window.location.assign(data.url);
    } catch (error) { setCheckoutError(error instanceof Error ? error.message : 'Une erreur est survenue.'); }
    finally { setIsSubmitting(false); }
  };

  const minorPrizes = [
    { icon: Camera, text: "4e : Séance photo professionnelle" },
    { icon: Scissors, text: "5e : Pack Barber VIP (Coiffure, barbe, soin)" },
    { icon: ShoppingBag, text: "6e : Bon d'achat boutique partenaire" },
    { icon: Ticket, text: "7e : Accès gratuit à un événement (Concert/Festival)" },
    { icon: Sparkles, text: "8e : Massage relaxant de 60 minutes" },
    { icon: Coffee, text: "9e : Journée piscine + déjeuner" },
    { icon: Gift, text: "10e : Un mois de Membership offert" },
  ];

  return (
    <main className="min-h-screen bg-[#050505] text-neutral-200 font-sans selection:bg-neutral-800 selection:text-white">
      
      {/* --- HERO SECTION --- */}
      <section className="relative h-screen w-full flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image 
            src="/interior.jpg" 
            alt="Hag & Ink Interior" 
            fill 
            className="object-cover object-center opacity-40 grayscale-[50%]"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-[#050505]"></div>
        </div>

        <div className="relative z-10 flex flex-col items-center text-center px-5 max-w-5xl mx-auto mt-16 sm:mt-20">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-neutral-700/50 bg-black/50 backdrop-blur-md mb-6 sm:mb-8"
          >
            <Star className="w-3 h-3 sm:w-4 sm:h-4 text-neutral-400" />
            <span className="text-xs sm:text-sm font-medium tracking-widest uppercase text-neutral-300">Premium Barber & Tattoo</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <h1 className={`${blackOpsOne.className} text-5xl sm:text-6xl md:text-8xl tracking-widest text-white mb-4 drop-shadow-2xl`}>
              HAG <span className="text-neutral-500">&</span> INK
            </h1>
            <p className="text-sm sm:text-base md:text-xl text-neutral-400 font-light max-w-2xl mx-auto mb-8 sm:mb-10 px-2">
              L'élégance du détail. L'art dans la peau. Bienvenue dans l'élite du lifestyle urbain.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto"
          >
            <button onClick={() => setBookingOpen(true)} className="px-6 sm:px-8 py-3.5 sm:py-4 bg-white text-black font-bold uppercase tracking-wider text-sm rounded-sm transition-all hover:bg-neutral-200 flex items-center justify-center gap-2">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
              Réserver un créneau
            </button>
            <button onClick={() => document.getElementById('memberships')?.scrollIntoView({ behavior: 'smooth' })} className="px-6 sm:px-8 py-3.5 sm:py-4 bg-transparent text-white font-bold uppercase tracking-wider text-sm border border-neutral-700 rounded-sm transition-all hover:border-white hover:bg-white/5 flex items-center justify-center gap-2">
              <Scissors className="w-4 h-4 sm:w-5 sm:h-5" />
              Voir les Memberships
            </button>
          </motion.div>
        </div>
      </section>

      {/* --- SECTION MEMBERSHIPS --- */}
      <section id="memberships" className="py-16 md:py-24 px-4 relative border-t border-neutral-900 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image 
            src="/tools.jpg" 
            alt="Hag & Ink Tools" 
            fill 
            className="object-cover object-center opacity-50 grayscale-[50%] contrast-[1.2]" 
            priority
          />
          <div className="absolute inset-0 bg-black/60"></div> 
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          
          <div className="text-center mb-10 md:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-white mb-3 md:mb-4">
              Packs <span className="text-neutral-500">Exclusifs</span>
            </h2>
            <p className="text-neutral-400 text-sm sm:text-base md:text-lg px-2">Rejoins le cercle restreint. Économise sur tes coupes et participe à la loterie VIP.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {memberships.map((plan, index) => (
              <motion.div 
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group relative p-5 md:p-8 bg-black/60 backdrop-blur-sm border border-neutral-800 flex flex-col justify-between hover:border-neutral-500 transition-all duration-300"
              >
                <div>
                  <span className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-2 block">{plan.target}</span>
                  <h3 className="text-xl md:text-2xl font-bold text-white uppercase tracking-wide mb-3 md:mb-4">{plan.name}</h3>
                  <div className="flex items-end gap-2 mb-4 md:mb-6">
                    <span className="text-3xl md:text-4xl font-black text-white">{plan.price}$</span>
                    <span className="text-base md:text-lg text-neutral-600 line-through pb-1">Valeur {plan.value}$</span>
                  </div>
                  <p className="text-neutral-400 text-sm mb-4 md:mb-6 pb-4 md:pb-6 border-b border-neutral-800">{plan.desc}</p>
                  
                  <ul className="space-y-2 md:space-y-3 mb-6 md:mb-8">
                    {plan.perks.map((perk, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-neutral-300">
                        <Check className="w-4 h-4 md:w-5 md:h-5 text-neutral-500 shrink-0 mt-0.5" />
                        <span>{perk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <button onClick={() => setSelectedPlan(plan)} className="w-full py-3.5 md:py-4 bg-neutral-900 border border-neutral-700 text-white font-bold uppercase text-sm tracking-wider hover:bg-white hover:text-black transition-colors">
                  Sélectionner
                </button>
              </motion.div>
            ))}
          </div>

          {/* Limited Edition */}
          <motion.div 
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             className="mt-4 md:mt-6 w-full p-5 sm:p-8 md:p-12 bg-black/80 backdrop-blur-md border border-neutral-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 md:gap-8 relative overflow-hidden"
          >
             <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20"></div>

             <div className="relative z-10 w-full md:w-2/3">
                <span className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-2 block">Artistes, Influenceurs, Créateurs</span>
                <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-white uppercase tracking-wide mb-3 md:mb-4 flex items-center gap-3">
                  Limited Edition <Star className="w-5 h-5 md:w-6 md:h-6 text-yellow-500 fill-yellow-500/20" />
                </h3>
                <p className="text-neutral-400 text-sm sm:text-base md:text-lg">Coiffures illimitées dans la limite de 5 visites. Avantages exclusifs et 2 tickets d'office pour la grande loterie.</p>
             </div>
             
             <div className="relative z-10 flex flex-col items-start md:items-end shrink-0 w-full md:w-auto">
                <div className="flex items-end gap-2 mb-4">
                  <span className="text-4xl md:text-5xl font-black text-white">229$</span>
                  <span className="text-lg md:text-xl text-neutral-600 line-through pb-1">≈250$</span>
                </div>
                <button onClick={() => setSelectedPlan({ code: 'LIMITED_EDITION', name: 'Limited Edition', price: 229 })} className="w-full md:w-auto px-8 md:px-10 py-3.5 md:py-4 bg-white text-black font-bold uppercase text-sm tracking-wider hover:bg-neutral-200 transition-colors">
                  Devenir VIP
                </button>
             </div>
          </motion.div>

        </div>
      </section>

      {/* --- SECTION LOTERIE VIP --- */}
      <section className="py-16 md:py-32 px-4 bg-[#020202] border-t border-neutral-900 relative">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-10 md:mb-20">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-neutral-800 bg-black mb-5 md:mb-6"
            >
              <Star className="w-3 h-3 md:w-4 md:h-4 text-neutral-500" />
              <span className="text-xs font-bold tracking-[0.2em] uppercase text-neutral-400">Programme de Fidélité</span>
            </motion.div>
            <h2 className="text-3xl sm:text-4xl md:text-6xl font-black uppercase tracking-tight text-white mb-4 md:mb-6">
              Grande Loterie VIP
            </h2>
          </div>

          {/* Top 3 Prix */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-12">
            {[
              { icon: Trophy, rank: "1er Prix", title: "Journée Spa", desc: "Soins complets pour 2 personnes." },
              { icon: Medal, rank: "2e Prix", title: "Dîner Gastronomique", desc: "Menu dégustation, transport inclus." },
              { icon: Award, rank: "3e Prix", title: "Brunch de Luxe", desc: "Service premium, cadre privilégié." },
            ].map((prize, i) => {
              const Icon = prize.icon;
              return (
                <motion.div
                  key={i}
                  className="p-5 md:p-8 bg-[#0a0a0a] border border-neutral-800 flex flex-row sm:flex-col items-center sm:items-start gap-4 sm:gap-0 hover:border-neutral-600 transition-colors"
                >
                  <div className="w-9 h-9 sm:w-10 sm:h-10 sm:mb-6 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 md:w-6 md:h-6 text-neutral-600" />
                  </div>
                  <div>
                    <h3 className="text-[10px] font-bold tracking-widest text-neutral-500 uppercase sm:mb-2">{prize.rank}</h3>
                    <h4 className="text-base md:text-lg font-bold uppercase text-white sm:mb-4">{prize.title}</h4>
                    <p className="text-neutral-500 text-sm hidden sm:block">{prize.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Autres récompenses */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 max-w-4xl mx-auto"
          >
            {minorPrizes.slice(0, 6).map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="flex items-center gap-3 md:gap-4 p-4 md:p-5 bg-[#0a0a0a] border border-neutral-800">
                  <div className="p-1.5 md:p-2 shrink-0">
                    <Icon className="w-4 h-4 text-neutral-600" />
                  </div>
                  <span className="text-neutral-400 font-medium text-sm">{item.text}</span>
                </div>
              );
            })}
            <div className="flex items-center gap-3 md:gap-4 p-4 md:p-5 bg-[#0a0a0a] border border-neutral-800 sm:col-span-2 sm:justify-center">
              <div className="p-1.5 md:p-2 shrink-0">
                <Gift className="w-4 h-4 text-neutral-600" />
              </div>
              <span className="text-neutral-400 font-medium text-sm">10e : Un mois de Membership offert</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-black border-t border-neutral-900 px-5 pt-12 pb-8">
        <div className="max-w-7xl mx-auto">
          {/* Top footer */}
          <div className="flex flex-col sm:flex-row justify-between gap-8 mb-10">
            {/* Brand */}
            <div className="flex-1 max-w-xs">
              <h3 className={`${blackOpsOne.className} text-2xl text-white tracking-widest mb-2`}>HAG <span className="text-neutral-500">&</span> INK</h3>
              <p className="text-neutral-500 text-xs leading-relaxed">Premium Barber & Tattoo.<br />L'élégance du détail. L'art dans la peau.</p>
            </div>

            {/* Contact & Address */}
            <div className="flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 mb-4">Contact & Adresse</p>
              <div className="space-y-2">
                <a href="tel:+243841938211" className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors text-sm">
                  <Phone className="w-4 h-4 text-neutral-600 shrink-0" />
                  +243 841 938 211
                </a>
                <div className="flex items-start gap-2 text-neutral-400 text-sm">
                  <MapPin className="w-4 h-4 text-neutral-600 shrink-0 mt-0.5" />
                  <span>2 Avenue Colonel Lukusa<br />C/Gombe, Kinshasa</span>
                </div>
              </div>
            </div>

            {/* Social */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 mb-4">Réseaux sociaux</p>
              <div className="flex items-center gap-4">
                <a href="https://www.instagram.com/hag_ink_barber_243/" target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 flex items-center justify-center border border-neutral-800 text-neutral-500 hover:text-white hover:border-neutral-600 transition-all">
                  <IconInstagram className="w-4 h-4" />
                </a>
                <a href="https://snapchat.com/t/sEt19KQ5" target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 flex items-center justify-center border border-neutral-800 text-neutral-500 hover:text-white hover:border-neutral-600 transition-all">
                  <IconSnapchat className="w-4 h-4" />
                </a>
                <a href="https://www.tiktok.com/@hagink2?_r=1&_t=ZS-98PmQyaEMOT" target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 flex items-center justify-center border border-neutral-800 text-neutral-500 hover:text-white hover:border-neutral-600 transition-all">
                  <IconTikTok className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-neutral-900 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-neutral-600 text-xs text-center sm:text-left">
              © {new Date().getFullYear()} Hag & Ink. Tous droits réservés.
            </p>
            <p className="text-neutral-600 text-xs text-center sm:text-right">
              Développé par{" "}
              <a href="https://www.robust-code.com" target="_blank" rel="noopener noreferrer"
                className="text-neutral-400 hover:text-white transition-colors underline underline-offset-2">
                ROBUST CODE S.a.r.l
              </a>
            </p>
          </div>
        </div>
      </footer>

      <BookingSlideOver isOpen={bookingOpen} onClose={() => setBookingOpen(false)} />

      <SlideOver isOpen={selectedPlan !== null} onClose={() => setSelectedPlan(null)} title="Finaliser votre membership">
        {selectedPlan && <form onSubmit={startCheckout} className="space-y-5">
          <div className="border border-neutral-800 bg-neutral-900 p-4"><p className="text-xs uppercase tracking-widest text-neutral-500">Formule choisie</p><p className="mt-1 text-lg font-bold text-white">{selectedPlan.name} — {selectedPlan.price}$</p></div>
          <p className="text-sm text-neutral-400">Vos informations créent votre profil client Hag & Ink. Le paiement par carte est ensuite traité exclusivement par Stripe.</p>
          {[['firstName', 'Prénom', 'text'], ['lastName', 'Nom', 'text'], ['phone', 'Téléphone', 'tel'], ['email', 'E-mail (facultatif)', 'email']].map(([field, label, type]) => <label key={field} className="block text-sm text-neutral-300">{label}<input required={field !== 'email'} type={type} value={form[field as keyof typeof form]} onChange={(event) => setForm({ ...form, [field]: event.target.value })} className="mt-2 w-full border border-neutral-700 bg-black px-3 py-3 text-white outline-none focus:border-white" /></label>)}
          {checkoutError && <p role="alert" className="text-sm text-red-400">{checkoutError}</p>}
          <button disabled={isSubmitting} type="submit" className="w-full bg-white px-4 py-4 font-bold uppercase tracking-wider text-black disabled:opacity-60">{isSubmitting ? 'Redirection sécurisée…' : `Payer ${selectedPlan.price}$ avec Stripe`}</button>
        </form>}
      </SlideOver>
    </main>
  );
}
