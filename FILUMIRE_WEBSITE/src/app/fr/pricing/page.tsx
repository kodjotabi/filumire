import { renderPage, pageMetadata } from '@/lib/pages';
export const metadata=pageMetadata("/pricing","fr");
export default async function Page({searchParams}:{searchParams:Promise<{inquiry?:string|string[]}>}){return renderPage("/pricing","fr",searchParams);}
