import { learnerDestination } from "./learner-navigation";
export const PORTAL_URLS = {
 learner: learnerDestination("start", "en"),
 parent: learnerDestination("parent", "en"),
 teacher: learnerDestination("teacher", "en"),
};
export type PortalRole = keyof typeof PORTAL_URLS;
export const FILUMIRE_CONFIG = {
 siteName:"FILUMIRE", defaultLocale:"en" as const, supportedLocales:["en","fr"] as const,
 meta: {
 inquiriesEmail: "info@filumire.com",
 partnershipsEmail: "hello@filumire.com",
 schoolsEmail: "schools@filumire.com",
 },
 navLinks:[{label:"How It Works",href:"/how-it-works"},{label:"Curriculum",href:"/curriculum"},{label:"For Families",href:"/for-families"},{label:"For Schools",href:"/for-schools"},{label:"About",href:"/about"},{label:"Contact",href:"/contact"},{label:"Subscriptions",href:"/pricing"}]
};
export type { Locale } from "./locale";
