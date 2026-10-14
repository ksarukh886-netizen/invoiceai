```ts
import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getPlanId(plan: string) {
  const normalized = plan.toLowerCase();

  if (normalized === "monthly") {
    return (
      process.env.RAZORPAY_MONTHLY_PLAN_ID ||
      process.env.RAZORPAY_PLAN_ID
    );
  }

  if (normalized === "yearly") {
    return (
      process.env.RAZORPAY_YEARLY_PLAN_ID ||
      process.env.RAZORPAY_PLAN_ID
    );
  }

  return undefined;
}

export async function POST(req: Request) {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID?.trim();
    const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!keyId || !keySecret || !supabaseUrl || !supabaseKey) {
      console.error("Payment configuration missing", {
        keyIdPresent: Boolean(keyId),
        keySecretPresent: Boolean(keySecret),
        supabaseUrlPresent: Boolean(supabaseUrl),
        supabaseKeyPresent: Boolean(supabaseKey),
      });

      return NextResponse.json(
        { error: "Payment configuration missing hai. Vercel variables check karein." },
        { status: 500 }
      );
    }

    // Safe diagnostic: secret ki actual value kabhi log na karein.
    console.log("Razorpay credential diagnostic", {
      keyIdPrefix: keyId.slice(0, 8),
      keyIdLength: keyId.length,
      secretLength: keySecret.length,
      isTestKey: keyId.startsWith("rzp_test_"),
      isLiveKey: keyId.startsWith("rzp_live_"),
    });

    const authHeader = req.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Login token nahi mila. Dobara login karein." },
        { status: 401 }
      );
    }

    const accessToken = authHeader.slice(7).trim();

    if (!accessToken) {
      return NextResponse.json(
        { error: "Login token khaali hai. Dobara login karein." },
        { status: 401 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      console.error("Supabase user authentication failed", {
        message: authError?.message,
      });

      return NextResponse.json(
        { error: "Login session valid nahi hai. Dobara login karein." },
        { status: 401 }
      );
    }

    const body = await req.json();

    const requestedPlan =
      typeof body.plan === "string"
        ? body.plan
        : typeof body.planType === "string"
          ? body.planType
          : "monthly";

    const plan = requestedPlan.toLowerCase();

    if (plan !== "monthly" && plan !== "yearly") {
      return NextResponse.json(
        { error: "Plan monthly ya yearly hona chahiye." },
        { status: 400 }
      );
    }

    const planId = getPlanId(plan);

    if (!planId) {
      return NextResponse.json(
        { error: "Razorpay plan ID missing hai. Vercel variables check karein." },
        { status: 400 }
      );
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      total_count: plan === "monthly" ? 12 : 1,
      quantity: 1,
      customer_notify: 1,
      notes: {
        supabase_user_id: user.id,
        plan,
      },
    });

    return NextResponse.json({
      subscriptionId: subscription.id,
      keyId,
      plan,
    });
  } catch (error: any) {
    console.error("Subscription creation failed:", {
      statusCode: error?.statusCode,
      code: error?.error?.code,
      description: error?.error?.description,
      message: error?.message,
    });

    return NextResponse.json(
      { error: "Subscription create nahi hui. Vercel Logs check karein." },
      { status: 500 }
    );
  }
}
```
