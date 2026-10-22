import { renderPage, pageMetadata } from "@/lib/pages";
export const metadata = pageMetadata("/privacy","fr");
export default function Page({searchParams}:{searchParams:Promise<{inquiry?:string|string[]}>}){return renderPage("/privacy","fr",searchParams);}
