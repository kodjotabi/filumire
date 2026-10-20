import { errorResponse, json, readJsonBody, withSessionCookies } from "../../account/http";

/*
 * Investor demo only. "save" writes demo progress to disk now (the launcher
 * calls it before stopping); "reset" returns the demo to its empty starting
 * point and signs the browser out. Refuses unless FILUMIRE_DEMO=1.
 */
const shared = globalThis as { __filumireDemoState?: { save: () => void; reset: () => void } };

export async function POST(request: Request) {
  try {
    const state = shared.__filumireDemoState;
    if (process.env.FILUMIRE_DEMO !== "1" || !state) return json({ error: "Not available." }, { status: 404 });
    const { action } = await readJsonBody(request);
    if (action === "save") { state.save(); return json({ saved: true }); }
    if (action === "reset") { state.reset(); return withSessionCookies(json({ reset: true }), null); }
    return json({ error: "Unknown action." }, { status: 400 });
  } catch (error) {
    return errorResponse(error, "demo state");
  }
}
