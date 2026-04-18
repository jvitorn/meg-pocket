import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  buildRateLimitHeaders,
  enforceRateLimit,
  getClientIp,
} from "@/lib/security/rate-limit";
import { sendPasswordResetEmail } from "@/lib/email/password-reset-email";

const RESET_CODE_EXPIRATION_MINUTES = 15;
const RESET_CODE_EXPIRATION_MS = RESET_CODE_EXPIRATION_MINUTES * 60_000;

function buildNeutralResponse(previewCode?: string) {
  return {
    ok: true,
    message:
      "Se esse email estiver cadastrado, enviaremos um código para redefinir sua senha.",
    ...(previewCode ? { previewCode } : {}),
  };
}

function generateResetCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const ip = getClientIp(req);

  const [emailRateLimit, ipRateLimit] = await Promise.all([
    enforceRateLimit(req, {
      key: "auth:password-reset:request:email",
      limit: 3,
      windowMs: 15 * 60_000,
      identifier: email || undefined,
    }),
    enforceRateLimit(req, {
      key: "auth:password-reset:request:ip",
      limit: 12,
      windowMs: 15 * 60_000,
      identifier: ip,
    }),
  ]);

  const activeRateLimit = !emailRateLimit.allowed ? emailRateLimit : ipRateLimit;
  const headers = buildRateLimitHeaders(activeRateLimit);

  if (!emailRateLimit.allowed || !ipRateLimit.allowed) {
    return NextResponse.json(
      { error: "Muitas solicitações. Aguarde e tente novamente." },
      { status: 429, headers }
    );
  }

  if (!email || email.length > 254) {
    return NextResponse.json(buildNeutralResponse(), { headers });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { accounts: true },
  });

  const credentialsAccount = user?.accounts.find(
    (account) => account.provider === "credentials" && account.password
  );

  if (!user || !credentialsAccount) {
    return NextResponse.json(buildNeutralResponse(), { headers });
  }

  const code = generateResetCode();
  const codeHash = await bcrypt.hash(code, 10);
  const now = new Date();
  const expiresAt = new Date(Date.now() + RESET_CODE_EXPIRATION_MS);

  await prisma.$transaction([
    prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: now },
    }),
    prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        codeHash,
        expiresAt,
      },
    }),
  ]);

  const emailResult = await sendPasswordResetEmail({
    to: user.email,
    name: user.name,
    code,
    expiresInMinutes: RESET_CODE_EXPIRATION_MINUTES,
  });

  return NextResponse.json(buildNeutralResponse(emailResult.previewCode), {
    headers,
  });
}
