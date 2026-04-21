import { useState } from "react";
import { supabase } from "./supabase";
import { C, GLOBAL_CSS } from "./styles";

const S = {
  wrap: {
    minHeight: "100vh",
    background: `linear-gradient(135deg, ${C.primary} 0%, ${C.primaryDark} 100%)`,
    fontFamily: "'DM Sans', sans-serif",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
  },
  brand: { textAlign: "center", marginBottom: 24 },
  brandEmoji: { fontSize: 64, marginBottom: 8 },
  brandName: {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: 36,
    color: "#fff",
    margin: "0 0 4px",
    letterSpacing: 4,
  },
  brandSub: {
    fontSize: 11,
    color: "rgba(255,255,255,0.6)",
    fontWeight: 700,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  card: {
    background: "#fff",
    borderRadius: 20,
    padding: "28px 24px",
    width: "100%",
    maxWidth: 380,
    boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
    textAlign: "center",
  },
  cardTitle: { fontSize: 16, fontWeight: 700, color: C.primaryDark, marginBottom: 4 },
  cardSub: { fontSize: 13, color: C.textLight, fontWeight: 600, marginBottom: 20 },
  googleBtn: {
    width: "100%",
    padding: "12px 16px",
    background: "#fff",
    color: C.text,
    border: `1.5px solid ${C.cardBorder}`,
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 700,
    fontFamily: "'DM Sans', sans-serif",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 16,
  },
  divider: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    margin: "16px 0",
    color: C.textFaint,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 1,
  },
  dividerLine: { flex: 1, height: 1, background: C.cardBorder },
  input: {
    width: "100%",
    padding: "11px 14px",
    border: `1.5px solid ${C.cardBorder}`,
    borderRadius: 10,
    fontSize: 14,
    fontFamily: "'DM Sans', sans-serif",
    background: C.iceInput,
    color: C.text,
    outline: "none",
    boxSizing: "border-box",
    marginBottom: 10,
  },
  btn: {
    width: "100%",
    padding: "12px 20px",
    background: C.primary,
    color: "#fff",
    border: "none",
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 700,
    fontFamily: "'DM Sans', sans-serif",
    cursor: "pointer",
    marginTop: 4,
  },
  toggle: {
    background: "none",
    border: "none",
    color: C.primary,
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    marginTop: 14,
    fontFamily: "'DM Sans', sans-serif",
  },
  msg: (isError) => ({
    fontSize: 12,
    color: isError ? C.red : C.green,
    fontWeight: 700,
    marginTop: 10,
    padding: "8px 12px",
    background: isError ? C.redLight : C.greenLight,
    borderRadius: 8,
  }),
};

export default function Login() {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleGoogle = async () => {
    setLoading(true);
    setMsg(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      setMsg({ text: error.message, isError: true });
      setLoading(false);
    }
  };

  const handleEmail = async () => {
    if (!email || !password) {
      setMsg({ text: "Email and password required", isError: true });
      return;
    }
    setLoading(true);
    setMsg(null);
    const fn = mode === "signin" ? supabase.auth.signInWithPassword : supabase.auth.signUp;
    const { error } = await fn({ email, password });
    if (error) {
      setMsg({ text: error.message, isError: true });
    } else if (mode === "signup") {
      setMsg({ text: "Check your email to confirm your account!", isError: false });
    }
    setLoading(false);
  };

  return (
    <div style={S.wrap}>
      <style>{GLOBAL_CSS}</style>
      <div style={S.brand}>
        <div style={S.brandEmoji}>🌴</div>
        <h1 style={S.brandName}>Trip Planner</h1>
        <div style={S.brandSub}>Fuse Apps by TNT Labs</div>
      </div>

      <div style={S.card}>
        <div style={S.cardTitle}>Welcome</div>
        <div style={S.cardSub}>Plan trips with your favorite people</div>

        <button style={S.googleBtn} onClick={handleGoogle} disabled={loading}>
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" />
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
            <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" />
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" />
          </svg>
          Continue with Google
        </button>

        <div style={S.divider}>
          <div style={S.dividerLine} />
          <span>OR</span>
          <div style={S.dividerLine} />
        </div>

        <input style={S.input} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input style={S.input} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />

        <button style={S.btn} onClick={handleEmail} disabled={loading}>
          {loading ? "..." : mode === "signin" ? "Sign In" : "Create Account"}
        </button>

        <button style={S.toggle} onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setMsg(null); }}>
          {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
        </button>

        {msg && <div style={S.msg(msg.isError)}>{msg.text}</div>}
      </div>
    </div>
  );
}
