import { renderPage, pageMetadata } from '@/lib/pages';
export const metadata=pageMetadata("/pricing","en");
export default async function Page({searchParams}:{searchParams:Promise<{inquiry?:string|string[]}>}){return renderPage("/pricing","en",searchParams);}
