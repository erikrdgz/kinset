-- A versioned journal keeps offline writes atomic and detects multi-device conflicts.
create table public.journals (
 user_id uuid primary key references auth.users(id) on delete cascade,
 payload jsonb not null check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 5000000),
 revision bigint not null default 1 check (revision > 0),
 updated_at timestamptz not null default now()
);
alter table public.journals enable row level security;
create policy "Read own journal" on public.journals for select to authenticated using ((select auth.uid()) = user_id);
-- Clients write through the version-checked function, never directly to the table.
revoke all on public.journals from anon, authenticated;
grant select on public.journals to authenticated;
create or replace function public.save_journal(payload jsonb, expected_revision bigint)
returns bigint language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); new_revision bigint;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 if jsonb_typeof(payload) <> 'object' or not (payload ? 'profile' and payload ? 'sessions' and payload ? 'active')
    or jsonb_typeof(payload->'sessions') <> 'array'
    or octet_length(payload::text) > 5000000 then raise exception 'Invalid journal'; end if;
 if expected_revision = 0 then
  insert into public.journals(user_id,payload,revision) values(uid,payload,1) on conflict do nothing returning revision into new_revision;
 else
  update public.journals j set payload=save_journal.payload, revision=j.revision+1, updated_at=now()
  where j.user_id=uid and j.revision=expected_revision returning j.revision into new_revision;
 end if;
 if new_revision is null then raise exception 'Journal conflict: newer changes exist'; end if;
 return new_revision;
end;
$$;
revoke all on function public.save_journal(jsonb,bigint) from public,anon;
grant execute on function public.save_journal(jsonb,bigint) to authenticated;
