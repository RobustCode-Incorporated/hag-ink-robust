// What changed in the salon's system. JOHN reads the notes dated inside the report period or after it
// (up to the day the report is requested) and presents them in the "What's new" scene. One text per language.
// Keep them true and short: they are read aloud. Numbers written here are allowed in the narration.
export type ReleaseNote = { date: string; fr: string; en: string };

export const RELEASE_NOTES: ReleaseNote[] = [
  {
    date: '2026-11-02',
    fr: "Votre nouveau système est prêt : Robust Enterprise Management, édition salon. Agenda, caisse, clients, équipe, salaires, dépenses et produits au même endroit. Les 2 402 prestations depuis novembre 2024 ont été reprises et vérifiées au centime près.",
    en: "Your new system is ready: Robust Enterprise Management, Salon Edition. Agenda, till, clients, team, payroll, expenses and products in one place. All 2,402 services since November 2024 were moved over and checked to the cent.",
  },
  {
    date: '2026-11-02',
    fr: "Vos clients peuvent réserver en ligne à toute heure, en 4 langues, selon vos horaires d'ouverture.",
    en: "Clients can book online at any time, in 4 languages, within your opening hours.",
  },
  {
    date: '2026-11-02',
    fr: "Le nouvel onglet Robust SI vous donne ce rapport vidéo chaque mois, en français ou en anglais, en un clic.",
    en: "The new Robust SI tab gives you this video report every month, in French or English, in one click.",
  },
  {
    date: '2026-11-02',
    fr: "Le programme ambassadeurs est prêt : chaque créateur reçoit un lien personnel et un code promo, la remise est appliquée à la caisse, et ses prestations offertes et ses contenus sont suivis dans son propre portail.",
    en: "The ambassador program is ready: each creator gets a personal link and a promo code, the discount is applied at the till, and free services and content are tracked in their own portal.",
  },
  {
    date: '2026-11-02',
    fr: "La tombola est conservée, visible uniquement par la direction.",
    en: "The tombola is kept, visible to management only.",
  },
];
