import { Select } from "./Select";
import {
  Component,
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import type { Session as AuthSession } from "@supabase/supabase-js";
import {
  ArrowUpRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Flame,
  History,
  House,
  Layers,
  CalendarDays,
  LogOut,
  Plus,
  Settings,
  Timer,
  Trash2,
  WifiOff,
  X,
} from "lucide-react";
import { supabase } from "./backend";
import {
  completedSets,
  exercises,
  finishSession,
  profileSchema,
  program,
  startSession,
  validSet,
  type Muscle,
  type Profile,
  type Session,
  type State,
} from "./domain";
import { useJournal } from "./storage";
import Plans from "./PlanManager";
import { nextWorkout, startWorkout, advancePlan, targetReps } from "./plans";
import ExerciseInstructions from "./ExerciseInstructions";
const ExerciseDemo = lazy(() => import("./ExerciseDemo"));
import { demoIds } from "./motion/catalog";
const Body = lazy(() => import("./Body"));
const demoProfile: Profile = {
  name: "Alex",
  goal: "Build consistency",
  days: 3,
  equipment: "Dumbbells",
  experience: "Returning",
  unit: "kg",
  weight: "",
  height: "",
};
// Password reset needs outgoing email (SMTP). Enable once it is configured.
const PASSWORD_RESET_ENABLED = false;

function download(data: State) {
  const url = URL.createObjectURL(
    new Blob(
      [
        JSON.stringify(
          { version: 1, exportedAt: new Date().toISOString(), ...data },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    ),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "kinset-training.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Modal({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal-backdrop"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {children}
    </dialog>
  );
}
function Plate({ done, total }: { done: number; total: number }) {
  const n = Math.max(total, 1);
  const gap = 5;
  const span = 360 / n - gap;
  const pt = (deg: number, r: number) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return `${60 + r * Math.cos(a)} ${60 + r * Math.sin(a)}`;
  };
  return (
    <div
      className="plate"
      role="progressbar"
      aria-label="Sessions this week"
      aria-valuenow={done}
      aria-valuemin={0}
      aria-valuemax={Math.max(done, total)}
    >
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle className="plate-rim" cx="60" cy="60" r="57" />
        {Array.from({ length: n }, (_, i) => {
          const a0 = i * (360 / n) + gap / 2;
          const a1 = a0 + span;
          return (
            <path
              key={i}
              className={i < done ? "plate-seg on" : "plate-seg"}
              d={`M ${pt(a0, 44)} A 44 44 0 ${span > 180 ? 1 : 0} 1 ${pt(a1, 44)}`}
            />
          );
        })}
        <circle className="plate-hole" cx="60" cy="60" r="21" />
      </svg>
      <b>
        {done}
        <i>/{total}</i>
      </b>
    </div>
  );
}

function Brand() {
  return (
    <span className="brand">
      <img className="brand-wordmark" src={`${import.meta.env.BASE_URL}kinset-wordmark.svg`} alt="Kinset" width="980" height="270" />
    </span>
  );
}
class BodyBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <p className="muted">
        Body preview unavailable. Muscle groups are listed below.
      </p>
    ) : (
      this.props.children
    );
  }
}
function BodyPreview({ muscles }: { muscles: Muscle[] }) {
  return (
    <BodyBoundary>
      <Suspense
        fallback={<div className="body-loading">Loading body preview…</div>}
      >
        <Body muscles={muscles} />
      </Suspense>
    </BodyBoundary>
  );
}
export default function App() {
  const [session, setSession] = useState<AuthSession | null>(null),
    [demo, setDemo] = useState(false),
    [loading, setLoading] = useState(!!supabase),
    [recover, setRecover] = useState(false);
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
        onDemo={() => setDemo(true)}
      />
    );
  if (!session && !demo) return <Auth onDemo={() => setDemo(true)} />;
  return (
    <Journal
      key={session?.user.id || "demo"}
      owner={session?.user.id || "demo"}
      email={session?.user.email}
      onExit={async () => {
        if (session) await supabase?.auth.signOut();
        setDemo(false);
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
function Onboarding({
  initial,
  onSave,
  onBack,
}: {
  initial?: Profile;
  onSave: (p: Profile) => void;
  onBack: () => void;
}) {
  const [p, setP] = useState<Profile>(
      initial || { ...demoProfile, name: "", experience: "New to training" },
    ),
    [error, setError] = useState("");
  const field = <K extends keyof Profile>(k: K, v: Profile[K]) =>
    setP({ ...p, [k]: v });
  function submit(e: FormEvent) {
    e.preventDefault();
    const result = profileSchema.safeParse(p);
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }
    onSave(result.data);
  }
  return (
    <main className="onboarding page-enter">
      <button className="text-button" onClick={onBack}>
        <ChevronLeft size={18} />
        Back
      </button>
      <Brand />
      <h1>{initial ? "Make it yours." : "Start where you are."}</h1>
      <p className="muted">
        A few details help us choose your starting routine. You can change these
        anytime.
      </p>
      <form onSubmit={submit}>
        <label>
          What should we call you?
          <input
            required
            maxLength={40}
            autoComplete="given-name"
            value={p.name}
            onChange={(e) => field("name", e.target.value)}
            placeholder="Your first name"
          />
        </label>
        <label>
          Your main goal
          <Select
            label="Your main goal"
            value={p.goal}
            onValueChange={(value) => field("goal", value as Profile["goal"])}
            options={[
              "Build consistency",
              "Build strength",
              "Support getting leaner",
            ]}
          />
        </label>
        <div className="form-grid">
          <label>
            Sessions per week
            <Select
              label="Sessions per week"
              value={String(p.days)}
              onValueChange={(value) => field("days", Number(value))}
              options={[2, 3, 4].map((value) => ({
                value: String(value),
                label: `${value} days`,
              }))}
            />
          </label>
          <label>
            Training experience
            <Select
              label="Training experience"
              value={p.experience}
              onValueChange={(value) =>
                field("experience", value as Profile["experience"])
              }
              options={["New to training", "Returning", "Consistent"]}
            />
          </label>
        </div>
        <label>
          Available equipment
          <Select
            label="Available equipment"
            value={p.equipment}
            onValueChange={(value) =>
              field("equipment", value as Profile["equipment"])
            }
            options={["Dumbbells", "Full gym", "Bodyweight"]}
          />
        </label>
        <label>
          Weight units
          <Select
            label="Weight units"
            value={p.unit}
            onValueChange={(value) => field("unit", value as Profile["unit"])}
            options={[
              { value: "kg", label: "Kilograms (kg)" },
              { value: "lb", label: "Pounds (lb)" },
            ]}
          />
        </label>
        <details>
          <summary>Body measurements · optional</summary>
          <p className="fine">
            For your profile only. These don’t determine your routine or change
            the body illustration.
          </p>
          <div className="form-grid">
            <label>
              Weight ({p.unit})
              <input
                type="number"
                min="1"
                max="1500"
                step="0.1"
                value={p.weight}
                onChange={(e) =>
                  field(
                    "weight",
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
              />
            </label>
            <label>
              Height (cm)
              <input
                type="number"
                min="1"
                max="300"
                step="0.1"
                value={p.height}
                onChange={(e) =>
                  field(
                    "height",
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
              />
            </label>
          </div>
        </details>
        <p className="fine">
          Kinset offers general fitness templates. Pick comfortable movements
          and loads; it does not assess injuries or prescribe treatment.
        </p>
        <p role="alert">{error}</p>
        <button className="primary">
          {initial ? "Save preferences" : "Build my starting routine"}
          <ArrowUpRight size={18} />
        </button>
      </form>
    </main>
  );
}
function Journal({
  owner,
  email,
  onExit,
}: {
  owner: string;
  email?: string;
  onExit: () => Promise<void>;
}) {
  const journal = useJournal(owner),
    { data, update } = journal;
  const [tab, setTab] = useState("Today"),
    [editing, setEditing] = useState(false),
    [selected, setSelected] = useState<string | null>(null),
    [showAnatomy, setShowAnatomy] = useState(false),
    [notice, setNotice] = useState(""),
    [muscle, setMuscle] = useState<Muscle | "All">("All"),
    [query, setQuery] = useState(""),
    [demosOnly, setDemosOnly] = useState(false),
    [restUntil, setRestUntil] = useState<number | null>(null),
    [now, setNow] = useState(Date.now()),
    [confirmDelete, setConfirmDelete] = useState(false),
    [confirmDiscard, setConfirmDiscard] = useState(false),
    [deleting, setDeleting] = useState(false);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [tab, editing, journal.ready]);
  useEffect(() => {
    if (!restUntil) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [restUntil]);
  useEffect(() => {
    setShowAnatomy(false);
  }, [selected]);
  useEffect(() => {
    if (
      owner === "demo" &&
      journal.ready &&
      data.profile &&
      data.demoSeed === undefined
    )
      update({ ...data, demoSeed: Math.floor(Math.random() * 2 ** 31) });
  }, [owner, journal.ready, data, update]);
  if (!journal.ready)
    return (
      <div className="loading">
        <Brand />
        <p>Opening your journal…</p>
      </div>
    );
  const exit = async () => {
    await journal.flush();
    await onExit();
  };
  if (!data.profile || editing)
    return (
      <Onboarding
        initial={data.profile || undefined}
        onSave={(p) => {
          update({
            ...data,
            profile: p,
            demoSeed:
              owner === "demo" && !data.profile
                ? Math.floor(Math.random() * 2 ** 31)
                : data.demoSeed,
          });
          setEditing(false);
        }}
        onBack={() => {
          if (data.profile) setEditing(false);
          else void exit();
        }}
      />
    );
  const p = data.profile;
  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const week = data.sessions.filter(
      (s) => new Date(s.finishedAt!) >= weekStart,
    ),
    count = week.length;
  const preview = selected ? exercises.find((e) => e.id === selected) : null;
  const upcoming = nextWorkout(data);
  const activePlan = data.plans?.find((plan) => plan.id === data.activePlanId);
  const plannedEntries = data.active
    ? data.active.entries.map((e) => ({
        exerciseId: e.exerciseId,
        sets: e.sets.length,
        reps:
          e.targetReps || exercises.find((x) => x.id === e.exerciseId)!.reps,
      }))
    : upcoming.entries.map((e) => ({
        ...e,
        reps:
          targetReps(e) +
          (exercises.find((x) => x.id === e.exerciseId)!.reps.includes("/ side")
            ? " / side"
            : ""),
      }));
  const plan = plannedEntries.map((e) =>
    exercises.find((x) => x.id === e.exerciseId)!,
  );
  const start = () => {
    if (!data.active) update({ ...data, active: startWorkout(p, upcoming) });
    setTab("Train");
  };
  const changeSession = (s: Session) => update({ ...data, active: s });
  const finish = () => {
    try {
      const finished = finishSession(data.active!);
      update({
        ...data,
        active: null,
        sessions: [finished, ...data.sessions],
        planProgress: advancePlan(data, finished),
      });
      setTab("History");
      setNotice("Session saved.");
      setRestUntil(null);
    } catch (e) {
      setNotice((e as Error).message);
    }
  };
  async function deleteAccount() {
    if (!supabase) return;
    setDeleting(true);
    const { error } = await supabase.functions.invoke("delete-account", {
      method: "POST",
    });
    if (error) {
      setNotice(
        "Account deletion failed. Your data has not been cleared. Please try again.",
      );
      setDeleting(false);
      return;
    }
    await journal.clear();
    await exit();
  }
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <nav>
          {[
            ["Today", House],
            ["Train", Dumbbell],
            ["Explore", Layers],
            ["Plans", CalendarDays],
            ["History", History],
            ["Settings", Settings],
          ].map(([name, Icon]) => {
            const I = Icon as typeof House;
            return (
              <button
                key={name as string}
                className={tab === name ? "nav-item active" : "nav-item"}
                onClick={() => setTab(name as string)}
              >
                <I size={20} />
                {name as string}
                {tab === name && <span className="nav-indicator" />}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="avatar">{p.name[0].toUpperCase()}</div>
          <div>
            <strong>{p.name}</strong>
          </div>
          <button aria-label="Sign out" onClick={() => void exit()}>
            <LogOut size={18} />
          </button>
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <div className="mobile-brand">
            <Brand />
          </div>
          {owner !== "demo" && <div className="sync-status">
            <span
              className={journal.status === "Synced" ? "synced" : "local"}
            />
            {journal.status}
          </div>}
        </header>
        <main key={tab} className="workspace page-enter" aria-label={tab}>
          {journal.conflict && (
            <section className="notice" role="alert">
              <strong>Another device has newer changes.</strong>
              <p>
                Export this device’s copy first, then load the cloud copy to
                continue. Unsynced changes here will be replaced.
              </p>
              <button className="secondary" onClick={() => download(data)}>
                Export this copy
              </button>
              <button
                className="secondary"
                onClick={() => void journal.loadCloud()}
              >
                Load cloud copy
              </button>
            </section>
          )}
          {notice && (
            <div className="notice" role="status">
              {notice}
              <button
                aria-label="Dismiss notification"
                onClick={() => setNotice("")}
              >
                <X size={18} />
              </button>
            </div>
          )}
          {tab === "Today" && (
            <div className="training-home">
              <div className="session-date">
                <span>
                  {new Date().toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                <button onClick={() => setEditing(true)}>
                  {p.name} <Settings size={15} />
                </button>
              </div>
              <div className="training-week">
                <Plate done={count} total={p.days} />
                <strong>This week</strong>
              </div>
              <section className="next-session">
                <div className="session-poster">
                  <div className="session-kicker">
                    <span>{data.active ? "IN PROGRESS" : "UP NEXT"}</span>
                    <span>
                      SESSION{" "}
                      {String(data.sessions.length + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h1>
                    {data.active?.name || upcoming.name}
                    <span className="blue-period">.</span>
                  </h1>
                  <div className="session-facts">
                    <span>{plan.length} movements</span>
                    <span>
                      {plannedEntries.reduce((n, e) => n + e.sets, 0)} sets
                    </span>
                  </div>
                  <button className="primary session-start" onClick={start}>
                    {data.active ? "Resume session" : "Start session"}
                    <ArrowUpRight size={20} />
                  </button>
                </div>
                <div className="movement-section-heading">
                  <h2>The lineup</h2>
                </div>
                <div className="movement-table">
                  {plan.map((e, i) => (
                    <button key={e.id} onClick={() => setSelected(e.id)}>
                      <span className="movement-number">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="movement-name">
                        <strong>{e.name}</strong>
                        <small>
                          {e.muscle}
                          {demoIds.has(e.id) && (
                            <span className="watch-demo-label"> ▶</span>
                          )}
                        </small>
                      </span>
                      <span className="set-pips" aria-hidden="true">
                        {Array.from({ length: plannedEntries[i].sets }, (_, k) => (
                          <i key={k} />
                        ))}
                      </span>
                      <span className="movement-prescription">
                        {plannedEntries[i].sets}
                        <span> × </span>
                        {plannedEntries[i].reps}
                      </span>
                      <ChevronRight size={16} />
                    </button>
                  ))}
                </div>
              </section>
              <button
                className="demo-discovery"
                onClick={() => {
                  setDemosOnly(true);
                  setMuscle("All");
                  setQuery("");
                  setTab("Explore");
                }}
              >
                <span>
                  <strong>Watch exercise demos</strong>
                </span>
                <ChevronRight size={20} />
              </button>
              <div className="routine-foot">
                <span>
                  <strong>{activePlan ? activePlan.name : p.goal}</strong>
                </span>
                <button className="text-button" onClick={() => setTab("Plans")}>
                  Manage plans
                  <ChevronRight size={15} />
                </button>
              </div>
              {data.sessions[0] && (
                <section className="recent-line">
                  <span className="eyebrow">LAST SESSION</span>
                  <button onClick={() => setTab("History")}>
                    <strong>{data.sessions[0].name}</strong>
                    <span>
                      {completedSets(data.sessions[0])} sets ·{" "}
                      {new Date(
                        data.sessions[0].finishedAt!,
                      ).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <ChevronRight size={16} />
                  </button>
                </section>
              )}
            </div>
          )}
          {tab === "Plans" && (
            <Plans
              data={data}
              update={update}
              onPreview={setSelected}
              onStart={(plan, day) => {
                if (data.active) {
                  setTab("Train");
                  return;
                }
                update({
                  ...data,
                  activePlanId: plan.id,
                  active: startWorkout(p, {
                    name: day.name,
                    planName: plan.name,
                    planId: plan.id,
                    dayId: day.id,
                    entries: day.entries,
                  }),
                });
                setTab("Train");
              }}
            />
          )}
          {tab === "Train" && (
            <>
              <div className="page-heading">
                <div>
                  <h1>{data.active?.name || "Training"}</h1>
                  <p className="muted">
                    {data.active
                      ? "Log the weight and reps you actually complete."
                      : "Your next session is ready. Start with a comfortable load."}
                  </p>
                </div>
              </div>
              {!data.active ? (
                <section className="empty-card">
                  <Dumbbell size={38} />
                  <h2>Your next step starts here.</h2>
                  <p>{plan.map((e) => e.name).join(" · ")}</p>
                  <button className="primary" onClick={start}>
                    Start workout
                    <ArrowUpRight size={18} />
                  </button>
                </section>
              ) : (
                <>
                  <div className="workout-toolbar">
                    <span>
                      <strong>{completedSets(data.active)}</strong> sets
                      completed
                    </span>
                    {restUntil && restUntil > now ? (
                      <button onClick={() => setRestUntil(null)}>
                        <Timer size={18} />
                        Rest {Math.ceil((restUntil - now) / 1000)}s · Skip
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setNow(Date.now());
                          setRestUntil(Date.now() + 90000);
                        }}
                      >
                        <Timer size={18} />
                        90s rest timer
                      </button>
                    )}
                  </div>
                  {data.active.entries.map((entry, ei) => {
                    const exercise = exercises.find(
                      (e) => e.id === entry.exerciseId,
                    )!;
                    const previous = data.sessions
                      .find(
                        (s) =>
                          s.unit === data.active!.unit &&
                          s.entries.some(
                            (x) => x.exerciseId === entry.exerciseId,
                          ),
                      )
                      ?.entries.find((x) => x.exerciseId === entry.exerciseId);
                    return (
                      <section className="log-card" key={entry.exerciseId}>
                        <div className="log-heading">
                          <div>
                            <span className="eyebrow">
                              {exercise.muscle} · TARGET{" "}
                              {entry.targetReps || exercise.reps} REPS
                            </span>
                            <h2>{exercise.name}</h2>
                          </div>
                          <button
                            className="icon-button"
                            aria-label={`Movement guide for ${exercise.name}`}
                            onClick={() => setSelected(exercise.id)}
                          >
                            <span className="howto-label">How to</span>
                          </button>
                        </div>
                        <div className="set-row set-labels">
                          <span>SET</span>
                          <span>PREVIOUS</span>
                          <span>{data.active!.unit.toUpperCase()}</span>
                          <span>REPS</span>
                          <span>DONE</span>
                        </div>
                        {entry.sets.map((s, si) => {
                          const edit = (patch: Partial<typeof s>) =>
                            changeSession({
                              ...data.active!,
                              entries: data.active!.entries.map((en, i) =>
                                i === ei
                                  ? {
                                      ...en,
                                      sets: en.sets.map((set, j) =>
                                        j === si ? { ...set, ...patch } : set,
                                      ),
                                    }
                                  : en,
                              ),
                            });
                          return (
                            <div
                              className={`set-row ${s.done ? "set-done" : ""}`}
                              key={s.id}
                            >
                              <strong>{si + 1}</strong>
                              <span className="previous">
                                {previous?.sets[si]
                                  ? `${previous.sets[si].weight} × ${previous.sets[si].reps}`
                                  : "—"}
                              </span>
                              <input
                                aria-label={`${exercise.name} set ${si + 1} weight in ${data.active!.unit}`}
                                type="number"
                                inputMode="decimal"
                                min="0"
                                max="2000"
                                step="0.5"
                                value={s.weight || ""}
                                placeholder="0"
                                disabled={s.done}
                                onChange={(e) =>
                                  edit({ weight: Number(e.target.value) })
                                }
                              />
                              <input
                                aria-label={`${exercise.name} set ${si + 1} reps`}
                                type="number"
                                inputMode="numeric"
                                min="1"
                                step="1"
                                value={s.reps || ""}
                                placeholder="0"
                                disabled={s.done}
                                onChange={(e) =>
                                  edit({ reps: Number(e.target.value) })
                                }
                              />
                              <button
                                className={`check-button ${s.done ? "checked" : ""}`}
                                aria-label={`${s.done ? "Unmark" : "Complete"} ${exercise.name} set ${si + 1}`}
                                aria-pressed={s.done}
                                onClick={() => {
                                  if (!s.done && !validSet(s)) {
                                    setNotice(
                                      "Enter a positive whole-number rep count and a weight from 0–2000. Use 0 for bodyweight.",
                                    );
                                    return;
                                  }
                                  edit({ done: !s.done });
                                  if (!s.done) {
                                    setNow(Date.now());
                                    setRestUntil(Date.now() + 90000);
                                  }
                                }}
                              >
                                <Check size={20} />
                              </button>
                            </div>
                          );
                        })}
                        <button
                          className="add-set"
                          onClick={() =>
                            changeSession({
                              ...data.active!,
                              entries: data.active!.entries.map((e, i) =>
                                i === ei
                                  ? {
                                      ...e,
                                      sets: [
                                        ...e.sets,
                                        {
                                          id: crypto.randomUUID(),
                                          weight: 0,
                                          reps: 0,
                                          done: false,
                                        },
                                      ],
                                    }
                                  : e,
                              ),
                            })
                          }
                        >
                          <Plus size={17} />
                          Add set
                        </button>
                      </section>
                    );
                  })}
                  <div className="finish-actions">
                    <button className="primary" onClick={finish}>
                      Finish workout
                      <Check size={19} />
                    </button>
                    <button
                      className="text-button"
                      onClick={() => setConfirmDiscard(true)}
                    >
                      Discard workout
                    </button>
                  </div>
                </>
              )}
            </>
          )}
          {tab === "Explore" && (
            <>
              <div className="page-heading">
                <div>
                  <h1>Movement library</h1>
                  <p className="muted">Find an exercise. See where it fits.</p>
                </div>
              </div>
              <div className="explore-layout">
                <section className="anatomy-panel">
                  <BodyPreview muscles={muscle === "All" ? [] : [muscle]} />
                  <h3>{muscle === "All" ? "A body built to move." : muscle}</h3>
                </section>
                <section className="exercise-browser">
                  <input
                    className="search"
                    aria-label="Search exercises"
                    placeholder="Find an exercise…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  <button
                    className="demo-filter"
                    aria-pressed={demosOnly}
                    onClick={() => {
                      setDemosOnly(!demosOnly);
                      setMuscle("All");
                      setQuery("");
                    }}
                  >
                    {demosOnly ? "Showing 3D demos" : "Show 3D demos"}
                    <span>{demoIds.size} exercises</span>
                  </button>
                  {demosOnly && (
                    <p className="fine">
                      Open an exercise to watch its movement. Use Overview or
                      Side to change the view, or pause and slow it down.
                    </p>
                  )}
                  <div className="filters">
                    {(
                      [
                        "All",
                        "Chest",
                        "Back",
                        "Shoulders",
                        "Arms",
                        "Core",
                        "Legs",
                      ] as const
                    ).map((m) => (
                      <button
                        key={m}
                        className={muscle === m ? "selected" : ""}
                        onClick={() => setMuscle(m)}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                  <div className="exercise-list" role="region" aria-label="Exercises" tabIndex={0}>
                    {exercises
                      .filter(
                        (e) =>
                          (!demosOnly || demoIds.has(e.id)) &&
                          (muscle === "All" || e.muscle === muscle) &&
                          e.name.toLowerCase().includes(query.toLowerCase()),
                      )
                      .map((e) => (
                        <button key={e.id} onClick={() => setSelected(e.id)}>
                          <span className="list-icon">
                            <Dumbbell size={20} />
                          </span>
                          <span>
                            <strong>{e.name}</strong>
                            <small>
                              {e.muscle} · {e.equipment}
                            </small>
                            <span className="watch-demo-label">
                              {demoIds.has(e.id)
                                ? "▶ Watch demo · Read guide"
                                : "Read movement guide"}
                            </span>
                          </span>
                          <ChevronRight size={18} />
                        </button>
                      ))}
                    {!exercises.some(
                      (e) =>
                        (!demosOnly || demoIds.has(e.id)) &&
                        (muscle === "All" || e.muscle === muscle) &&
                        e.name.toLowerCase().includes(query.toLowerCase()),
                    ) && <p>No matching exercises. Try another search.</p>}
                  </div>
                </section>
              </div>
            </>
          )}
          {tab === "History" && (
            <>
              <div className="page-heading">
                <div>
                  <h1>History</h1>
                  <p className="muted">
                    {data.sessions.length} sessions ·{" "}
                    {data.sessions.reduce((n, s) => n + completedSets(s), 0)}{" "}
                    completed sets
                  </p>
                </div>
              </div>
              {!data.sessions.length ? (
                <section className="empty-card">
                  <History size={36} />
                  <h2>A fresh page.</h2>
                  <p>Your completed workouts will appear here.</p>
                  <button className="primary" onClick={start}>
                    Start your first workout
                  </button>
                </section>
              ) : (
                data.sessions.map((s) => (
                  <details className="history-card" key={s.id}>
                    <summary>
                      <span className="history-icon">
                        <Check size={22} />
                      </span>
                      <span>
                        <strong>{s.name}</strong>
                        <small>
                          {new Date(s.finishedAt!).toLocaleDateString(
                            undefined,
                            { month: "long", day: "numeric", year: "numeric" },
                          )}
                        </small>
                      </span>
                      <span>{completedSets(s)} sets</span>
                      <ChevronRight size={18} />
                    </summary>
                    <div className="history-details">
                      {s.entries.map((e) => (
                        <div key={e.exerciseId}>
                          <strong>
                            {exercises.find((x) => x.id === e.exerciseId)?.name}
                          </strong>
                          <table className="history-sets">
                            <caption className="sr-only">
                              Recorded sets for{" "}
                              {
                                exercises.find((x) => x.id === e.exerciseId)
                                  ?.name
                              }
                            </caption>
                            <thead>
                              <tr>
                                <th scope="col">Set</th>
                                <th scope="col">Weight</th>
                                <th scope="col">Reps</th>
                                <th scope="col">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {e.sets.map((set, index) => (
                                <tr
                                  key={set.id}
                                  className={set.done ? "recorded" : "unlogged"}
                                >
                                  <th scope="row">
                                    {String(index + 1).padStart(2, "0")}
                                  </th>
                                  <td>
                                    {set.done ? `${set.weight} ${s.unit}` : "—"}
                                  </td>
                                  <td>{set.done ? set.reps : "—"}</td>
                                  <td>
                                    {set.done ? (
                                      <span className="history-set-status">
                                        <Check size={14} aria-hidden="true" />{" "}
                                        Done
                                      </span>
                                    ) : (
                                      "Not logged"
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ))}
                      <button
                        className="text-button danger"
                        onClick={() => {
                          if (window.confirm("Delete this completed workout?"))
                            update({
                              ...data,
                              sessions: data.sessions.filter(
                                (x) => x.id !== s.id,
                              ),
                            });
                        }}
                      >
                        <Trash2 size={16} />
                        Delete workout
                      </button>
                    </div>
                  </details>
                ))
              )}
            </>
          )}
          {tab === "Settings" && (
            <>
              <div className="page-heading">
                <div>
                  <h1>Your account</h1>
                </div>
              </div>
              <section className="settings-card">
                <h2>{p.name}</h2>
                <p className="muted">
                  {email || "Demo account · this device only"}
                </p>
                <div className="setting-row">
                  <span>
                    Training preferences
                    <small>
                      {p.days} days · {p.equipment} · {p.unit}
                    </small>
                  </span>
                  <button
                    className="secondary"
                    onClick={() => setEditing(true)}
                  >
                    Edit
                  </button>
                </div>
                <div className="setting-row">
                  <span>
                    Your journal
                    <small>
                      Download your profile and all workouts as JSON.
                    </small>
                  </span>
                  <button className="secondary" onClick={() => download(data)}>
                    Export data
                  </button>
                </div>
                <div className="setting-row">
                  <span>
                    Account
                    <small>
                      {owner === "demo"
                        ? "Leave the demo; your demo journal stays on this device."
                        : "Sign out of this device."}
                    </small>
                  </span>
                  <button className="secondary" onClick={() => void exit()}>
                    Sign out
                  </button>
                </div>
                {owner !== "demo" && (
                  <div className="setting-row">
                    <span>
                      Delete account
                      <small>
                        Permanently delete your account and cloud journal.
                      </small>
                    </span>
                    <button
                      className="secondary danger"
                      onClick={() => setConfirmDelete(true)}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </section>
              <section className="plan-note">
                <WifiOff size={24} />
                <div>
                  <h3>Your session travels with you.</h3>
                  <p>
                    Workouts save on this device first. Signed-in accounts sync
                    when connected. Keep an eye on the save status before
                    changing devices. This preview does not yet support
                    reopening the app offline.
                  </p>
                </div>
              </section>
            </>
          )}
        </main>
        <footer className="app-footer">
          <Brand />
          <span className="made-by">
            Made to make you healthy. By Erik Rodriguez.
          </span>
          <a
            className="model-credit"
            href={import.meta.env.BASE_URL + "models/ATTRIBUTION.md"}
            target="_blank"
            rel="noreferrer"
          >
            3D anatomy credits
          </a>
        </footer>
      </div>
      <nav className="bottom-nav" aria-label="Main navigation">
        {[
          ["Today", House],
          ["Train", Dumbbell],
          ["Explore", Layers],
          ["Plans", CalendarDays],
          ["History", History],
          ["Settings", Settings],
        ].map(([name, Icon]) => {
          const I = Icon as typeof House;
          return (
            <button
              key={name as string}
              className={tab === name ? "active" : ""}
              onClick={() => setTab(name as string)}
            >
              <I size={22} />
              <span>{name as string}</span>
            </button>
          );
        })}
      </nav>
      {preview && (
        <Modal onClose={() => setSelected(null)}>
          <section
            className="exercise-modal"
            role="dialog"
            aria-modal="true"
            aria-label={preview.name}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              autoFocus
              aria-label="Close exercise details"
              onClick={() => setSelected(null)}
            >
              <X />
            </button>
            <span className="eyebrow">
              {preview.muscle} · {preview.equipment}
            </span>
            <h2>{preview.name}</h2>
            <div
              className="detail-tabs"
              role="group"
              aria-label="Exercise visualization"
            >
              <button
                aria-pressed={!showAnatomy}
                onClick={() => setShowAnatomy(false)}
              >
                {demoIds.has(preview.id) ? "Movement" : "Written guide"}
              </button>
              <button
                aria-pressed={showAnatomy}
                onClick={() => setShowAnatomy(true)}
              >
                Muscles
              </button>
            </div>
            {demoIds.has(preview.id) && !showAnatomy ? (
              <BodyBoundary>
                <Suspense
                  fallback={
                    <div className="body-loading">Loading demonstration…</div>
                  }
                >
                  <ExerciseDemo key={preview.id} exercise={preview} />
                </Suspense>
              </BodyBoundary>
            ) : showAnatomy ? (
              <BodyPreview muscles={[preview.muscle]} />
            ) : null}
            <p>{preview.cue}</p>
            <ExerciseInstructions exercise={preview} />
            <p className="fine">
              Anatomy highlights selected muscles; movement previews illustrate
              the exercise. Choose a comfortable range and stop if a movement
              causes pain.
            </p>
            {showAnatomy && (
              <p className="model-credit">
                Z-Anatomy / BodyParts3D ·{" "}
                <a
                  href={import.meta.env.BASE_URL + "models/ATTRIBUTION.md"}
                  target="_blank"
                  rel="noreferrer"
                >
                  3D anatomy credits · CC BY-SA
                </a>
              </p>
            )}
            <button className="primary" onClick={() => setSelected(null)}>
              Got it
              <Check size={18} />
            </button>
          </section>
        </Modal>
      )}
      {confirmDiscard && (
        <Modal onClose={() => setConfirmDiscard(false)}>
          <section
            className="exercise-modal"
            role="alertdialog"
            aria-modal="true"
            aria-label="Discard active workout"
          >
            <h2>Discard this session?</h2>
            <p>
              Your plan and completed workout history will stay saved. This
              session’s unfinished log will be removed.
            </p>
            <button
              className="primary"
              onClick={() => {
                update({ ...data, active: null });
                setRestUntil(null);
                setConfirmDiscard(false);
              }}
            >
              Discard session
            </button>
            <button
              className="text-button"
              onClick={() => setConfirmDiscard(false)}
            >
              Keep training
            </button>
          </section>
        </Modal>
      )}
      {confirmDelete && (
        <Modal onClose={() => setConfirmDelete(false)}>
          <section
            className="exercise-modal"
            role="alertdialog"
            aria-modal="true"
            aria-label="Delete your account"
          >
            <h2>Delete your account?</h2>
            <p>
              This permanently deletes your profile and all cloud workouts.
              Export a copy first if you want to keep them.
            </p>
            <button
              className="secondary"
              autoFocus
              onClick={() => setConfirmDelete(false)}
            >
              Keep account
            </button>
            <button
              className="primary destructive"
              disabled={deleting}
              onClick={() => void deleteAccount()}
            >
              {deleting ? "Deleting…" : "Permanently delete account"}
            </button>
          </section>
        </Modal>
      )}
    </div>
  );
}
