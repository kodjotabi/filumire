import { renderPage, pageMetadata } from "@/lib/pages";
export const metadata = pageMetadata("/","fr");
export default function Page({searchParams}:{searchParams:Promise<{inquiry?:string|string[]}>}){return renderPage("/","fr",searchParams);}
