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
