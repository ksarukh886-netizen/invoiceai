import PolicyPage from "@/components/PolicyPage";

export default function Page() {
  return (
    <PolicyPage title="About InvoiceAI" updated="October 11, 2026">
      <>
        <p>
          InvoiceAI is a web-based invoicing tool designed to help freelancers,
          independent professionals, and small businesses prepare invoices and
          quotations, track payment status, and create customer payment
          reminders.
        </p>

        <h2>Our Mission</h2>
        <p>
          Our goal is to make everyday invoicing simpler, faster, and more
          convenient. InvoiceAI helps users organize billing information and
          prepare professional documents for their customers.
        </p>

        <h2>What InvoiceAI Offers</h2>
        <ul>
          <li>Tools to prepare invoices and quotations.</li>
          <li>Support for tracking payment status.</li>
          <li>Payment reminder content for communicating with customers.</li>
          <li>Invoice documents that users can review before sharing.</li>
        </ul>

        <h2>Accuracy and Responsibility</h2>
        <p>
          Users are responsible for reviewing generated invoices, quotations,
          prices, taxes, and payment details for accuracy before sharing them
          with customers. Features may vary depending on availability.
        </p>

        <h2>Contact Us</h2>
        <p>
          For questions or support, email us at{" "}
          <a href="mailto:ksarukh886@gmail.com">
            ksarukh886@gmail.com
          </a>.
        </p>
      </>
    </PolicyPage>
  );
}
