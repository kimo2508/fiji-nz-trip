import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import NewTripModal from "./NewTripModal";
import ShareModal from "./ShareModal";
import { C } from "./styles";

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
  wrap: { maxWidth: 480, margin: "0 auto", minHeight: "100vh", background: C.iceBg, fontFamily: "'DM Sans', sans-serif", paddingBottom: 80 },
  hero: { background: `linear-gradient(135deg, ${C.primary} 0%, ${C.primaryDark} 100%)`, padding: "32px 20px 40px", position: "relative", overflow: "hidden" },
  heroTitle: { fontFamily: "'Bebas Neue', sans-serif", fontSize: 30, color: "#fff", margin: 0, letterSpacing: 3 },
  heroSub: { fontSize: 13, color: "rgba(255,255,255,0.8)", fontWeight: 600, marginTop: 4 },
  nameRow: { display: "inline-flex", alignItems: "center", gap: 8, marginTop: 8, background: "rgba(255,255,255,0.15)", borderRadius: 20, padding: "5px 12px 5px 14px", cursor: "pointer", border: "none", fontFamily: "'DM Sans', sans-serif" },
  nameText: { fontSize: 13, color: "#fff", fontWeight: 700 },
  pencil: { fontSize: 12, opacity: 0.85 },
  signOut: { position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.2)", color: "#fff", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  sec: { padding: "16px" },
  btn: (color = C.primary) => ({ background: color, color: "#fff", border: "none", borderRadius: 10, padding: "13px 20px", fontSize: 14, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", cursor: "pointer", width: "100%", marginBottom: 16 }),
  tripCard: { background: "#fff", borderRadius: 14, padding: "16px 18px", marginBottom: 12, boxShadow: "0 1px 6px rgba(0,0,0,0.07)", cursor: "pointer", position: "relative" },
  tripName: { fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: C.primaryDark, marginBottom: 4, paddingRight: 80, letterSpacing: 1 },
  tripDates: { fontSize: 12, color: C.textLight, fontWeight: 600, marginBottom: 10 },
  badge: (color, bg) => ({ display: "inline-block", padding: "4px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700, background: bg, color: color, marginRight: 6 }),
  sharedBadge: { display: "inline-block", padding: "4px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700, background: C.ice, color: C.primary, marginRight: 6 },
  countdown: { position: "absolute", top: 16, right: 54, textAlign: "right" },
  countdownNum: { fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, color: C.primary, lineHeight: 1, letterSpacing: 1 },
  countdownLabel: { fontSize: 9, fontWeight: 700, color: C.textFaint, letterSpacing: 1, marginTop: 2 },
  shareBtn: { position: "absolute", top: 14, right: 14, background: C.ice, border: "none", borderRadius: 8, padding: "6px 10px", fontSize: 14, cursor: "pointer", color: C.primary },
  deleteBtn: { background: "none", border: `1px solid ${C.cardBorder}`, borderRadius: 6, padding: "3px 8px", fontSize: 10, fontWeight: 700, color: C.textMuted, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", letterSpacing: 0.5, transition: "all 0.15s", marginTop: 8 },
  empty: { textAlign: "center", padding: "40px 20px", color: C.textLight },
  emptyEmoji: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: 700, color: C.primaryDark, marginBottom: 6 },
  emptySub: { fontSize: 13, color: C.textLight },
  // Modal styles
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 1000 },
  sheet: { background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 360, boxShadow: "0 20px 50px rgba(0,0,0,0.3)" },
  modalTitle: { fontSize: 18, fontWeight: 800, color: C.primaryDark, marginBottom: 6 },
  modalSub: { fontSize: 13, color: C.textLight, marginBottom: 16 },
  input: { width: "100%", padding: "12px 14px", border: `1px solid ${C.cardBorder}`, borderRadius: 10, fontSize: 15, marginBottom: 12, boxSizing: "border-box", fontFamily: "inherit" },
  modalBtn: { width: "100%", padding: "13px", border: "none", borderRadius: 10, background: C.primary, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", marginBottom: 8 },
  modalBtnSecondary: { width: "100%", padding: "13px", border: `1px solid ${C.cardBorder}`, borderRadius: 10, background: "#fff", color: C.textMid, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
};

function ProfileModal({ currentName, userId, onClose, onSaved }) {
  const [name, setName] = useState(currentName || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name can't be empty.");
      return;
    }
    if (trimmed.length > 40) {
      setError("Keep it under 40 characters.");
      return;
    }

    setSaving(true);
    setError(null);

    const { error: upsertError } = await supabase
      .from("profiles")
      .update({ display_name: trimmed })
      .eq("id", userId);

    setSaving(false);

    if (upsertError) {
      setError("Couldn't save. Try again.");
      return;
    }

    onSaved(trimmed);
  };

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.sheet} onClick={(e) => e.stopPropagation()}>
        <div style={S.modalTitle}>Your display name</div>
        <div style={S.modalSub}>This is what shows on your badges when you add stuff to a trip.</div>
        <input
          style={S.input}
          type="text"
          placeholder="e.g. Grace, Tim T, Mom"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          autoFocus
        />
        {error && <div style={{ color: C.red, fontSize: 12, marginBottom: 10 }}>{error}</div>}
        <button style={S.modalBtn} onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </button>
        <button style={S.modalBtnSecondary} onClick={onClose} disabled={saving}>Cancel</button>
      </div>
    </div>
  );
}

export default function TripsList({ session, onSelectTrip }) {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewTrip, setShowNewTrip] = useState(false);
  const [shareTrip, setShareTrip] = useState(null);
  const [collabTripIds, setCollabTripIds] = useState(new Set());
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [showProfileModal, setShowProfileModal] = useState(false);

  const loadProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", session.user.id)
      .maybeSingle();
    if (data?.display_name) setDisplayName(data.display_name);
    else setDisplayName(session.user.email?.split("@")[0] || "");
  };

  const loadTrips = async () => {
    setLoading(true);
    const { data: ownedTrips, error: ownedError } = await supabase.from("trips").select("*, destination:destinations(name, country, timezone, currency_code)").order("start_date", { ascending: true });
    if (ownedError) console.error("Load owned trips error:", ownedError);
    const { data: collabRows, error: collabError } = await supabase.from("trip_collaborators").select("trip_id").or(`user_id.eq.${session.user.id},user_email.eq.${session.user.email}`);
    if (collabError) console.error("Load collab error:", collabError);
    const collabIds = (collabRows || []).map((r) => r.trip_id);
    const ownedIds = new Set((ownedTrips || []).map((t) => t.id));
    const sharedOnlyIds = collabIds.filter((id) => !ownedIds.has(id));
    let sharedTrips = [];
    if (sharedOnlyIds.length > 0) {
      const { data, error } = await supabase.from("trips").select("*, destination:destinations(name, country, timezone, currency_code)").in("id", sharedOnlyIds).order("start_date", { ascending: true });
      if (error) console.error("Load shared trips error:", error);
      sharedTrips = data || [];
    }
    const collabSet = new Set(sharedTrips.map((t) => t.id));
    setCollabTripIds(collabSet);
    if (collabRows && collabRows.length > 0) {
      await supabase.from("trip_collaborators").update({ user_id: session.user.id, accepted_at: new Date().toISOString() }).or(`user_id.eq.${session.user.id},user_email.eq.${session.user.email}`).is("accepted_at", null);
    }
    setTrips([...(ownedTrips || []), ...sharedTrips]);
    setLoading(false);
  };

  useEffect(() => { loadTrips(); loadProfile(); }, [session]);

  const handleSignOut = async () => { await supabase.auth.signOut(); };

  const handleTripCreated = (tripId) => { setShowNewTrip(false); loadTrips(); onSelectTrip(tripId); };

  const handleDeleteTrip = async (tripId) => {
    const tables = ["itinerary_items", "itinerary_days", "flights", "hotels", "packing_items", "budget_estimates", "trip_budget", "trip_collaborators"];
    for (const table of tables) { await supabase.from(table).delete().eq("trip_id", tripId); }
    await supabase.from("trips").delete().eq("id", tripId);
    setConfirmDelete(null); loadTrips();
  };

  const handleNameSaved = (newName) => {
    setDisplayName(newName);
    setShowProfileModal(false);
  };

  const userEmail = session?.user?.email || "";

  return (
    <div style={S.wrap}>
      <div style={S.hero}>
        <button style={S.signOut} onClick={handleSignOut}>Sign out</button>
        <p style={S.heroTitle}>My Trips 🌴</p>
        <div style={S.heroSub}>{userEmail}</div>
        <button style={S.nameRow} onClick={() => setShowProfileModal(true)} title="Edit your display name">
          <span style={S.nameText}>👤 {displayName || "Set your name"}</span>
          <span style={S.pencil}>✏️</span>
        </button>
      </div>

      <div style={S.sec}>
        <button style={S.btn()} onClick={() => setShowNewTrip(true)}>+ Plan a New Trip</button>

        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: C.primary }}>Loading trips…</div>
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
            const isConfirming = confirmDelete === trip.id;

            return (
              <div key={trip.id} style={S.tripCard} onClick={() => { if (!isConfirming) onSelectTrip(trip.id); }}>
                {isOwner && (
                  <button style={S.shareBtn} onClick={(e) => { e.stopPropagation(); setShareTrip(trip); }} title="Share trip">👥</button>
                )}
                <div style={S.tripName}>{trip.name}</div>
                <div style={S.tripDates}>
                  {trip.destination?.name && `📍 ${trip.destination.name} • `}
                  {formatDates(trip.start_date, trip.end_date)}
                </div>
                <div>
                  {isShared && <span style={S.sharedBadge}>👥 SHARED WITH YOU</span>}
                  {isActive && <span style={S.badge(C.green, C.greenLight)}>🟢 Traveling now</span>}
                  {isPast && <span style={S.badge(C.textLight, "#eceff1")}>✓ Past trip</span>}
                </div>
                {isUpcoming && (
                  <div style={S.countdown}>
                    <div style={S.countdownNum}>{days}</div>
                    <div style={S.countdownLabel}>DAYS TO GO</div>
                  </div>
                )}

                {isOwner && !isConfirming && (
                  <button style={S.deleteBtn} onClick={(e) => { e.stopPropagation(); setConfirmDelete(trip.id); }}>Delete trip</button>
                )}

                {isOwner && isConfirming && (
                  <div style={{ marginTop: 10, padding: "10px 12px", background: C.redLight, borderRadius: 10, display: "flex", alignItems: "center", gap: 10 }} onClick={(e) => e.stopPropagation()}>
                    <span style={{ fontSize: 12, color: C.red, fontWeight: 700, flex: 1 }}>Delete "{trip.name}" and all its data?</span>
                    <button style={{ background: C.red, color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" }} onClick={() => handleDeleteTrip(trip.id)}>Yes, delete</button>
                    <button style={{ background: "#fff", color: C.textMid, border: `1px solid ${C.cardBorder}`, borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" }} onClick={() => setConfirmDelete(null)}>Cancel</button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {showNewTrip && <NewTripModal session={session} onClose={() => setShowNewTrip(false)} onCreated={handleTripCreated} />}
      {shareTrip && <ShareModal trip={shareTrip} onClose={() => setShareTrip(null)} />}
      {showProfileModal && (
        <ProfileModal
          currentName={displayName}
          userId={session.user.id}
          onClose={() => setShowProfileModal(false)}
          onSaved={handleNameSaved}
        />
      )}
    </div>
  );
}
