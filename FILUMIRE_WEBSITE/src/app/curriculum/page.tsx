import { renderPage, pageMetadata } from "@/lib/pages";
export const metadata = pageMetadata("/curriculum","en");
export default function Page({searchParams}:{searchParams:Promise<{inquiry?:string|string[]}>}) {return renderPage("/curriculum","en",searchParams);}
