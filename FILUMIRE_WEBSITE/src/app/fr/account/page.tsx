import { ParentAccount } from '@/components/subscriptions/ParentAccount';
import { pageMetadata } from '@/lib/pages';
export const metadata=pageMetadata("/account","fr");
export default function Page(){return <ParentAccount locale="fr"/>;}
