import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { hasGoogleAuthCredentials } from "@/lib/auth/google";

const SESSION_MAX_AGE_SECONDS = 2 * 24 * 60 * 60;
const googleProvider = hasGoogleAuthCredentials()
  ? [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      }),
    ]
  : [];

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),

  providers: [
    ...googleProvider,
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email.trim().toLowerCase();

        const rateLimit = await enforceRateLimit(
          { headers: new Headers() },
          {
            key: "auth:nextauth:credentials",
            limit: 8,
            windowMs: 60_000,
            identifier: email,
          }
        );

        if (!rateLimit.allowed) {
          throw new Error("Muitas tentativas. Aguarde e tente novamente.");
        }

        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            accounts: true,
          },
        });

        if (!user) return null;

        const credentialsAccount = user.accounts.find(
          (acc) => acc.provider === "credentials"
        );

        // Usuário criado só via Google
        if (!credentialsAccount?.password) {
          return null;
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          credentialsAccount.password
        );

        if (!isValid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          sessionVersion: user.sessionVersion,
        };
      },
    }),

  ],

  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE_SECONDS,
    updateAge: 24 * 60 * 60,
  },

  jwt: {
    maxAge: SESSION_MAX_AGE_SECONDS,
  },

  callbacks: {
    async redirect({ url, baseUrl }) {
      // Permite URLs relativas e evita redirecionos para domínios externos
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }
      if (new URL(url).origin === baseUrl) {
        return url;
      }
      return baseUrl;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.sessionVersion =
          typeof user.sessionVersion === "number" ? user.sessionVersion : 0;
        token.sessionInvalid = false;
        return token;
      }

      if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: String(token.id) },
          select: { sessionVersion: true },
        });

        if (
          !dbUser ||
          Number(token.sessionVersion ?? 0) !== dbUser.sessionVersion
        ) {
          return {
            sessionInvalid: true,
          };
        }
      }

      return token;
    },
    session({ session, token }) {
      if (session.user && token?.id && !token.sessionInvalid) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
};
