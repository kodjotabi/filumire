"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { localizeHref, localeOf } from "@/lib/locale";
export default function ErrorPage({reset}:{error:Error & {digest?:string};reset:()=>void}) {const locale=localeOf(usePathname()),fr=locale==="fr";return <section className="site-section"><div className="site-container section-heading-center"><h1 className="section-title">{fr?"La page n’a pas pu s’afficher":"This page could not load"}</h1><p>{fr?"Réessayez ou revenez à l’accueil. Si vous avez tenté un envoi, vérifiez sa confirmation avant de recommencer.":"Try again or return home. If you attempted to send a message, check its confirmation before retrying."}</p><div className="action-row"><button className="btn btn-primary" onClick={reset}>{fr?"Réessayer":"Try again"}</button><Link className="btn btn-outline" href={localizeHref("/",locale)}>{fr?"Revenir à l’accueil":"Return home"}</Link></div></div></section>;}
