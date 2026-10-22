import { renderPage, pageMetadata } from "@/lib/pages";
export const metadata = pageMetadata("/access","fr");
export default function Page({searchParams}:{searchParams:Promise<{inquiry?:string|string[]}>}){return renderPage("/access","fr",searchParams);}
