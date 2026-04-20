import { useState, useEffect } from "react";
import { supabase } from "./supabase";

const COMMON_TIMEZONES = [
  { label: "Hawaii (HST)", value: "Pacific/Honolulu" },
  { label: "Alaska (AKST)", value: "America/Anchorage" },
  { label: "Pacific (PST/PDT)", value: "America/Los_Angeles" },
  { label: "Mountain (MST/MDT)", value: "America/Denver" },
  { label: "Arizona (MST)", value: "America/Phoenix" },
  { label: "Central (CST/CDT)", value: "America/Chicago" },
  { label: "Eastern (EST/EDT)", value: "America/New_York" },
  { label: "Atlantic (AST)", value: "America/Puerto_Rico" },
  { label: "London (GMT/BST)", value: "Europe/London" },
  { label: "Paris / Rome (CET)", value: "Europe/Paris" },
  { label: "Athens / Istanbul (EET)", value: "Europe/Athens" },
  { label: "Dubai (GST)", value: "Asia/Dubai" },
  { label: "India (IST)", value: "Asia/Kolkata" },
  { label: "Bangkok / Vietnam (ICT)", value: "Asia/Bangkok" },
  { label: "Singapore / Malaysia (SGT)", value: "Asia/Singapore" },
  { label: "Philippines (PHT)", value: "Asia/Manila" },
  { label: "China / Taiwan (CST)", value: "Asia/Shanghai" },
  { label: "Korea (KST)", value: "Asia/Seoul" },
  { label: "Japan (JST)", value: "Asia/Tokyo" },
  { label: "Australia East (AEST)", value: "Australia/Sydney" },
  { label: "New Zealand (NZST)", value: "Pacific/Auckland" },
  { label: "Fiji (FJT)", value: "Pacific/Fiji" },
  { label: "Mexico City (CST)", value: "America/Mexico_City" },
  { label: "São Paulo (BRT)", value: "America/Sao_Paulo" },
  { label: "Buenos Aires (ART)", value: "America/Argentina/Buenos_Aires" },
];

const COMMON_CURRENCIES = [
  { code: "USD", label: "USD – US Dollar" },
  { code: "EUR", label: "EUR – Euro" },
  { code: "GBP", label: "GBP – British Pound" },
  { code: "CAD", label: "CAD – Canadian Dollar" },
  { code: "AUD", label: "AUD – Australian Dollar" },
  { code: "NZD", label: "NZD – New Zealand Dollar" },
  { code: "JPY", label: "JPY – Japanese Yen" },
  { code: "KRW", label: "KRW – South Korean Won" },
  { code: "TWD", label: "TWD – Taiwan Dollar" },
  { code: "PHP", label: "PHP – Philippine Peso" },
  { code: "SGD", label: "SGD – Singapore Dollar" },
  { code: "MYR", label: "MYR – Malaysian Ringgit" },
  { code: "THB", label: "THB – Thai Baht" },
  { code: "VND", label: "VND – Vietnamese Dong" },
  { code: "IDR", label: "IDR – Indonesian Rupiah" },
  { code: "INR", label: "INR – Indian Rupee" },
  { code: "AED", label: "AED – UAE Dirham" },
  { code: "MXN", label: "MXN – Mexican Peso" },
  { code: "BRL", label: "BRL – Brazilian Real" },
  { code: "CRC", label: "CRC – Costa Rican Colón" },
  { code: "DOP", label: "DOP – Dominican Peso" },
  { code: "FJD", label: "FJD – Fijian Dollar" },
  { code: "ZAR", label: "ZAR – South African Rand" },
  { code: "ISK", label: "ISK – Icelandic Króna" },
  { code: "CZK", label: "CZK – Czech Koruna" },
  { code: "AWG", label: "AWG – Aruban Florin" },
  { code: "XPF", label: "XPF – CFP Franc" },
  { code: "CHF", label: "CHF – Swiss Franc" },
  { code: "SEK", label: "SEK – Swedish Krona" },
  { code: "HKD", label: "HKD – Hong Kong Dollar" },
  { code: "CNY", label: "CNY – Chinese Yuan" },
];

const S = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.45)",
    zIndex: 200,
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
  },
  sheet: {
    background: "#fff",
    borderRadius: "20px 20px 0 0",
    padding: "24px 20px 40px",
    width: "100%",
    maxWidth: 480,
    maxHeight: "90vh",
    overflowY: "auto",
    fontFamily: "'Nunito', sans-serif",
  },
  title: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 22,
    color: "#005f73",
    marginBottom: 6,
  },
  sub: { fontSize: 13, color: "#78909c", marginBottom: 20 },
  label: { fontSize: 10, fontWeight: 800, color: "#0a9396", letterSpacing: 1.5, marginBottom: 6, marginTop: 12 },
  input: {
    width: "100%",
    padding: "11px 14px",
    border: "1.5px solid #e0f2f1",
    borderRadius: 10,
    fontSize: 14,
    fontFamily: "'Nunito', sans-serif",
    background: "#f8fdfd",
    color: "#1a2e35",
    outline: "none",
    boxSizing: "border-box",
  },
  select: {
    width: "100%",
    padding: "11px 14px",
    border: "1.5px solid #e0f2f1",
    borderRadius: 10,
    fontSize: 14,
    fontFamily: "'Nunito', sans-serif",
    background: "#f8fdfd",
    color: "#1a2e35",
    outline: "none",
    boxSizing: "border-box",
  },
  hint: { fontSize: 11, color: "#78909c", marginTop: 4, fontStyle: "italic" },
  customBox: {
    background: "#f8fdfd",
    border: "1.5px solid #b2dfdb",
    borderRadius: 12,
    padding: "14px 14px 6px",
    marginTop: 8,
  },
  customBoxLabel: {
    fontSize: 11,
    fontWeight: 800,
    color: "#005f73",
    letterSpacing: 1,
    marginBottom: 10,
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  btn: (color = "#0a9396") => ({
    background: color,
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "13px 20px",
    fontSize: 14,
    fontWeight: 700,
    fontFamily: "'Nunito', sans-serif",
    cursor: "pointer",
    width: "100%",
    marginTop: 16,
  }),
  btnSecondary: {
    background: "transparent",
    color: "#78909c",
    border: "none",
    padding: "10px",
    fontSize: 13,
    fontWeight: 700,
    fontFamily: "'Nunito', sans-serif",
    cursor: "pointer",
    width: "100%",
    marginTop: 4,
  },
  error: {
    background: "#fdecea",
    color: "#c62828",
    padding: "10px 14px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 700,
    marginTop: 12,
  },
  row: { display: "flex", gap: 10 },
  rowCol: { flex: 1 },
};

export default function NewTripModal({ session, onClose, onCreated }) {
  const [destinations, setDestinations] = useState([]);
  const [name, setName] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [customName, setCustomName] = useState("");
  const [customCountry, setCustomCountry] = useState("");
  const [customTimezone, setCustomTimezone] = useState("America/Los_Angeles");
  const [customCurrency, setCustomCurrency] = useState("USD");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    supabase
      .from("destinations")
      .select("id, name, country, timezone, currency_code")
      .order("name")
      .then(({ data, error }) => {
        if (error) console.error("Load destinations error:", error);
        setDestinations(data || []);
      });
  }, []);

  const handleSave = async () => {
    setError(null);
    if (!name.trim()) return setError("Trip name required");
    if (!startDate || !endDate) return setError("Start and end dates required");
    if (new Date(endDate) < new Date(startDate)) return setError("End date must be after start date");

    setSaving(true);

    let finalDestinationId = destinationId || null;

    // If user typed a custom destination, create it first
    if (!finalDestinationId && customName.trim()) {
      const { data: newDest, error: destError } = await supabase
        .from("destinations")
        .insert({
          name: customName.trim(),
          country: customCountry.trim() || null,
          timezone: customTimezone,
          currency_code: customCurrency,
          is_seeded: false,
        })
        .select()
        .single();
      if (destError) {
        // If name already exists, try to fetch it
        const { data: existing } = await supabase
          .from("destinations")
          .select("id")
          .eq("name", customName.trim())
          .maybeSingle();
        if (existing) {
          finalDestinationId = existing.id;
        } else {
          setError("Could not create destination: " + destError.message);
          setSaving(false);
          return;
        }
      } else {
        finalDestinationId = newDest.id;
      }
    }

    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .insert({
        name: name.trim(),
        start_date: startDate,
        end_date: endDate,
        destination_id: finalDestinationId,
        owner_id: session.user.id,
      })
      .select()
      .single();

    if (tripError) {
      setError("Could not create trip: " + tripError.message);
      setSaving(false);
      return;
    }

    onCreated(trip.id);
  };

  const selectedDest = destinations.find((d) => d.id === destinationId);
  const showCustomFields = !destinationId;

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.sheet} onClick={(e) => e.stopPropagation()}>
        <div style={S.title}>Plan a New Trip 🌴</div>
        <div style={S.sub}>Give your trip a name and pick your destination</div>

        <div style={S.label}>TRIP NAME</div>
        <input
          style={S.input}
          placeholder="e.g. Hawaii Family Trip 2026"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <div style={S.label}>DESTINATION</div>
        <select
          style={S.select}
          value={destinationId}
          onChange={(e) => {
            setDestinationId(e.target.value);
            if (e.target.value) {
              setCustomName("");
              setCustomCountry("");
            }
          }}
        >
          <option value="">— Custom / not listed —</option>
          {destinations.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}{d.country && d.country !== d.name ? `, ${d.country}` : ""}
            </option>
          ))}
        </select>

        {selectedDest && (
          <div style={S.hint}>
            🕐 {selectedDest.timezone} • 💱 {selectedDest.currency_code}
          </div>
        )}

        {showCustomFields && (
          <div style={S.customBox}>
            <div style={S.customBoxLabel}>📍 Custom Destination</div>

            <div style={S.label}>PLACE NAME</div>
            <input
              style={S.input}
              placeholder="e.g. Manila"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
            />

            <div style={S.label}>COUNTRY</div>
            <input
              style={S.input}
              placeholder="e.g. Philippines"
              value={customCountry}
              onChange={(e) => setCustomCountry(e.target.value)}
            />

            <div style={S.row}>
              <div style={S.rowCol}>
                <div style={S.label}>TIMEZONE</div>
                <select
                  style={S.select}
                  value={customTimezone}
                  onChange={(e) => setCustomTimezone(e.target.value)}
                >
                  {COMMON_TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>{tz.label}</option>
                  ))}
                </select>
              </div>
              <div style={S.rowCol}>
                <div style={S.label}>CURRENCY</div>
                <select
                  style={S.select}
                  value={customCurrency}
                  onChange={(e) => setCustomCurrency(e.target.value)}
                >
                  {COMMON_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.code}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={S.hint}>
              These power the timezone clocks and currency converter on your trip
            </div>
          </div>
        )}

        <div style={S.row}>
          <div style={S.rowCol}>
            <div style={S.label}>START DATE</div>
            <input
              style={S.input}
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div style={S.rowCol}>
            <div style={S.label}>END DATE</div>
            <input
              style={S.input}
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        {error && <div style={S.error}>{error}</div>}

        <button style={S.btn()} onClick={handleSave} disabled={saving}>
          {saving ? "Creating…" : "Create Trip"}
        </button>
        <button style={S.btnSecondary} onClick={onClose} disabled={saving}>Cancel</button>
      </div>
    </div>
  );
}
