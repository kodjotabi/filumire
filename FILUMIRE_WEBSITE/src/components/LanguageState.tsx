"use client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { localeOf } from "@/lib/locale";
export function LanguageState(){const locale=localeOf(usePathname());useEffect(()=>{document.documentElement.lang=locale;},[locale]);return <a href="#main-content" className="skip-link">{locale==="fr"?"Aller au contenu principal":"Skip to main content"}</a>;}
