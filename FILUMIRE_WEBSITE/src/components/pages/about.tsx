import Link from "next/link";

export const metadata = {
  title: "About FILUMIRE | Mission & Principles",
  description: "Learn about the mission, pedagogical laws, and African Learning Intelligence principles behind the FILUMIRE infrastructure.",
};

export default function AboutPage() {
  return (
    <>
      <section className="site-section site-section-alt" style={{ paddingBottom: "48px" }}>
        <div className="site-container">
          <div className="section-heading-center" style={{ marginBottom: "24px" }}>
            <span className="section-eyebrow">Our Mission &amp; Purpose</span>
            <h1 className="section-title">The FILUMIRE Mission</h1>
            <p className="section-subtitle">
              Building durable, transferable learning capability for every African child through rigorous adaptive intelligence and respectful technology.
            </p>
          </div>
        </div>
      </section>

      {/* The Core Definition */}
      <section className="site-section">
        <div className="site-container">
          <div style={{ maxWidth: "840px", margin: "0 auto", fontSize: "16.5px", color: "var(--ui-ink)", lineHeight: "1.7" }}>
            <h2 style={{ fontSize: "28px", fontWeight: "800", color: "var(--ui-brand)", marginBottom: "16px" }}>
              What is FILUMIRE?
            </h2>
            <p style={{ marginBottom: "20px" }}>
              FILUMIRE is an <strong>EduTutor and adaptive learning project for African children</strong>. Its educational focus is understanding learning gaps and building capability that a child can use independently.
            </p>
            <p style={{ marginBottom: "20px" }}>
              Children can need different amounts of explanation and practice. When a prerequisite is unclear, later lessons can become harder. FILUMIRE’s approach begins with understanding those needs.
            </p>
            <p style={{ marginBottom: "32px" }}>
              FILUMIRE was conceived to solve this foundational challenge: developing low-stakes diagnostic support that explores <em>why</em> a child is stuck, remediates the specific gap with culturally authentic guidance, and verifies true retention and transfer over time.
            </p>

            {/* Constitutional Laws */}
            <div id="laws" style={{
              background: "var(--filumire-bg)",
              border: "1px solid var(--ui-line)",
              borderRadius: "var(--radius-lg)",
              padding: "40px",
              marginTop: "48px",
              marginBottom: "48px"
            }}>
              <span className="section-eyebrow section-eyebrow-green" style={{ marginBottom: "12px" }}>
                Principles behind the approach
              </span>
              <h3 style={{ fontSize: "24px", fontWeight: "800", color: "var(--ui-ink)", marginBottom: "16px" }}>
                Ten commitments to meaningful learning
              </h3>
              <p style={{ fontSize: "14.5px", color: "var(--ui-ink-soft)", marginBottom: "24px" }}>
                These principles guide the engineering and teaching design. They describe commitments and educational intent, rather than a list of completed platform features:
              </p>

              <ol style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "14px", fontSize: "14.5px" }}>
                <li><strong>Curriculum defines the domain:</strong> National educational standards determine what must be taught, not algorithmic whims.</li>
                <li><strong>Evidence drives understanding:</strong> Understanding is inferred from structured performance data across representations, never assumed.</li>
                <li><strong>Diagnosis is revisable:</strong> The design calls for learning needs to be reviewed as new evidence emerges.</li>
                <li><strong>Mastery requires independent evidence:</strong> Supported success with hints is distinct from unassisted capability.</li>
                <li><strong>Intervention responds to diagnosed need:</strong> Remediation directly addresses the diagnosed misconception rather than repeating identical drills.</li>
                <li><strong>Learning rules choose the next step:</strong> Transparent, rules-based intelligence determines learning progression.</li>
                <li><strong>FILU teaches under constraints:</strong> The teaching companion should follow verified learning rules. Generative AI availability must be confirmed separately.</li>
                <li><strong>Mastery, retention, and transfer are distinct:</strong> Remembering later and applying in new contexts are evaluated separately.</li>
                <li><strong>Teachers remain in the loop:</strong> The design calls for educators to inspect, constrain and override learning decisions; confirm the controls in the version you use.</li>
                <li><strong>Educational truth is separate from commercial access:</strong> Entitlement or subscription expiry never mutates or erases an authentic learning record.</li>
              </ol>
            </div>

            {/* African Learning Intelligence Layer */}
            <h2 style={{ fontSize: "26px", fontWeight: "800", color: "var(--ui-ink)", marginBottom: "16px" }}>
              African Learning Intelligence
            </h2>
            <p style={{ marginBottom: "20px" }}>
              Africa is not a monolithic monoculture. FILUMIRE does not apply generic Western EdTech assumptions or treat African learners with patronizing stereotypes.
            </p>
            <p style={{ marginBottom: "20px" }}>
              The design starts with Ghana’s curriculum and values familiar names, community settings and currency examples such as Ghana Cedis. English and French are part of the language direction; current lesson coverage and platform language support should be confirmed with the team.
            </p>

            {/* Child Safety and Privacy */}
            <div id="privacy" style={{ marginTop: "40px", paddingTop: "32px", borderTop: "1px solid var(--ui-line)" }}>
              <h3 style={{ fontSize: "22px", fontWeight: "800", color: "var(--ui-ink)", marginBottom: "12px" }}>
                Child Safety &amp; Data Integrity
              </h3>
              <p style={{ fontSize: "14.5px", color: "var(--ui-ink-soft)", lineHeight: "1.6" }}>
                Learner privacy, child safety and adult oversight are design priorities. Before using the learning platform, families and schools should request its current privacy information, consent requirements and available safeguards. Please do not share children’s personal records through the public contact form.
              </p>
              <div className="action-row"><Link href="/privacy" className="btn btn-outline">Public Website Privacy</Link><Link href="/contact?inquiry=general" className="btn btn-outline">Ask About Safeguards</Link></div>
            </div>
            <div className="action-row"><Link href="/partners" className="btn btn-primary">Potential Partners &rarr;</Link><Link href="/access" className="btn btn-outline">Access Guidance</Link></div>
          </div>
        </div>
      </section>
    </>
  );
}
