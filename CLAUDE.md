# Notes for Claude Code

This is a learning project. Subin is new to programming. She's building this app one step at a time: the backend from `docs/build-steps.md` (finished), then the screens from `docs/frontend-steps.md`. Richard reviews every pull request.

## How to work with her

- Only work on the step she asks about. Don't start the next one or touch unrelated files.
- Before changing anything, explain your plan in plain language, and wait for her to say go ahead.
- Explain things simply. After a change, describe what each new function does in a sentence or two.
- Keep the code short and readable. Comments should explain why, not what.
- If the doc seems wrong or unclear, say so instead of guessing.
- When a step says she should write something herself, review her code instead of rewriting it.

## Project setup (Richard maintains this part)

- **Code style.** Plain JavaScript with ES modules. No framework and no build step.
- **Database.** Supabase. Import the client from `lib/supabase.js`. The tables are defined in `supabase/migrations/`. Don't change `lib/`, `supabase/`, `serve.json`, the database tables or the Vercel settings. If something there needs to change, tell Subin to ask Richard.
- **`core/` is the backend.** `core/data.js` talks to the database. The other files in `core/` do calculations: they must not import anything from `lib/` or `core/data.js`, or touch the page, so that Node can test them.
- **`ui/` holds the screens.** Each screen is `ui/<name>.html` for the layout and `ui/<name>.js` for the code. Screens load data with `core/data.js`, and get every number from the other `core/` files, so the maths stays in one tested place.
- **Building pages.** Use the helpers in `ui/app.js`: `el()` and `svgEl()` to make elements, `showError()` when something fails, and `formatNumber()` to round numbers for the screen. For the check-in QR code, use `qrCode()` from `ui/qr.js` with a link from `fullUrl()`. `el()` puts text in as plain text, so names always show exactly as typed. Don't write HTML strings into `innerHTML`. Shared styles go in `ui/style.css`.
- **The check-in screen** (`ui/checkin.html` and `ui/checkin.js`) and the QR code (`ui/qr.js`) are finished and tested (Richard updated the check-in in November 2026 for the next-steps work). Don't change them. If they seem to need a change, tell Subin to ask Richard.
- **Tests** use Node's built-in test runner (`node:test` and `node:assert/strict`), and live in `tests/`. Run them with `npm test`.
- **Numbers.** Keep them at full precision, and only round when showing them on screen.
- **Questions.** Every question kids can be asked is in `core/questions.js`: wording, answer options, scoring, kind and source. Screens, reports and exports read it from there, so never type a question's wording into a screen. Once a session has asked a question, its wording, options and scoring never change; a changed question gets a new id. `docs/question-labels.md` explains the rules.
- **Keep kinds apart.** Interaction, belonging, learning, activity feedback and context results are shown separately, each with its kind (`kindTag()` in `ui/app.js`). Never add answers from different questions into one score.
- **Skipped isn't "nobody".** A skipped answer stays `null` (or `""` for the yes/no context questions). Never turn it into 0, "no" or "nobody". A kid with no links is only "no reported connections" if they answered the who-questions; otherwise they're unknown (`core/network.js`).
- **Privacy.** Before showing a kid's name next to a result, check `showsIndividuals(group)` from `core/settings.js`. Group-only groups never show names or flags on results, compare or the report. Exports (`core/exports.js`) never include names or ids, whatever the setting.
- **Group settings and the report.** `core/settings.js` has the group type, check-in mode, report privacy and timing choices. `core/responses.js` says which check-ins count, `core/report.js` builds the group report, and `core/exports.js` makes the CSV and Gephi files. `docs/trials.md` explains how they fit together.
- **AI overviews** are Richard's part: `core/overview.js`, `api/overview.js` and `ui/overview.js`. They explain existing numbers; they never replace the calculations. Leave them alone while building the welcome and tips screens.
