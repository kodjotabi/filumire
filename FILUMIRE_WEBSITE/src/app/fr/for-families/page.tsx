import { renderPage, pageMetadata } from "@/lib/pages";
export const metadata = pageMetadata("/for-families","fr");
export default function Page({searchParams}:{searchParams:Promise<{inquiry?:string|string[]}>}){return renderPage("/for-families","fr",searchParams);}
