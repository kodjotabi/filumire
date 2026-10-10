/*
 * The readable filumire_signed_in cookie set beside the HttpOnly
 * session cookie. It only says that a built-in sign-in session
 * exists, so clients stop sending development identity headers;
 * it carries no identity and the server never trusts it.
 */
const SIGNED_IN_MARKER = "filumire_signed_in";

export function hasAccountSession(): boolean {
  if (typeof document === "undefined") return false;

  return document.cookie
    .split(";")
    .some((part) => part.trim() === `${SIGNED_IN_MARKER}=1`);
}

export function clearSignedInMarker(): void {
  if (typeof document === "undefined") return;

  document.cookie = `${SIGNED_IN_MARKER}=; Max-Age=0; Path=/; SameSite=Strict; Secure`;
}

/*
 * Development builds identify as the built-in test learner unless
 * someone has really signed in; production never does.
 */
export function usesDevelopmentIdentity(): boolean {
  return process.env.NODE_ENV !== "production" && !hasAccountSession();
}
