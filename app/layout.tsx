import "./globals.css";
import type { Metadata } from "next";
export const metadata: Metadata={title:"InvoiceAI — Smart Invoicing",description:"Create invoices, quotes and payment reminders with AI."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}