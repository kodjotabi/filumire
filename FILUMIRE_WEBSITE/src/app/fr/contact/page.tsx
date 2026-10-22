import { renderPage, pageMetadata } from "@/lib/pages";
export const metadata = pageMetadata("/contact","fr");
export default function Page({searchParams}:{searchParams:Promise<{inquiry?:string|string[]}>}){return renderPage("/contact","fr",searchParams);}
