import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Select } from "../../Select";
import { profileSchema, type Journal, type Profile } from "../../domain";
import "../../ui/settings.css";

/**
 * Settings, rendered as the drawer's second view.
 *
 * Everything the drawer's first view should not carry: preferences that change twice a year,
 * account deletion, and the credits.
 *
 * Changes save as you make them. The old path sent people back through the onboarding
 * wizard to alter one answer, which is a form with a submit button pretending to be a
 * settings screen — fine the first time, wrong every time after.
 *
 * The credits section is not decoration. The movement clips are CC BY-SA, which
 * requires attribution to travel with the work, so it has to be reachable from inside
 * the app rather than sitting in a repository file.
 */
export function SettingsPanel({
  profile,
  email,
  owner,
  data,
  deleting,
  onProfileChange,
  onDeleteAccount,
}: {
  profile: Profile;
  email?: string;
  owner: string;
  data: Journal;
  deleting: boolean;
  onProfileChange: (next: Profile) => void;
  onDeleteAccount: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [nameError, setNameError] = useState("");
  const isDemo = owner === "demo";

  const set = <K extends keyof Profile>(key: K, value: Profile[K]) => {
    const next = { ...profile, [key]: value };
    const result = profileSchema.safeParse(next);
    if (!result.success) {
      if (key === "name") setNameError(result.error.issues[0].message);
      return;
    }
    setNameError("");
    onProfileChange(result.data);
  };

  return (
    <div className="settings">
      <section className="set-group">
        <h2>Training</h2>
        <p className="fine">
          These shape the workouts Kinset suggests. Changes apply to your next session.
        </p>

        <label className="set-field">
          <span>Your name</span>
          <input
            value={profile.name}
            maxLength={40}
            onChange={(e) => set("name", e.target.value)}
          />
          {nameError && (
            <small role="alert" className="set-error">
              {nameError}
            </small>
          )}
        </label>

        <div className="set-field">
          <span>Main goal</span>
          <Select
            label="Main goal"
            value={profile.goal}
            onValueChange={(v) => set("goal", v as Profile["goal"])}
            options={[
              "Build strength",
              "Build consistency",
              "Support getting leaner",
            ]}
          />
        </div>

        <div className="set-field">
          <span>Sessions per week</span>
          <Select
            label="Sessions per week"
            value={String(profile.days)}
            onValueChange={(v) => set("days", Number(v) as Profile["days"])}
            options={[
              { value: "2", label: "2 days" },
              { value: "3", label: "3 days" },
              { value: "4", label: "4 days" },
            ]}
          />
        </div>

        <div className="set-field">
          <span>Experience</span>
          <Select
            label="Experience"
            value={profile.experience}
            onValueChange={(v) => set("experience", v as Profile["experience"])}
            options={["New to training", "Returning", "Consistent"]}
          />
        </div>

        <div className="set-field">
          <span>Available equipment</span>
          <Select
            label="Available equipment"
            value={profile.equipment}
            onValueChange={(v) => set("equipment", v as Profile["equipment"])}
            options={["Bodyweight", "Dumbbells", "Full gym"]}
          />
          <small>
            Movements you cannot do are left out, and Kinset says so rather than
            quietly swapping in something that trains a different pattern.
          </small>
        </div>

        <div className="set-field">
          <span>Weight units</span>
          <div
            className="set-segmented"
            role="group"
            aria-label="Weight units"
            data-active={profile.unit}
          >
            <span className="set-thumb" aria-hidden="true" />
            {(["lb", "kg"] as const).map((unit) => (
              <button
                key={unit}
                type="button"
                className={profile.unit === unit ? "selected" : ""}
                aria-pressed={profile.unit === unit}
                onClick={() => set("unit", unit)}
              >
                {unit}
              </button>
            ))}
          </div>
          <small>Past workouts keep the unit you logged them in.</small>
        </div>
      </section>

      <section className="set-group">
        <h2>About</h2>
        <dl className="set-facts">
          <div>
            <dt>Account</dt>
            <dd>{email || "Demo · this device only"}</dd>
          </div>
          <div>
            <dt>Workouts recorded</dt>
            <dd className="tabular">{data.sessions.length}</dd>
          </div>
        </dl>

        {/* CC BY-SA obliges attribution to travel with the work, so it is reachable
            here rather than only in a file in the repository. */}
        <details className="set-credits">
          <summary>Content and media credits</summary>
          <p>
            Movement clips come from the{" "}
            <a href="https://wger.de" target="_blank" rel="noreferrer">
              wger
            </a>{" "}
            project and are used under{" "}
            <a
              href="https://creativecommons.org/licenses/by-sa/4.0/"
              target="_blank"
              rel="noreferrer"
            >
              CC BY-SA 4.0
            </a>
            . Kinset trimmed, resized and re-encoded them; those adaptations carry the
            same licence. Per-clip credits are listed with each movement.
          </p>
          <p>
            Exercise guidance is written by Kinset and has not been reviewed by a
            qualified trainer. Choose comfortable movements and loads, and stop if
            something hurts.
          </p>
        </details>
      </section>

      {!isDemo && (
        <section className="set-group set-danger">
          <h2>Account</h2>
          {confirmDelete ? (
            <>
              <p>
                <strong>Delete your account?</strong>
              </p>
              <p className="muted">
                This permanently removes your profile and every workout from the cloud.
                It cannot be undone.
              </p>
              <button
                className="set-delete-confirm"
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
            <button className="set-delete" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={16} aria-hidden="true" />
              Delete account
            </button>
          )}
        </section>
      )}
    </div>
  );
}

export default SettingsPanel;
