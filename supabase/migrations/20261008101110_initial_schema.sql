-- First version of the database for the connection app.
-- The tables match "The database" section of docs/tech-design.md.

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  age_range text,
  program_type text check (program_type in (
    'after_school', 'sports', 'arts', 'camp', 'faith', 'classroom', 'other'
  )),
  created_at timestamptz not null default now()
);

create table public.people (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  number integer not null check (number >= 1),
  date date,
  activity_type text check (activity_type in (
    'pairs', 'small_groups_leader_chose', 'small_groups_kids_chose',
    'whole_group_game', 'whole_group_discussion', 'free_time', 'other'
  )),
  activity_note text,
  created_at timestamptz not null default now(),
  unique (group_id, number)
);

create table public.attendance (
  session_id uuid not null references public.sessions (id) on delete cascade,
  person_id uuid not null references public.people (id) on delete cascade,
  primary key (session_id, person_id)
);

create table public.answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  person_id uuid not null references public.people (id) on delete cascade,
  q4 integer check (q4 between 1 and 7),
  q5 integer check (q5 between 1 and 5),
  stayed_whole text not null default '' check (stayed_whole in ('Y', 'N', '')),
  first_time text not null default '' check (first_time in ('Y', 'N', '')),
  created_at timestamptz not null default now(),
  unique (session_id, person_id)
);

create table public.ticks (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  from_person uuid not null references public.people (id) on delete cascade,
  to_person uuid not null references public.people (id) on delete cascade,
  worked_with boolean not null default false,
  talked_to boolean not null default false,
  knew_before boolean not null default false,
  created_at timestamptz not null default now(),
  check (from_person <> to_person),
  unique (session_id, from_person, to_person)
);

create index people_group_id_idx on public.people (group_id);
create index sessions_group_id_idx on public.sessions (group_id);
create index answers_session_id_idx on public.answers (session_id);
create index ticks_session_id_idx on public.ticks (session_id);

-- Access is wide open for now, so the app can read and write with the
-- publishable key. Replace these policies with real rules before any real
-- data goes in.
grant select, insert, update, delete on
  public.groups, public.people, public.sessions,
  public.attendance, public.answers, public.ticks
  to anon, authenticated;

alter table public.groups enable row level security;
alter table public.people enable row level security;
alter table public.sessions enable row level security;
alter table public.attendance enable row level security;
alter table public.answers enable row level security;
alter table public.ticks enable row level security;

create policy "Open for now" on public.groups for all to anon, authenticated using (true) with check (true);
create policy "Open for now" on public.people for all to anon, authenticated using (true) with check (true);
create policy "Open for now" on public.sessions for all to anon, authenticated using (true) with check (true);
create policy "Open for now" on public.attendance for all to anon, authenticated using (true) with check (true);
create policy "Open for now" on public.answers for all to anon, authenticated using (true) with check (true);
create policy "Open for now" on public.ticks for all to anon, authenticated using (true) with check (true);
