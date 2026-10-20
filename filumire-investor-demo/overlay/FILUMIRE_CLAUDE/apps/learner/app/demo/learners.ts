// Fictional demo learners (investor demo only). Any resemblance to real children is unintended.
export const DEMO_LEARNERS = [
  { key: "ama", name: "Ama", gradeId: "level-gh-basic-4-pilot", grade: { en: "Basic 4", fr: "Basic 4" }, language: "en", avatarId: "2", avatar: "/images/avatars/avatar-girl.png" },
  { key: "kofi", name: "Kofi", gradeId: "level-gh-basic-5-pilot", grade: { en: "Basic 5", fr: "Basic 5" }, language: "fr", avatarId: "1", avatar: "/images/avatars/avatar-kofi.png" },
  { key: "amina", name: "Amina", gradeId: "level-gh-basic-6-pilot", grade: { en: "Basic 6", fr: "Basic 6" }, language: "en", avatarId: "4", avatar: "/images/avatars/avatar-hijab.png" },
] as const;
export type DemoLearnerKey = (typeof DEMO_LEARNERS)[number]["key"];
export const DEMO_TEACHER = { name: "Mrs Mensah" } as const;
