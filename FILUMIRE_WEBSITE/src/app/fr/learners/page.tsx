import { renderPage, pageMetadata } from "@/lib/pages";
export const metadata = pageMetadata("/learners","fr");
export default function Page({searchParams}:{searchParams:Promise<{inquiry?:string|string[]}>}){return renderPage("/learners","fr",searchParams);}
