import { defineRouting } from 'next-intl/routing';

// Public site only. French stays unprefixed; /es, /nl, /en are prefixed.
// Management (/gestion) is outside the locale tree.
export const routing = defineRouting({
  locales: ['fr', 'es', 'nl', 'en'],
  defaultLocale: 'fr',
  localePrefix: 'as-needed',
  localeCookie: { secure: true },
});

export type AppLocale = (typeof routing.locales)[number];
