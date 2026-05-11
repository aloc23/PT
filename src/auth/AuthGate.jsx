import React, { useState } from "react";
import { Bus, Mail, Lock, LogIn, UserPlus } from "lucide-react";
import { supabase, supabaseConfigured } from "../supabaseClient.js";

const OAUTH_PROVIDERS = [
  { id: "google", label: "Continue with Google" },
  { id: "apple", label: "Continue with Apple" },
];

export default function AuthGate() {
  const [mode, setMode] = useState("signin"); // signin | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'error' | 'info', text }

  if (!supabaseConfigured) return <ConfigNeeded />;

  async function handleEmailSubmit(e) {
    e.preventDefault();
    setMessage(null);
    if (!email || !password) {
      setMessage({ type: "error", text: "Email and password are required." });
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        setMessage({
          type: "info",
          text: "Check your email to confirm your account, then sign in.",
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        // onAuthStateChange in useAuth will take it from here.
      }
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Something went wrong." });
    } finally {
      setBusy(false);
    }
  }

  async function handleOAuth(provider) {
    setMessage(null);
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch (err) {
      setBusy(false);
      setMessage({
        type: "error",
        text:
          err.message ||
          `Could not start ${provider} sign-in. Make sure it's enabled in Supabase.`,
      });
    }
  }

  return (
    <main className="authPage">
      <div className="authCard">
        <div className="authBrand">
          <Bus size={28} />
          <div>
            <p className="eyebrow">Priority Transfers</p>
            <h1>Sign in to sync</h1>
          </div>
        </div>
        <p className="authSub">
          One account, every device. Your trips, drivers and vehicles will
          appear the same on your phone, tablet and computer.
        </p>

        <div className="authOAuth">
          {OAUTH_PROVIDERS.map((p) => (
            <button
              key={p.id}
              type="button"
              className="oauthBtn"
              onClick={() => handleOAuth(p.id)}
              disabled={busy}
            >
              <ProviderIcon provider={p.id} />
              {p.label}
            </button>
          ))}
        </div>

        <div className="authDivider"><span>or with email</span></div>

        <form className="authForm" onSubmit={handleEmailSubmit}>
          <label>
            <span>Email</span>
            <div className="authInputRow">
              <Mail size={16} />
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
          </label>
          <label>
            <span>Password</span>
            <div className="authInputRow">
              <Lock size={16} />
              <input
                type="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
              />
            </div>
          </label>

          {message && (
            <div className={`authMessage ${message.type}`}>{message.text}</div>
          )}

          <button className="primary authSubmit" type="submit" disabled={busy}>
            {mode === "signup" ? <UserPlus size={16} /> : <LogIn size={16} />}
            {busy
              ? "Working…"
              : mode === "signup"
              ? "Create account"
              : "Sign in"}
          </button>
        </form>

        <div className="authSwitch">
          {mode === "signup" ? (
            <>
              Already have an account?{" "}
              <button
                type="button"
                className="linkBtn"
                onClick={() => { setMode("signin"); setMessage(null); }}
              >Sign in</button>
            </>
          ) : (
            <>
              New here?{" "}
              <button
                type="button"
                className="linkBtn"
                onClick={() => { setMode("signup"); setMessage(null); }}
              >Create an account</button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function ConfigNeeded() {
  return (
    <main className="authPage">
      <div className="authCard">
        <div className="authBrand">
          <Bus size={28} />
          <div>
            <p className="eyebrow">Priority Transfers</p>
            <h1>Almost there</h1>
          </div>
        </div>
        <p className="authSub">
          This app needs a Supabase project to store your data. Add your
          project URL and anon key in a <code>.env</code> file at the root of
          the project:
        </p>
        <pre className="authPre">{`VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-KEY`}</pre>
        <p className="authSub">
          See <code>README.md</code> for the full setup walkthrough (creating
          the project, running the SQL migration, and enabling Google/Apple
          sign-in).
        </p>
      </div>
    </main>
  );
}

function ProviderIcon({ provider }) {
  if (provider === "google") {
    return (
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.1 4 9.3 8.3 6.3 14.7z"/>
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.5-5.3l-6.2-5.2C29.3 35 26.8 36 24 36c-5.2 0-9.6-3.3-11.2-7.9l-6.5 5C9.2 39.6 16 44 24 44z"/>
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.2 5.2C40.9 35.6 44 30.3 44 24c0-1.3-.1-2.4-.4-3.5z"/>
      </svg>
    );
  }
  if (provider === "apple") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.7-3-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.4 1-4.3 2.6-1.9 3.2-.5 8 1.3 10.6.9 1.3 1.9 2.7 3.3 2.6 1.3-.1 1.8-.9 3.4-.9 1.6 0 2 .9 3.4.9 1.4 0 2.3-1.3 3.2-2.6.9-1.4 1.3-2.7 1.3-2.8 0-.1-2.5-1-2.5-3.5zM13.7 4.4c.7-.9 1.2-2.1 1.1-3.4-1 0-2.3.7-3 1.5-.6.8-1.3 2.1-1.1 3.3 1.2.1 2.3-.6 3-1.4z"/>
      </svg>
    );
  }
  return null;
}
