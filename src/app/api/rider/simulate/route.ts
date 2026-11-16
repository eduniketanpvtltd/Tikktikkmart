import { db } from "@/lib/supabase/server";
import { fail, ok, withAuth } from "@/lib/auth/withAuth";

export const POST = withAuth(null, async (_req, { user }) => {
  // Ensure rider profile exists
  const { data: profile } = await db.from("rider_profiles").select("*").eq("user_id", user.id).maybeSingle();
  if (!profile) {
    // Auto-create approved profile for smooth testing
    await db.from("rider_profiles").insert({
      user_id: user.id,
      name: user.name || "Vikram Singh",
      phone: (user as any).phone || "+91 98765 43210",
      vehicle_type: "scooter",
      vehicle_no: "WB 02 EN 4592",
      kyc_status: "approved",
      is_online: true,
      current_lat: 22.5726,
      current_lng: 88.3639,
    });
  } else if (profile.kyc_status !== "approved" || !profile.is_online) {
    await db.from("rider_profiles").update({ kyc_status: "approved", is_online: true }).eq("user_id", user.id);
  }

  // Find any existing order packed or confirmed without a rider
  let { data: order } = await db
    .from("orders")
    .select("id, order_no, status, store_id")
    .is("rider_id", null)
    .not("status", "in", '("delivered","cancelled")')
    .order("placed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!order) {
    // Create an instant test order for simulation
    const testStoreId = "11111111-1111-1111-1111-111111111111";
    const orderNo = Math.floor(1000 + Math.random() * 9000);
    const { data: newOrder, error: ordErr } = await db
      .from("orders")
      .insert({
        customer_id: user.id,
        store_id: testStoreId,
        order_no: orderNo,
        status: "packed",
        payment_method: "online",
        subtotal: 180,
        delivery_fee: 0,
        grand_total: 195,
        delivery_otp: "4289",
        pickup_code: "1055",
        address_snapshot: {
          receiver_name: "Rahul Sharma",
          receiver_phone: "+91 98301 23456",
          line1: "Flat 4B, Park Mansions, Park Street",
          city: "Kolkata",
          landmark: "Near Oxford Bookstore",
          lat: 22.5532,
          lng: 88.3512,
        },
      })
      .select("id, order_no, status, store_id")
      .single();

    if (ordErr || !newOrder) return fail(ordErr?.message || "Failed to create test order", 500);
    order = newOrder;

    // Add dummy item
    await db.from("order_items").insert({
      order_id: newOrder.id,
      name_snapshot: "Amul Pasteurised Butter & Bread",
      label_snapshot: "500g + 400g Pack",
      quantity: 1,
      unit_price: 180,
      total_price: 180,
    });
  }

  // Clear any old active offers for this rider
  await db.from("rider_assignments").delete().eq("rider_id", user.id).eq("status", "offered");

  // Create new active assignment offer
  const { data: assignment, error: assignErr } = await db
    .from("rider_assignments")
    .insert({
      order_id: order.id,
      rider_id: user.id,
      status: "offered",
      payout: 65,
    })
    .select("*")
    .single();

  if (assignErr) return fail(assignErr.message, 500);

  return ok({ success: true, assignment, orderNo: order.order_no });
});
