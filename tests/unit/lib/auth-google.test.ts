import { describe, expect, it } from "vitest";

import { hasGoogleAuthCredentials } from "@/lib/auth/google";

describe("hasGoogleAuthCredentials", () => {
  it("desabilita Google quando as envs estao ausentes ou vazias", () => {
    expect(
      hasGoogleAuthCredentials({
        GOOGLE_CLIENT_ID: undefined,
        GOOGLE_CLIENT_SECRET: undefined,
      })
    ).toBe(false);
    expect(
      hasGoogleAuthCredentials({
        GOOGLE_CLIENT_ID: "",
        GOOGLE_CLIENT_SECRET: "   ",
      })
    ).toBe(false);
  });

  it("desabilita Google quando as envs contem placeholders locais", () => {
    expect(
      hasGoogleAuthCredentials({
        GOOGLE_CLIENT_ID: "local-google-client-id",
        GOOGLE_CLIENT_SECRET: "local-google-client-secret",
      })
    ).toBe(false);
    expect(
      hasGoogleAuthCredentials({
        GOOGLE_CLIENT_ID: "your-google-client-id",
        GOOGLE_CLIENT_SECRET: "your-google-client-secret",
      })
    ).toBe(false);
  });

  it("habilita Google somente quando as duas credenciais parecem reais", () => {
    expect(
      hasGoogleAuthCredentials({
        GOOGLE_CLIENT_ID: "client-id.apps.googleusercontent.com",
        GOOGLE_CLIENT_SECRET: "real-secret",
      })
    ).toBe(true);
    expect(
      hasGoogleAuthCredentials({
        GOOGLE_CLIENT_ID: "client-id.apps.googleusercontent.com",
        GOOGLE_CLIENT_SECRET: "",
      })
    ).toBe(false);
  });
});
