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
    marginBottom: 4,
  },
  sub: { fontSize: 13, color: "#78909c", marginBottom: 20 },
  label: { fontSize: 10, fontWeight: 800, color: "#0a9396", letterSpacing: 1.5, marginBottom: 8, marginTop: 14 },
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
  btn: (color = "#0a9396") => ({
    background: color,
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "12px 20px",
    fontSize: 14,
    fontWeight: 700,
    fontFamily: "'Nunito', sans-serif",
    cursor: "pointer",
    width: "100%",
    marginTop: 12,
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
  collabList: { marginTop: 6 },
  collabRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 12px",
    background: "#f8fdfd",
    borderRadius: 10,
    marginBottom: 6,
    border: "1px solid #e0f2f1",
  },
  collabEmail: { fontSize: 13, color: "#1a2e35", fontWeight: 600, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  collabStatus: (accepted) => ({
    fontSize: 10,
    fontWeight: 700,
    padding: "3px 8px",
    borderRadius: 8,
    background: accepted ? "#e8f5e9" : "#fff8e1",
    color: accepted ? "#2e7d32" : "#f57c00",
    marginRight: 8,
    whiteSpace: "nowrap",
  }),
  removeBtn: {
    background: "none",
    border: "none",
    color: "#c62828",
    fontSize: 18,
    cursor: "pointer",
    padding: "2px 6px",
  },
  empty: { fontSize: 12, color: "#90a4ae", fontStyle: "italic", padding: "12px 0" },
  msg: (isError) => ({
    fontSize: 12,
    color: isError ? "#c62828" : "#2e7d32",
    fontWeight: 700,
    marginTop: 10,
    padding: "8px 12px",
    background: isError ? "#fdecea" : "#e8f5e9",
    borderRadius: 8,
  }),
  info: {
    background: "#e0f7fa",
    borderRadius: 10,
    padding: "10px 14px",
    fontSize: 12,
    color: "#005f73",
    marginBottom: 4,
    lineHeight: 1.5,
  },
};

export default function ShareModal({ trip, onClose }) {
  const [email, setEmail] = useState("");
  const [collaborators, setCollaborators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [msg, setMsg] = useState(null);

  const loadCollaborators = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("trip_collaborators")
      .select("*")
      .eq("trip_id", trip.id)
      .order("invited_at", { ascending: true });
    if (error) console.error("Load collaborators error:", error);
    setCollaborators(data || []);
    setLoading(false);
  };

  useEffect(() => { loadCollaborators(); }, [trip.id]);

  const handleInvite = async () => {
    setMsg(null);
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      return setMsg({ text: "Please enter a valid email address", isError: true });
    }
    if (collaborators.some((c) => c.user_email === cleanEmail)) {
      return setMsg({ text: "That person is already invited", isError: true });
    }

    setInviting(true);

    // Step 1: Add to trip_collaborators
    const { error: collabError } = await supabase
      .from("trip_collaborators")
      .insert({
        trip_id: trip.id,
        user_email: cleanEmail,
        role: "editor",
      });

    if (collabError) {
      setMsg({ text: "Could not add collaborator: " + collabError.message, isError: true });
      setInviting(false);
      return;
    }

    // Step 2: Send magic link
    const { error: emailError } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (emailError) {
      setMsg({
        text: `Added to trip, but email failed: ${emailError.message}. They can still sign in with this email to see the trip.`,
        isError: true,
      });
    } else {
      setMsg({ text: `✓ Invite sent to ${cleanEmail}!`, isError: false });
    }

    setEmail("");
    setInviting(false);
    loadCollaborators();
  };

  const handleRemove = async (id, removeEmail) => {
    if (!window.confirm(`Remove ${removeEmail} from this trip?`)) return;
    const { error } = await supabase
      .from("trip_collaborators")
      .delete()
      .eq("id", id);
    if (error) {
      setMsg({ text: "Could not remove: " + error.message, isError: true });
    } else {
      setMsg({ text: "✓ Collaborator removed", isError: false });
    }
    loadCollaborators();
  };

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.sheet} onClick={(e) => e.stopPropagation()}>
        <div style={S.title}>Share Trip 👥</div>
        <div style={S.sub}>{trip.name}</div>

        <div style={S.info}>
          Collaborators can see and edit the itinerary, hotels, and flights (no prices or confirmation numbers). They can't see your packing list or budget.
        </div>

        <div style={S.label}>INVITE BY EMAIL</div>
        <input
          style={S.input}
          type="email"
          placeholder="friend@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={inviting}
        />
        <button style={S.btn()} onClick={handleInvite} disabled={inviting}>
          {inviting ? "Sending…" : "Send Invite"}
        </button>

        {msg && <div style={S.msg(msg.isError)}>{msg.text}</div>}

        <div style={S.label}>CURRENT COLLABORATORS ({collaborators.length})</div>
        {loading ? (
          <div style={S.empty}>Loading…</div>
        ) : collaborators.length === 0 ? (
          <div style={S.empty}>No one else on this trip yet</div>
        ) : (
          <div style={S.collabList}>
            {collaborators.map((c) => (
              <div key={c.id} style={S.collabRow}>
                <span style={S.collabEmail}>{c.user_email}</span>
                <span style={S.collabStatus(!!c.accepted_at)}>
                  {c.accepted_at ? "JOINED" : "INVITED"}
                </span>
                <button style={S.removeBtn} onClick={() => handleRemove(c.id, c.user_email)}>×</button>
              </div>
            ))}
          </div>
        )}

        <button style={S.btnSecondary} onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
