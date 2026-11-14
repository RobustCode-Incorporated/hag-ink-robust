import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/config/salon';
import { routing } from '@/i18n/routing';

export default function sitemap(): MetadataRoute.Sitemap {
  return ['', '/reserver'].flatMap((path) =>
    routing.locales.map((l) => ({ url: `${SITE_URL}${l === 'fr' ? '' : `/${l}`}${path}`, changeFrequency: 'weekly' as const, priority: path ? 0.8 : 1 })),
  );
}
