import { existsSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { persistenceStore } from "../../services/persistence-provider";
import { accountStore } from "../../services/account/store";
import { localFamilyServices } from "../../services/family-access";

/*
 * Investor demo only. The app runs in its in-memory mode; this keeps that
 * memory in one local file (FILUMIRE_DEMO_STATE) so progress survives a
 * restart, and can return everything to the empty starting point (Reset Demo).
 * Only plain data is saved: maps, sets, arrays, dates and plain records.
 * Links between services and in-flight promises are left as they are.
 */
const FORMAT = 1;
type Holder = Record<string, unknown>;
type DemoGlobals = {
  __filumireDemoState?: { save: () => void; reset: () => void };
  __filumireDemoFamily?: Promise<unknown>;
  __filumireDemoFamilyData?: unknown;
};
const shared = globalThis as DemoGlobals;

function holders(): Record<string, Holder> {
  const memory = (persistenceStore as unknown as { __demoState?: Holder }).__demoState;
  if (!memory) throw new Error("demo state: in-memory store is not available");
  // Phone-based family access is switched off in production builds; then it holds nothing to save.
  let family: Record<string, Holder> = {};
  try { family = localFamilyServices() as unknown as Record<string, Holder>; } catch { /* unavailable */ }
  return { memory, account: accountStore as unknown as Holder, ...Object.fromEntries(Object.entries(family).map(([key, service]) => [`family.${key}`, service])) };
}

const plain = (value: object) => [Object.prototype, null].includes(Object.getPrototypeOf(value));
function encode(value: unknown): unknown {
  if (value === null || ["string", "number", "boolean"].includes(typeof value)) return value;
  if (value instanceof Date) return { $d: value.toISOString() };
  if (value instanceof Promise || typeof value !== "object") return undefined;
  if (value instanceof Map) return { $m: [...value].filter(([, item]) => !(item instanceof Promise)).map(([key, item]) => [encode(key), encode(item)]) };
  if (value instanceof Set) return { $s: [...value].map(encode) };
  if (Array.isArray(value)) return value.map(encode);
  if (!plain(value)) return undefined; // another service object: a link, not data
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encode(item)]).filter(([, item]) => item !== undefined));
}
function decode(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(decode);
  const tagged = value as { $d?: string; $m?: [unknown, unknown][]; $s?: unknown[] };
  if (typeof tagged.$d === "string") return new Date(tagged.$d);
  if (tagged.$m) return new Map(tagged.$m.map(([key, item]) => [decode(key), decode(item)]));
  if (tagged.$s) return new Set(tagged.$s.map(decode));
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, decode(item)]));
}

function capture() {
  const stores = Object.fromEntries(Object.entries(holders()).map(([name, holder]) =>
    [name, Object.fromEntries(Object.entries(holder).map(([key, field]) => [key, encode(field)]).filter(([, field]) => field !== undefined))]));
  return { format: FORMAT, stores, demoFamily: shared.__filumireDemoFamilyData ?? null };
}
function restore(snapshot: ReturnType<typeof capture>) {
  const live = holders();
  for (const [name, fields] of Object.entries(snapshot.stores)) {
    const holder = live[name];
    if (!holder) continue;
    for (const [key, saved] of Object.entries(fields)) {
      const current = holder[key], value = decode(saved);
      // Refill the existing collections: the services keep references to them.
      if (current instanceof Map && value instanceof Map) { current.clear(); value.forEach((item, k) => current.set(k, item)); }
      else if (current instanceof Set && value instanceof Set) { current.clear(); value.forEach((item) => current.add(item)); }
      else if (Array.isArray(current) && Array.isArray(value)) current.splice(0, current.length, ...value);
      else holder[key] = value;
    }
  }
  shared.__filumireDemoFamilyData = snapshot.demoFamily ?? undefined;
  shared.__filumireDemoFamily = snapshot.demoFamily ? Promise.resolve(snapshot.demoFamily) : undefined;
}

export function startDemoState() {
  const file = process.env.FILUMIRE_DEMO_STATE;
  if (!file || shared.__filumireDemoState) return;
  const pristine = capture();
  let last = JSON.stringify(pristine);
  if (existsSync(file)) {
    try {
      const saved = JSON.parse(readFileSync(file, "utf8"));
      if (saved?.format !== FORMAT) throw new Error("format");
      restore(saved);
      last = JSON.stringify(capture());
      console.log("demo state: progress restored");
    } catch {
      // Unreadable or from an older demo: keep it aside and start fresh.
      renameSync(file, `${file}.unreadable-${Date.now()}`);
      console.log("demo state: saved file unreadable, starting fresh");
    }
  }
  const save = () => {
    const text = JSON.stringify(capture());
    if (text === last) return;
    writeFileSync(`${file}.tmp`, text);
    renameSync(`${file}.tmp`, file);
    last = text;
  };
  const reset = () => {
    restore(pristine);
    rmSync(file, { force: true });
    last = JSON.stringify(capture());
  };
  shared.__filumireDemoState = { save, reset };
  setInterval(() => { try { save(); } catch (error) { console.error("demo state: save failed", error); } }, 1500).unref();
}
