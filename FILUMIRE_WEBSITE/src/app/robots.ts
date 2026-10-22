import { siteOrigin } from "@/lib/site-origin";
import type {MetadataRoute} from "next";
export default function robots():MetadataRoute.Robots{return {rules:{userAgent:"*",allow:"/"},sitemap:new URL("/sitemap.xml",siteOrigin()).href};}
