
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!secret || !supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: "Missing server environment variables" },
        { status: 500 }
      );
    }

    const body = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    const expected = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(signature, "hex");

    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(body);
    const entity = event.payload?.subscription?.entity;

    if (!entity) {
      return NextResponse.json({ received: true });
    }

    const userId = entity.notes?.supabase_user_id;

    if (!userId) {
      return NextResponse.json({ error: "User ID missing in notes" }, { status: 400 });
    }

    const activeEvents = [
      "subscription.activated",
      "subscription.charged",
      "subscription.resumed",
    ];

    const inactiveEvents = [
      "subscription.cancelled",
      "subscription.halted",
      "subscription.completed",
      "subscription.paused",
      "subscription.pending",
    ];

    if (!activeEvents.includes(event.event) && !inactiveEvents.includes(event.event)) {
      return NextResponse.json({ received: true });
    }

    const isActive = activeEvents.includes(event.event) && entity.status === "active";

    const supabase = createClient(supabaseUrl, serviceKey);

    const { error } = await supabase.from("subscriptions").upsert(
      {
        user_id: userId,
        plan: "pro",
        status: isActive ? "active" : entity.status || "pending",
        razorpay_subscription_id: entity.id,
        current_period_end: entity.current_end
          ? new Date(entity.current_end * 1000).toISOString()
          : null,
      },
      { onConflict: "user_id" }
    );

    if (error) {
      console.error("Subscription webhook database error:", error);
      return NextResponse.json({ error: "Database update failed" }, { status: 500 });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Razorpay webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
