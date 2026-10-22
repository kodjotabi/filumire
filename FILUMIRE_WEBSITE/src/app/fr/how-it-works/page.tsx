import { renderPage, pageMetadata } from "@/lib/pages";
export const metadata = pageMetadata("/how-it-works","fr");
export default function Page({searchParams}:{searchParams:Promise<{inquiry?:string|string[]}>}){return renderPage("/how-it-works","fr",searchParams);}
