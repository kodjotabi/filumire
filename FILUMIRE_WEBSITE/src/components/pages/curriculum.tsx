import { CurriculumExplorer } from "@/components/CurriculumExplorer";
import Link from "next/link";
import { SITE_CONTENT } from "@/lib/content";

export const metadata = {
  title: "Curriculum Alignment | FILUMIRE",
  description: "Explore the initial Ghana Primary Basic 4–6 curriculum focus across Mathematics, English, Science and Computing, and ask about available lessons.",
};

export default function CurriculumPage() {
  const content = SITE_CONTENT.en;

  return (
    <>
      <section className="site-section site-section-alt" style={{ paddingBottom: "48px" }}>
        <div className="site-container">
          <div className="section-heading-center" style={{ marginBottom: "24px" }}>
            <span className="section-eyebrow">National Standards Alignment</span>
            <h1 className="section-title">Curriculum focus and planned coverage</h1>
            <p className="section-subtitle">
              FILUMIRE starts with the Ghana National Council for Curriculum and Assessment (NaCCA) Standards-Based Curriculum for Primary Basic 4 to Basic 6, as its initial educational reference. The subject summaries below describe planned educational scope. This public website does not provide a verified inventory of implemented lessons or claim complete curriculum coverage. Confirm lesson availability and languages before arranging access.
            </p>
          </div>
        </div>
      </section>

      <CurriculumExplorer locale="en" />
      {/* Subject Deep Dives */}
      <section className="site-section">
        <div className="site-container">
          <div style={{ display: "flex", flexDirection: "column", gap: "48px" }}>
            {/* Mathematics */}
            <div className="curriculum-split math" style={{
              background: "#ffffff",
              border: "1px solid var(--ui-line)",
              borderRadius: "var(--radius-lg)",
              padding: "40px",
              boxShadow: "var(--shadow-card)",
              alignItems: "center"
            }}>
              <div>
                <div style={{
                  width: "64px",
                  height: "64px",
                  background: "rgba(18, 179, 80, 0.12)",
                  borderRadius: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "16px"
                }}>
                  <img src="/icons/icon-mathematics.png" alt="Mathematics" style={{ width: "48px", height: "48px" }} />
                </div>
                <h2 style={{ fontSize: "28px", fontWeight: "800", color: "var(--ui-ink)", marginBottom: "8px" }}>
                  Mathematics
                </h2>
                <span className="section-eyebrow section-eyebrow-green" style={{ fontSize: "11px" }}>
                  Ghana NaCCA B4 &bull; B5 &bull; B6
                </span>
                <p style={{ fontSize: "14.5px", color: "var(--ui-ink-soft)", marginTop: "12px", lineHeight: "1.6" }}>
                  Building intuitive numerical reasoning, spatial awareness, and real-world problem-solving using local currency (Ghana Cedis), measurements, and community contexts.
                </p>
              </div>

              <div>
                <h4 style={{ fontSize: "15px", fontWeight: "700", textTransform: "uppercase", color: "var(--ui-brand)", letterSpacing: "0.5px", marginBottom: "16px" }}>
                  Curriculum Strands &amp; Subskills
                </h4>
                <div className="curriculum-strands">
                  <div style={{ background: "var(--filumire-bg)", padding: "16px", borderRadius: "var(--radius-sm)" }}>
                    <strong style={{ fontSize: "14px", color: "var(--ui-ink)" }}>Number &amp; Operations</strong>
                    <p style={{ fontSize: "13px", color: "var(--ui-ink-soft)", marginTop: "4px" }}>
                      Place value to 100,000, addition/subtraction algorithms, multi-digit multiplication, division with remainders.
                    </p>
                  </div>
                  <div style={{ background: "var(--filumire-bg)", padding: "16px", borderRadius: "var(--radius-sm)" }}>
                    <strong style={{ fontSize: "14px", color: "var(--ui-ink)" }}>Fractions &amp; Decimals</strong>
                    <p style={{ fontSize: "13px", color: "var(--ui-ink-soft)", marginTop: "4px" }}>
                      Unit fractions, equivalent fractions, comparing fractions, addition of like denominators, decimal notation.
                    </p>
                  </div>
                  <div style={{ background: "var(--filumire-bg)", padding: "16px", borderRadius: "var(--radius-sm)" }}>
                    <strong style={{ fontSize: "14px", color: "var(--ui-ink)" }}>Geometry &amp; Measurement</strong>
                    <p style={{ fontSize: "13px", color: "var(--ui-ink-soft)", marginTop: "4px" }}>
                      2D shapes, 3D solids, lines and angles, perimeter, area measurement, time, and mass.
                    </p>
                  </div>
                  <div style={{ background: "var(--filumire-bg)", padding: "16px", borderRadius: "var(--radius-sm)" }}>
                    <strong style={{ fontSize: "14px", color: "var(--ui-ink)" }}>Data Handling &amp; Probability</strong>
                    <p style={{ fontSize: "13px", color: "var(--ui-ink-soft)", marginTop: "4px" }}>
                      Tally charts, frequency tables, bar graphs, pictographs, and basic data interpretation.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* English Language */}
            <div className="curriculum-split math" style={{
              background: "#ffffff",
              border: "1px solid var(--ui-line)",
              borderRadius: "var(--radius-lg)",
              padding: "40px",
              boxShadow: "var(--shadow-card)",
              alignItems: "center"
            }}>
              <div>
                <div style={{
                  width: "64px",
                  height: "64px",
                  background: "rgba(11, 123, 255, 0.12)",
                  borderRadius: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "16px"
                }}>
                  <img src="/icons/icon-english.png" alt="English Language" style={{ width: "48px", height: "48px" }} />
                </div>
                <h2 style={{ fontSize: "28px", fontWeight: "800", color: "var(--ui-ink)", marginBottom: "8px" }}>
                  English Language
                </h2>
                <span className="section-eyebrow" style={{ fontSize: "11px" }}>
                  English Language Focus
                </span>
                <p style={{ fontSize: "14.5px", color: "var(--ui-ink-soft)", marginTop: "12px", lineHeight: "1.6" }}>
                  The educational focus includes phonics, grammar, composition, reading fluency and comprehension. The summaries here are not a complete inventory of available lessons.
                </p>
              </div>

              <div>
                <h4 style={{ fontSize: "15px", fontWeight: "700", textTransform: "uppercase", color: "var(--ui-brand)", letterSpacing: "0.5px", marginBottom: "16px" }}>
                  Curriculum Strands &amp; Subskills
                </h4>
                <div className="curriculum-strands">
                  <div style={{ background: "var(--filumire-bg)", padding: "16px", borderRadius: "var(--radius-sm)" }}>
                    <strong style={{ fontSize: "14px", color: "var(--ui-ink)" }}>Grammar &amp; Conventions</strong>
                    <p style={{ fontSize: "13px", color: "var(--ui-ink-soft)", marginTop: "4px" }}>
                      Nouns, pronouns, verbs, tenses, adjectives, prepositions, punctuation, and sentence construction.
                    </p>
                  </div>
                  <div style={{ background: "var(--filumire-bg)", padding: "16px", borderRadius: "var(--radius-sm)" }}>
                    <strong style={{ fontSize: "14px", color: "var(--ui-ink)" }}>Reading Comprehension</strong>
                    <p style={{ fontSize: "13px", color: "var(--ui-ink-soft)", marginTop: "4px" }}>
                      Identifying main ideas, literal and inferential questioning, predicting outcomes, character analysis.
                    </p>
                  </div>
                  <div style={{ background: "var(--filumire-bg)", padding: "16px", borderRadius: "var(--radius-sm)" }}>
                    <strong style={{ fontSize: "14px", color: "var(--ui-ink)" }}>Writing &amp; Composition</strong>
                    <p style={{ fontSize: "13px", color: "var(--ui-ink-soft)", marginTop: "4px" }}>
                      Descriptive paragraphs, friendly letters, narrative storytelling, and procedural writing.
                    </p>
                  </div>
                  <div style={{ background: "var(--filumire-bg)", padding: "16px", borderRadius: "var(--radius-sm)" }}>
                    <strong style={{ fontSize: "14px", color: "var(--ui-ink)" }}>Vocabulary &amp; Phonics</strong>
                    <p style={{ fontSize: "13px", color: "var(--ui-ink-soft)", marginTop: "4px" }}>
                      Synonyms, antonyms, prefixes, suffixes, compound words, and context clues.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Science & Computing Grid */}
            <div className="curriculum-pair">
              {/* Integrated Science */}
              <div style={{
                background: "#ffffff",
                border: "1px solid var(--ui-line)",
                borderRadius: "var(--radius-lg)",
                padding: "36px",
                boxShadow: "var(--shadow-card)"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px" }}>
                  <div style={{
                    width: "56px",
                    height: "56px",
                    background: "rgba(245, 154, 0, 0.12)",
                    borderRadius: "14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    <img src="/icons/icon-science.png" alt="Science" style={{ width: "42px", height: "42px" }} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: "22px", fontWeight: "800", color: "var(--ui-ink)" }}>Science</h3>
                    <span style={{ fontSize: "12px", color: "var(--ui-amber)", fontWeight: "700" }}>Living &amp; Physical Systems</span>
                  </div>
                </div>
                <p style={{ fontSize: "14px", color: "var(--ui-ink-soft)", lineHeight: "1.6", marginBottom: "16px" }}>
                  Encouraging scientific inquiry through local flora, fauna, environmental conservation, human body systems, forces, and weather observations.
                </p>
                <ul className="strand-list">
                  <li className="strand-item">Diversity of Matter (Materials &amp; States)</li>
                  <li className="strand-item">Cycles (Life Cycles of Plants &amp; Animals)</li>
                  <li className="strand-item">Systems (Digestive &amp; Circulatory Basics)</li>
                  <li className="strand-item">Energy &amp; Forces (Heat, Light, Sound)</li>
                </ul>
              </div>

              {/* Computing */}
              <div style={{
                background: "#ffffff",
                border: "1px solid var(--ui-line)",
                borderRadius: "var(--radius-lg)",
                padding: "36px",
                boxShadow: "var(--shadow-card)"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px" }}>
                  <div style={{
                    width: "56px",
                    height: "56px",
                    background: "rgba(132, 102, 220, 0.12)",
                    borderRadius: "14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    <img src="/icons/icon-computing.png" alt="Computing" style={{ width: "42px", height: "42px" }} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: "22px", fontWeight: "800", color: "var(--ui-ink)" }}>Computing</h3>
                    <span style={{ fontSize: "12px", color: "var(--ui-violet)", fontWeight: "700" }}>Digital Literacy &amp; Safety</span>
                  </div>
                </div>
                <p style={{ fontSize: "14px", color: "var(--ui-ink-soft)", lineHeight: "1.6", marginBottom: "16px" }}>
                  Empowering primary learners with fundamental digital knowledge, computer hardware awareness, desktop file management, and responsible digital habits.
                </p>
                <ul className="strand-list">
                  <li className="strand-item">Introduction to Computer Hardware &amp; OS</li>
                  <li className="strand-item">Productivity &amp; Word Processing</li>
                  <li className="strand-item">Data Processing &amp; File Management</li>
                  <li className="strand-item">Internet Basics &amp; Child Cyber Safety</li>
                </ul>
              </div>
            </div>
          </div>

          <div style={{ textAlign: "center", marginTop: "56px" }}>
            <Link href="/contact?inquiry=curriculum" className="btn btn-primary btn-lg">
              Ask About Curriculum &amp; Available Lessons &rarr;
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
