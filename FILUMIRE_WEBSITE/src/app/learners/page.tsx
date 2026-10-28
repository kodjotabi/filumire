import { renderPage, pageMetadata } from "@/lib/pages";
export const metadata = pageMetadata("/learners","en");
export default function Page({searchParams}:{searchParams:Promise<{inquiry?:string|string[]}>}) {return renderPage("/learners","en",searchParams);}
