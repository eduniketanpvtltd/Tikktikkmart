import type Razorpay from "razorpay";
import type { Orders } from "razorpay/dist/types/orders";

type OrderGateway = Pick<Razorpay["orders"], "all" | "create">;

export async function createOrRecoverGatewayOrder(gateway: OrderGateway, order: { id: string; user_id: string; order_no: number }, amount: number, mayCreate: boolean) {
  const receipt = `TTM-${order.order_no}`;
  const matches = (candidate: Orders.RazorpayOrder) =>
    candidate.receipt === receipt && candidate.notes?.order_id === order.id;
  const recover = async (scanRecent: boolean) => {
    const list = await gateway.all({ receipt, count: 10 });
    const match = list.items.find(matches);
    if (match || !scanRecent) return match;
    // Some newly created orders appear in the recent list before receipt lookup is consistent.
    return (await gateway.all({ count: 30 })).items.find(matches);
  };

  let result = await recover(!mayCreate);
  if (!result && !mayCreate) throw new Error("Gateway order creation is still being reconciled");
  if (!result) {
    try {
      result = await gateway.create({ amount, currency: "INR", receipt, notes: { order_id: order.id, user_id: order.user_id } });
    } catch (error) {
      // The gateway may have accepted the create request even if its response was lost.
      for (const delay of [0, 200, 500, 1000]) {
        if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
        result = await recover(true).catch(() => undefined);
        if (result) break;
      }
      if (!result) throw error;
    }
  }
  if (Number(result.amount) !== amount || result.currency !== "INR") throw new Error("Gateway order total mismatch");
  return result;
}
