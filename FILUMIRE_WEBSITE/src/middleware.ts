import {NextResponse,type NextRequest} from "next/server";
export function middleware(request:NextRequest){const headers=new Headers(request.headers);headers.set("x-filumire-locale",/^\/fr(?:\/|$)/.test(request.nextUrl.pathname)?"fr":"en");const response=NextResponse.next({request:{headers}});if(/^\/(?:fr\/)?account(?:\/|$)/.test(request.nextUrl.pathname)){response.headers.set("Referrer-Policy","no-referrer");response.headers.set("Cache-Control","private, no-store");}return response;}
export const config={matcher:["/((?!_next/|favicon.ico|sitemap.xml|robots.txt).*)"]};
