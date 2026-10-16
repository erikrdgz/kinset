import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Session as AuthSession } from "@supabase/supabase-js";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "./backend";
import { Brand } from "./ui/Brand";
import { Journal } from "./app/Journal";

// Password reset needs outgoing email (SMTP). Enable once it is configured.
const PASSWORD_RESET_ENABLED = false;

export default function App() {
  const [session, setSession] = useState<AuthSession | null>(null),
    // A signed-in session is restored by Supabase, but the demo had nothing to restore
    // from: reloading mid-workout returned to the sign-in screen, even though the demo
    // journal was safe on the device. Remembering the choice for the tab means an
    // interruption resumes where it left off.
    [demo, setDemo] = useState(
      () => sessionStorage.getItem("kinset:demo") === "1",
    ),
    [loading, setLoading] = useState(!!supabase),
    [recover, setRecover] = useState(false);
  const enterDemo = (on: boolean) => {
    try {
      if (on) sessionStorage.setItem("kinset:demo", "1");
      else sessionStorage.removeItem("kinset:demo");
    } catch {
      // Private browsing can refuse session storage; the demo still works in-memory.
    }
    setDemo(on);
  };
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data, error }) => {
      setSession(data.session);
      setLoading(false);
      if (error) console.warn("Session could not be restored.");
    });
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setLoading(false);
      if (event === "PASSWORD_RECOVERY") setRecover(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  if (loading)
    return (
      <div className="loading">
        <Brand />
        <p>Opening your training journal…</p>
      </div>
    );
  if (recover && session)
    return (
      <Auth
        recovery
        onRecovered={() => setRecover(false)}
        onDemo={() => enterDemo(true)}
      />
    );
  if (!session && !demo) return <Auth onDemo={() => enterDemo(true)} />;
  return (
    <Journal
      key={session?.user.id || "demo"}
      owner={session?.user.id || "demo"}
      email={session?.user.email}
      onExit={async () => {
        if (session) await supabase?.auth.signOut();
        enterDemo(false);
      }}
    />
  );
}
function Auth({
  onDemo,
  recovery = false,
  onRecovered,
}: {
  onDemo: () => void;
  recovery?: boolean;
  onRecovered?: () => void;
}) {
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login"),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setMessage("");
    try {
      const redirect = window.location.origin + import.meta.env.BASE_URL;
      const result = recovery
        ? await supabase.auth.updateUser({ password })
        : mode === "signup"
          ? await supabase.auth.signUp({
              email,
              password,
              options: { emailRedirectTo: redirect },
            })
          : mode === "reset"
            ? await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: redirect,
              })
            : await supabase.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      if (recovery) onRecovered?.();
      else if (
        mode === "signup" &&
        !("session" in result.data && result.data.session)
      )
        setMessage("Check your email to confirm your account.");
      else if (mode === "reset")
        setMessage("If an account exists, a reset link is on its way.");
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Unable to connect. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div
      className={
        mode === "signup" && !recovery ? "auth-page is-creating" : "auth-page"
      }
    >
      <header>
        <Brand />
      </header>
      <main className="auth-grid page-enter">
        <section className="auth-story">
          <div className="auth-edition">
            <span>STRENGTH, ON YOUR TERMS.</span>
          </div>
          <div className="auth-mast">
            <h1 className="kinset-brand-display">
              <span className="kinset-mast-wordmark" role="img" aria-label="Kinset" style={{ maskImage: `url(${import.meta.env.BASE_URL}kinset-wordmark.svg)`, WebkitMaskImage: `url(${import.meta.env.BASE_URL}kinset-wordmark.svg)` }} />
            </h1>
          </div>
          <div className="auth-manifesto">
            <h2>
              Show up.
              <br />
              Get better.
            </h2>
          </div>
          <p className="auth-pillars">Plan. Train. Progress.</p>
        </section>
        <section className="auth-card">
          <h2>
            {recovery
              ? "Set a new password"
              : mode === "signup"
                ? "Your next chapter."
                : mode === "reset"
                  ? "Reset your password"
                  : "Welcome to Kinset."}
          </h2>
          <p className="muted">
            {recovery
              ? "Choose a new password for your account."
              : mode === "signup"
                ? "Start your journey. Your progress goes wherever you do."
                : mode === "reset"
                  ? "We’ll send a link to your email."
                  : !supabase
                    ? "Explore the exercises, build your own plan, and log a workout."
                    : "Sign in and pick up right where you left off."}
          </p>
          {supabase && (
            <form onSubmit={submit}>
              {!recovery && (
                <label>
                  Email
                  <input
                    ref={emailRef}
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    disabled={!supabase}
                  />
                </label>
              )}
              {(mode !== "reset" || recovery) && (
                <label>
                  Password
                  <input
                    type="password"
                    minLength={8}
                    autoComplete={
                      mode === "signup" || recovery
                        ? "new-password"
                        : "current-password"
                    }
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    disabled={!supabase}
                  />
                </label>
              )}
              <button className="primary" disabled={busy || !supabase}>
                {busy
                  ? "Please wait…"
                  : recovery
                    ? "Save password"
                    : mode === "signup"
                      ? "Create account"
                      : mode === "reset"
                        ? "Send reset link"
                        : "Sign in"}
                <ArrowUpRight size={18} />
              </button>
              <p role="status" className="message">
                {message}
              </p>
            </form>
          )}
          {!recovery && (
            <>
              {supabase && (
                <>
                  <div className="auth-links">
                    <button
                      onClick={() => {
                        setMode(mode === "signup" ? "login" : "signup");
                        setMessage("");
                      }}
                    >
                      {mode === "signup"
                        ? "Already have an account? Sign in"
                        : "Create an account"}
                    </button>
                    {PASSWORD_RESET_ENABLED && (
                      <button
                        onClick={() => {
                          setMode(mode === "reset" ? "login" : "reset");
                          setMessage("");
                        }}
                      >
                        {mode === "reset"
                          ? "Back to sign in"
                          : "Forgot password?"}
                      </button>
                    )}
                  </div>
                </>
              )}
              <button
                className={
                  supabase ? "secondary full" : "primary full preview-start"
                }
                onClick={onDemo}
              >
                Try the demo <ChevronRight size={18} />
              </button>
            </>
          )}
        </section>
      </main>
      <footer className="app-footer auth-footer">
        <Brand />
        <span className="made-by">Made to make you healthy. By Erik Rodriguez.</span>
      </footer>
    </div>
  );
}
