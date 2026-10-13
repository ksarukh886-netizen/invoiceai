# InvoiceAI — Next.js + Supabase + OpenAI + Razorpay

## Included
- Supabase email/password authentication and user-owned invoice/quote records
- AI payment reminder endpoint (OpenAI Responses API)
- Free plan: 10 documents per month; database trigger enforces the cap
- Razorpay monthly/yearly subscription checkout, server-side signature/status verification, webhook status updates
- About, Contact, Terms, Privacy, Refund/Cancellation and Shipping policy pages

## 1. Install and run
```bash
npm install
cp .env.example .env.local
npm run dev
```

## 2. Environment variables
Set these in `.env.local` locally and in Vercel Project Settings → Environment Variables. Never commit `.env.local` or expose the service-role/payment secrets in `NEXT_PUBLIC_*` variables.

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Supabase publishable/anon key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service-role secret, server-side only
- `OPENAI_API_KEY`: OpenAI API key
- `OPENAI_MODEL`: optional; defaults to `gpt-4.1-mini`
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`: Razorpay API credentials for the same mode (test or live)
- `NEXT_PUBLIC_RAZORPAY_KEY_ID`: optional frontend key; checkout route returns the server-configured key ID, so this variable is not required
- `RAZORPAY_WEBHOOK_SECRET`: webhook secret configured in Razorpay Dashboard
- `RAZORPAY_MONTHLY_PLAN_ID`: monthly plan ID (example value is the supplied ₹199 plan)
- `RAZORPAY_YEARLY_PLAN_ID`: yearly plan ID (example value is the supplied ₹1,999 plan)

The sample plan IDs in `.env.example` are from the supplied project setup. Confirm they exist in the same Razorpay mode as your keys. Test-mode plans cannot be used with live keys and vice versa.

## 3. Supabase setup
In Supabase → SQL Editor, run the complete `supabase/schema.sql`. If your project already has the `documents` table and its policies, review any existing policy-name conflicts before running. The script adds the subscriptions table, user-read policy, and a database-level Free-plan monthly document limit trigger.

Set Supabase Authentication → URL Configuration:
- Site URL: your deployed Vercel URL
- Redirect URLs: include your local development URL and deployed URL (for example `http://localhost:3000/**` and `https://your-project.vercel.app/**`)

## 4. Razorpay webhook
In Razorpay Dashboard, configure a webhook URL:
`https://YOUR-DEPLOYED-DOMAIN/api/subscription/webhook`

Set a strong webhook secret there and use the exact same value for `RAZORPAY_WEBHOOK_SECRET`. Enable subscription events including `subscription.activated`, `subscription.authenticated`, `subscription.halted`, `subscription.cancelled`, and `subscription.completed` where available. The webhook only updates the subscription row that matches the Razorpay subscription ID.

## 5. Deploy
Push the project to GitHub, import/update the repository in Vercel, set all environment variables for the correct environments, then redeploy. Use Razorpay Test Mode first and complete a full checkout test before switching to Live Mode. A successful checkout authorization may not mean the subscription is already active; the app waits for Razorpay's confirmed active status/webhook before enabling Pro.

## Before launch
- Replace the contact/support details and review all policy pages for your actual business practices.
- Test sign-up, login, AI generation, document CRUD, free limit, test checkout, webhook, cancellation, and failed payments.
- Confirm tax/invoice compliance and displayed currency/price details for your business.
- This source package cannot verify your private account credentials or guarantee that your external Supabase, OpenAI, Razorpay and Vercel settings are correct. Those accounts must be configured by the project owner.
