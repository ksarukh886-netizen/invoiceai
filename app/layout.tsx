
import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "InvoiceAI — Smart Invoicing",
  description: "Create invoices, quotes and payment reminders with AI.",
  icons: {
    icon: "/invoiceai-logo.png",
    apple: "/invoiceai-logo.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
