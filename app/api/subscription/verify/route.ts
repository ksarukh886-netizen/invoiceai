
import { NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keySecret) {
      return NextResponse.json(
        { error: "Payment configuration missing hai." },
        { status: 500 }
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
        { error: "Payment verification details missing hain." },
        { status: 400 }
      );
    }

    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${paymentId}|${subscriptionId}`)
      .digest("hex");

    const received = Buffer.from(signature, "hex");
    const expected = Buffer.from(expectedSignature, "hex");

    if (
      received.length !== expected.length ||
      !crypto.timingSafeEqual(received, expected)
    ) {
      return NextResponse.json(
        { verified: false, error: "Payment signature invalid hai." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      verified: true,
      message: "Signature verified. Subscription activation abhi confirm karni baaki hai.",
    });
  } catch {
    return NextResponse.json(
      { error: "Payment verification request invalid hai." },
      { status: 400 }
    );
  }
}
