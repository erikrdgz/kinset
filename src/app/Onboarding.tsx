import { useState, type FormEvent } from "react";
import { ArrowUpRight, ChevronLeft } from "lucide-react";
import { Select } from "../Select";
import { profileSchema, type Profile } from "../domain";
import { Brand } from "../ui/Brand";

/** The demo profile's defaults, reused as the starting shape of a new one. */
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

export { demoProfile };

export function Onboarding({
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

export default Onboarding;
