// Windows W4 writer. Only path metadata is sent until the helper confirms its
// creation-time protected DACL. Secrets travel over stdin, never argv/env/temp files.
import { spawn } from "node:child_process";
import { win32 } from "node:path";
import { fileURLToPath } from "node:url";

export class WindowsCredentialError extends Error {
  constructor(details) { super("windows_credential_protection_failed"); this.code = "windows_credential_protection_failed"; this.details = details; }
}

const helper = fileURLToPath(new URL("./windows-credential-writer.ps1", import.meta.url));
export function writeWindowsCredential(path, text, created, { spawnProcess = spawn, timeoutMs = 15000 } = {}) {
  return new Promise((resolve, reject) => {
    let child, timer, buffer = "", state = "starting", owned = false, failed = false, readyOwner;
    const fail = (stage = "helper_failed") => {
      if (failed) return;
      failed = true;
      clearTimeout(timer);
      try { child?.stdin?.destroy(); } catch { /* Preserve failure reporting. */ }
      try { child?.kill(); } catch { /* Caller must treat a retained file as unresolved. */ }
      reject(new WindowsCredentialError({ fileCreationUncertain: !owned,
        stage: typeof stage === "string" ? stage : "helper_failed" }));
    };
    const protectedMessage = message => message.protected === true && /^S-1-5-21-(?:\d+-){3}\d+$/.test(message.ownerSid ?? "")
      && Array.isArray(message.principals) && message.principals.length === 2
      && new Set(message.principals).size === 2 && message.principals.includes(message.ownerSid) && message.principals.includes("S-1-5-18");
    try {
      if (typeof text !== "string" || text.length > 16384 || typeof created !== "function") return fail();
      const systemRoot = process.env.SystemRoot;
      if (!systemRoot || !win32.isAbsolute(systemRoot)) return fail();
      const executable = win32.join(systemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
      child = spawnProcess(executable, ["-NoProfile", "-NonInteractive", "-File", helper], {
        windowsHide: true, stdio: ["pipe", "pipe", "pipe"],
        env: Object.fromEntries(["SystemRoot", "WINDIR", "SystemDrive", "TEMP", "TMP"].filter(k => process.env[k]).map(k => [k, process.env[k]])),
      });
      timer = setTimeout(fail, timeoutMs);
      child.on("error", fail); child.stdin.on("error", fail);
      child.stderr.on("data", () => {}); // Drain without logging or retaining potentially sensitive diagnostics.
      child.stdout.setEncoding("utf8");
      child.stdout.on("data", chunk => {
        if (failed) return;
        buffer += chunk;
        if (buffer.length > 8192) return fail();
        let newline;
        while ((newline = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, newline).trim(); buffer = buffer.slice(newline + 1);
          let message;
          try { message = JSON.parse(line); } catch { return fail(); }
          if (!message || typeof message !== "object" || Array.isArray(message)) return fail();
          if (message.event === "created" && state === "starting") {
            owned = true; state = "created";
            try { created(); } catch { return fail(); }
          } else if (message.event === "ready" && state === "created" && protectedMessage(message)) {
            readyOwner = message.ownerSid; state = "ready";
            child.stdin.end(JSON.stringify({ text }) + "\n");
          } else if (message.event === "complete" && state === "ready" && protectedMessage(message) && message.ownerSid === readyOwner) {
            state = "complete";
          } else if (message.event === "failed" && ["request_invalid", "credential_create_failed", "credential_acl_verification_failed", "credential_payload_invalid", "credential_write_failed", "credential_close_failed"].includes(message.code)) {
            return fail(message.code);
          } else { return fail(); }
        }
      });
      child.on("close", code => {
        if (failed) return;
        clearTimeout(timer);
        if (code !== 0 || state !== "complete" || buffer.trim()) return fail();
        resolve();
      });
      child.stdin.write(JSON.stringify({ path: win32.resolve(path) }) + "\n");
    } catch { fail(); }
  });
}
