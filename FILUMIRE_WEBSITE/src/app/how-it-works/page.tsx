import { renderPage, pageMetadata } from "@/lib/pages";
export const metadata = pageMetadata("/how-it-works","en");
export default function Page({searchParams}:{searchParams:Promise<{inquiry?:string|string[]}>}) {return renderPage("/how-it-works","en",searchParams);}
