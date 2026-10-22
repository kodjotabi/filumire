import Link from "next/link";
import { AccessLink } from "@/components/AccessLink";
import { PORTAL_URLS, type PortalRole } from "@/lib/constants";

export const metadata = { title: "Learner, Parent & Teacher Access | FILUMIRE", description: "Find the right FILUMIRE access route for learners, families and teachers, or ask about joining." };
const roles: { id: PortalRole; title: string; intro: string; inquiry: string }[] = [
  { id: "learner", title: "For learners", intro: "Use the sign-in link provided by your parent, guardian or school. If you do not yet have access, an adult can ask about the options for your class or family.", inquiry: "learner-access" },
  { id: "parent", title: "For parents & guardians", intro: "Ask about learning support for your child, available subjects and family access. Your school may provide its own invitation or sign-in instructions.", inquiry: "family" },
  { id: "teacher", title: "For teachers", intro: "Ask about classroom use, available teacher tools and a school demonstration. Confirm the current scope with the FILUMIRE team before planning a classroom rollout.", inquiry: "teacher" },
];
export default function AccessPage() {
  return <>
    <section className="site-section site-section-alt"><div className="site-container section-heading-center">
      <span className="section-eyebrow">Your next step</span><h1 className="section-title">Access FILUMIRE</h1>
      <p className="section-subtitle">Choose the guidance for you. This public website introduces FILUMIRE; learner accounts and learning sessions belong to the separate learning platform.</p>
    </div></section>
    <section className="site-section"><div className="site-container">
      <div className="access-grid">{roles.map(role => <article id={role.id} className="audience-card" key={role.id}>
        <h2 className="audience-title">{role.title}</h2><p className="audience-tagline">{role.intro}</p>
        {PORTAL_URLS[role.id] ? <AccessLink role={role.id} className="btn btn-primary">{role.id === "learner" ? "Open learner sign in" : role.id === "parent" ? "Open parent portal" : "Open teacher portal"} &rarr;</AccessLink> : <p className="access-note">{role.id === "learner" ? "A public learner sign-in link has not been approved. Use your existing invitation, or ask an adult to prepare an access inquiry." : role.id === "parent" ? "A public parent portal has not been approved. Use your existing invitation, or prepare an inquiry about family access." : "A public teacher portal has not been approved. Use your existing invitation, or prepare an inquiry about classroom access."}</p>}
        <Link href={"/contact?inquiry=" + role.inquiry} className="btn btn-outline">{role.id === "learner" ? "Ask about learner access" : role.id === "parent" ? "Ask about parent access" : "Ask about teacher access"} &rarr;</Link>
      </article>)}</div>
      <div className="info-panel"><h2>Parent subscriptions</h2><p>Explore provisional plans and manage your parent account. Development uses Paystack test payments only.</p><div className="action-row"><Link href="/pricing" className="btn btn-primary">Provisional subscription plans</Link><Link href="/account" className="btn btn-outline">Parent account and billing</Link></div></div>
      <div className="info-panel"><h2>Schools and organisations</h2><p>Explore the educational approach and share your needs before arranging access. Institutional pricing and access terms are agreed through the existing schools enquiry pathway.</p><div className="action-row"><Link href="/for-schools#pilot" className="btn btn-primary">School pilot information</Link><Link href="/partners" className="btn btn-outline">Potential partnerships</Link></div></div>
    </div></section>
  </>;
}
