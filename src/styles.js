// ── TRAVEL PLANNER — FUSE BRAND STYLES ───────────────────────────────────
// Centralized color + style system for the Fiji/NZ Trip Planner

export const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700;800&display=swap');
* { box-sizing: border-box; margin: 0; padding: 0; }
::-webkit-scrollbar { width: 0; height: 0; }
body { background: #F0F5FB; }
`;

// ── THEME COLORS ─────────────────────────────────────────────────────────
export const C = {
  // Primary blues (Fuse core)
  primary: "#185FA5",
  primaryDark: "#0C447C",
  navy: "#042C53",
  sky: "#378ADD",
  ice: "#E6F1FB",
  iceBg: "#F0F5FB",
  iceInput: "#F8FAFD",

  // Accent (amber — travel warmth)
  amber: "#EF9F27",
  amberDark: "#BA7517",
  amberLight: "#FAEEDA",

  // Text
  text: "#1a2e35",
  textMid: "#546e7a",
  textLight: "#78909c",
  textFaint: "#90a4ae",
  textMuted: "#b0bec5",

  // Surfaces
  white: "#fff",
  cardBorder: "#E6F1FB",
  divider: "#F0F5FB",
  overlay: "rgba(0,0,0,0.45)",

  // Status
  green: "#2e7d32",
  greenLight: "#e8f5e9",
  greenBorder: "#bbf7d0",
  red: "#c62828",
  redLight: "#fdecea",

  // Category colors (activities)
  catRestaurant: "#EF9F27",
  catActivity: "#1D9E75",
  catSightseeing: "#E24B4A",
  catTransport: "#185FA5",
  catNote: "#85B7EB",

  // Budget section accents
  flights: "#185FA5",
  lodging: "#534AB7",
  booked: "#2e7d32",
  estimates: "#EF9F27",

  // Live indicator
  liveGreen: "#4ade80",
  liveOff: "#94a3b8",

  // Utility
  editBtn: "#94a3b8",
  cancelBtn: "#94a3b8",
};

export const CAT_COLORS = {
  "🍽️ Restaurant": C.catRestaurant,
  "🏄 Activity": C.catActivity,
  "🗺️ Sightseeing": C.catSightseeing,
  "🚗 Transport": C.catTransport,
  "📝 Note": C.catNote,
};

export const BADGE_COLORS = [
  { bg: C.ice, fg: C.primaryDark },
  { bg: "#FAEEDA", fg: "#BA7517" },
  { bg: "#EEEDFE", fg: "#534AB7" },
  { bg: "#E1F5EE", fg: "#0F6E56" },
  { bg: "#FAECE7", fg: "#993C1D" },
  { bg: "#E6F1FB", fg: "#042C53" },
  { bg: "#FBEAF0", fg: "#72243E" },
  { bg: "#EAF3DE", fg: "#27500A" },
];

// ── STYLE OBJECT ─────────────────────────────────────────────────────────
export const S = {
  wrap: { maxWidth: 480, margin: "0 auto", minHeight: "100vh", background: C.iceBg, fontFamily: "'DM Sans', sans-serif", paddingBottom: 80 },
  hero: { background: `linear-gradient(135deg, ${C.primary} 0%, ${C.primaryDark} 100%)`, padding: "28px 20px 48px", position: "relative", overflow: "hidden" },
  heroTitle: { fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: "#fff", margin: 0, letterSpacing: 3 },
  heroSub: { fontSize: 13, color: "rgba(255,255,255,0.8)", fontWeight: 600 },
  liveIndicator: { position: "absolute", top: 16, left: 16, display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: "rgba(255,255,255,0.7)", fontWeight: 700, letterSpacing: 1 },
  liveDot: (live) => ({ width: 7, height: 7, borderRadius: "50%", background: live ? C.liveGreen : C.liveOff, boxShadow: live ? `0 0 6px ${C.liveGreen}` : "none" }),
  backBtn: { background: "rgba(255,255,255,0.2)", color: "#fff", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", marginBottom: 10 },
  accessBadge: (bg, fg) => ({ display: "inline-block", background: bg, color: fg, padding: "3px 10px", borderRadius: 10, fontSize: 10, fontWeight: 700, letterSpacing: 1, marginTop: 6 }),
  statRow: { marginTop: 12, display: "flex", gap: 10 },
  stat: { background: "rgba(255,255,255,0.15)", borderRadius: 12, padding: "10px 12px", textAlign: "center", flex: 1 },
  statNum: { fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, color: "#fff", lineHeight: 1 },
  statLabel: { fontSize: 8, color: "rgba(255,255,255,0.7)", fontWeight: 700, letterSpacing: 1, marginTop: 2 },
  nav: { position: "sticky", top: 0, zIndex: 100, background: C.white, display: "flex", overflowX: "auto", borderBottom: `2px solid ${C.ice}`, scrollbarWidth: "none" },
  nb: (active) => ({ flex: "0 0 auto", padding: "12px 14px", fontSize: 11, fontWeight: 700, letterSpacing: 0.5, border: "none", background: "none", color: active ? C.primary : C.textFaint, borderBottom: active ? `2px solid ${C.primary}` : "2px solid transparent", cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s", fontFamily: "'DM Sans', sans-serif" }),
  sec: { padding: "16px 16px 0" },
  card: { background: C.white, borderRadius: 14, padding: "14px 16px", marginBottom: 12, boxShadow: "0 1px 6px rgba(0,0,0,0.07)" },
  label: { fontSize: 10, fontWeight: 800, color: C.primary, letterSpacing: 1.5, marginBottom: 8 },
  input: { width: "100%", padding: "10px 12px", border: `1.5px solid ${C.cardBorder}`, borderRadius: 10, fontSize: 14, fontFamily: "'DM Sans', sans-serif", background: C.iceInput, color: C.text, outline: "none", boxSizing: "border-box", marginBottom: 8 },
  priceInput: { padding: "10px 12px", border: `1.5px solid ${C.greenBorder}`, borderRadius: 10, fontSize: 15, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", background: C.greenLight, color: C.green, outline: "none", boxSizing: "border-box", marginBottom: 8, width: "100%" },
  select: { width: "100%", padding: "10px 12px", border: `1.5px solid ${C.cardBorder}`, borderRadius: 10, fontSize: 14, fontFamily: "'DM Sans', sans-serif", background: C.iceInput, color: C.text, outline: "none", marginBottom: 8 },
  btn: (color = C.primary) => ({ background: color, color: "#fff", border: "none", borderRadius: 10, padding: "11px 20px", fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", cursor: "pointer", width: "100%", marginTop: 4 }),
  btnSm: (color = C.primary) => ({ background: color, color: "#fff", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 11, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", cursor: "pointer" }),
  del: { background: "none", border: "none", color: C.textMuted, fontSize: 18, cursor: "pointer", padding: "2px 6px", lineHeight: 1 },
  overlay: { position: "fixed", inset: 0, background: C.overlay, zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" },
  sheet: { background: C.white, borderRadius: "20px 20px 0 0", padding: "24px 20px 40px", width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" },
  chip: (color) => ({ display: "inline-block", padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: color + "20", color: color, marginRight: 4 }),
  priceTag: { display: "inline-flex", alignItems: "center", gap: 3, padding: "3px 8px", borderRadius: 8, fontSize: 12, fontWeight: 800, background: C.greenLight, color: C.green, marginLeft: "auto" },
  addedBy: (bg, fg) => ({ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700, background: bg, color: fg, marginTop: 4, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }),
  budgetCard: (accent) => ({ background: C.white, borderRadius: 14, padding: "14px 16px", marginBottom: 10, boxShadow: "0 1px 6px rgba(0,0,0,0.07)", borderLeft: `4px solid ${accent}` }),
  totalBanner: (bg, text) => ({ background: bg, borderRadius: 16, padding: "16px 18px", marginBottom: 12, textAlign: "center", color: text }),
  heroWave: C.iceBg,
};
