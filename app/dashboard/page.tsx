"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../lib/supabase-browser";
import { useRouter } from "next/navigation";
import { useLocale } from "../../components/LocaleProvider";

type Item = {
  description: string;
  qty: number;
  price: number;
};

type Doc = {
  id: string;
  number: string;
  type: string;
  customer: string;
  email: string;
  items: Item[];
  tax: number;
  discount: number;
  status: string;
  notes: string;
  total: number;
  currency?: string;
  created_at: string;
};

type View =
  | "Dashboard"
  | "Create invoice"
  | "Invoices"
  | "Customers"
  | "Pricing";

const toSafeNumber = (value: number | string | undefined) => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
};

const localeForLanguage: Record<string, string> = {
  en: "en-US",
  hi: "hi-IN",
  es: "es-ES",
  fr: "fr-FR",
  de: "de-DE",
  ar: "ar-AE",
};

function formatMoney(
  amount: number,
  currencyCode = "USD",
  language = "en"
) {
  try {
    return new Intl.NumberFormat(
      localeForLanguage[language] || "en-US",
      {
        style: "currency",
        currency: currencyCode,
      }
    ).format(Number(amount) || 0);
  } catch {
    return `${currencyCode} ${(Number(amount) || 0).toFixed(2)}`;
  }
}

const getMonthStart = () => {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

const isCreatedThisMonth = (
  createdAt: string | null | undefined,
  monthStart: Date
) => {
  if (!createdAt) return false;
  const time = Date.parse(createdAt);
  return Number.isFinite(time) && new Date(time) >= monthStart;
};

const buildDocumentNumber = (type: string, docs: Doc[]) => {
  const prefix = type === "Invoice" ? "INV" : "QUO";

  const last = docs
    .filter((doc) => doc.type === type)
    .map((doc) => {
      const match = doc.number.match(/(\d+)$/);
      return match ? Number(match[1]) : 0;
    })
    .reduce((max, value) => Math.max(max, value), 0);

  return `${prefix}-${String(last + 1).padStart(3, "0")}`;
};

export default function Dashboard() {
  const [supabase] = useState(() => createClient());
  const router = useRouter();

  const { currency, language } = useLocale();

  const [docs, setDocs] = useState<Doc[]>([]);
  const [customer, setCustomer] = useState("");
  const [email, setEmail] = useState("");
  const [type, setType] = useState("Invoice");
  const [items, setItems] = useState<Item[]>([
    { description: "Website design", qty: 1, price: 500 },
  ]);
  const [tax, setTax] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState("Thank you for your business!");
  const [ai, setAi] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [view, setView] = useState<View>("Dashboard");

  const [isPro, setIsPro] = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);

  const subtotal = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum +
          Math.max(0, Number(item.qty) || 0) *
            Math.max(0, Number(item.price) || 0),
        0
      ),
    [items]
  );

  const safeDiscount = Math.min(
    subtotal,
    Math.max(0, Number(discount) || 0)
  );

  const total =
    Math.max(0, subtotal - safeDiscount) *
    (1 + Math.max(0, Number(tax) || 0) / 100);

  const monthStart = useMemo(() => getMonthStart(), []);

  const usedThisMonth = docs.filter((doc) =>
    isCreatedThisMonth(doc.created_at, monthStart)
  ).length;

  const customers = useMemo(
    () =>
      Array.from(
        new Map(
          docs
            .filter((doc) => doc.customer?.trim())
            .map((doc) => [
              doc.customer.trim().toLowerCase(),
              {
                name: doc.customer.trim(),
                email: doc.email || "",
              },
            ])
        ).values()
      ),
    [docs]
  );

  async function loadDocs() {
    setSubscriptionLoading(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setIsPro(false);
        setMessage(
          authError?.message || "Login session nahi mili. Dobara login karein."
        );
        router.replace("/login");
        return;
      }

      const { data: subscription, error: subscriptionError } =
        await supabase
          .from("subscriptions")
          .select("plan,status,current_period_end,razorpay_mode")
          .eq("user_id", user.id)
          .maybeSingle();

      if (subscriptionError) {
        console.error("Subscription load error:", subscriptionError.message);
        setIsPro(false);
        setMessage(
          "Subscription status load nahi hua. Supabase RLS policy check karein."
        );
      } else {
        const isSubscriptionDateValid =
          !subscription?.current_period_end ||
          new Date(subscription.current_period_end).getTime() > Date.now();

        setIsPro(
          subscription?.plan === "pro" &&
            subscription?.status === "active" &&
            subscription?.razorpay_mode === "live" &&
            isSubscriptionDateValid
        );
      }

      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        setMessage("Documents load nahi hue: " + error.message);
        return;
      }

      setDocs((data || []) as Doc[]);
    } catch (error) {
      setIsPro(false);
      setMessage(
        error instanceof Error
          ? error.message
          : "Data load nahi hua. Dobara try karein."
      );
    } finally {
      setSubscriptionLoading(false);
    }
  }

  useEffect(() => {
    void loadDocs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function upgradeToPro() {
    setMessage("");

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        setMessage("Login session nahi mili. Dobara login karein.");
        router.push("/login");
        return;
      }

      const razorpayWindow = window as any;

      if (!razorpayWindow.Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const existingScript = document.querySelector(
            'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
          ) as HTMLScriptElement | null;

          if (existingScript) {
            existingScript.addEventListener("load", () => resolve(), {
              once: true,
            });
            existingScript.addEventListener(
              "error",
              () => reject(new Error("Razorpay load nahi hua.")),
              { once: true }
            );

            if (razorpayWindow.Razorpay) resolve();
            return;
          }

          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () =>
            reject(new Error("Razorpay load nahi hua. Internet check karein."));

          document.body.appendChild(script);
        });
      }

      const response = await fetch("/api/subscription/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + session.access_token,
        },
        body: JSON.stringify({ plan: "monthly" }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || "Subscription create nahi hui.");
      }

      if (!result.keyId || !result.subscriptionId) {
        throw new Error("Razorpay subscription details nahi mili.");
      }

      if (!razorpayWindow.Razorpay) {
        throw new Error("Razorpay checkout load nahi hua.");
      }

      const checkout = new razorpayWindow.Razorpay({
        key: result.keyId,
        subscription_id: result.subscriptionId,
        name: "InvoiceAI",
        description: "Pro Monthly Subscription",

        handler: async (payment: any) => {
          try {
            const verifyResponse = await fetch("/api/subscription/verify", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + session.access_token,
              },
              body: JSON.stringify({
                razorpay_payment_id: payment.razorpay_payment_id,
                razorpay_subscription_id:
                  payment.razorpay_subscription_id,
                razorpay_signature: payment.razorpay_signature,
              }),
            });

            const verified = await verifyResponse.json().catch(() => ({}));

            if (!verifyResponse.ok) {
              setMessage(
                verified.error ||
                  "Payment verify nahi hua. Payment status check karein."
              );
              return;
            }

            if (verified.status !== "active") {
              setMessage(
                "Payment details verify hui hain, lekin subscription abhi active nahi hai. Activation confirm hone ka wait karein."
              );
              return;
            }

            await loadDocs();
            setMessage("Congratulations! InvoiceAI Pro activate ho gaya.");
          } catch {
            setMessage(
              "Verification server se connect nahi ho payi. Payment status check karein."
            );
          }
        },

        modal: {
          ondismiss: () => {
            setMessage(
              "Checkout band ho gaya. Agar payment ki hai, status check hone tak dobara payment na karein."
            );
          },
        },

        theme: { color: "#6C3BEE" },
      });

      checkout.open();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Payment shuru nahi ho payi."
      );
    }
  }

  function updateItem(index: number, key: keyof Item, value: string) {
    setItems((current) =>
      current.map((item, i) => {
        if (i !== index) return item;

        if (key === "description") {
          return { ...item, description: value };
        }

        const numericValue = Math.max(0, Number(value) || 0);

        if (key === "qty") {
          return { ...item, qty: numericValue };
        }

        return { ...item, price: numericValue };
      })
    );
  }

  async function save() {
    setMessage("");

    if (subscriptionLoading) {
      setMessage("Subscription status load ho raha hai. Thoda wait karein.");
      return;
    }

    const currentMonthCount = docs.filter((doc) =>
      isCreatedThisMonth(doc.created_at, getMonthStart())
    ).length;

    if (!isPro && currentMonthCount >= 10) {
      setView("Pricing");
      setMessage("Free plan ki 10 invoices/month limit poori ho gayi.");
      return;
    }

    if (!customer.trim()) {
      setMessage("Pehle customer ka naam bharein.");
      return;
    }

    if (!items.length || items.some((item) => !item.description.trim())) {
      setMessage("Har item ka description bharein.");
      return;
    }

    setBusy(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setMessage("Dobara login karein.");
        router.push("/login");
        return;
      }

      const number = buildDocumentNumber(type, docs);

      const row = {
        user_id: user.id,
        number,
        type,
        customer: customer.trim(),
        email: email.trim(),
        items,
        tax: toSafeNumber(tax),
        discount: safeDiscount,
        notes,
        total,
        currency,
        status: "Pending",
      };

      const { data, error } = await supabase
        .from("documents")
        .insert(row)
        .select()
        .single();

      if (error) {
        setMessage("Save nahi hua: " + error.message);
        return;
      }

      if (data) {
        setDocs((current) => [data as Doc, ...current]);
      }

      setMessage(`${number} save ho gaya!`);
      setView("Invoices");
    } catch {
      setMessage("Document save nahi ho paya. Dobara try karein.");
    } finally {
      setBusy(false);
    }
  }

  async function generateAI() {
    setLoading(true);
    setAi("");
    setMessage("");

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customer,
          type,
          items,
          total,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setAi(result.error || "AI reminder nahi ban paya.");
      } else {
        setAi(result.text || "AI se text nahi mila.");
      }
    } catch {
      setAi("Internet ya server connection check karein.");
    } finally {
      setLoading(false);
    }
  }

  async function changeStatus(doc: Doc, status: string) {
    setMessage("");

    const { error } = await supabase
      .from("documents")
      .update({ status })
      .eq("id", doc.id);

    if (error) {
      setMessage("Status update nahi hua: " + error.message);
      return;
    }

    setDocs((current) =>
      current.map((item) =>
        item.id === doc.id ? { ...item, status } : item
      )
    );

    setMessage(`${doc.number} status update ho gaya.`);
  }

  async function deleteDoc(doc: Doc) {
    if (!window.confirm(`${doc.number} delete karna hai?`)) return;

    const { error } = await supabase
      .from("documents")
      .delete()
      .eq("id", doc.id);

    if (error) {
      setMessage("Delete nahi hua: " + error.message);
      return;
    }

    setDocs((current) => current.filter((item) => item.id !== doc.id));
    setMessage(`${doc.number} delete ho gaya.`);
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  function downloadPDF(doc?: Doc) {
    const invoice = doc || {
      number: "DRAFT",
      type,
      customer,
      email,
      items,
      tax,
      discount: safeDiscount,
      notes,
      total,
      currency,
    };

    const invoiceCurrency = invoice.currency || "USD";

    const subtotalAmount = invoice.items.reduce(
      (sum, item) =>
        sum + Number(item.qty || 0) * Number(item.price || 0),
      0
    );

    const discountAmount = Number(invoice.discount || 0);
    const taxAmount =
      Math.max(0, subtotalAmount - discountAmount) *
      (Number(invoice.tax || 0) / 100);

    const escapeHtml = (value: unknown) =>
      String(value ?? "").replace(/[&<>"']/g, (char) => {
        const entities: Record<string, string> = {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;",
        };
        return entities[char];
      });

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      setMessage("Pop-up blocked hai. Browser mein pop-ups allow karein.");
      return;
    }

    const rows = invoice.items
      .map(
        (item) => `
          <tr>
            <td>${escapeHtml(item.description)}</td>
            <td>${Number(item.qty)}</td>
            <td>${escapeHtml(formatMoney(Number(item.price), invoiceCurrency, language))}</td>
            <td>${escapeHtml(formatMoney(Number(item.qty) * Number(item.price), invoiceCurrency, language))}</td>
          </tr>
        `
      )
      .join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${escapeHtml(invoice.number)} - InvoiceAI</title>
          <meta charset="UTF-8" />
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 40px;
              color: #222;
            }
            .header {
              display: flex;
              justify-content: space-between;
              border-bottom: 2px solid #6C3BEE;
              padding-bottom: 20px;
            }
            h1 { color: #6C3BEE; }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 30px;
            }
            th, td {
              padding: 12px;
              border-bottom: 1px solid #ddd;
              text-align: left;
            }
            .totals {
              margin: 30px 0 0 auto;
              width: 260px;
            }
            .totals p {
              display: flex;
              justify-content: space-between;
            }
            .grand {
              font-size: 22px;
              border-top: 2px solid #6C3BEE;
              padding-top: 12px;
            }
            .notes { margin-top: 40px; }
            @media print {
              body { padding: 10px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>InvoiceAI</h1>
              <p>Your Business</p>
            </div>
            <div>
              <h2>${escapeHtml(invoice.type)}</h2>
              <p>${escapeHtml(invoice.number)}</p>
            </div>
          </div>

          <h3>Bill To</h3>
          <p>${escapeHtml(invoice.customer)}</p>
          <p>${escapeHtml(invoice.email)}</p>

          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>

          <div class="totals">
            <p><span>Subtotal</span><b>${escapeHtml(formatMoney(subtotalAmount, invoiceCurrency, language))}</b></p>
            <p><span>Discount</span><b>-${escapeHtml(formatMoney(discountAmount, invoiceCurrency, language))}</b></p>
            <p><span>Tax</span><b>${escapeHtml(formatMoney(taxAmount, invoiceCurrency, language))}</b></p>
            <p class="grand"><span>Total</span><b>${escapeHtml(formatMoney(Number(invoice.total), invoiceCurrency, language))}</b></p>
          </div>

          <div class="notes">
            <h3>Notes</h3>
            <p>${escapeHtml(invoice.notes)}</p>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    printWindow.onload = () => {
      printWindow.print();
    };
  }

  function sendWhatsApp(doc?: Doc) {
    const name = doc?.customer || customer || "there";
    const amount = formatMoney(
      Number(doc?.total ?? total),
      doc?.currency || currency,
      language
    );
    const number = doc?.number ? ` (${doc.number})` : "";

    const text = `Hello ${name}, friendly reminder that invoice${number} for ${amount} is awaiting payment. Please find the invoice PDF attached. Please let me know if you have any questions. Thank you!`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;

    window.open(
      whatsappUrl,
      "_blank",
      "noopener,noreferrer"
    );

    downloadPDF(doc);

    setMessage(
      "PDF window khul gaya hai. Save as PDF karein, phir WhatsApp mein attach karke send karein."
    );
  }

  return (
    <main className="dash">
      <header>
        <div className="brand">
          <img
            src="/invoiceai-logo.png"
            alt="InvoiceAI Logo"
            style={{
              width: "160px",
              height: "auto",
              objectFit: "contain",
              display: "block",
            }}
          />
        </div>

        <div>
          <span className="plan-label">
            {subscriptionLoading
              ? "Checking plan..."
              : isPro
                ? "PRO PLAN"
                : "FREE PLAN"}
          </span>

          <button className="linkbtn" onClick={logout}>
            Log out
          </button>
        </div>
      </header>

      <div className="dashgrid">
        <aside className="sidecard no-print">
          <h3>Workspace</h3>

          {(
            [
              "Dashboard",
              "Create invoice",
              "Invoices",
              "Customers",
              "Pricing",
            ] as const
          ).map((item) => (
            <button
              key={item}
              className={`navitem ${view === item ? "active" : ""}`}
              onClick={() => {
                setView(item);
                setMessage("");
              }}
            >
              {item === "Dashboard"
                ? "▦ "
                : item === "Create invoice"
                  ? "＋ "
                  : item === "Invoices"
                    ? "▤ "
                    : item === "Customers"
                      ? "♙ "
                      : "＄ "}
              {item}
            </button>
          ))}

          <hr />

          <small>{isPro ? "PRO PLAN" : "FREE PLAN"}</small>

          <p>
            {subscriptionLoading
              ? "Checking subscription..."
              : isPro
                ? "Pro subscription active"
                : `${usedThisMonth}/10 invoices this month`}
          </p>

          {!isPro && (
            <button className="lightbtn" onClick={() => setView("Pricing")}>
              View plans
            </button>
          )}
        </aside>

        <section>
          {message && (
            <p className="notice" role="status">
              {message}
            </p>
          )}

          {view === "Dashboard" && (
            <>
              <div className="welcome">
                <div>
                  <h1>Smart invoice builder</h1>
                  <p className="muted">
                    Create, save and follow up with customers.
                  </p>
                </div>

                <button
                  className="btn"
                  onClick={() => setView("Create invoice")}
                >
                  ＋ Create invoice
                </button>
              </div>

              <div className="panel">
                <h3>Quick overview</h3>

                <div className="two">
                  <p>
                    Total documents
                    <br />
                    <b>{docs.length}</b>
                  </p>

                  <p>
                    Pending payments
                    <br />
                    <b>
                      {docs.filter((doc) => doc.status !== "Paid").length}
                    </b>
                  </p>
                </div>

                <p>
                  Current plan: <b>{isPro ? "Pro" : "Free"}</b>
                </p>

                <button className="btn" onClick={() => setView("Invoices")}>
                  View invoices
                </button>
              </div>
            </>
          )}

          {view === "Create invoice" && (
            <>
              <div className="welcome">
                <div>
                  <h1>Create {type.toLowerCase()}</h1>
                  <p className="muted">
                    Enter details; preview updates automatically.
                  </p>
                  <p className="muted">
                    Invoice currency: <b>{currency}</b>
                  </p>
                </div>

                <button className="btn" onClick={save} disabled={busy}>
                  {busy ? "Saving…" : `Save ${type}`}
                </button>
              </div>

              <div className="builder">
                <div className="panel">
                  <div className="two">
                    <label>
                      Type
                      <select
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                      >
                        <option>Invoice</option>
                        <option>Quote</option>
                      </select>
                    </label>

                    <label>
                      Customer
                      <input
                        value={customer}
                        onChange={(e) => setCustomer(e.target.value)}
                        placeholder="John Smith"
                      />
                    </label>
                  </div>

                  <label>
                    Email
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="john@example.com"
                    />
                  </label>

                  <h3>Items</h3>

                  {items.map((item, index) => (
                    <div className="item" key={index}>
                      <input
                        aria-label="Description"
                        value={item.description}
                        onChange={(e) =>
                          updateItem(index, "description", e.target.value)
                        }
                        placeholder="Item description"
                      />

                      <input
                        aria-label="Quantity"
                        type="number"
                        min="0"
                        value={item.qty}
                        onChange={(e) =>
                          updateItem(index, "qty", e.target.value)
                        }
                      />

                      <input
                        aria-label="Price"
                        type="number"
                        min="0"
                        value={item.price}
                        onChange={(e) =>
                          updateItem(index, "price", e.target.value)
                        }
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setItems((current) =>
                            current.length > 1
                              ? current.filter((_, i) => i !== index)
                              : current
                          )
                        }
                        aria-label="Remove item"
                      >
                        ×
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    className="lightbtn"
                    onClick={() =>
                      setItems((current) => [
                        ...current,
                        { description: "", qty: 1, price: 0 },
                      ])
                    }
                  >
                    ＋ Add item
                  </button>

                  <div className="two">
                    <label>
                      Tax %
                      <input
                        type="number"
                        min="0"
                        value={tax}
                        onChange={(e) =>
                          setTax(Math.max(0, Number(e.target.value) || 0))
                        }
                      />
                    </label>

                    <label>
                      Discount ({currency})
                      <input
                        type="number"
                        min="0"
                        value={discount}
                        onChange={(e) =>
                          setDiscount(Math.max(0, Number(e.target.value) || 0))
                        }
                      />
                    </label>
                  </div>

                  <label>
                    Notes
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </label>

                  <button
                    type="button"
                    className="lightbtn"
                    onClick={generateAI}
                    disabled={loading}
                  >
                    {loading ? "Generating…" : "✨ Generate AI reminder"}
                  </button>

                  {ai && (
                    <div className="ai">
                      <p>{ai}</p>

                      <button
                        type="button"
                        className="lightbtn"
                        onClick={() => {
                          void navigator.clipboard.writeText(ai);
                          setMessage("Reminder copy ho gaya.");
                        }}
                      >
                        Copy reminder
                      </button>

                      <button
                        type="button"
                        className="lightbtn"
                        onClick={() => sendWhatsApp()}
                      >
                        Send with WhatsApp
                      </button>
                    </div>
                  )}

                  <div className="no-print">
                    <button
                      type="button"
                      className="lightbtn"
                      onClick={() => downloadPDF()}
                    >
                      Print / Save PDF
                    </button>

                    <button
                      type="button"
                      className="btn"
                      onClick={save}
                      disabled={busy}
                    >
                      {busy ? "Saving…" : `Save ${type}`}
                    </button>
                  </div>
                </div>

                <div className="invoice" id="invoice-preview">
                  <div className="invhead">
                    <b>Your Business</b>
                    <span>{type.toUpperCase()}</span>
                  </div>

                  <p className="muted">BILL TO</p>
                  <h3>{customer || "Customer"}</h3>
                  <small>{email}</small>

                  <table>
                    <thead>
                      <tr>
                        <th>Description</th>
                        <th>Qty</th>
                        <th>Price</th>
                        <th>Amount</th>
                      </tr>
                    </thead>

                    <tbody>
                      {items.map((item, index) => (
                        <tr key={index}>
                          <td>{item.description || "Item"}</td>
                          <td>{item.qty}</td>
                          <td>{formatMoney(Number(item.price), currency, language)}</td>
                          <td>
                            {formatMoney(
                              Number(item.qty) * Number(item.price),
                              currency,
                              language
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="sum">
                    <p>
                      Subtotal{" "}
                      <b>{formatMoney(subtotal, currency, language)}</b>
                    </p>

                    <p>
                      Discount{" "}
                      <b>
                        -
                        {formatMoney(
                          safeDiscount,
                          currency,
                          language
                        )}
                      </b>
                    </p>

                    <p>
                      Tax{" "}
                      <b>
                        {formatMoney(
                          Math.max(0, subtotal - safeDiscount) *
                            (Math.max(0, tax) / 100),
                          currency,
                          language
                        )}
                      </b>
                    </p>

                    <h2>
                      Total{" "}
                      <b>{formatMoney(total, currency, language)}</b>
                    </h2>
                  </div>

                  <p className="note">{notes}</p>
                </div>
              </div>
            </>
          )}

          {view === "Invoices" && (
            <>
              <div className="welcome">
                <div>
                  <h1>Invoices &amp; quotes</h1>
                  <p className="muted">
                    Manage saved documents and payment status.
                  </p>
                </div>

                <button
                  className="btn"
                  onClick={() => setView("Create invoice")}
                >
                  ＋ Create new
                </button>
              </div>

              <div className="panel">
                {docs.length === 0 ? (
                  <p>No saved documents yet. Create your first invoice.</p>
                ) : (
                  <div className="tablewrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Number</th>
                          <th>Customer</th>
                          <th>Total</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>

                      <tbody>
                        {docs.map((doc) => (
                          <tr key={doc.id}>
                            <td>
                              {doc.number}
                              <br />
                              <small>{doc.type}</small>
                            </td>

                            <td>
                              {doc.customer}
                              <br />
                              <small>{doc.email}</small>
                            </td>

                            <td>
                              {formatMoney(
                                Number(doc.total),
                                doc.currency || "USD",
                                language
                              )}
                            </td>

                            <td>
                              <select
                                aria-label={`Status for ${doc.number}`}
                                value={doc.status}
                                onChange={(e) =>
                                  void changeStatus(doc, e.target.value)
                                }
                              >
                                <option>Pending</option>
                                <option>Paid</option>
                                <option>Overdue</option>
                              </select>
                            </td>

                            <td>
                              <button
                                type="button"
                                className="lightbtn"
                                onClick={() => {
                                  setCustomer(doc.customer);
                                  setEmail(doc.email);
                                  setType(doc.type);
                                  setItems(
                                    doc.items?.length
                                      ? doc.items
                                      : [
                                          {
                                            description: "",
                                            qty: 1,
                                            price: 0,
                                          },
                                        ]
                                  );
                                  setTax(Number(doc.tax) || 0);
                                  setDiscount(Number(doc.discount) || 0);
                                  setNotes(doc.notes || "");
                                  setView("Create invoice");
                                  setMessage(
                                    "Details load ho gayi hain. Save karne par naya document banega."
                                  );
                                }}
                              >
                                Edit copy
                              </button>{" "}

                              <button
                                type="button"
                                className="lightbtn"
                                onClick={() => sendWhatsApp(doc)}
                              >
                                WhatsApp
                              </button>{" "}

                              <button
                                type="button"
                                className="lightbtn"
                                onClick={() => void deleteDoc(doc)}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {view === "Pricing" && (
            <>
              <div className="welcome">
                <div>
                  <h1>Plans &amp; Pricing</h1>
                  <p className="muted">
                    Choose the plan that fits your business.
                  </p>
                </div>
              </div>

              <div className="pricing-grid">
                <div className="panel pricing-card">
                  <p className="muted">START HERE</p>
                  <h2>Free</h2>
                  <h1>
                    ₹0 <small>/ month</small>
                  </h1>
                  <p>For small businesses getting started.</p>

                  <ul>
                    <li>10 invoices per month</li>
                    <li>PDF / print download</li>
                    <li>Customer list from saved invoices</li>
                    <li>Manual WhatsApp reminders</li>
                    <li>Pending and Paid status</li>
                  </ul>

                  <button className="lightbtn" disabled>
                    {isPro ? "Available plan" : "Current plan"}
                  </button>
                </div>

                <div className="panel pricing-card featured">
                  <p className="muted">FOR GROWING BUSINESSES</p>
                  <h2>Pro</h2>
                  <h1>
                    ₹199 <small>/ month</small>
                  </h1>
                  <p>More room for your business.</p>

                  <ul>
                    <li>Unlimited invoices in this app</li>
                    <li>All Free features</li>
                    <li>Business branding options</li>
                    <li>Priority feature updates</li>
                  </ul>

                  {isPro ? (
                    <button className="lightbtn" disabled>
                      Pro Active
                    </button>
                  ) : (
                    <button
                      className="btn"
                      onClick={upgradeToPro}
                      disabled={subscriptionLoading}
                    >
                      Upgrade to Pro
                    </button>
                  )}

                  <p className="muted pricing-note">
                    Secure checkout powered by Razorpay. Payment status is
                    verified by the server.
                  </p>
                </div>
              </div>
            </>
          )}

          {view === "Customers" && (
            <>
              <div className="welcome">
                <div>
                  <h1>Customers</h1>
                  <p className="muted">
                    Customers are collected from your saved invoices and quotes.
                  </p>
                </div>

                <button
                  className="btn"
                  onClick={() => setView("Create invoice")}
                >
                  ＋ Add customer via invoice
                </button>
              </div>

              <div className="panel">
                {customers.length === 0 ? (
                  <p>
                    No customers yet. Save an invoice with a customer name to
                    see them here.
                  </p>
                ) : (
                  <div className="tablewrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Documents</th>
                          <th>Action</th>
                        </tr>
                      </thead>

                      <tbody>
                        {customers.map((person) => (
                          <tr key={person.name.toLowerCase()}>
                            <td>{person.name}</td>
                            <td>{person.email || "—"}</td>
                            <td>
                              {
                                docs.filter(
                                  (doc) =>
                                    doc.customer?.toLowerCase() ===
                                    person.name.toLowerCase()
                                ).length
                              }
                            </td>
                            <td>
                              <button
                                type="button"
                                className="lightbtn"
                                onClick={() => {
                                  setCustomer(person.name);
                                  setEmail(person.email);
                                  setView("Create invoice");
                                }}
                              >
                                Create invoice
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {view !== "Create invoice" && (
            <div className="panel recent">
              <h3>Recent documents</h3>

              {docs.length === 0 ? (
                <p>No documents yet.</p>
              ) : (
                <div className="tablewrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Number</th>
                        <th>Customer</th>
                        <th>Total</th>
                        <th>Status</th>
                      </tr>
                    </thead>

                    <tbody>
                      {docs.slice(0, 5).map((doc) => (
                        <tr key={doc.id}>
                          <td>{doc.number}</td>
                          <td>{doc.customer}</td>
                          <td>
                            {formatMoney(
                              Number(doc.total),
                              doc.currency || "USD",
                              language
                            )}
                          </td>
                          <td>{doc.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}