import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import assert from "node:assert/strict";
const db = new PGlite();
await db.exec(
  `create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; grant usage on schema auth to authenticated,anon; grant execute on function auth.uid() to authenticated,anon; insert into auth.users values ('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002');`,
);
await db.exec(
  fs.readFileSync(
    new URL(
      "../supabase/migrations/202609280001_journals.sql",
      import.meta.url,
    ),
    "utf8",
  ),
);
await db.exec(
  `set role authenticated; set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';`,
);
const payload = JSON.stringify({
  profile: { name: "Test" },
  sessions: [],
  active: null,
  plans: [
    {
      id: "test-plan",
      name: "Test plan",
      days: [
        {
          id: "day-one",
          name: "Upper",
          entries: [
            { exerciseId: "lateral", sets: 3, repsMin: 10, repsMax: 12 },
          ],
        },
      ],
    },
  ],
  activePlanId: "test-plan",
  planProgress: { "test-plan": 0 },
  planDraft: { id: "draft", name: "", days: [] },
});
assert.equal(
  (
    await db.query("select public.save_journal($1::jsonb,0) as revision", [
      payload,
    ])
  ).rows[0].revision,
  1,
);
assert.equal(
  (
    await db.query("select public.save_journal($1::jsonb,1) as revision", [
      payload,
    ])
  ).rows[0].revision,
  2,
);
await assert.rejects(
  db.query("select public.save_journal($1::jsonb,1)", [payload]),
  /conflict/,
);
assert.deepEqual(
  (await db.query("select payload from public.journals")).rows[0].payload,
  JSON.parse(payload),
);
await db.exec(
  `set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';`,
);
assert.equal((await db.query("select * from public.journals")).rows.length, 0);
await assert.rejects(
  db.query(`update public.journals set revision=3`),
  /permission denied/,
);
assert.equal(
  (
    await db.query("select public.save_journal($1::jsonb,0) as revision", [
      payload,
    ])
  ).rows[0].revision,
  1,
);
await db.exec("reset role;");
await db.exec(
  `delete from auth.users where id='00000000-0000-0000-0000-000000000001';`,
);
assert.equal((await db.query("select * from public.journals")).rows.length, 1);
await db.exec(`set role anon;`);
await assert.rejects(
  db.query("select * from public.journals"),
  /permission denied/,
);
await assert.rejects(
  db.query("select public.save_journal($1::jsonb,0)", [payload]),
  /permission denied/,
);
console.log(
  "PASS: custom plan/draft round-trip, revisions, conflict detection, user isolation, direct-write denial, deletion cascade, anonymous denial.",
);
await db.close();
