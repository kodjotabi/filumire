/*
 * Obligation checkout (Payments Phase 2, step 3, B2): starts a payment
 * attempt for an obligation. Amount, currency and description come from the
 * obligation only; the payer must own it. The store re-checks, atomically
 * with the attempt insert, that the obligation is open and unexpired and that
 * every beneficiary is still authorised. Initiation never proves payment.
 */
import { assertSandboxOnly, money, PaymentError } from "../../../packages/payments";
import type { PaymentRecorder, StartPaymentResult } from "../recorder";
import type { ObligationStore } from "./store";

export interface StartCheckoutRequest {
  /* From an authenticated context, never from a request body. */
  payerPrincipalId: string;
  /* Provider receipts only; never stored by FILUMIRE. */
  payerEmail: string;
  payerPhone?: string;
  obligationId: string;
  idempotencyKey: string;
}

export class ObligationCheckout {
  constructor(
    private readonly store: ObligationStore,
    private readonly recorder: PaymentRecorder,
  ) {}

  async start(request: StartCheckoutRequest): Promise<StartPaymentResult> {
    const obligation = typeof request?.obligationId === "string" ? await this.store.findObligation(request.obligationId) : null;
    if (!obligation || obligation.payerPrincipalId !== request.payerPrincipalId) {
      throw new PaymentError("OBLIGATION_NOT_FOUND", "Unknown payment obligation.");
    }
    assertSandboxOnly(obligation.mode, "checkouts");
    return this.recorder.startAttempt({
      idempotencyKey: request.idempotencyKey,
      obligationId: obligation.id,
      amount: money(obligation.amountMinor, obligation.currency),
      payer: { principalId: obligation.payerPrincipalId, email: request.payerEmail, phone: request.payerPhone },
      description: obligation.productLabel,
    });
  }
}
