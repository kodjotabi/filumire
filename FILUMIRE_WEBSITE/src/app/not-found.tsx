import {headers} from "next/headers";
import {Recovery} from "@/components/Recovery";
export default async function NotFound(){const locale=(await headers()).get("x-filumire-locale")==="fr"?"fr":"en";return <Recovery locale={locale}/>;}
