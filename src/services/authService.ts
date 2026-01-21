import { signIn, signOut } from "next-auth/react";

export const authService = {
  // 🔵 Google 
  loginComGoogle() {
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
  logout() {
    return signOut({
      callbackUrl: "/login",
    });
  },
};
