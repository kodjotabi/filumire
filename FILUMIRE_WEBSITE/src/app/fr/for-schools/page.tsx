import { renderPage, pageMetadata } from "@/lib/pages";
export const metadata = pageMetadata("/for-schools","fr");
export default function Page({searchParams}:{searchParams:Promise<{inquiry?:string|string[]}>}){return renderPage("/for-schools","fr",searchParams);}
