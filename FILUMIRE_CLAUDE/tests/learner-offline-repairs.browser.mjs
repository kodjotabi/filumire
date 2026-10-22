// Real learner PWA regression: EN/FR at mobile/desktop widths, queued-answer
// identity through offline language switches, one trusted result on reconnect.
// Run against the isolated memory-only server using FILUMIRE_TEST_URL and the
// existing FILUMIRE_PLAYWRIGHT_MODULE / FILUMIRE_CHROMIUM_PATH configuration.
process.env.FILUMIRE_NAVIGATION_ARTIFACTS ??= 'docs/audits/basic4-6-completion/technical-repairs/browser';
await import('../scripts/audit-basic4-6-offline.browser.mjs');
