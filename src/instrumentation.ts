import { assertStorageServerConfig } from "@/lib/storage/config";

export async function register() {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  assertStorageServerConfig();
}
