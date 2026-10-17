import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createContext, runInContext } from "node:vm";
import React from "react";
import ts from "typescript";
import { signOut } from "../apps/learner/services/account-client";

// Unit harness: execute the actual component handlers with deterministic hook state.
// Only React rendering and imports are stubbed; signOut uses the real account client.
// This does not claim browser interaction or server-side session revocation coverage.
const source = readFileSync(new URL("../apps/learner/components/filumire/AdultRoleSwitch.tsx", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022,
} }).outputText;
const originalFetch = globalThis.fetch;
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
try {
  for (const language of ["en", "fr"] as const) {
    for (const role of ["guardian", "teacher"] as const) {
      const states: unknown[] = [], refs: { current: unknown }[] = [], destinations: string[] = [];
      let stateIndex = 0, refIndex = 0, requests = 0;
      const windowStub = { location: { assign: (url: string) => destinations.push(url) },
        localStorage: { removeItem: () => {} }, dispatchEvent: () => true };
      Object.defineProperty(globalThis, "window", { configurable: true, value: windowStub });
      const reactStub = { ...React,
        useState: (initial: unknown) => {
          const index = stateIndex++;
          if (!(index in states)) states[index] = initial;
          return [states[index], (value: unknown) => { states[index] = value; }];
        },
        useRef: (initial: unknown) => refs[refIndex++] ?? (refs[refIndex - 1] = { current: initial }),
      };
      const exports: Record<string, (...args: any[]) => any> = {};
      const context = createContext({ exports, React: reactStub, window: windowStub,
        require: (name: string) => {
          if (name === "react") return reactStub;
          if (name.endsWith("account-client")) return { signOut };
          if (name === "next/link") return { default: "a" };
          if (name === "./LanguageToggle") return { LanguageToggle: "span" };
          throw new Error(`Unexpected import: ${name}`);
        },
      });
      runInContext(compiled, context);
      const header = exports.AdultHeader({ role, active: "parent", language, onLanguage: () => {} });
      const actions = header.props.children[1];
      const component = actions.props.children[2];
      const render = () => { stateIndex = 0; refIndex = 0; return component.type(component.props); };
      const button = () => render().props.children[0];
      globalThis.fetch = async (url, init) => {
        requests++;
        assert.equal(url, "/api/session/logout");
        assert.equal(init?.method, "POST");
        return new Response(JSON.stringify({ error: "test failure" }), { status: 500 });
      };
      button().props.onClick();
      assert.equal(button().props.disabled, true);
      button().props.onClick();
      assert.equal(requests, 1, "concurrent clicks must not duplicate logout");
      // Allow the real fetch/JSON/request/signOut promise chain to settle.
      await new Promise(resolve => setTimeout(resolve, 0));
      assert.deepEqual(destinations, [], "failed revocation must not redirect");
      assert.equal(button().props.disabled, false, "failed sign-out permits retry");
      const alert = render().props.children[1];
      assert.equal(alert.props.role, "alert");
      assert.equal(alert.props.children, language === "en"
        ? "Sign-out failed. You are still signed in. Try again."
        : "La déconnexion a échoué. Vous êtes toujours connecté. Réessayez.");
      globalThis.fetch = async () => new Response(JSON.stringify({ revoked: true }), { status: 200 });
      button().props.onClick();
      await new Promise(resolve => setTimeout(resolve, 0));
      assert.deepEqual(destinations, [`/login?lang=${language}`]);
    }
  }
  console.log("PASS: guardian/teacher EN/FR actual sign-out handler, duplicate-click guard, failed revocation without redirect, error/retry and successful login return");
} finally {
  globalThis.fetch = originalFetch;
  if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
  else Reflect.deleteProperty(globalThis, "window");
}
