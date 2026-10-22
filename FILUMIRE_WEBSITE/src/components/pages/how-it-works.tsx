import Link from "next/link";
import { AccessLink } from "@/components/AccessLink";
import { SITE_CONTENT } from "@/lib/content";

export const metadata = {
  title: "How It Works | FILUMIRE Adaptive Learning",
  description: "Explore FILUMIRE's continuous learning intelligence loop, pedagogical sequence, and how FILU guides learners toward durable capability.",
};

export default function HowItWorksPage() {
  const content = SITE_CONTENT.en;

  return (
    <>
      {/* Header Banner */}
      <section className="site-section site-section-alt" style={{ paddingBottom: "48px" }}>
        <div className="site-container">
          <div className="section-heading-center" style={{ marginBottom: "24px" }}>
            <span className="section-eyebrow">The Engine of Understanding</span>
            <h1 className="section-title">The FILUMIRE Learning Approach</h1>
            <p className="section-subtitle">
              FILUMIRE’s educational design connects curriculum, evidence of understanding and guided teaching. The aim is to understand learning needs and choose useful next steps.
            </p>
          </div>
        </div>
      </section>

      {/* The Governing Loop Diagram/Walkthrough */}
      <section className="site-section">
        <div className="site-container">
          <div className="section-heading-center">
            <span className="section-eyebrow section-eyebrow-green">The Governing Loop</span>
            <h2 className="section-title">From a learning check to useful next steps</h2>
            <p className="section-subtitle">
              The design follows three broad stages: gather evidence, interpret learning needs and choose a teaching response. Available tools and lesson coverage should be confirmed for your access or pilot.
            </p>
          </div>

          <div className="loop-grid">
            <div className="pillar-card" style={{ alignItems: "flex-start", textAlign: "left" }}>
              <div style={{
                background: "var(--ui-blue-tint)",
                color: "var(--ui-brand)",
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: "800",
                marginBottom: "12px"
              }}>
                PHASE 1
              </div>
              <h3 className="pillar-title" style={{ fontSize: "18px" }}>Evidence Collection</h3>
              <p className="pillar-desc">
                Evidence can include responses, attempts and whether hints were needed. A single correct answer alone does not establish independent understanding.
              </p>
            </div>

            <div className="pillar-card" style={{ alignItems: "flex-start", textAlign: "left" }}>
              <div style={{
                background: "var(--ui-green-tint)",
                color: "var(--ui-green)",
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: "800",
                marginBottom: "12px"
              }}>
                PHASE 2
              </div>
              <h3 className="pillar-title" style={{ fontSize: "18px" }}>Understanding mistakes</h3>
              <p className="pillar-desc">
                The diagnostic approach examines error patterns to distinguish a careless slip from a missing prerequisite or misunderstood concept.
              </p>
            </div>

            <div className="pillar-card" style={{ alignItems: "flex-start", textAlign: "left" }}>
              <div style={{
                background: "var(--ui-amber-tint)",
                color: "var(--ui-amber)",
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: "800",
                marginBottom: "12px"
              }}>
                PHASE 3
              </div>
              <h3 className="pillar-title" style={{ fontSize: "18px" }}>Choosing useful next steps</h3>
              <p className="pillar-desc">
                The policy design considers suitable next steps: introducing a concept, revisiting a prerequisite, offering guided practice or moving forward.
              </p>
            </div>
          </div>

          {/* Separation of Authorities */}
          <div style={{
            background: "var(--ui-blue-tint)",
            border: "1px solid var(--ui-line)",
            borderRadius: "var(--radius-lg)",
            padding: "36px",
            marginTop: "32px"
          }}>
            <h3 style={{ fontSize: "22px", fontWeight: "800", color: "var(--ui-ink)", marginBottom: "12px" }}>
              Clear responsibilities for teaching and learning
            </h3>
            <p style={{ fontSize: "15px", color: "var(--ui-ink-soft)", lineHeight: "1.6", marginBottom: "20px" }}>
              These educational principles guide the FILUMIRE design:
            </p>
            <ul className="authority-grid" style={{ listStyle: "none" }}>
              <li style={{ background: "#ffffff", padding: "16px 20px", borderRadius: "var(--radius-sm)", fontSize: "14px" }}>
                <strong style={{ color: "var(--ui-brand)", display: "block", marginBottom: "4px" }}>1. The curriculum sets learning goals</strong>
                Curriculum standards dictate what must be learned; AI cannot invent its own educational requirements.
              </li>
              <li style={{ background: "#ffffff", padding: "16px 20px", borderRadius: "var(--radius-sm)", fontSize: "14px" }}>
                <strong style={{ color: "var(--ui-brand)", display: "block", marginBottom: "4px" }}>2. Learning rules guide progress</strong>
                Content, user interfaces, or AI chatbots cannot unilaterally declare mastery or advance the learner.
              </li>
              <li style={{ background: "#ffffff", padding: "16px 20px", borderRadius: "var(--radius-sm)", fontSize: "14px" }}>
                <strong style={{ color: "var(--ui-brand)", display: "block", marginBottom: "4px" }}>3. FILU works within educational boundaries</strong>
                FILU’s teaching role follows curriculum goals and the learning rules. This public website does not establish that unrestricted generative AI is integrated.
              </li>
              <li style={{ background: "#ffffff", padding: "16px 20px", borderRadius: "var(--radius-sm)", fontSize: "14px" }}>
                <strong style={{ color: "var(--ui-brand)", display: "block", marginBottom: "4px" }}>4. Access status does not change learning evidence</strong>
                Subscription or payment status cannot rewrite a learner&apos;s authentic academic record.
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="site-section site-section-alt" id="meet-filu">
        <div className="site-container"><div className="filu-split-section">
          <div className="filu-card-frame"><img src="/illustrations/4 avatar together.png" alt="Illustrated FILUMIRE learners" className="filu-portrait-img" loading="lazy" /><div className="filu-speech-bubble"><span className="kalam-accent">Let’s work through this step by step.</span></div></div>
          <div><span className="section-eyebrow">Instructional companion</span><h2 className="section-title">Meet FILU</h2><p className="section-subtitle">FILU is the teaching companion in the FILUMIRE design. Its intended role is to explain concepts, ask purposeful questions and offer hints that help children think independently.</p><p>The companion supports the educational approach; teacher judgement and curriculum goals remain central. English and French are the intended language direction for the learning experience. Confirm the languages and interactive tutoring available for your lesson or pilot; this website does not claim unrestricted generative AI integration.</p><Link href="/access#learner" className="btn btn-outline">Learner Access &rarr;</Link></div>
        </div></div>
      </section>

      {/* 3 Pillars of Durable Capability */}
      <section className="site-section site-section-alt">
        <div className="site-container">
          <div className="section-heading-center">
            <span className="section-eyebrow">Durable Learning</span>
            <h2 className="section-title">Mastery, Retention, and Transfer</h2>
            <p className="section-subtitle">
              Getting an answer right today does not guarantee genuine understanding tomorrow. The approach distinguishes three dimensions of learning.
            </p>
          </div>

          <div className="durable-grid">
            <div className="subject-card" style={{ borderTop: "4px solid var(--ui-green)" }}>
              <div style={{ fontSize: "36px", marginBottom: "12px" }}>🏆</div>
              <h3 className="subject-title">1. Mastery</h3>
              <p className="subject-desc">
                Demonstrated unassisted competence across varied problem representations. The learner proves they can solve the task independently without scaffolds or hints.
              </p>
            </div>

            <div className="subject-card" style={{ borderTop: "4px solid var(--ui-blue)" }}>
              <div style={{ fontSize: "36px", marginBottom: "12px" }}>⏳</div>
              <h3 className="subject-title">2. Retention</h3>
              <p className="subject-desc">
                Knowledge naturally decays without retrieval practice. Spaced retrieval checks over time can show whether a learner still remembers an idea.
              </p>
            </div>

            <div className="subject-card" style={{ borderTop: "4px solid var(--ui-amber)" }}>
              <div style={{ fontSize: "36px", marginBottom: "12px" }}>🚀</div>
              <h3 className="subject-title">3. Transfer</h3>
              <p className="subject-desc">
                The ultimate test of true understanding: applying a concept in novel formats, combined topics, and unfamiliar everyday community contexts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pedagogical 5-Step Deep Dive */}
      <section className="site-section" id="pedagogy">
        <div className="site-container">
          <div className="section-heading-center">
            <span className="section-eyebrow section-eyebrow-green">Pedagogical Rhythm</span>
            <h2 className="section-title">The 5-Step Learning Sequence</h2>
            <p className="section-subtitle">
              The proposed teaching rhythm supports primary learners through five stages. This describes the educational design, rather than promising that every lesson is currently available.
            </p>
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

          <div style={{ textAlign: "center", marginTop: "48px" }}>
            <AccessLink role="learner" 
              className="btn btn-primary btn-lg"
            >
              Explore Learner Access &rarr;
            </AccessLink>
          </div>
        </div>
      </section>
    </>
  );
}
