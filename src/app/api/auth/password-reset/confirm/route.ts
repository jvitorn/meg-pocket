import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  buildRateLimitHeaders,
  enforceRateLimit,
  getClientIp,
} from "@/lib/security/rate-limit";

const MAX_CODE_ATTEMPTS = 5;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const code = String(body?.code ?? "").trim();
  const password = String(body?.password ?? "");
  const ip = getClientIp(req);

  const [emailRateLimit, ipRateLimit] = await Promise.all([
    enforceRateLimit(req, {
      key: "auth:password-reset:confirm:email",
      limit: 5,
      windowMs: 15 * 60_000,
      identifier: email || undefined,
    }),
    enforceRateLimit(req, {
      key: "auth:password-reset:confirm:ip",
      limit: 20,
      windowMs: 15 * 60_000,
      identifier: ip,
    }),
  ]);

  const activeRateLimit = !emailRateLimit.allowed ? emailRateLimit : ipRateLimit;
  const headers = buildRateLimitHeaders(activeRateLimit);

  if (!emailRateLimit.allowed || !ipRateLimit.allowed) {
    return NextResponse.json(
      { error: "Muitas tentativas. Aguarde e tente novamente." },
      { status: 429, headers }
    );
  }

  if (!email || !code || !password || email.length > 254) {
    return NextResponse.json(
      { error: "Código inválido ou expirado." },
      { status: 400, headers }
    );
  }

  if (password.length < 1 || password.length > 72) {
    return NextResponse.json(
      { error: "A senha deve ter entre 1 e 72 caracteres." },
      { status: 400, headers }
    );
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { accounts: true },
  });

  const credentialsAccount = user?.accounts.find(
    (account) => account.provider === "credentials" && account.password
  );

  if (!user || !credentialsAccount) {
    return NextResponse.json(
      { error: "Código inválido ou expirado." },
      { status: 400, headers }
    );
  }

  const resetToken = await prisma.passwordResetToken.findFirst({
    where: {
      userId: user.id,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!resetToken || resetToken.attempts >= MAX_CODE_ATTEMPTS) {
    return NextResponse.json(
      { error: "Código inválido ou expirado." },
      { status: 400, headers }
    );
  }

  const codeMatches = await bcrypt.compare(code, resetToken.codeHash);

  if (!codeMatches) {
    const attempts = resetToken.attempts + 1;

    await prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: {
        attempts,
        ...(attempts >= MAX_CODE_ATTEMPTS ? { usedAt: new Date() } : {}),
      },
    });

    return NextResponse.json(
      { error: "Código inválido ou expirado." },
      { status: 400, headers }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const now = new Date();

  await prisma.$transaction([
    prisma.account.update({
      where: { id: credentialsAccount.id },
      data: { password: passwordHash },
    }),
    prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: now },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { sessionVersion: { increment: 1 } },
    }),
  ]);

  return NextResponse.json(
    { ok: true, message: "Senha atualizada com sucesso." },
    { headers }
  );
}
