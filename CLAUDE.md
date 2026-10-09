# FILUMIRE_CLAUDE: standing rules

- Work only inside FILUMIRE_CLAUDE. Never read from or write to FILUMIRE_CORE.
- Files on disk are the source of truth; verify before changing code.
- Do not stage files, change staging state, or commit to Git.
- Back up edited production files in the established handoff backup structure.
- Preserve the shared FILUMIRE architecture; engine fixes are shared, not subject-specific.
- Never weaken mastery thresholds or tests to get a pass.
- Out of scope unless asked: UI redesign, payments, deployment, pilot configuration.
- Handoff: docs/handoff/ENGLISH_NEXT_SESSION.md. Keep it current-state only; history goes to an archive file.

## Credit discipline
- Write test/build/validation output to a log file; show only the summary and failures.
- Between steps run targeted + directly affected tests only; full suite, production build,
  TypeScript check and auth/security checks once at the end of a tranche.
- No subagents unless asked.
- If approaching usage limits: stop at the end of the current step, make sure the code compiles
  and targeted tests pass, update the handoff, then stop.
- Final reports: under 40 lines; details go in the handoff.
