import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "../../../../lib/supabase-admin";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook secret is not configured." }, { status: 503 });
  const raw = await request.text();
  const signature = request.headers.get("x-razorpay-signature") || "";
  const expected = createHmac("sha256", secret).update(raw).digest("hex");
  const a = Buffer.from(expected), b = Buffer.from(signature);
  if (!signature || a.length !== b.length || !timingSafeEqual(a, b)) return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  try {
    const event = JSON.parse(raw);
    const entity = event.payload?.subscription?.entity;
    if (!entity?.id) return NextResponse.json({ received: true });
    const statusMap: Record<string, string> = { active: "active", halted: "halted", cancelled: "cancelled", completed: "completed", authenticated: "inactive", created: "inactive", pending: "inactive" };
    const status = statusMap[entity.status];
    if (!status) return NextResponse.json({ received: true });
    const admin = createAdminClient();
    const { error } = await admin.from("subscriptions").update({ status, current_period_end: entity.current_end ? new Date(entity.current_end * 1000).toISOString() : null, updated_at: new Date().toISOString() }).eq("razorpay_subscription_id", entity.id);
    if (error) { console.error("Webhook DB update failed", error); return NextResponse.json({ error: "Database update failed." }, { status: 500 }); }
    return NextResponse.json({ received: true });
  } catch (error) { console.error("Webhook processing error", error); return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 }); }
}
