import type { Locale } from './locale';
const frenchAssets: Record<string, string> = { '/illustrations/learners-clean.svg': '/illustrations/fr/learners.png', '/illustrations/4 avatar together.png': '/illustrations/fr/avatar-selection.png', '/product-preview/FILUMIRE-Interface-Page-04.png': '/product-preview/fr/FILUMIRE-Interface-Page-04.png' };
export function localizedAsset(src: string, locale: Locale): string { return locale === 'fr' ? (frenchAssets[src] || src) : src; }
