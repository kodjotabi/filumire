import { Pricing } from '@/components/subscriptions/Pricing';
import type { Metadata } from "next";
import type { ReactNode } from "react";
import Privacy from "@/components/pages/privacy";
import { AboutPage, ComingSoonPage, GhanaPage, HelpPage, HowItWorksPage, LandingPage, LearnersPage, ParentsPage, SchoolsPage, SubjectsPage, SubscriptionInfoPage } from "@/components/site/pages";
import { notFound } from "next/navigation";
import { translateTree } from "./translate";
import { localizeHref, type Locale } from "./locale";
import { PAGE_META } from "./site-pages";
import { paymentsLive } from "./payments";

const pages: Record<string, (props: { locale: Locale }) => ReactNode> = {
 "/": LandingPage, "/how-it-works": HowItWorksPage, "/subjects": SubjectsPage, "/learners": LearnersPage, "/parents": ParentsPage,
 "/schools": SchoolsPage, "/about": AboutPage, "/ghana": GhanaPage,
};

export function pageMetadata(path: string, locale: Locale): Metadata {
 const meta = PAGE_META[path]?.[locale];
 if (!meta) return {title:locale === "fr" ? "Page introuvable | FILUMIRE":"Page not found | FILUMIRE",robots:{index:false,follow:false}};
 const hidden = path.startsWith("/account") || (path === "/pricing" && !paymentsLive());
 return {robots:hidden?{index:false,follow:false}:undefined,title:meta.title+" | FILUMIRE",description:meta.description,alternates:{canonical:localizeHref(path,locale),languages:{en:path,fr:localizeHref(path,"fr"),"x-default":path}},openGraph:{title:meta.title+" | FILUMIRE",description:meta.description,locale:locale === "fr"?"fr_FR":"en_GB",alternateLocale:locale === "fr"?"en_GB":"fr_FR"}};
}

export async function renderPage(path: string, locale: Locale, searchParams: Promise<{inquiry?:string|string[]}>) {
 if(path === "/cote-divoire" || path === "/nigeria") return <ComingSoonPage country={path.slice(1) as "cote-divoire"|"nigeria"} locale={locale}/>;
 // Plans and prices stay hidden until payments are live; until then the page explains subscriptions without prices.
 if(path === "/pricing") { if (!paymentsLive()) return <SubscriptionInfoPage locale={locale}/>; return <Pricing locale={locale}/>; }
 // The help page reads the request so its language switch keeps ?inquiry= links.
 if(path === "/contact") { await searchParams; return <HelpPage locale={locale}/>; }
 if(path === "/privacy") return translateTree(Privacy(),locale);
 const Page = pages[path]; if(!Page) notFound();
 return <Page locale={locale}/>;
}
