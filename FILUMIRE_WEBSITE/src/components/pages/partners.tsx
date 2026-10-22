import Link from "next/link";
export const metadata = { title: "Potential Partners | FILUMIRE", description: "Explore conversations about curriculum, educational research and responsible school implementation with FILUMIRE." };
const areas = [
  { title: "Curriculum & teaching", text: "Discuss curriculum mapping, culturally relevant examples, language needs and review by educators. The initial educational focus is Ghana Primary Basic 4–6." },
  { title: "Schools & implementation", text: "Share classroom goals, learner age groups, device availability and connectivity constraints so a potential pilot can be scoped realistically." },
  { title: "Research & evaluation", text: "Discuss questions about independent understanding, retention and transfer, and the evidence needed to evaluate learning responsibly." },
];
export default function PartnersPage() { return <>
  <section className="site-section site-section-alt"><div className="site-container section-heading-center"><span className="section-eyebrow">Potential partnerships</span><h1 className="section-title">Help shape learning that understands</h1><p className="section-subtitle">For educators, curriculum specialists, researchers and organisations interested in African primary education.</p></div></section>
  <section className="site-section"><div className="site-container"><div className="benefits-grid">{areas.map(area => <article className="audience-card" key={area.title}><h2 className="audience-title">{area.title}</h2><p>{area.text}</p></article>)}</div>
    <div className="info-panel"><h2>Start a conversation</h2><p>Tell us who you represent, the educational need you are addressing, your location and the contribution you have in mind. No partnership, accreditation or pilot place is implied by this invitation.</p><div className="action-row"><Link href="/contact?inquiry=partnership" className="btn btn-primary">Prepare a partnership inquiry &rarr;</Link><Link href="/curriculum" className="btn btn-outline">Explore the curriculum focus</Link></div></div>
  </div></section>
</>; }
