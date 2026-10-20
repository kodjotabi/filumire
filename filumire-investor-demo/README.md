# FILUMIRE investor demo (offline, Windows)

A portable, fully offline copy of the FILUMIRE learner app for investor
demonstrations on the owner's laptop. It is separate from the live learner
app, the website, Production and Vercel. Instructions for running it are in
`launcher/READ ME FIRST.txt`, which ships at the top of the built folder.

## How it is built

`build-demo.mjs` freezes one learner commit with `git archive` into `.build/`,
applies `overlay/` and a few checked patches to that copy only, builds it, and
assembles `dist/FILUMIRE Demo/`:

```
FILUMIRE Demo/
  Start FILUMIRE Demo.cmd   double-click to start
  READ ME FIRST.txt         how to use the demo
  node/node.exe             bundled runtime
  app/                      built learner app (in-memory mode, no database)
  launcher/launch.mjs       starts the server on 127.0.0.1 and opens an Edge app window
  data/                     made on first start: saved progress, session key, logs, browser profile
  build-info.json           frozen commit, build time, size
```

Build (needs the repo's installed dependencies, and internet once for fonts):

```
node filumire-investor-demo/build-demo.mjs            # default frozen commit
node filumire-investor-demo/build-demo.mjs <commit>   # another commit
```

Rebuilding keeps `data/`. Close the demo first.

## What the demo adds (overlay and patches; demo copy only)

- `app/demo` — learner picker (Ama B4 EN, Kofi B5 FR, Amina B6 EN), guardian
  and teacher (Mrs Mensah) entries, Reset demo.
- `app/api/demo/start` — creates the fictional family with the app's own
  account functions and signs in as the choice. `app/api/demo/state` — save
  now / reset. Both answer 404 unless the launcher set `FILUMIRE_DEMO=1`.
- `demo-state.ts` + `instrumentation.ts` — saves the in-memory stores to
  `data/demo-state.json` and restores them at start-up.
- `middleware.ts` — `/`, `/login`, `/register` lead to the picker.
- Patches: demo banner in the layout, no public-website links, the progress
  store's maps exposed to the save step.

## Rules

- No database, live authentication, API or internet dependency at runtime.
- The server listens on 127.0.0.1 only.
- Read-aloud uses device voices only (African first, then the device's own
  same-language voices); otherwise text-only. No online voices.
- FILU is the app's own offline lesson-based help; nothing is simulated.
- The build refuses to finish if `.env` files or credentials would ship.

## Status

All five stages passed (frozen learner commit `5459e405`), including the
owner's own Wi-Fi-off acceptance run on 2026-10-20. The accepted build and its
fingerprint are recorded in `ACCEPTANCE.md`; `verify-accepted.mjs` checks a
copy against it.
