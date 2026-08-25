import {
  createPaymentService,
} from "../services/payments";

process.env.PAYSTACK_SECRET_KEY =
  "test-secret-key";

const service =
  createPaymentService();

if (!service) {
  throw new Error(
    "Payment service creation failed.",
  );
}

console.log({
  paymentServiceConfiguration:
    "PASS",
});