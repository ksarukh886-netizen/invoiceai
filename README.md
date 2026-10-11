# InvoiceAI — launch package

## Stack
- Next.js
- Supabase Auth + Postgres + Row Level Security
- OpenAI Responses API for AI payment reminders
- Vercel-ready

## 1. Create Supabase
Create a project, then run `supabase/schema.sql` in the SQL Editor.
Copy the project URL and publishable key into `.env.local`.
Supabase Auth supports email/password and its database can be protected with RLS.

## 2. AI
Copy `.env.example` to `.env.local` and add `OPENAI_API_KEY`.
The server route uses the Responses API. Never expose the OpenAI key in browser code.

## 3. Run
npm install
npm run dev

## 4. Production
Push this folder to GitHub, import it into Vercel, add the same environment variables, and deploy.
Then set the Supabase Auth Site URL / redirect URLs to your production domain.

## Important
The app is intentionally ready for real credentials but does not contain any credentials.
Payment subscriptions (Stripe/Razorpay), custom domain and WhatsApp Business API need the owner's accounts/keys before production activation.


## Policy pages
This project includes draft About, Contact, Terms, Privacy, Refund & Cancellation, and Shipping pages. Before going live, replace the Contact page guidance with your real support email/business details and review all policy text so it accurately reflects your actual data handling, billing and refund practices.
