import { renderPage, pageMetadata } from "@/lib/pages";
export const metadata = pageMetadata("/partners","en");
export default function Page({searchParams}:{searchParams:Promise<{inquiry?:string|string[]}>}) {return renderPage("/partners","en",searchParams);}
