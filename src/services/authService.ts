import { signIn, signOut } from "next-auth/react";
import { clearClientAuthCache } from "@/lib/clientAuthCache";

export const authService = {
  // 🔵 Google 
  async loginComGoogle() {
    await clearClientAuthCache();
    return signIn("google", {
      callbackUrl: "/dashboard",
    });
  },
  // 🟢 Login tradicional
  loginComSenha(email: string, password: string) {
    return signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/dashboard",
    });
  },
  async logout() {
    await clearClientAuthCache();
    return signOut({
      callbackUrl: "/login",
    });
  },
};
