import { renderPage, pageMetadata } from "@/lib/pages";
export const metadata = pageMetadata("/ghana","fr");
export default function Page({searchParams}:{searchParams:Promise<{inquiry?:string|string[]}>}) {return renderPage("/ghana","fr",searchParams);}
