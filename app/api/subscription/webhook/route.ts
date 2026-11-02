
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import Razorpay from "razorpay";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
    const keyId = process.env.RAZORPAY_KEY_ID?.trim();
    const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

    if (!webhookSecret || !keyId || !keySecret || !supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: "Missing server environment variables." },
        { status: 500 }
      );
    }

    if (!keyId.startsWith("rzp_live_")) {
      return NextResponse.json(
        { error: "Live Razorpay keys required." },
        { status: 403 }
      );
    }

    // Verify webhook signature using the original request body.
    const body = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    if (!signature || !/^[a-fA-F0-9]{64}$/.test(signature)) {
      return NextResponse.json(
        { error: "Missing or invalid webhook signature." },
        { status: 400 }
      );
    }

    const expected = crypto
      .createHmac("sha256", webhookSecret)
      .update(body)
      .digest("hex");

    const expectedBuffer = Buffer.from(expected, "hex");
    const receivedBuffer = Buffer.from(signature, "hex");

    if (
      expectedBuffer.length !== receivedBuffer.length ||
      !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
      return NextResponse.json(
        { error: "Invalid webhook signature." },
        { status: 400 }
      );
    }

    const event = JSON.parse(body);
    const entity = event.payload?.subscription?.entity;

    if (!entity?.id) {
      return NextResponse.json({ received: true });
    }

    const supportedEvents = [
      "subscription.authenticated",
      "subscription.activated",
      "subscription.charged",
      "subscription.resumed",
      "subscription.paused",
      "subscription.pending",
      "subscription.halted",
      "subscription.cancelled",
      "subscription.completed",
    ];

    if (!supportedEvents.includes(event.event)) {
      return NextResponse.json({ received: true });
    }

    const userId = entity.notes?.supabase_user_id;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID missing in subscription notes." },
        { status: 400 }
      );
    }

    // Verify subscription directly against the Live Razorpay account.
    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const liveSubscription = await razorpay.subscriptions.fetch(entity.id);

    if (
      liveSubscription.id !== entity.id ||
      liveSubscription.notes?.supabase_user_id !== userId
    ) {
      return NextResponse.json(
        { error: "Live subscription verification failed." },
        { status: 403 }
      );
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Prevent an old subscription from overwriting a newer one.
    const { data: existing, error: readError } = await admin
      .from("subscriptions")
      .select("razorpay_subscription_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (readError) {
      console.error("Subscription lookup error:", readError);
      return NextResponse.json(
        { error: "Subscription lookup failed." },
        { status: 500 }
      );
    }

    if (
      existing?.razorpay_subscription_id &&
      existing.razorpay_subscription_id !== entity.id
    ) {
      return NextResponse.json({
        received: true,
        ignored: true,
        reason: "A different subscription is already recorded.",
      });
    }

    const periodEnd = liveSubscription.current_end
      ? new Date(liveSubscription.current_end * 1000).toISOString()
      : null;

    // Save the actual Razorpay status.
    // Dashboard should grant Pro only when status is "active".
    const actualStatus = liveSubscription.status;

    const { error: dbError } = await admin
      .from("subscriptions")
      .upsert(
        {
          user_id: userId,
          plan: "pro",
          status: actualStatus,
          razorpay_subscription_id: entity.id,
          current_period_end: periodEnd,
          razorpay_mode: "live",
        },
        { onConflict: "user_id" }
      );

    if (dbError) {
      console.error("Subscription webhook database error:", dbError);
      return NextResponse.json(
        { error: "Database update failed." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      received: true,
      status: actualStatus,
    });
  } catch (error) {
    console.error("Razorpay webhook error:", error);

    return NextResponse.json(
      { error: "Webhook processing failed." },
      { status: 500 }
    );
  }
}
