
import { NextResponse } from "next/server";
import crypto from "crypto";
import Razorpay from "razorpay";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!keyId || !keySecret || !supabaseUrl || !anonKey || !serviceKey) {
      return NextResponse.json(
        { error: "Server configuration missing hai." },
        { status: 500 }
      );
    }

    // Authenticate logged-in user
    const authHeader = req.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Login required hai." },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7).trim();

    const authClient = createClient(supabaseUrl, anonKey);

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Login session invalid hai." },
        { status: 401 }
      );
    }

    // Read payment details
    const body = await req.json();

    const paymentId = body.razorpay_payment_id;
    const subscriptionId = body.razorpay_subscription_id;
    const signature = body.razorpay_signature;

    if (
      typeof paymentId !== "string" ||
      typeof subscriptionId !== "string" ||
      typeof signature !== "string"
    ) {
      return NextResponse.json(
        { error: "Payment details missing hain." },
        { status: 400 }
      );
    }

    // Verify Razorpay signature
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${paymentId}|${subscriptionId}`)
      .digest("hex");

    const expected = Buffer.from(expectedSignature, "hex");
    const received = Buffer.from(signature, "hex");

    if (
      expected.length !== received.length ||
      !crypto.timingSafeEqual(expected, received)
    ) {
      return NextResponse.json(
        { error: "Payment signature invalid hai." },
        { status: 400 }
      );
    }

    // Fetch subscription directly from Razorpay
    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const subscription =
      await razorpay.subscriptions.fetch(subscriptionId);

    // Verify subscription belongs to this user
    if (subscription.notes?.supabase_user_id !== user.id) {
      return NextResponse.json(
        { error: "Subscription user mismatch." },
        { status: 403 }
      );
    }

    const status = subscription.status;

    if (!["active", "authenticated"].includes(status)) {
      return NextResponse.json(
        {
          error: `Subscription abhi ${status} status mein hai. Activation confirm hone ka wait karein.`,
        },
        { status: 409 }
      );
    }

    // Save subscription using server-only service role key
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const periodEnd = subscription.current_end
      ? new Date(subscription.current_end * 1000).toISOString()
      : null;

    const { error: dbError } = await admin
      .from("subscriptions")
      .upsert(
        {
          user_id: user.id,
          plan: "pro",
          status: status === "active" ? "active" : "pending",
          razorpay_subscription_id: subscriptionId,
          current_period_end: periodEnd,
        },
        { onConflict: "user_id" }
      );

    if (dbError) {
      console.error("Subscription database error:", dbError.message);

      return NextResponse.json(
        { error: "Payment verified, lekin database update nahi hua." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      verified: true,
      plan: "pro",
      status: status === "active" ? "active" : "pending",
      message: "Payment signature verified and subscription saved.",
    });

  } catch (error) {
    console.error("Payment verification error:", error);

    return NextResponse.json(
      { error: "Payment verification failed. Server logs check karein." },
      { status: 500 }
    );
  }
}
