import { ParentAccount } from '@/components/subscriptions/ParentAccount';
import { pageMetadata } from '@/lib/pages';
export const metadata=pageMetadata("/account/subscription","fr");
export default function Page(){return <ParentAccount locale="fr"/>;}
