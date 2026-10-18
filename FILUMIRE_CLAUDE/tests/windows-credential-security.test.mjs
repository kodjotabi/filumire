// No database or real credentials. The Windows integration cases use fictional
// contents in a unique temp directory; no directory ACL is changed, even for tests.
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { PassThrough, Writable } from "node:stream";
import { mkdtempSync, readFileSync, unlinkSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, basename, resolve, win32 } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { writeWindowsCredential } from "../scripts/windows-credential.mjs";
import { writeCredential, reportCli } from "../scripts/w4-safety.mjs";
import { dryRun, execute } from "../scripts/create-app-role.mjs";
import { fakeClient, manifest, profile } from "./helpers/w4-fake-client.mjs";

let checks = 0;
const OWNER = "S-1-5-21-111-222-333-1001";
const protectedEvent = event => ({ event, protected: true, ownerSid: OWNER, principals: [OWNER, "S-1-5-18"] });
const TEXT = "FICTIONAL=test-only\n";
const PATH = "C:\\fictional\\.env.security-test.local";

function fakeProcess(scenario = "secure") {
  const trace = { inputs: [], argv: [], options: null, killed: false, payloadBeforeReady: false };
  trace.spawn = (exe, argv, options) => {
    trace.argv = argv; trace.options = options;
    const child = new EventEmitter(); child.stdout = new PassThrough(); child.stderr = new PassThrough();
    let input = "", ready = false, closed = false;
    const send = e => child.stdout.write(JSON.stringify(e) + "\n");
    const close = code => { if (!closed) { closed = true; child.emit("close", code); } };
    child.kill = () => { trace.killed = true; setImmediate(() => close(1)); return true; };
    child.stdin = new Writable({ write(chunk, encoding, callback) {
      input += chunk.toString();
      let nl;
      while ((nl = input.indexOf("\n")) >= 0) {
        const message = JSON.parse(input.slice(0, nl)); input = input.slice(nl + 1); trace.inputs.push(message);
        if (message.text !== undefined) {
          trace.payloadBeforeReady ||= !ready;
          setImmediate(() => {
            if (scenario === "close-after-write") return close(1);
            if (scenario === "write-failed") return send({ event: "failed", code: "credential_write_failed" });
            send(protectedEvent("complete")); close(0);
          });
        } else setImmediate(() => {
          if (scenario === "spawn-error") { child.emit("error", new Error("private diagnostic")); return; }
          if (scenario === "create-failed") return send({ event: "failed", code: "credential_create_failed" });
          if (scenario === "protocol-error") return send(protectedEvent("complete"));
          if (scenario === "silent") return;
          send({ event: "created" });
          if (scenario === "verification-failed") return send({ event: "failed", code: "credential_acl_verification_failed" });
          const message = protectedEvent("ready");
          if (scenario === "inherited") message.protected = false;
          if (scenario === "extra-principal") message.principals.push("S-1-5-32-545");
          if (scenario === "bad-owner") message.ownerSid = "S-1-5-18";
          ready = true; send(message);
        });
      }
      callback();
    } });
    return child;
  };
  return trace;
}

// Enforce handshake order: no payload leaves Node until creation and ACL verification.
{
  const p = fakeProcess(); let created = 0;
  await writeWindowsCredential(PATH, TEXT, () => { created++; }, { spawnProcess: p.spawn });
  assert.equal(created, 1); assert.deepEqual(p.inputs, [{ path: PATH }, { text: TEXT }]);
  assert.equal(p.payloadBeforeReady, false); assert(!p.argv.join(" ").includes(TEXT));
  assert(!JSON.stringify(p.options.env).includes(TEXT)); assert.equal(p.options.windowsHide, true);
  assert(!p.argv.includes("-ExecutionPolicy")); checks++;
}
for (const scenario of ["spawn-error", "create-failed", "protocol-error", "verification-failed", "inherited", "extra-principal", "bad-owner", "silent"]) {
  const p = fakeProcess(scenario);
  await assert.rejects(() => writeWindowsCredential(PATH, TEXT, () => {}, { spawnProcess: p.spawn, timeoutMs: scenario === "silent" ? 10 : 2000 }),
    e => e.code === "windows_credential_protection_failed" && !JSON.stringify(e).includes(TEXT));
  assert(!p.inputs.some(x => "text" in x)); checks++;
}
for (const scenario of ["write-failed", "close-after-write"]) {
  const p = fakeProcess(scenario); let created = false;
  await assert.rejects(() => writeWindowsCredential(PATH, TEXT, () => { created = true; }, { spawnProcess: p.spawn }), e => e.code === "windows_credential_protection_failed");
  assert(created); assert(!p.payloadBeforeReady); checks++;
}

// Windows enforcement failures flow through the real W4 rollback/cleanup boundary.
const target = { host: profile.host, database: profile.database, pinned: profile.name };
const ownerUrl = `postgresql://neondb_owner:fictional@${profile.host}/neondb?sslmode=verify-full`;
const output = { envOut: PATH, varName: "FILUMIRE_PREVIEW_APP_URL", ownerUrl };
const approval = (await dryRun(fakeClient(), manifest, target, profile)).approvalCode;
for (const cleanupFails of [false, true]) {
  const p = fakeProcess("verification-failed"), client = fakeClient(), reports = [], removed = [];
  const status = await reportCli(() => execute(client, manifest, target, approval, profile, output, {
    write: (path, text, created) => writeWindowsCredential(path, text, created, { spawnProcess: p.spawn }),
    remove: path => { if (cleanupFails) throw new Error("private cleanup details"); removed.push(path); },
  }), { emit: r => reports.push(r) });
  assert.equal(status, 1); assert(!client.sql.includes("COMMIT")); assert.equal(reports[0].rolledBack, true);
  assert.equal(reports[0].cleanupFailed, cleanupFails); assert.equal(reports[0].credentialRetained, cleanupFails);
  assert.equal(removed.length, cleanupFails ? 0 : 1); assert(!JSON.stringify(reports).includes("private cleanup"));
  assert(!p.inputs.some(x => "text" in x)); checks++;
}

if (process.platform === "win32") {
  const directory = mkdtempSync(join(tmpdir(), "filumire-w4-windows-"));
  const file = join(directory, ".env.windows-fixture.local");
  const audit = path => {
    const exe = win32.join(process.env.SystemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
    const script = fileURLToPath(new URL("./helpers/windows-credential-acl.ps1", import.meta.url));
    const result = spawnSync(exe, ["-NoProfile", "-NonInteractive", "-File", script, "-Directory", directory, ...(path ? ["-File", path] : [])],
      { encoding: "utf8", windowsHide: true, timeout: 15000 });
    assert.equal(result.error, undefined); assert.equal(result.status, 0, "read-only ACL audit failed");
    return JSON.parse(result.stdout);
  };
  try {
    const before = audit();
    // Exercise actual insecure inherited access, without changing even the fixture's parent ACL.
    assert(before.parentRules.some(r => r.sid !== before.currentUser && !["S-1-5-18", "S-1-5-32-544"].includes(r.sid) && r.inheritable !== "None"),
      "fixture must have inheritable access beyond the intended principals"); checks++;
    let created = false;
    await writeCredential(file, TEXT, () => { created = true; });
    assert(created); assert.equal(readFileSync(file, "utf8"), TEXT);
    const after = audit(file);
    assert.equal(after.parentSddl, before.parentSddl); assert(after.file.protected);
    assert.equal(after.file.owner, after.currentUser); assert.equal(after.file.rules.length, 2);
    assert.deepEqual(after.file.rules.map(r => r.sid).sort(), [after.currentUser, "S-1-5-18"].sort());
    assert(after.file.rules.every(r => !r.inherited && r.type === "Allow" && r.rights === "FullControl")); checks++;
    await assert.rejects(() => writeCredential(file, "overwrite", () => { throw new Error("existing file must not be owned"); }), e => e.code === "windows_credential_protection_failed");
    assert.equal(readFileSync(file, "utf8"), TEXT); assert.equal(audit(file).parentSddl, before.parentSddl); checks++;
    unlinkSync(file);
    // Reject an alternate data stream before creation or payload transmission.
    await assert.rejects(() => writeCredential(file + ":hidden", TEXT, () => {}), e => e.code === "windows_credential_protection_failed");
    assert(!existsSync(file)); assert.equal(audit().parentSddl, before.parentSddl); checks++;
  } finally {
    assert.equal(dirname(resolve(directory)), resolve(tmpdir())); assert(basename(directory).startsWith("filumire-w4-windows-"));
    rmSync(directory, { recursive: true, force: true });
  }
} else {
  console.log("Windows native ACL integration unavailable on this platform; protocol tests only.");
}
console.log(`PASS: W4 Windows credential security - ${checks} offline checks`);
