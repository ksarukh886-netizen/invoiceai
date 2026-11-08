"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

const countries = [
  { code: "IN", name: "India", currency: "INR", symbol: "₹", language: "en" },
  { code: "US", name: "United States", currency: "USD", symbol: "$", language: "en" },
  { code: "GB", name: "United Kingdom", currency: "GBP", symbol: "£", language: "en" },
  { code: "DE", name: "Germany", currency: "EUR", symbol: "€", language: "de" },
  { code: "FR", name: "France", currency: "EUR", symbol: "€", language: "fr" },
  { code: "AE", name: "United Arab Emirates", currency: "AED", symbol: "د.إ", language: "ar" },
  { code: "CA", name: "Canada", currency: "CAD", symbol: "$", language: "en" },
  { code: "AU", name: "Australia", currency: "AUD", symbol: "$", language: "en" },
];

const languages = [
  { code: "en", name: "English" },
  { code: "hi", name: "Hindi" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "ar", name: "Arabic" },
];

const translations: Record<string, Record<string, string>> = {
  en: {
    dashboard: "Dashboard",
    createInvoice: "Create Invoice",
    invoices: "Invoices",
    customers: "Customers",
    pricing: "Pricing",
    logout: "Log out",
    welcome: "Welcome",
    totalInvoices: "Total Invoices",
    paid: "Paid",
    pending: "Pending",
    overdue: "Overdue",
    recentInvoices: "Recent Invoices",
    createNewInvoice: "Create New Invoice",
    customer: "Customer",
    customerName: "Customer Name",
    email: "Email",
    phone: "Phone",
    address: "Address",
    invoice: "Invoice",
    quote: "Quote",
    description: "Description",
    product: "Product",
    quantity: "Quantity",
    price: "Price",
    amount: "Amount",
    subtotal: "Subtotal",
    tax: "Tax",
    total: "Total",
    dueDate: "Due Date",
    notes: "Notes",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    downloadPDF: "Download PDF",
    sendReminder: "Send Reminder",
    markPaid: "Mark as Paid",
    freePlan: "Free Plan",
    proPlan: "Pro Plan",
    month: "month",
    saveAndContinue: "Save and Continue",
    welcomeInvoiceAI: "Welcome to InvoiceAI 🌍",
    selectCountryLanguage: "Select your country and preferred language.",
    country: "Country",
    language: "Language",
    defaultCurrency: "Default currency",
  },
  hi: {
    dashboard: "डैशबोर्ड",
    createInvoice: "इनवॉइस बनाएँ",
    invoices: "इनवॉइस",
    customers: "ग्राहक",
    pricing: "प्लान और कीमत",
    logout: "लॉग आउट",
    welcome: "स्वागत है",
    totalInvoices: "कुल इनवॉइस",
    paid: "भुगतान हो गया",
    pending: "बाकी भुगतान",
    overdue: "भुगतान की तारीख निकल गई",
    recentInvoices: "हाल के इनवॉइस",
    createNewInvoice: "नया इनवॉइस बनाएँ",
    customer: "ग्राहक",
    customerName: "ग्राहक का नाम",
    email: "ईमेल",
    phone: "फोन",
    address: "पता",
    invoice: "इनवॉइस",
    quote: "कोटेशन",
    description: "विवरण",
    product: "प्रोडक्ट",
    quantity: "मात्रा",
    price: "कीमत",
    amount: "राशि",
    subtotal: "उप-योग",
    tax: "टैक्स",
    total: "कुल राशि",
    dueDate: "भुगतान की अंतिम तारीख",
    notes: "नोट्स",
    save: "सेव करें",
    cancel: "रद्द करें",
    delete: "डिलीट करें",
    edit: "बदलें",
    downloadPDF: "PDF डाउनलोड करें",
    sendReminder: "रिमाइंडर भेजें",
    markPaid: "भुगतान हुआ मार्क करें",
    freePlan: "फ्री प्लान",
    proPlan: "प्रो प्लान",
    month: "महीना",
    saveAndContinue: "सेव करें और आगे बढ़ें",
    welcomeInvoiceAI: "InvoiceAI में आपका स्वागत है 🌍",
    selectCountryLanguage: "अपना देश और पसंदीदा भाषा चुनें।",
    country: "देश",
    language: "भाषा",
    defaultCurrency: "डिफ़ॉल्ट करेंसी",
  },
  es: {
    dashboard: "Panel",
    createInvoice: "Crear factura",
    invoices: "Facturas",
    customers: "Clientes",
    pricing: "Precios",
    logout: "Cerrar sesión",
    welcome: "Bienvenido",
    totalInvoices: "Facturas totales",
    paid: "Pagado",
    pending: "Pendiente",
    overdue: "Vencido",
    recentInvoices: "Facturas recientes",
    createNewInvoice: "Crear nueva factura",
    customer: "Cliente",
    customerName: "Nombre del cliente",
    email: "Correo electrónico",
    phone: "Teléfono",
    address: "Dirección",
    invoice: "Factura",
    quote: "Presupuesto",
    description: "Descripción",
    product: "Producto",
    quantity: "Cantidad",
    price: "Precio",
    amount: "Importe",
    subtotal: "Subtotal",
    tax: "Impuesto",
    total: "Total",
    dueDate: "Fecha de vencimiento",
    notes: "Notas",
    save: "Guardar",
    cancel: "Cancelar",
    delete: "Eliminar",
    edit: "Editar",
    downloadPDF: "Descargar PDF",
    sendReminder: "Enviar recordatorio",
    markPaid: "Marcar como pagado",
    freePlan: "Plan gratuito",
    proPlan: "Plan Pro",
    month: "mes",
    saveAndContinue: "Guardar y continuar",
    welcomeInvoiceAI: "Bienvenido a InvoiceAI 🌍",
    selectCountryLanguage: "Selecciona tu país y tu idioma preferido.",
    country: "País",
    language: "Idioma",
    defaultCurrency: "Moneda predeterminada",
  },
  fr: {
    dashboard: "Tableau de bord",
    createInvoice: "Créer une facture",
    invoices: "Factures",
    customers: "Clients",
    pricing: "Tarifs",
    logout: "Déconnexion",
    welcome: "Bienvenue",
    totalInvoices: "Total des factures",
    paid: "Payé",
    pending: "En attente",
    overdue: "En retard",
    recentInvoices: "Factures récentes",
    createNewInvoice: "Créer une facture",
    customer: "Client",
    customerName: "Nom du client",
    email: "E-mail",
    phone: "Téléphone",
    address: "Adresse",
    invoice: "Facture",
    quote: "Devis",
    description: "Description",
    product: "Produit",
    quantity: "Quantité",
    price: "Prix",
    amount: "Montant",
    subtotal: "Sous-total",
    tax: "Taxe",
    total: "Total",
    dueDate: "Date d'échéance",
    notes: "Notes",
    save: "Enregistrer",
    cancel: "Annuler",
    delete: "Supprimer",
    edit: "Modifier",
    downloadPDF: "Télécharger PDF",
    sendReminder: "Envoyer un rappel",
    markPaid: "Marquer comme payé",
    freePlan: "Offre gratuite",
    proPlan: "Offre Pro",
    month: "mois",
    saveAndContinue: "Enregistrer et continuer",
    welcomeInvoiceAI: "Bienvenue sur InvoiceAI 🌍",
    selectCountryLanguage: "Sélectionnez votre pays et votre langue préférée.",
    country: "Pays",
    language: "Langue",
    defaultCurrency: "Devise par défaut",
  },
  de: {
    dashboard: "Dashboard",
    createInvoice: "Rechnung erstellen",
    invoices: "Rechnungen",
    customers: "Kunden",
    pricing: "Preise",
    logout: "Abmelden",
    welcome: "Willkommen",
    totalInvoices: "Rechnungen insgesamt",
    paid: "Bezahlt",
    pending: "Ausstehend",
    overdue: "Überfällig",
    recentInvoices: "Neueste Rechnungen",
    createNewInvoice: "Neue Rechnung erstellen",
    customer: "Kunde",
    customerName: "Kundenname",
    email: "E-Mail",
    phone: "Telefon",
    address: "Adresse",
    invoice: "Rechnung",
    quote: "Angebot",
    description: "Beschreibung",
    product: "Produkt",
    quantity: "Menge",
    price: "Preis",
    amount: "Betrag",
    subtotal: "Zwischensumme",
    tax: "Steuer",
    total: "Gesamt",
    dueDate: "Fälligkeitsdatum",
    notes: "Notizen",
    save: "Speichern",
    cancel: "Abbrechen",
    delete: "Löschen",
    edit: "Bearbeiten",
    downloadPDF: "PDF herunterladen",
    sendReminder: "Erinnerung senden",
    markPaid: "Als bezahlt markieren",
    freePlan: "Kostenloser Plan",
    proPlan: "Pro-Plan",
    month: "Monat",
    saveAndContinue: "Speichern und fortfahren",
    welcomeInvoiceAI: "Willkommen bei InvoiceAI 🌍",
    selectCountryLanguage: "Wählen Sie Ihr Land und Ihre bevorzugte Sprache.",
    country: "Land",
    language: "Sprache",
    defaultCurrency: "Standardwährung",
  },
  ar: {
    dashboard: "لوحة التحكم",
    createInvoice: "إنشاء فاتورة",
    invoices: "الفواتير",
    customers: "العملاء",
    pricing: "الأسعار",
    logout: "تسجيل الخروج",
    welcome: "مرحباً",
    totalInvoices: "إجمالي الفواتير",
    paid: "مدفوع",
    pending: "قيد الانتظار",
    overdue: "متأخر",
    recentInvoices: "الفواتير الأخيرة",
    createNewInvoice: "إنشاء فاتورة جديدة",
    customer: "العميل",
    customerName: "اسم العميل",
    email: "البريد الإلكتروني",
    phone: "الهاتف",
    address: "العنوان",
    invoice: "فاتورة",
    quote: "عرض سعر",
    description: "الوصف",
    product: "المنتج",
    quantity: "الكمية",
    price: "السعر",
    amount: "المبلغ",
    subtotal: "المجموع الفرعي",
    tax: "الضريبة",
    total: "الإجمالي",
    dueDate: "تاريخ الاستحقاق",
    notes: "ملاحظات",
    save: "حفظ",
    cancel: "إلغاء",
    delete: "حذف",
    edit: "تعديل",
    downloadPDF: "تحميل PDF",
    sendReminder: "إرسال تذكير",
    markPaid: "تحديد كمدفوع",
    freePlan: "الخطة المجانية",
    proPlan: "خطة برو",
    month: "شهر",
    saveAndContinue: "حفظ ومتابعة",
    welcomeInvoiceAI: "مرحباً بك في InvoiceAI 🌍",
    selectCountryLanguage: "اختر بلدك ولغتك المفضلة.",
    country: "البلد",
    language: "اللغة",
    defaultCurrency: "العملة الافتراضية",
  },
};

type LocaleContextType = {
  country: string;
  language: string;
  currency: string;
  symbol: string;
  t: (key: string) => string;
  setCountry: (code: string) => void;
  setLanguage: (code: string) => void;
};

const LocaleContext = createContext<LocaleContextType | null>(null);
const STORAGE_KEY = "invoiceai-locale-v1";

export function useLocale() {
  const context = useContext(LocaleContext);

  if (!context) {
    throw new Error("useLocale must be used inside LocaleProvider");
  }

  return context;
}

export default function LocaleProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [country, setCountryState] = useState("IN");
  const [language, setLanguageState] = useState("en");
  const [ready, setReady] = useState(false);
  const [showSelector, setShowSelector] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (saved) {
        const parsed = JSON.parse(saved);

        if (countries.some((item) => item.code === parsed.country)) {
          setCountryState(parsed.country);
          setLanguageState(
            languages.some((item) => item.code === parsed.language)
              ? parsed.language
              : "en"
          );
        } else {
          setShowSelector(true);
        }
      } else {
        setShowSelector(true);
      }
    } catch {
      setShowSelector(true);
    }

    setReady(true);
  }, []);

  const selectedCountry =
    countries.find((item) => item.code === country) || countries[0];

  function changeCountry(code: string) {
    const selected = countries.find((item) => item.code === code);

    if (selected) {
      setCountryState(code);
      setLanguageState(selected.language);
    }
  }

  function saveSelection() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ country, language })
    );
    setShowSelector(false);
  }

  const t = (key: string) =>
    translations[language]?.[key] || translations.en[key] || key;

  const value: LocaleContextType = {
    country,
    language,
    currency: selectedCountry.currency,
    symbol: selectedCountry.symbol,
    t,
    setCountry: changeCountry,
    setLanguage: setLanguageState,
  };

  return (
    <LocaleContext.Provider value={value}>
      {children}

      {ready && (
        <>
          <button
            type="button"
            onClick={() => setShowSelector(true)}
            style={{
              position: "fixed",
              right: 16,
              bottom: 16,
              zIndex: 1000,
              border: "1px solid #e5e7ef",
              background: "#fff",
              color: "#171923",
              borderRadius: 30,
              padding: "11px 16px",
              boxShadow: "0 4px 18px #00000018",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            🌐 {selectedCountry.code} · {language.toUpperCase()}
          </button>

          {showSelector && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 2000,
                background: "#11182799",
                display: "grid",
                placeItems: "center",
                padding: 16,
              }}
            >
              <div
                style={{
                  width: "min(420px, 100%)",
                  background: "#fff",
                  color: "#171923",
                  borderRadius: 18,
                  padding: 25,
                  boxShadow: "0 20px 60px #0003",
                }}
              >
                <h2 style={{ marginTop: 0 }}>{t("welcomeInvoiceAI")}</h2>

                <p style={{ color: "#687086", lineHeight: 1.5 }}>
                  {t("selectCountryLanguage")}
                </p>

                <label style={{ display: "block", marginTop: 20, fontWeight: 700 }}>
                  {t("country")}
                  <select
                    value={country}
                    onChange={(event) => changeCountry(event.target.value)}
                    style={{
                      display: "block",
                      width: "100%",
                      padding: 12,
                      marginTop: 7,
                      border: "1px solid #dfe3eb",
                      borderRadius: 8,
                      background: "#fff",
                      font: "inherit",
                    }}
                  >
                    {countries.map((item) => (
                      <option key={item.code} value={item.code}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label style={{ display: "block", marginTop: 16, fontWeight: 700 }}>
                  {t("language")}
                  <select
                    value={language}
                    onChange={(event) => setLanguageState(event.target.value)}
                    style={{
                      display: "block",
                      width: "100%",
                      padding: 12,
                      marginTop: 7,
                      border: "1px solid #dfe3eb",
                      borderRadius: 8,
                      background: "#fff",
                      font: "inherit",
                    }}
                  >
                    {languages.map((item) => (
                      <option key={item.code} value={item.code}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>

                <p style={{ marginTop: 16, color: "#687086" }}>
                  {t("defaultCurrency")}:{" "}
                  <strong>
                    {selectedCountry.currency} ({selectedCountry.symbol})
                  </strong>
                </p>

                <button
                  type="button"
                  onClick={saveSelection}
                  style={{
                    width: "100%",
                    marginTop: 12,
                    padding: 13,
                    border: 0,
                    borderRadius: 9,
                    background: "#6d3df5",
                    color: "#fff",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  {t("saveAndContinue")}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </LocaleContext.Provider>
  );
}