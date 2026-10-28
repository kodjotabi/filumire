import { renderPage, pageMetadata } from "@/lib/pages";
export const metadata = pageMetadata("/cote-divoire","en");
export default function Page({searchParams}:{searchParams:Promise<{inquiry?:string|string[]}>}) {return renderPage("/cote-divoire","en",searchParams);}
