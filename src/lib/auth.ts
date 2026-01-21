import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";


export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
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

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
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
        };
      },
    }),

  ],

  session: {
    strategy: "database",
  },

  callbacks: {
    async redirect({ url, baseUrl }) {
    // Se houver uma url de callback válida, retorna ela
    if (url.startsWith(baseUrl)) {
      return url;
    }
    return baseUrl;
  },
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
};
