"use client";

import { motion } from "framer-motion";
import { 
  Calendar, Star, Scissors, Check, 
  Trophy, Medal, Award, Camera, 
  ShoppingBag, Ticket, Sparkles, Coffee, Gift
} from "lucide-react";
import Image from "next/image";
import { Black_Ops_One } from "next/font/google";
import { FormEvent, useState } from "react";
import SlideOver from "@/components/SlideOver";

const blackOpsOne = Black_Ops_One({ weight: '400', subsets: ['latin'] });

export default function ClientPage() {
  const [selectedPlan, setSelectedPlan] = useState<{ code: string; name: string; price: number } | null>(null);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  
  // Ajout de "paymentType" pour correspondre aux spécifications FlexPay (1 = Mobile Money, 2 = Carte Bancaire)
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', email: '', paymentType: '1' });
  const [bookingForm, setBookingForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    serviceType: 'COIFFURE',
    date: '',
    time: '',
    notes: '',
  });
  
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutSuccess, setCheckoutSuccess] = useState<string | null>(null); // Nouvel état pour le message de push Mobile Money
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBookingSubmitting, setIsBookingSubmitting] = useState(false);
  
  const memberships = [
    { code: "STANDARD_ENFANT", name: "Standard Enfant", target: "Enfants", value: 50, price: 49, desc: "Jusqu’à 5 coiffures (minimum conseillé : 3)", perks: ["Flexibilité totale", "Accès à la loterie"] },
    { code: "STANDARD_ADULTE", name: "Standard Adulte", target: "Hommes / Femmes", value: 100, price: 89, desc: "Jusqu’à 5 coiffures (minimum conseillé : 3)", perks: ["11$ d'économie", "Accès VIP au programme fidélité"] },
    { code: "BRAIDS_A", name: "Braids A", target: "Tresses classiques", value: 100, price: 89, desc: "Jusqu’à 5 prestations", perks: ["11$ d'économie"] },
    { code: "BRAIDS_B", name: "Braids B", target: "Braids Premium", value: 200, price: 189, desc: "Jusqu’à 5 prestations", perks: ["11$ d'économie"] },
    { code: "LOCKS_A", name: "Locks A", target: "Entretien Locks", value: 225, price: 209, desc: "Jusqu’à 5 prestations", perks: ["Prix préférentiel", "Priorité de réservation"] },
    { code: "LOCKS_B", name: "Locks B", target: "Locks Premium", value: 350, price: 329, desc: "Jusqu’à 5 prestations", perks: ["Économie majeure", "Service ultra-prioritaire"] },
  ];

  const INTL_PHONE_RE = /^\+\d{7,15}$/;

  const startCheckout = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedPlan) return;
    
    setCheckoutError(null); 
    setCheckoutSuccess(null);

    if (!INTL_PHONE_RE.test(form.phone.trim())) {
      setCheckoutError('Le numéro doit commencer par le code pays, ex : +243841938211');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Ton backend devra communiquer avec l'API FlexPay de façon sécurisée (avec le Token Bearer)
      const response = await fetch('/api/payments/flexpay', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          ...form, 
          amount: selectedPlan.price,
          planName: selectedPlan.code 
        }) 
      });
      
      const data: { url?: string; message?: string; error?: string } = await response.json();
      
      if (!response.ok) throw new Error(data.error ?? 'Impossible de préparer le paiement via FlexPay.');
      
      // FlexPay Card V2 : Redirection vers l'URL de paiement
      if (form.paymentType === '2' && data.url) {
        window.location.assign(data.url);
      } 
      // FlexPay Mobile Money : Affichage du message pour valider le push USSD
      else if (form.paymentType === '1' && data.message) {
        setCheckoutSuccess(data.message);
      } else {
        throw new Error('Réponse invalide du serveur de paiement.');
      }
    } catch (error) { 
      setCheckoutError(error instanceof Error ? error.message : 'Une erreur est survenue.'); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  const submitBooking = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBookingError(null);
    setBookingSuccess(null);

    if (!INTL_PHONE_RE.test(bookingForm.phone.trim())) {
      setBookingError('Le numéro doit commencer par le code pays, ex : +243841938211');
      return;
    }

    setIsBookingSubmitting(true);

    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingForm),
      });
      const data: { whatsappUrl?: string; error?: string; message?: string } = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Impossible de créer la réservation.');

      setBookingSuccess(data.message ?? 'Réservation enregistrée. Redirection vers WhatsApp...');
      if (data.whatsappUrl) {
        window.location.assign(data.whatsappUrl);
      }
    } catch (error) {
      setBookingError(error instanceof Error ? error.message : 'Une erreur est survenue.');
    } finally {
      setIsBookingSubmitting(false);
    }
  };

  const minorPrizes = [
    { icon: Camera, text: "4e : Séance photo professionnelle" },
    { icon: Scissors, text: "5e : Pack Barber VIP (Coiffure, barbe, soin)" },
    { icon: ShoppingBag, text: "6e : Bon d’achat boutique partenaire" },
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

        <div className="relative z-10 flex flex-col items-center text-center px-4 max-w-5xl mx-auto mt-20">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-neutral-700/50 bg-black/50 backdrop-blur-md mb-8"
          >
            <Star className="w-4 h-4 text-neutral-400" />
            <span className="text-sm font-medium tracking-widest uppercase text-neutral-300">Premium Barber & Tattoo</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <h1 className={`${blackOpsOne.className} text-6xl md:text-8xl tracking-widest text-white mb-4 drop-shadow-2xl`}>
              HAG <span className="text-neutral-500">&</span> INK
            </h1>
            <p className="text-lg md:text-xl text-neutral-400 font-light max-w-2xl mx-auto mb-10">
              L&apos;élégance du détail. L&apos;art dans la peau. Bienvenue dans l&apos;élite du lifestyle urbain.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
          >
            <button type="button" onClick={() => setIsBookingOpen(true)} className="px-8 py-4 bg-white text-black font-bold uppercase tracking-wider rounded-sm transition-all hover:bg-neutral-200 flex items-center justify-center gap-2">
              <Calendar className="w-5 h-5" />
              Réserver un créneau
            </button>
            <button type="button" onClick={() => document.getElementById('memberships')?.scrollIntoView({ behavior: 'smooth' })} className="px-8 py-4 bg-transparent text-white font-bold uppercase tracking-wider border border-neutral-700 rounded-sm transition-all hover:border-white hover:bg-white/5 flex items-center justify-center gap-2">
              <Scissors className="w-5 h-5" />
              Voir les Memberships
            </button>
          </motion.div>
        </div>
      </section>

      {/* --- SECTION MEMBERSHIPS --- */}
      <section id="memberships" className="py-24 px-4 relative border-t border-neutral-900 overflow-hidden">
        
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
          
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tight text-white mb-4">
              Packs <span className="text-neutral-500">Exclusifs</span>
            </h2>
            <p className="text-neutral-400 text-lg">Rejoins le cercle restreint. Économise sur tes coupes et participe à la loterie VIP.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {memberships.map((plan, index) => (
              <motion.div 
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group relative p-8 bg-black/60 backdrop-blur-sm border border-neutral-800 flex flex-col justify-between hover:border-neutral-500 transition-all duration-300"
              >
                <div>
                  <span className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-2 block">{plan.target}</span>
                  <h3 className="text-2xl font-bold text-white uppercase tracking-wide mb-4">{plan.name}</h3>
                  <div className="flex items-end gap-2 mb-6">
                    <span className="text-4xl font-black text-white">{plan.price}$</span>
                    <span className="text-lg text-neutral-600 line-through pb-1">Valeur {plan.value}$</span>
                  </div>
                  <p className="text-neutral-400 text-sm mb-6 pb-6 border-b border-neutral-800">{plan.desc}</p>
                  
                  <ul className="space-y-3 mb-8">
                    {plan.perks.map((perk, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-neutral-300">
                        <Check className="w-5 h-5 text-neutral-500 shrink-0" />
                        <span>{perk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <button type="button" onClick={() => setSelectedPlan(plan)} className="w-full py-4 bg-neutral-900 border border-neutral-700 text-white font-bold uppercase text-sm tracking-wider hover:bg-white hover:text-black transition-colors">
                  Sélectionner
                </button>
              </motion.div>
            ))}
          </div>

          <motion.div 
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             className="mt-6 w-full p-8 md:p-12 bg-black/80 backdrop-blur-md border border-neutral-700 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden"
          >
             <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20"></div>

             <div className="relative z-10 w-full md:w-2/3">
                <span className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-2 block">Artistes, Influenceurs, Créateurs</span>
                <h3 className="text-3xl md:text-4xl font-black text-white uppercase tracking-wide mb-4 flex items-center gap-3">
                  Limited Edition <Star className="w-6 h-6 text-yellow-500 fill-yellow-500/20" />
                </h3>
                 <p className="text-neutral-400 text-lg">Coiffures illimitées dans la limite de 5 visites. Avantages exclusifs et 2 tickets d&apos;office pour la grande loterie.</p>
             </div>
             
             <div className="relative z-10 flex flex-col items-start md:items-end shrink-0 w-full md:w-auto">
                <div className="flex items-end gap-2 mb-4">
                  <span className="text-5xl font-black text-white">229$</span>
                  <span className="text-xl text-neutral-600 line-through pb-1">≈250$</span>
                </div>
                <button type="button" onClick={() => setSelectedPlan({ code: 'LIMITED_EDITION', name: 'Limited Edition', price: 229 })} className="w-full md:w-auto px-10 py-4 bg-white text-black font-bold uppercase text-sm tracking-wider hover:bg-neutral-200 transition-colors">
                  Devenir VIP
                </button>
             </div>
          </motion.div>

        </div>
      </section>

      {/* --- SECTION LOTERIE VIP --- */}
      <section className="py-32 px-4 bg-[#020202] border-t border-neutral-900 relative">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-20">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-neutral-800 bg-black mb-6"
            >
              <Star className="w-4 h-4 text-neutral-500" />
              <span className="text-xs font-bold tracking-[0.2em] uppercase text-neutral-400">Programme de Fidélité</span>
            </motion.div>
            <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tight text-white mb-6">
              Grande Loterie VIP
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {[
              { icon: Trophy, rank: "1er Prix", title: "Journée Spa", desc: "Soins complets pour 2 personnes." },
              { icon: Medal, rank: "2e Prix", title: "Dîner Gastronomique", desc: "Menu dégustation, transport inclus." },
              { icon: Award, rank: "3e Prix", title: "Brunch de Luxe", desc: "Service premium, cadre privilégié." },
            ].map((prize, i) => {
              const Icon = prize.icon;
              return (
                <motion.div
                  key={i}
                  className="p-8 bg-[#0a0a0a] border border-neutral-800 flex flex-col items-start hover:border-neutral-600 transition-colors"
                >
                  <div className="w-10 h-10 mb-6 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-neutral-600" />
                  </div>
                  <h3 className="text-[10px] font-bold tracking-widest text-neutral-500 uppercase mb-2">{prize.rank}</h3>
                  <h4 className="text-lg font-bold uppercase text-white mb-4">{prize.title}</h4>
                  <p className="text-neutral-500 text-sm">{prize.desc}</p>
                </motion.div>
              );
            })}
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto"
          >
            {minorPrizes.slice(0, 6).map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="flex items-center gap-4 p-5 bg-[#0a0a0a] border border-neutral-800">
                  <div className="p-2">
                    <Icon className="w-4 h-4 text-neutral-600" />
                  </div>
                  <span className="text-neutral-400 font-medium text-sm">{item.text}</span>
                </div>
              );
            })}
            <div className="flex items-center gap-4 p-5 bg-[#0a0a0a] border border-neutral-800 md:col-span-2 md:justify-center">
              <div className="p-2">
                <Gift className="w-4 h-4 text-neutral-600" />
              </div>
              <span className="text-neutral-400 font-medium text-sm">10e : Un mois de Membership offert</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* --- MODAL RESERVATION --- */}
      <SlideOver isOpen={isBookingOpen} onClose={() => setIsBookingOpen(false)} title="Réserver une séance">
        <form onSubmit={submitBooking} className="space-y-5">
          <p className="text-sm text-neutral-400">
            Choisis une date, une heure et le type de séance. Après validation, tu es redirigé vers WhatsApp du salon avec toutes les informations pré-remplies.
          </p>

          {[['firstName', 'Prénom'], ['lastName', 'Nom']].map(([field, label]) => (
            <label key={field} className="block text-sm text-neutral-300">
              {label}
              <input
                required
                type="text"
                value={bookingForm[field as 'firstName' | 'lastName']}
                onChange={(event) => setBookingForm({ ...bookingForm, [field]: event.target.value })}
                className="mt-2 w-full border border-neutral-700 bg-black px-3 py-3 text-white outline-none focus:border-white"
              />
            </label>
          ))}

          <label className="block text-sm text-neutral-300">
            Téléphone
            <input
              required
              type="tel"
              placeholder="+243841938211"
              value={bookingForm.phone}
              onChange={(event) => setBookingForm({ ...bookingForm, phone: event.target.value })}
              className="mt-2 w-full border border-neutral-700 bg-black px-3 py-3 text-white outline-none focus:border-white"
            />
            <span className="text-xs text-neutral-500 mt-1 block">Commencez par le code pays, ex&nbsp;: +243841938211</span>
          </label>

          <label className="block text-sm text-neutral-300">
            Type de séance
            <select
              value={bookingForm.serviceType}
              onChange={(event) => setBookingForm({ ...bookingForm, serviceType: event.target.value })}
              className="mt-2 w-full border border-neutral-700 bg-black px-3 py-3 text-white outline-none focus:border-white"
            >
              <option value="COIFFURE">Coiffure</option>
              <option value="TATOUAGE">Tatouage</option>
            </select>
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block text-sm text-neutral-300">
              Date
              <input
                required
                type="date"
                value={bookingForm.date}
                onChange={(event) => setBookingForm({ ...bookingForm, date: event.target.value })}
                className="mt-2 w-full border border-neutral-700 bg-black px-3 py-3 text-white outline-none focus:border-white"
              />
            </label>
            <label className="block text-sm text-neutral-300">
              Heure
              <input
                required
                type="time"
                value={bookingForm.time}
                onChange={(event) => setBookingForm({ ...bookingForm, time: event.target.value })}
                className="mt-2 w-full border border-neutral-700 bg-black px-3 py-3 text-white outline-none focus:border-white"
              />
            </label>
          </div>

          <label className="block text-sm text-neutral-300">
            Notes (facultatif)
            <textarea
              rows={3}
              value={bookingForm.notes}
              onChange={(event) => setBookingForm({ ...bookingForm, notes: event.target.value })}
              className="mt-2 w-full border border-neutral-700 bg-black px-3 py-3 text-white outline-none focus:border-white"
              placeholder="Style souhaité, référence, contraintes horaires..."
            />
          </label>

          {bookingError && <p role="alert" className="text-sm text-red-400">{bookingError}</p>}
          {bookingSuccess && <p className="text-sm text-emerald-400">{bookingSuccess}</p>}

          <button disabled={isBookingSubmitting} type="submit" className="w-full bg-white px-4 py-4 font-bold uppercase tracking-wider text-black disabled:opacity-60">
            {isBookingSubmitting ? 'Envoi en cours…' : 'Envoyer la réservation sur WhatsApp'}
          </button>
        </form>
      </SlideOver>

      {/* --- MODAL PAIEMENT FLEXPAY --- */}
      <SlideOver isOpen={selectedPlan !== null} onClose={() => { setSelectedPlan(null); setCheckoutSuccess(null); }}>
        {selectedPlan && <form onSubmit={startCheckout} className="space-y-5">
          <div className="border border-neutral-800 bg-neutral-900 p-4">
            <p className="text-xs uppercase tracking-widest text-neutral-500">Formule choisie</p>
            <p className="mt-1 text-lg font-bold text-white">{selectedPlan.name} — {selectedPlan.price}$</p>
          </div>
          
          <p className="text-sm text-neutral-400">Vos informations créent votre profil client Hag & Ink. Le paiement est traité de manière sécurisée par FlexPay.</p>
          
          {[['firstName', 'Prénom', 'text'], ['lastName', 'Nom', 'text'], ['email', 'E-mail (facultatif)', 'email']].map(([field, label, type]) => (
            <label key={field} className="block text-sm text-neutral-300">
              {label}
              <input required={field !== 'email'} type={type} value={form[field as keyof typeof form]} onChange={(event) => setForm({ ...form, [field]: event.target.value })} className="mt-2 w-full border border-neutral-700 bg-black px-3 py-3 text-white outline-none focus:border-white" />
            </label>
          ))}

          <label className="block text-sm text-neutral-300">
            Téléphone
            <input
              required
              type="tel"
              placeholder="+243841938211"
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
              className="mt-2 w-full border border-neutral-700 bg-black px-3 py-3 text-white outline-none focus:border-white"
            />
            <span className="text-xs text-neutral-500 mt-1 block">Commencez par le code pays, ex&nbsp;: +243841938211 (requis pour Mobile Money)</span>
          </label>

          {/* Sélecteur du mode de paiement FlexPay */}
          <label className="block text-sm text-neutral-300">
            Méthode de paiement
            <select
              value={form.paymentType}
              onChange={(event) => setForm({ ...form, paymentType: event.target.value })}
              className="mt-2 w-full border border-neutral-700 bg-black px-3 py-3 text-white outline-none focus:border-white"
            >
              <option value="1">Mobile Money</option>
              <option value="2">Carte Bancaire (Visa/Mastercard)</option>
            </select>
          </label>

          {checkoutError && <p role="alert" className="text-sm text-red-400">{checkoutError}</p>}
          {checkoutSuccess && <p className="text-sm text-emerald-400 font-medium">{checkoutSuccess}</p>}

          {!checkoutSuccess && (
            <button disabled={isSubmitting} type="submit" className="w-full bg-white px-4 py-4 font-bold uppercase tracking-wider text-black disabled:opacity-60">
              {isSubmitting 
                ? 'Traitement en cours…' 
                : `Payer ${selectedPlan.price}$ avec FlexPay`
              }
            </button>
          )}
        </form>}
      </SlideOver>
          {/* --- FOOTER --- */}
      <footer className="bg-black text-neutral-300 border-t border-neutral-800 mt-20">
        <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Contact & Address */}
          <div>
            <h3 className="text-white font-bold uppercase text-sm tracking-wider mb-4">Hag & Ink Salon</h3>
            <p className="text-sm leading-relaxed mb-4">
              2 Avenue Colonel Lukusa<br />
              C/Gombe<br />
              Kinshasa
            </p>
            <p className="text-sm">
              📞 <a href="tel:+243841938211" className="text-white hover:text-neutral-200 transition">+243 841938211</a>
            </p>
            <p className="text-xs text-neutral-500 mt-2">(Ref: Rond point Forescom)</p>
          </div>

          {/* Social Links */}
          <div>
            <h3 className="text-white font-bold uppercase text-sm tracking-wider mb-4">Suivez-nous</h3>
            <div className="space-y-2">
              <a href="https://snapchat.com/t/sEt19KQ5" target="_blank" rel="noopener noreferrer" className="block text-sm text-neutral-300 hover:text-white transition">
                Snapchat
              </a>
              <a href="https://www.tiktok.com/@hagink2?_r=1&_t=ZS-98PmQyaEMOT" target="_blank" rel="noopener noreferrer" className="block text-sm text-neutral-300 hover:text-white transition">
                TikTok
              </a>
              <a href="https://www.instagram.com/hag_ink_barber_243/" target="_blank" rel="noopener noreferrer" className="block text-sm text-neutral-300 hover:text-white transition">
                Instagram
              </a>
            </div>
          </div>

          {/* Developer Info */}
          <div>
            <h3 className="text-white font-bold uppercase text-sm tracking-wider mb-4">À propos</h3>
            <p className="text-sm leading-relaxed mb-3">
              Site développé par <a href="https://www.robust-code.com" target="_blank" rel="noopener noreferrer" className="text-white hover:text-neutral-200 transition font-semibold">ROBUST CODE S.A.R.L</a>
            </p>
            <p className="text-xs text-neutral-500">
              © Tous droits réservés — ROBUST CODE S.A.R.L
            </p>
          </div>
        </div>
      </footer>

    </main>
  );
}