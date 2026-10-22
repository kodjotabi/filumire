import Link from 'next/link';
import { localizeHref, type Locale } from '@/lib/locale';
import { learnerDestination } from '@/lib/learner-navigation';
import styles from './subscriptions.module.css';
export function ParentAccount({locale}:{locale:Locale}) {
 const fr=locale==='fr';
 const login=learnerDestination('parent',locale), register=learnerDestination('register',locale);
 return <section className={`site-section ${styles.accountSection}`}><div className="site-container">
  <h1 className="section-title">{fr ? 'Compte parent et abonnements' : 'Parent Account and Subscriptions'}</h1>
  <p>{fr ? 'Votre compte famille FILUMIRE gère les apprenants et leurs progrès. Utilisez votre compte parent ou tuteur existant.' : 'Your FILUMIRE family account manages learners and their progress. Use your existing parent or guardian account.'}</p>
  {login ? <><a href={login} className="btn btn-primary">{fr ? 'Connexion parent' : 'Parent sign-in'}</a>{' '}<a href={register!} className="btn btn-outline">{fr ? 'Créer un compte famille' : 'Create a family account'}</a></> : <p role="status">{fr ? 'La connexion à la plateforme est en cours de préparation. Aucun nouveau compte de facturation ne sera créé ici.' : 'The learning-platform connection is being prepared. No separate billing account will be created here.'}</p>}
  <h2>{fr ? 'État des abonnements' : 'Subscription status'}</h2>
  <p className={styles.notice}>{fr ? 'Les paiements et la liaison des abonnements aux accès apprenants ne sont pas opérationnels. Aucun paiement, essai ou abonnement ne peut être activé depuis cette page. Paystack reste en mode test.' : 'Payments and subscription access are not operational. This page cannot activate a payment, trial or subscription. Paystack remains in test mode.'}</p>
  <p>{fr ? 'Les anciens comptes et dossiers de facturation sont conservés. Ils ne se connectent pas automatiquement au compte éducatif.' : 'Existing billing accounts and records are preserved. They are not automatically linked to educational accounts.'}</p>
  <Link className="btn btn-outline" href={localizeHref('/pricing',locale)}>{fr ? 'Voir les informations tarifaires' : 'View pricing information'}</Link>
 </div></section>;
}
