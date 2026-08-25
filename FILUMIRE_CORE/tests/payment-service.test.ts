import type {
  PaymentAdapter,
  PaymentRequest,
} from "../packages/payments";

import {
  PaymentService,
} from "../services/payments";

class MockPaymentAdapter
  implements PaymentAdapter
{
  async initializePayment(
    request: PaymentRequest,
  ) {
    return {
      provider: "paystack" as const,
      reference: request.reference,
      status: "pending" as const,
      checkoutUrl:
        "https://example.test/checkout",
    };
  }

  async verifyPayment(
    reference: string,
  ) {
    return {
      provider: "paystack" as const,
      reference,
      status: "successful" as const,
    };
  }
}

async function run(): Promise<void> {
  const service =
    new PaymentService(
      new MockPaymentAdapter(),
    );

  const payment =
    await service.initializePayment({
      learnerId: "learner-payment-test-001",
      amount: 100,
      currency: "GHS",
      reference: "FILUMIRE-TEST-001",
      description:
        "FILUMIRE learning subscription",
    });

  if (
    payment.status !== "pending" ||
    payment.reference !==
      "FILUMIRE-TEST-001"
  ) {
    throw new Error(
      "Payment initialization test failed.",
    );
  }

  const verification =
    await service.verifyPayment(
      "FILUMIRE-TEST-001",
    );

  if (
    verification.status !==
      "successful" ||
    verification.reference !==
      "FILUMIRE-TEST-001"
  ) {
    throw new Error(
      "Payment verification test failed.",
    );
  }

  console.log({
    paymentService: "PASS",
    initialization: payment.status,
    verification:
      verification.status,
  });
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});