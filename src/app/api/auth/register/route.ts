import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import {
  buildRateLimitHeaders,
  enforceRateLimit,
} from "@/lib/security/rate-limit";

export async function POST(req: Request) {
  const body = await req.json();
  const name = String(body?.name ?? "").trim();
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");

  const rateLimit = await enforceRateLimit(req, {
    key: "auth:register",
    limit: 5,
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

  if (!name || !email || !password) {
    return NextResponse.json(
      { error: "Dados inválidos" },
      { status: 400, headers }
    );
  }

  if (name.length > 80 || email.length > 254) {
    return NextResponse.json(
      { error: "Dados inválidos." },
      { status: 400, headers }
    );
  }

  if (password.length < 6 || password.length > 72) {
    return NextResponse.json(
      { error: "A senha deve ter entre 8 e 72 caracteres." },
      { status: 400, headers }
    );
  }

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    return NextResponse.json(
      { error: "Email já cadastrado" },
      { status: 400, headers }
    );
  }

  const hash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      accounts: {
        create: {
          type: "credentials",
          provider: "credentials",
          providerAccountId: email,
          password: hash,
        },
      },
    },
  });

  return NextResponse.json({ id: user.id }, { headers });
}
