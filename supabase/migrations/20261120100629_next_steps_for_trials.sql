-- Next steps for future trials (Irene's "Next Steps for Tool", Nov 2026).
--
-- Strictly additive: every new column is nullable or has a default, no
-- existing row is changed or deleted, and nothing is renamed, so the live
-- site keeps working while this branch is tested.
--
-- Access stays wide open for now, the same as the first migration: the new
-- tables get the same "Open for now" policies, and the two check-in
-- functions run with the caller's rights (security invoker), so they follow
-- whatever policies the tables have. Lock these down together with the
-- other tables before any real data goes in.

-- Groups: how a partner uses Connected.
alter table public.groups
  -- A single activity, or a group that meets regularly.
  add column group_type text not null default 'regular'
    check (group_type in ('regular', 'single_activity')),
  -- What the partner can collect: names and who interacted with whom (the
  -- network), names with survey questions only, or anonymous survey answers.
  add column check_in_mode text not null default 'names_and_interactions'
    check (check_in_mode in ('names_and_interactions', 'names_survey', 'anonymous_survey')),
  -- Group-only reports never name or flag a student. Leader support shows
  -- the leader which kids might need help, on the leader's screens only.
  add column report_privacy text not null default 'leader_support'
    check (report_privacy in ('group_only', 'leader_support'));

-- Existing groups keep what they do today (the leader sees names). Groups
-- made from now on start as group-only unless the leader picks otherwise.
alter table public.groups alter column report_privacy set default 'group_only';

-- Sessions: what was asked, when, and what staff decided afterwards.
alter table public.sessions
  add column activity_goal text check (char_length(activity_goal) <= 500),
  add column learning_question text check (char_length(learning_question) <= 500),
  -- The catalog ids (core/questions.js) of the questions asked, in order.
  -- Null means the original Connected check-in, for sessions made before
  -- this migration or by older code.
  add column questions text[] check (questions is null or cardinality(questions) > 0),
  add column check_in_timing text
    check (check_in_timing in ('right_after_activity', 'end_of_session', 'later_day')),
  -- How many took part, for groups that don't collect names.
  add column attended_count integer check (attended_count >= 0),
  add column try_next text check (char_length(try_next) <= 4000),
  add column how_it_went text check (char_length(how_it_went) <= 4000),
  add column notes_updated_at timestamptz;

-- The answer columns shared by named and anonymous check-ins.
alter table public.answers
  add column identification integer check (identification between 1 and 7),
  add column felt_included integer check (felt_included between 1 and 5),
  add column new_partner text check (new_partner in ('yes', 'no', 'no_opportunity')),
  add column easier_next_time text[] check (
    cardinality(easier_next_time) > 0
    and easier_next_time <@ array['smaller_groups', 'clearer_instructions', 'more_time', 'another_way', 'nothing']
    and not ('nothing' = any (easier_next_time) and cardinality(easier_next_time) > 1)
  ),
  -- How a kid answered each "who" question: named someone, said nobody, or
  -- skipped it. Null means it wasn't asked, or the check-in is older than
  -- this migration and didn't record the difference.
  add column worked_with_status text check (worked_with_status in ('named', 'none', 'skipped')),
  add column talked_to_status text check (talked_to_status in ('named', 'none', 'skipped')),
  add column knew_before_status text check (knew_before_status in ('named', 'none', 'skipped')),
  -- When the check-in was last saved. Older rows have only created_at, the
  -- time of their first check-in, so this starts empty for them.
  add column answered_at timestamptz;

alter table public.answers alter column answered_at set default now();

-- Check-ins from groups that don't collect names. The check-in screen makes
-- the id, so saving again after a dropped connection can't add a copy.
create table public.anonymous_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  q4 integer check (q4 between 1 and 7),
  q5 integer check (q5 between 1 and 5),
  identification integer check (identification between 1 and 7),
  felt_included integer check (felt_included between 1 and 5),
  new_partner text check (new_partner in ('yes', 'no', 'no_opportunity')),
  easier_next_time text[] check (
    cardinality(easier_next_time) > 0
    and easier_next_time <@ array['smaller_groups', 'clearer_instructions', 'more_time', 'another_way', 'nothing']
    and not ('nothing' = any (easier_next_time) and cardinality(easier_next_time) > 1)
  ),
  stayed_whole text not null default '' check (stayed_whole in ('Y', 'N', '')),
  first_time text not null default '' check (first_time in ('Y', 'N', '')),
  answered_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Answers to an activity's learning question, kept apart from the belonging
-- and interaction answers. The question is copied in, so each answer keeps
-- the wording it was given.
create table public.learning_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  person_id uuid references public.people (id) on delete cascade,
  anonymous_answer_id uuid references public.anonymous_answers (id) on delete cascade,
  question text not null,
  answer text not null check (char_length(btrim(answer)) between 1 and 2000),
  answered_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (num_nonnulls(person_id, anonymous_answer_id) = 1),
  unique (session_id, person_id),
  unique (anonymous_answer_id)
);

create index anonymous_answers_session_id_idx on public.anonymous_answers (session_id);
create index learning_answers_session_id_idx on public.learning_answers (session_id);

grant select, insert, update, delete on public.anonymous_answers, public.learning_answers
  to anon, authenticated;

alter table public.anonymous_answers enable row level security;
alter table public.learning_answers enable row level security;

create policy "Open for now" on public.anonymous_answers for all to anon, authenticated using (true) with check (true);
create policy "Open for now" on public.learning_answers for all to anon, authenticated using (true) with check (true);

-- Saves one named check-in all at once: the kid's ticks, their answers and
-- their learning answer. A function runs as one transaction, so if anything
-- fails (a dropped connection, a bad value), nothing is saved and the kid can
-- try again. Checking in again replaces the earlier check-in for the session.
create function public.save_check_in(
  p_session_id uuid,
  p_person_id uuid,
  p_answer jsonb,
  p_ticks jsonb default '[]'::jsonb,
  p_learning_answer text default null
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_group_id uuid;
  v_mode text;
  v_learning_question text;
  v_answer jsonb := coalesce(p_answer, '{}'::jsonb);
  v_ticks jsonb := coalesce(p_ticks, '[]'::jsonb);
  v_learning text := nullif(btrim(coalesce(p_learning_answer, '')), '');
begin
  select s.group_id, g.check_in_mode, s.learning_question
    into v_group_id, v_mode, v_learning_question
    from public.sessions s
    join public.groups g on g.id = s.group_id
   where s.id = p_session_id;
  if not found then
    raise exception 'This session does not exist.';
  end if;
  if v_mode = 'anonymous_survey' then
    raise exception 'This group checks in without names.';
  end if;
  if not exists (select 1 from public.people p where p.id = p_person_id and p.group_id = v_group_id) then
    raise exception 'That kid is not in this group.';
  end if;
  if jsonb_typeof(v_answer) <> 'object' or jsonb_typeof(v_ticks) <> 'array' then
    raise exception 'The check-in is in the wrong format.';
  end if;
  if exists (
    select 1
      from jsonb_array_elements(v_ticks) as t(tick)
     where not exists (
       select 1 from public.people p
        where p.id = (t.tick ->> 'to_person')::uuid and p.group_id = v_group_id
     )
  ) then
    raise exception 'Everyone picked must be in this group.';
  end if;

  insert into public.ticks (session_id, from_person, to_person, worked_with, talked_to, knew_before)
  select p_session_id, p_person_id, (t.tick ->> 'to_person')::uuid,
         bool_or(coalesce((t.tick ->> 'worked_with')::boolean, false)),
         bool_or(coalesce((t.tick ->> 'talked_to')::boolean, false)),
         bool_or(coalesce((t.tick ->> 'knew_before')::boolean, false))
    from jsonb_array_elements(v_ticks) as t(tick)
   group by (t.tick ->> 'to_person')::uuid
  having bool_or(coalesce((t.tick ->> 'worked_with')::boolean, false))
      or bool_or(coalesce((t.tick ->> 'talked_to')::boolean, false))
      or bool_or(coalesce((t.tick ->> 'knew_before')::boolean, false))
  on conflict (session_id, from_person, to_person) do update
    set worked_with = excluded.worked_with,
        talked_to = excluded.talked_to,
        knew_before = excluded.knew_before;

  delete from public.ticks d
   where d.session_id = p_session_id
     and d.from_person = p_person_id
     and not exists (
       select 1
         from jsonb_array_elements(v_ticks) as t(tick)
        where (t.tick ->> 'to_person')::uuid = d.to_person
          and (coalesce((t.tick ->> 'worked_with')::boolean, false)
            or coalesce((t.tick ->> 'talked_to')::boolean, false)
            or coalesce((t.tick ->> 'knew_before')::boolean, false))
     );

  -- created_at isn't set here, so it keeps the time of the first check-in.
  insert into public.answers (
    session_id, person_id, q4, q5, identification, felt_included, new_partner, easier_next_time,
    stayed_whole, first_time, worked_with_status, talked_to_status, knew_before_status, answered_at
  ) values (
    p_session_id,
    p_person_id,
    (v_answer ->> 'q4')::integer,
    (v_answer ->> 'q5')::integer,
    (v_answer ->> 'identification')::integer,
    (v_answer ->> 'felt_included')::integer,
    v_answer ->> 'new_partner',
    case when jsonb_typeof(v_answer -> 'easier_next_time') = 'array'
              and jsonb_array_length(v_answer -> 'easier_next_time') > 0
         then array(select distinct e.choice
                      from jsonb_array_elements_text(v_answer -> 'easier_next_time') as e(choice)
                     order by e.choice)
    end,
    coalesce(v_answer ->> 'stayed_whole', ''),
    coalesce(v_answer ->> 'first_time', ''),
    v_answer ->> 'worked_with_status',
    v_answer ->> 'talked_to_status',
    v_answer ->> 'knew_before_status',
    now()
  )
  on conflict (session_id, person_id) do update
    set q4 = excluded.q4,
        q5 = excluded.q5,
        identification = excluded.identification,
        felt_included = excluded.felt_included,
        new_partner = excluded.new_partner,
        easier_next_time = excluded.easier_next_time,
        stayed_whole = excluded.stayed_whole,
        first_time = excluded.first_time,
        worked_with_status = excluded.worked_with_status,
        talked_to_status = excluded.talked_to_status,
        knew_before_status = excluded.knew_before_status,
        answered_at = excluded.answered_at;

  if v_learning is not null then
    if v_learning_question is null then
      raise exception 'This session has no learning question.';
    end if;
    insert into public.learning_answers (session_id, person_id, question, answer, answered_at)
    values (p_session_id, p_person_id, v_learning_question, v_learning, now())
    on conflict (session_id, person_id) do update
      set question = excluded.question,
          answer = excluded.answer,
          answered_at = excluded.answered_at;
  else
    -- Skipped this time, so an earlier answer from this kid doesn't linger.
    delete from public.learning_answers
     where session_id = p_session_id and person_id = p_person_id;
  end if;
end;
$$;

-- The same for a check-in without a name. p_response_id comes from the
-- check-in screen, so retrying the same check-in updates it instead of
-- adding a second one.
create function public.save_anonymous_check_in(
  p_session_id uuid,
  p_response_id uuid,
  p_answer jsonb,
  p_learning_answer text default null
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_mode text;
  v_learning_question text;
  v_answer jsonb := coalesce(p_answer, '{}'::jsonb);
  v_learning text := nullif(btrim(coalesce(p_learning_answer, '')), '');
begin
  select g.check_in_mode, s.learning_question
    into v_mode, v_learning_question
    from public.sessions s
    join public.groups g on g.id = s.group_id
   where s.id = p_session_id;
  if not found then
    raise exception 'This session does not exist.';
  end if;
  if v_mode <> 'anonymous_survey' then
    raise exception 'This group checks in with names.';
  end if;
  if p_response_id is null or jsonb_typeof(v_answer) <> 'object' then
    raise exception 'The check-in is in the wrong format.';
  end if;
  if exists (
    select 1 from public.anonymous_answers a
     where a.id = p_response_id and a.session_id <> p_session_id
  ) then
    raise exception 'That check-in belongs to another session.';
  end if;

  insert into public.anonymous_answers (
    id, session_id, q4, q5, identification, felt_included, new_partner, easier_next_time,
    stayed_whole, first_time, answered_at
  ) values (
    p_response_id,
    p_session_id,
    (v_answer ->> 'q4')::integer,
    (v_answer ->> 'q5')::integer,
    (v_answer ->> 'identification')::integer,
    (v_answer ->> 'felt_included')::integer,
    v_answer ->> 'new_partner',
    case when jsonb_typeof(v_answer -> 'easier_next_time') = 'array'
              and jsonb_array_length(v_answer -> 'easier_next_time') > 0
         then array(select distinct e.choice
                      from jsonb_array_elements_text(v_answer -> 'easier_next_time') as e(choice)
                     order by e.choice)
    end,
    coalesce(v_answer ->> 'stayed_whole', ''),
    coalesce(v_answer ->> 'first_time', ''),
    now()
  )
  on conflict (id) do update
    set q4 = excluded.q4,
        q5 = excluded.q5,
        identification = excluded.identification,
        felt_included = excluded.felt_included,
        new_partner = excluded.new_partner,
        easier_next_time = excluded.easier_next_time,
        stayed_whole = excluded.stayed_whole,
        first_time = excluded.first_time,
        answered_at = excluded.answered_at;

  if v_learning is not null then
    if v_learning_question is null then
      raise exception 'This session has no learning question.';
    end if;
    insert into public.learning_answers (session_id, anonymous_answer_id, question, answer, answered_at)
    values (p_session_id, p_response_id, v_learning_question, v_learning, now())
    on conflict (anonymous_answer_id) do update
      set question = excluded.question,
          answer = excluded.answer,
          answered_at = excluded.answered_at;
  else
    delete from public.learning_answers where anonymous_answer_id = p_response_id;
  end if;
end;
$$;

grant execute on function public.save_check_in(uuid, uuid, jsonb, jsonb, text) to anon, authenticated;
grant execute on function public.save_anonymous_check_in(uuid, uuid, jsonb, text) to anon, authenticated;
