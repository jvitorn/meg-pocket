import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import {
  buildRateLimitHeaders,
  enforceRateLimit,
} from "@/lib/security/rate-limit";

export async function POST(req: Request) {
  const body = await req.json();
  const email = String(body?.email ?? "").trim().toLowerCase();
  const senha = String(body?.senha ?? "");

  const rateLimit = await enforceRateLimit(req, {
    key: "auth:login",
    limit: 8,
    windowMs: 60_000,
    identifier: email || undefined,
  });

  const headers = buildRateLimitHeaders(rateLimit);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Muitas tentativas. Aguarde e tente novamente." },
      { status: 429, headers }
    );
  }

  if (!email || !senha) {
    return NextResponse.json(
      { error: "Credenciais inválidas." },
      { status: 400, headers }
    );
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      accounts: true,
    },
  });

  const credentialsAccount = user?.accounts.find(
    (acc) => acc.provider === "credentials"
  );

  if (!user || !credentialsAccount?.password) {
    return NextResponse.json(
      { error: "Credenciais inválidas." },
      { status: 401, headers }
    );
  }

  const senhaValida = await bcrypt.compare(
    senha,
    credentialsAccount.password
  );

  if (!senhaValida) {
    return NextResponse.json(
      { error: "Credenciais inválidas." },
      { status: 401, headers }
    );
  }

  return NextResponse.json(
    {
      id: user.id,
      name: user.name,
      email: user.email,
    },
    {
      headers,
    }
  );
}
