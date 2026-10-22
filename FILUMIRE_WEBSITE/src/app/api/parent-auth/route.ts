import { handleAuth } from '@/lib/subscriptions/http';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleAuth(request);}
