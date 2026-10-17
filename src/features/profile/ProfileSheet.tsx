import { useState } from "react";
import { ChevronRight, LogOut, Settings as SettingsIcon } from "lucide-react";
import { Sheet } from "../../ui/Sheet";
import { SettingsPanel } from "./Settings";
import type { Journal, Profile } from "../../domain";
import type { SaveState } from "../../data/journal";
import "../../ui/profile-sheet.css";

/**
 * The profile drawer.
 *
 * Scoped to what someone taps an avatar for: who am I, is my work saved, the one thing
 * I flip often, and the way out. Everything else is in Settings.
 *
 * Two rules it is built to. It fits on screen with nothing to read — an earlier version
 * scrolled, which makes it a settings page wearing a drawer costume. And every control
 * is the same height on the same rhythm; the version before this had blocks 105, 68 and
 * 48px tall with gaps of 0, 16, 8 and 0 between them, which is what "unpolished"
 * actually means in practice.
 *
 * The save state is folded into the identity line rather than given its own row,
 * because it describes the account rather than standing alone.
 *
 * Settings lives in here too, as a second view the same drawer grows into, rather than
 * a route. Going to a full screen to change one dropdown and then navigating back is
 * heavier than the task deserves.
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
  onDeleteAccount,
  onSignOut,
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
  onDeleteAccount: () => void;
  onSignOut: () => void;
}) {
  const [view, setView] = useState<"home" | "settings">("home");
  const isDemo = owner === "demo";

  if (view === "settings")
    return (
      <Sheet
        title="Settings"
        tall
        onBack={() => setView("home")}
        onClose={onClose}
      >
        <SettingsPanel
          profile={profile}
          email={email}
          owner={owner}
          data={data}
          deleting={deleting}
          onProfileChange={onProfileChange}
          onDeleteAccount={onDeleteAccount}
        />
      </Sheet>
    );

  return (
    <Sheet title="Profile" onClose={onClose}>
      <div className="ps">
        <header className="ps-identity">
          <span className="ps-avatar" aria-hidden="true">
            {profile.name[0].toUpperCase()}
          </span>
          <div className="ps-who">
            <strong>{profile.name}</strong>
            <span className="ps-sub">
              {email ? <span className="ps-email">{email}</span> : "Demo account"}
              <span className="ps-state" data-state={state}>
                <i aria-hidden="true" />
                {status}
              </span>
            </span>
          </div>
        </header>

        <div className="ps-rows">
          {/* The only preference that changes often enough to earn a place here. */}
          <div className="ps-row">
            <span className="ps-label">Units</span>
            <div className="ps-segmented" role="group" aria-label="Weight units">
              {(["lb", "kg"] as const).map((unit) => (
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

          <button className="ps-row ps-row-link" onClick={() => setView("settings")}>
            <SettingsIcon size={18} aria-hidden="true" />
            <span className="ps-label">Settings</span>
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>

        <button className="ps-signout" onClick={onSignOut}>
          <LogOut size={17} aria-hidden="true" />
          {isDemo ? "Leave the demo" : "Sign out"}
        </button>
      </div>
    </Sheet>
  );
}

export default ProfileSheet;
