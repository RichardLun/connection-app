# Connected-TBD

A web app that helps youth group leaders see whether the kids in their group are connecting. At the end of a session, each kid checks in on their own phone by scanning a QR code, or on the leader's phone if they don't have one. The leader then sees who connected with whom, and who might need help. Data is saved to a Supabase database.

The guides are in `docs/`. Read them in this order:

1. [docs/onboarding.md](docs/onboarding.md): getting set up
2. [docs/outline.md](docs/outline.md): what we're building, and how we'll work
3. [docs/build-steps.md](docs/build-steps.md): building the backend, step by step
4. [docs/frontend-steps.md](docs/frontend-steps.md): building the screens, and testing the whole app

## Running it

```
npm run dev    # run the app on your computer
npm test       # run the tests
```

Every branch you push gets a preview link from Vercel, which shows up on its pull request.

## AI overviews (Richard maintains this)

Results and Compare have an **Explain these results** button. It asks Claude for
a short overview, something to watch, and one idea for the next session. The
calculations remain in `core/`; AI only explains their outputs.

To connect it, add `ANTHROPIC_API_KEY` to the connection-app project's Vercel
environment settings and redeploy. Until then, the button explains that AI is
not connected, and the normal reports still work. The key is used only by
`api/overview.js`, never sent to the browser or committed.

Only validated group-level counts and averages are sent to Anthropic. No names,
group or person IDs, raw ticks, individual answers, or free-text notes are sent.
Overviews are generated on demand, not on every page load. Successful results
and simultaneous duplicate requests are cached within a running function.
The function limits output length, times out stalled requests, and has
best-effort per-instance concurrency and request limits. These are not a
global spending cap or a replacement for leader authentication.

For local testing with the API, use `npm run dev:ai` (requires the Vercel CLI).
`npm run dev` still runs the static screens, but not the server endpoint.
Use Vercel's environment settings or a gitignored local environment file for
the key. The current model is `claude-haiku-5-5`.
