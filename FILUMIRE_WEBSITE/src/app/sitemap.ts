import { siteOrigin } from "@/lib/site-origin";
import type { MetadataRoute } from "next";
import { PAGE_ROUTES, localizeHref } from "@/lib/locale";
export default function sitemap(): MetadataRoute.Sitemap {const origin=siteOrigin();return PAGE_ROUTES.flatMap(path=>["en","fr"].map(locale=>({url:new URL(localizeHref(path,locale as "en"|"fr"),origin).href,alternates:{languages:{en:new URL(path,origin).href,fr:new URL(localizeHref(path,"fr"),origin).href}}})));}
