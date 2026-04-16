import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import NewTripModal from "./NewTripModal";

const daysUntil = (startDate) => {
  if (!startDate) return 0;
  const diff = new Date(startDate + "T12:00:00") - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const formatDates = (start, end) => {
  if (!start || !end) return "";
  const s = new Date(start + "T12:00:00");
  const e = new Date(end + "T12:00:00");
  const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
  const sameYear = s.getFullYear() === e.getFullYear();
  if (sameMonth) return `${s.toLocaleDateString("en-US", { month: "long" })} ${s.getDate()}–${e.getDate()}, ${s.getFullYear()}`;
  if (sameYear) return `${s.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${e.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${s.getFullYear()}`;
  return `${s.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} – ${e.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
};

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
    padding: "32px 20px 40px",
    position: "relative",
    overflow: "hidden",
  },
  heroTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 28,
    color: "#fff",
    margin: 0,
  },
  heroSub: { fontSize: 13, color: "rgba(255,255,255,0.8)", fontWeight: 600, marginTop: 4 },
  signOut: {
    position: "absolute",
    top: 16,
    right: 16,
    background: "rgba(255,255,255,0.2)",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "6px 12px",
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "'Nunito', sans-serif",
  },
  sec: { padding: "16px" },
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
    marginBottom: 16,
  }),
  tripCard: {
    background: "#fff",
    borderRadius: 14,
    padding: "16px 18px",
    marginBottom: 12,
    boxShadow: "0 1px 6px rgba(0,0,0,0.07)",
    cursor: "pointer",
    transition: "transform 0.1s",
    position: "relative",
  },
  tripName: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 18,
    color: "#005f73",
    marginBottom: 4,
  },
  tripDates: { fontSize: 12, color: "#78909c", fontWeight: 600, marginBottom: 10 },
  badge: (color, bg) => ({
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 700,
    background: bg,
    color: color,
  }),
  countdown: {
    position: "absolute",
    top: 16,
    right: 18,
    textAlign: "right",
  },
  countdownNum: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 24,
    color: "#0a9396",
    lineHeight: 1,
  },
  countdownLabel: {
    fontSize: 9,
    fontWeight: 700,
    color: "#90a4ae",
    letterSpacing: 1,
    marginTop: 2,
  },
  empty: {
    textAlign: "center",
    padding: "40px 20px",
    color: "#78909c",
  },
  emptyEmoji: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: 700, color: "#005f73", marginBottom: 6 },
  emptySub: { fontSize: 13, color: "#78909c" },
};

export default function TripsList({ session, onSelectTrip }) {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewTrip, setShowNewTrip] = useState(false);

  const loadTrips = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("trips")
      .select("*, destination:destinations(name, country, timezone, currency_code)")
      .order("start_date", { ascending: true });
    if (error) console.error("Load trips error:", error);
    setTrips(data || []);
    setLoading(false);
  };

  useEffect(() => { loadTrips(); }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleTripCreated = (tripId) => {
    setShowNewTrip(false);
    loadTrips();
    onSelectTrip(tripId);
  };

  const userEmail = session?.user?.email || "";

  return (
    <div style={S.wrap}>
      <div style={S.hero}>
        <button style={S.signOut} onClick={handleSignOut}>Sign out</button>
        <p style={S.heroTitle}>My Trips 🌴</p>
        <div style={S.heroSub}>{userEmail}</div>
      </div>

      <div style={S.sec}>
        <button style={S.btn()} onClick={() => setShowNewTrip(true)}>+ Plan a New Trip</button>

        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "#0a9396" }}>Loading trips…</div>
        ) : trips.length === 0 ? (
          <div style={S.empty}>
            <div style={S.emptyEmoji}>✈️</div>
            <div style={S.emptyTitle}>No trips yet</div>
            <div style={S.emptySub}>Tap "Plan a New Trip" to get started</div>
          </div>
        ) : (
          trips.map((trip) => {
            const days = daysUntil(trip.start_date);
            const isPast = days < 0;
            const isUpcoming = days > 0;
            const isActive = days <= 0 && daysUntil(trip.end_date) >= 0;

            return (
              <div
                key={trip.id}
                style={S.tripCard}
                onClick={() => onSelectTrip(trip.id)}
              >
                <div style={S.tripName}>{trip.name}</div>
                <div style={S.tripDates}>
                  {trip.destination?.name && `📍 ${trip.destination.name} • `}
                  {formatDates(trip.start_date, trip.end_date)}
                </div>
                {isActive && <span style={S.badge("#2e7d32", "#e8f5e9")}>🟢 Traveling now</span>}
                {isPast && <span style={S.badge("#78909c", "#eceff1")}>✓ Past trip</span>}
                {isUpcoming && (
                  <div style={S.countdown}>
                    <div style={S.countdownNum}>{days}</div>
                    <div style={S.countdownLabel}>DAYS TO GO</div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {showNewTrip && (
        <NewTripModal
          session={session}
          onClose={() => setShowNewTrip(false)}
          onCreated={handleTripCreated}
        />
      )}
    </div>
  );
}
