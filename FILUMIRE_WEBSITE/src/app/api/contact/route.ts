import { handleContact } from '@/lib/server/contact';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export async function GET(request: Request) { return handleContact(request); }
export async function POST(request: Request) { return handleContact(request); }
