import { useState, type FormEvent } from "react";
import { ArrowUpRight, ChevronLeft, Check } from "lucide-react";
import { Select } from "../Select";
import {
  convertLoad,
  experienceLevels,
  profileSchema,
  type Profile,
} from "../domain";
import { Brand } from "../ui/Brand";

/** The demo profile's defaults, reused as the starting shape of a new one. */
const demoProfile: Profile = {
  name: "Alex", goal: "Build consistency", days: 3, equipment: "Dumbbells",
  experience: "Getting back into it", unit: "lb", weight: "", height: "",
};
export { demoProfile };

export function Onboarding({ initial, onSave, onBack }: {
  initial?: Profile; onSave: (profile: Profile) => void; onBack: () => void;
}) {
  const [p, setP] = useState<Profile>(initial || { ...demoProfile, name: "", experience: "New to lifting" });
  const [error, setError] = useState("");
  const field = <K extends keyof Profile>(key: K, value: Profile[K]) => setP({ ...p, [key]: value });
  function changeUnit(unit: Profile["unit"]) {
    setP({ ...p, unit, weight: typeof p.weight === "number" ? Math.round(convertLoad(p.weight, p.unit, unit) * 10) / 10 : "" });
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    const result = profileSchema.safeParse(p);
    if (!result.success) { setError(result.error.issues[0].message); return; }
    onSave(result.data);
  }
  return <main className="onboarding page-enter">
    <header className="onboarding-top">
      <button className="text-button" onClick={onBack}><ChevronLeft size={18} />Back</button>
      <Brand />
    </header>
    <section className="onboarding-intro">
      <p className="entry-eyebrow">{initial ? "Your training profile" : "Personalise your training"}</p>
      <h1>{initial ? <>Training<br />preferences</> : <>Build your<br />routine</>}<span className="entry-period">.</span></h1>
      <p className="muted">Choose a starting point that fits your week. You can change these preferences anytime.</p>
      <div className="onboarding-visual">
        <img src={`${import.meta.env.BASE_URL}images/editorial/equipment.jpg`} alt="" />
        <div className="onboarding-frequency"><strong>{p.days}</strong><span>sessions<br />per week</span></div>
      </div>
      <dl className="onboarding-preview">
        <div><dt>Focus</dt><dd>{p.goal}</dd></div>
        <div><dt>Equipment</dt><dd>{p.equipment}</dd></div>
      </dl>
    </section>
    <form onSubmit={submit}>
      <fieldset className="onboarding-section">
        <legend><span>01</span>Your starting point</legend>
        <label>First name
          <input required maxLength={40} autoComplete="given-name" value={p.name} onChange={(event) => field("name", event.target.value)} placeholder="Your first name" />
        </label>
        <label>Your main goal
          <Select label="Your main goal" value={p.goal} onValueChange={(value) => field("goal", value as Profile["goal"])} options={["Build consistency", "Build strength", "Support getting leaner"]} />
        </label>
        <label>Training experience
          <Select label="Training experience" value={p.experience} onValueChange={(value) => field("experience", value as Profile["experience"])} options={[...experienceLevels]} />
        </label>
      </fieldset>
      <fieldset className="onboarding-section">
        <legend><span>02</span>Your weekly setup</legend>
        <fieldset className="onboarding-options">
          <legend>Sessions per week</legend>
          <div className="onboarding-days">{[2, 3, 4].map((days) => <label key={days}>
            <input type="radio" name="sessions-per-week" value={days} checked={p.days === days} onChange={() => field("days", days)} />
            <span><strong>{days}</strong><small>days</small></span>
          </label>)}</div>
        </fieldset>
        <fieldset className="onboarding-options">
          <legend>Available equipment</legend>
          <div className="onboarding-equipment">{(["Dumbbells", "Full gym", "Bodyweight"] as const).map((equipment) => <label key={equipment}>
            <input type="radio" name="available-equipment" value={equipment} checked={p.equipment === equipment} onChange={() => field("equipment", equipment)} />
            <span>{equipment}<Check size={15} aria-hidden="true" /></span>
          </label>)}</div>
        </fieldset>
        <fieldset className="onboarding-options">
          <legend>Weight units</legend>
          <div className="onboarding-units">{(["lb", "kg"] as const).map((unit) => <label key={unit}>
            <input type="radio" name="weight-units" value={unit} checked={p.unit === unit} onChange={() => changeUnit(unit)} />
            <span>{unit === "kg" ? "Kilograms" : "Pounds"}<strong>{unit}</strong></span>
          </label>)}</div>
        </fieldset>
      </fieldset>
      <details className="onboarding-measurements">
        <summary><span>Body measurements</span><small>Optional</small></summary>
        <p className="fine">Body weight supports optional calorie estimates. These measurements don’t determine your routine or change the body illustration.</p>
        <div className="form-grid">
          <label>Weight ({p.unit})
            <input type="number" min="1" max="1500" step="0.1" value={p.weight} onChange={(event) => field("weight", event.target.value === "" ? "" : Number(event.target.value))} />
          </label>
          <label>Height (cm)
            <input type="number" min="1" max="300" step="0.1" value={p.height} onChange={(event) => field("height", event.target.value === "" ? "" : Number(event.target.value))} />
          </label>
        </div>
      </details>
      <p role="alert">{error}</p>
      <button className="primary">{initial ? "Save preferences" : "Build my starting routine"}<ArrowUpRight size={18} /></button>
      <p className="fine onboarding-context">Kinset offers general fitness templates. Choose comfortable movements and loads; it does not assess injuries or prescribe treatment.</p>
    </form>
  </main>;
}
export default Onboarding;
