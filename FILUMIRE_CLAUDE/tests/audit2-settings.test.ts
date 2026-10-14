import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readInterfacePreferences, saveInterfacePreferences, interfacePreferenceKey } from "../apps/learner/services/interface-preferences";
Object.assign(globalThis, { React });
const { AdditionalSettings } = await import("../apps/learner/components/filumire/AdditionalSettings");
const { FiluConversation } = await import("../apps/learner/components/filumire/FiluConversation");
const { LearnerHeader } = await import("../apps/learner/components/filumire/LearnerHeader");
const { default: ProfilePage } = await import("../apps/learner/components/filumire/ProfilePage");
const storage = new Map<string, string>();
Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) }, dispatchEvent: () => true } });
try {
  const preferences = { appearance: "dark" as const, progressNotices: false, achievementNotices: true };
  assert.equal(saveInterfacePreferences("fictional-a", preferences), true);
  assert.deepEqual(readInterfacePreferences("fictional-a"), preferences);
  assert.equal(readInterfacePreferences("fictional-b").appearance, "system", "shared devices must isolate learners");
  storage.set(interfacePreferenceKey("fictional-b"), '{"appearance":"invalid","progressNotices":"false"}');
  assert.equal(readInterfacePreferences("fictional-b").progressNotices, true);
  storage.set(interfacePreferenceKey("fictional-b"), 'broken');
  assert.equal(readInterfacePreferences("fictional-b").appearance, "system");
  const oldSet = window.localStorage.setItem;
  window.localStorage.setItem = () => { throw new Error("storage denied"); };
  assert.equal(saveInterfacePreferences("fictional-a", preferences), false);
  window.localStorage.setItem = oldSet;
  for (const language of ["en", "fr"] as const) {
    const settings = renderToStaticMarkup(React.createElement(AdditionalSettings, { learnerId: "fictional-a", language, signedIn: true }));
    assert.equal((settings.match(/<summary>/g) ?? []).length, 4);
    assert.equal((settings.match(/type="radio"/g) ?? []).length, 3);
    assert.equal((settings.match(/type="checkbox"/g) ?? []).length, 2);
    assert(settings.includes(`https://filumire.com${language === "fr" ? "/fr" : ""}/contact`));
    assert(settings.includes(`/privacy?lang=${language}`));
    assert(settings.includes(language === "fr" ? "Mot de passe et appareils" : "Password and devices"));
    const guardian = renderToStaticMarkup(React.createElement(AdditionalSettings, { learnerId: "fictional-a", language, signedIn: true, guardianSession: true }));
    assert(guardian.includes(`/family?lang=${language}`));
    assert(!guardian.includes('current-password'), "guardian must not get the learner password form");
    const profile = renderToStaticMarkup(React.createElement(ProfilePage, { learnerId: "fictional-a", language, name: "Fictional Learner", onRename: () => {}, onLanguage: () => {}, overview: null }));
    assert(profile.includes(`<h1 class="profileSettingsTitle">${language === "fr" ? "Mes paramètres" : "My Settings"}</h1>`));
    assert(profile.indexOf('class="prList"') < profile.indexOf('class="voiceSettings"'));
    assert(profile.indexOf('class="voiceSettings"') < profile.indexOf('class="additionalSettings"'));
    const header = renderToStaticMarkup(React.createElement(LearnerHeader, { language }));
    assert(!header.includes('learnerSignOut'));
    const chat = renderToStaticMarkup(React.createElement(FiluConversation, { language }));
    assert(!chat.includes('quickActions'));
    assert(chat.indexOf('id="filu-question"') < chat.indexOf('role="log"'));
    assert(chat.includes('filu-privacy-notice'));
  }
  console.log("PASS: learner preference isolation, corrupt/blocked storage, bilingual functional settings, guardian boundaries, profile order and question prominence");
} finally { Reflect.deleteProperty(globalThis, "window"); }
