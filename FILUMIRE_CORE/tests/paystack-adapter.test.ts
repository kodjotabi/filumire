import {
  PaystackAdapter,
} from "../services/payments/paystack";

const adapter =
  new PaystackAdapter(
    "test-secret-key",
  );

const originalFetch =
  globalThis.fetch;

globalThis.fetch = async (
  input,
  init,
) => {
  const url = String(input);

  if (
    url.includes(
      "/transaction/initialize",
    )
  ) {
    return new Response(
      JSON.stringify({
        status: true,
        data: {
          reference:
            "FILUMIRE-TEST-001",
          authorization_url:
            "https://example.test/pay",
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type":
            "application/json",
        },
      },
    );
  }

  if (
    url.includes(
      "/transaction/verify/",
    )
  ) {
    return new Response(
      JSON.stringify({
        status: true,
        data: {
          reference:
            "FILUMIRE-TEST-001",
          status: "success",
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type":
            "application/json",
        },
      },
    );
  }

  throw new Error(
    `Unexpected fetch URL: ${url}`,
  );
};

async function run(): Promise<void> {
  const initialized =
    await adapter.initializePayment({
      learnerId:
        "learner-payment-test-001",
      amount: 100,
      currency: "GHS",
      reference:
        "FILUMIRE-TEST-001",
      description:
        "FILUMIRE learning subscription",
    });

  if (
    initialized.provider !==
      "paystack" ||
    initialized.status !==
      "pending" ||
    initialized.reference !==
      "FILUMIRE-TEST-001" ||
    !initialized.checkoutUrl
  ) {
    throw new Error(
      "Paystack initialization test failed.",
    );
  }

  const verified =
    await adapter.verifyPayment(
      "FILUMIRE-TEST-001",
    );

  if (
    verified.provider !==
      "paystack" ||
    verified.status !==
      "successful" ||
    verified.reference !==
      "FILUMIRE-TEST-001"
  ) {
    throw new Error(
      "Paystack verification test failed.",
    );
  }

  console.log({
    paystackAdapter:
      "PASS",
    initialization:
      initialized.status,
    verification:
      verified.status,
  });

  globalThis.fetch =
    originalFetch;
}

run().catch((error) => {
  globalThis.fetch =
    originalFetch;
  console.error(error);
  process.exit(1);
});