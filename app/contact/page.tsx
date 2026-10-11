import PolicyPage from "@/components/PolicyPage";

export default function Page() {
  return (
    <PolicyPage title="Contact Us" updated="October 11, 2026">
      <>
        <p>
          If you need help with InvoiceAI, have questions about billing, or
          want to submit a privacy request or feedback, please contact us
          using the email address below.
        </p>

        <p>
          <strong>Support Email:</strong>{" "}
          <a href="mailto:ksarukh886@gmail.com">
            ksarukh886@gmail.com
          </a>
        </p>

        <p>
          We will review your message and respond as soon as reasonably
          possible.
        </p>

        <p>
          InvoiceAI provides tools to help businesses create invoices,
          quotes, and payment reminders.
        </p>
      </>
    </PolicyPage>
  );
}
