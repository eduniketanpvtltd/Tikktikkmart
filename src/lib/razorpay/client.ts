import crypto from "crypto";
import Razorpay from "razorpay";

let instance: Razorpay | null = null;

export function getRazorpay(): Razorpay {
  if (!instance) {
    instance = new Razorpay({
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });
  }
  return instance;
}

/**
 * Returns amount in paise. When NEXT_PUBLIC_RAZORPAY_TEST_ONE_RUPEE=true,
 * passes 100 paise (₹1) to Razorpay in test mode.
 */
export function toRazorpayPaise(grandTotalInr: number): number {
  if (process.env.NEXT_PUBLIC_RAZORPAY_TEST_ONE_RUPEE === "true") {
    return 100;
  }
  return Math.max(100, Math.round(grandTotalInr * 100));
}

export function verifyRazorpayPaymentSignature(params: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${params.razorpayOrderId}|${params.razorpayPaymentId}`)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(params.razorpaySignature));
}

export function verifyRazorpayWebhookSignature(body: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

