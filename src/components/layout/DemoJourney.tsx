import Link from "next/link";

const DEMO_STEPS = [
  {
    label: "1. Search",
    href: "/",
    description: "Find Jordan Ellis or FM-P7K2-9X4M",
  },
  {
    label: "2. Match",
    href: "/match/FM-P7K2-9X4M?q=Jordan%20Ellis",
    description: "Confirm the identity match",
  },
  {
    label: "3. Verify",
    href: "/identity/FM-P7K2-9X4M/verify",
    description: "Submit identity evidence",
  },
  {
    label: "4. Admin",
    href: "/admin",
    description: "Approve pending reviews",
  },
  {
    label: "5. Public profile",
    href: "/v/FM-P7K2-9X4M",
    description: "View QR verification page",
  },
];

export function DemoJourney() {
  return (
    <section className="mb-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Guided demo journey</h2>
      <p className="mt-1 text-sm text-slate-600">
        Click through the full Phase 0 MVP flow using seeded demo data.
      </p>
      <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {DEMO_STEPS.map((step) => (
          <li key={step.href}>
            <Link
              href={step.href}
              className="block rounded-xl border border-slate-200 p-4 transition hover:border-blue-300 hover:bg-blue-50/50"
            >
              <p className="font-medium text-slate-900">{step.label}</p>
              <p className="mt-1 text-sm text-slate-600">{step.description}</p>
            </Link>
          </li>
        ))}
      </ol>
      <Link
        href="/identity/FM-P7K2-9X4M/monitor"
        className="mt-4 inline-block text-sm font-medium text-blue-600 hover:underline"
      >
        Or jump to Monitor dashboard →
      </Link>
    </section>
  );
}
