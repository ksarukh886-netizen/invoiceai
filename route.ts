import OpenAI from "openai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "AI ke liye Vercel mein OPENAI_API_KEY set karna zaroori hai." }, { status: 503 });
    }
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      input: `Write a concise, friendly payment reminder for a business customer. Document type: ${body.type}. Customer: ${body.customer || "customer"}. Items: ${JSON.stringify(body.items)}. Total: ${body.total}. Do not invent payment links or dates. Return only the message.`
    });
    return NextResponse.json({ text: response.output_text });
  } catch (error) {
    console.error("AI reminder error:", error);
    return NextResponse.json({ error: "AI request fail hua. API key, API billing aur model access check karein." }, { status: 500 });
  }
}
