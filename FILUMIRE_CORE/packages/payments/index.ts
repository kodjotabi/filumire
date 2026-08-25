export type PaymentProvider =
  | "paystack"
  | "flutterwave";

export type PaymentStatus =
  | "pending"
  | "successful"
  | "failed"
  | "cancelled";

export interface PaymentRequest {
  learnerId: string;
  amount: number;
  currency: string;
  reference: string;
  description: string;
}

export interface PaymentResponse {
  provider: PaymentProvider;
  reference: string;
  status: PaymentStatus;
  checkoutUrl?: string;
}

export interface PaymentAdapter {
  initializePayment(
    request: PaymentRequest,
  ): Promise<PaymentResponse>;

  verifyPayment(
    reference: string,
  ): Promise<PaymentResponse>;
}