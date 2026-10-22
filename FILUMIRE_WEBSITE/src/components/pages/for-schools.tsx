import Link from "next/link";
import { AccessLink } from "@/components/AccessLink";
import { SITE_CONTENT } from "@/lib/content";

export const metadata = {
  title: "For Schools & Educators | FILUMIRE",
  description: "Explore FILUMIRE’s teacher-centred educational design and discuss classroom needs, connectivity and a possible school pilot.",
};

export default function ForSchoolsPage() {
  const content = SITE_CONTENT.en.audiences.schools;

  return (
    <>
      <section className="site-section site-section-alt" style={{ paddingBottom: "48px" }}>
        <div className="site-container">
          <div className="section-heading-center" style={{ marginBottom: "24px" }}>
            <span className="section-eyebrow">Institutional Partnership</span>
            <h1 className="section-title">Learning Support for Schools & Teachers</h1>
            <p className="section-subtitle">
              FILUMIRE is designed to assist and elevate teachers, not replace them. The educational design uses evidence of understanding to help educators identify needs and focus classroom time.
            </p>
          </div>
        </div>
      </section>

      {/* 3 Core School Capabilities */}
      <section className="site-section">
        <div className="site-container">
          <div className="capabilities-grid">
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
                🧭
              </div>
              <h3 className="pillar-title">Diagnostic Grouping</h3>
              <p className="pillar-desc">
                Grouping learners by shared conceptual needs, such as place value or fraction comparison, can support focused teaching. Ask about the diagnostic tools available in a proposed pilot.
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
                ⚡
              </div>
              <h3 className="pillar-title">Full Teacher Authority</h3>
              <p className="pillar-desc">
                Teacher judgement is central to the approach. Discuss syllabus pacing, topic priorities and the controls available before planning classroom use.
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
                📶
              </div>
              <h3 className="pillar-title">Devices &amp; Connectivity</h3>
              <p className="pillar-desc">
                Tell us about your computer lab, shared devices, connectivity and power constraints. Offline operation and synchronization need to be verified for your particular setup.
              </p>
            </div>
          </div>

          {/* Teacher Guidance Preview Block */}
          <div id="teachers" className="spotlight-grid schools" style={{
            background: "#ffffff",
            border: "1px solid var(--ui-line)",
            borderRadius: "var(--radius-lg)",
            padding: "48px 40px",
            boxShadow: "var(--shadow-card)",
            alignItems: "center"
          }}>
            <div>
              <span className="section-eyebrow section-eyebrow-green">Teacher Portal</span>
              <h2 style={{ fontSize: "32px", fontWeight: "800", color: "var(--ui-ink)", marginBottom: "16px" }}>
                Plan Classroom Use with Confidence
              </h2>
              <p style={{ fontSize: "16px", color: "var(--ui-ink-soft)", lineHeight: "1.6", marginBottom: "24px" }}>
                Explore how the educational approach could fit your class. The initial curriculum reference is Ghana Basic 4–6; confirm current lesson coverage, teacher tools and access with the team.
              </p>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "12px", marginBottom: "32px" }}>
                <li style={{ display: "flex", gap: "10px", fontSize: "15px", color: "var(--ui-ink)" }}>
                  <span style={{ color: "var(--ui-green)", fontWeight: "800" }} aria-hidden="true">✓</span>
                  <span>Discuss the learning needs and priorities in your class</span>
                </li>
                <li style={{ display: "flex", gap: "10px", fontSize: "15px", color: "var(--ui-ink)" }}>
                  <span style={{ color: "var(--ui-green)", fontWeight: "800" }} aria-hidden="true">✓</span>
                  <span>Ask how evidence of understanding is represented</span>
                </li>
                <li style={{ display: "flex", gap: "10px", fontSize: "15px", color: "var(--ui-green)", fontWeight: "700" }}>
                  <span aria-hidden="true">✓</span>
                  <span>Confirm reporting and parent communication options</span>
                </li>
              </ul>

              <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                <AccessLink role="teacher" 
                  className="btn btn-primary btn-lg"
                >
                  Teacher Access Guidance &rarr;
                </AccessLink>
                <Link href="/contact?inquiry=school-pilot" className="btn btn-outline btn-lg">
                  Ask About a School Pilot
                </Link>
              </div>
            </div>

            <div id="pilot" style={{ background: "var(--ui-blue-tint)", padding: "32px", borderRadius: "var(--radius-md)", border: "1px solid var(--ui-line)" }}>
              <h4 style={{ fontSize: "18px", fontWeight: "800", color: "var(--ui-brand)", marginBottom: "12px" }}>
                Discuss a School Pilot
              </h4>
              <p style={{ fontSize: "14px", color: "var(--ui-ink)", lineHeight: "1.6", marginBottom: "16px" }}>
                A pilot inquiry starts a discussion; it does not confirm a place or an active partnership. Share your needs so the following can be scoped:
              </p>
              <ul style={{ fontSize: "13.5px", color: "var(--ui-ink-soft)", lineHeight: "1.6", paddingLeft: "18px", marginBottom: "20px" }}>
                <li>Teacher orientation and classroom learning goals.</li>
                <li>Device, connectivity and account requirements.</li>
                <li>Available lessons and how progress could be evaluated.</li>
                <li>Support arrangements, timing and any costs.</li>
              </ul>
              <Link href="/contact?inquiry=school-pilot" className="btn btn-green" style={{ width: "100%" }}>
                Prepare a School Pilot Inquiry &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
