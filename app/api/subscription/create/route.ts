import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getPlanId(plan: string) {
  const normalized = plan.toLowerCase();

  if (normalized === "monthly") {
    return process.env.RAZORPAY_MONTHLY_PLAN_ID || process.env.RAZORPAY_PLAN_ID;
  }

  if (normalized === "yearly") {
    return process.env.RAZORPAY_YEARLY_PLAN_ID || process.env.RAZORPAY_PLAN_ID;
  }

  return undefined;
}

export async function POST(req: Request) {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!keyId || !keySecret || !supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        {
          error:
            "Payment configuration missing hai. Vercel mein RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, NEXT_PUBLIC_SUPABASE_URL aur NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY set karo.",
        },
        { status: 500 }
      );
    }

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
      return NextResponse.json(
        {
          error: "Login session valid nahi hai. Logout karke dobara login karein.",
        },
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
    const planId = getPlanId(plan);

    if (!planId) {
      return NextResponse.json(
        {
          error:
            "Razorpay plan ID missing hai. Vercel mein RAZORPAY_MONTHLY_PLAN_ID ya RAZORPAY_YEARLY_PLAN_ID set karo.",
        },
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
    console.error("Subscription creation failed:", error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Subscription create nahi hui. Vercel logs aur Razorpay configuration check karein.",
      },
      { status: 500 }
    );
  }
}
