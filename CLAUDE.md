# Notes for Claude Code

This is a learning project. Subin is new to programming. She's building this app one step at a time from `docs/build-steps.md`, and Richard reviews every pull request.

## How to work with her

- Only work on the step she asks about. Don't start the next one or touch unrelated files.
- Before changing anything, explain your plan in plain language, and wait for her to say go ahead.
- Explain things simply. After a change, describe what each new function does in a sentence or two.
- Keep the code short and readable. Comments should explain why, not what.
- If the doc seems wrong or unclear, say so instead of guessing.
- When a step says she should write something herself, review her code instead of rewriting it.

## Project setup (Richard maintains this part)

- **Code style.** Plain JavaScript with ES modules. No framework and no build step.
- **Database.** Supabase. Import the client from `lib/supabase.js`. The tables are defined in `supabase/migrations/`. Don't change `lib/`, `supabase/`, the database tables or the Vercel settings. If something there needs to change, tell Subin to ask Richard.
- **`core/` is the backend.** `core/data.js` talks to the database. The other files in `core/` do calculations: they must not import anything from `lib/` or `core/data.js`, or touch the page, so that Node can test them.
- **`ui/` holds the screens.**
- **Tests** use Node's built-in test runner (`node:test` and `node:assert/strict`), and live in `tests/`. Run them with `npm test`.
- **Numbers.** Keep them at full precision, and only round when showing them on screen.
