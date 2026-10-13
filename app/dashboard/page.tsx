```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../lib/supabase-browser";
import { useRouter } from "next/navigation";

declare global {
  interface Window {
    Razorpay?: any;
  }
}

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
  created_at: string;
};

export default function Dashboard() {
  const supabase = createClient();
  const router = useRouter();

  const [docs, setDocs] = useState<Doc[]>([]);
  const [customer, setCustomer] = useState("");
  const [email, setEmail] = useState("");
  const [type, setType] = useState("Invoice");
  const [items, setItems] = useState<Item[]>([
    { description: "Website design", qty: 1, price: 500 },
  ]);
  const [tax, setTax] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState(
    "Thank you for your business!"
  );
  const [ai, setAi] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [view, setView] = useState<
    "Dashboard" | "Create invoice" | "Invoices" | "Customers" | "Pricing"
  >("Dashboard");

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

  const total =
    Math.max(0, subtotal - Math.max(0, discount)) *
    (1 + Math.max(0, tax) / 100);

  const customers = useMemo(
    () =>
      Array.from(
        new Map(
          docs
            .filter((d) => d.customer?.trim())
            .map((d) => [
              d.customer.trim().toLowerCase(),
              {
                name: d.customer.trim(),
                email: d.email || "",
              },
            ])
        ).values()
      ),
    [docs]
  );

  // Load documents belonging to the logged-in user.
  async function loadDocs() {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      router.push("/login");
      return;
    }

    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("Documents load nahi hue: " + error.message);
    } else {
      setDocs((data || []) as Doc[]);
    }
  }

  // Razorpay Pro subscription checkout.
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

      // Load Razorpay checkout script if it is not loaded.
      if (!window.Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");

          script.src =
            "https://checkout.razorpay.com/v1/checkout.js";
          script.async = true;

          script.onload = () => resolve();

          script.onerror = () =>
            reject(
              new Error(
                "Razorpay load nahi hua. Internet check karein."
              )
            );

          document.body.appendChild(script);
        });
      }

      // Create the subscription on the server.
      const response = await fetch(
        "/api/subscription/create",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ plan: "monthly" }),
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.error || "Subscription create nahi hui."
        );
      }

      if (!result.keyId || !result.subscriptionId) {
        throw new Error(
          "Razorpay subscription details nahi mili."
        );
      }

      // Open Razorpay checkout.
      const checkout = new window.Razorpay({
        key: result.keyId,
        subscription_id: result.subscriptionId,
        name: "InvoiceAI",
        description: "Pro Monthly Subscription",

        handler: async (payment: any) => {
          try {
            const verifyResponse = await fetch(
              "/api/subscription/verify",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                  razorpay_payment_id:
                    payment.razorpay_payment_id,
                  razorpay_subscription_id:
                    payment.razorpay_subscription_id,
                  razorpay_signature:
                    payment.razorpay_signature,
                }),
              }
            );

            const verified = await verifyResponse
              .json()
              .catch(() => ({}));

            if (!verifyResponse.ok) {
              setMessage(
                verified.error ||
                  "Payment verification nahi ho payi. Payment status check karein."
              );
              return;
            }

            setMessage(
              "Payment verification successful. Page refresh ho raha hai."
            );

            window.location.reload();
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

  useEffect(() => {
    void loadDocs();
  }, []);

  function updateItem(
    index: number,
    key: keyof Item,
    value: string
  ) {
    setItems((current) =>
      current.map((item, i) =>
        i === index
          ? {
              ...item,
              [key]:
                key === "description"
                  ? value
                  : Math.max(0, Number(value) || 0),
            }
          : item
      )
    );
  }

  async function save() {
    setMessage("");

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const usedThisMonth = docs.filter(
      (d) => new Date(d.created_at) >= monthStart
    ).length;

    if (usedThisMonth >= 10) {
      setView("Pricing");
      setMessage(
        "Free plan ki 10 invoices/month limit poori ho gayi."
      );
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

      if (!customer.trim()) {
        setMessage("Pehle customer ka naam bharein.");
        return;
      }

      if (
        !items.length ||
        items.some((item) => !item.description.trim())
      ) {
        setMessage("Har item ka description bharein.");
        return;
      }

      const prefix = type === "Invoice" ? "INV" : "QUO";

      const number = `${prefix}-${String(
        docs.length + 1
      ).padStart(3, "0")}`;

      const row = {
        user_id: user.id,
        number,
        type,
        customer: customer.trim(),
        email: email.trim(),
        items,
        tax,
        discount,
        notes,
        total,
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

      const result = await response.json();

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
    } else {
      setDocs((current) =>
        current.map((item) =>
          item.id === doc.id ? { ...item, status } : item
        )
      );
    }
  }

  async function deleteDoc(doc: Doc) {
    if (!window.confirm(`${doc.number} delete karna hai?`)) {
      return;
    }

    const { error } = await supabase
      .from("documents")
      .delete()
      .eq("id", doc.id);

    if (error) {
      setMessage("Delete nahi hua: " + error.message);
    } else {
      setDocs((current) =>
        current.filter((item) => item.id !== doc.id)
      );
      setMessage(`${doc.number} delete ho gaya.`);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  function downloadPDF() {
    window.print();
  }

  function sendWhatsApp(doc?: Doc) {
    const name = doc?.customer || customer || "there";
    const amount = Number(doc?.total ?? total).toFixed(2);
    const number = doc?.number ? ` (${doc.number})` : "";

    const text = `Hello ${name}, friendly reminder that invoice${number} for ${amount} is awaiting payment. Please let me know if you have any questions. Thank you!`;

    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  return (
    <main className="dash">
      <header>
        <b className="brand">
          Invoice<span>AI</span>
        </b>

        <button className="linkbtn" onClick={logout}>
          Log out
        </button>
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
              className={`navitem ${
                view === item ? "active" : ""
              }`}
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

          <small>FREE PLAN</small>

          <p>
            {
              docs.filter(
                (d) =>
                  new Date(d.created_at) >=
                  new Date(
                    new Date().getFullYear(),
                    new Date().getMonth(),
                    1
                  )
              ).length
            }
            /10 invoices this month
          </p>

          <button
            className="lightbtn"
            onClick={() => setView("Pricing")}
          >
            View plans
          </button>
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
                      {
                        docs.filter((d) => d.status !== "Paid")
                          .length
                      }
                    </b>
                  </p>
                </div>

                <button
                  className="btn"
                  onClick={() => setView("Invoices")}
                >
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
                </div>

                <button
                  className="btn"
                  onClick={save}
                  disabled={busy}
                >
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
                        onChange={(e) =>
                          setCustomer(e.target.value)
                        }
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
                          updateItem(
                            index,
                            "description",
                            e.target.value
                          )
                        }
                        placeholder="Item description"
                      />

                      <input
                        aria-label="Quantity"
                        type="number"
                        min="0"
                        value={item.qty}
                        onChange={(e) =>
                          updateItem(
                            index,
                            "qty",
                            e.target.value
                          )
                        }
                      />

                      <input
                        aria-label="Price"
                        type="number"
                        min="0"
                        value={item.price}
                        onChange={(e) =>
                          updateItem(
                            index,
                            "price",
                            e.target.value
                          )
                        }
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setItems((current) =>
                            current.length > 1
                              ? current.filter(
                                  (_, i) => i !== index
                                )
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
                    className="lightbtn"
                    onClick={() =>
                      setItems((current) => [
                        ...current,
                        {
                          description: "",
                          qty: 1,
                          price: 0,
                        },
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
                          setTax(
                            Math.max(
                              0,
                              Number(e.target.value) || 0
                            )
                          )
                        }
                      />
                    </label>

                    <label>
                      Discount
                      <input
                        type="number"
                        min="0"
                        value={discount}
                        onChange={(e) =>
                          setDiscount(
                            Math.max(
                              0,
                              Number(e.target.value) || 0
                            )
                          )
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
                    className="lightbtn"
                    onClick={generateAI}
                    disabled={loading}
                  >
                    {loading
                      ? "Generating…"
                      : "✨ Generate AI reminder"}
                  </button>

                  {ai && (
                    <div className="ai">
                      <p>{ai}</p>

                      <button
                        className="lightbtn"
                        onClick={() =>
                          navigator.clipboard.writeText(ai)
                        }
                      >
                        Copy reminder
                      </button>

                      <button
                        className="lightbtn"
                        onClick={() => sendWhatsApp()}
                      >
                        Send with WhatsApp
                      </button>
                    </div>
                  )}

                  <div className="no-print">
                    <button
                      className="lightbtn"
                      onClick={downloadPDF}
                    >
                      Print / Save PDF
                    </button>

                    <button
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
                      {items.map((item, i) => (
                        <tr key={i}>
                          <td>{item.description || "Item"}</td>
                          <td>{item.qty}</td>
                          <td>
                            ${Number(item.price).toFixed(2)}
                          </td>
                          <td>
                            $
                            {(
                              item.qty * item.price
                            ).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="sum">
                    <p>
                      Subtotal <b>${subtotal.toFixed(2)}</b>
                    </p>

                    <p>
                      Discount <b>-${discount.toFixed(2)}</b>
                    </p>

                    <p>
                      Tax{" "}
                      <b>
                        $
                        {(
                          Math.max(0, subtotal - discount) *
                          (tax / 100)
                        ).toFixed(2)}
                      </b>
                    </p>

                    <h2>
                      Total <b>${total.toFixed(2)}</b>
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
                  <h1>Invoices & quotes</h1>
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
                  <p>
                    No saved documents yet. Create your first invoice.
                  </p>
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
                              ${Number(doc.total).toFixed(2)}
                            </td>

                            <td>
                              <select
                                aria-label={`Status for ${doc.number}`}
                                value={doc.status}
                                onChange={(e) =>
                                  changeStatus(
                                    doc,
                                    e.target.value
                                  )
                                }
                              >
                                <option>Pending</option>
                                <option>Paid</option>
                                <option>Overdue</option>
                              </select>
                            </td>

                            <td>
                              <button
                                className="lightbtn"
                                onClick={() => {
                                  setCustomer(doc.customer);
                                  setEmail(doc.email);
                                  setType(doc.type);
                                  setItems(doc.items || []);
                                  setTax(Number(doc.tax));
                                  setDiscount(
                                    Number(doc.discount)
                                  );
                                  setNotes(doc.notes || "");
                                  setView("Create invoice");
                                }}
                              >
                                Edit copy
                              </button>{" "}

                              <button
                                className="lightbtn"
                                onClick={() => sendWhatsApp(doc)}
                              >
                                WhatsApp
                              </button>{" "}

                              <button
                                className="lightbtn"
                                onClick={() => deleteDoc(doc)}
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
                  <h1>Plans & Pricing</h1>
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

                  <p>
                    For small businesses getting started.
                  </p>

                  <ul>
                    <li>10 invoices per month</li>
                    <li>PDF / print download</li>
                    <li>Customer list from saved invoices</li>
                    <li>Manual WhatsApp reminders</li>
                    <li>Pending and Paid status</li>
                  </ul>

                  <button className="lightbtn" disabled>
                    Current plan
                  </button>
                </div>

                <div className="panel pricing-card featured">
                  <p className="muted">
                    FOR GROWING BUSINESSES
                  </p>

                  <h2>Pro</h2>

                  <h1>
                    ₹199 <small>/ month</small>
                  </h1>

                  <p>More room for your business.</p>

                  <ul>
                    <li>Higher invoice allowance</li>
                    <li>All Free features</li>
                    <li>Business branding options</li>
                    <li>Priority feature updates</li>
                  </ul>

                  <button
                    className="btn"
                    onClick={upgradeToPro}
                  >
                    Upgrade to Pro
                  </button>

                  <p className="muted pricing-note">
                    Secure checkout powered by Razorpay. Payment
                    status is verified by the server.
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
                    Customers are collected from your saved invoices
                    and quotes.
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
                    No customers yet. Save an invoice with a customer
                    name to see them here.
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
                                  (d) =>
                                    d.customer?.toLowerCase() ===
                                    person.name.toLowerCase()
                                ).length
                              }
                            </td>

                            <td>
                              <button
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

              {docs.length ? (
                docs.slice(0, 5).map((doc) => (
                  <div className="docrow" key={doc.id}>
                    <span>
                      {doc.number} · {doc.customer || "Customer"}
                    </span>

                    <b>${Number(doc.total).toFixed(2)}</b>
                    <small>{doc.status}</small>
                  </div>
                ))
              ) : (
                <p className="muted">
                  No documents saved yet.
                </p>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
```
