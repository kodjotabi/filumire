// Investor demo only: restore saved demo progress when the server starts.
// The NEXT_RUNTIME check must wrap the import so the edge build leaves it out.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startDemoState } = await import("./demo-state");
    if (process.env.FILUMIRE_DEMO === "1") startDemoState();
  }
}
