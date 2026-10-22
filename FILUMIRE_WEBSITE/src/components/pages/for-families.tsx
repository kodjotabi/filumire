import Link from "next/link";
import { AccessLink } from "@/components/AccessLink";
import { SITE_CONTENT } from "@/lib/content";

export const metadata = {
  title: "For Families & Parents | FILUMIRE",
  description: "How FILUMIRE empowers parents to support their children with clear progress insights, the learning approach, family access guidance and practical home-learning ideas.",
};

export default function ForFamiliesPage() {
  const content = SITE_CONTENT.en.audiences.families;

  return (
    <>
      <section className="site-section site-section-alt" style={{ paddingBottom: "48px" }}>
        <div className="site-container">
          <div className="section-heading-center" style={{ marginBottom: "24px" }}>
            <span className="section-eyebrow section-eyebrow-green">Home Learning Partnership</span>
            <h1 className="section-title">Support Your Child with Confidence</h1>
            <p className="section-subtitle">
              Parents shouldn&apos;t need advanced degrees in primary pedagogy to understand how their child is progressing. FILUMIRE’s approach aims to make learning needs clearer and help adults support real understanding.
            </p>
          </div>
        </div>
      </section>

      {/* 3 Core Family Benefits */}
      <section className="site-section">
        <div className="site-container">
          <div className="benefits-grid">
            <div className="pillar-card" style={{ textAlign: "left", alignItems: "flex-start" }}>
              <div style={{
                width: "56px",
                height: "56px",
                background: "var(--ui-blue-tint)",
                borderRadius: "14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
                marginBottom: "16px"
              }}>
                📊
              </div>
              <h3 className="pillar-title">Clarity, Not Anxiety</h3>
              <p className="pillar-desc">
                The goal is to distinguish what a child can do independently from what still needs supported practice. Ask which progress information is available for your child’s current access.
              </p>
            </div>

            <div className="pillar-card" style={{ textAlign: "left", alignItems: "flex-start" }}>
              <div style={{
                width: "56px",
                height: "56px",
                background: "var(--ui-green-tint)",
                borderRadius: "14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
                marginBottom: "16px"
              }}>
                🛡️
              </div>
              <h3 className="pillar-title">Safety &amp; Privacy</h3>
              <p className="pillar-desc">
                A calm, respectful learning environment is a design priority. Before enrolment, ask about the platform’s privacy information, safeguards and adult oversight.
              </p>
            </div>

            <div className="pillar-card" style={{ textAlign: "left", alignItems: "flex-start" }}>
              <div style={{
                width: "56px",
                height: "56px",
                background: "var(--ui-amber-tint)",
                borderRadius: "14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
                marginBottom: "16px"
              }}>
                💡
              </div>
              <h3 className="pillar-title">Actionable Home Tips</h3>
              <p className="pillar-desc">
                Simple activities can reinforce classroom ideas—like estimating shopping change in Cedis or spotting fractions in cooking. These examples do not require a parent to be a subject expert.
              </p>
            </div>
          </div>

          {/* Parent Portal Spotlight */}
          <div className="spotlight-grid families" style={{
            background: "linear-gradient(180deg, var(--ui-blue-tint) 0%, #ffffff 100%)",
            border: "1px solid var(--ui-line)",
            borderRadius: "var(--radius-lg)",
            padding: "48px 40px",
            alignItems: "center"
          }}>
            <div>
              <span className="section-eyebrow">Family Guidance</span>
              <h2 style={{ fontSize: "32px", fontWeight: "800", color: "var(--ui-ink)", marginBottom: "16px" }}>
                Learning Support for Your Family
              </h2>
              <p style={{ fontSize: "16px", color: "var(--ui-ink-soft)", lineHeight: "1.6", marginBottom: "24px" }}>
                Start by discussing your child’s year group, subjects and home-learning needs. If your family already has an invitation, use the sign-in instructions supplied by your school or the FILUMIRE team.
              </p>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "12px", marginBottom: "32px" }}>
                <li style={{ display: "flex", gap: "10px", fontSize: "15px", color: "var(--ui-ink)" }}>
                  <span style={{ color: "var(--ui-green)", fontWeight: "800" }} aria-hidden="true">✓</span>
                  <span>Ask which subjects and lessons are currently available</span>
                </li>
                <li style={{ display: "flex", gap: "10px", fontSize: "15px", color: "var(--ui-ink)" }}>
                  <span style={{ color: "var(--ui-green)", fontWeight: "800" }} aria-hidden="true">✓</span>
                  <span>Discuss where your child needs explanation and supported practice</span>
                </li>
                <li style={{ display: "flex", gap: "10px", fontSize: "15px", color: "var(--ui-green)", fontWeight: "700" }}>
                  <span>&bull;</span>
                  <span>Confirm access options for a household with more than one child</span>
                </li>
              </ul>

              <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                <AccessLink role="parent" 
                  className="btn btn-primary btn-lg"
                >
                  Parent Access &rarr;
                </AccessLink>
                <Link href="/contact?inquiry=family" className="btn btn-outline btn-lg">
                  Parent Inquiries
                </Link>
              </div>
            </div>

            <div style={{ textAlign: "center" }}>
              <img
                src="/illustrations/learners-clean.svg"
                alt="FILUMIRE Learners"
                style={{ maxWidth: "340px", margin: "0 auto" }}
              />
              <p style={{ fontSize: "13px", fontWeight: "600", color: "var(--ui-ink-soft)", marginTop: "12px" }}>
                Designed for African families and multi-child households
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
