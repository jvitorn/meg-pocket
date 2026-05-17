const PLACEHOLDER_VALUES = new Set([
  "local-google-client-id",
  "local-google-client-secret",
  "your-google-client-id",
  "your-google-client-secret",
]);

function isRealCredential(value: string | undefined) {
  const trimmed = value?.trim();
  return Boolean(trimmed && !PLACEHOLDER_VALUES.has(trimmed));
}

export function hasGoogleAuthCredentials(
  env: Record<"GOOGLE_CLIENT_ID" | "GOOGLE_CLIENT_SECRET", string | undefined> = {
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  }
) {
  return (
    isRealCredential(env.GOOGLE_CLIENT_ID) &&
    isRealCredential(env.GOOGLE_CLIENT_SECRET)
  );
}
