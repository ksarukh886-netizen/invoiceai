
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

type LocaleContextType = {
  country: string;
  language: string;
  currency: string;
  symbol: string;
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

  const value: LocaleContextType = {
    country,
    language,
    currency: selectedCountry.currency,
    symbol: selectedCountry.symbol,
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
                <h2 style={{ marginTop: 0 }}>Welcome to InvoiceAI 🌍</h2>

                <p style={{ color: "#687086", lineHeight: 1.5 }}>
                  Select your country and preferred language.
                </p>

                <label style={{ display: "block", marginTop: 20, fontWeight: 700 }}>
                  Country
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
                  Language
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
                  Default currency: <strong>{selectedCountry.currency} ({selectedCountry.symbol})</strong>
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
                  Save and Continue
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </LocaleContext.Provider>
  );
}
