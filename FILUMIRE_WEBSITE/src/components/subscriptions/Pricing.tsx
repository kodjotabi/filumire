import Link from 'next/link';
import { localizeHref, type Locale } from '@/lib/locale';
import { PLANS } from '@/lib/subscriptions/plans';
import { SUBSCRIPTION_COPY } from '@/lib/subscriptions/copy';
import styles from './subscriptions.module.css';
export function Pricing({ locale }: {
    locale: Locale;
}) {
    const t = SUBSCRIPTION_COPY[locale];
    return <section className="site-section"><div className="site-container">
    <p className={styles.notice}>{t.preview}</p><h1 className="section-title">{t.title}</h1><p className="section-subtitle">{t.intro}</p>
    <p role="status" className={styles.notice}>{locale === 'fr' ? 'Informations tarifaires provisoires. Paiements et accès par abonnement non opérationnels ; aucun abonnement ni essai ne peut être activé.' : 'Provisional pricing information. Payments and subscription access are not operational; no subscription or trial can be activated.'}</p><div className={styles.grid}><article className="audience-card"><h2>{t.trial}</h2><p className={styles.price}>{t.trialPrice}</p><p>{t.trialText}</p><Link className="btn btn-primary" href={localizeHref('/account', locale)}>{t.accountLink}</Link></article>
    {Object.values(PLANS).map(plan => <article className="audience-card" key={plan.id}><h2>{t[plan.id]}</h2><p className={styles.price}>{'GH₵' + plan.amount / 100}<small>{t.monthly}</small></p><p>{plan.id === 'individual' ? t.individualText : t.familyText}</p><p>{t.manual}</p><Link className="btn btn-primary" href={localizeHref('/account/subscription', locale)}>{t.manageLink}</Link></article>)}</div>
    <article className="info-panel"><h2>{t.school}</h2><p>{t.schoolText}</p><Link className="btn btn-outline" href={localizeHref('/contact?inquiry=school-pilot', locale)}>{t.schoolLink}</Link></article>
    <article className="info-panel"><h2>{t.termsTitle}</h2><p>{t.termsText}</p></article>
    </div></section>;
}
