
import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keySecret) {
      return NextResponse.json(
        { error: "Razorpay server configuration missing hai." },
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
      typeof signature !== "string" ||
      !paymentId ||
      !subscriptionId ||
      !signature
    ) {
      return NextResponse.json(
        { error: "Payment verification details missing hain." },
        { status: 400 }
      );
    }

    const expectedSignature = createHmac("sha256", keySecret)
      .update(`${paymentId}|${subscriptionId}`)
      .digest("hex");

    const expectedBuffer = Buffer.from(expectedSignature, "hex");
    const receivedBuffer = Buffer.from(signature, "hex");

    if (
      expectedBuffer.length !== receivedBuffer.length ||
      !timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
      return NextResponse.json(
        { verified: false, error: "Payment signature valid nahi hai." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      verified: true,
      message: "Signature valid hai. Subscription status ko server se confirm karna abhi baaki hai.",
    });
  } catch (error) {
    console.error("Razorpay verification error:", error);
    return NextResponse.json(
      { error: "Verification request process nahi hui." },
      { status: 500 }
    );
  }
}
