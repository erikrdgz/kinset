import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import type { Session as AuthSession } from "@supabase/supabase-js";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import { supabase } from "./backend";
import { Brand } from "./ui/Brand";
import { Journal } from "./app/Journal";
import { AuthTransition } from "./ui/AuthTransition";
import { BrandIntro } from "./ui/BrandIntro";
import { createAuthEntryGate } from "./ui/authEntry";

// Password reset needs outgoing email (SMTP). Enable once it is configured.
const PASSWORD_RESET_ENABLED = false;

export default function App() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [demo, setDemo] = useState(() => {
    try { return sessionStorage.getItem("kinset:demo") === "1"; }
    catch { return false; }
  });
  const [loading, setLoading] = useState(!!supabase);
  const [recover, setRecover] = useState(false);
  const [entry, setEntry] = useState<number | null>(null);
  // The cold open plays on every load of the signed-out view. A restored session skips
  // it, so a returning signed-in user goes straight to their journal.
  const [intro, setIntro] = useState(true);
  const endIntro = useCallback(() => setIntro(false), []);
  const entrySequence = useRef(0);
  const authGate = useRef(createAuthEntryGate<AuthSession>());
  const finishEntry = useCallback(() => setEntry(null), []);
  const revealEntry = () => setEntry(++entrySequence.current);
  const enterDemo = (on: boolean) => {
    try {
      if (on) sessionStorage.setItem("kinset:demo", "1");
      else sessionStorage.removeItem("kinset:demo");
    } catch { /* The demo still works when storage is unavailable. */ }
    if (on && !demo) revealEntry();
    if (!on) setEntry(null);
    setDemo(on);
  };
  const settleAuth = (attempt: number, confirmed?: AuthSession) => {
    const result = authGate.current.settle(attempt, confirmed);
    if (!result) return;
    if (result.session !== undefined) setSession(result.session);
    if (result.reveal) revealEntry();
  };
  useEffect(() => {
    if (!supabase) return;
    let live = true;
    let receivedAuthEvent = false;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!live || receivedAuthEvent) return;
      setSession(data.session);
      setLoading(false);
      if (error) console.warn("Session could not be restored.");
    });
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      if (!live) return;
      receivedAuthEvent = true;
      setLoading(false);
      // The successful request response owns the reveal; refresh/restore events never do.
      if (authGate.current.defer(event, next)) return;
      setSession(next);
      if (event === "PASSWORD_RECOVERY") {
        authGate.current.cancel();
        setEntry(null);
        setRecover(true);
      }
    });
    return () => { live = false; data.subscription.unsubscribe(); };
  }, []);

  const auth = <Auth onDemo={() => enterDemo(true)}
    recovery={recover && !!session} onRecovered={() => setRecover(false)}
    onAuthenticating={() => authGate.current.begin()} onAuthSettled={settleAuth} />;
  const content = loading ? <div className="loading"><Brand /><p>Opening your training journal…</p></div>
    : (recover && session) || (!session && !demo) ? auth
    : <Journal key={session?.user.id || "demo"} owner={session?.user.id || "demo"} email={session?.user.email}
        onExit={async () => { if (session) await supabase?.auth.signOut(); enterDemo(false); }} />;
  const showIntro = intro && !loading && !session && !demo;
  return <>
    <div inert={entry !== null || showIntro || undefined} style={{ display: "contents" }}>{content}</div>
    {showIntro && <BrandIntro onComplete={endIntro} />}
    {entry !== null && <AuthTransition key={entry} onComplete={finishEntry} />}
  </>;
}

function Auth({
  onDemo,
  recovery = false,
  onRecovered,
  onAuthenticating,
  onAuthSettled,
}: {
  onDemo: () => void;
  recovery?: boolean;
  onRecovered?: () => void;
  onAuthenticating: () => number;
  onAuthSettled: (attempt: number, session?: AuthSession) => void;
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
    const attempt = !recovery && mode !== "reset" ? onAuthenticating() : undefined;
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
      if (attempt !== undefined && "session" in result.data && result.data.session)
        onAuthSettled(attempt, result.data.session as AuthSession);
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
      if (attempt !== undefined) onAuthSettled(attempt);
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
        <section className="auth-story" aria-label="Kinset training journal">
          <img className="auth-photograph" src={`${import.meta.env.BASE_URL}images/editorial/strength.jpg`} alt="" />
          <div className="auth-edition"><span>Personal training journal</span><span>Strength + running</span></div>
          <div className="auth-mast">
            <h1 className="kinset-brand-display">
              <span className="kinset-mast-wordmark" role="img" aria-label="Kinset" style={{ maskImage: `url(${import.meta.env.BASE_URL}kinset-wordmark.svg)`, WebkitMaskImage: `url(${import.meta.env.BASE_URL}kinset-wordmark.svg)` }} />
            </h1>
          </div>
          <div className="auth-areas"><span>Strength</span><span>Running</span><span>Progress</span></div>
        </section>
        <section className="auth-card">
          <p className="entry-eyebrow">{recovery ? "Account recovery" : mode === "signup" ? "Create an account" : "Your training journal"}</p>
          <h2>{recovery ? "New password" : mode === "signup" ? "Join Kinset" : mode === "reset" ? "Reset access" : !supabase ? "Explore Kinset" : "Sign in"}<span className="entry-period">.</span></h2>
          <p className="muted">
            {recovery ? "Choose a new password for your account."
              : mode === "signup" ? "Keep your plan, training history and progress together."
              : mode === "reset" ? "We’ll send a password reset link to your email."
              : !supabase ? "Build a plan, explore movements and log a workout. Your demo journal stays on this device."
              : "Return to your plan, sessions and progress."}
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
                disabled={busy}
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
