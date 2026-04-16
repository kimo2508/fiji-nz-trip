import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import NewTripModal from "./NewTripModal";
import ShareModal from "./ShareModal";

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
    position: "relative",
  },
  tripName: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 18,
    color: "#005f73",
    marginBottom: 4,
    paddingRight: 80,
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
    marginRight: 6,
  }),
  sharedBadge: {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 700,
    background: "#e3f2fd",
    color: "#1565c0",
    marginRight: 6,
  },
  countdown: {
    position: "absolute",
    top: 16,
    right: 54,
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
  shareBtn: {
    position: "absolute",
    top: 14,
    right: 14,
    background: "#e0f7fa",
    border: "none",
    borderRadius: 8,
    padding: "6px 10px",
    fontSize: 14,
    cursor: "pointer",
    color: "#0a9396",
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
  const [shareTrip, setShareTrip] = useState(null);
  const [collabTripIds, setCollabTripIds] = useState(new Set());

  const loadTrips = async () => {
    setLoading(true);

    // Load trips user owns
    const { data: ownedTrips, error: ownedError } = await supabase
      .from("trips")
      .select("*, destination:destinations(name, country, timezone, currency_code)")
      .order("start_date", { ascending: true });
    if (ownedError) console.error("Load owned trips error:", ownedError);

    // Load trips user is collaborator on
    const { data: collabRows, error: collabError } = await supabase
      .from("trip_collaborators")
      .select("trip_id")
      .or(`user_id.eq.${session.user.id},user_email.eq.${session.user.email}`);
    if (collabError) console.error("Load collab error:", collabError);

    const collabIds = (collabRows || []).map((r) => r.trip_id);
    const ownedIds = new Set((ownedTrips || []).map((t) => t.id));
    const sharedOnlyIds = collabIds.filter((id) => !ownedIds.has(id));

    let sharedTrips = [];
    if (sharedOnlyIds.length > 0) {
      const { data, error } = await supabase
        .from("trips")
        .select("*, destination:destinations(name, country, timezone, currency_code)")
        .in("id", sharedOnlyIds)
        .order("start_date", { ascending: true });
      if (error) console.error("Load shared trips error:", error);
      sharedTrips = data || [];
    }

    // Mark collab-only trips so we can show "SHARED WITH YOU" badge
    const collabSet = new Set(sharedTrips.map((t) => t.id));
    setCollabTripIds(collabSet);

    // Mark collab status on accepted_at in trip_collaborators for the current user
    // (fire and forget - update accepted_at for any row matching this user that isn't yet accepted)
    if (collabRows && collabRows.length > 0) {
      await supabase
        .from("trip_collaborators")
        .update({ user_id: session.user.id, accepted_at: new Date().toISOString() })
        .or(`user_id.eq.${session.user.id},user_email.eq.${session.user.email}`)
        .is("accepted_at", null);
    }

    setTrips([...(ownedTrips || []), ...sharedTrips]);
    setLoading(false);
  };

  useEffect(() => { loadTrips(); }, [session]);

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
            const isShared = collabTripIds.has(trip.id);
            const isOwner = !isShared;

            return (
              <div
                key={trip.id}
                style={S.tripCard}
                onClick={() => onSelectTrip(trip.id)}
              >
                {isOwner && (
                  <button
                    style={S.shareBtn}
                    onClick={(e) => { e.stopPropagation(); setShareTrip(trip); }}
                    title="Share trip"
                  >
                    👥
                  </button>
                )}
                <div style={S.tripName}>{trip.name}</div>
                <div style={S.tripDates}>
                  {trip.destination?.name && `📍 ${trip.destination.name} • `}
                  {formatDates(trip.start_date, trip.end_date)}
                </div>
                <div>
                  {isShared && <span style={S.sharedBadge}>👥 SHARED WITH YOU</span>}
                  {isActive && <span style={S.badge("#2e7d32", "#e8f5e9")}>🟢 Traveling now</span>}
                  {isPast && <span style={S.badge("#78909c", "#eceff1")}>✓ Past trip</span>}
                </div>
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

      {shareTrip && (
        <ShareModal
          trip={shareTrip}
          onClose={() => setShareTrip(null)}
        />
      )}
    </div>
  );
}
