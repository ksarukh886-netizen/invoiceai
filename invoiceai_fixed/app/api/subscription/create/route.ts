import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "../../../../lib/supabase-admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!keyId || !keySecret || !supabaseUrl || !publishableKey) return NextResponse.json({ error: "Payment/Supabase environment variables are missing." }, { status: 503 });
    const auth = request.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token) return NextResponse.json({ error: "Please log in again." }, { status: 401 });
    const userClient = createClient(supabaseUrl, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: { user }, error: userError } = await userClient.auth.getUser(token);
    if (userError || !user) return NextResponse.json({ error: "Your session is invalid. Please log in again." }, { status: 401 });
    const body = await request.json().catch(() => ({}));
    const plan = body.plan === "yearly" ? "yearly" : body.plan === "monthly" ? "monthly" : null;
    if (!plan) return NextResponse.json({ error: "Choose a valid plan." }, { status: 400 });
    const planId = plan === "monthly" ? process.env.RAZORPAY_MONTHLY_PLAN_ID : process.env.RAZORPAY_YEARLY_PLAN_ID;
    if (!planId) return NextResponse.json({ error: `Razorpay ${plan} plan ID is missing.` }, { status: 503 });
    const admin = createAdminClient();
    const { data: existing } = await admin.from("subscriptions").select("status,plan").eq("user_id", user.id).maybeSingle();
    if (existing?.status === "active") return NextResponse.json({ error: "A Pro subscription is already active." }, { status: 409 });
    const response = await fetch("https://api.razorpay.com/v1/subscriptions", {
      method: "POST", headers: { "content-type": "application/json", authorization: "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64") },
      body: JSON.stringify({ plan_id: planId, total_count: plan === "monthly" ? 120 : 10, quantity: 1, customer_notify: 1, notes: { supabase_user_id: user.id, plan } })
    });
    const subscription = await response.json();
    if (!response.ok || !subscription.id) { console.error("Razorpay subscription creation failed", subscription); return NextResponse.json({ error: subscription.error?.description || "Could not create subscription. Check Razorpay plan IDs and account settings." }, { status: 502 }); }
    const { error: dbError } = await admin.from("subscriptions").upsert({ user_id: user.id, plan, status: "inactive", razorpay_subscription_id: subscription.id, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (dbError) { console.error("Subscription database write failed", dbError); return NextResponse.json({ error: "Subscription created but database update failed. Contact support before retrying." }, { status: 500 }); }
    return NextResponse.json({ subscriptionId: subscription.id, keyId, plan });
  } catch (error) { console.error("Subscription create error", error); return NextResponse.json({ error: "Could not start checkout. Check server configuration." }, { status: 500 }); }
}
