
import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!webhookSecret || !supabaseUrl || !serviceRoleKey) {
      console.error("Webhook environment configuration missing");
      return NextResponse.json(
        { error: "Server configuration missing hai." },
        { status: 500 }
      );
    }

    const signature = req.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Webhook signature missing hai." },
        { status: 400 }
      );
    }

    // Signature ko raw request body se verify karein.
    const rawBody = await req.text();

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    const received = Buffer.from(signature, "hex");
    const expected = Buffer.from(expectedSignature, "hex");

    if (
      received.length !== expected.length ||
      !crypto.timingSafeEqual(received, expected)
    ) {
      return NextResponse.json(
        { error: "Webhook signature invalid hai." },
        { status: 400 }
      );
    }

    const event = JSON.parse(rawBody);
    const subscription = event.payload?.subscription?.entity;
    const subscriptionId = subscription?.id;

    // Sirf relevant subscription events process karein.
    const statusByEvent: Record<string, string> = {
      "subscription.activated": "active",
      "subscription.charged": "active",
      "subscription.authenticated": "active",
      "subscription.pending": "inactive",
      "subscription.halted": "halted",
      "subscription.cancelled": "cancelled",
      "subscription.completed": "completed",
      "subscription.paused": "inactive",
      "subscription.resumed": "active",
    };

    const newStatus = statusByEvent[event.event];

    if (!newStatus || !subscriptionId) {
      return NextResponse.json({ received: true });
    }

    // Database mein sirf matching Razorpay subscription update karein.
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: existing, error: lookupError } = await supabase
      .from("subscriptions")
      .select("id, plan")
      .eq("razorpay_subscription_id", subscriptionId)
      .maybeSingle();

    if (lookupError) {
      console.error("Subscription lookup failed:", lookupError.message);
      return NextResponse.json(
        { error: "Subscription lookup failed." },
        { status: 500 }
      );
    }

    // Unknown subscription ko automatically create/activate na karein.
    if (!existing) {
      console.warn("Unmatched Razorpay subscription event:", event.event);
      return NextResponse.json({ received: true });
    }

    const currentEnd = subscription?.current_end;
    const currentPeriodEnd =
      typeof currentEnd === "number"
        ? new Date(currentEnd * 1000).toISOString()
        : null;

    const updateData: {
      status: string;
      updated_at: string;
      current_period_end?: string | null;
    } = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    if (currentPeriodEnd) {
      updateData.current_period_end = currentPeriodEnd;
    }

    const { error: updateError } = await supabase
      .from("subscriptions")
      .update(updateData)
      .eq("razorpay_subscription_id", subscriptionId);

    if (updateError) {
      console.error("Subscription update failed:", updateError.message);
      return NextResponse.json(
        { error: "Subscription update failed." },
        { status: 500 }
      );
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook processing failed:", error);
    return NextResponse.json(
      { error: "Webhook request process nahi hui." },
      { status: 400 }
    );
  }
}
