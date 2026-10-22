import { handleBilling } from '@/lib/subscriptions/http';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request){return handleBilling(request);}
export async function POST(request:Request){return handleBilling(request);}
