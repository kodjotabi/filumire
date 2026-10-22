import { renderPage, pageMetadata } from "@/lib/pages";
export const metadata = pageMetadata("/about","en");
export default function Page({searchParams}:{searchParams:Promise<{inquiry?:string|string[]}>}) {return renderPage("/about","en",searchParams);}
