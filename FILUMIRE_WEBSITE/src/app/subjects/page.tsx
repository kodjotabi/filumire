import { renderPage, pageMetadata } from "@/lib/pages";
export const metadata = pageMetadata("/subjects","en");
export default function Page({searchParams}:{searchParams:Promise<{inquiry?:string|string[]}>}) {return renderPage("/subjects","en",searchParams);}
