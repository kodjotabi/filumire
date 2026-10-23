import Link from "next/link";
import { AccessLink } from "@/components/AccessLink";
import { SITE_CONTENT } from "@/lib/content";

export default function HomePage() {
  const content = SITE_CONTENT.en;

  return (
    <>
      {/* 1. Hero Section */}
      <section className="hero-section">
        <div className="site-container">
          <div className="hero-grid">
            {/* Left Content Column */}
            <div className="hero-content">
              <span className="section-eyebrow">
                <span style={{ color: "var(--ui-green)" }}>&bull;</span> {content.hero.taglineBadge}
              </span>

              <h1 className="hero-headline">
                Learning that <span>understands</span> every child.
              </h1>

              <p className="hero-subhead">
                {content.hero.subhead}
              </p>

              {/* Main entry to the learner app: kept large and first so learners cannot miss it. */}
              <AccessLink role="learner" className="learner-app-cta">
                <span className="learner-app-cta-icon" aria-hidden="true">&#9654;</span>
                <span className="learner-app-cta-text">
                  <span className="learner-app-cta-title">Open the Learner App</span>
                  <span className="learner-app-cta-subtitle">Learners start here</span>
                </span>
                <span className="learner-app-cta-arrow" aria-hidden="true">&rarr;</span>
              </AccessLink>

              <div className="hero-cta-group">
                <Link href="/how-it-works" className="btn btn-outline btn-lg">
                  {content.hero.secondaryCta}
                </Link>
              </div>

              <p className="form-note" style={{ marginBottom: "20px" }}>Explore the educational design below. Current lessons, languages and access options should be confirmed with the team.</p>

              {/* Curriculum Focus Strip */}
              <div className="hero-proof-row">
                <div className="hero-avatars-row">
                  <div className="hero-avatar-circle">
                    <img src="/avatars/approved-kofi.png" alt="Learner Kofi" />
                  </div>
                  <div className="hero-avatar-circle">
                    <img src="/avatars/approved-girl.png" alt="Learner Ama" />
                  </div>
                  <div className="hero-avatar-circle">
                    <img src="/avatars/approved-hijab.png" alt="Learner Amina" />
                  </div>
                  <div className="hero-avatar-circle">
                    <img src="/avatars/approved-glasses.png" alt="Learner Kwame" />
                  </div>
                </div>
                <div className="hero-proof-text">
                  <strong>Ghana NaCCA Curriculum Focus</strong>
                  <br />
                  Primary Basic 4, 5 &amp; 6 &bull; Educational Design
                </div>
              </div>
            </div>

            {/* Right Media Column: Illustrative Mobile Interface Frame */}
            <div className="hero-media-wrapper">
              <div className="hero-device-frame">
                <img
                  src="/product-preview/FILUMIRE-Interface-Page-04.png"
                  alt="Illustrative FILUMIRE learner dashboard design"
                  className="hero-device-img"
                />
              </div>

              {/* Floating Live Badges */}
              <div className="hero-floating-badge badge-top-left">
                <span style={{ fontSize: "20px" }}>🎯</span>
                <div>
                  <div style={{ fontSize: "11px", color: "var(--ui-brand)", textTransform: "uppercase" }}>Adaptive Engine</div>
                  <div>Understanding Learning Gaps</div>
                </div>
              </div>

              <div className="hero-floating-badge badge-bottom-right">
                <span style={{ fontSize: "20px" }}>🌱</span>
                <div>
                  <div style={{ fontSize: "11px", color: "var(--ui-green)", textTransform: "uppercase" }}>Pedagogical Loop</div>
                  <div>Step 1 of 5: Understand</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Core Pillars Section */}
      <section className="site-section site-section-alt">
        <div className="site-container">
          <div className="section-heading-center">
            <span className="section-eyebrow section-eyebrow-green">Our Educational Foundation</span>
            <h2 className="section-title">Built with purpose for African learners</h2>
            <p className="section-subtitle">
              FILUMIRE brings together curriculum, evidence of understanding and guided teaching. Its educational design puts African classrooms and families at the centre.
            </p>
          </div>

          <div className="pillars-grid">
            {content.pillars.map((pillar) => (
              <div key={pillar.title} className="pillar-card">
                <div className="pillar-icon-box">
                  <img src={pillar.icon} alt={pillar.title} />
                </div>
                <h3 className="pillar-title">{pillar.title}</h3>
                <div className="pillar-tagline">{pillar.tagline}</div>
                <p className="pillar-desc">{pillar.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. The FILUMIRE Adaptive Difference (Comparison) */}
      <section className="site-section">
        <div className="site-container">
          <div className="section-heading-center">
            <span className="section-eyebrow">The Adaptive Difference</span>
            <h2 className="section-title">Understanding why a child struggles</h2>
            <p className="section-subtitle">
              FILUMIRE’s approach looks beyond right and wrong answers to understand <em>why</em>, separating careless slips from prerequisite gaps and misconceptions.
            </p>
          </div>

          <div className="adaptive-comparison">
            <div className="adaptive-comparison-header">
              <div className="adaptive-comparison-heading adaptive-comparison-generic">
                A Fixed Learning Sequence
              </div>
              <div className="adaptive-comparison-heading adaptive-comparison-filumire">
                FILUMIRE’s Adaptive Design
              </div>
            </div>

            <div className="adaptive-comparison-row">
              <div className="adaptive-comparison-cell adaptive-comparison-generic">
                <strong>Linear progression:</strong> The same sequence is offered to every learner, even when their needs differ.
              </div>
              <div className="adaptive-comparison-cell adaptive-comparison-filumire">
                <strong>Choosing the next step:</strong> The policy design aims to select a suitable next step—introducing concepts, repairing prerequisites, or fading scaffolds.
              </div>
            </div>

            <div className="adaptive-comparison-row">
              <div className="adaptive-comparison-cell adaptive-comparison-generic">
                <strong>Binary grading:</strong> An answer is marked right or wrong without exploring the reason.
              </div>
              <div className="adaptive-comparison-cell adaptive-comparison-filumire">
                <strong>Understanding the mistake:</strong> The approach looks for underlying errors and targets the concept that needs attention.
              </div>
            </div>

            <div className="adaptive-comparison-row">
              <div className="adaptive-comparison-cell adaptive-comparison-generic">
                <strong>Superficial mastery:</strong> Completion alone does not show whether a child remembers or can apply an idea.
              </div>
              <div className="adaptive-comparison-cell adaptive-comparison-filumire">
                <strong>Durable retention &amp; transfer:</strong> Separates initial mastery from spaced retrieval checks and unfamiliar transfer challenges.
              </div>
            </div>

            <div className="adaptive-comparison-row">
              <div className="adaptive-comparison-cell adaptive-comparison-generic">
                <strong>Limited classroom context:</strong> A tool used on its own may give teachers little insight.
              </div>
              <div className="adaptive-comparison-cell adaptive-comparison-filumire">
                <strong>Teacher-in-the-Loop:</strong> The design keeps teacher judgement and classroom priorities central.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Meet FILU: The Learning Companion */}
      <section className="site-section site-section-alt" id="meet-filu">
        <div className="site-container">
          <div className="filu-split-section">
            <div className="filu-card-frame">
              <img
                src="/illustrations/4 avatar together.png"
                alt="FILU and Learners"
                className="filu-portrait-img"
              />
              <div className="filu-speech-bubble">
                <span className="kalam-accent" style={{ fontSize: "20px", color: "var(--ui-brand)", display: "block", marginBottom: "4px" }}>
                  &ldquo;Let&apos;s work through this step by step!&rdquo;
                </span>
                <span style={{ fontSize: "13.5px", color: "var(--ui-ink-soft)" }}>
                  FILU is designed to guide with hints and encouragement.
                </span>
              </div>
            </div>

            <div>
              <span className="section-eyebrow">{content.filuExplainer.badge}</span>
              <h2 className="section-title">{content.filuExplainer.title}</h2>
              <p className="section-subtitle">
                {content.filuExplainer.subtitle}
              </p>

              <div className="filu-points-list">
                {content.filuExplainer.points.map((pt, idx) => (
                  <div key={pt.title} className="filu-point-item">
                    <div className="filu-point-bullet">{idx + 1}</div>
                    <div>
                      <h4 className="filu-point-title">{pt.title}</h4>
                      <p className="filu-point-desc">{pt.text}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: "32px" }}>
                <Link href="/how-it-works" className="btn btn-outline">
                  Learn more about FILU&apos;s teaching role &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. The 5-Step Learning Sequence */}
      <section className="site-section" id="pedagogy">
        <div className="site-container">
          <div className="section-heading-center">
            <span className="section-eyebrow section-eyebrow-green">Pedagogical Framework</span>
            <h2 className="section-title">{content.pedagogy.title}</h2>
            <p className="section-subtitle">{content.pedagogy.subtitle}</p>
          </div>

          <div className="stepper-container">
            {content.pedagogy.steps.map((st) => (
              <div key={st.step} className="step-card">
                <div className="step-badge">{st.step}</div>
                <div className="step-lang-pair">
                  <div className="step-name-en">{st.nameEn}</div>
                  <div className="step-name-fr">{st.nameFr}</div>
                </div>
                <h4 className="step-title">{st.title}</h4>
                <p className="step-desc">{st.description}</p>
                <div className="step-filu-note">
                  <strong style={{ display: "block", color: "var(--ui-brand)", fontSize: "11px", textTransform: "uppercase" }}>FILU&apos;s Role</strong>
                  {st.roleOfFilu}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Subjects & Curriculum Coverage */}
      <section className="site-section site-section-alt" id="curriculum">
        <div className="site-container">
          <div className="section-heading-center">
            <span className="section-eyebrow">National Standards Baseline</span>
            <h2 className="section-title">An initial focus on four core subjects</h2>
            <p className="section-subtitle">
              The educational baseline is Ghana&apos;s NaCCA standards for Primary Basic 4, 5 and 6. Ask about the lessons and languages currently available.
            </p>
          </div>

          <div className="subjects-grid">
            {content.subjects.map((sub) => (
              <div key={sub.id} className="subject-card">
                <div className="subject-header">
                  <div className="subject-icon-box" style={{ background: `${sub.badgeColor}15` }}>
                    <img src={sub.icon} alt={sub.name} />
                  </div>
                  <h3 className="subject-title">{sub.name}</h3>
                </div>
                <p className="subject-desc">{sub.description}</p>

                <div style={{ marginTop: "auto" }}>
                  <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--ui-brand)", letterSpacing: "0.5px" }}>
                    Curriculum Strands
                  </span>
                  <ul className="strand-list">
                    {sub.strands.map((strand) => (
                      <li key={strand} className="strand-item">{strand}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: "center", marginTop: "40px" }}>
            <Link href="/curriculum" className="btn btn-outline">
              Explore the Curriculum Focus &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* 7. Audiences Split: Families & Schools */}
      <section className="site-section">
        <div className="site-container">
          <div className="section-heading-center">
            <span className="section-eyebrow">Partners in Learning</span>
            <h2 className="section-title">Designed for home and classroom</h2>
            <p className="section-subtitle">
              Education flourishes when learners, parents, and teachers share a common, transparent picture of progress.
            </p>
          </div>

          <div className="audiences-grid">
            {/* For Families Card */}
            <div className="audience-card">
              <h3 className="audience-title">{content.audiences.families.title}</h3>
              <p className="audience-tagline">{content.audiences.families.tagline}</p>
              <ul className="audience-points">
                {content.audiences.families.points.map((pt) => (
                  <li key={pt} className="audience-point">
                    <span className="audience-check" aria-hidden="true">✓</span>
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
              <div>
                <Link href="/for-families" className="btn btn-outline" style={{ width: "100%" }}>
                  {content.audiences.families.cta} &rarr;
                </Link>
              </div>
            </div>

            {/* For Schools Card */}
            <div className="audience-card">
              <h3 className="audience-title">{content.audiences.schools.title}</h3>
              <p className="audience-tagline">{content.audiences.schools.tagline}</p>
              <ul className="audience-points">
                {content.audiences.schools.points.map((pt) => (
                  <li key={pt} className="audience-point">
                    <span className="audience-check" aria-hidden="true">✓</span>
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
              <div>
                <Link href="/for-schools" className="btn btn-primary" style={{ width: "100%" }}>
                  {content.audiences.schools.cta} &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Infrastructure Resilience Section */}
      <section className="site-section site-section-navy">
        <div className="site-container">
          <div className="section-heading-center">
            <span className="section-eyebrow" style={{ background: "rgba(255,255,255,0.15)", color: "#ffffff" }}>
              Design Priorities
            </span>
            <h2 className="section-title section-title-white">{content.architecturePillars.title}</h2>
            <p className="section-subtitle section-subtitle-white">{content.architecturePillars.subtitle}</p>
          </div>

          <div className="resilience-grid">
            {content.architecturePillars.items.map((it) => (
              <div key={it.title} className="resilience-card">
                <h4>{it.title}</h4>
                <p>{it.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. Final Call to Action Banner */}
      <section className="site-section">
        <div className="site-container">
          <div className="cta-banner">
            <h2>Experience learning that understands your child.</h2>
            <p>
              Whether you are a parent seeking durable homework support or a school leader looking to empower teachers with diagnostic clarity, explore the approach and ask about current access options.
            </p>
            <div className="cta-banner-buttons">
              <AccessLink role="learner" 
                className="btn btn-primary btn-lg"
              >
                Explore Learner Access &rarr;
              </AccessLink>
              <Link href="/contact?inquiry=school-pilot" className="btn btn-outline-white btn-lg">
                Ask About a School Pilot
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

