import { renderPage, pageMetadata } from "@/lib/pages";
export const metadata = pageMetadata("/ghana","en");
export default function Page({searchParams}:{searchParams:Promise<{inquiry?:string|string[]}>}) {return renderPage("/ghana","en",searchParams);}
