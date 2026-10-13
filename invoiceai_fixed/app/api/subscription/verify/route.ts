import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "../../../../lib/supabase-admin";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID, secret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !secret) return NextResponse.json({ error: "Razorpay server configuration missing." }, { status: 503 });
    const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/, "");
    if (!token) return NextResponse.json({ error: "Please log in again." }, { status: 401 });
    const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: { user } } = await client.auth.getUser(token);
    if (!user) return NextResponse.json({ error: "Invalid session." }, { status: 401 });
    const body = await request.json();
    const { razorpay_payment_id: paymentId, razorpay_subscription_id: subscriptionId, razorpay_signature: signature } = body;
    if (![paymentId, subscriptionId, signature].every(v => typeof v === "string" && v.length > 0)) return NextResponse.json({ error: "Payment verification details are incomplete." }, { status: 400 });
    const expected = createHmac("sha256", secret).update(`${paymentId}|${subscriptionId}`).digest("hex");
    const a = Buffer.from(expected), b = Buffer.from(signature);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return NextResponse.json({ error: "Payment signature verification failed." }, { status: 400 });
    const authHeader = "Basic " + Buffer.from(`${keyId}:${secret}`).toString("base64");
    const [subRes, payRes] = await Promise.all([
      fetch(`https://api.razorpay.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}`, { headers: { authorization: authHeader }, cache: "no-store" }),
      fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, { headers: { authorization: authHeader }, cache: "no-store" })
    ]);
    const sub = await subRes.json(), payment = await payRes.json();
    if (!subRes.ok || !payRes.ok || sub.notes?.supabase_user_id !== user.id || payment.subscription_id !== subscriptionId || !["authorized", "captured"].includes(payment.status)) return NextResponse.json({ error: "Razorpay could not confirm this subscription/payment." }, { status: 400 });
    const admin = createAdminClient();
    const active = sub.status === "active";
    const { error } = await admin.from("subscriptions").update({ status: active ? "active" : sub.status === "halted" ? "halted" : "inactive", current_period_end: sub.current_end ? new Date(sub.current_end * 1000).toISOString() : null, updated_at: new Date().toISOString() }).eq("user_id", user.id).eq("razorpay_subscription_id", subscriptionId);
    if (error) { console.error("Subscription verify DB update failed", error); return NextResponse.json({ error: "Payment checked, but subscription status could not be saved. Contact support." }, { status: 500 }); }
    return NextResponse.json({ verified: true, active, status: sub.status, message: active ? "Pro is active." : "Payment authorization received. Pro activates when Razorpay confirms the subscription is active." });
  } catch (error) { console.error("Subscription verify error", error); return NextResponse.json({ error: "Could not verify payment." }, { status: 500 }); }
}
