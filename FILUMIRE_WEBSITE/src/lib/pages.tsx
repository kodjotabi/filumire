import { Pricing } from '@/components/subscriptions/Pricing';
import type { Metadata } from "next";
import Home from "@/components/pages/home";
import How from "@/components/pages/how-it-works";
import Curriculum from "@/components/pages/curriculum";
import Families from "@/components/pages/for-families";
import Schools from "@/components/pages/for-schools";
import About from "@/components/pages/about";
import Access from "@/components/pages/access";
import Partners from "@/components/pages/partners";
import Contact from "@/components/pages/contact";
import Privacy from "@/components/pages/privacy";
import { InternationalLanding } from "@/components/international/InternationalLanding";
import { CountryComingSoon } from "@/components/international/CountryComingSoon";
import { notFound } from "next/navigation";
import { translateTree } from "./translate";
import { localizeHref, type Locale } from "./locale";
const pages = {"/ghana":Home,"/how-it-works":How,"/curriculum":Curriculum,"/for-families":Families,"/for-schools":Schools,"/about":About,"/access":Access,"/partners":Partners,"/privacy":Privacy};
const titles: Record<string,[string,string]> = {
"/pricing":["Provisional subscription plans","Offres d’abonnement provisoires"],"/account":["Parent account","Compte parent"],"/account/subscription":["Subscription management","Gestion de l’abonnement"],
"/":["Learning that understands every child","Un apprentissage qui comprend chaque enfant"],
"/ghana":["Ghana: personalised learning for Africa","Ghana : un apprentissage personnalisé pour l’Afrique"],"/cote-divoire":["Côte d’Ivoire: coming soon","Côte d’Ivoire : bientôt disponible"],"/nigeria":["Nigeria: coming soon","Nigeria : bientôt disponible"],
"/how-it-works":["How learning works","Notre approche d’apprentissage"],"/curriculum":["Curriculum focus and planned coverage","Priorités du programme et périmètre prévu"],
"/for-families":["Support for families","Accompagnement des familles"],"/for-schools":["Schools and teachers","Écoles et enseignants"],"/about":["Mission and principles","Mission et principes"],"/access":["Access guidance","Modalités d’accès"],"/partners":["Potential partnerships","Partenariats potentiels"],"/contact":["Contact and inquiries","Contact et demandes"],"/privacy":["Public website privacy","Confidentialité du site public"]};
export function pageMetadata(path: string, locale: Locale): Metadata {
 const title = titles[path]?.[locale === "fr" ? 1 : 0];
 if (!title) return {title:locale === "fr" ? "Page introuvable | FILUMIRE":"Page not found | FILUMIRE",robots:{index:false,follow:false}};
 return {robots:path.startsWith("/account")?{index:false,follow:false}:undefined,title:title+" | FILUMIRE", description:locale === "fr" ? title+" : découvrez FILUMIRE, son approche éducative pour l’Afrique et les modalités à confirmer auprès de l’équipe." : title+": explore FILUMIRE’s educational approach for Africa and the options to confirm with the team.",alternates:{canonical:localizeHref(path,locale),languages:{en:path,fr:localizeHref(path,"fr"),"x-default":path}},openGraph:{title:title+" | FILUMIRE",locale:locale === "fr"?"fr_FR":"en_GB",alternateLocale:locale === "fr"?"en_GB":"fr_FR"}};
}
export async function renderPage(path: string, locale: Locale, searchParams: Promise<{inquiry?:string|string[]}>) {
 if(path === "/") return <InternationalLanding locale={locale}/>;
 if(path === "/cote-divoire" || path === "/nigeria") return <CountryComingSoon country={path.slice(1) as "cote-divoire"|"nigeria"} locale={locale}/>;
 if(path === "/pricing") return <Pricing locale={locale}/>;
 if(path === "/contact") return translateTree(await Contact({searchParams}),locale);
 const Page = pages[path as keyof typeof pages]; if(!Page) notFound();
 return translateTree(Page(),locale);
}
