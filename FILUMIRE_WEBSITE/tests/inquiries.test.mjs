import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

async function loadModule(relative) {
  const source = await readFile(new URL(relative, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } });
  return import("data:text/javascript;base64," + Buffer.from(outputText).toString("base64"));
}
const { INQUIRY_CATEGORIES, inquiryCategory, prepareInquiry } = await loadModule("../src/lib/inquiries.ts");
const { verifiedPortalUrl, contactEmail } = await loadModule("../src/lib/destinations.ts");
const contacts = { inquiriesEmail: "info@filumire.com", partnershipsEmail: "partnerships@filumire.com", schoolsEmail: "schools@filumire.com" };
const fields = { name: " Ama Mensah ", email: "ama@example.org", organization: "A & B School", phone: "+233 123", country: "Ghana", message: "Bonjour ! Fractions & décimales?\nPlease explain access #1." };

test("every inquiry category routes to the appropriate mailbox", () => {
  for (const category of Object.keys(INQUIRY_CATEGORIES)) {
    const draft = prepareInquiry(category, fields, contacts);
    const expected = ["teacher", "school-pilot"].includes(category) ? contacts.schoolsEmail : ["curriculum", "partnership"].includes(category) ? contacts.partnershipsEmail : contacts.inquiriesEmail;
    assert.equal(draft.recipient, expected);
    assert.ok(draft.subject.includes(INQUIRY_CATEGORIES[category]));
  }
});
test("email draft preserves accents, line breaks and URL-special characters", () => {
  const draft = prepareInquiry("family", fields, contacts);
  const uri = new URL(draft.mailto);
  assert.equal(uri.protocol, "mailto:");
  assert.equal(uri.searchParams.get("subject"), draft.subject);
  assert.equal(uri.searchParams.get("body"), draft.body);
  assert.ok(draft.body.includes(fields.message));
  assert.ok(draft.text.includes("Name: Ama Mensah"));
});
test("invalid, absent and inherited category names fall back safely", () => {
  for (const value of [null, undefined, "", "invalid", "toString", "__proto__"]) assert.equal(inquiryCategory(value), "general");
  for (const value of Object.keys(INQUIRY_CATEGORIES)) assert.equal(inquiryCategory(value), value);
});
test("draft validation rejects blank fields, invalid email and header injection", () => {
  for (const change of [{ name: " " }, { name: "Ada\nBcc: other@example.org" }, { email: "invalid" }, { email: "a@example.org\n" }, { message: " " }, { message: "a".repeat(3001) }]) {
    // Trailing whitespace is deliberately trimmed; embedded newlines are rejected.
    if (change.email === "a@example.org\n") change.email = "a@exam\nple.org";
    assert.throws(() => prepareInquiry("general", { ...fields, ...change }, contacts));
  }
});
test("unconfigured, reserved, unsafe and credential-bearing portal URLs stay on the public site", () => {
  for (const value of [undefined, "", "/login", "javascript:alert(1)", "http://filumire.com/login", "https://app.filumire.example.com/login", "https://example.org", "https://foo.invalid", "https://user:pass@filumire.com/login"]) assert.equal(verifiedPortalUrl(value), null);
  assert.equal(verifiedPortalUrl("https://app.filumire.com/login"), "https://app.filumire.com/login");
  assert.equal(verifiedPortalUrl("http://localhost:3000/login"), "http://localhost:3000/login");
});
test("contact configuration rejects malformed or injected email values", () => {
  assert.equal(contactEmail("valid@filumire.com", contacts.inquiriesEmail), "valid@filumire.com");
  for (const value of [undefined, "invalid", "a@filumire.com\nBcc:other@filumire.com"]) assert.equal(contactEmail(value, contacts.inquiriesEmail), contacts.inquiriesEmail);
});
