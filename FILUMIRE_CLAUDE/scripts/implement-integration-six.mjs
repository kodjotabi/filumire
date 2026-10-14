import fs from 'node:fs';
import path from 'node:path';
const learner = process.cwd();
const website = 'C:/Users/tabi/Desktop/filumire/FILUMIRE_WEBSITE';
function write(root, file, content) { fs.writeFileSync(path.join(root, file), content, 'utf8'); }
function edit(root, file, from, to) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  if (!source.includes(from)) throw new Error(`Expected source missing: ${file}`);
  write(root, file, source.replace(from, to));
}
// Extract the three coloured paths from the existing approved artwork.
const original = fs.readFileSync(path.join(learner, 'apps/learner/public/filumire-logo-blue.svg'), 'utf8');
const shapes = [...original.matchAll(/<path class="fil([123])"[^>]*\/>/g)].map(match => match[0]);
if (shapes.length !== 3) throw new Error('Unexpected original F artwork');
const mark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="85 65 165 200"><style>.fil1{fill:#FEA102}.fil2{fill:#028A39}.fil3{fill:#014CDB}</style>${shapes.join('')}</svg>\n`;
write(learner, 'apps/learner/public/filumire-f.svg', mark);
write(website, 'public/brand/filumire-f.svg', mark);
edit(learner, 'apps/learner/app/learner-interface.css', '`n.filumirePublicHome', '\n.filumirePublicHome');
let css = fs.readFileSync(path.join(learner, 'apps/learner/app/learner-interface.css'), 'utf8');
write(learner, 'apps/learner/app/learner-interface.css', css.replaceAll('`n.filumirePublicHome', '\n.filumirePublicHome'));
write(website, 'src/lib/learner-navigation.ts', `import { approvedPortalUrl } from './destinations';
import type { Locale } from './locale';
/** One educational identity authority. Approval remains an explicit environment gate. */
export function learnerDestination(entry: 'start' | 'login' | 'parent' | 'register' | 'teacher', locale: Locale): string | null {
 const base = approvedPortalUrl(process.env.NEXT_PUBLIC_FILUMIRE_LEARNER_APP_URL, process.env.NEXT_PUBLIC_FILUMIRE_LEARNER_PUBLIC_APPROVED);
 if (!base) return null;
 const url = new URL(base);
 url.pathname = { start: '/', login: '/login', parent: '/family', register: '/register', teacher: '/teacher' }[entry];
 url.search = ''; url.hash = ''; url.searchParams.set('lang', locale);
 if (entry === 'parent') { url.pathname = '/login'; url.searchParams.set('returnTo', 'family'); }
 return url.href;
}
`);
write(website, 'src/components/AccessLink.tsx', `import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { localizeHref, type Locale } from '@/lib/locale';
import { learnerDestination } from '@/lib/learner-navigation';
export function AccessLink({role,children,className,style,locale='en'}:{role:'learner'|'parent'|'teacher';children:ReactNode;className?:string;style?:CSSProperties;locale?:Locale}) {
 const url=learnerDestination(role === 'learner' ? 'start' : role, locale);
 return url ? <a href={url} className={className} style={style}>{children}</a> : <Link href={localizeHref('/access#'+role,locale)} className={className} style={style}>{children}</Link>;
}
`);
edit(website, 'src/components/layout/Navbar.tsx', 'import { FILUMIRE_CONFIG }', 'import { learnerDestination } from "@/lib/learner-navigation";\nimport { AccessLink } from "@/components/AccessLink";\nimport { FILUMIRE_CONFIG }');
edit(website, 'src/components/layout/Navbar.tsx', '<img src="/brand/filumire-logo-blue.svg"', '<img src="/brand/filumire-f.svg" alt="" width="28" height="28" style={{background:"white", borderRadius:"50%", padding:8, width:44, height:44, flexShrink:0}} /><img src="/brand/filumire-logo-blue.svg"');
edit(website, 'src/components/layout/Navbar.tsx', '<Link href="/access#learner" className="btn btn-primary" onClick={closeMenu}>Learner Access &rarr;</Link>', `<AccessLink role="learner" locale={locale} className="btn btn-primary">{french ? "Commencer à apprendre" : "Start Learning"}</AccessLink>
                <a href={learnerDestination('login',locale) ?? localizeHref('/access#learner',locale)} className="btn btn-outline">{french ? "Se connecter" : "Log In"}</a>
                <Link href="/pricing" className="btn btn-outline">{french ? "Abonnements" : "Subscribe"}</Link>`);
edit(website, 'src/components/layout/Navbar.tsx', '<Link href="/access#learner" className="btn btn-primary btn-sm" onClick={closeMenu}>Learner Access</Link>', `<AccessLink role="learner" locale={locale} className="btn btn-primary btn-sm">{french ? "Apprendre" : "Start Learning"}</AccessLink>
            <a href={learnerDestination('login',locale) ?? localizeHref('/access#learner',locale)} className="btn btn-outline btn-sm">{french ? "Connexion" : "Log In"}</a>`);
// Preserve the legacy billing implementation and its records without presenting
// its separate email identity as an educational sign-in.
const accountFile = 'src/components/subscriptions/ParentAccount.tsx';
const prior = fs.readFileSync(path.join(website, accountFile), 'utf8');
if (fs.existsSync(path.join(website, 'src/components/subscriptions/LegacyParentAccount.tsx'))) throw new Error('Legacy preservation already exists; inspect rather than overwrite');
write(website, 'src/components/subscriptions/LegacyParentAccount.tsx', prior.replace('export function ParentAccount(', 'export function LegacyParentAccount('));
write(website, accountFile, `import Link from 'next/link';
import { localizeHref, type Locale } from '@/lib/locale';
import { learnerDestination } from '@/lib/learner-navigation';
import styles from './subscriptions.module.css';
export function ParentAccount({locale}:{locale:Locale}) {
 const fr=locale==='fr';
 const login=learnerDestination('parent',locale), register=learnerDestination('register',locale);
 return <section className={\`site-section \${styles.accountSection}\`}><div className="site-container">
  <h1 className="section-title">{fr ? 'Compte parent et abonnements' : 'Parent Account and Subscriptions'}</h1>
  <p>{fr ? 'Votre compte famille FILUMIRE gère les apprenants et leurs progrès. Utilisez votre compte parent ou tuteur existant.' : 'Your FILUMIRE family account manages learners and their progress. Use your existing parent or guardian account.'}</p>
  {login ? <><a href={login} className="btn btn-primary">{fr ? 'Connexion parent' : 'Parent sign-in'}</a>{' '}<a href={register!} className="btn btn-outline">{fr ? 'Créer un compte famille' : 'Create a family account'}</a></> : <p role="status">{fr ? 'La connexion à la plateforme est en cours de préparation. Aucun nouveau compte de facturation ne sera créé ici.' : 'The learning-platform connection is being prepared. No separate billing account will be created here.'}</p>}
  <h2>{fr ? 'État des abonnements' : 'Subscription status'}</h2>
  <p className={styles.notice}>{fr ? 'Les paiements et la liaison des abonnements aux accès apprenants ne sont pas opérationnels. Aucun paiement, essai ou abonnement ne peut être activé depuis cette page. Paystack reste en mode test.' : 'Payments and subscription access are not operational. This page cannot activate a payment, trial or subscription. Paystack remains in test mode.'}</p>
  <p>{fr ? 'Les anciens comptes et dossiers de facturation sont conservés. Ils ne se connectent pas automatiquement au compte éducatif.' : 'Existing billing accounts and records are preserved. They are not automatically linked to educational accounts.'}</p>
  <Link className="btn btn-outline" href={localizeHref('/pricing',locale)}>{fr ? 'Voir les informations tarifaires' : 'View pricing information'}</Link>
 </div></section>;
}
`);
edit(website, 'src/components/subscriptions/Pricing.tsx', '<div className={styles.grid}>', `<p role="status" className={styles.notice}>{locale === 'fr' ? 'Informations tarifaires provisoires. Paiements et accès par abonnement non opérationnels ; aucun abonnement ni essai ne peut être activé.' : 'Provisional pricing information. Payments and subscription access are not operational; no subscription or trial can be activated.'}</p><div className={styles.grid}>`);
console.log('Updated current local navigation and account entry; preserved legacy billing source.');
