import { ArrowUpRight, Check, ChevronRight, Info } from "lucide-react";
import { completedSessions, equipmentNames, equipmentUnion, findExercise, patternNames, type Journal, type Profile } from "../../domain";
import { durationText, estimateDuration, nextWorkout, prescriptionText } from "../training/workout";
import type { Route } from "../../app/routes";
import { useState } from "react";
import { HowTo } from "../library/HowTo";
import { CountUp } from "../../ui/Motion";

const editorial = (name: string) => `${import.meta.env.BASE_URL}images/editorial/${name}.jpg`;

export function Today({ journal, profile, go, onStart }: {
  journal: Journal; profile: Profile; go: (route: Route) => void; onStart: () => void;
}) {
  const [guide, setGuide] = useState<string>();
  const [selectedDay, setSelectedDay] = useState((new Date().getDay()+6)%7);
  const workout = nextWorkout(journal, profile);
  const active = journal.active;
  const duration = estimateDuration(workout.entries);
  const entries = active ? active.entries.map(e => ({ id:e.entryId, exerciseId:e.exerciseId, name:e.exerciseName, sets:e.sets.length, target:e.targetReps ?? "", done:e.sets.filter(s=>s.done).length })) : workout.entries.map((e,i) => ({ id:`${e.exerciseId}-${i}`, exerciseId:e.exerciseId, name:findExercise(e.exerciseId)?.name ?? e.exerciseId, sets:e.sets, target:prescriptionText(e), done:0 }));
  const equipment = equipmentUnion(entries.map(e=>e.exerciseId));
  const done = completedSessions(journal);
  const week = weekDays(done);
  const weekStart = new Date();
  weekStart.setHours(0,0,0,0);
  weekStart.setDate(weekStart.getDate()-((weekStart.getDay()+6)%7));
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate()+7);
  const weekSessions = done.filter(s => Date.parse(s.finishedAt!) >= +weekStart && Date.parse(s.finishedAt!) < +weekEnd);
  const selectedStart = new Date(week[selectedDay].key);
  const selectedEnd = new Date(selectedStart); selectedEnd.setDate(selectedEnd.getDate()+1);
  const selectedSessions = weekSessions.filter(s => Date.parse(s.finishedAt!) >= +selectedStart && Date.parse(s.finishedAt!) < +selectedEnd);
  const completed = entries.reduce((n,e)=>n+e.done,0);
  const total = entries.reduce((n,e)=>n+e.sets,0);
  const progress = total ? completed/total : 0;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return <div className="today atelier-today">
    <header className="editorial-heading today-heading">
      <div><p className="kicker">{greeting}, {profile.name}</p><h1>Today<span className="orange-dot">.</span></h1></div>
      <span className="heading-date">{new Date().toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric"})}</span>
    </header>
    <div className="today-flow">
      <div className="workout-flow" data-reveal>
        <section className="training-poster" aria-labelledby="training-poster-title">
          <img className="training-photo" data-parallax src={editorial("strength")} alt="" fetchPriority="high" />
          <div className="poster-optics" aria-hidden="true"><i/><i/><i/></div>
          <div className="training-poster-top"><span className="poster-status">{active?"IN PROGRESS":"YOUR NEXT WORKOUT"}</span><span className="poster-edition">{String(done.length+1).padStart(3,"0")}</span></div>
          <div className="training-poster-copy">
            <p className="poster-category">{active?.planName ?? workout.planName}</p>
            <h2 id="training-poster-title">{active?.name ?? workout.name}</h2>
            <p className="poster-equipment">{equipment.length ? equipment.map(e=>equipmentNames[e]).join(" · ") : "Bodyweight · No equipment"}</p>
            <div className="poster-facts">
              <div><strong>{active?completed:entries.length}</strong><span>{active?"sets complete":entries.length===1?"movement":"movements"}</span></div>
              <div><strong>{active?total:`${duration.min}–${duration.max}`}</strong><span>{active?"total sets":"min · estimated"}</span></div>
            </div>
            {active && <div className="poster-progress" role="progressbar" aria-label="Workout completion" aria-valuenow={completed} aria-valuemin={0} aria-valuemax={total}><i style={{width:`${progress*100}%`}} /></div>}
            <button className="primary workout-launch" onClick={onStart}><span>{active?"Resume workout":"Start workout"}</span><ArrowUpRight size={23} aria-hidden="true"/></button>
          </div>
          {!active && <span className="sr-only">{durationText(duration)}</span>}
        </section>
        <div className="flow-joint">
          <button className="flow-joint-button" onClick={()=>active ? onStart() : go({name:"preview"})} aria-label={active ? "Open active workout" : "View workout details"}><ArrowUpRight size={26} aria-hidden="true"/></button>
        </div>
        <section className="session-lineup connected-lineup">
          <div className="section-title"><h2>Movement lineup</h2><span className="lineup-count">{String(entries.length).padStart(2,"0")}</span></div>
          <ol>{entries.map((entry,i)=><li key={entry.id}><button onClick={()=>setGuide(entry.exerciseId)}><span className="lineup-index">{String(i+1).padStart(2,"0")}</span><span className="lineup-name"><strong>{entry.name}</strong><small>{findExercise(entry.exerciseId)?.patterns.map(p=>patternNames[p]).join(" · ")}</small></span><span className="lineup-target">{entry.sets}<i> × </i>{entry.target}</span><ChevronRight size={17} aria-hidden="true"/></button></li>)}</ol>
          <button className="text-link" onClick={()=>go({name:"train"})}>Manage your plan <ArrowUpRight size={16} aria-hidden="true"/></button>
        </section>
      </div>
      <aside className="today-support">
        <section className="week-panel" data-reveal>
          <div className="panel-heading"><h2>This week</h2><button className="week-expand" aria-label="Open training progress" onClick={()=>go({name:"progress"})}><ArrowUpRight size={23} aria-hidden="true"/></button></div>
          <div className="weekly-score">
            <WeeklyDial completed={weekSessions.length} target={profile.days}/>
            <p className="weekly-target">{weekSessions.length>=profile.days?"Weekly target complete":`${Math.max(0,profile.days-weekSessions.length)} ${profile.days-weekSessions.length===1?"session":"sessions"} to your weekly target`}</p>
          </div>
          <div className="week-date-range">{new Intl.DateTimeFormat(undefined, {month:"long",day:"numeric"}).formatRange(weekStart, new Date(week[6].key))}</div>
          <ol className="atelier-week" aria-label="Select a day this week">{week.map((day,index)=><li key={day.key} data-today={day.isToday||undefined} data-completed={day.completed||undefined} data-selected={selectedDay===index||undefined}><button onClick={()=>setSelectedDay(index)} aria-pressed={selectedDay===index} aria-label={`${day.label}, ${day.completed?"workout recorded":"no workout"}`}><span>{day.letter}</span><b>{day.date}</b><span className="week-day-mark">{day.completed?<Check size={12}/>:null}</span></button></li>)}</ol>
          <div className="week-day-detail" key={selectedDay}>
            <span className="day-detail-heading">{week[selectedDay].isToday ? "Today" : selectedStart.toLocaleDateString(undefined,{weekday:"long"})}</span>
            {selectedSessions.length ? selectedSessions.map(session=><button className="day-session" key={session.id} onClick={()=>go({name:"summary",sessionId:session.id})}><span><strong>{session.name}</strong><small>{session.entries.flatMap(e=>e.sets.filter(set=>set.done)).length} sets completed</small></span><ArrowUpRight size={24} aria-hidden="true"/></button>) : <p className="day-empty">No workout recorded.</p>}
          </div>
        </section>
        <button className="run-teaser" data-reveal onClick={()=>go({name:"run"})}><img src={editorial("running")} alt="" loading="lazy" data-parallax/><span className="run-teaser-copy"><span className="kicker">RUNNING & WALKING</span><strong>Take it<br/>outside.</strong><span>Start an activity <ArrowUpRight size={18} aria-hidden="true"/></span></span></button>
        <section className="training-notes" data-reveal>
          {done[0] && <button className="last-session-row" onClick={()=>go({name:"summary",sessionId:done[0].id})}><span className="last-session-date"><b>{new Date(done[0].finishedAt!).getDate()}</b><small>{new Date(done[0].finishedAt!).toLocaleDateString(undefined,{month:"short"})}</small></span><span><small>Last workout</small><strong>{done[0].name}</strong></span><ArrowUpRight size={21} aria-hidden="true"/></button>}
          <button className="library-teaser" onClick={()=>go({name:"library"})}><img src={editorial("mobility")} alt="" loading="lazy"/><span><strong>Movement<br/>library.</strong><span>Technique & muscle guides <ArrowUpRight size={17} aria-hidden="true"/></span></span></button>
        </section>
      </aside>
    </div>
    {!active && workout.unmet.length>0 && <section className="notice-inline" role="note"><Info size={18}/><div><strong>Equipment note</strong>{workout.unmet.map(u=><p key={u.slot.id}>{u.reason}</p>)}</div></section>}
    {guide && <HowTo exerciseId={guide} onClose={()=>setGuide(undefined)}/>}
  </div>;
}
function WeeklyDial({ completed, target }: { completed: number; target: number }) {
  const fraction = Math.min(1, completed / Math.max(1, target));
  return <div className="rhythm-dial" role="img" aria-label={`${completed} of ${target} weekly sessions complete`}>
    <svg viewBox="0 0 260 165" aria-hidden="true">
      {Array.from({ length: 43 }, (_, index) => {
        const angle = Math.PI + index / 42 * Math.PI;
        const active = fraction > 0 && index / 42 <= fraction;
        return <line key={index} x1={130 + Math.cos(angle)*102} y1={143 + Math.sin(angle)*102} x2={130 + Math.cos(angle)*88} y2={143 + Math.sin(angle)*88} className={active ? "rhythm-tick is-filled" : "rhythm-tick"} style={{ animationDelay:`${index*12}ms` }}/>
      })}
      <path d="M 57 143 A 73 73 0 0 1 203 143" className="rhythm-inner"/>
    </svg>
    <div className="rhythm-readout" aria-hidden="true"><strong><CountUp value={completed}/><span className="rhythm-target">/{target}</span></strong><small>SESSIONS COMPLETE</small></div>
  </div>;
}
function weekDays(sessions:ReturnType<typeof completedSessions>){
  const start=new Date(); start.setHours(0,0,0,0); start.setDate(start.getDate()-((start.getDay()+6)%7));
  const today=new Date(); today.setHours(0,0,0,0);
  return Array.from({length:7},(_,i)=>{const date=new Date(start);date.setDate(start.getDate()+i);const next=new Date(date);next.setDate(date.getDate()+1);return {key:date.toISOString(),date:date.getDate(),letter:date.toLocaleDateString(undefined,{weekday:"narrow"}),label:date.toLocaleDateString(undefined,{weekday:"long",month:"short",day:"numeric"}),isToday:+date===+today,completed:sessions.some(s=>Date.parse(s.finishedAt??"")>=+date&&Date.parse(s.finishedAt??"")<+next)};});
}
export default Today;
