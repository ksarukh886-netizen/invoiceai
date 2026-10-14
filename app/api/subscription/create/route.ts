import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type PlanType = "monthly" | "yearly";

function getPlanId(plan: PlanType): string | undefined {
  if (plan === "monthly") {
    return (
      process.env.RAZORPAY_MONTHLY_PLAN_ID ||
      process.env.RAZORPAY_PLAN_ID
    )?.trim();
  }

  return (
    process.env.RAZORPAY_YEARLY_PLAN_ID ||
    process.env.RAZORPAY_PLAN_ID
  )?.trim();
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(req: Request) {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID?.trim();
    const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const supabaseKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

    if (!keyId || !keySecret || !supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        {
          error:
            "Configuration missing hai. Vercel Environment Variables check karein.",
        },
        { status: 500 }
      );
    }

    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
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
      console.error("Supabase auth failed:", authError?.message);
      return NextResponse.json(
        {
          error:
            "Login session valid nahi hai. Logout karke dobara login karein.",
        },
        { status: 401 }
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Request body valid JSON nahi hai." },
        { status: 400 }
      );
    }

    if (!isObject(body)) {
      return NextResponse.json(
        { error: "Request body ka format galat hai." },
        { status: 400 }
      );
    }

    const requestedPlan =
      typeof body.plan === "string"
        ? body.plan
        : typeof body.planType === "string"
          ? body.planType
          : "monthly";

    const planValue = requestedPlan.trim().toLowerCase();

    if (planValue !== "monthly" && planValue !== "yearly") {
      return NextResponse.json(
        { error: "Plan monthly ya yearly hona chahiye." },
        { status: 400 }
      );
    }

    const plan: PlanType = planValue;
    const planId = getPlanId(plan);

    if (!planId) {
      return NextResponse.json(
        {
          error: `Razorpay ${plan} plan ID missing hai. Vercel Environment Variables check karein.`,
        },
        { status: 500 }
      );
    }

    const isTestKey = keyId.startsWith("rzp_test_");
    const isLiveKey = keyId.startsWith("rzp_live_");

    if (!isTestKey && !isLiveKey) {
      return NextResponse.json(
        {
          error:
            "Razorpay Key ID ka format galat hai. Dashboard se sahi Key ID copy karein.",
        },
        { status: 500 }
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
  } catch (error: unknown) {
    const err = isObject(error) ? error : {};
    const razorpayError = isObject(err.error) ? err.error : {};

    const statusCode =
      typeof err.statusCode === "number" &&
      err.statusCode >= 400 &&
      err.statusCode < 600
        ? err.statusCode
        : 500;

    const description =
      typeof razorpayError.description === "string"
        ? razorpayError.description
        : undefined;

    const message =
      typeof err.message === "string" ? err.message : undefined;

    console.error("Subscription creation failed:", {
      statusCode,
      code:
        typeof razorpayError.code === "string"
          ? razorpayError.code
          : undefined,
      description,
      message,
    });

    return NextResponse.json(
      {
        error:
          description ||
          message ||
          "Subscription create nahi hui. Vercel Logs check karein.",
      },
      { status: statusCode }
    );
  }
}
