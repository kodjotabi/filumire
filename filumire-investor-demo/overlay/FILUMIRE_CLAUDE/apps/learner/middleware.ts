import { NextResponse, type NextRequest } from "next/server";

// Investor demo only: there is no sign-in; every way in leads to the learner picker.
export function middleware(request: NextRequest) {
  return NextResponse.redirect(new URL("/demo", request.url));
}

export const config = { matcher: ["/", "/login", "/register"] };
