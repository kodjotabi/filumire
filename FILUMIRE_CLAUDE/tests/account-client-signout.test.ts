import assert from "node:assert/strict";
import { signOut, AccountRequestError } from "../apps/learner/services/account-client";

const removed: string[] = [];
Object.defineProperty(globalThis, "window", { configurable: true, value: {
  localStorage: { removeItem: (key: string) => removed.push(key) },
  dispatchEvent: () => true,
} });
const realFetch = globalThis.fetch;
try {
  globalThis.fetch = async () => { throw new Error("offline"); };
  await assert.rejects(signOut(), (error: unknown) => error instanceof AccountRequestError && error.code === "network");
  assert.equal(removed.length, 0, "offline sign-out keeps the local session visible");
  globalThis.fetch = async () => new Response(JSON.stringify({ code: "server_error" }), { status: 500 });
  await assert.rejects(signOut(), (error: unknown) => error instanceof AccountRequestError && error.status === 500);
  assert.equal(removed.length, 0, "failed revocation must not pretend the device is signed out");
  for (const status of [200, 401]) {
    globalThis.fetch = async () => new Response(JSON.stringify({ revoked: status === 200 }), { status });
    await signOut();
    assert(removed.includes("filumire.learnerName"), "successful or expired session clears learner details");
    removed.length = 0;
  }
  console.log({ accountClientSignout: "PASS", checks: 4 });
} finally {
  globalThis.fetch = realFetch;
  Reflect.deleteProperty(globalThis, "window");
}
