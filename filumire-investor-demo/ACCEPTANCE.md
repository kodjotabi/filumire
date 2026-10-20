# Accepted version — FILUMIRE offline investor demo

Accepted by the owner on 2026-10-20 after all five stages, including the
owner's own Wi-Fi-off acceptance run (every checklist step passed).

## Frozen build

| Item | Value |
|---|---|
| Learner source commit | `5459e405c4bc3f2b8539b59b93dcf8500f5444f1` (feat/teaching-first-phase1) |
| Built | 2026-10-20T22:26:53Z with Node v24.19.0 |
| Folder | `dist/FILUMIRE Demo/` (not in git) |
| Files (excluding `data/`) | 2,295 files, 225,310,746 bytes |
| Build fingerprint | `1ff68051e69a25744c9d47d45d9f0e3c8d03bda2a39253e504feda8725f14c0f` |

The fingerprint is SHA-256 over every file's path and SHA-256, sorted by path,
excluding `data/`. Check any copy with:

```
node filumire-investor-demo/verify-accepted.mjs "path/to/FILUMIRE Demo"
```

Key files in the accepted build (SHA-256):

| File | SHA-256 |
|---|---|
| `Start FILUMIRE Demo.cmd` | `266ab22dd3d20ae728e5a90f9e54708c9d6cd0ee5f9f015485ff6dbadffd3d44` |
| `READ ME FIRST.txt` | `b9dbe62f6510f0e7d02f074f9ccd8153635f30b535aea34ee824a077896cfc8d` |
| `launcher/launch.mjs` | `550853d4a3f145140685746494d438c018ee1e65b7878133a9a5fe7c210e7ff6` |
| `app/apps/learner/server.js` | `3e77e034367ad756f2ecdcec6a5ef060a88079956da5ace7258df87b0c70f91c` |
| `node/node.exe` | `3602f2bb1a10f2cbab4c36886218a33c1ab3db87290e73b033c46c77147d0237` |

The committed `launcher/` files and `overlay/` are byte-identical to what went
into this build. Rebuilding with `build-demo.mjs` from the same commit
reproduces the same app, but generated files (hashed chunk names, build IDs)
can differ, so a rebuild gets a new fingerprint and needs its own acceptance.

## What was accepted

- Portable folder started with `Start FILUMIRE Demo.cmd`; server on 127.0.0.1
  only; Edge app window; closing it saves and stops.
- Fictional learner picker without login: Ama (Basic 4, English), Kofi
  (Basic 5, French), Amina (Basic 6, English); guardian (Demo Family) and
  teacher (Mrs Mensah) views.
- All 867 topics in English/French, FILU explanations, corrections and one
  retry, drawings, Ask FILU (the app's own offline help), My Progress.
- Progress saved in `data/demo-state.json` across restarts; Reset demo.
- Read-aloud with device voices only (African first, then the device's own
  same-language voices), otherwise text-only.
- No public-website links; no database, account service, API or internet use.

## Not in git (by design)

`dist/` (the built demo, including `node.exe`), `.build/` (frozen working
copy), and everything in `data/`: saved progress, logs, the locally generated
session key and the Edge browser profile.
