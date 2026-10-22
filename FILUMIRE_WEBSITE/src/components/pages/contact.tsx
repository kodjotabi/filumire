import { ContactInquiry } from "@/components/ContactInquiry";

export const metadata = {
  title: "Contact | FILUMIRE",
  description: "Send a message to FILUMIRE.",
};

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ inquiry?: string | string[] }> }) {
  return <>
    <section className="site-section site-section-alt">
      <div className="site-container section-heading-center">
        <span className="section-eyebrow">Get in touch</span>
        <h1 className="section-title">Contact FILUMIRE</h1>
      </div>
    </section>
    <section className="site-section">
      <div className="site-container">
        <ContactInquiry locale="en" />
      </div>
    </section>
  </>;
}
