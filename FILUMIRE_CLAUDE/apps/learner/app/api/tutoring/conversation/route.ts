import { createConversationHandler, getConversationContext } from "../../../../../../services/edututor/conversation-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const POST = createConversationHandler();
export const GET = getConversationContext;
