# Motion QA

Tools for checking the 3D exercise demos. Neither ships: `qa.html` is not an
entry point in the Vite build, which only builds `index.html`.

## `audit.ts` — geometry checks, no browser

```
npx vite-node qa/audit.ts
```

Poses every movement across its rep and flags joints that bend the wrong way
(an elbow ahead of the shoulder-to-wrist line, a knee behind the hip-to-ankle
line), feet folded back up the shin, hands driven through the torso, and
anything below the floor. Prints one line per movement and issue.

## `dump.ts` — limb directions at the top of the rep

```
npx vite-node qa/dump.ts
```

One row per movement: the upper arm, forearm and thigh as unit vectors, the
wrist height, and how far the arm is extended (1.00 is straight). Reading the
numbers beats reading a screenshot; the preview cameras sit at an angle, so a
limb's direction is easy to misjudge by eye.

## `palm.ts` — hand and foot rotation

```
npx vite-node qa/palm.ts [movement ...]
```

Position checks pass happily while a palm faces sideways, so this reads
rotation. It takes the palm frame from the finger bones rather than assuming
which local axis is which: fingers run wrist to middle knuckle, `across` runs
index knuckle to pinky knuckle, and their cross product is the palm normal,
negated on the right because the hands mirror.

Worth knowing, because getting it wrong is silent: the hand's local +Y is the
fingers, but the palm normal is local **+X on the left and -X on the right**,
not local +Z. In the bind pose both palms face the floor. Taking +Z instead
stands every planted hand on its edge with the thumb rolled under, which is
what shipped until someone noticed the push-up.

Prints the rest pose and each hand's local axes first, then a row per movement
and side.

## `qa.html` + `qa.ts` — visual harness

Served by `npm run dev`. Two modes:

- `/qa.html?m=curl&phases=0,0.2,0.45&view=side` — one movement repeated across
  its rep.
- `/qa.html?ms=curl,press,lateral&phase=0.45&view=front` — several movements at
  the same point in the rep. Only frames sensibly within a group that shares a
  camera, so pass standing and floor movements separately.

The browser pane runs hidden, so requestAnimationFrame never fires and nothing
would draw on its own. Renders are driven from the console instead:

```js
for (let i = 0; i < 50 && !window.__qa; i++) await new Promise(r => setTimeout(r, 200));
window.__qa.render();
```
