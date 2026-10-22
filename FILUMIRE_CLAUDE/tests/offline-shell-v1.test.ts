import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

const PUBLIC = join(process.cwd(), "apps", "learner", "public");
const source = readFileSync(join(PUBLIC, "sw.js"), "utf8");

type Handler = (event: any) => void;

function makeWorker(network: (url: string) => Promise<Response>) {
  const handlers: Record<string, Handler> = {};
  const stores = new Map<string, Map<string, Response>>();

  const store = (name: string) => {
    if (!stores.has(name)) stores.set(name, new Map());
    return stores.get(name)!;
  };

  const cacheApi = (name: string) => ({
    async addAll(urls: string[]) {
      for (const u of urls) {
        const res = await network("http://localhost" + u);
        store(name).set("http://localhost" + u, res.clone());
      }
    },
    async put(req: any, res: Response) {
      store(name).set(typeof req === "string" ? req : req.url, res);
    },
    async match(req: any) {
      const r = store(name).get(typeof req === "string" ? req : req.url);
      return r ? r.clone() : undefined;
    },
    async keys() {
      return [...store(name).keys()].map((url) => ({ url }));
    },
    async delete(req: any) {
      return store(name).delete(typeof req === "string" ? req : req.url);
    },
  });

  const caches = {
    async open(name: string) {
      store(name);
      return cacheApi(name);
    },
    async keys() {
      return [...stores.keys()];
    },
    async delete(name: string) {
      return stores.delete(name);
    },
    async match(req: any) {
      const url = typeof req === "string" ? req : req.url;
      for (const s of stores.values()) {
        const r = s.get(url.startsWith("http") ? url : "http://localhost" + url);
        if (r) return r.clone();
      }
      return undefined;
    },
  };

  const self: any = {
    location: { origin: "http://localhost" },
    addEventListener: (name: string, fn: Handler) => {
      handlers[name] = fn;
    },
    skipWaiting: async () => {},
    clients: { claim: async () => {} },
  };

  vm.runInNewContext(source, {
    self,
    caches,
    fetch: (req: any) => network(typeof req === "string" ? req : req.url),
    URL,
    Promise,
  });

  return { handlers, stores, caches };
}

async function fire(handlers: Record<string, Handler>, name: string, event: any) {
  let pending: Promise<any> | undefined;
  handlers[name]({
    ...event,
    waitUntil: (p: Promise<any>) => (pending = p),
    respondWith: (p: Promise<any>) => (pending = Promise.resolve(p)),
  });
  return pending ? await pending : undefined;
}

const ok = (body = "ok") => new Response(body, { status: 200 });
const req = (url: string, method = "GET", mode = "cors") => ({
  url: "http://localhost" + url,
  method,
  mode,
});

// 1. Install precaches the offline page and icons.
{
  const w = makeWorker(async () => ok());
  await fire(w.handlers, "install", {});
  const names = [...w.stores.keys()];
  assert.ok(names.some((n) => n.endsWith("-static")));
  const cached = await w.caches.match("/offline.html");
  assert.ok(cached, "offline page must be precached");
  assert.ok(await w.caches.match("/icons/icon-192.png"));
}

// 2. Old versions are removed, unrelated caches are left alone.
{
  const w = makeWorker(async () => ok());
  await (await w.caches.open("filumire-shell-v0-static")).put("x", ok());
  await (await w.caches.open("filumire-shell-v1-static")).put("http://localhost/offline.html", ok("OLD FRENCH OFFLINE PAGE"));
  await (await w.caches.open("someone-elses-cache")).put("y", ok());
  await fire(w.handlers, "install", {});
  await fire(w.handlers, "activate", {});
  const names = [...w.stores.keys()];
  assert.ok(!names.includes("filumire-shell-v0-static"));
  assert.ok(!names.includes("filumire-shell-v1-static"), "the old offline page must be invalidated for existing installations");
  assert.notEqual(await (await w.caches.match("/offline.html"))!.text(), "OLD FRENCH OFFLINE PAGE");
  assert.ok(names.includes("someone-elses-cache"));
}

// 3. API calls, non-GET and cross-origin requests are never intercepted.
{
  const w = makeWorker(async () => ok());
  await fire(w.handlers, "install", {});
  for (const r of [
    req("/api/learning"),
    req("/api/learning?overview=1"),
    req("/some/page", "POST"),
    { url: "https://example.com/a.js", method: "GET", mode: "cors" },
  ]) {
    let intercepted = false;
    w.handlers.fetch({ request: r, respondWith: () => (intercepted = true) });
    assert.equal(intercepted, false, `must not intercept ${r.url}`);
  }
}

// 4. Offline navigation shows the offline page.
{
  let online = true;
  const w = makeWorker(async (u) => {
    if (!online && !u.endsWith("/offline.html") && !u.includes("/icons/") && !u.endsWith(".svg") && !u.endsWith(".webmanifest")) throw new Error("offline");
    return ok(u.endsWith("/offline.html") ? "OFFLINE PAGE" : "LIVE PAGE");
  });
  await fire(w.handlers, "install", {});
  online = false;
  const res = await fire(w.handlers, "fetch", { request: req("/dashboard", "GET", "navigate") });
  assert.equal(await res.text(), "OFFLINE PAGE");
  online = true;
  const live = await fire(w.handlers, "fetch", { request: req("/dashboard", "GET", "navigate") });
  assert.equal(await live.text(), "LIVE PAGE");
  // Page HTML is never stored.
  assert.equal(await w.caches.match("http://localhost/dashboard"), undefined);
}

// 5. Static files are cache-first and work offline afterwards.
{
  let online = true;
  const w = makeWorker(async () => {
    if (!online) throw new Error("offline");
    return ok("JS");
  });
  await fire(w.handlers, "install", {});
  const first = await fire(w.handlers, "fetch", { request: req("/_next/static/app.js") });
  assert.equal(await first.text(), "JS");
  online = false;
  const second = await fire(w.handlers, "fetch", { request: req("/_next/static/app.js") });
  assert.equal(await second.text(), "JS");
}

// 6. Small images are cached at runtime and capped.
{
  const w = makeWorker(async () => ok("IMG"));
  await fire(w.handlers, "install", {});
  for (let i = 0; i < 90; i += 1) {
    await fire(w.handlers, "fetch", { request: req(`/images/home/a${i}.svg`) });
  }
  await new Promise((r) => setTimeout(r, 20));
  const runtime = [...w.stores.entries()].find(([n]) => n.endsWith("-runtime"));
  assert.ok(runtime && runtime[1].size <= 81, "runtime cache must stay bounded");
}

// 7. Large artwork is never cached.
{
  const w = makeWorker(async () => ok("BIG"));
  await fire(w.handlers, "install", {});
  let intercepted = false;
  w.handlers.fetch({ request: req("/artwork/page 4.png"), respondWith: () => (intercepted = true) });
  assert.equal(intercepted, false);
}

// 8. Manifest and icons are consistent.
{
  const manifest = JSON.parse(readFileSync(join(PUBLIC, "manifest.webmanifest"), "utf8"));
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "/");
  assert.ok(manifest.name && manifest.short_name);
  const sizes = new Set(manifest.icons.map((i: any) => i.sizes));
  assert.ok(sizes.has("192x192") && sizes.has("512x512"));
  assert.ok(manifest.icons.some((i: any) => i.purpose === "maskable"));
  for (const icon of manifest.icons) {
    const png = readFileSync(join(PUBLIC, icon.src.replace(/^\//, "")));
    assert.equal(png.readUInt32BE(16), parseInt(icon.sizes), `${icon.src} width`);
    assert.equal(png.readUInt32BE(20), parseInt(icon.sizes), `${icon.src} height`);
  }
  const offline = readFileSync(join(PUBLIC, "offline.html"), "utf8");
  assert.ok(offline.includes("Try again") && offline.includes("Réessayer"));
}

console.log("OFFLINE SHELL TESTS PASS");
