import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readConversation, saveConversation, clearConversation, sendConversation, ConversationRequestError } from "../apps/learner/services/conversation-client";
import type { ConversationResponse } from "../packages/ai/conversation";
import { signIn, signOut, selectLearner } from "../apps/learner/services/account-client";

assert.equal(process.env.FILUMIRE_PERSISTENCE, "memory");
Object.assign(globalThis, { React });
const { FiluConversation } = await import("../apps/learner/components/filumire/FiluConversation");
const storage = new Map<string, string>();
Object.assign(globalThis, { window: { sessionStorage: { getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) },
  localStorage: { getItem: () => null, removeItem: () => {}, setItem: () => {} }, location: { search: "" }, dispatchEvent: () => true }, document: { cookie: "" } });
const body = { question: "My question", language: "en" as const, requestId: "original-request-id" };
const response: ConversationResponse = { messages: [{ role: "user", text: body.question, language: "en" }, { role: "assistant", text: "Prepared reply", language: "en" }],
  expiresAt: Date.now() + 60000, provider: "mock", assessmentProtected: false, historyToken: "opaque-signed-history" };
saveConversation({ scope: "a", expiresAt: response.expiresAt, response, pending: body });
assert.deepEqual(readConversation("a").pending, body, "navigation/refresh retry must keep the original request ID and language");
assert.equal(readConversation("a").response?.messages.length, 2);
assert.equal(readConversation("b").response, undefined); assert.equal(storage.size, 0, "another learner must clear the prior transcript");
saveConversation({ scope: "a", expiresAt: Date.now() + 60000, response });
assert.equal(readConversation("a", Date.now() + 70000).response, undefined);
saveConversation({ scope: "a", expiresAt: Date.now() + 60000, response }); clearConversation(); assert.equal(storage.size, 0);
storage.set("filumire.filuSessionConversation", JSON.stringify({ scope: "a", expiresAt: Date.now() + 60000, pending: { question: {}, requestId: "bad" } }));
assert.equal(readConversation("a").pending, undefined, "corrupted local history must not break rendering");
const headersSeen: RequestInit[] = [];
globalThis.fetch = async (_url, init) => { headersSeen.push(init!); return Response.json(response); };
assert.deepEqual(await sendConversation(body), response);
assert.equal(headersSeen[0].cache, "no-store"); assert.equal(headersSeen[0].credentials, "same-origin");
assert.equal(JSON.parse(headersSeen[0].body as string).requestId, body.requestId);
globalThis.fetch = async () => { throw new Error("network"); };
await assert.rejects(() => sendConversation(body), (error) => error instanceof ConversationRequestError && error.code === "network");
globalThis.fetch = async () => Response.json({ code: "rate_limited" }, { status: 429, headers: { "Retry-After": "5" } });
await assert.rejects(() => sendConversation(body), (error) => error instanceof ConversationRequestError && error.retryAfterSeconds === 5);
globalThis.fetch = async () => Response.json({ code: "unauthenticated" }, { status: 401 });
await assert.rejects(() => sendConversation(body), (error) => error instanceof ConversationRequestError && error.status === 401);
globalThis.fetch = async () => Response.json({ accountKind: "learner", learnerId: "a" });
for (const action of [() => signIn("fictional", "fictional"), () => selectLearner("b"), () => signOut()]) {
  saveConversation({ scope: "a", expiresAt: Date.now() + 60000, response });
  await action(); assert.equal(storage.size, 0, "sign-in, sign-out and learner changes clear browser conversation history");
}
for (const language of ["en", "fr"] as const) {
  const html = renderToStaticMarkup(React.createElement(FiluConversation, { language, scope: "a" }));
  assert.match(html, /<textarea[^>]*id="filu-question"/); assert(!/<textarea[^>]*disabled/.test(html));
  assert.match(html, /role="log"/); assert.match(html, /aria-live="polite"/); assert.match(html, /maxLength="1000"/i);
  assert.match(html, /<label for="filu-question"/); assert.match(html, /type="submit"/);
  assert.match(html, language === "fr" ? /Envoyer/ : /Send/);
  assert.match(html, language === "fr" ? /contenu de tes leçons/ : /lesson materials/);
}
console.log("PASS: session-only refresh/navigation continuity, isolation, expiry, network/retry errors and bilingual accessible composition");
