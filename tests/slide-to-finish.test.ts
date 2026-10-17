import { describe, expect, it } from "vitest";
import { initialFinishGesture, nextFinishGesture, type FinishGesture } from "../src/features/training/slideFinishGesture";

const start = () => nextFinishGesture(initialFinishGesture, { type:"start", pointerId:1, x:20, y:30, travel:200 });
const move = (state:FinishGesture, x:number, y=30) => nextFinishGesture(state, { type:"move", pointerId:1, x, y });
const release = (state:FinishGesture, x:number, y=30) => nextFinishGesture(state, { type:"release", pointerId:1, x, y });
const key = (state:FinishGesture, value:string, repeat=false) => nextFinishGesture(state, { type:"key", key:value, repeat });

describe("deliberate workout finish", () => {
  it("does not finish when the thumb merely reaches the end", () => {
    const atEnd=move(start(),220);
    expect(atEnd.mode).toBe("dragging");
    expect(atEnd.value).toBe(1);
    expect(release(atEnd,220).mode).toBe("committed");
  });
  it("resets an incomplete release", () => {
    expect(release(move(start(),180),180)).toEqual(initialFinishGesture);
  });
  it("requires the thumb to still be at the end when released", () => {
    expect(release(move(start(),220),160)).toEqual(initialFinishGesture);
  });
  it("resets pointer cancellation even at the end", () => {
    expect(nextFinishGesture(move(start(),220),{type:"cancel"})).toEqual(initialFinishGesture);
  });
  it("leaves vertical gestures to scrolling", () => {
    const scrolling=move(start(),25,55);
    expect(scrolling).toEqual(initialFinishGesture);
    expect(release(scrolling,220,55)).toEqual(initialFinishGesture);
    expect(release(start(),220,90)).toEqual(initialFinishGesture);
  });
  it("ignores a different pointer and second simultaneous start", () => {
    const active=start();
    expect(nextFinishGesture(active,{type:"release",pointerId:2,x:220,y:30})).toBe(active);
    expect(nextFinishGesture(active,{type:"start",pointerId:2,x:220,y:30,travel:200})).toBe(active);
  });
  it("does not treat a tap, left drag, or zero-width track as completion", () => {
    expect(release(start(),20)).toEqual(initialFinishGesture);
    expect(release(start(),-100)).toEqual(initialFinishGesture);
    expect(nextFinishGesture(initialFinishGesture,{type:"start",pointerId:1,x:20,y:30,travel:0})).toEqual(initialFinishGesture);
  });
  it("commits only once despite further releases, cancellations, or keys", () => {
    const committed=release(start(),220);
    expect(release(committed,220)).toBe(committed);
    expect(key(committed,"Enter")).toBe(committed);
    expect(nextFinishGesture(committed,{type:"cancel"})).toBe(committed);
    expect(nextFinishGesture(committed,{type:"accessibleActivate"})).toBe(committed);
  });
  it("requires End then a fresh Enter for keyboard completion", () => {
    expect(key(initialFinishGesture,"Enter")).toEqual(initialFinishGesture);
    const armed=key(initialFinishGesture,"End");
    expect(armed).toEqual({mode:"keyboard",value:1});
    expect(key(armed,"Enter",true)).toBe(armed);
    expect(key(armed,"Enter")).toEqual({mode:"committed",value:1});
  });
  it("never finishes from an arrow key alone", () => {
    let state=initialFinishGesture;
    for(let i=0;i<15;i++) state=key(state,"ArrowRight");
    expect(state).toEqual({mode:"keyboard",value:1});
    expect(key(key(state,"ArrowLeft"),"Enter").mode).toBe("keyboard");
  });
  it("supports cancelling a keyboard finish with Escape or Home", () => {
    for(const reset of ["Escape","Home"]) expect(key(key(initialFinishGesture,"End"),reset)).toEqual(initialFinishGesture);
  });
  it("offers a deliberate two-activation alternative to dragging", () => {
    const armed=nextFinishGesture(initialFinishGesture,{type:"accessibleActivate"});
    expect(armed).toEqual({mode:"keyboard",value:1});
    expect(nextFinishGesture(armed,{type:"accessibleActivate"})).toEqual({mode:"committed",value:1});
  });
});
