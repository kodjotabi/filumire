import type {
  PaymentAdapter,
  PaymentRequest,
  PaymentResponse,
} from "../../../packages/payments";

export class PaystackAdapter
  implements PaymentAdapter
{
  private readonly secretKey: string;

  constructor(secretKey: string) {
    this.secretKey = secretKey;
  }

  async initializePayment(
    request: PaymentRequest,
  ): Promise<PaymentResponse> {
    const response = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: `${request.learnerId}@filumire.local`,
          amount: Math.round(
            request.amount * 100,
          ),
          currency: request.currency,
          reference: request.reference,
          metadata: {
            learnerId:
              request.learnerId,
            description:
              request.description,
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Paystack initialization failed: ${response.status}`,
      );
    }

    const data = await response.json();

    if (!data.status || !data.data) {
      throw new Error(
        "Invalid Paystack initialization response.",
      );
    }

    return {
      provider: "paystack",
      reference:
        data.data.reference,
      status: "pending",
      checkoutUrl:
        data.data.authorization_url,
    };
  }

  async verifyPayment(
    reference: string,
  ): Promise<PaymentResponse> {
    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(
        `Paystack verification failed: ${response.status}`,
      );
    }

    const data = await response.json();

    if (!data.status || !data.data) {
      throw new Error(
        "Invalid Paystack verification response.",
      );
    }

    const status =
      data.data.status === "success"
        ? "successful"
        : data.data.status === "failed"
          ? "failed"
          : "pending";

    return {
      provider: "paystack",
      reference:
        data.data.reference,
      status,
    };
  }
}