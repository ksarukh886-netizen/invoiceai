```typescript
import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("RAZORPAY_WEBHOOK_SECRET is missing");
      return NextResponse.json(
        { error: "Webhook configuration missing hai." },
        { status: 500 }
      );
    }

    const signature = req.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Webhook signature missing hai." },
        { status: 400 }
      );
    }

    // Razorpay signature must be calculated from the original raw body.
    const rawBody = await req.text();

    const expectedSignature = createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    const expectedBuffer = Buffer.from(expectedSignature, "hex");
    const receivedBuffer = Buffer.from(signature, "hex");

    if (
      expectedBuffer.length !== receivedBuffer.length ||
      !timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
      return NextResponse.json(
        { error: "Invalid webhook signature." },
        { status: 400 }
      );
    }

    // Parse the event only after signature verification.
    const eventData = JSON.parse(rawBody);
    const event = eventData.event;

    console.log("Verified Razorpay webhook event:", event);

    // This endpoint currently verifies incoming events only.
    // It does NOT activate Pro or update the user's subscription in the database.
    return NextResponse.json({
      received: true,
      event: typeof event === "string" ? event : "unknown",
    });
  } catch (error) {
    console.error("Razorpay webhook processing failed:", error);

    return NextResponse.json(
      { error: "Webhook process nahi ho saka." },
      { status: 500 }
    );
  }
}
```
