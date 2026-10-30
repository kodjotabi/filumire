/* Public website pages. Copy: src/lib/site-pages.ts; structure: src/lib/site.ts. */
import Link from "next/link";
import { localizeHref, type Locale } from "@/lib/locale";
import { learnerDestination } from "@/lib/learner-navigation";
import { COUNTRIES, SUBJECT_COPY, type CountryId } from "@/lib/site";
import { ABOUT_COPY, GHANA_COPY, HELP_COPY, HOME_COPY, HOW_COPY, LEARNERS_COPY, PARENTS_COPY, SCHOOLS_COPY, SOON_COPY, SUBJECTS_COPY } from "@/lib/site-pages";
import { ContactInquiry } from "@/components/ContactInquiry";
import { Actions, Avatars, CtaBand, FeatureGrid, PageHero, Section, SectionHead, Steps, SubjectGrid, type Action } from "./parts";
import { Arrow, Check, FiluMark, Stroke } from "./icons";
import { Landing } from "./Landing";

/* Learner-app entry points; without an approved app URL they fall back to the sign-in help. */
function app(entry: "start" | "login" | "parent" | "teacher", locale: Locale): Action {
  const url = learnerDestination(entry, locale);
  const anchor = entry === "parent" ? "parent" : entry === "teacher" ? "teacher" : "learner";
  return url ? { label: "", href: url, external: true } : { label: "", href: "/contact#" + anchor };
}
const withLabel = (action: Action, label: string, variant?: Action["variant"]): Action => ({ ...action, label, variant });

/* The learner app's own boy and girl (owner-supplied transparent originals, 28 Oct 2026). */
function Mascot({ which, className }: { which: "boy" | "girl"; className?: string }) {
  return which === "boy"
    ? <img className={className} src="/illustrations/learners/boy-green-book.png" alt="" width="1283" height="1226" decoding="async" />
    : <img className={className} src="/illustrations/learners/girl-purple-book.png" alt="" width="1285" height="1224" decoding="async" />;
}

function AudienceIcon({ kind }: { kind: "learners" | "parents" | "schools" }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {kind === "learners" && <path d="M12 3l10 5-10 5L2 8zM6 10.5v4.6c0 1.6 2.7 3.4 6 3.4s6-1.8 6-3.4v-4.6l-6 3z" />}
      {kind === "parents" && <path d="M12 3l9 7.5V21h-6v-6H9v6H3V10.5z" />}
      {kind === "schools" && <path d="M12 2l9 5v2H3V7zM5 10.5h3v7H5zm5.5 0h3v7h-3zm5.5 0h3v7h-3zM3 19h18v2H3z" />}
    </svg>
  );
}

/* The original landing page at / and /fr, with the learner app's boy and girl. */
export function LandingPage({ locale }: { locale: Locale }) {
  return <Landing locale={locale} boy={<Mascot which="boy" />} girl={<Mascot which="girl" />} />;
}

/*
 * FILUMIRE in Ghana: the full site experience a visitor reaches from the
 * landing page's Choose Your Country (the 28 Oct overhaul homepage content).
 */
export function GhanaPage({ locale }: { locale: Locale }) {
  const copy = HOME_COPY[locale];
  const subjects = SUBJECTS_COPY[locale];
  const ghana = GHANA_COPY[locale];
  const [before, accent, after] = copy.headline;
  return (
    <>
      <section className="fs-hero" aria-labelledby="home-title">
        <div className="fs-container fs-hero-grid">
          <div className="fs-hero-copy">
            <p className="fs-pill">{copy.eyebrow}</p>
            <h1 id="home-title">{before}<span className="fs-accent">{accent}<Stroke className="fs-accent-stroke" /></span>{after}</h1>
            <p className="fs-lead">{copy.lead}</p>
            <Actions locale={locale} actions={[withLabel(app("start", locale), copy.primary), withLabel(app("login", locale), copy.secondary, "secondary")]} />
            <ul className="fs-facts">
              {copy.facts.map((fact) => <li key={fact}><Check />{fact}</li>)}
            </ul>
          </div>
          <div className="fs-hero-art" aria-hidden="true">
            <Mascot which="boy" className="fs-mascot fs-mascot-boy" />
            <Mascot which="girl" className="fs-mascot fs-mascot-girl" />
          </div>
        </div>
      </section>

      <Section tone="white" id="subjects" labelledBy="ghana-subjects">
        <div className="fs-section-head is-center">
          <p className="fs-eyebrow">{copy.subjectsEyebrow}</p>
          <h2 id="ghana-subjects">{copy.subjectsTitle}</h2>
          <p className="fs-section-lead">{copy.subjectsLead}</p>
        </div>
        <SubjectGrid locale={locale} review={[{ band: "primary", heading: subjects.reviewPrimary }, { band: "jhs", heading: subjects.reviewJhs }]} />
        <p className="fs-note">{SUBJECT_COPY[locale].reviewMeaning}</p>
        <p className="fs-more"><Link href={localizeHref("/subjects", locale)}>{copy.subjectsLink}<Arrow /></Link></p>
      </Section>

      <Section tone="sky">
        <SectionHead eyebrow={copy.howEyebrow} title={copy.howTitle} center />
        <Steps items={copy.steps} />
        <p className="fs-more"><Link href={localizeHref("/how-it-works", locale)}>{copy.howLink}<Arrow /></Link></p>
      </Section>

      <Section tone="white">
        <div className="fs-filu-block">
          <figure className="fs-filu-intro">
            <FiluMark className="fs-filu-avatar" />
            <figcaption className="fs-bubble">{copy.filuSays}</figcaption>
          </figure>
          <div className="fs-filu-text">
            <SectionHead eyebrow={copy.filuEyebrow} title={copy.filuTitle} lead={copy.filuText} />
            <ul className="fs-ticks">
              {copy.filuPoints.map((point) => <li key={point}><Check />{point}</li>)}
            </ul>
          </div>
        </div>
      </Section>

      <Section tone="sky">
        <SectionHead eyebrow={copy.audienceEyebrow} title={copy.audienceTitle} center />
        <ul className="fs-audiences">
          {copy.audiences.map((audience, index) => {
            const kind = (["learners", "parents", "schools"] as const)[index];
            return (
              <li key={audience.href} className={"fs-audience " + kind}>
                <span className="fs-audience-icon"><AudienceIcon kind={kind} /></span>
                <h3>{audience.title}</h3>
                <p>{audience.text}</p>
                <Link href={localizeHref(audience.href, locale)} className="fs-text-link">{audience.cta}<Arrow /></Link>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section tone="white">
        <SectionHead eyebrow={copy.trustEyebrow} title={copy.trustTitle} center />
        <FeatureGrid items={copy.trust} />
      </Section>

      <Section tone="sky">
        <SectionHead title={ghana.startTitle} center />
        <Steps items={ghana.start} />
      </Section>

      <CtaBand locale={locale} title={copy.finalTitle} text={copy.finalText} actions={[withLabel(app("start", locale), copy.primary, "light"), { label: copy.finalSecondary, href: "/contact", variant: "secondary" }]} />
    </>
  );
}

export function LearnersPage({ locale }: { locale: Locale }) {
  const copy = LEARNERS_COPY[locale];
  const actions = [withLabel(app("start", locale), copy.primary), withLabel(app("login", locale), copy.secondary, "secondary")];
  return (
    <>
      <PageHero locale={locale} eyebrow={copy.eyebrow} title={copy.title} lead={copy.lead} actions={actions} art={<Mascot which="girl" className="fs-page-mascot" />} />
      <Section tone="white">
        <SectionHead title={copy.featuresTitle} center />
        <FeatureGrid items={copy.features} />
      </Section>
      <Section tone="sky">
        <SectionHead title={copy.startTitle} center />
        <Steps items={copy.startSteps} />
        <Avatars className="fs-avatars-center" />
      </Section>
      <CtaBand locale={locale} title={copy.title} text={copy.lead} actions={[withLabel(app("start", locale), copy.primary, "light")]} />
    </>
  );
}

export function ParentsPage({ locale }: { locale: Locale }) {
  const copy = PARENTS_COPY[locale];
  const actions: Action[] = [withLabel(app("parent", locale), copy.primary), { label: copy.secondary, href: "/contact?inquiry=family", variant: "secondary" }];
  return (
    <>
      <PageHero locale={locale} eyebrow={copy.eyebrow} title={copy.title} lead={copy.lead} actions={actions} art={<Avatars />} />
      <Section tone="white">
        <SectionHead title={copy.featuresTitle} center />
        <FeatureGrid items={copy.features} />
      </Section>
      <Section tone="sky">
        <div className="fs-panel">
          <h2>{copy.safetyTitle}</h2>
          <p>{copy.safetyText}</p>
        </div>
      </Section>
      <CtaBand locale={locale} title={copy.title} text={copy.lead} actions={[withLabel(app("parent", locale), copy.primary, "light")]} />
    </>
  );
}

export function SchoolsPage({ locale }: { locale: Locale }) {
  const copy = SCHOOLS_COPY[locale];
  const talk: Action = { label: copy.secondary, href: "/contact?inquiry=school-pilot", variant: "secondary" };
  return (
    <>
      <PageHero locale={locale} eyebrow={copy.eyebrow} title={copy.title} lead={copy.lead} actions={[withLabel(app("teacher", locale), copy.primary), talk]} art={<Mascot which="boy" className="fs-page-mascot" />} />
      <Section tone="white">
        <SectionHead title={copy.featuresTitle} center />
        <FeatureGrid items={copy.features} />
      </Section>
      <CtaBand locale={locale} title={copy.schoolTitle} text={copy.schoolText} actions={[{ ...talk, variant: "light" }]} />
    </>
  );
}

const SOURCE_PDFS = [
  "/curriculum-sources/ENGLISH-B4-B6.pdf",
  "/curriculum-sources/NaCCA-Mathematics-B4-B6-2019.pdf",
  "/curriculum-sources/NaCCA-Science-B4-B6-2019.pdf",
  "/curriculum-sources/NaCCA-Computing-B4-B6-2019.pdf",
];

export function SubjectsPage({ locale }: { locale: Locale }) {
  const copy = SUBJECTS_COPY[locale];
  return (
    <>
      <PageHero locale={locale} eyebrow={copy.eyebrow} title={copy.title} lead={copy.lead} />
      <Section tone="white" id="basic-4-6" labelledBy="basic-4-6-title">
        <div className="fs-band-head">
          <h2 id="basic-4-6-title">{copy.primaryTitle}</h2>
          <p>{copy.primaryNote}</p>
        </div>
        <SubjectGrid locale={locale} review={[{ band: "primary", heading: copy.reviewPrimary }]} />
      </Section>
      <Section tone="sky" id="jhs-1-3" labelledBy="jhs-1-3-title">
        <div className="fs-band-head">
          <h2 id="jhs-1-3-title">{copy.jhsTitle}</h2>
          <p>{copy.jhsNote}</p>
        </div>
        <SubjectGrid locale={locale} review={[{ band: "jhs", heading: copy.reviewJhs }]} />
        <div className="fs-panel fs-panel-small">
          <h3>{copy.reviewTitle}</h3>
          <p>{SUBJECT_COPY[locale].reviewMeaning}</p>
        </div>
      </Section>
      <Section tone="white">
        <SectionHead title={copy.sourcesTitle} />
        <ul className="fs-sources">
          {SOURCE_PDFS.map((href, index) => (
            <li key={href}><a href={href} lang="en">{copy.sources[index]}<span aria-hidden="true">PDF</span></a></li>
          ))}
        </ul>
      </Section>
      <CtaBand locale={locale} title={copy.title} text={copy.lead} actions={[withLabel(app("start", locale), copy.primary, "light")]} />
    </>
  );
}

export function HowItWorksPage({ locale }: { locale: Locale }) {
  const copy = HOW_COPY[locale];
  return (
    <>
      <PageHero locale={locale} eyebrow={copy.eyebrow} title={copy.title} lead={copy.lead} />
      <Section tone="white">
        <Steps items={copy.steps} />
      </Section>
      <Section tone="sky">
        <div className="fs-two">
          <div className="fs-panel">
            <FiluMark className="fs-filu-small" />
            <h2>{copy.filuTitle}</h2>
            <p>{copy.filuText}</p>
          </div>
          <div className="fs-panel">
            <Avatars />
            <h2>{copy.adultsTitle}</h2>
            <p>{copy.adultsText}</p>
          </div>
        </div>
      </Section>
      <CtaBand locale={locale} title={copy.title} text={copy.lead} actions={[withLabel(app("start", locale), copy.primary, "light"), { label: copy.secondary, href: "/subjects", variant: "secondary" }]} />
    </>
  );
}

export function AboutPage({ locale }: { locale: Locale }) {
  const copy = ABOUT_COPY[locale];
  return (
    <>
      <PageHero locale={locale} eyebrow={copy.eyebrow} title={copy.title} lead={copy.lead} art={<Avatars />} />
      <Section tone="white">
        <div className="fs-panel fs-panel-plain">
          <h2>{copy.whyTitle}</h2>
          <p>{copy.whyText}</p>
        </div>
      </Section>
      <Section tone="sky" id="principles" labelledBy="principles-title">
        <div className="fs-section-head is-center"><h2 id="principles-title">{copy.principlesTitle}</h2></div>
        <FeatureGrid items={copy.principles} />
      </Section>
      <Section tone="white">
        <div className="fs-two">
          <div className="fs-panel">
            <h2>{copy.africaTitle}</h2>
            <p>{copy.africaText}</p>
          </div>
          <div className="fs-panel" id="privacy">
            <h2>{copy.privacyTitle}</h2>
            <p>{copy.privacyText}</p>
            <p><Link href={localizeHref("/privacy", locale)} className="fs-text-link">{copy.privacyLink}<Arrow /></Link></p>
          </div>
        </div>
      </Section>
      <section id="work-with-us" className="fs-cta-band">
        <div className="fs-container fs-cta-inner">
          <div>
            <h2>{copy.workTitle}</h2>
            <p>{copy.workText}</p>
          </div>
          <Actions locale={locale} actions={[{ label: copy.workCta, href: "/contact?inquiry=partnership", variant: "light" }]} />
        </div>
      </section>
    </>
  );
}

export function ComingSoonPage({ locale, country }: { locale: Locale; country: Exclude<CountryId, "ghana"> }) {
  const copy = SOON_COPY[locale];
  const name = COUNTRIES.find((item) => item.id === country)!.name[locale];
  return (
    <PageHero
      locale={locale}
      eyebrow={copy.eyebrow}
      title={copy.title(name)}
      lead={copy.text(name)}
      actions={[{ label: copy.back, href: "/#choose-country" }, { label: copy.contact, href: "/contact", variant: "secondary" }]}
      art={<Mascot which="boy" className="fs-page-mascot" />}
    />
  );
}

export function HelpPage({ locale }: { locale: Locale }) {
  const copy = HELP_COPY[locale];
  const entries = { learner: app("login", locale), parent: app("parent", locale), teacher: app("teacher", locale) } as const;
  return (
    <>
      <PageHero locale={locale} eyebrow={copy.eyebrow} title={copy.title} lead={copy.lead} />
      <Section tone="white">
        <ul className="fs-help-cards">
          {copy.cards.map((card) => {
            const entry = entries[card.id as keyof typeof entries];
            return (
              <li key={card.id} id={card.id}>
                <h2>{card.title}</h2>
                <p>{card.text}</p>
                {entry.external ? <a href={entry.href} className="fs-text-link">{card.cta}<Arrow /></a> : null}
              </li>
            );
          })}
        </ul>
      </Section>
      <Section tone="sky" id="message">
        <div className="fs-form-wrap">
          <SectionHead title={copy.formTitle} lead={copy.formLead} />
          <ContactInquiry locale={locale} />
        </div>
      </Section>
    </>
  );
}
