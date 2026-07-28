"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, Scissors, Zap, ChevronLeft, ChevronRight, Send } from "lucide-react";

const WHATSAPP_NUMBER = "243841938211";

type Service = "coiffure" | "tatoo" | null;

function buildWhatsAppUrl(name: string, phone: string, date: string, service: Service): string {
  const serviceLabel = service === "coiffure" ? "Prestation Coiffure" : "Prestation Tatoo";
  const formattedDate = new Date(date + "T12:00:00").toLocaleDateString("fr-FR", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const message =
    `Bonjour, je souhaite réserver un créneau chez Hag & Ink.\n\n` +
    `👤 Nom : ${name}\n` +
    `📞 Téléphone : ${phone}\n` +
    `📅 Date souhaitée : ${formattedDate}\n` +
    `✂️ Service : ${serviceLabel}\n\n` +
    `Merci de confirmer ma réservation.`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

// --- Mini Calendar ---
const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MONTHS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  // 0=Sun..6=Sat → convert to Mon-first: (day + 6) % 7
  return (new Date(year, month, 1).getDay() + 6) % 7;
}

function MiniCalendar({ selected, onSelect }: { selected: string; onSelect: (d: string) => void }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const todayStr = today.toISOString().slice(0, 10);

  const prev = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const next = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button type="button" onClick={prev} className="p-1.5 hover:bg-neutral-800 rounded-full transition-colors">
          <ChevronLeft className="w-4 h-4 text-neutral-400" />
        </button>
        <span className="text-sm font-bold text-white uppercase tracking-widest">
          {MONTHS[viewMonth]} {viewYear}
        </span>
        <button type="button" onClick={next} className="p-1.5 hover:bg-neutral-800 rounded-full transition-colors">
          <ChevronRight className="w-4 h-4 text-neutral-400" />
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 mb-2">
        {DAYS.map(d => (
          <div key={d} className="text-center text-[10px] font-bold text-neutral-600 uppercase">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isPast = dateStr < todayStr;
          const isSelected = dateStr === selected;
          const isToday = dateStr === todayStr;

          return (
            <button
              key={i}
              type="button"
              disabled={isPast}
              onClick={() => onSelect(dateStr)}
              className={`
                aspect-square flex items-center justify-center text-xs rounded-sm font-medium transition-all
                ${isPast ? "text-neutral-800 cursor-not-allowed" : "hover:bg-neutral-800 cursor-pointer"}
                ${isSelected ? "bg-white text-black font-bold" : ""}
                ${isToday && !isSelected ? "border border-neutral-600 text-white" : ""}
                ${!isSelected && !isToday && !isPast ? "text-neutral-300" : ""}
              `}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// --- Main component ---
export default function BookingSlideOver({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState("");
  const [service, setService] = useState<Service>(null);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !date || !service) {
      setError("Veuillez remplir tous les champs et choisir un service.");
      return;
    }
    setError("");
    const url = buildWhatsAppUrl(name.trim(), phone.trim(), date, service);
    window.open(url, "_blank");
    // Reset form
    setName(""); setPhone(""); setDate(""); setService(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50"
          />
          <motion.div
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full md:w-[480px] bg-[#050505] border-l border-neutral-800 z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex justify-between items-center px-8 py-6 border-b border-neutral-900">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-neutral-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-widest">Réserver un créneau</h2>
              </div>
              <button onClick={onClose} type="button" className="p-2 hover:bg-neutral-900 rounded-full transition-colors">
                <X className="w-5 h-5 text-neutral-400" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-8 py-6 space-y-8">

              {/* Infos client */}
              <div className="space-y-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Vos informations</p>
                <label className="block">
                  <span className="text-xs text-neutral-400 mb-1.5 block">Nom complet</span>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Jean Dupont"
                    className="w-full bg-black border border-neutral-800 text-white text-sm px-4 py-3 outline-none focus:border-neutral-600 placeholder-neutral-700"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-neutral-400 mb-1.5 block">Numéro de téléphone</span>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+1 514 000 0000"
                    className="w-full bg-black border border-neutral-800 text-white text-sm px-4 py-3 outline-none focus:border-neutral-600 placeholder-neutral-700"
                  />
                </label>
              </div>

              {/* Calendrier */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-4">
                  Choisir une date
                  {date && (
                    <span className="ml-2 text-white normal-case font-normal">
                      — {new Date(date + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                    </span>
                  )}
                </p>
                <div className="bg-black border border-neutral-800 p-4">
                  <MiniCalendar selected={date} onSelect={setDate} />
                </div>
              </div>

              {/* Service */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-4">Type de prestation</p>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { value: "coiffure", label: "Coiffure", icon: Scissors, desc: "Coupe, barbe, braids, locks…" },
                    { value: "tatoo", label: "Tatoo", icon: Zap, desc: "Tatouage & art corporel" },
                  ] as const).map(({ value, label, icon: Icon, desc }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setService(value)}
                      className={`
                        flex flex-col items-start p-5 border transition-all text-left
                        ${service === value
                          ? "border-white bg-white/5 text-white"
                          : "border-neutral-800 bg-black hover:border-neutral-600 text-neutral-400"
                        }
                      `}
                    >
                      <Icon className={`w-5 h-5 mb-3 ${service === value ? "text-white" : "text-neutral-600"}`} />
                      <span className="text-sm font-bold uppercase tracking-wide">{label}</span>
                      <span className="text-xs text-neutral-500 mt-1">{desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}
            </form>

            {/* Footer CTA */}
            <div className="px-8 py-6 border-t border-neutral-900">
              <button
                onClick={handleSubmit}
                type="button"
                className="w-full flex items-center justify-center gap-3 py-4 bg-white text-black font-bold uppercase text-sm tracking-wider hover:bg-neutral-200 transition-colors"
              >
                <Send className="w-4 h-4" />
                Envoyer la demande via WhatsApp
              </button>
              <p className="text-center text-[10px] text-neutral-600 mt-3">
                Vous serez redirigé vers WhatsApp avec vos informations pré-remplies.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
