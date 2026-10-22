import { ParentAccount } from '@/components/subscriptions/ParentAccount';
import { pageMetadata } from '@/lib/pages';
export const metadata=pageMetadata("/account/subscription","en");
export default function Page(){return <ParentAccount locale="en"/>;}
