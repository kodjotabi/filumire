import { renderPage, pageMetadata } from "@/lib/pages";
export const metadata = pageMetadata("/cote-divoire","fr");
export default function Page({searchParams}:{searchParams:Promise<{inquiry?:string|string[]}>}) {return renderPage("/cote-divoire","fr",searchParams);}
