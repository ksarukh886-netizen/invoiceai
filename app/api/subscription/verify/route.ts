
import { NextResponse } from "next/server";
import crypto from "crypto";
import Razorpay from "razorpay";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID?.trim();
    const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const anonKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

    if (!keyId || !keySecret || !supabaseUrl || !anonKey || !serviceKey) {
      return NextResponse.json(
        { error: "Server configuration missing hai." },
        { status: 500 }
      );
    }

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

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const subscription =
      await razorpay.subscriptions.fetch(subscriptionId);

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
          verified: true,
          status,
          message: `Payment verified. Subscription status: ${status}. Activation ka wait karein.`,
        },
        { status: 200 }
      );
    }

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
      console.error("Subscription database error:", {
        message: dbError.message,
        code: dbError.code,
        details: dbError.details,
        hint: dbError.hint,
      });

      return NextResponse.json(
        {
          error: "Database update failed.",
          databaseError: dbError.message,
          databaseCode: dbError.code,
          databaseDetails: dbError.details,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      verified: true,
      plan: "pro",
      status: status === "active" ? "active" : "pending",
      message: "Payment verified and subscription saved successfully.",
    });
  } catch (error: unknown) {
    const err = error as {
      message?: string;
      error?: { description?: string };
    };

    console.error("Payment verification error:", err);

    return NextResponse.json(
      {
        error:
          err.error?.description ||
          err.message ||
          "Payment verification failed.",
      },
      { status: 500 }
    );
  }
}
