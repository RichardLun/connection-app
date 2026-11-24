# Database setup

Richard looks after this folder. Subin doesn't need to touch it.

- The project is `connection-app` in the Throughline organization: https://supabase.com/dashboard/project/ngstaicldvasddmdypdp
- The tables are defined in `migrations/`. To change them, add a new migration and push it:

  ```
  npx supabase@2.119.0 migration new describe_the_change
  npx supabase@2.119.0 db push
  ```

- `db push` asks for the database password. It's in `.env.local` at the root of the repo, which is never committed.
- Access is wide open for now (see the end of the first migration). Lock it down before any real data goes in.
- Migrations so far:
  - `20261008101110_initial_schema.sql`: the six tables.
  - `20261120100629_next_steps_for_trials.sql`: group type, check-in mode and report privacy on groups; activity goal, learning question, question list, check-in timing, headcount and staff notes on sessions; new answer columns (identification, felt included, new partner, easier next time, named/none/skipped for each who-question, answered_at); `anonymous_answers` and `learning_answers`; the `save_check_in` and `save_anonymous_check_in` functions.
  - `20261123130356_next_steps_check_in_fixes.sql`: anonymous groups must be group-only, and `save_check_in` checks the who-answers match the names picked.
- Every migration so far only adds things (new columns have defaults or are empty, nothing is dropped or renamed), so the live site keeps working while a branch is tested against the same database.
- Check-ins are saved by calling `save_check_in` (or `save_anonymous_check_in`) with `supabase.rpc()`. Each runs as one transaction, so a check-in is saved completely or not at all. They run with the caller's rights, so they follow the same open policies as the tables.
