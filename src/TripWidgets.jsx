import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";

const S = {
  clockRow: { display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" },
  clockBox: { background: "rgba(255,255,255,0.12)", borderRadius: 10, padding: "8px 12px", flex: "1 1 auto", minWidth: 100 },
  clockLabel: { fontSize: 8, color: "rgba(255,255,255,0.6)", fontWeight: 700, letterSpacing: 1, marginBottom: 2 },
  clockTime: { fontFamily: "'Playfair Display',serif", fontSize: 18, color: "#fff", lineHeight: 1.2 },
  clockSub: { fontSize: 10, color: "rgba(255,255,255,0.5)" },
  destSwitcher: { display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" },
  destBtn: (active) => ({
    background: active ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.1)",
    color: "#fff",
    border: active ? "1.5px solid rgba(255,255,255,0.5)" : "1.5px solid transparent",
    borderRadius: 8,
    padding: "5px 12px",
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "'Nunito', sans-serif",
    transition: "all 0.15s",
  }),
  currencyCard: { background: "#fff", borderRadius: 14, padding: "14px 16px", marginBottom: 12, boxShadow: "0 1px 6px rgba(0,0,0,0.07)", border: "1.5px solid #e0f2f1" },
  label: { fontSize: 10, fontWeight: 800, color: "#0a9396", letterSpacing: 1.5, marginBottom: 8 },
  input: { width: "100%", padding: "10px 12px", border: "1.5px solid #e0f2f1", borderRadius: 10, fontSize: 14, fontFamily: "'Nunito', sans-serif", background: "#f8fdfd", color: "#1a2e35", outline: "none", boxSizing: "border-box" },
  swapBtn: {
    background: "#0a9396",
    color: "#fff",
    border: "none",
    borderRadius: "50%",
    width: 32,
    height: 32,
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  currencyRow: { display: "flex", gap: 8, alignItems: "center", marginBottom: 8 },
  currencySelect: {
    padding: "8px 10px",
    border: "1.5px solid #e0f2f1",
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 700,
    fontFamily: "'Nunito', sans-serif",
    background: "#f8fdfd",
    color: "#1a2e35",
    outline: "none",
    minWidth: 80,
  },
  rateInfo: { fontSize: 11, color: "#78909c", fontWeight: 600, marginTop: 6, textAlign: "center" },
};

// ── LIVE CLOCK ───────────────────────────────────────────────────────────────
function DestinationClock({ timezone, label }) {
  const [time, setTime] = useState("");

  useEffect(() => {
    if (!timezone) return;
    const tick = () => {
      try {
        const now = new Date();
        const timeStr = now.toLocaleTimeString("en-US", { timeZone: timezone, hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true });
        const dateStr = now.toLocaleDateString("en-US", { timeZone: timezone, weekday: "short", month: "short", day: "numeric" });
        setTime(`${timeStr}|${dateStr}`);
      } catch (e) {
        setTime("--");
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [timezone]);

  if (!timezone || !time) return null;
  const [t, d] = time.split("|");

  return (
    <div style={S.clockBox}>
      <div style={S.clockLabel}>{label}</div>
      <div style={S.clockTime}>{t}</div>
      <div style={S.clockSub}>{d}</div>
    </div>
  );
}

// ── DESTINATION SWITCHER (for hero area) ─────────────────────────────────────
export function DestinationSwitcher({ tripId, currentDest, onSwitch }) {
  const [destinations, setDestinations] = useState([]);

  useEffect(() => {
    // Load a curated set: the trip's primary destination + other popular destinations
    // that might be relevant (for multi-stop trips, user picks which to view)
    supabase
      .from("destinations")
      .select("id, name, timezone, currency_code, country")
      .order("name")
      .then(({ data }) => setDestinations(data || []));
  }, []);

  if (destinations.length === 0) return null;

  // Show the current destination first, then a "change" dropdown
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", fontWeight: 700, letterSpacing: 1 }}>VIEWING:</span>
        <select
          value={currentDest?.id || ""}
          onChange={(e) => {
            const d = destinations.find((d) => d.id === e.target.value);
            if (d) onSwitch(d);
          }}
          style={{
            background: "rgba(255,255,255,0.15)",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.3)",
            borderRadius: 8,
            padding: "4px 10px",
            fontSize: 12,
            fontWeight: 700,
            fontFamily: "'Nunito', sans-serif",
            outline: "none",
            cursor: "pointer",
            maxWidth: 200,
          }}
        >
          {currentDest && <option value={currentDest.id}>{currentDest.name}</option>}
          <optgroup label="Switch destination">
            {destinations
              .filter((d) => d.id !== currentDest?.id)
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}{d.country ? `, ${d.country}` : ""}
                </option>
              ))}
          </optgroup>
        </select>
      </div>
    </div>
  );
}

// ── TIMEZONE CLOCKS ROW ──────────────────────────────────────────────────────
export function TimezoneClocks({ destination }) {
  const destTimezone = destination?.timezone;
  const destName = destination?.name;
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <div style={S.clockRow}>
      {destTimezone && <DestinationClock timezone={destTimezone} label={`📍 ${destName || "DESTINATION"}`} />}
      <DestinationClock timezone={userTimezone} label="🏠 YOUR TIME" />
    </div>
  );
}

// ── CURRENCY CONVERTER ───────────────────────────────────────────────────────
export function CurrencyConverter({ destCurrencyCode }) {
  const [rates, setRates] = useState(null);
  const [amount, setAmount] = useState("100");
  const [fromCurrency, setFromCurrency] = useState("USD");
  const [toCurrency, setToCurrency] = useState(destCurrencyCode || "USD");
  const [direction, setDirection] = useState("from"); // "from" = typing in fromCurrency, "to" = typing in toCurrency

  // Common currencies for the dropdown
  const commonCurrencies = ["USD", "NZD", "AUD", "FJD", "EUR", "GBP", "JPY", "CAD", "SGD", "THB", "IDR", "MXN", "CRC", "CZK", "ISK", "ZAR", "AED", "DOP", "AWG", "XPF"];

  useEffect(() => {
    if (destCurrencyCode && destCurrencyCode !== toCurrency) {
      setToCurrency(destCurrencyCode);
    }
  }, [destCurrencyCode]);

  // Fetch all rates based on USD (base)
  const fetchRates = useCallback(async () => {
    try {
      const resp = await fetch("https://open.er-api.com/v6/latest/USD");
      const data = await resp.json();
      if (data.result === "success") {
        setRates(data.rates);
      }
    } catch (e) {
      console.error("Exchange rate fetch error:", e);
    }
  }, []);

  useEffect(() => { fetchRates(); }, [fetchRates]);

  if (!rates || !destCurrencyCode || destCurrencyCode === "USD") return null;

  // Convert between any two currencies via USD as base
  const convert = (amt, from, to) => {
    if (!rates[from] || !rates[to]) return 0;
    const inUSD = amt / rates[from];
    return inUSD * rates[to];
  };

  const parsedAmount = parseFloat(amount) || 0;
  const converted = direction === "from"
    ? convert(parsedAmount, fromCurrency, toCurrency).toFixed(2)
    : convert(parsedAmount, toCurrency, fromCurrency).toFixed(2);

  const rate1 = convert(1, fromCurrency, toCurrency).toFixed(4);
  const rate2 = convert(1, toCurrency, fromCurrency).toFixed(4);

  const handleSwap = () => {
    const oldFrom = fromCurrency;
    const oldTo = toCurrency;
    setFromCurrency(oldTo);
    setToCurrency(oldFrom);
    setDirection("from");
    setAmount(converted);
  };

  // Available currencies for dropdowns (include dest currency + common ones, deduplicated)
  const currencyOptions = [...new Set([destCurrencyCode, ...commonCurrencies])].filter((c) => rates[c]).sort();

  return (
    <div style={S.currencyCard}>
      <div style={S.label}>💱 CURRENCY CONVERTER</div>

      {/* FROM row */}
      <div style={S.currencyRow}>
        <div style={{ position: "relative", flex: 1 }}>
          <input
            type="number"
            value={direction === "from" ? amount : converted}
            onChange={(e) => { setDirection("from"); setAmount(e.target.value); }}
            style={{ ...S.input, marginBottom: 0, fontSize: 16, fontWeight: 700 }}
          />
        </div>
        <select
          value={fromCurrency}
          onChange={(e) => setFromCurrency(e.target.value)}
          style={S.currencySelect}
        >
          {currencyOptions.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Swap button */}
      <div style={{ display: "flex", justifyContent: "center", margin: "4px 0" }}>
        <button style={S.swapBtn} onClick={handleSwap} title="Swap currencies">⇅</button>
      </div>

      {/* TO row */}
      <div style={S.currencyRow}>
        <div style={{ position: "relative", flex: 1 }}>
          <input
            type="number"
            value={direction === "to" ? amount : converted}
            onChange={(e) => { setDirection("to"); setAmount(e.target.value); }}
            style={{ ...S.input, marginBottom: 0, fontSize: 16, fontWeight: 700 }}
          />
        </div>
        <select
          value={toCurrency}
          onChange={(e) => setToCurrency(e.target.value)}
          style={S.currencySelect}
        >
          {currencyOptions.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Rate info */}
      <div style={S.rateInfo}>
        1 {fromCurrency} = {rate1} {toCurrency} · 1 {toCurrency} = {rate2} {fromCurrency}
      </div>
    </div>
  );
}
