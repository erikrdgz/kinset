import { useCallback, useEffect, useState } from "react";
import {
  CalendarDays,
  Dumbbell,
  House,
  Layers,
  LineChart,
  LogOut,
  User,
} from "lucide-react";
import { supabase } from "../backend";
import { useJournal } from "../data/journal";
import {
  applyCommand,
  CommandError,
  type Command,
  type Journal as JournalData,
  type Profile,
} from "../domain";
import { useRoute, tabFor, type Route, type TabName } from "./routes";
import { Onboarding } from "./Onboarding";
import { Brand } from "../ui/Brand";
import { Today } from "../features/today/Today";
import { Preview } from "../features/training/Preview";
import { SessionWorkspace } from "../features/training/Session";
import { Summary } from "../features/training/Summary";
import { Library } from "../features/library/Library";
import { Progress } from "../features/progress/Progress";
import { buildSession, nextWorkout, advancePlan } from "../features/training/workout";
import Plans from "../PlanManager";
import { Run } from "../features/running/Run";
import { Sheet } from "../ui/Sheet";

const tabs: Array<{ id: TabName; label: string; icon: typeof House; route: Route }> = [
  { id: "today", label: "Today", icon: House, route: { name: "today" } },
  { id: "train", label: "Train", icon: Dumbbell, route: { name: "train" } },
  { id: "library", label: "Library", icon: Layers, route: { name: "library" } },
  { id: "progress", label: "Progress", icon: LineChart, route: { name: "progress" } },
];

/**
 * The signed-in application shell.
 *
 * Four tabs replace the audited six, settings moves under the profile, and navigation is
 * real history rather than `useState`. An active session takes over the whole screen and
 * hides the tab bar; minimising restores them and leaves a Resume bar behind, so the
 * user is never trapped in a wizard and never loses the session either.
 */
export function Journal({
  owner,
  email,
  onExit,
}: {
  owner: string;
  email?: string;
  onExit: () => Promise<void>;
}) {
  const journal = useJournal(owner);
  const { data, update } = journal;
  const { route, go, replace, back } = useRoute();
  const [editingProfile, setEditingProfile] = useState(false);
  const [notice, setNotice] = useState("");
  const [menu, setMenu] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Each screen starts at the top; the session workspace manages its own scrolling.
  useEffect(() => {
    if (route.name !== "session") window.scrollTo({ top: 0, behavior: "instant" });
  }, [route.name]);

  /** Seed the demo lineup once, so its generated workout is stable between renders. */
  useEffect(() => {
    if (
      owner === "demo" &&
      journal.ready &&
      data.profile &&
      data.demoSeed === undefined
    )
      void update({ ...data, demoSeed: Math.floor(Math.random() * 2 ** 31) });
  }, [owner, journal.ready, data, update]);

  const exit = useCallback(async () => {
    await journal.flush();
    await onExit();
  }, [journal, onExit]);

  /** Run a session command and persist the result. */
  const run = useCallback(
    (command: Command) => {
      if (!data.active) return;
      const next = applyCommand(data.active, command);
      if (next === data.active) return;
      void update({ ...data, active: next });
    },
    [data, update],
  );

  if (!journal.ready)
    return (
      <div className="loading">
        <Brand />
        <p>Opening your journal…</p>
      </div>
    );

  if (journal.state === "updateRequired")
    return (
      <div className="loading">
        <Brand />
        <h1>Kinset needs updating</h1>
        <p className="muted">
          This journal was written by a newer version. Reload to update. Your work is
          safe and has not been changed.
        </p>
        <button className="primary" onClick={() => window.location.reload()}>
          Reload
        </button>
      </div>
    );

  if (journal.state === "quarantined")
    return (
      <div className="loading">
        <Brand />
        <h1>Your journal could not be read</h1>
        <p className="muted">
          A copy has been set aside on this device exactly as it was found. Nothing has
          been deleted or overwritten. Export it before continuing.
        </p>
        <button
          className="primary"
          onClick={() => downloadRaw(journal.quarantine)}
        >
          Export the saved copy
        </button>
        <button className="quiet" onClick={() => void exit()}>
          Sign out
        </button>
      </div>
    );

  if (!data.profile || editingProfile)
    return (
      <Onboarding
        initial={data.profile || undefined}
        onSave={(p) => {
          void update({
            ...data,
            profile: p,
            demoSeed:
              owner === "demo" && !data.profile
                ? Math.floor(Math.random() * 2 ** 31)
                : data.demoSeed,
          });
          setEditingProfile(false);
        }}
        onBack={() => {
          if (data.profile) setEditingProfile(false);
          else void exit();
        }}
      />
    );

  const profile: Profile = data.profile;

  const startWorkout = () => {
    if (data.active) {
      go({ name: "session" });
      return;
    }
    const session = buildSession(profile, nextWorkout(data, profile));
    void update({ ...data, active: session });
    go({ name: "session" });
  };

  const finishSession = () => {
    if (!data.active) return;
    try {
      const finished = applyCommand(data.active, { type: "finish" });
      const id = finished.id;
      // One record, one plan advance, however many times this is retried.
      void update({
        ...data,
        active: null,
        sessions: [finished, ...data.sessions],
        planProgress: advancePlan(data, finished),
      });
      go({ name: "summary", sessionId: id });
    } catch (e) {
      setNotice(
        e instanceof CommandError ? e.message : "That session could not be saved.",
      );
    }
  };

  const discardSession = () => {
    void update({ ...data, active: null });
    go({ name: "today" });
  };

  const activeTab = tabFor(route);
  const inSession = route.name === "session";

  return (
    <div
      className="shell"
      data-session={inSession || undefined}
      data-resume={(data.active && !inSession) || undefined}
    >
      {!inSession && (
        <header className="topbar">
          <Brand />
          <div className="topbar-right">
            {owner !== "demo" && (
              <span className="sync-status" data-state={journal.state}>
                {journal.status}
              </span>
            )}
            <button
              className="avatar"
              aria-label="Profile and settings"
              onClick={() => setMenu(true)}
            >
              {profile.name[0].toUpperCase()}
            </button>
          </div>
        </header>
      )}

      <main className="workspace" aria-label={route.name}>
        {journal.conflict && (
          <section className="notice" role="alert">
            <strong>Another device has newer changes.</strong>
            <p>
              Export this device's copy first, then load the cloud copy. Unsynced
              changes here will be replaced.
            </p>
            <button className="quiet" onClick={() => downloadRaw(data)}>
              Export this copy
            </button>
            <button className="quiet" onClick={() => void journal.loadCloud()}>
              Load cloud copy
            </button>
          </section>
        )}

        {journal.migration && journal.migration.ok && (
          <MigrationNotice report={journal.migration} />
        )}

        {notice && (
          <div className="notice" role="status">
            {notice}
            <button onClick={() => setNotice("")}>Dismiss</button>
          </div>
        )}

        {route.name === "today" && (
          <Today
            journal={data}
            profile={profile}
            go={go}
            onStart={startWorkout}
          />
        )}

        {route.name === "preview" && (
          <Preview
            journal={data}
            profile={profile}
            onStart={startWorkout}
            onBack={back}
          />
        )}

        {route.name === "run" && (
          <Run owner={owner} unit={profile.unit === "kg" ? "km" : "mi"} />
        )}

        {route.name === "train" && (
          <>
            <button className="quiet run-entry" onClick={() => go({ name: "run" })}>
              <span>
                <strong>Go for a run</strong>
                <small>Record a route, or add one by hand</small>
              </span>
            </button>
          <Plans
            data={data}
            update={(next) => void update(next)}
            onPreview={(id) => go({ name: "library", exerciseId: id })}
            onStart={(plan, day) => {
              if (data.active) {
                go({ name: "session" });
                return;
              }
              void update({
                ...data,
                activePlanId: plan.id,
                active: buildSession(profile, {
                  name: day.name,
                  planName: plan.name,
                  planId: plan.id,
                  dayId: day.id,
                  entries: day.entries,
                  unmet: [],
                }),
              });
              go({ name: "session" });
            }}
            />
          </>
        )}

        {route.name === "session" &&
          (data.active ? (
            <SessionWorkspace
              session={data.active}
              journal={data}
              profile={profile}
              run={run}
              onMinimize={() => go({ name: "today" })}
              onFinish={finishSession}
              onDiscard={discardSession}
            />
          ) : (
            <div className="empty-inline">
              <p>
                <strong>No workout in progress.</strong>
              </p>
              <button className="primary" onClick={startWorkout}>
                Start today's workout
              </button>
            </div>
          ))}

        {route.name === "summary" &&
          (() => {
            const session = data.sessions.find((s) => s.id === route.sessionId);
            if (!session)
              return (
                <div className="empty-inline">
                  <p>
                    <strong>That session is no longer here.</strong>
                  </p>
                  <button className="quiet" onClick={() => go({ name: "progress" })}>
                    View history
                  </button>
                </div>
              );
            return (
              <Summary
                session={session}
                journal={data}
                onDone={() => go({ name: "today" })}
                onViewHistory={() => go({ name: "progress" })}
              />
            );
          })()}

        {route.name === "library" && (
          <Library
            query={route.query ?? ""}
            group={route.group ?? "all"}
            exerciseId={route.exerciseId}
            // Typing replaces the history entry, so Back leaves the Library rather
            // than undoing one keystroke at a time.
            onQuery={(q) => replace({ ...route, name: "library", query: q })}
            onGroup={(g) => replace({ ...route, name: "library", group: g })}
            onSelect={(id) => go({ ...route, name: "library", exerciseId: id })}
            onClose={back}
          />
        )}

        {route.name === "progress" && (
          <Progress
            journal={data}
            profile={profile}
            exerciseId={route.exerciseId}
            onSelectExercise={(id) =>
              replace({ name: "progress", exerciseId: id })
            }
            onOpenSession={(id) => go({ name: "summary", sessionId: id })}
          />
        )}
      </main>

      {/* Minimising a session leaves this behind, so it can always be found again. */}
      {data.active && !inSession && (
        <button className="resume-bar" onClick={() => go({ name: "session" })}>
          <span>
            <strong>{data.active.name}</strong>
            <small>Workout in progress</small>
          </span>
          <span className="resume-cta">Resume</span>
        </button>
      )}

      {!inSession && (
        <nav className="tabbar" aria-label="Main">
          {tabs.map(({ id, label, icon: Icon, route: target }) => (
            <button
              key={id}
              className={activeTab === id ? "active" : ""}
              aria-current={activeTab === id ? "page" : undefined}
              onClick={() => go(target)}
            >
              <Icon size={22} aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      )}

      {menu && (
        <Sheet title="Profile" onClose={() => setMenu(false)}>
          <p className="muted">{email || "Demo account · this device only"}</p>
          <ul className="settings-list">
            <li>
              <button
                onClick={() => {
                  setMenu(false);
                  setEditingProfile(true);
                }}
              >
                <User size={18} aria-hidden="true" />
                <span>
                  <strong>Training preferences</strong>
                  <small>
                    {profile.days} days · {profile.equipment} · {profile.unit}
                  </small>
                </span>
              </button>
            </li>
            <li>
              <button
                onClick={() => {
                  setMenu(false);
                  go({ name: "train" });
                }}
              >
                <CalendarDays size={18} aria-hidden="true" />
                <span>
                  <strong>Plans</strong>
                  <small>Build and choose your routine</small>
                </span>
              </button>
            </li>
            <li>
              <button onClick={() => downloadRaw(data)}>
                <Layers size={18} aria-hidden="true" />
                <span>
                  <strong>Export your journal</strong>
                  <small>Everything, as JSON</small>
                </span>
              </button>
            </li>
            <li>
              <button onClick={() => void exit()}>
                <LogOut size={18} aria-hidden="true" />
                <span>
                  <strong>Sign out</strong>
                  <small>
                    {owner === "demo"
                      ? "Your demo journal stays on this device"
                      : "Sign out of this device"}
                  </small>
                </span>
              </button>
            </li>
          </ul>

          {owner !== "demo" && (
            <div className="danger-zone">
              <h3>Delete account</h3>
              <p className="muted">
                Permanently deletes your profile and cloud journal. Export a copy first
                if you want to keep it.
              </p>
              <button
                className="quiet danger"
                disabled={deleting}
                onClick={async () => {
                  if (!supabase) return;
                  if (
                    !window.confirm(
                      "Permanently delete your account and all cloud workouts?",
                    )
                  )
                    return;
                  setDeleting(true);
                  const { error } = await supabase.functions.invoke(
                    "delete-account",
                    { method: "POST" },
                  );
                  if (error) {
                    setNotice(
                      "Account deletion failed. Your data has not been cleared.",
                    );
                    setDeleting(false);
                    return;
                  }
                  await journal.clear();
                  await exit();
                }}
              >
                {deleting ? "Deleting…" : "Delete account"}
              </button>
            </div>
          )}

          <p className="fine">
            Workouts save on this device first and sync when you are connected. Check
            the save status before switching devices.
          </p>
        </Sheet>
      )}
    </div>
  );
}

/** Confirms what a migration did, in counts the user can check against. */
function MigrationNotice({
  report,
}: {
  report: NonNullable<ReturnType<typeof useJournal>["migration"]>;
}) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <section className="notice" role="status">
      <strong>Your journal has been upgraded.</strong>
      <p>
        {report.target.sessions} session
        {report.target.sessions === 1 ? "" : "s"} and {report.target.sets} sets carried
        across unchanged.
        {report.sessionsWithoutPlannedDetail > 0 &&
          ` ${report.sessionsWithoutPlannedDetail} older session${
            report.sessionsWithoutPlannedDetail === 1 ? "" : "s"
          } kept only the sets you completed — earlier versions did not record what was skipped.`}
      </p>
      <button className="quiet" onClick={() => setDismissed(true)}>
        Got it
      </button>
    </section>
  );
}

function downloadRaw(data: unknown) {
  const url = URL.createObjectURL(
    new Blob(
      [JSON.stringify({ exportedAt: new Date().toISOString(), data }, null, 2)],
      { type: "application/json" },
    ),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "kinset-training.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default Journal;
