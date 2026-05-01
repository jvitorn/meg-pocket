export const AUTH_CACHE_TTL_MS = 2 * 24 * 60 * 60 * 1000;
export const AUTH_CACHE_CREATED_AT_KEY = "meg-pocket:auth-cache:created-at:v1";

function isBrowser() {
  return typeof window !== "undefined";
}

export function getClientAuthCacheCreatedAt() {
  if (!isBrowser()) return null;

  try {
    const raw = window.localStorage.getItem(AUTH_CACHE_CREATED_AT_KEY);
    const timestamp = raw ? Number(raw) : NaN;
    return Number.isFinite(timestamp) ? timestamp : null;
  } catch {
    return null;
  }
}

export function markClientAuthCacheCreatedAt(timestamp = Date.now()) {
  if (!isBrowser()) return;

  try {
    window.localStorage.setItem(AUTH_CACHE_CREATED_AT_KEY, String(timestamp));
  } catch {
    // Storage can be blocked in private modes; auth must keep working.
  }
}

export function isClientAuthCacheExpired(now = Date.now()) {
  const createdAt = getClientAuthCacheCreatedAt();
  return createdAt !== null && now - createdAt > AUTH_CACHE_TTL_MS;
}

export async function clearClientAuthCache() {
  if (!isBrowser()) return;

  try {
    if (typeof window.localStorage.clear === "function") {
      window.localStorage.clear();
    }
  } catch {
    // Ignore storage failures and keep clearing the remaining browser caches.
  }

  try {
    if (typeof window.sessionStorage.clear === "function") {
      window.sessionStorage.clear();
    }
  } catch {
    // Ignore storage failures and keep clearing the remaining browser caches.
  }

  if ("caches" in window) {
    try {
      const cacheNames = await window.caches.keys();
      await Promise.all(cacheNames.map((cacheName) => window.caches.delete(cacheName)));
    } catch {
      // CacheStorage may be unavailable depending on browser settings.
    }
  }
}
