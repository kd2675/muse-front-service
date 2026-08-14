export type AuthExpireReason = "expired" | "refresh_failed";

type AuthExpireListener = (reason: AuthExpireReason) => void;
type AuthChangeListener = () => void;

const authExpireListeners = new Set<AuthExpireListener>();
const authChangeListeners = new Set<AuthChangeListener>();
let authExpiryClaimed = false;

export function claimAuthExpiryNotification(): boolean {
  if (authExpiryClaimed) {
    return false;
  }
  authExpiryClaimed = true;
  return true;
}

export function resetAuthExpiryNotification() {
  authExpiryClaimed = false;
}

export function onAuthExpired(listener: AuthExpireListener) {
  authExpireListeners.add(listener);
  return () => {
    authExpireListeners.delete(listener);
  };
}

export function emitAuthExpired(reason: AuthExpireReason) {
  authExpireListeners.forEach((listener) => listener(reason));
}

export function onAuthChanged(listener: AuthChangeListener) {
  authChangeListeners.add(listener);
  return () => {
    authChangeListeners.delete(listener);
  };
}

export function emitAuthChanged() {
  authChangeListeners.forEach((listener) => listener());
}
