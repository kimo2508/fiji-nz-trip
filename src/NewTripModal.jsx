import { useState, useEffect } from "react";
import { supabase } from "./supabase";

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
  const [customDestination, setCustomDestination] = useState("");
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
    if (!finalDestinationId && customDestination.trim()) {
      const { data: newDest, error: destError } = await supabase
        .from("destinations")
        .insert({
          name: customDestination.trim(),
          timezone: "UTC",
          currency_code: "USD",
          is_seeded: false,
        })
        .select()
        .single();
      if (destError) {
        // If name already exists, try to fetch it
        const { data: existing } = await supabase
          .from("destinations")
          .select("id")
          .eq("name", customDestination.trim())
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
            setCustomDestination("");
          }}
        >
          <option value="">— Select destination —</option>
          {destinations.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}{d.country && d.country !== d.name ? `, ${d.country}` : ""}
            </option>
          ))}
        </select>

        {!destinationId && (
          <>
            <div style={S.label}>OR TYPE A CUSTOM DESTINATION</div>
            <input
              style={S.input}
              placeholder="e.g. Santa Barbara"
              value={customDestination}
              onChange={(e) => setCustomDestination(e.target.value)}
            />
          </>
        )}

        {selectedDest && (
          <div style={S.hint}>
            🕐 {selectedDest.timezone} • 💱 {selectedDest.currency_code}
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
