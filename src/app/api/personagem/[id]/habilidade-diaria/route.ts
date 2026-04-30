import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validarEdicaoDaFicha } from "@/lib/regras/personagemPermissao";
import {
  buildRateLimitHeaders,
  enforceRateLimit,
} from "@/lib/security/rate-limit";

function parsePersonagemId(id: string) {
  const personagemId = Number(id);
  return Number.isInteger(personagemId) && personagemId > 0 ? personagemId : null;
}

async function updateDailyAbilityUsage(
  request: NextRequest,
  id: string,
  usada: boolean
) {
  const personagemId = parsePersonagemId(id);

  if (!personagemId) {
    return NextResponse.json(
      { error: "ID do personagem inválido" },
      { status: 400 }
    );
  }

  const permissao = await validarEdicaoDaFicha(personagemId);
  if (!permissao.ok) {
    return NextResponse.json(
      { error: permissao.error },
      { status: permissao.status }
    );
  }

  const rateLimit = await enforceRateLimit(request, {
    key: "personagem:habilidade-diaria",
    limit: 20,
    windowMs: 60_000,
    identifier: permissao.userId,
  });

  const rateLimitHeaders = buildRateLimitHeaders(rateLimit);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Muitas ações em sequência. Aguarde alguns instantes." },
      { status: 429, headers: rateLimitHeaders }
    );
  }

  const personagem = await prisma.personagem.update({
    where: { id: personagemId },
    data: { habilidadeDiariaUsada: usada },
    select: { id: true, habilidadeDiariaUsada: true },
  });

  return NextResponse.json(
    { success: true, personagem },
    { headers: rateLimitHeaders }
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return updateDailyAbilityUsage(request, id, true);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return updateDailyAbilityUsage(request, id, false);
}
