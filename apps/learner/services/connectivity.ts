/*
 * Minimal, event-driven connectivity signal for the learner
 * app. This never polls the network. It only reflects:
 *  - the browser's online/offline events (a hint, not proof);
 *  - real outcomes of requests the app already makes.
 */

export type ConnectivityStatus =
  | "connected"
  | "offline"
  | "reconnecting";

type Listener = (status: ConnectivityStatus) => void;

let currentStatus: ConnectivityStatus = "connected";
const listeners = new Set<Listener>();

function setStatus(next: ConnectivityStatus): void {
  if (next === currentStatus) {
    return;
  }

  currentStatus = next;

  for (const listener of listeners) {
    listener(currentStatus);
  }
}

export function getConnectivityStatus(): ConnectivityStatus {
  return currentStatus;
}

export function subscribeConnectivity(
  listener: Listener,
): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

/*
 * Call when a real request fails for a connectivity-type
 * reason (the fetch itself could not complete).
 */
export function markOffline(): void {
  setStatus("offline");
}

/*
 * Call while a retry/synchronization attempt is in flight.
 */
export function markReconnecting(): void {
  setStatus("reconnecting");
}

/*
 * Call only after a real request has actually succeeded.
 */
export function markConnected(): void {
  setStatus("connected");
}

export function initConnectivityListeners(): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  if (
    typeof window.navigator?.onLine === "boolean" &&
    !window.navigator.onLine
  ) {
    setStatus("offline");
  }

  function handleOffline(): void {
    setStatus("offline");
  }

  function handleOnline(): void {
    // navigator.onLine alone does not prove the server is
    // reachable, so this is a hint that a retry is worth
    // attempting, not proof of a restored connection.
    setStatus("reconnecting");
  }

  window.addEventListener("offline", handleOffline);
  window.addEventListener("online", handleOnline);

  return () => {
    window.removeEventListener("offline", handleOffline);
    window.removeEventListener("online", handleOnline);
  };
}
