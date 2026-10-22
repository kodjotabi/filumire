import { renderPage, pageMetadata } from "@/lib/pages";
export const metadata = pageMetadata("/partners","fr");
export default function Page({searchParams}:{searchParams:Promise<{inquiry?:string|string[]}>}){return renderPage("/partners","fr",searchParams);}
