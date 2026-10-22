import { renderPage, pageMetadata } from "@/lib/pages";
export const metadata = pageMetadata("/for-schools","en");
export default function Page({searchParams}:{searchParams:Promise<{inquiry?:string|string[]}>}) {return renderPage("/for-schools","en",searchParams);}
