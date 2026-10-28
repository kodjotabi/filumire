/* Building blocks shared by the public website pages. */
import Link from "next/link";
import type { ReactNode } from "react";
import { localizeHref, type Locale } from "@/lib/locale";
import { ACTIVE_SUBJECTS, REVIEW_SUBJECTS, SUBJECT_COPY } from "@/lib/site";
import { Arrow, Check, Stroke, SubjectIcon } from "./icons";

export type Action = { label: string; href: string; external?: boolean; variant?: "primary" | "secondary" | "light" };

/* Internal links go through the locale; learner-app links are plain anchors in the same tab. */
export function ActionLink({ action, locale }: { action: Action; locale: Locale }) {
  const className = "fs-btn fs-btn-" + (action.variant ?? "primary");
  const body = <>{action.label}<Arrow className="fs-btn-arrow" /></>;
  return action.external
    ? <a href={action.href} className={className}>{body}</a>
    : <Link href={localizeHref(action.href, locale)} className={className}>{body}</Link>;
}

export function Actions({ actions, locale }: { actions: Action[]; locale: Locale }) {
  return <div className="fs-actions">{actions.map((action) => <ActionLink key={action.label} action={action} locale={locale} />)}</div>;
}

export function PageHero({ eyebrow, title, lead, actions, locale, art }: { eyebrow: string; title: string; lead: string; actions?: Action[]; locale: Locale; art?: ReactNode }) {
  return (
    <section className="fs-page-hero">
      <div className="fs-container fs-page-hero-grid">
        <div>
          <p className="fs-eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <Stroke className="fs-stroke" />
          <p className="fs-lead">{lead}</p>
          {actions ? <Actions actions={actions} locale={locale} /> : null}
        </div>
        {art ? <div className="fs-page-hero-art">{art}</div> : null}
      </div>
    </section>
  );
}

export function SectionHead({ eyebrow, title, lead, center }: { eyebrow?: string; title: string; lead?: string; center?: boolean }) {
  return (
    <div className={"fs-section-head" + (center ? " is-center" : "")}>
      {eyebrow ? <p className="fs-eyebrow">{eyebrow}</p> : null}
      <h2>{title}</h2>
      {lead ? <p className="fs-section-lead">{lead}</p> : null}
    </div>
  );
}

export function Section({ children, tone, id, labelledBy }: { children: ReactNode; tone?: "sky" | "white" | "navy"; id?: string; labelledBy?: string }) {
  return (
    <section id={id} aria-labelledby={labelledBy} className={"fs-section fs-section-" + (tone ?? "white")}>
      <div className="fs-container">{children}</div>
    </section>
  );
}

export function FeatureGrid({ items }: { items: { title: string; text: string }[] }) {
  return (
    <ul className="fs-features">
      {items.map((item) => (
        <li key={item.title}>
          <span className="fs-feature-check"><Check /></span>
          <h3>{item.title}</h3>
          <p>{item.text}</p>
        </li>
      ))}
    </ul>
  );
}

export function Steps({ items }: { items: { title: string; text: string }[] }) {
  return (
    <ol className="fs-steps">
      {items.map((item, index) => (
        <li key={item.title}>
          <span className="fs-step-number" aria-hidden="true">{index + 1}</span>
          <h3>{item.title}</h3>
          <p>{item.text}</p>
        </li>
      ))}
    </ol>
  );
}

/* Active subjects as the learner app shows them, then Curriculum Review subjects for the band. */
export function SubjectGrid({ locale, band, reviewHeading }: { locale: Locale; band: "primary" | "jhs"; reviewHeading?: string }) {
  const review = REVIEW_SUBJECTS[band];
  return (
    <div className="fs-subjects">
      <ul className="fs-subject-grid">
        {ACTIVE_SUBJECTS.map((subject) => (
          <li key={subject.key} className={"fs-subject " + subject.key}>
            <span className="fs-subject-icon"><SubjectIcon name={subject.key} /></span>
            <h3>{subject.name[locale]}</h3>
            <p>{subject.summary[locale]}</p>
          </li>
        ))}
      </ul>
      {review.length > 0 && reviewHeading ? (
        <>
          <h3 className="fs-review-heading">{reviewHeading}</h3>
          <ul className="fs-subject-grid fs-review-grid">
            {review.map((subject) => (
              <li key={subject.key} className="fs-subject review">
                <span className="fs-subject-icon"><SubjectIcon name={subject.key} /></span>
                <h4>{subject.name[locale]}</h4>
                <span className="fs-chip">{SUBJECT_COPY[locale].review}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}

export function CtaBand({ title, text, actions, locale }: { title: string; text: string; actions: Action[]; locale: Locale }) {
  return (
    <section className="fs-cta-band">
      <div className="fs-container fs-cta-inner">
        <div>
          <h2>{title}</h2>
          <p>{text}</p>
        </div>
        <Actions actions={actions} locale={locale} />
      </div>
    </section>
  );
}

export function Avatars({ className }: { className?: string }) {
  return (
    <div className={"fs-avatars" + (className ? " " + className : "")} aria-hidden="true">
      {["approved-kofi", "approved-girl", "approved-glasses", "approved-hijab"].map((name) => (
        <img key={name} src={`/avatars/${name}.png`} alt="" width="80" height="84" loading="lazy" decoding="async" />
      ))}
    </div>
  );
}
