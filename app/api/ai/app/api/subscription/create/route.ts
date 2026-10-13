
import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const plans: Record<string, string> = {
  monthly: "plan_TnIKeIRAlgyTsg",
  yearly: "plan_TnIZy0jPj7u4Jz",
};

export async function POST(req: Request) {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!keyId || !keySecret || !supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: "Payment configuration missing hai. Environment Variables check karein." },
        { status: 500 }
      );
    }

    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Pehle login karein." },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: { user }, error: authError } =
      await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Login session valid nahi hai. Dobara login karein." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const plan = typeof body.plan === "string" ? body.plan : "";
    const planId = plans[plan];

    if (!planId) {
      return NextResponse.json(
        { error: "Plan monthly ya yearly hona chahiye." },
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
  } catch (error) {
    console.error("Subscription creation failed:", error);
    return NextResponse.json(
      { error: "Subscription create nahi hui. Test Mode keys aur Razorpay Plan IDs check karein." },
      { status: 500 }
    );
  }
}
