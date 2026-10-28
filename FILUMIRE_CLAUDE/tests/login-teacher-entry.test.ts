/*
 * Login page: parents and teachers each have a visible way in.
 * Source checks: two create-account buttons (parent, teacher) in
 * English and French, the teacher one opening the teacher form, and
 * the sign-in card saying that teachers sign in there too.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8").replaceAll("\r\n", "\n");
let checks = 0;
const check = (fn: () => void) => {
  fn();
  checks += 1;
};

const login = read("apps/learner/app/login/page.tsx");
const register = read("apps/learner/app/register/page.tsx");

/* ---- create account: one button per role ---- */
const start = login.indexOf('<section className="newAccount"');
const end = login.indexOf("</section>", start);
const card = login.slice(start, end);
check(() => assert.ok(start > 0, "Create-account card is rendered."));
check(() => assert.match(card, /href=\{`\/register\?lang=\$\{language\}`\} className="createButton">\n\s+\{t\.createParent\}/));
check(() => assert.match(card, /href=\{`\/register\?lang=\$\{language\}&role=teacher`\} className="createButton teacherCreate">\n\s+\{t\.createTeacher\}/));
check(() => assert.ok(card.indexOf("t.createParent") < card.indexOf("t.createTeacher"), "Parent first, then teacher."));
check(() => assert.match(register, /get\("role"\) === "teacher"/, "The register page opens the teacher form for ?role=teacher."));

/* ---- wording, EN and FR ---- */
check(() => assert.match(login, /createParent: "I'm a parent or guardian"/));
check(() => assert.match(login, /createTeacher: "I'm a teacher"/));
check(() => assert.match(login, /createParent: "Je suis parent ou tuteur"/));
check(() => assert.match(login, /createTeacher: "Je suis enseignant ou enseignante"/));
check(() => assert.match(login, /newBody: "[^"]*Teachers create their own account\."/));
check(() => assert.match(login, /newBody: "[^"]*Les enseignants créent leur propre compte\."/));
check(() => assert.match(login, /cardIntro: "Learners, parents and teachers all sign in here\."/));
check(() => assert.match(login, /cardIntro: "Apprenants, parents et enseignants se connectent ici\."/));
check(() => assert.doesNotMatch(login, /createFirstTime/, "The single parent-only button is gone."));

/* ---- unchanged: one sign-in form for every role, header link to it ---- */
check(() => assert.match(login, /href=\{`\/login\?lang=\$\{language\}&returnTo=family#sign-in`\} className="adultLink"/));
check(() => assert.equal(login.match(/<form /g)?.length, 1));

console.log(`login-teacher-entry: ${checks} checks passed`);
