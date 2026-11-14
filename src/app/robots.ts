import type { MetadataRoute } from 'next';
import { SALON, SITE_URL } from '@/config/salon';

export default function robots(): MetadataRoute.Robots {
  if (SALON.noIndex) return { rules: [{ userAgent: '*', disallow: '/' }] };
  return { rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/gestion', '/rdv/', '/*/rdv/'] }], sitemap: `${SITE_URL}/sitemap.xml` };
}
