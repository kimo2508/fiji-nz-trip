import { useState } from "react";
import { supabase } from "./supabase";

const S = {
  wrap: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(180deg, #0a4d68 0%, #088395 50%, #05bfdb 100%)",
    padding: "24px",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  brand: {
    textAlign: "center",
    marginBottom: "32px",
    color: "#fff",
  },
  brandEmoji: { fontSize: "56px", marginBottom: "8px" },
  brandName: {
    fontSize: "32px",
    fontWeight: "700",
    margin: "0 0 4px 0",
    letterSpacing: "-0.5px",
  },
  brandSub: { fontSize: "13px", opacity: 0.85, fontWeight: "500" },
  card: {
    background: "#fff",
    borderRadius: "20px",
    padding: "32px 24px",
    width: "100%",
    maxWidth: "380px",
    boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
  },
  cardTitle: {
    fontSize: "22px",
    fontWeight: "700",
    color: "#0a4d68",
    marginBottom: "4px",
    textAlign: "center",
  },
  cardSub: {
    fontSize: "14px",
    color: "#64748b",
    marginBottom: "24px",
    textAlign: "center",
  },
  googleBtn: {
    width: "100%",
    padding: "14px",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    background: "#fff",
    color: "#1e293b",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
  },
  divider: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    margin: "20px 0",
    fontSize: "12px",
    color: "#94a3b8",
    fontWeight: "600",
  },
  dividerLine: { flex: 1, height: "1px", background: "#e2e8f0" },
  input: {
    width: "100%",
    padding: "12px 14px",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    fontSize: "15px",
    marginBottom: "10px",
    boxSizing: "border-box",
    fontFamily: "inherit",
  },
  btn: {
    width: "100%",
    padding: "14px",
    border: "none",
    borderRadius: "12px",
    background: "#0a4d68",
    color: "#fff",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    marginTop: "4px",
  },
  btnSecondary: {
    width: "100%",
    padding: "14px",
    border: "1px solid #0a4d68",
    borderRadius: "12px",
    background: "#fff",
    color: "#0a4d68",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    marginTop: "4px",
  },
  toggle: {
    width: "100%",
    background: "none",
    border: "none",
    color: "#0a4d68",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    marginTop: "12px",
    padding: "8px",
  },
  helperText: {
    fontSize: "12px",
    color: "#64748b",
    textAlign: "center",
    marginTop: "10px",
    lineHeight: "1.5",
  },
  msg: (isError) => ({
    marginTop: "16px",
    padding: "10px 12px",
    borderRadius: "8px",
    fontSize: "13px",
    background: isError ? "#fee2e2" : "#dcfce7",
    color: isError ? "#991b1b" : "#166534",
    textAlign: "center",
    lineHeight: "1.4",
  }),
};

const friendlyError = (err) => {
  const m = (err?.message || "").toLowerCase();
  if (m.includes("invalid login credentials")) {
    return "Wrong email or password. Try the magic link option above instead.";
  }
  if (m.includes("user already registered") || m.includes("already been registered")) {
    return "An account with that email already exists. Use the magic link option above to sign in.";
  }
  if (m.includes("password should be at least")) {
    return "Password must be at least 6 characters.";
  }
  if (m.includes("invalid email") || m.includes("unable to validate email")) {
    return "That doesn't look like a valid email address.";
  }
  if (m.includes("rate limit") || m.includes("too many")) {
    return "Too many attempts. Wait a minute and try again.";
  }
  return err?.message || "Something went wrong. Try again.";
};

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPasswordOption, setShowPasswordOption] = useState(false);
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const handleGoogle = async () => {
    setLoading(true);
    setMsg(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      setMsg({ text: friendlyError(error), isError: true });
      setLoading(false);
    }
  };

  // Magic link — works for both new & returning users
  const handleMagicLink = async () => {
    if (!email.trim()) {
      setMsg({ text: "Enter your email first.", isError: true });
      return;
    }
    setLoading(true);
    setMsg(null);

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: window.location.origin,
        shouldCreateUser: true, // allows new users to be created on first click
      },
    });

    setLoading(false);

    if (error) {
      setMsg({ text: friendlyError(error), isError: true });
      return;
    }

    setMsg({
      text: `✉️ Check your email! We sent a sign-in link to ${email.trim()}. Open it on the same device you want to use.`,
      isError: false,
    });
  };

  const handleEmailPassword = async () => {
    if (!email.trim() || !password) {
      setMsg({ text: "Enter both email and password.", isError: true });
      return;
    }
    if (password.length < 6) {
      setMsg({ text: "Password must be at least 6 characters.", isError: true });
      return;
    }

    setLoading(true);
    setMsg(null);

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) {
        const m = (error.message || "").toLowerCase();
        if (m.includes("already registered") || m.includes("already been registered")) {
          setMode("signin");
          setMsg({
            text: "You already have an account. Enter your password, or use the magic link above.",
            isError: false,
          });
        } else {
          setMsg({ text: friendlyError(error), isError: true });
        }
        setLoading(false);
        return;
      }

      if (!data?.session) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) {
          setMsg({ text: friendlyError(signInError), isError: true });
          setLoading(false);
          return;
        }
      }
      return;
    }

    // mode === "signin"
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      setMsg({ text: friendlyError(error), isError: true });
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      if (showPasswordOption) handleEmailPassword();
      else handleMagicLink();
    }
  };

  return (
    <div style={S.wrap}>
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

        <input
          style={S.input}
          type="email"
          placeholder="Email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={handleKeyDown}
        />

        {!showPasswordOption ? (
          <>
            <button style={S.btn} onClick={handleMagicLink} disabled={loading}>
              {loading ? "..." : "✉️ Email me a sign-in link"}
            </button>
            <div style={S.helperText}>
              We'll send you a magic link — no password needed
            </div>
            <button
              style={S.toggle}
              onClick={() => { setShowPasswordOption(true); setMsg(null); }}
              disabled={loading}
            >
              Use a password instead
            </button>
          </>
        ) : (
          <>
            <input
              style={S.input}
              type="password"
              placeholder={mode === "signup" ? "Password (min 6 characters)" : "Password"}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button style={S.btn} onClick={handleEmailPassword} disabled={loading}>
              {loading ? "..." : mode === "signin" ? "Sign In" : "Create Account"}
            </button>
            <button
              style={S.toggle}
              onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setMsg(null); }}
              disabled={loading}
            >
              {mode === "signin"
                ? "New here? Create an account"
                : "Already have an account? Sign in"}
            </button>
            <button
              style={S.toggle}
              onClick={() => { setShowPasswordOption(false); setPassword(""); setMsg(null); }}
              disabled={loading}
            >
              ← Back to magic link
            </button>
          </>
        )}

        {msg && <div style={S.msg(msg.isError)}>{msg.text}</div>}
      </div>
    </div>
  );
}
