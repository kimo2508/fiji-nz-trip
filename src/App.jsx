import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";
import Login from "./Login";
import TripsList from "./TripsList";

const PACKING_CATEGORIES = ["Clothing", "Toiletries", "Documents", "Electronics", "Health", "Beach & Water", "Misc"];
const ACTIVITY_CATEGORIES = ["🍽️ Restaurant", "🏄 Activity", "🗺️ Sightseeing", "🚗 Transport", "📝 Note"];
const CAT_COLORS = {
  "🍽️ Restaurant": "#f4a261",
  "🏄 Activity": "#2a9d8f",
  "🗺️ Sightseeing": "#e76f51",
  "🚗 Transport": "#457b9d",
  "📝 Note": "#a8dadc",
};
const ESTIMATE_CATEGORIES = ["Food & Dining", "Transportation", "Activities", "Shopping", "Groceries", "Misc"];

const daysUntil = (startDate) => {
  if (!startDate) return 0;
  const diff = new Date(startDate + "T12:00:00") - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

const fmt = (n) => {
  const num = parseFloat(n) || 0;
  return num.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

const nightsBetween = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return 0;
  const diff = new Date(checkOut) - new Date(checkIn);
  return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
};

const formatTripDates = (start, end) => {
  if (!start || !end) return "";
  const s = new Date(start + "T12:00:00");
  const e = new Date(end + "T12:00:00");
  const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
  const sameYear = s.getFullYear() === e.getFullYear();
  if (sameMonth) return `${s.toLocaleDateString("en-US", { month: "long" })} ${s.getDate()}–${e.getDate()}, ${s.getFullYear()}`;
  if (sameYear) return `${s.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${e.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${s.getFullYear()}`;
  return `${s.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} – ${e.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
};

// ─── STYLES ──────────────────────────────────────────────────────────────────
const S = {
  wrap: {
    maxWidth: 480,
    margin: "0 auto",
    minHeight: "100vh",
    background: "#f0f9f9",
    fontFamily: "'Nunito', sans-serif",
    paddingBottom: 80,
  },
  hero: {
    background: "linear-gradient(135deg, #0a9396 0%, #005f73 100%)",
    padding: "28px 20px 48px",
    position: "relative",
    overflow: "hidden",
  },
  heroTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 26,
    color: "#fff",
    margin: 0,
    letterSpacing: 0.5,
  },
  heroSub: { fontSize: 13, color: "rgba(255,255,255,0.8)", fontWeight: 600 },
  backBtn: {
    background: "rgba(255,255,255,0.2)",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "6px 12px",
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "'Nunito', sans-serif",
    marginBottom: 10,
  },
  statRow: { marginTop: 16, display: "flex", gap: 10 },
  stat: {
    background: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    padding: "10px 12px",
    textAlign: "center",
    flex: 1,
  },
  statNum: { fontFamily: "'Playfair Display',serif", fontSize: 24, color: "#fff", lineHeight: 1 },
  statLabel: { fontSize: 8, color: "rgba(255,255,255,0.7)", fontWeight: 700, letterSpacing: 1, marginTop: 2 },
  nav: {
    position: "sticky",
    top: 0,
    zIndex: 100,
    background: "#fff",
    display: "flex",
    overflowX: "auto",
    borderBottom: "2px solid #e0f2f1",
    scrollbarWidth: "none",
  },
  nb: (active) => ({
    flex: "0 0 auto",
    padding: "12px 14px",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.5,
    border: "none",
    background: "none",
    color: active ? "#0a9396" : "#90a4ae",
    borderBottom: active ? "2px solid #0a9396" : "2px solid transparent",
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "all 0.15s",
  }),
  sec: { padding: "16px 16px 0" },
  card: {
    background: "#fff",
    borderRadius: 14,
    padding: "14px 16px",
    marginBottom: 12,
    boxShadow: "0 1px 6px rgba(0,0,0,0.07)",
  },
  label: { fontSize: 10, fontWeight: 800, color: "#0a9396", letterSpacing: 1.5, marginBottom: 8 },
  input: {
    width: "100%",
    padding: "10px 12px",
    border: "1.5px solid #e0f2f1",
    borderRadius: 10,
    fontSize: 14,
    fontFamily: "'Nunito', sans-serif",
    background: "#f8fdfd",
    color: "#1a2e35",
    outline: "none",
    boxSizing: "border-box",
    marginBottom: 8,
  },
  priceInput: {
    padding: "10px 12px",
    border: "1.5px solid #b2dfdb",
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 700,
    fontFamily: "'Nunito', sans-serif",
    background: "#e8f5e9",
    color: "#2e7d32",
    outline: "none",
    boxSizing: "border-box",
    marginBottom: 8,
    width: "100%",
  },
  select: {
    width: "100%",
    padding: "10px 12px",
    border: "1.5px solid #e0f2f1",
    borderRadius: 10,
    fontSize: 14,
    fontFamily: "'Nunito', sans-serif",
    background: "#f8fdfd",
    color: "#1a2e35",
    outline: "none",
    marginBottom: 8,
  },
  btn: (color = "#0a9396") => ({
    background: color,
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "11px 20px",
    fontSize: 13,
    fontWeight: 700,
    fontFamily: "'Nunito', sans-serif",
    cursor: "pointer",
    width: "100%",
    marginTop: 4,
  }),
  btnSm: (color = "#0a9396") => ({
    background: color,
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "6px 12px",
    fontSize: 11,
    fontWeight: 700,
    fontFamily: "'Nunito', sans-serif",
    cursor: "pointer",
  }),
  del: {
    background: "none",
    border: "none",
    color: "#b0bec5",
    fontSize: 18,
    cursor: "pointer",
    padding: "2px 6px",
    lineHeight: 1,
  },
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
  },
  row: { display: "flex", gap: 8, alignItems: "center" },
  chip: (color) => ({
    display: "inline-block",
    padding: "3px 9px",
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 700,
    background: color + "20",
    color: color,
    marginRight: 4,
  }),
  priceTag: {
    display: "inline-flex",
    alignItems: "center",
    gap: 3,
    padding: "3px 8px",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 800,
    background: "#e8f5e9",
    color: "#2e7d32",
    marginLeft: "auto",
  },
  budgetCard: (accent) => ({
    background: "#fff",
    borderRadius: 14,
    padding: "14px 16px",
    marginBottom: 10,
    boxShadow: "0 1px 6px rgba(0,0,0,0.07)",
    borderLeft: `4px solid ${accent}`,
  }),
  totalBanner: (bg, text) => ({
    background: bg,
    borderRadius: 16,
    padding: "16px 18px",
    marginBottom: 12,
    textAlign: "center",
    color: text,
  }),
};

// ─── MODAL WRAPPER ────────────────────────────────────────────────────────────
function Modal({ onClose, children }) {
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.sheet} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

// ─── TRIP PLANNER (one trip's detail view) ───────────────────────────────────
function TripDetail({ tripId, onBack }) {
  const [tab, setTab] = useState("home");
  const [trip, setTrip] = useState(null);
  const [days, setDays] = useState([]);
  const [items, setItems] = useState([]);
  const [flights, setFlights] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [packing, setPacking] = useState([]);
  const [estimates, setEstimates] = useState([]);
  const [tripBudget, setTripBudget] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState(null);
  const [showModal, setShowModal] = useState(null);
  const [form, setForm] = useState({});
  const [packFilter, setPackFilter] = useState("All");
  const [editItem, setEditItem] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [tr, d, it, fl, ho, pk, est, tb] = await Promise.all([
      supabase.from("trips").select("*").eq("id", tripId).maybeSingle(),
      supabase.from("itinerary_days").select("*").eq("trip_id", tripId).order("date"),
      supabase.from("itinerary_items").select("*").eq("trip_id", tripId).order("time"),
      supabase.from("flights").select("*").eq("trip_id", tripId).order("departure"),
      supabase.from("hotels").select("*").eq("trip_id", tripId).order("check_in"),
      supabase.from("packing_items").select("*").eq("trip_id", tripId).order("category"),
      supabase.from("budget_estimates").select("*").eq("trip_id", tripId).order("sort_order"),
      supabase.from("trip_budget").select("*").eq("trip_id", tripId).limit(1),
    ]);
    if (tr.error) console.error("Trip load error:", tr.error);
    setTrip(tr.data || null);
    setDays(d.data || []);
    setItems(it.data || []);
    setFlights(fl.data || []);
    setHotels(ho.data || []);
    setPacking(pk.data || []);
    setEstimates(est.data || []);
    if (tb.data && tb.data.length > 0) setTripBudget(parseFloat(tb.data[0].total_budget) || 0);
    else setTripBudget(0);
    setLoading(false);
  }, [tripId]);

  useEffect(() => { load(); }, [load]);

  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const flightsTotal = flights.reduce((s, fl) => s + (parseFloat(fl.price) || 0), 0);
  const hotelsTotal = hotels.reduce((s, h) => {
    const nights = nightsBetween(h.check_in, h.check_out);
    return s + nights * (parseFloat(h.price_per_night) || 0);
  }, 0);
  const bookedActivities = items.filter((i) => i.is_booked).reduce((s, i) => s + (parseFloat(i.price) || 0), 0);
  const confirmedTotal = flightsTotal + hotelsTotal + bookedActivities;
  const estimatesTotal = estimates.reduce((s, e) => s + (parseFloat(e.daily_amount) || 0) * (parseInt(e.days) || 1), 0);
  const grandTotal = confirmedTotal + estimatesTotal;
  const remaining = tripBudget - grandTotal;

  const closeModal = () => { setShowModal(null); setForm({}); setEditItem(null); };

  const saveDay = async () => {
    if (!form.date) return;
    const payload = { date: form.date, location: form.location || "", notes: form.notes || "", trip_id: tripId };
    if (editItem) {
      await supabase.from("itinerary_days").update(payload).eq("id", editItem.id);
    } else {
      await supabase.from("itinerary_days").insert(payload);
    }
    closeModal(); load();
  };

  const saveItem = async () => {
    if (!form.title || !activeDay) return;
    const payload = {
      day_id: activeDay,
      trip_id: tripId,
      category: form.category || ACTIVITY_CATEGORIES[0],
      title: form.title,
      details: form.details || "",
      time: form.time || "",
      confirmed: form.confirmed === "true" || form.confirmed === true,
      price: parseFloat(form.price) || 0,
      is_booked: form.is_booked === "true" || form.is_booked === true,
    };
    if (editItem) {
      await supabase.from("itinerary_items").update(payload).eq("id", editItem.id);
    } else {
      await supabase.from("itinerary_items").insert(payload);
    }
    closeModal(); load();
  };

  const saveFlight = async () => {
    if (!form.flight_number) return;
    const payload = {
      trip_id: tripId,
      flight_number: form.flight_number,
      from_location: form.from_location || "",
      to_location: form.to_location || "",
      departure: form.departure || "",
      arrival: form.arrival || "",
      airline: form.airline || "",
      confirmation: form.confirmation || "",
      price: parseFloat(form.price) || 0,
    };
    if (editItem) {
      await supabase.from("flights").update(payload).eq("id", editItem.id);
    } else {
      await supabase.from("flights").insert(payload);
    }
    closeModal(); load();
  };

  const saveHotel = async () => {
    if (!form.name) return;
    const payload = {
      trip_id: tripId,
      name: form.name,
      location: form.location || "",
      check_in: form.check_in || "",
      check_out: form.check_out || "",
      confirmation: form.confirmation || "",
      notes: form.notes || "",
      price_per_night: parseFloat(form.price_per_night) || 0,
    };
    if (editItem) {
      await supabase.from("hotels").update(payload).eq("id", editItem.id);
    } else {
      await supabase.from("hotels").insert(payload);
    }
    closeModal(); load();
  };

  const savePacking = async () => {
    if (!form.item) return;
    const payload = { trip_id: tripId, item: form.item, category: form.category || "Misc" };
    if (editItem) {
      await supabase.from("packing_items").update(payload).eq("id", editItem.id);
    } else {
      await supabase.from("packing_items").insert({ ...payload, packed: false });
    }
    closeModal(); load();
  };

  const saveEstimate = async () => {
    if (!form.label) return;
    const payload = {
      trip_id: tripId,
      label: form.label,
      daily_amount: parseFloat(form.daily_amount) || 0,
      days: parseInt(form.days) || 1,
      category: form.category || ESTIMATE_CATEGORIES[0],
      sort_order: estimates.length,
    };
    if (editItem) {
      await supabase.from("budget_estimates").update(payload).eq("id", editItem.id);
    } else {
      await supabase.from("budget_estimates").insert(payload);
    }
    closeModal(); load();
  };

  const saveTripBudget = async (val) => {
    const num = parseFloat(val) || 0;
    setTripBudget(num);
    const existing = await supabase.from("trip_budget").select("id").eq("trip_id", tripId).limit(1);
    if (existing.data && existing.data.length > 0) {
      await supabase.from("trip_budget").update({ total_budget: num }).eq("id", existing.data[0].id);
    } else {
      await supabase.from("trip_budget").insert({ total_budget: num, trip_id: tripId });
    }
  };

  const deleteRecord = async (table, id) => {
    await supabase.from(table).delete().eq("id", id);
    load();
  };

  const togglePacked = async (id, packed) => {
    await supabase.from("packing_items").update({ packed: !packed }).eq("id", id);
    setPacking((p) => p.map((x) => (x.id === id ? { ...x, packed: !packed } : x)));
  };

  const toggleConfirmed = async (id, confirmed) => {
    await supabase.from("itinerary_items").update({ confirmed: !confirmed }).eq("id", id);
    setItems((p) => p.map((x) => (x.id === id ? { ...x, confirmed: !confirmed } : x)));
  };

  const openEdit = (modal, record, extra = {}) => {
    setEditItem(record);
    setForm({ ...record, ...extra });
    setShowModal(modal);
  };

  const packedCount = packing.filter((p) => p.packed).length;

  if (loading) {
    return (
      <div style={{ ...S.wrap, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48 }}>🌺</div>
          <div style={{ color: "#0a9396", fontWeight: 700, marginTop: 12 }}>Loading trip…</div>
        </div>
      </div>
    );
  }

  const tripName = trip?.name || "My Trip";
  const tripDates = trip ? formatTripDates(trip.start_date, trip.end_date) : "";
  const tripStart = trip?.start_date;

  return (
    <div style={S.wrap}>
      <div style={S.hero}>
        <button style={S.backBtn} onClick={onBack}>← My Trips</button>
        <p style={{ ...S.heroTitle, marginBottom: 4 }}>{tripName} 🌴</p>
        <div style={S.heroSub}>{tripDates} ✈️</div>
        <div style={S.statRow}>
          {[
            { v: daysUntil(tripStart), l: "DAYS TO GO" },
            { v: days.length, l: "DAYS PLANNED" },
            { v: `${packedCount}/${packing.length}`, l: "PACKED" },
            { v: fmt(confirmedTotal), l: "CONFIRMED" },
          ].map((s, i) => (
            <div key={i} style={S.stat}>
              <div style={{ ...S.statNum, fontSize: i === 3 ? 14 : 24 }}>{s.v}</div>
              <div style={S.statLabel}>{s.l}</div>
            </div>
          ))}
        </div>
        <svg style={{ position: "absolute", bottom: -2, left: 0, right: 0 }} viewBox="0 0 480 40" preserveAspectRatio="none" height="40">
          <path d="M0,20 C120,40 360,0 480,20 L480,40 L0,40 Z" fill="#f0f9f9" />
        </svg>
      </div>

      <div style={S.nav}>
        {[
          { id: "home", l: "🏠 HOME" },
          { id: "itinerary", l: "📅 ITINERARY" },
          { id: "flights", l: "✈️ FLIGHTS" },
          { id: "hotels", l: "🏨 HOTELS" },
          { id: "packing", l: "🎒 PACKING" },
          { id: "budget", l: "💰 BUDGET" },
        ].map((t) => (
          <button key={t.id} style={S.nb(tab === t.id)} onClick={() => setTab(t.id)}>
            {t.l}
          </button>
        ))}
      </div>

      {tab === "home" && (
        <div style={S.sec}>
          <div style={{ ...S.card, background: "linear-gradient(135deg, #e8f5e9, #f0f9f9)" }}>
            <div style={S.label}>TRIP BUDGET SNAPSHOT</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <div style={{ flex: 1, textAlign: "center", background: "#fff", borderRadius: 10, padding: "10px 6px" }}>
                <div style={{ fontSize: 11, color: "#666", fontWeight: 700 }}>BUDGET</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#1a2e35" }}>{fmt(tripBudget)}</div>
              </div>
              <div style={{ flex: 1, textAlign: "center", background: "#fff", borderRadius: 10, padding: "10px 6px" }}>
                <div style={{ fontSize: 11, color: "#666", fontWeight: 700 }}>PROJECTED</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#e76f51" }}>{fmt(grandTotal)}</div>
              </div>
              <div style={{ flex: 1, textAlign: "center", background: remaining >= 0 ? "#e8f5e9" : "#fdecea", borderRadius: 10, padding: "10px 6px" }}>
                <div style={{ fontSize: 11, color: "#666", fontWeight: 700 }}>LEFT</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: remaining >= 0 ? "#2e7d32" : "#c62828" }}>{fmt(remaining)}</div>
              </div>
            </div>
            <button style={{ ...S.btnSm("#0a9396"), width: "100%", padding: "8px" }} onClick={() => setTab("budget")}>
              View Full Budget →
            </button>
          </div>

          <div style={S.card}>
            <div style={S.label}>QUICK STATS</div>
            {[
              { l: "Flights booked", v: flights.length },
              { l: "Hotels/stays", v: hotels.length },
              { l: "Activities planned", v: items.length },
              { l: "Flights cost", v: fmt(flightsTotal) },
              { l: "Lodging cost", v: fmt(hotelsTotal) },
              { l: "Booked activities", v: fmt(bookedActivities) },
            ].map((s) => (
              <div key={s.l} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #f0f9f9" }}>
                <span style={{ fontSize: 13, color: "#546e7a" }}>{s.l}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#1a2e35" }}>{s.v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "itinerary" && (
        <div style={S.sec}>
          <button style={S.btn()} onClick={() => { setForm({}); setShowModal("day"); }}>+ Add Day</button>
          <div style={{ marginTop: 12 }}>
            {days.length === 0 && (
              <div style={{ ...S.card, textAlign: "center", color: "#90a4ae", fontSize: 13, fontStyle: "italic", padding: 30 }}>
                No days planned yet. Tap "+ Add Day" to start your itinerary.
              </div>
            )}
            {days.map((day) => {
              const dayItems = items.filter((i) => i.day_id === day.id);
              const daySpend = dayItems.filter((i) => i.is_booked).reduce((s, i) => s + (parseFloat(i.price) || 0), 0);
              return (
                <div key={day.id} style={{ ...S.card, marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div>
                      <div style={{ fontWeight: 800, color: "#005f73", fontSize: 15 }}>
                        {new Date(day.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                      </div>
                      <div style={{ fontSize: 12, color: "#78909c" }}>{day.location}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      {daySpend > 0 && <span style={S.priceTag}>{fmt(daySpend)}</span>}
                      <button style={S.btnSm("#94a3b8")} onClick={() => openEdit("day", day)}>✏️</button>
                      <button style={S.del} onClick={() => deleteRecord("itinerary_days", day.id)}>×</button>
                    </div>
                  </div>
                  {day.notes && <div style={{ fontSize: 12, color: "#78909c", marginBottom: 10, fontStyle: "italic" }}>{day.notes}</div>}
                  {dayItems.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        background: item.confirmed ? "#f0fdf4" : "#fafafa",
                        border: `1px solid ${item.confirmed ? "#bbf7d0" : "#e8f0f2"}`,
                        borderRadius: 10,
                        padding: "10px 12px",
                        marginBottom: 8,
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 8,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={item.confirmed}
                        onChange={() => toggleConfirmed(item.id, item.confirmed)}
                        style={{ marginTop: 3, accentColor: "#0a9396" }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <span style={S.chip(CAT_COLORS[item.category] || "#90a4ae")}>{item.category}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#1a2e35" }}>{item.title}</span>
                          {(parseFloat(item.price) > 0) && (
                            <span style={{ ...S.priceTag, fontSize: 11 }}>
                              {item.is_booked ? "✅" : "~"} {fmt(item.price)}
                            </span>
                          )}
                        </div>
                        {item.time && <div style={{ fontSize: 11, color: "#78909c", marginTop: 2 }}>⏰ {item.time}</div>}
                        {item.details && <div style={{ fontSize: 12, color: "#546e7a", marginTop: 3 }}>{item.details}</div>}
                      </div>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button style={S.btnSm("#94a3b8")} onClick={() => { setActiveDay(day.id); openEdit("item", item); }}>✏️</button>
                        <button style={S.del} onClick={() => deleteRecord("itinerary_items", item.id)}>×</button>
                      </div>
                    </div>
                  ))}
                  <button
                    style={{ ...S.btnSm("#0a9396"), marginTop: 4, width: "100%", padding: "8px" }}
                    onClick={() => { setActiveDay(day.id); setForm({ category: ACTIVITY_CATEGORIES[0] }); setShowModal("item"); }}
                  >
                    + Add Activity
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "flights" && (
        <div style={S.sec}>
          {flightsTotal > 0 && (
            <div style={{ ...S.totalBanner("linear-gradient(135deg,#e3f2fd,#bbdefb)", "#1a2e35"), marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, color: "#1565c0", marginBottom: 4 }}>TOTAL FLIGHTS COST</div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 30, fontWeight: 700, color: "#1565c0" }}>{fmt(flightsTotal)}</div>
            </div>
          )}
          <button style={S.btn()} onClick={() => { setForm({}); setShowModal("flight"); }}>+ Add Flight</button>
          <div style={{ marginTop: 12 }}>
            {flights.map((fl) => (
              <div key={fl.id} style={S.card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 800, color: "#005f73", fontSize: 15 }}>✈️ {fl.flight_number}</div>
                    <div style={{ fontSize: 13, color: "#1a2e35", marginTop: 4 }}>
                      {fl.from_location} → {fl.to_location}
                    </div>
                    {fl.airline && <div style={{ fontSize: 12, color: "#78909c" }}>{fl.airline}</div>}
                    {fl.departure && <div style={{ fontSize: 12, color: "#78909c" }}>Dep: {fl.departure}</div>}
                    {fl.arrival && <div style={{ fontSize: 12, color: "#78909c" }}>Arr: {fl.arrival}</div>}
                    {fl.confirmation && <div style={{ fontSize: 11, color: "#0a9396", fontWeight: 700, marginTop: 4 }}>Conf: {fl.confirmation}</div>}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                    {parseFloat(fl.price) > 0 && <span style={S.priceTag}>{fmt(fl.price)}</span>}
                    <div style={{ display: "flex", gap: 4 }}>
                      <button style={S.btnSm("#94a3b8")} onClick={() => openEdit("flight", fl)}>✏️</button>
                      <button style={S.del} onClick={() => deleteRecord("flights", fl.id)}>×</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "hotels" && (
        <div style={S.sec}>
          {hotelsTotal > 0 && (
            <div style={{ ...S.totalBanner("linear-gradient(135deg,#f3e5f5,#e1bee7)", "#1a2e35"), marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, color: "#6a1b9a", marginBottom: 4 }}>TOTAL LODGING COST</div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 30, fontWeight: 700, color: "#6a1b9a" }}>{fmt(hotelsTotal)}</div>
              <div style={{ fontSize: 11, color: "#9c4dcc", marginTop: 4 }}>Calculated from nightly rate × nights</div>
            </div>
          )}
          <button style={S.btn()} onClick={() => { setForm({}); setShowModal("hotel"); }}>+ Add Hotel / Airbnb</button>
          <div style={{ marginTop: 12 }}>
            {hotels.map((h) => {
              const nights = nightsBetween(h.check_in, h.check_out);
              const total = nights * (parseFloat(h.price_per_night) || 0);
              return (
                <div key={h.id} style={S.card}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, color: "#005f73", fontSize: 15 }}>🏨 {h.name}</div>
                      {h.location && <div style={{ fontSize: 12, color: "#78909c" }}>📍 {h.location}</div>}
                      <div style={{ fontSize: 12, color: "#546e7a", marginTop: 4 }}>
                        {h.check_in} → {h.check_out}
                        {nights > 0 && <span style={{ fontWeight: 700, color: "#0a9396" }}> ({nights} nights)</span>}
                      </div>
                      {parseFloat(h.price_per_night) > 0 && (
                        <div style={{ fontSize: 12, color: "#78909c", marginTop: 2 }}>
                          {fmt(h.price_per_night)}/night
                          {total > 0 && <span style={{ fontWeight: 800, color: "#2e7d32" }}> = {fmt(total)} total</span>}
                        </div>
                      )}
                      {h.confirmation && <div style={{ fontSize: 11, color: "#0a9396", fontWeight: 700, marginTop: 4 }}>Conf: {h.confirmation}</div>}
                      {h.notes && <div style={{ fontSize: 12, color: "#78909c", marginTop: 4, fontStyle: "italic" }}>{h.notes}</div>}
                    </div>
                    <div style={{ display: "flex", gap: 4, marginLeft: 8 }}>
                      <button style={S.btnSm("#94a3b8")} onClick={() => openEdit("hotel", h)}>✏️</button>
                      <button style={S.del} onClick={() => deleteRecord("hotels", h.id)}>×</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "packing" && (
        <div style={S.sec}>
          <div style={{ ...S.card, background: "linear-gradient(135deg,#e0f7fa,#f0f9f9)", marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontWeight: 800, fontSize: 14, color: "#005f73" }}>Packing Progress</span>
              <span style={{ fontWeight: 700, color: "#0a9396" }}>{packedCount}/{packing.length}</span>
            </div>
            <div style={{ background: "#b2ebf2", borderRadius: 8, height: 8, overflow: "hidden" }}>
              <div style={{ background: "#0a9396", height: "100%", width: `${packing.length ? (packedCount / packing.length) * 100 : 0}%`, borderRadius: 8, transition: "width 0.3s" }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8, scrollbarWidth: "none", marginBottom: 8 }}>
            {["All", ...PACKING_CATEGORIES].map((cat) => (
              <button
                key={cat}
                style={{ ...S.btnSm(packFilter === cat ? "#0a9396" : "#b2dfdb"), color: packFilter === cat ? "#fff" : "#005f73", flex: "0 0 auto" }}
                onClick={() => setPackFilter(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
          <button style={S.btn()} onClick={() => { setForm({ category: "Misc" }); setShowModal("packing"); }}>+ Add Item</button>
          <div style={{ marginTop: 12 }}>
            {PACKING_CATEGORIES.filter((c) => packFilter === "All" || packFilter === c).map((cat) => {
              const catItems = packing.filter((p) => p.category === cat);
              if (!catItems.length) return null;
              return (
                <div key={cat} style={{ marginBottom: 16 }}>
                  <div style={S.label}>{cat.toUpperCase()}</div>
                  {catItems.map((p) => (
                    <div
                      key={p.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 14px",
                        background: p.packed ? "#f0fdf4" : "#fff",
                        borderRadius: 10,
                        marginBottom: 6,
                        border: `1px solid ${p.packed ? "#bbf7d0" : "#e0f2f1"}`,
                      }}
                    >
                      <input type="checkbox" checked={p.packed} onChange={() => togglePacked(p.id, p.packed)} style={{ accentColor: "#0a9396" }} />
                      <span style={{ flex: 1, fontSize: 14, color: p.packed ? "#78909c" : "#1a2e35", textDecoration: p.packed ? "line-through" : "none" }}>{p.item}</span>
                      <button style={S.btnSm("#94a3b8")} onClick={() => openEdit("packing", p)}>✏️</button>
                      <button style={S.del} onClick={() => deleteRecord("packing_items", p.id)}>×</button>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "budget" && (
        <div style={S.sec}>
          <div style={S.card}>
            <div style={S.label}>TOTAL TRIP BUDGET</div>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 12, top: 11, color: "#2e7d32", fontWeight: 800, fontSize: 15 }}>$</span>
              <input
                type="number"
                key={tripBudget}
                defaultValue={tripBudget || ""}
                placeholder="Enter your total budget"
                onBlur={(e) => saveTripBudget(e.target.value)}
                style={{ ...S.priceInput, paddingLeft: 24 }}
              />
            </div>
          </div>

          <div style={S.totalBanner(remaining >= 0 ? "linear-gradient(135deg,#e8f5e9,#c8e6c9)" : "linear-gradient(135deg,#fdecea,#ffcdd2)", "#1a2e35")}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, color: remaining >= 0 ? "#2e7d32" : "#c62828", marginBottom: 4 }}>
              {remaining >= 0 ? "✅ UNDER BUDGET" : "⚠️ OVER BUDGET"}
            </div>
            <div style={{ display: "flex", justifyContent: "space-around" }}>
              <div>
                <div style={{ fontSize: 11, color: "#546e7a", fontWeight: 700 }}>PROJECTED</div>
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, color: "#e76f51" }}>{fmt(grandTotal)}</div>
              </div>
              <div style={{ width: 1, background: "rgba(0,0,0,0.1)" }} />
              <div>
                <div style={{ fontSize: 11, color: "#546e7a", fontWeight: 700 }}>{remaining >= 0 ? "REMAINING" : "OVER BY"}</div>
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, color: remaining >= 0 ? "#2e7d32" : "#c62828" }}>{fmt(Math.abs(remaining))}</div>
              </div>
            </div>
          </div>

          <div style={{ ...S.label, marginTop: 4 }}>✅ CONFIRMED COSTS</div>
          <div style={S.budgetCard("#1565c0")}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#1a2e35" }}>✈️ Flights</span>
              <span style={{ fontWeight: 800, color: "#1565c0", fontSize: 15 }}>{fmt(flightsTotal)}</span>
            </div>
            {flights.filter((f) => parseFloat(f.price) > 0).map((f) => (
              <div key={f.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#546e7a", padding: "3px 0" }}>
                <span>{f.flight_number} {f.from_location} → {f.to_location}</span>
                <span style={{ fontWeight: 700 }}>{fmt(f.price)}</span>
              </div>
            ))}
            {flights.filter((f) => parseFloat(f.price) > 0).length === 0 && (
              <div style={{ fontSize: 12, color: "#90a4ae", fontStyle: "italic" }}>No prices added yet — edit flights to add costs</div>
            )}
          </div>

          <div style={S.budgetCard("#6a1b9a")}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#1a2e35" }}>🏨 Lodging</span>
              <span style={{ fontWeight: 800, color: "#6a1b9a", fontSize: 15 }}>{fmt(hotelsTotal)}</span>
            </div>
            {hotels.map((h) => {
              const nights = nightsBetween(h.check_in, h.check_out);
              const total = nights * (parseFloat(h.price_per_night) || 0);
              return (
                <div key={h.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#546e7a", padding: "3px 0" }}>
                  <span>{h.name} {nights > 0 ? `(${nights}n)` : ""}</span>
                  <span style={{ fontWeight: 700 }}>{total > 0 ? fmt(total) : "—"}</span>
                </div>
              );
            })}
            {hotels.length === 0 && <div style={{ fontSize: 12, color: "#90a4ae", fontStyle: "italic" }}>No hotels added yet</div>}
          </div>

          <div style={S.budgetCard("#2e7d32")}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#1a2e35" }}>🎟️ Booked Activities</span>
              <span style={{ fontWeight: 800, color: "#2e7d32", fontSize: 15 }}>{fmt(bookedActivities)}</span>
            </div>
            {items.filter((i) => i.is_booked && parseFloat(i.price) > 0).map((i) => (
              <div key={i.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#546e7a", padding: "3px 0" }}>
                <span>{i.title}</span>
                <span style={{ fontWeight: 700 }}>{fmt(i.price)}</span>
              </div>
            ))}
            {items.filter((i) => i.is_booked && parseFloat(i.price) > 0).length === 0 && (
              <div style={{ fontSize: 12, color: "#90a4ae", fontStyle: "italic" }}>Mark itinerary items as "Booked" to track here</div>
            )}
          </div>

          <div style={{ ...S.card, background: "#f8f9fa", border: "2px dashed #b0bec5" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 800, color: "#1a2e35" }}>Confirmed Subtotal</span>
              <span style={{ fontWeight: 800, fontSize: 16, color: "#1a2e35" }}>{fmt(confirmedTotal)}</span>
            </div>
          </div>

          <div style={{ ...S.label, marginTop: 8 }}>🟡 ESTIMATED SPENDING</div>
          <button style={{ ...S.btn("#f4a261"), marginBottom: 10 }} onClick={() => { setForm({ category: ESTIMATE_CATEGORIES[0], days: 1, daily_amount: 0 }); setShowModal("estimate"); }}>
            + Add Estimate
          </button>

          {estimates.map((est) => {
            const lineTotal = (parseFloat(est.daily_amount) || 0) * (parseInt(est.days) || 1);
            return (
              <div key={est.id} style={S.budgetCard("#f4a261")}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#1a2e35" }}>{est.label}</div>
                    <div style={{ fontSize: 11, color: "#78909c", marginTop: 2 }}>
                      {fmt(est.daily_amount)}/day × {est.days} day{est.days !== 1 ? "s" : ""} = {fmt(lineTotal)}
                    </div>
                    <span style={S.chip("#f4a261")}>{est.category}</span>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button style={S.btnSm("#94a3b8")} onClick={() => openEdit("estimate", est)}>✏️</button>
                    <button style={S.del} onClick={() => deleteRecord("budget_estimates", est.id)}>×</button>
                  </div>
                </div>
              </div>
            );
          })}

          {estimates.length === 0 && (
            <div style={{ ...S.card, textAlign: "center", color: "#90a4ae", fontSize: 13, fontStyle: "italic" }}>
              Add daily estimates for things like food, gas, activities you haven't booked yet
            </div>
          )}

          <div style={{ ...S.card, background: "#fff8e1", border: "2px dashed #ffb300", marginTop: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 800, color: "#1a2e35" }}>Estimates Subtotal</span>
              <span style={{ fontWeight: 800, fontSize: 16, color: "#e65100" }}>{fmt(estimatesTotal)}</span>
            </div>
          </div>

          <div style={{ ...S.card, background: "linear-gradient(135deg,#005f73,#0a9396)", marginTop: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 800, color: "#fff", fontSize: 16 }}>💰 Grand Total</span>
              <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 28, color: "#fff" }}>{fmt(grandTotal)}</span>
            </div>
            {tripBudget > 0 && (
              <div style={{ marginTop: 8, padding: "8px 10px", background: "rgba(255,255,255,0.15)", borderRadius: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", color: remaining >= 0 ? "#a7f3d0" : "#fca5a5" }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{remaining >= 0 ? "Still have" : "Over budget by"}</span>
                  <span style={{ fontSize: 16, fontWeight: 800 }}>{fmt(Math.abs(remaining))}</span>
                </div>
              </div>
            )}
          </div>
          <div style={{ height: 16 }} />
        </div>
      )}

      {showModal === "day" && (
        <Modal onClose={closeModal}>
          <div style={{ ...S.label, marginBottom: 16 }}>{editItem ? "EDIT DAY" : "ADD DAY"}</div>
          <input style={S.input} type="date" value={form.date || ""} onChange={f("date")} />
          <input style={S.input} placeholder="Location (e.g. Nadi, Fiji)" value={form.location || ""} onChange={f("location")} />
          <input style={S.input} placeholder="Notes (optional)" value={form.notes || ""} onChange={f("notes")} />
          <button style={S.btn()} onClick={saveDay}>{editItem ? "Save Changes" : "Add Day"}</button>
          <button style={{ ...S.btn("#94a3b8"), marginTop: 8 }} onClick={closeModal}>Cancel</button>
        </Modal>
      )}

      {showModal === "item" && (
        <Modal onClose={closeModal}>
          <div style={{ ...S.label, marginBottom: 16 }}>{editItem ? "EDIT ACTIVITY" : "ADD ACTIVITY"}</div>
          <select style={S.select} value={form.category || ACTIVITY_CATEGORIES[0]} onChange={f("category")}>
            {ACTIVITY_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <input style={S.input} placeholder="Title *" value={form.title || ""} onChange={f("title")} />
          <input style={S.input} placeholder="Details / notes" value={form.details || ""} onChange={f("details")} />
          <input style={S.input} type="time" value={form.time || ""} onChange={f("time")} />
          <div style={S.label}>PRICE</div>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 12, top: 11, color: "#2e7d32", fontWeight: 800, fontSize: 15 }}>$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0"
              value={form.price || ""}
              onChange={f("price")}
              style={{ ...S.priceInput, paddingLeft: 24 }}
            />
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
            <input
              type="checkbox"
              id="is_booked"
              checked={form.is_booked === true || form.is_booked === "true"}
              onChange={(e) => setForm((p) => ({ ...p, is_booked: e.target.checked }))}
              style={{ accentColor: "#0a9396" }}
            />
            <label htmlFor="is_booked" style={{ fontSize: 13, color: "#1a2e35", fontWeight: 700 }}>Booked / confirmed price (not an estimate)</label>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14 }}>
            <input
              type="checkbox"
              id="confirmed"
              checked={form.confirmed === true || form.confirmed === "true"}
              onChange={(e) => setForm((p) => ({ ...p, confirmed: e.target.checked }))}
              style={{ accentColor: "#0a9396" }}
            />
            <label htmlFor="confirmed" style={{ fontSize: 13, color: "#1a2e35", fontWeight: 700 }}>Mark as done / completed</label>
          </div>
          <button style={S.btn()} onClick={saveItem}>{editItem ? "Save Changes" : "Add Activity"}</button>
          <button style={{ ...S.btn("#94a3b8"), marginTop: 8 }} onClick={closeModal}>Cancel</button>
        </Modal>
      )}

      {showModal === "flight" && (
        <Modal onClose={closeModal}>
          <div style={{ ...S.label, marginBottom: 16 }}>{editItem ? "EDIT FLIGHT" : "ADD FLIGHT"}</div>
          <input style={S.input} placeholder="Flight number * (e.g. AA1234)" value={form.flight_number || ""} onChange={f("flight_number")} />
          <input style={S.input} placeholder="Airline" value={form.airline || ""} onChange={f("airline")} />
          <input style={S.input} placeholder="From (e.g. LAX)" value={form.from_location || ""} onChange={f("from_location")} />
          <input style={S.input} placeholder="To (e.g. NAN - Nadi)" value={form.to_location || ""} onChange={f("to_location")} />
          <input style={S.input} placeholder="Departure (date & time)" value={form.departure || ""} onChange={f("departure")} />
          <input style={S.input} placeholder="Arrival (date & time)" value={form.arrival || ""} onChange={f("arrival")} />
          <input style={S.input} placeholder="Confirmation number" value={form.confirmation || ""} onChange={f("confirmation")} />
          <div style={S.label}>TICKET PRICE (total for all travelers)</div>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 12, top: 11, color: "#2e7d32", fontWeight: 800, fontSize: 15 }}>$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0"
              value={form.price || ""}
              onChange={f("price")}
              style={{ ...S.priceInput, paddingLeft: 24 }}
            />
          </div>
          <button style={S.btn()} onClick={saveFlight}>{editItem ? "Save Changes" : "Add Flight"}</button>
          <button style={{ ...S.btn("#94a3b8"), marginTop: 8 }} onClick={closeModal}>Cancel</button>
        </Modal>
      )}

      {showModal === "hotel" && (
        <Modal onClose={closeModal}>
          <div style={{ ...S.label, marginBottom: 16 }}>{editItem ? "EDIT HOTEL" : "ADD HOTEL / AIRBNB"}</div>
          <input style={S.input} placeholder="Name * (e.g. Airbnb Queenstown)" value={form.name || ""} onChange={f("name")} />
          <input style={S.input} placeholder="Location" value={form.location || ""} onChange={f("location")} />
          <div style={S.label}>CHECK-IN</div>
          <input style={S.input} type="date" value={form.check_in || ""} onChange={f("check_in")} />
          <div style={S.label}>CHECK-OUT</div>
          <input style={S.input} type="date" value={form.check_out || ""} onChange={f("check_out")} />
          {form.check_in && form.check_out && (
            <div style={{ fontSize: 12, color: "#0a9396", fontWeight: 700, marginBottom: 8 }}>
              {nightsBetween(form.check_in, form.check_out)} nights
            </div>
          )}
          <input style={S.input} placeholder="Confirmation number" value={form.confirmation || ""} onChange={f("confirmation")} />
          <input style={S.input} placeholder="Notes" value={form.notes || ""} onChange={f("notes")} />
          <div style={S.label}>PRICE PER NIGHT</div>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 12, top: 11, color: "#2e7d32", fontWeight: 800, fontSize: 15 }}>$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0"
              value={form.price_per_night || ""}
              onChange={f("price_per_night")}
              style={{ ...S.priceInput, paddingLeft: 24 }}
            />
          </div>
          {form.price_per_night && form.check_in && form.check_out && (
            <div style={{ fontSize: 13, color: "#2e7d32", fontWeight: 800, marginBottom: 8 }}>
              Total: {fmt(nightsBetween(form.check_in, form.check_out) * parseFloat(form.price_per_night))}
            </div>
          )}
          <button style={S.btn()} onClick={saveHotel}>{editItem ? "Save Changes" : "Add Hotel"}</button>
          <button style={{ ...S.btn("#94a3b8"), marginTop: 8 }} onClick={closeModal}>Cancel</button>
        </Modal>
      )}

      {showModal === "packing" && (
        <Modal onClose={closeModal}>
          <div style={{ ...S.label, marginBottom: 16 }}>{editItem ? "EDIT ITEM" : "ADD PACKING ITEM"}</div>
          <input style={S.input} placeholder="Item name *" value={form.item || ""} onChange={f("item")} />
          <select style={S.select} value={form.category || "Misc"} onChange={f("category")}>
            {PACKING_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <button style={S.btn()} onClick={savePacking}>{editItem ? "Save Changes" : "Add Item"}</button>
          <button style={{ ...S.btn("#94a3b8"), marginTop: 8 }} onClick={closeModal}>Cancel</button>
        </Modal>
      )}

      {showModal === "estimate" && (
        <Modal onClose={closeModal}>
          <div style={{ ...S.label, marginBottom: 16 }}>{editItem ? "EDIT ESTIMATE" : "ADD SPENDING ESTIMATE"}</div>
          <input style={S.input} placeholder="Label * (e.g. Eating out in Fiji)" value={form.label || ""} onChange={f("label")} />
          <select style={S.select} value={form.category || ESTIMATE_CATEGORIES[0]} onChange={f("category")}>
            {ESTIMATE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <div style={S.label}>ESTIMATED AMOUNT PER DAY</div>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 12, top: 11, color: "#2e7d32", fontWeight: 800, fontSize: 15 }}>$</span>
            <input
              type="number"
              min="0"
              step="1"
              placeholder="0"
              value={form.daily_amount || ""}
              onChange={f("daily_amount")}
              style={{ ...S.priceInput, paddingLeft: 24 }}
            />
          </div>
          <div style={S.label}>NUMBER OF DAYS</div>
          <input
            type="number"
            min="1"
            placeholder="1"
            value={form.days || ""}
            onChange={f("days")}
            style={S.input}
          />
          {form.daily_amount && form.days && (
            <div style={{ fontSize: 13, color: "#2e7d32", fontWeight: 800, marginBottom: 8 }}>
              Total for this line: {fmt(parseFloat(form.daily_amount) * parseInt(form.days))}
            </div>
          )}
          <button style={S.btn("#f4a261")} onClick={saveEstimate}>{editItem ? "Save Changes" : "Add Estimate"}</button>
          <button style={{ ...S.btn("#94a3b8"), marginTop: 8 }} onClick={closeModal}>Cancel</button>
        </Modal>
      )}
    </div>
  );
}

// ─── ROOT COMPONENT ──────────────────────────────────────────────────────────
export default function TripPlanner() {
  const [session, setSession] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [currentTripId, setCurrentTripId] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthChecked(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) setCurrentTripId(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (!authChecked) {
    return (
      <div style={{ ...S.wrap, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48 }}>🌴</div>
          <div style={{ color: "#0a9396", fontWeight: 700, marginTop: 12 }}>Loading…</div>
        </div>
      </div>
    );
  }

  if (!session) return <Login />;

  if (!currentTripId) {
    return <TripsList session={session} onSelectTrip={setCurrentTripId} />;
  }

  return <TripDetail tripId={currentTripId} onBack={() => setCurrentTripId(null)} />;
}
