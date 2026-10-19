import { approvedPortalUrl } from './destinations';
import type { Locale } from './locale';
/** One educational identity authority. Approval remains an explicit environment gate. */
export function learnerDestination(entry: 'start' | 'login' | 'parent' | 'register' | 'teacher', locale: Locale): string | null {
 const base = approvedPortalUrl(process.env.NEXT_PUBLIC_FILUMIRE_LEARNER_APP_URL, process.env.NEXT_PUBLIC_FILUMIRE_LEARNER_PUBLIC_APPROVED);
 if (!base) return null;
 const url = new URL(base);
 // A public navigation control must never publish a protected or ephemeral
 // Vercel hostname, even if the approval flag was set accidentally.
 const hostname = url.hostname.replace(/\.$/, '');
 if (hostname === 'vercel.app' || hostname.endsWith('.vercel.app') || hostname === 'now.sh' || hostname.endsWith('.now.sh')) return null;
 url.pathname = { start: '/', login: '/login', parent: '/family', register: '/register', teacher: '/teacher' }[entry];
 url.search = ''; url.hash = ''; url.searchParams.set('lang', locale);
 if (entry === 'parent') { url.pathname = '/login'; url.searchParams.set('returnTo', 'family'); }
 return url.href;
}
