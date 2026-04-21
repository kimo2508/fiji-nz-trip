import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "./supabase";
import Login from "./Login";
import TripsList from "./TripsList";
import { TimezoneClocks, CurrencyConverter, DestinationSwitcher } from "./TripWidgets";
import { S, C, CAT_COLORS, BADGE_COLORS, GLOBAL_CSS } from "./styles";

const PACKING_CATEGORIES = ["Clothing", "Toiletries", "Documents", "Electronics", "Health", "Beach & Water", "Misc"];
const ACTIVITY_CATEGORIES = ["🍽️ Restaurant", "🏄 Activity", "🗺️ Sightseeing", "🚗 Transport", "📝 Note"];
const ESTIMATE_CATEGORIES = ["Food & Dining", "Transportation", "Activities", "Shopping", "Groceries", "Misc"];

const colorForUser = (key) => {
  if (!key) return BADGE_COLORS[0];
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) & 0xffffffff;
  return BADGE_COLORS[Math.abs(hash) % BADGE_COLORS.length];
};

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

function Modal({ onClose, children }) {
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.sheet} onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}

function AddedBy({ userId, userMap }) {
  if (!userId || !userMap) return null;
  const name = userMap[userId] || "Someone";
  const color = colorForUser(userId);
  return <span style={S.addedBy(color.bg, color.fg)}>👤 {name}</span>;
}

// ── TRIP DETAIL ──────────────────────────────────────────────────────────────
function TripDetail({ tripId, session, onBack }) {
  const [tab, setTab] = useState("home");
  const [trip, setTrip] = useState(null);
  const [destination, setDestination] = useState(null);
  const [activeDest, setActiveDest] = useState(null);
  const [accessLevel, setAccessLevel] = useState("editor");
  const [userMap, setUserMap] = useState({});
  const [days, setDays] = useState([]);
  const [items, setItems] = useState([]);
  const [flights, setFlights] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [packing, setPacking] = useState([]);
  const [estimates, setEstimates] = useState([]);
  const [tripBudget, setTripBudget] = useState(0);
  const [loading, setLoading] = useState(true);
  const [liveConnected, setLiveConnected] = useState(false);
  const [activeDay, setActiveDay] = useState(null);
  const [showModal, setShowModal] = useState(null);
  const [form, setForm] = useState({});
  const [packFilter, setPackFilter] = useState("All");
  const [editItem, setEditItem] = useState(null);

  const isOwner = accessLevel === "owner";
  const hasFullAccess = accessLevel === "owner" || accessLevel === "co-owner";
  const currentUserId = session.user.id;

  const canModify = useCallback((row) => {
    if (!row) return false;
    if (hasFullAccess) return true;
    return row.created_by === currentUserId;
  }, [hasFullAccess, currentUserId]);

  const displayNameFor = (user) => {
    if (!user) return null;
    const meta = user.raw_user_meta_data || user.user_metadata || {};
    return meta.full_name || meta.name || (user.email ? user.email.split("@")[0] : "User");
  };

  const load = useCallback(async () => {
    const tripResp = await supabase
      .from("trips")
      .select("*, destination:destinations(name, country, timezone, currency_code)")
      .eq("id", tripId)
      .maybeSingle();
    if (tripResp.error) console.error("Trip load error:", tripResp.error);
    const loadedTrip = tripResp.data || null;
    setTrip(loadedTrip);
    const dest = loadedTrip?.destination || null;
    setDestination(dest);
    if (!activeDest && dest) setActiveDest(dest);

    let level = "editor";
    if (loadedTrip?.owner_id === currentUserId) {
      level = "owner";
    } else {
      const { data: myCollab } = await supabase
        .from("trip_collaborators")
        .select("role")
        .eq("trip_id", tripId)
        .or(`user_id.eq.${currentUserId},user_email.eq.${session.user.email}`)
        .maybeSingle();
      if (myCollab?.role === "co-owner") level = "co-owner";
    }
    setAccessLevel(level);
    const fullAccess = level === "owner" || level === "co-owner";

    const sharedQueries = [
      supabase.from("itinerary_days").select("*").eq("trip_id", tripId).order("date"),
      supabase.from("itinerary_items").select("*").eq("trip_id", tripId).order("time"),
      supabase.from("flights").select("*").eq("trip_id", tripId).order("departure"),
      supabase.from("hotels").select("*").eq("trip_id", tripId).order("check_in"),
    ];

    const fullAccessQueries = fullAccess ? [
      supabase.from("packing_items").select("*").eq("trip_id", tripId).order("category"),
      supabase.from("budget_estimates").select("*").eq("trip_id", tripId).order("sort_order"),
      supabase.from("trip_budget").select("*").eq("trip_id", tripId).limit(1),
    ] : [];

    const [d, it, fl, ho, ...rest] = await Promise.all([...sharedQueries, ...fullAccessQueries]);

    setDays(d.data || []);
    setItems(it.data || []);
    setHotels(ho.data || []);

    const flightData = fl.data || [];
    if (fullAccess) setFlights(flightData);
    else setFlights(flightData.map((f) => ({ ...f, price: 0, confirmation: "" })));

    if (fullAccess && rest.length === 3) {
      const [pk, est, tb] = rest;
      setPacking(pk.data || []);
      setEstimates(est.data || []);
      setTripBudget(tb.data && tb.data.length > 0 ? parseFloat(tb.data[0].total_budget) || 0 : 0);
    } else {
      setPacking([]); setEstimates([]); setTripBudget(0);
    }

    const ids = new Set();
    if (loadedTrip?.owner_id) ids.add(loadedTrip.owner_id);
    (d.data || []).forEach((r) => r.created_by && ids.add(r.created_by));
    (it.data || []).forEach((r) => r.created_by && ids.add(r.created_by));
    (fl.data || []).forEach((r) => r.created_by && ids.add(r.created_by));
    (ho.data || []).forEach((r) => r.created_by && ids.add(r.created_by));

    const { data: collabRows } = await supabase
      .from("trip_collaborators")
      .select("user_id, user_email")
      .eq("trip_id", tripId);
    const collabEmailById = {};
    (collabRows || []).forEach((c) => {
      if (c.user_id) { ids.add(c.user_id); collabEmailById[c.user_id] = c.user_email; }
    });

    const map = {};
    ids.forEach((id) => {
      if (id === currentUserId) map[id] = displayNameFor(session.user);
      else if (collabEmailById[id]) map[id] = collabEmailById[id].split("@")[0];
      else if (id === loadedTrip?.owner_id) map[id] = "Trip owner";
      else map[id] = "Someone";
    });
    setUserMap(map);
    setLoading(false);
  }, [tripId, currentUserId, session.user]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  const reloadTimer = useRef(null);
  const debouncedLoad = useCallback(() => {
    if (reloadTimer.current) clearTimeout(reloadTimer.current);
    reloadTimer.current = setTimeout(() => { load(); }, 300);
  }, [load]);

  useEffect(() => {
    const tables = ["itinerary_days", "itinerary_items", "flights", "hotels", "packing_items", "budget_estimates", "trip_budget", "trip_collaborators"];
    const channel = supabase.channel(`trip-${tripId}`);
    tables.forEach((table) => {
      channel.on("postgres_changes", { event: "*", schema: "public", table, filter: `trip_id=eq.${tripId}` }, () => debouncedLoad());
    });
    channel.subscribe((status) => { setLiveConnected(status === "SUBSCRIBED"); });
    return () => {
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
      supabase.removeChannel(channel);
    };
  }, [tripId, debouncedLoad]);

  useEffect(() => {
    if (!hasFullAccess && (tab === "packing" || tab === "budget")) setTab("home");
  }, [hasFullAccess, tab]);

  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const flightsTotal = flights.reduce((s, fl) => s + (parseFloat(fl.price) || 0), 0);
  const hotelsTotal = hotels.reduce((s, h) => s + nightsBetween(h.check_in, h.check_out) * (parseFloat(h.price_per_night) || 0), 0);
  const bookedActivities = items.filter((i) => i.is_booked).reduce((s, i) => s + (parseFloat(i.price) || 0), 0);
  const confirmedTotal = flightsTotal + hotelsTotal + bookedActivities;
  const estimatesTotal = estimates.reduce((s, e) => s + (parseFloat(e.daily_amount) || 0) * (parseInt(e.days) || 1), 0);
  const grandTotal = confirmedTotal + estimatesTotal;
  const remaining = tripBudget - grandTotal;

  const closeModal = () => { setShowModal(null); setForm({}); setEditItem(null); };

  const saveDay = async () => { if (!form.date) return; const p = { date: form.date, location: form.location || "", notes: form.notes || "", trip_id: tripId }; if (editItem) await supabase.from("itinerary_days").update(p).eq("id", editItem.id); else await supabase.from("itinerary_days").insert({ ...p, created_by: currentUserId }); closeModal(); load(); };
  const saveItem = async () => { if (!form.title || !activeDay) return; const p = { day_id: activeDay, trip_id: tripId, category: form.category || ACTIVITY_CATEGORIES[0], title: form.title, details: form.details || "", time: form.time || "", confirmed: form.confirmed === "true" || form.confirmed === true, price: parseFloat(form.price) || 0, is_booked: form.is_booked === "true" || form.is_booked === true }; if (editItem) await supabase.from("itinerary_items").update(p).eq("id", editItem.id); else await supabase.from("itinerary_items").insert({ ...p, created_by: currentUserId }); closeModal(); load(); };
  const saveFlight = async () => { if (!form.flight_number) return; const p = { trip_id: tripId, flight_number: form.flight_number, from_location: form.from_location || "", to_location: form.to_location || "", departure: form.departure || "", arrival: form.arrival || "", airline: form.airline || "" }; if (hasFullAccess) { p.confirmation = form.confirmation || ""; p.price = parseFloat(form.price) || 0; } if (editItem) await supabase.from("flights").update(p).eq("id", editItem.id); else await supabase.from("flights").insert({ ...p, created_by: currentUserId }); closeModal(); load(); };
  const saveHotel = async () => { if (!form.name) return; const p = { trip_id: tripId, name: form.name, location: form.location || "", check_in: form.check_in || "", check_out: form.check_out || "", notes: form.notes || "" }; if (hasFullAccess) { p.confirmation = form.confirmation || ""; p.price_per_night = parseFloat(form.price_per_night) || 0; } if (editItem) await supabase.from("hotels").update(p).eq("id", editItem.id); else await supabase.from("hotels").insert({ ...p, created_by: currentUserId }); closeModal(); load(); };
  const savePacking = async () => { if (!form.item) return; const p = { trip_id: tripId, item: form.item, category: form.category || "Misc" }; if (editItem) await supabase.from("packing_items").update(p).eq("id", editItem.id); else await supabase.from("packing_items").insert({ ...p, packed: false }); closeModal(); load(); };
  const saveEstimate = async () => { if (!form.label) return; const p = { trip_id: tripId, label: form.label, daily_amount: parseFloat(form.daily_amount) || 0, days: parseInt(form.days) || 1, category: form.category || ESTIMATE_CATEGORIES[0], sort_order: estimates.length }; if (editItem) await supabase.from("budget_estimates").update(p).eq("id", editItem.id); else await supabase.from("budget_estimates").insert(p); closeModal(); load(); };

  const saveTripBudget = async (val) => { const num = parseFloat(val) || 0; setTripBudget(num); const existing = await supabase.from("trip_budget").select("id").eq("trip_id", tripId).limit(1); if (existing.data && existing.data.length > 0) await supabase.from("trip_budget").update({ total_budget: num }).eq("id", existing.data[0].id); else await supabase.from("trip_budget").insert({ total_budget: num, trip_id: tripId }); };

  const deleteRecord = async (table, id) => { await supabase.from(table).delete().eq("id", id); load(); };
  const togglePacked = async (id, packed) => { setPacking((p) => p.map((x) => (x.id === id ? { ...x, packed: !packed } : x))); await supabase.from("packing_items").update({ packed: !packed }).eq("id", id); };
  const toggleConfirmed = async (id, confirmed) => { setItems((p) => p.map((x) => (x.id === id ? { ...x, confirmed: !confirmed } : x))); await supabase.from("itinerary_items").update({ confirmed: !confirmed }).eq("id", id); };
  const openEdit = (modal, record, extra = {}) => { setEditItem(record); setForm({ ...record, ...extra }); setShowModal(modal); };

  const packedCount = packing.filter((p) => p.packed).length;

  if (loading) return (<div style={{ ...S.wrap, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}><div style={{ textAlign: "center" }}><div style={{ fontSize: 48 }}>🌺</div><div style={{ color: C.primary, fontWeight: 700, marginTop: 12 }}>Loading trip…</div></div></div>);

  const tripName = trip?.name || "My Trip";
  const tripDates = trip ? formatTripDates(trip.start_date, trip.end_date) : "";
  const tripStart = trip?.start_date;
  const viewingDest = activeDest || destination;

  const tabs = [{ id: "home", l: "🏠 HOME" }, { id: "itinerary", l: "📅 ITINERARY" }, { id: "flights", l: "✈️ FLIGHTS" }, { id: "hotels", l: "🏨 HOTELS" }];
  if (hasFullAccess) { tabs.push({ id: "packing", l: "🎒 PACKING" }); tabs.push({ id: "budget", l: "💰 BUDGET" }); }

  const ownerStats = [{ v: daysUntil(tripStart), l: "DAYS TO GO" }, { v: days.length, l: "DAYS PLANNED" }, { v: `${packedCount}/${packing.length}`, l: "PACKED" }, { v: fmt(confirmedTotal), l: "CONFIRMED" }];
  const editorStats = [{ v: daysUntil(tripStart), l: "DAYS TO GO" }, { v: days.length, l: "DAYS PLANNED" }, { v: items.length, l: "ACTIVITIES" }, { v: hotels.length, l: "STAYS" }];
  const displayStats = hasFullAccess ? ownerStats : editorStats;

  return (
    <div style={S.wrap}>
      <style>{GLOBAL_CSS}</style>
      <div style={S.hero}>
        <div style={S.liveIndicator}><div style={S.liveDot(liveConnected)} />{liveConnected ? "LIVE" : "OFFLINE"}</div>
        <button style={{ ...S.backBtn, marginLeft: 70 }} onClick={onBack}>← My Trips</button>
        <p style={{ ...S.heroTitle, marginBottom: 4 }}>{tripName} 🌴</p>
        <div style={S.heroSub}>{tripDates} ✈️</div>
        {accessLevel === "co-owner" && <div style={S.accessBadge("rgba(255,255,255,0.25)", "#fff")}>⭐ CO-OWNER</div>}
        {accessLevel === "editor" && <div style={S.accessBadge("rgba(255,255,255,0.2)", "#fff")}>👥 SHARED WITH YOU</div>}

        <DestinationSwitcher tripId={tripId} currentDest={viewingDest} onSwitch={setActiveDest} />
        <TimezoneClocks destination={viewingDest} />

        <div style={S.statRow}>
          {displayStats.map((s, i) => (
            <div key={i} style={S.stat}>
              <div style={{ ...S.statNum, fontSize: (hasFullAccess && i === 3) ? 14 : 26 }}>{s.v}</div>
              <div style={S.statLabel}>{s.l}</div>
            </div>
          ))}
        </div>
        <svg style={{ position: "absolute", bottom: -2, left: 0, right: 0 }} viewBox="0 0 480 40" preserveAspectRatio="none" height="40"><path d="M0,20 C120,40 360,0 480,20 L480,40 L0,40 Z" fill={S.heroWave} /></svg>
      </div>

      <div style={S.nav}>{tabs.map((t) => (<button key={t.id} style={S.nb(tab === t.id)} onClick={() => setTab(t.id)}>{t.l}</button>))}</div>

      {tab === "home" && (
        <div style={S.sec}>
          {viewingDest?.currency_code && (
            <CurrencyConverter destCurrencyCode={viewingDest.currency_code} />
          )}

          {hasFullAccess && (
            <div style={{ ...S.card, background: `linear-gradient(135deg, ${C.ice}, ${C.iceBg})` }}>
              <div style={S.label}>TRIP BUDGET SNAPSHOT</div>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                {[{ l: "BUDGET", v: fmt(tripBudget), c: C.text }, { l: "PROJECTED", v: fmt(grandTotal), c: C.amber }, { l: "LEFT", v: fmt(remaining), c: remaining >= 0 ? C.green : C.red }].map((b) => (
                  <div key={b.l} style={{ flex: 1, textAlign: "center", background: b.l === "LEFT" ? (remaining >= 0 ? C.greenLight : C.redLight) : C.white, borderRadius: 10, padding: "10px 6px" }}>
                    <div style={{ fontSize: 11, color: C.textMid, fontWeight: 700 }}>{b.l}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: b.c }}>{b.v}</div>
                  </div>
                ))}
              </div>
              <button style={{ ...S.btnSm(), width: "100%", padding: "8px" }} onClick={() => setTab("budget")}>View Full Budget →</button>
            </div>
          )}

          <div style={S.card}>
            <div style={S.label}>QUICK STATS</div>
            {[{ l: "Flights", v: flights.length }, { l: "Hotels/stays", v: hotels.length }, { l: "Activities planned", v: items.length }, { l: "Days planned", v: days.length }].map((s) => (
              <div key={s.l} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${C.divider}` }}>
                <span style={{ fontSize: 13, color: C.textMid }}>{s.l}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{s.v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "itinerary" && (
        <div style={S.sec}>
          <button style={S.btn()} onClick={() => { setForm({}); setShowModal("day"); }}>+ Add Day</button>
          <div style={{ marginTop: 12 }}>
            {days.length === 0 && <div style={{ ...S.card, textAlign: "center", color: C.textFaint, fontSize: 13, fontStyle: "italic", padding: 30 }}>No days planned yet. Tap "+ Add Day" to start.</div>}
            {days.map((day) => {
              const dayItems = items.filter((i) => i.day_id === day.id);
              const daySpend = hasFullAccess ? dayItems.filter((i) => i.is_booked).reduce((s, i) => s + (parseFloat(i.price) || 0), 0) : 0;
              const canEditDay = canModify(day);
              return (
                <div key={day.id} style={{ ...S.card, marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, color: C.primaryDark, fontSize: 15 }}>{new Date(day.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</div>
                      <div style={{ fontSize: 12, color: C.textLight }}>{day.location}</div>
                      <AddedBy userId={day.created_by} userMap={userMap} />
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      {daySpend > 0 && <span style={S.priceTag}>{fmt(daySpend)}</span>}
                      {canEditDay && <button style={S.btnSm(C.editBtn)} onClick={() => openEdit("day", day)}>✏️</button>}
                      {canEditDay && <button style={S.del} onClick={() => deleteRecord("itinerary_days", day.id)}>×</button>}
                    </div>
                  </div>
                  {day.notes && <div style={{ fontSize: 12, color: C.textLight, marginBottom: 10, fontStyle: "italic" }}>{day.notes}</div>}
                  {dayItems.map((item) => { const canEditItem = canModify(item); return (
                    <div key={item.id} style={{ background: item.confirmed ? "#f0fdf4" : "#fafafa", border: `1px solid ${item.confirmed ? C.greenBorder : C.ice}`, borderRadius: 10, padding: "10px 12px", marginBottom: 8, display: "flex", alignItems: "flex-start", gap: 8 }}>
                      <input type="checkbox" checked={item.confirmed} disabled={!canEditItem} onChange={() => canEditItem && toggleConfirmed(item.id, item.confirmed)} style={{ marginTop: 3, accentColor: C.primary, cursor: canEditItem ? "pointer" : "not-allowed" }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <span style={S.chip(CAT_COLORS[item.category] || C.textFaint)}>{item.category}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{item.title}</span>
                          {hasFullAccess && (parseFloat(item.price) > 0) && <span style={{ ...S.priceTag, fontSize: 11 }}>{item.is_booked ? "✅" : "~"} {fmt(item.price)}</span>}
                        </div>
                        {item.time && <div style={{ fontSize: 11, color: C.textLight, marginTop: 2 }}>⏰ {item.time}</div>}
                        {item.details && <div style={{ fontSize: 12, color: C.textMid, marginTop: 3 }}>{item.details}</div>}
                        <AddedBy userId={item.created_by} userMap={userMap} />
                      </div>
                      <div style={{ display: "flex", gap: 4 }}>
                        {canEditItem && <button style={S.btnSm(C.editBtn)} onClick={() => { setActiveDay(day.id); openEdit("item", item); }}>✏️</button>}
                        {canEditItem && <button style={S.del} onClick={() => deleteRecord("itinerary_items", item.id)}>×</button>}
                      </div>
                    </div>
                  ); })}
                  <button style={{ ...S.btnSm(), marginTop: 4, width: "100%", padding: "8px" }} onClick={() => { setActiveDay(day.id); setForm({ category: ACTIVITY_CATEGORIES[0] }); setShowModal("item"); }}>+ Add Activity</button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "flights" && (
        <div style={S.sec}>
          {hasFullAccess && flightsTotal > 0 && (<div style={{ ...S.totalBanner(`linear-gradient(135deg,${C.ice},#B5D4F4)`, C.text), marginBottom: 12 }}><div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, color: C.primary, marginBottom: 4 }}>TOTAL FLIGHTS COST</div><div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 32, fontWeight: 700, color: C.primary, letterSpacing: 2 }}>{fmt(flightsTotal)}</div></div>)}
          <button style={S.btn()} onClick={() => { setForm({}); setShowModal("flight"); }}>+ Add Flight</button>
          <div style={{ marginTop: 12 }}>{flights.map((fl) => { const canEditFlight = canModify(fl); return (
            <div key={fl.id} style={S.card}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, color: C.primaryDark, fontSize: 15 }}>✈️ {fl.flight_number}</div>
                <div style={{ fontSize: 13, color: C.text, marginTop: 4 }}>{fl.from_location} → {fl.to_location}</div>
                {fl.airline && <div style={{ fontSize: 12, color: C.textLight }}>{fl.airline}</div>}
                {fl.departure && <div style={{ fontSize: 12, color: C.textLight }}>Dep: {fl.departure}</div>}
                {fl.arrival && <div style={{ fontSize: 12, color: C.textLight }}>Arr: {fl.arrival}</div>}
                {hasFullAccess && fl.confirmation && <div style={{ fontSize: 11, color: C.primary, fontWeight: 700, marginTop: 4 }}>Conf: {fl.confirmation}</div>}
                <AddedBy userId={fl.created_by} userMap={userMap} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                {hasFullAccess && parseFloat(fl.price) > 0 && <span style={S.priceTag}>{fmt(fl.price)}</span>}
                <div style={{ display: "flex", gap: 4 }}>
                  {canEditFlight && <button style={S.btnSm(C.editBtn)} onClick={() => openEdit("flight", fl)}>✏️</button>}
                  {canEditFlight && <button style={S.del} onClick={() => deleteRecord("flights", fl.id)}>×</button>}
                </div>
              </div>
            </div></div>
          ); })}</div>
        </div>
      )}

      {tab === "hotels" && (
        <div style={S.sec}>
          {hasFullAccess && hotelsTotal > 0 && (<div style={{ ...S.totalBanner(`linear-gradient(135deg,#EEEDFE,#CECBF6)`, C.text), marginBottom: 12 }}><div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, color: C.lodging, marginBottom: 4 }}>TOTAL LODGING COST</div><div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 32, fontWeight: 700, color: C.lodging, letterSpacing: 2 }}>{fmt(hotelsTotal)}</div></div>)}
          <button style={S.btn()} onClick={() => { setForm({}); setShowModal("hotel"); }}>+ Add Hotel / Airbnb</button>
          <div style={{ marginTop: 12 }}>{hotels.map((h) => { const nights = nightsBetween(h.check_in, h.check_out); const total = nights * (parseFloat(h.price_per_night) || 0); const canEditHotel = canModify(h); return (
            <div key={h.id} style={S.card}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, color: C.primaryDark, fontSize: 15 }}>🏨 {h.name}</div>
                {h.location && <div style={{ fontSize: 12, color: C.textLight }}>📍 {h.location}</div>}
                <div style={{ fontSize: 12, color: C.textMid, marginTop: 4 }}>{h.check_in} → {h.check_out}{nights > 0 && <span style={{ fontWeight: 700, color: C.primary }}> ({nights} nights)</span>}</div>
                {hasFullAccess && parseFloat(h.price_per_night) > 0 && <div style={{ fontSize: 12, color: C.textLight, marginTop: 2 }}>{fmt(h.price_per_night)}/night{total > 0 && <span style={{ fontWeight: 800, color: C.green }}> = {fmt(total)} total</span>}</div>}
                {hasFullAccess && h.confirmation && <div style={{ fontSize: 11, color: C.primary, fontWeight: 700, marginTop: 4 }}>Conf: {h.confirmation}</div>}
                {h.notes && <div style={{ fontSize: 12, color: C.textLight, marginTop: 4, fontStyle: "italic" }}>{h.notes}</div>}
                <AddedBy userId={h.created_by} userMap={userMap} />
              </div>
              <div style={{ display: "flex", gap: 4, marginLeft: 8 }}>
                {canEditHotel && <button style={S.btnSm(C.editBtn)} onClick={() => openEdit("hotel", h)}>✏️</button>}
                {canEditHotel && <button style={S.del} onClick={() => deleteRecord("hotels", h.id)}>×</button>}
              </div>
            </div></div>
          ); })}</div>
        </div>
      )}

      {hasFullAccess && tab === "packing" && (
        <div style={S.sec}>
          <div style={{ ...S.card, background: `linear-gradient(135deg,${C.ice},${C.iceBg})`, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><span style={{ fontWeight: 800, fontSize: 14, color: C.primaryDark }}>Packing Progress</span><span style={{ fontWeight: 700, color: C.primary }}>{packedCount}/{packing.length}</span></div>
            <div style={{ background: C.ice, borderRadius: 8, height: 8, overflow: "hidden" }}><div style={{ background: C.primary, height: "100%", width: `${packing.length ? (packedCount / packing.length) * 100 : 0}%`, borderRadius: 8, transition: "width 0.3s" }} /></div>
          </div>
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8, scrollbarWidth: "none", marginBottom: 8 }}>
            {["All", ...PACKING_CATEGORIES].map((cat) => (<button key={cat} style={{ ...S.btnSm(packFilter === cat ? C.primary : C.ice), color: packFilter === cat ? "#fff" : C.primaryDark, flex: "0 0 auto" }} onClick={() => setPackFilter(cat)}>{cat}</button>))}
          </div>
          <button style={S.btn()} onClick={() => { setForm({ category: "Misc" }); setShowModal("packing"); }}>+ Add Item</button>
          <div style={{ marginTop: 12 }}>
            {PACKING_CATEGORIES.filter((c) => packFilter === "All" || packFilter === c).map((cat) => { const catItems = packing.filter((p) => p.category === cat); if (!catItems.length) return null; return (
              <div key={cat} style={{ marginBottom: 16 }}><div style={S.label}>{cat.toUpperCase()}</div>
                {catItems.map((p) => (<div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: p.packed ? "#f0fdf4" : C.white, borderRadius: 10, marginBottom: 6, border: `1px solid ${p.packed ? C.greenBorder : C.cardBorder}` }}>
                  <input type="checkbox" checked={p.packed} onChange={() => togglePacked(p.id, p.packed)} style={{ accentColor: C.primary }} />
                  <span style={{ flex: 1, fontSize: 14, color: p.packed ? C.textLight : C.text, textDecoration: p.packed ? "line-through" : "none" }}>{p.item}</span>
                  <button style={S.btnSm(C.editBtn)} onClick={() => openEdit("packing", p)}>✏️</button>
                  <button style={S.del} onClick={() => deleteRecord("packing_items", p.id)}>×</button>
                </div>))}
              </div>
            ); })}
          </div>
        </div>
      )}

      {hasFullAccess && tab === "budget" && (
        <div style={S.sec}>
          <div style={S.card}><div style={S.label}>TOTAL TRIP BUDGET</div><div style={{ position: "relative" }}><span style={{ position: "absolute", left: 12, top: 11, color: C.green, fontWeight: 800, fontSize: 15 }}>$</span><input type="number" key={tripBudget} defaultValue={tripBudget || ""} placeholder="Enter your total budget" onBlur={(e) => saveTripBudget(e.target.value)} style={{ ...S.priceInput, paddingLeft: 24 }} /></div></div>

          <div style={S.totalBanner(remaining >= 0 ? `linear-gradient(135deg,${C.greenLight},#c8e6c9)` : `linear-gradient(135deg,${C.redLight},#ffcdd2)`, C.text)}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, color: remaining >= 0 ? C.green : C.red, marginBottom: 4 }}>{remaining >= 0 ? "✅ UNDER BUDGET" : "⚠️ OVER BUDGET"}</div>
            <div style={{ display: "flex", justifyContent: "space-around" }}>
              <div><div style={{ fontSize: 11, color: C.textMid, fontWeight: 700 }}>PROJECTED</div><div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, color: C.amber, letterSpacing: 2 }}>{fmt(grandTotal)}</div></div>
              <div style={{ width: 1, background: "rgba(0,0,0,0.1)" }} />
              <div><div style={{ fontSize: 11, color: C.textMid, fontWeight: 700 }}>{remaining >= 0 ? "REMAINING" : "OVER BY"}</div><div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, color: remaining >= 0 ? C.green : C.red, letterSpacing: 2 }}>{fmt(Math.abs(remaining))}</div></div>
            </div>
          </div>

          <div style={{ ...S.label, marginTop: 4 }}>✅ CONFIRMED COSTS</div>
          <div style={S.budgetCard(C.flights)}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}><span style={{ fontSize: 13, fontWeight: 800, color: C.text }}>✈️ Flights</span><span style={{ fontWeight: 800, color: C.flights, fontSize: 15 }}>{fmt(flightsTotal)}</span></div>{flights.filter((f) => parseFloat(f.price) > 0).map((f) => (<div key={f.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.textMid, padding: "3px 0" }}><span>{f.flight_number} {f.from_location} → {f.to_location}</span><span style={{ fontWeight: 700 }}>{fmt(f.price)}</span></div>))}{flights.filter((f) => parseFloat(f.price) > 0).length === 0 && <div style={{ fontSize: 12, color: C.textFaint, fontStyle: "italic" }}>No prices added yet</div>}</div>

          <div style={S.budgetCard(C.lodging)}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}><span style={{ fontSize: 13, fontWeight: 800, color: C.text }}>🏨 Lodging</span><span style={{ fontWeight: 800, color: C.lodging, fontSize: 15 }}>{fmt(hotelsTotal)}</span></div>{hotels.map((h) => { const nights = nightsBetween(h.check_in, h.check_out); const total = nights * (parseFloat(h.price_per_night) || 0); return (<div key={h.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.textMid, padding: "3px 0" }}><span>{h.name} {nights > 0 ? `(${nights}n)` : ""}</span><span style={{ fontWeight: 700 }}>{total > 0 ? fmt(total) : "—"}</span></div>); })}{hotels.length === 0 && <div style={{ fontSize: 12, color: C.textFaint, fontStyle: "italic" }}>No hotels added yet</div>}</div>

          <div style={S.budgetCard(C.booked)}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}><span style={{ fontSize: 13, fontWeight: 800, color: C.text }}>🎟️ Booked Activities</span><span style={{ fontWeight: 800, color: C.booked, fontSize: 15 }}>{fmt(bookedActivities)}</span></div>{items.filter((i) => i.is_booked && parseFloat(i.price) > 0).map((i) => (<div key={i.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.textMid, padding: "3px 0" }}><span>{i.title}</span><span style={{ fontWeight: 700 }}>{fmt(i.price)}</span></div>))}{items.filter((i) => i.is_booked && parseFloat(i.price) > 0).length === 0 && <div style={{ fontSize: 12, color: C.textFaint, fontStyle: "italic" }}>Mark itinerary items as "Booked"</div>}</div>

          <div style={{ ...S.card, background: "#f8f9fa", border: `2px dashed ${C.textMuted}` }}><div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontWeight: 800, color: C.text }}>Confirmed Subtotal</span><span style={{ fontWeight: 800, fontSize: 16, color: C.text }}>{fmt(confirmedTotal)}</span></div></div>

          <div style={{ ...S.label, marginTop: 8 }}>🟡 ESTIMATED SPENDING</div>
          <button style={{ ...S.btn(C.amber), marginBottom: 10 }} onClick={() => { setForm({ category: ESTIMATE_CATEGORIES[0], days: 1, daily_amount: 0 }); setShowModal("estimate"); }}>+ Add Estimate</button>
          {estimates.map((est) => { const lineTotal = (parseFloat(est.daily_amount) || 0) * (parseInt(est.days) || 1); return (<div key={est.id} style={S.budgetCard(C.estimates)}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}><div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>{est.label}</div><div style={{ fontSize: 11, color: C.textLight, marginTop: 2 }}>{fmt(est.daily_amount)}/day × {est.days} day{est.days !== 1 ? "s" : ""} = {fmt(lineTotal)}</div><span style={S.chip(C.amber)}>{est.category}</span></div><div style={{ display: "flex", gap: 4 }}><button style={S.btnSm(C.editBtn)} onClick={() => openEdit("estimate", est)}>✏️</button><button style={S.del} onClick={() => deleteRecord("budget_estimates", est.id)}>×</button></div></div></div>); })}
          {estimates.length === 0 && <div style={{ ...S.card, textAlign: "center", color: C.textFaint, fontSize: 13, fontStyle: "italic" }}>Add daily estimates for things like food, gas, activities you haven't booked</div>}

          <div style={{ ...S.card, background: C.amberLight, border: `2px dashed ${C.amber}`, marginTop: 4 }}><div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontWeight: 800, color: C.text }}>Estimates Subtotal</span><span style={{ fontWeight: 800, fontSize: 16, color: C.amberDark }}>{fmt(estimatesTotal)}</span></div></div>

          <div style={{ ...S.card, background: `linear-gradient(135deg,${C.primaryDark},${C.primary})`, marginTop: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontWeight: 800, color: "#fff", fontSize: 16 }}>💰 Grand Total</span><span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 30, color: "#fff", letterSpacing: 2 }}>{fmt(grandTotal)}</span></div>
            {tripBudget > 0 && <div style={{ marginTop: 8, padding: "8px 10px", background: "rgba(255,255,255,0.15)", borderRadius: 10 }}><div style={{ display: "flex", justifyContent: "space-between", color: remaining >= 0 ? "#a7f3d0" : "#fca5a5" }}><span style={{ fontSize: 13, fontWeight: 700 }}>{remaining >= 0 ? "Still have" : "Over budget by"}</span><span style={{ fontSize: 16, fontWeight: 800 }}>{fmt(Math.abs(remaining))}</span></div></div>}
          </div>
          <div style={{ height: 16 }} />
        </div>
      )}

      {/* MODALS */}
      {showModal === "day" && <Modal onClose={closeModal}><div style={{ ...S.label, marginBottom: 16 }}>{editItem ? "EDIT DAY" : "ADD DAY"}</div><input style={S.input} type="date" value={form.date || ""} onChange={f("date")} /><input style={S.input} placeholder="Location (e.g. Nadi, Fiji)" value={form.location || ""} onChange={f("location")} /><input style={S.input} placeholder="Notes (optional)" value={form.notes || ""} onChange={f("notes")} /><button style={S.btn()} onClick={saveDay}>{editItem ? "Save Changes" : "Add Day"}</button><button style={{ ...S.btn(C.cancelBtn), marginTop: 8 }} onClick={closeModal}>Cancel</button></Modal>}

      {showModal === "item" && <Modal onClose={closeModal}><div style={{ ...S.label, marginBottom: 16 }}>{editItem ? "EDIT ACTIVITY" : "ADD ACTIVITY"}</div><select style={S.select} value={form.category || ACTIVITY_CATEGORIES[0]} onChange={f("category")}>{ACTIVITY_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select><input style={S.input} placeholder="Title *" value={form.title || ""} onChange={f("title")} /><input style={S.input} placeholder="Details / notes" value={form.details || ""} onChange={f("details")} /><input style={S.input} type="time" value={form.time || ""} onChange={f("time")} />{hasFullAccess && (<><div style={S.label}>PRICE</div><div style={{ position: "relative" }}><span style={{ position: "absolute", left: 12, top: 11, color: C.green, fontWeight: 800, fontSize: 15 }}>$</span><input type="number" min="0" step="0.01" placeholder="0" value={form.price || ""} onChange={f("price")} style={{ ...S.priceInput, paddingLeft: 24 }} /></div><div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}><input type="checkbox" id="is_booked" checked={form.is_booked === true || form.is_booked === "true"} onChange={(e) => setForm((p) => ({ ...p, is_booked: e.target.checked }))} style={{ accentColor: C.primary }} /><label htmlFor="is_booked" style={{ fontSize: 13, color: C.text, fontWeight: 700 }}>Booked / confirmed price</label></div></>)}<div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14 }}><input type="checkbox" id="confirmed" checked={form.confirmed === true || form.confirmed === "true"} onChange={(e) => setForm((p) => ({ ...p, confirmed: e.target.checked }))} style={{ accentColor: C.primary }} /><label htmlFor="confirmed" style={{ fontSize: 13, color: C.text, fontWeight: 700 }}>Mark as done / completed</label></div><button style={S.btn()} onClick={saveItem}>{editItem ? "Save Changes" : "Add Activity"}</button><button style={{ ...S.btn(C.cancelBtn), marginTop: 8 }} onClick={closeModal}>Cancel</button></Modal>}

      {showModal === "flight" && <Modal onClose={closeModal}><div style={{ ...S.label, marginBottom: 16 }}>{editItem ? "EDIT FLIGHT" : "ADD FLIGHT"}</div><input style={S.input} placeholder="Flight number * (e.g. AA1234)" value={form.flight_number || ""} onChange={f("flight_number")} /><input style={S.input} placeholder="Airline" value={form.airline || ""} onChange={f("airline")} /><input style={S.input} placeholder="From (e.g. LAX)" value={form.from_location || ""} onChange={f("from_location")} /><input style={S.input} placeholder="To (e.g. NAN - Nadi)" value={form.to_location || ""} onChange={f("to_location")} /><input style={S.input} placeholder="Departure (date & time)" value={form.departure || ""} onChange={f("departure")} /><input style={S.input} placeholder="Arrival (date & time)" value={form.arrival || ""} onChange={f("arrival")} />{hasFullAccess && (<><input style={S.input} placeholder="Confirmation number" value={form.confirmation || ""} onChange={f("confirmation")} /><div style={S.label}>TICKET PRICE</div><div style={{ position: "relative" }}><span style={{ position: "absolute", left: 12, top: 11, color: C.green, fontWeight: 800, fontSize: 15 }}>$</span><input type="number" min="0" step="0.01" placeholder="0" value={form.price || ""} onChange={f("price")} style={{ ...S.priceInput, paddingLeft: 24 }} /></div></>)}<button style={S.btn()} onClick={saveFlight}>{editItem ? "Save Changes" : "Add Flight"}</button><button style={{ ...S.btn(C.cancelBtn), marginTop: 8 }} onClick={closeModal}>Cancel</button></Modal>}

      {showModal === "hotel" && <Modal onClose={closeModal}><div style={{ ...S.label, marginBottom: 16 }}>{editItem ? "EDIT HOTEL" : "ADD HOTEL / AIRBNB"}</div><input style={S.input} placeholder="Name * (e.g. Airbnb Queenstown)" value={form.name || ""} onChange={f("name")} /><input style={S.input} placeholder="Location" value={form.location || ""} onChange={f("location")} /><div style={S.label}>CHECK-IN</div><input style={S.input} type="date" value={form.check_in || ""} onChange={f("check_in")} /><div style={S.label}>CHECK-OUT</div><input style={S.input} type="date" value={form.check_out || ""} onChange={f("check_out")} />{form.check_in && form.check_out && <div style={{ fontSize: 12, color: C.primary, fontWeight: 700, marginBottom: 8 }}>{nightsBetween(form.check_in, form.check_out)} nights</div>}<input style={S.input} placeholder="Notes" value={form.notes || ""} onChange={f("notes")} />{hasFullAccess && (<><input style={S.input} placeholder="Confirmation number" value={form.confirmation || ""} onChange={f("confirmation")} /><div style={S.label}>PRICE PER NIGHT</div><div style={{ position: "relative" }}><span style={{ position: "absolute", left: 12, top: 11, color: C.green, fontWeight: 800, fontSize: 15 }}>$</span><input type="number" min="0" step="0.01" placeholder="0" value={form.price_per_night || ""} onChange={f("price_per_night")} style={{ ...S.priceInput, paddingLeft: 24 }} /></div>{form.price_per_night && form.check_in && form.check_out && <div style={{ fontSize: 13, color: C.green, fontWeight: 800, marginBottom: 8 }}>Total: {fmt(nightsBetween(form.check_in, form.check_out) * parseFloat(form.price_per_night))}</div>}</>)}<button style={S.btn()} onClick={saveHotel}>{editItem ? "Save Changes" : "Add Hotel"}</button><button style={{ ...S.btn(C.cancelBtn), marginTop: 8 }} onClick={closeModal}>Cancel</button></Modal>}

      {showModal === "packing" && <Modal onClose={closeModal}><div style={{ ...S.label, marginBottom: 16 }}>{editItem ? "EDIT ITEM" : "ADD PACKING ITEM"}</div><input style={S.input} placeholder="Item name *" value={form.item || ""} onChange={f("item")} /><select style={S.select} value={form.category || "Misc"} onChange={f("category")}>{PACKING_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select><button style={S.btn()} onClick={savePacking}>{editItem ? "Save Changes" : "Add Item"}</button><button style={{ ...S.btn(C.cancelBtn), marginTop: 8 }} onClick={closeModal}>Cancel</button></Modal>}

      {showModal === "estimate" && <Modal onClose={closeModal}><div style={{ ...S.label, marginBottom: 16 }}>{editItem ? "EDIT ESTIMATE" : "ADD SPENDING ESTIMATE"}</div><input style={S.input} placeholder="Label * (e.g. Eating out in Fiji)" value={form.label || ""} onChange={f("label")} /><select style={S.select} value={form.category || ESTIMATE_CATEGORIES[0]} onChange={f("category")}>{ESTIMATE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select><div style={S.label}>ESTIMATED AMOUNT PER DAY</div><div style={{ position: "relative" }}><span style={{ position: "absolute", left: 12, top: 11, color: C.green, fontWeight: 800, fontSize: 15 }}>$</span><input type="number" min="0" step="1" placeholder="0" value={form.daily_amount || ""} onChange={f("daily_amount")} style={{ ...S.priceInput, paddingLeft: 24 }} /></div><div style={S.label}>NUMBER OF DAYS</div><input type="number" min="1" placeholder="1" value={form.days || ""} onChange={f("days")} style={S.input} />{form.daily_amount && form.days && <div style={{ fontSize: 13, color: C.green, fontWeight: 800, marginBottom: 8 }}>Total for this line: {fmt(parseFloat(form.daily_amount) * parseInt(form.days))}</div>}<button style={S.btn(C.amber)} onClick={saveEstimate}>{editItem ? "Save Changes" : "Add Estimate"}</button><button style={{ ...S.btn(C.cancelBtn), marginTop: 8 }} onClick={closeModal}>Cancel</button></Modal>}

      {/* ── FOOTER ── */}
      <div style={{
        borderTop: `1px solid ${C.cardBorder}`, padding: "10px 16px",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        background: C.iceBg,
      }}>
        <div style={{
          width: 15, height: 15, background: C.iceBg, border: `1px solid ${C.textMuted}`,
          borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
            <line x1="1.5" y1="4.5" x2="6.5" y2="4.5" stroke={C.textLight} strokeWidth="1.3" strokeLinecap="round" />
            <circle cx="6.5" cy="4.5" r="1.8" stroke={C.textLight} strokeWidth="0.9" />
          </svg>
        </div>
        <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 10, color: C.textLight, letterSpacing: "0.08em" }}>Fuse Apps</span>
        <span style={{ fontSize: 10, color: C.textMuted }}>·</span>
        <span style={{ fontSize: 10, color: C.textLight }}>by TNT Labs</span>
      </div>
    </div>
  );
}

// ── ROOT ─────────────────────────────────────────────────────────────────────
export default function TripPlanner() {
  const [session, setSession] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [currentTripId, setCurrentTripId] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); setAuthChecked(true); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { setSession(session); if (!session) setCurrentTripId(null); });
    return () => subscription.unsubscribe();
  }, []);

  if (!authChecked) return (<div style={{ ...S.wrap, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}><div style={{ textAlign: "center" }}><div style={{ fontSize: 48 }}>🌴</div><div style={{ color: C.primary, fontWeight: 700, marginTop: 12 }}>Loading…</div></div></div>);
  if (!session) return <Login />;
  if (!currentTripId) return <TripsList session={session} onSelectTrip={setCurrentTripId} />;
  return <TripDetail tripId={currentTripId} session={session} onBack={() => setCurrentTripId(null)} />;
}
