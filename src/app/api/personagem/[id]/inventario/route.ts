import { NextResponse } from "next/server";

const ADMIN_ONLY_MESSAGE =
  "Gerenciamento de itens do inventário é restrito ao administrador do sistema.";

function adminOnly() {
  return NextResponse.json(
    { success: false, error: ADMIN_ONLY_MESSAGE },
    { status: 403 }
  );
}

export async function POST() {
  return adminOnly();
}

export async function PATCH() {
  return adminOnly();
}

export async function DELETE() {
  return adminOnly();
}
