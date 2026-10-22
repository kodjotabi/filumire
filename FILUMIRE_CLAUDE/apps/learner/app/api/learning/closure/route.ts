import { resolveRequestIdentity } from "../../../../../../services/identity";
import { getLessonClosure, LessonClosureError } from "../../../../../../services/lesson-closure";
import { assertSameOrigin, BadRequestError } from "../../account/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function json(body: unknown, status = 200) { return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } }); }
/** POST transports the receipt without putting it in URLs/logs; it is read-only. */
export async function POST(request: Request) {
  try {
    // Use the same Host-aware origin policy as the account routes: Next's
    // internal URL may say localhost when the browser connects to 127.0.0.1.
    try { assertSameOrigin(request); }
    catch (error) { if (error instanceof BadRequestError) return json({ code: "invalid_origin" }, 403); throw error; }
    let identity;
    try { identity = await resolveRequestIdentity(request); } catch { return json({ code: "unauthenticated" }, 401); }
    if (!request.headers.get("content-type")?.startsWith("application/json")) return json({ code: "invalid_request" }, 400);
    const reader = request.body?.getReader();
    if (!reader) return json({ code: "invalid_request" }, 400);
    let size = 0; const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.length; if (size > 8192) { await reader.cancel(); return json({ code: "request_too_large" }, 413); }
      chunks.push(value);
    }
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!body || Object.keys(body).some((key) => !["receipt", "language"].includes(key)) || typeof body.receipt !== "string" || !["en", "fr"].includes(body.language)) return json({ code: "invalid_request" }, 400);
    return json(await getLessonClosure(identity.learnerId, body.receipt, body.language));
  } catch (error) {
    if (error instanceof LessonClosureError) return json({ code: error.code }, error.status);
    if (error instanceof SyntaxError) return json({ code: "invalid_request" }, 400);
    return json({ code: "closure_unavailable" }, 503);
  }
}
