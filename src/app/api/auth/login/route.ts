import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  const { email, senha } = await req.json();

  if (!email || !senha) {
    return NextResponse.json(
      { error: "Dados inválidos" },
      { status: 400 }
    );
  }

  // 1️⃣ Buscar usuário
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      accounts: true,
    },
  });

  if (!user) {
    return NextResponse.json(
      { error: "Usuário ou senha inválidos" },
      { status: 401 }
    );
  }

  // 2️⃣ Buscar account de credentials
  const credentialsAccount = user.accounts.find(
    (acc) => acc.provider === "credentials"
  );

  // Usuário só Google
  if (!credentialsAccount || !credentialsAccount.password) {
    return NextResponse.json(
      { error: "Conta criada via Google. Use login com Google." },
      { status: 403 }
    );
  }

  // 3️⃣ Comparar senha
  const senhaValida = await bcrypt.compare(
    senha,
    credentialsAccount.password
  );

  if (!senhaValida) {
    return NextResponse.json(
      { error: "Usuário ou senha inválidos" },
      { status: 401 }
    );
  }

  // 4️⃣ Sucesso (sessão ainda simples)
  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
  });
}
