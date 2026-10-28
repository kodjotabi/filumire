import { renderPage, pageMetadata } from "@/lib/pages";
export const metadata = pageMetadata("/nigeria","en");
export default function Page({searchParams}:{searchParams:Promise<{inquiry?:string|string[]}>}) {return renderPage("/nigeria","en",searchParams);}
