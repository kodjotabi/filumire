import { renderPage, pageMetadata } from "@/lib/pages";
export const metadata = pageMetadata("/parents","fr");
export default function Page({searchParams}:{searchParams:Promise<{inquiry?:string|string[]}>}){return renderPage("/parents","fr",searchParams);}
