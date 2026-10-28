import { renderPage, pageMetadata } from "@/lib/pages";
export const metadata = pageMetadata("/parents","en");
export default function Page({searchParams}:{searchParams:Promise<{inquiry?:string|string[]}>}) {return renderPage("/parents","en",searchParams);}
