import { renderPage, pageMetadata } from "@/lib/pages";
export const metadata = pageMetadata("/subjects","fr");
export default function Page({searchParams}:{searchParams:Promise<{inquiry?:string|string[]}>}){return renderPage("/subjects","fr",searchParams);}
