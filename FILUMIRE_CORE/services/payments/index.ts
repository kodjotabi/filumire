import type {
  PaymentAdapter,
  PaymentRequest,
  PaymentResponse,
} from "../../packages/payments";

import {
  PaystackAdapter,
} from "./paystack";

export class PaymentService {
  constructor(
    private readonly adapter: PaymentAdapter,
  ) {}

  async initializePayment(
    request: PaymentRequest,
  ): Promise<PaymentResponse> {
    return this.adapter.initializePayment(
      request,
    );
  }

  async verifyPayment(
    reference: string,
  ): Promise<PaymentResponse> {
    return this.adapter.verifyPayment(
      reference,
    );
  }
}

export function createPaymentService(): PaymentService {
  const secretKey =
    process.env.PAYSTACK_SECRET_KEY;

  if (
    !secretKey ||
    secretKey === "your_paystack_secret_key"
  ) {
    throw new Error(
      "PAYSTACK_SECRET_KEY is not configured.",
    );
  }

  return new PaymentService(
    new PaystackAdapter(secretKey),
  );
}