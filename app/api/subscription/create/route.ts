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

export async function POST(req: Request) {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID?.trim();
    const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const supabaseKey =
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
      console.error(
        "Supabase authentication failed:",
        authError?.message
      );

      return NextResponse.json(
        {
          error:
            "Login session valid nahi hai. Logout karke dobara login karein.",
        },
        { status: 401 }
      );
    }

    const body = await req.json();

    const requestedPlan =
      typeof body?.plan === "string"
        ? body.plan
        : typeof body?.planType === "string"
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
      const message =
        "Razorpay " +
        plan +
        " plan ID missing hai. Vercel Environment Variables check karein.";

      return NextResponse.json(
        { error: message },
        { status: 400 }
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
        plan: plan,
      },
    });

    return NextResponse.json({
      subscriptionId: subscription.id,
      keyId: keyId,
      plan: plan,
    });
  } catch (error: unknown) {
    const err = error as {
      statusCode?: number;
      error?: {
        code?: string;
        description?: string;
      };
      message?: string;
    };

    console.error("Subscription creation failed:", {
      statusCode: err?.statusCode,
      code: err?.error?.code,
      description: err?.error?.description,
      message: err?.message,
    });

    const statusCode =
      err?.statusCode &&
      err.statusCode >= 400 &&
      err.statusCode < 600
        ? err.statusCode
        : 500;

    return NextResponse.json(
      {
        error:
          err?.error?.description ||
          err?.message ||
          "Subscription create nahi hui. Vercel Logs check karein.",
      },
      { status: statusCode }
    );
  }
}
