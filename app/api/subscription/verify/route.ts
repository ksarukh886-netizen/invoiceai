import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (
      !razorpayKeyId ||
      !razorpayKeySecret ||
      !supabaseUrl ||
      !supabaseAnonKey ||
      !serviceRoleKey
    ) {
      return NextResponse.json(
        { error: "Server environment variables missing" },
        { status: 500 }
      );
    }

    if (!razorpayKeyId.startsWith("rzp_live_")) {
      return NextResponse.json(
        { error: "Live Razorpay keys are required" },
        { status: 400 }
      );
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);

    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { error: "Invalid user session" },
        { status: 401 }
      );
    }

    const body = await req.json();

    const {
      razorpay_payment_id,
      razorpay_subscription_id,
      razorpay_signature,
    } = body;

    if (
      !razorpay_payment_id ||
      !razorpay_subscription_id ||
      !razorpay_signature
    ) {
      return NextResponse.json(
        { error: "Payment details missing" },
        { status: 400 }
      );
    }

    const generatedSignature = crypto
      .createHmac("sha256", razorpayKeySecret)
      .update(`${razorpay_payment_id}|${razorpay_subscription_id}`)
      .digest("hex");

    const signatureBuffer = Buffer.from(generatedSignature);
    const receivedBuffer = Buffer.from(razorpay_signature);

    if (
      signatureBuffer.length !== receivedBuffer.length ||
      !crypto.timingSafeEqual(signatureBuffer, receivedBuffer)
    ) {
      return NextResponse.json(
        { error: "Invalid payment signature" },
        { status: 400 }
      );
    }

    const razorpayResponse = await fetch(
      `https://api.razorpay.com/v1/subscriptions/${razorpay_subscription_id}`,
      {
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString(
              "base64"
            ),
        },
        cache: "no-store",
      }
    );

    const subscription = await razorpayResponse.json();

    if (!razorpayResponse.ok) {
      console.error("Razorpay fetch error:", subscription);

      return NextResponse.json(
        { error: "Could not verify Razorpay subscription" },
        { status: 400 }
      );
    }

    if (
      subscription.id !== razorpay_subscription_id ||
      subscription.notes?.supabase_user_id !== user.id
    ) {
      return NextResponse.json(
        { error: "Subscription does not belong to this user" },
        { status: 403 }
      );
    }

    if (subscription.status !== "active") {
      return NextResponse.json({
        success: true,
        status: subscription.status,
        message: "Payment received. Pro will activate once subscription becomes active.",
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const currentPeriodEnd = subscription.current_end
      ? new Date(subscription.current_end * 1000).toISOString()
      : null;

    const { error: dbError } = await supabaseAdmin
      .from("subscriptions")
      .upsert(
        {
          user_id: user.id,
          plan: "pro",
          status: "active",
          razorpay_subscription_id: subscription.id,
          current_period_end: currentPeriodEnd,
          razorpay_mode: "live",
        },
        { onConflict: "user_id" }
      );

    if (dbError) {
      console.error("Subscription database error:", dbError);

      return NextResponse.json(
        { error: "Could not save subscription" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      status: "active",
    });
  } catch (error) {
    console.error("Verify API error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
