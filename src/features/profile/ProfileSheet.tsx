import { ChevronRight, LogOut, Settings as SettingsIcon } from "lucide-react";
import { Sheet } from "../../ui/Sheet";
import type { Profile } from "../../domain";
import type { SaveState } from "../../data/journal";
import "../../ui/profile-sheet.css";

/**
 * The profile drawer.
 *
 * Scoped to what someone actually taps the avatar for: who am I signed in as, is my
 * work saved, the one thing I flip often, and the way out. Everything else lives in
 * Settings.
 *
 * The rule it is built to is that the drawer must fit on screen with nothing to read.
 * The version this replaces scrolled, which meant it was a settings page wearing a
 * drawer costume — and it carried a Plans link, duplicating a destination the Train tab
 * already owns, which is pure noise in a menu this small.
 */
export function ProfileSheet({
  profile,
  email,
  owner,
  state,
  status,
  onClose,
  onProfileChange,
  onSettings,
  onSignOut,
}: {
  profile: Profile;
  email?: string;
  owner: string;
  state: SaveState;
  status: string;
  onClose: () => void;
  onProfileChange: (next: Profile) => void;
  onSettings: () => void;
  onSignOut: () => void;
}) {
  const isDemo = owner === "demo";

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

      {/* The save state belongs with the account it describes, not only in the top bar. */}
      <p className="ps-status" data-state={state}>
        <i aria-hidden="true" />
        {status}
      </p>

      {/* The only preference that changes often enough to earn a place here. */}
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
          <button onClick={onSettings}>
            <SettingsIcon size={18} aria-hidden="true" />
            <span className="ps-row-text">
              <strong>Settings</strong>
              <small>Training, data and account</small>
            </span>
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </li>
      </ul>

      <button className="ps-signout" onClick={onSignOut}>
        <LogOut size={18} aria-hidden="true" />
        {isDemo ? "Leave the demo" : "Sign out"}
      </button>
    </Sheet>
  );
}

export default ProfileSheet;
