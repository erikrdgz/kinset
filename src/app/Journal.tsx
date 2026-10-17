import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Dumbbell,
  House,
  Layers,
  LineChart,
  User,
} from "lucide-react";
import { supabase } from "../backend";
import { useJournal } from "../data/journal";
import {
  applyCommand,
  CommandError,
  completedSetCount,
  plannedSetCount,
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
import { ProfileSheet } from "../features/profile/ProfileSheet";
import { BrandArt } from "../ui/BrandArt";
import { useSceneMotion } from "../ui/Motion";

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
  const scene = useRef<HTMLDivElement>(null);
  useSceneMotion(scene, `${route.name}:${journal.ready && !!data.profile}:${editingProfile}`);

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
      data-route={route.name}
      data-session={inSession || undefined}
      data-resume={(data.active && !inSession) || undefined}
    >
      {!inSession && (
        <header className="topbar">
          <button className="topbar-brand" onClick={() => go({ name: "today" })} aria-label="Kinset home"><Brand /></button>
          <span className="topbar-label">TRAINING JOURNAL <i /> {activeTab === "library" ? "MOVEMENT LIBRARY" : activeTab?.toUpperCase()}</span>
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

        <div className="route-stage" key={route.name} ref={scene}>
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
          <div className="train-page">
            <header className="editorial-heading"><div><h1>Train<span className="orange-dot">.</span></h1></div><span className="heading-date">{data.planDraft ? "Plan editor" : `${(data.plans?.length ?? 0) + 1} available routines`}</span></header>
            {!data.planDraft && <div className="train-features">
              <button className="train-feature strength-feature" onClick={() => go({ name: data.active ? "session" : "preview" })}>
                <img src={`${import.meta.env.BASE_URL}images/editorial/lifting.jpg`} alt="" />
                <span className="feature-copy"><small>{data.active ? "WORKOUT IN PROGRESS" : "NEXT STRENGTH SESSION"}</small><strong>{data.active?.name ?? nextWorkout(data, profile).name}</strong><span>{data.active ? "Resume workout" : "View workout"} <ArrowUpRight size={20}/></span></span>
              </button>
              <button className="train-feature run-feature" onClick={() => go({ name: "run" })}>
                <BrandArt seed="running-terrain" density={0.8}/><span className="feature-copy"><small>OUTDOOR ACTIVITIES</small><strong>Run.<br/>Walk. Explore.</strong><span>Record an activity <ArrowUpRight size={20}/></span></span>
              </button>
            </div>}
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
          </div>
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
            onClear={() => replace({ name: "library", group: "all" })}
            onSelect={(id) => go({ ...route, name: "library", exerciseId: id })}
            onClose={back}
          />
        )}

        {route.name === "progress" && (
          <Progress
            journal={data}
            profile={profile}
            onProfileChange={(profile) => void update({ ...data, profile })}
            exerciseId={route.exerciseId}
            onSelectExercise={(id) =>
              replace({ name: "progress", exerciseId: id })
            }
            onOpenSession={(id) => go({ name: "summary", sessionId: id })}
          />
        )}
        </div>
      </main>

      {/* Minimising a session leaves this behind, so it can always be found again. */}
      {data.active && !inSession && (
        <button className="resume-bar" onClick={() => go({ name: "session" })}>
          <svg className="resume-progress" viewBox="0 0 40 40" aria-hidden="true"><circle className="resume-progress-track" cx="20" cy="20" r="16"/><circle className="resume-progress-fill" cx="20" cy="20" r="16" pathLength="100" strokeDasharray={`${Math.min(100, completedSetCount(data.active) / Math.max(1, plannedSetCount(data.active)) * 100)} 100`}/></svg>
          <span className="resume-copy">
            <strong>{data.active.name}</strong>
            <small>{completedSetCount(data.active)} of {plannedSetCount(data.active)} sets logged</small>
          </span>
          <span className="resume-cta">Resume <ArrowUpRight size={19} aria-hidden="true"/></span>
        </button>
      )}

      {!inSession && (
        <nav className="tabbar" aria-label="Main" data-active={activeTab ?? "today"}>
          <div className="nav-brand"><Brand /></div>

          <div className="tabbar-items">
          <i className="tab-indicator" aria-hidden="true"/>
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
          </div>
          <button className="nav-profile" onClick={()=>setMenu(true)}><User size={18}/><span>Profile & settings</span></button>
        </nav>
      )}

      {menu && (
        <ProfileSheet
          profile={profile}
          email={email}
          owner={owner}
          data={data}
          state={journal.state}
          status={journal.status}
          deleting={deleting}
          onClose={() => setMenu(false)}
          onProfileChange={(next) => void update({ ...data, profile: next })}
          onDeleteAccount={async () => {
            if (!supabase) return;
            setDeleting(true);
            const { error } = await supabase.functions.invoke("delete-account", {
              method: "POST",
            });
            if (error) {
              setNotice("Account deletion failed. Your data has not been cleared.");
              setDeleting(false);
              return;
            }
            await journal.clear();
            await exit();
          }}
          onSignOut={() => void exit()}
        />
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
