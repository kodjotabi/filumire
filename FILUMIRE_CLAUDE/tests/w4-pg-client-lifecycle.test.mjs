// W4: the REAL node-postgres client against a fake PostgreSQL backend bound to 127.0.0.1 only.
// No database, Neon, env file or credential is used. Transaction-control statements cross the real
// socket; catalog reads come from the shared fake client. A connection loss must end in the
// structured sanitized report, never an unhandled 'error' event and a raw stack trace.
import assert from "node:assert/strict";
import net from "node:net";
import pg from "pg";
import { fakeClient, manifest, profile } from "./helpers/w4-fake-client.mjs";
import { checkTarget } from "../scripts/apply-migrations.mjs";
import { dryRun, execute } from "../scripts/create-app-role.mjs";
import { dryRunGrants, executeGrants, APPROVED_SQL_SHA256 } from "../scripts/apply-app-role-grants.mjs";
import { reportCli, withClient } from "../scripts/w4-safety.mjs";

let checks = 0;
const OWNER_URL = `postgresql://neondb_owner:fictional-owner@${profile.host}/neondb?sslmode=verify-full`;
const target = checkTarget(OWNER_URL, profile.host, "neondb", profile);
const output = { envOut: "/fictional/.env.preview-app.local", varName: "FILUMIRE_PREVIEW_APP_URL", ownerUrl: OWNER_URL };
const createCode = (await dryRun(fakeClient(), manifest, target, profile)).approvalCode;
const grantOptions = { pin: "filumire-preview", url: OWNER_URL, sqlHash: APPROVED_SQL_SHA256 };
const grantFake = extra => fakeClient({ roleExists: true, others: "filumire_app", ...extra });
grantOptions.approval = (await dryRunGrants(grantFake(), manifest, grantOptions)).approvalCode;

// ---- Minimal protocol-3 backend: trust auth, simple queries only.
const frame = (type, body) => { const h = Buffer.alloc(5); h.write(type); h.writeInt32BE(body.length + 4, 1); return Buffer.concat([h, body]); };
const cstr = text => Buffer.from(`${text}\0`);
const ready = status => frame("Z", Buffer.from(status));
const complete = tag => frame("C", cstr(tag));
const failure = (severity, code) => frame("E", Buffer.concat(
  [cstr(`S${severity}`), cstr(`V${severity}`), cstr(`C${code}`), cstr("Mfictional private server detail"), Buffer.from([0])]));

function backend(onCommit) {
  const state = { received: [], socket: null };
  state.server = net.createServer(socket => {
    state.socket = socket;
    let buffer = Buffer.alloc(0), started = false;
    socket.on("error", () => {});
    socket.on("data", data => {
      buffer = Buffer.concat([buffer, data]);
      for (;;) {
        if (!started) {
          if (buffer.length < 4 || buffer.length < buffer.readInt32BE(0)) return;
          buffer = buffer.subarray(buffer.readInt32BE(0)); started = true;
          socket.write(Buffer.concat([frame("R", Buffer.alloc(4)), ready("I")])); continue;
        }
        if (buffer.length < 5 || buffer.length < buffer.readInt32BE(1) + 1) return;
        const type = String.fromCharCode(buffer[0]), body = buffer.subarray(5, buffer.readInt32BE(1) + 1);
        buffer = buffer.subarray(buffer.readInt32BE(1) + 1);
        if (type === "X") { socket.end(); return; }
        const sql = body.toString("utf8").replace(/\0$/, "");
        state.received.push(sql);
        if (sql === "BEGIN") socket.write(Buffer.concat([complete("BEGIN"), ready("T")]));
        else if (sql === "ROLLBACK") socket.write(Buffer.concat([complete("ROLLBACK"), ready("I")]));
        else if (sql === "COMMIT") onCommit(socket);
        else socket.write(Buffer.concat([...sql.split(";").map(() => complete("SET")), ready("T")]));
      }
    });
  });
  // Server-initiated termination while the client is idle in the transaction (e.g. idle timeout).
  state.terminateIdle = () => new Promise(resolve => {
    state.socket.once("close", () => setTimeout(resolve, 50));
    state.socket.end(failure("FATAL", "25P03"));
  });
  return state;
}

const commitReplies = {
  committed: s => s.write(Buffer.concat([complete("COMMIT"), ready("I")])),
  // The reset itself is driven by run() only after the client has received this acknowledgment.
  committedThenReset: s => s.write(Buffer.concat([complete("COMMIT"), ready("I")])),
  rollbackTag: s => s.write(Buffer.concat([complete("ROLLBACK"), ready("I")])),
  serverError: s => s.write(Buffer.concat([failure("ERROR", "XX000"), ready("I")])),
  fatalThenClose: s => s.end(failure("FATAL", "57P01")),
  reset: s => s.resetAndDestroy(),
  closeWithoutReply: s => s.end(),
};

const ROUTED = /^(BEGIN|COMMIT|ROLLBACK|SET )/;
async function run(kind, commitReply, { idleKill = false } = {}) {
  const server = backend(commitReplies[commitReply]);
  await new Promise(resolve => server.server.listen(0, "127.0.0.1", resolve));
  const client = new pg.Client({ connectionString: `postgresql://fictional@127.0.0.1:${server.server.address().port}/fictional`, ssl: false });
  assert.equal(client.listenerCount("error"), 0); // The lifecycle under test must install its own listener.
  const fake = kind === "create" ? fakeClient() : grantFake();
  const socketQuery = client.query.bind(client);
  if (idleKill && kind === "grants") {
    const fakeQuery = fake.query;
    fake.query = async (sql, params) => {
      const result = await fakeQuery(sql, params);
      if (sql.startsWith("-- Least-privilege grants")) await server.terminateIdle();
      return result;
    };
  }
  // Post-COMMIT loss: the client has resolved the COMMIT reply, then the server resets the socket while
  // the client is still connected (before withClient's end()). The action sees the ack only once the
  // client has observed the loss, so teardown runs against a genuinely dead connection.
  const events = [];
  client.query = async (sql, params) => {
    if (!ROUTED.test(sql)) return fake.query(sql, params);
    const result = await socketQuery(sql, params);
    if (sql === "COMMIT" && commitReply === "committedThenReset") {
      events.push(`ack:${result.command}`);
      assert(server.socket && !server.socket.destroyed, "server socket alive at reset");
      assert(!client._ending && !client.connection.stream.destroyed, "client still active at reset");
      const lost = new Promise(resolve => {
        client.once("error", () => events.push("client:error"));
        client.connection.stream.once("close", () => { events.push("client:closed"); resolve(); });
      });
      events.push("server:reset"); server.socket.resetAndDestroy();
      await lost;
    }
    return result;
  };
  const removed = [];
  const io = { random: n => Buffer.alloc(n, 7), remove: path => removed.push(path),
    write: async (path, text, created) => { created(); if (idleKill) await server.terminateIdle(); } };
  const emitted = [];
  const action = kind === "create" ? () => execute(client, manifest, target, createCode, profile, output, io)
    : () => executeGrants(client, manifest, grantOptions);
  let timer;
  const exit = await Promise.race([
    reportCli(() => withClient(client, action), { emit: report => emitted.push(report) }),
    new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`${kind}/${commitReply} hung`)), 5000); }),
  ]);
  clearTimeout(timer);
  server.socket?.destroy(); await new Promise(resolve => server.server.close(resolve));
  const text = JSON.stringify(emitted);
  for (const leak of ["fictional private", "ECONNRESET", "terminated", "127.0.0.1", "fictional-owner", "postgres"]) assert(!text.includes(leak), `${leak} leaked`);
  assert.equal(emitted.length, 1);
  return { exit, report: emitted[0], removed, received: server.received, events };
}

const UNKNOWN = { refused: "transaction_outcome_unknown", outcome: "unknown", rolledBack: false };
for (const kind of ["create", "grants"]) {
  const retained = kind === "create" ? { credentialRetained: true, envFileRemoved: false } : { credentialRetained: false };
  let clean;
  {
    const r = await run(kind, "committed");
    assert.equal(r.exit, 0); assert.equal(r.report.mode, "execute"); assert.deepEqual(r.removed, []); clean = r.report; checks++;
  }
  { // Loss after an acknowledged COMMIT never downgrades a confirmed outcome.
    const r = await run(kind, "committedThenReset");
    assert.deepEqual(r.events, ["ack:COMMIT", "server:reset", "client:error", "client:closed"]);
    assert.equal(r.exit, 0); assert.deepEqual(r.report, clean); // Same success report as an undisturbed COMMIT.
    assert.deepEqual(r.removed, []); assert(!r.received.includes("ROLLBACK")); checks++;
  }
  {
    const r = await run(kind, "rollbackTag");
    assert.equal(r.exit, 1);
    assert.deepEqual([r.report.refused, r.report.outcome, r.report.reason], ["w4_transaction_failed", "rolled_back", "commit_rolled_back"]);
    if (kind === "create") { assert.equal(r.report.credentialRetained, false); assert.deepEqual(r.removed, [output.envOut]); }
    assert(!r.received.includes("ROLLBACK")); checks++;
  }
  for (const reply of ["serverError", "fatalThenClose", "reset", "closeWithoutReply"]) {
    const r = await run(kind, reply);
    assert.equal(r.exit, 1, reply);
    assert.deepEqual({ refused: r.report.refused, outcome: r.report.outcome, rolledBack: r.report.rolledBack }, UNKNOWN, reply);
    for (const [key, value] of Object.entries(retained)) assert.equal(r.report[key], value, `${reply} ${key}`);
    assert.deepEqual(r.removed, []); assert.equal(r.report.reason, undefined, reply);
    assert(!r.received.includes("ROLLBACK"), reply);
    // Only a lost transport (not a delivered ErrorResponse) sets connectionLost.
    assert.equal(r.report.connectionLost, ["reset", "closeWithoutReply"].includes(reply) ? true : undefined, reply); checks++;
  }
  { // Terminated while idle in the transaction, before COMMIT could be sent: conservatively unknown, retained.
    const r = await run(kind, "committed", { idleKill: true });
    assert.equal(r.exit, 1);
    assert.deepEqual({ refused: r.report.refused, outcome: r.report.outcome, rolledBack: r.report.rolledBack }, UNKNOWN);
    for (const [key, value] of Object.entries(retained)) assert.equal(r.report[key], value, key);
    assert.equal(r.report.connectionLost, true); assert(!r.received.includes("COMMIT")); assert.deepEqual(r.removed, []); checks++;
  }
}

console.log(`PASS: W4 real pg client lifecycle - ${checks} offline checks (localhost fake backend)`);
