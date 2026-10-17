import { useState } from "react";
import {
  CalendarDays,
  ChevronRight,
  Download,
  LogOut,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { Sheet } from "../../ui/Sheet";
import {
  completedSessions,
  completedWorkingSets,
  type Journal,
  type Profile,
} from "../../domain";
import type { SaveState } from "../../data/journal";
import "../../ui/profile-sheet.css";

/**
 * Profile and settings.
 *
 * The old sheet was four identical grey boxes: "Training preferences" and "Sign out"
 * carried the same visual weight, there was no sense of whose account this was, and the
 * one setting people change constantly — units — meant opening the whole onboarding
 * form to flip one word.
 *
 * So: an identity block that actually identifies, honest numbers from the journal,
 * units switchable in place, and the rest grouped by what it does to your data. Leaving
 * is quiet at the bottom and deleting is quieter still, behind its own confirmation,
 * because the drawer you open to change your units is not the place to lose an account
 * to a mis-tap.
 */
export function ProfileSheet({
  profile,
  email,
  owner,
  data,
  state,
  status,
  deleting,
  onClose,
  onProfileChange,
  onEditPreferences,
  onPlans,
  onExport,
  onSignOut,
  onDeleteAccount,
}: {
  profile: Profile;
  email?: string;
  owner: string;
  data: Journal;
  state: SaveState;
  status: string;
  deleting: boolean;
  onClose: () => void;
  onProfileChange: (next: Profile) => void;
  onEditPreferences: () => void;
  onPlans: () => void;
  onExport: () => void;
  onSignOut: () => void;
  onDeleteAccount: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isDemo = owner === "demo";

  const sessions = completedSessions(data);
  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const thisWeek = sessions.filter(
    (s) => Date.parse(s.finishedAt ?? "") >= weekStart.getTime(),
  ).length;
  const sets = completedWorkingSets(data).length;

  return (
    <Sheet title="Profile" onClose={onClose}>
      <header className="ps-identity">
        <span className="ps-avatar" aria-hidden="true">
          {profile.name[0].toUpperCase()}
        </span>
        <div className="ps-who">
          <strong>{profile.name}</strong>
          <span>{email || "Demo account · this device only"}</span>
        </div>
      </header>

      {/* The sync state belongs here, with the account it describes. */}
      <p className="ps-status" data-state={state}>
        <i aria-hidden="true" />
        {status}
      </p>

      <ul className="ps-stats">
        <li>
          <strong className="tabular">{sessions.length}</strong>
          <span>workouts</span>
        </li>
        <li>
          <strong className="tabular">{thisWeek}</strong>
          <span>this week</span>
        </li>
        <li>
          <strong className="tabular">{sets}</strong>
          <span>sets logged</span>
        </li>
      </ul>

      <h3 className="ps-group">Training</h3>

      {/* Switchable in place. Changing it affects new sessions only — everything
          already logged keeps the unit it was recorded in. */}
      <div className="ps-row ps-row-static">
        <span className="ps-row-text">
          <strong>Units</strong>
          <small>New sessions. Past workouts keep the unit you logged them in.</small>
        </span>
        <div className="ps-segmented" role="group" aria-label="Weight units">
          {(["kg", "lb"] as const).map((unit) => (
            <button
              key={unit}
              type="button"
              className={profile.unit === unit ? "selected" : ""}
              aria-pressed={profile.unit === unit}
              onClick={() => onProfileChange({ ...profile, unit })}
            >
              {unit}
            </button>
          ))}
        </div>
      </div>

      <ul className="ps-list">
        <li>
          <button onClick={onEditPreferences}>
            <SlidersHorizontal size={18} aria-hidden="true" />
            <span className="ps-row-text">
              <strong>Training preferences</strong>
              <small>
                {profile.days} days a week · {profile.equipment} · {profile.experience}
              </small>
            </span>
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </li>
        <li>
          <button onClick={onPlans}>
            <CalendarDays size={18} aria-hidden="true" />
            <span className="ps-row-text">
              <strong>Plans</strong>
              <small>Build and choose your routine</small>
            </span>
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </li>
      </ul>

      <h3 className="ps-group">Your data</h3>
      <ul className="ps-list">
        <li>
          <button onClick={onExport}>
            <Download size={18} aria-hidden="true" />
            <span className="ps-row-text">
              <strong>Export your journal</strong>
              <small>Every workout, plan and setting, as JSON</small>
            </span>
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </li>
      </ul>
      <p className="fine ps-note">
        Workouts save to this device first and sync when you are connected. Check the
        status above before switching devices.
      </p>

      <h3 className="ps-group">Account</h3>
      <button className="ps-signout" onClick={onSignOut}>
        <LogOut size={18} aria-hidden="true" />
        {isDemo ? "Leave the demo" : "Sign out"}
      </button>
      <p className="fine ps-note">
        {isDemo
          ? "Your demo journal stays on this device."
          : "Your journal stays synced to your account."}
      </p>

      {!isDemo && (
        <div className="ps-danger">
          {confirmDelete ? (
            <>
              <p>
                <strong>Delete your account?</strong>
              </p>
              <p className="muted">
                This permanently removes your profile and every workout from the cloud.
                It cannot be undone. Export a copy first if you want to keep it.
              </p>
              <button
                className="ps-delete-confirm"
                disabled={deleting}
                onClick={onDeleteAccount}
              >
                {deleting ? "Deleting…" : "Yes, delete everything"}
              </button>
              <button
                className="quiet"
                disabled={deleting}
                onClick={() => setConfirmDelete(false)}
              >
                Keep my account
              </button>
            </>
          ) : (
            <button className="ps-delete" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={16} aria-hidden="true" />
              Delete account
            </button>
          )}
        </div>
      )}
    </Sheet>
  );
}

export default ProfileSheet;
