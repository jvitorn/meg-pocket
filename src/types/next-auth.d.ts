export {};

declare module "next-auth" {
  interface User {
    sessionVersion?: number;
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    sessionVersion?: number;
    sessionInvalid?: boolean;
  }
}
