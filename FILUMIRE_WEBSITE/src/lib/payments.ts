/** Subscriptions and pricing stay hidden from the public website until payments are live (owner decision, 27 Oct 2026). */
export function paymentsLive(): boolean {
  return process.env.NEXT_PUBLIC_FILUMIRE_PAYMENTS_LIVE === "true";
}
