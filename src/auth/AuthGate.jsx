import { useState } from "react";
import { Bus, Mail, Lock, Loader2 } from "lucide-react";
import { supabase, supabaseConfigured } from "../supabaseClient.js";
import { useAuth } from "./useAuth.js";

function LoginPage() {
  const [mode, setMode] = useState("signin"); // signin | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null); // { type: "error" | "info", text }

  async function submit(event) {
    event.preventDefault();
    setMessage(null);
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (!data.session) {
          setMessage({
            type: "info",
            text: "Account created. Check your email to confirm it, then sign in.",
          });
        }
      }
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Something went wrong. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="authPage">
      <div className="authCard">
        <div className="authBrand">
          <Bus size={28} />
          <h1>Priority Transfers</h1>
        </div>
        <p className="authSub">
          {mode === "signin"
            ? "Sign in to see your bookings on any device."
            : "Create an account to sync your bookings across devices."}
        </p>
        <form className="authForm" onSubmit={submit}>
          <label>
            Email
            <div className="authInputRow">
              <Mail size={16} />
              <input type="email" required autoComplete="email" value={email}
                onChange={(e) => setEmail(e.target.value)} />
            </div>
          </label>
          <label>
            Password
            <div className="authInputRow">
              <Lock size={16} />
              <input type="password" required minLength={6}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </label>
          {message && <div className={`authMessage ${message.type}`}>{message.text}</div>}
          <button type="submit" className="primary authSubmit" disabled={busy}>
            {busy && <Loader2 size={16} />}
            {mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>
        <p className="authSwitch">
          {mode === "signin" ? "New here? " : "Already have an account? "}
          <button type="button" className="linkBtn"
            onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setMessage(null); }}>
            {mode === "signin" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}

function Centered({ children }) {
  return (
    <div className="authPage">
      <div className="authCard">{children}</div>
    </div>
  );
}

// Protects the app: renders children(user, signOut) only when signed in.
export default function AuthGate({ children }) {
  const { user, loading, signOut } = useAuth();

  if (!supabaseConfigured) {
    return (
      <Centered>
        <div className="authBrand"><Bus size={28} /><h1>Almost there</h1></div>
        <p className="authSub">
          Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in
          a <code>.env</code> file (see the README), then restart the dev server.
        </p>
      </Centered>
    );
  }
  if (loading) {
    return <Centered><p className="authSub">Loading…</p></Centered>;
  }
  if (!user) return <LoginPage />;
  return children(user, signOut);
}
