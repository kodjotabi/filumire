import { renderPage, pageMetadata } from "@/lib/pages";
export const metadata = pageMetadata("/","en");
export default function Page({searchParams}:{searchParams:Promise<{inquiry?:string|string[]}>}) {return renderPage("/","en",searchParams);}
