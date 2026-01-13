import { signIn, signOut } from "next-auth/react";

export const authService = {
  loginComGoogle() {
    return signIn("google", {
      callbackUrl: "/dashboard",
    });
  },

  logout() {
    return signOut({
      callbackUrl: "/login",
    });
  },
};
