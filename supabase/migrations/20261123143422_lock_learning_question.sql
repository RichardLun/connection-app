-- Keeps every learning answer under the question it was given. Strictly
-- additive: a new trigger, and the two save functions with one change each.
-- No data is changed.

-- The learning question can't change once anyone has checked in, so everyone
-- who answers it was asked the same thing. The session screen locks the box
-- too; this also catches a screen that was opened before the first kid
-- checked in. Saving the same wording again is fine.
create function public.lock_learning_question()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.learning_question is distinct from old.learning_question and (
    exists (select 1 from public.answers a where a.session_id = old.id)
    or exists (select 1 from public.anonymous_answers a where a.session_id = old.id)
  ) then
    raise exception 'Kids have started checking in, so the learning question can''t change now.';
  end if;
  return new;
end;
$$;

create trigger sessions_lock_learning_question
  before update of learning_question on public.sessions
  for each row execute function public.lock_learning_question();

-- The same as before (20261123130356_next_steps_check_in_fixes), except a
-- learning answer for a session whose question was cleared is dropped instead
-- of failing the whole check-in. The question can only be cleared before the
-- first check-in, but a kid may have opened the check-in while it was there.
-- With no question nothing was asked, so an earlier answer is left as it is.
create or replace function public.save_check_in(
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
  v_relation text;
  v_status text;
  v_named boolean;
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
  if v_mode = 'names_survey' and (
    jsonb_array_length(v_ticks) > 0
    or v_answer ->> 'worked_with_status' is not null
    or v_answer ->> 'talked_to_status' is not null
    or v_answer ->> 'knew_before_status' is not null
  ) then
    raise exception 'This group does not ask who kids worked with or talked to.';
  end if;
  -- "named" has to match the names picked: at least one for "named", none
  -- for "nobody" or "skipped". Null means the question wasn't asked this
  -- time (knew before is only asked once), so the earlier picks are kept.
  foreach v_relation in array array['worked_with', 'talked_to', 'knew_before'] loop
    v_status := v_answer ->> (v_relation || '_status');
    v_named := exists (
      select 1 from jsonb_array_elements(v_ticks) as t(tick)
       where coalesce((t.tick ->> v_relation)::boolean, false)
    );
    if (v_status = 'named' and not v_named) or (v_status in ('none', 'skipped') and v_named) then
      raise exception 'The answer to % does not match the names picked.', v_relation;
    end if;
  end loop;

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

  if v_learning_question is null then
    -- The question was cleared after this kid opened the check-in, so there
    -- is nothing to answer: the answer is dropped and the rest still saves.
    null;
  elsif v_learning is not null then
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

-- The same as before (20261120100629_next_steps_for_trials), with the same
-- change.
create or replace function public.save_anonymous_check_in(
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

  if v_learning_question is null then
    -- As in save_check_in: a cleared question drops the answer, not the
    -- whole check-in.
    null;
  elsif v_learning is not null then
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

-- Lets the API see the change straight away.
notify pgrst, 'reload schema';
