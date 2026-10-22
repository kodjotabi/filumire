"use client";
import {usePathname,useSearchParams} from "next/navigation";
import {useEffect,useState} from "react";
import {localeOf} from "./locale";
export function useLocaleNavigation(){
 const pathname=usePathname(),search=useSearchParams().toString();
 const [hash,setHash]=useState("");
 useEffect(()=>{const update=()=>setHash(window.location.hash);update();window.addEventListener("hashchange",update);window.addEventListener("popstate",update);return()=>{window.removeEventListener("hashchange",update);window.removeEventListener("popstate",update);};},[pathname,search]);
 return {pathname,locale:localeOf(pathname),currentHref:pathname+(search?"?"+search:"")+hash};
}
