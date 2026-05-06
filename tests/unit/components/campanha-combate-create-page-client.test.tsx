import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

const routerMocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
}));

const serviceMocks = vi.hoisted(() => ({
  criarCombateCampanha: vi.fn(),
}));

const toastMocks = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMocks,
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("sonner", () => ({
  toast: toastMocks,
}));

vi.mock("@/components/campanhas/escudo-layout-shell", () => ({
  EscudoLayoutShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/drawer", () => ({
  Drawer: ({ open, children }: { open?: boolean; children: ReactNode }) =>
    open ? <>{children}</> : null,
  DrawerContent: ({ children }: { children: ReactNode }) => (
    <div role="dialog">{children}</div>
  ),
  DrawerDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  DrawerHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DrawerTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

vi.mock("@/services/campanhaApiService", () => serviceMocks);

import { CampanhaCombateCreatePageClient } from "@/components/campanhas/campanha-combate-create-page-client";
import type { CombateCatalogoAmeaca } from "@/types";

const campanha = {
  id: 4,
  nome: "Mesa de Teste",
  mestre: "Narradora",
  capa: "",
  sinopse: "",
};

const ameaca: CombateCatalogoAmeaca = {
  id: 10,
  nome: "Sentinela Etérea",
  slug: "sentinela-eterea",
  tipo: "Constructo",
  tipoSecundario: "Guardião",
  elemento: "Etéreo",
  funcao: "Defensor",
  va: 2,
  pv: 18,
  mana: 6,
  defesa: 15,
  danoBase: "1d8",
  danoMedio: 4,
  descricao: "Guarda passagens antigas.",
  narrativa: "Permanece imóvel até ser provocada.",
  fraquezas: ["Luz"],
  resistencias: ["Mental"],
  imunidades: ["Veneno"],
  golpes: [{ nome: "Lâmina espectral", descricao: "Ataque direto.", dano: "1d8" }],
  reacoes: {
    bloqueio: 1,
    esquiva: 0,
    contraAtaque: 1,
  },
};

function renderCreate() {
  return render(
    <CampanhaCombateCreatePageClient
      campanha={campanha}
      personagens={[]}
      ameacas={[ameaca]}
      personagensCount={0}
      inventarioCount={0}
      npcsCount={0}
      combatesCount={0}
      bestiarioCount={1}
    />
  );
}

describe("CampanhaCombateCreatePageClient", () => {
  beforeEach(() => {
    routerMocks.push.mockReset();
    routerMocks.refresh.mockReset();
    toastMocks.success.mockReset();
    toastMocks.error.mockReset();
    serviceMocks.criarCombateCampanha.mockReset();
    serviceMocks.criarCombateCampanha.mockResolvedValue({
      ok: true,
      combate: { id: 30 },
    });
  });

  it("abre a ficha de consulta pelo botão Ficha sem ações de combate", async () => {
    const user = userEvent.setup();
    renderCreate();

    await user.click(screen.getByRole("button", { name: "Ficha" }));

    const drawer = screen.getByRole("dialog");
    expect(drawer).toHaveTextContent("Sentinela Etérea");
    expect(drawer).toHaveTextContent("Nenhuma ação de combate é alterada");
    expect(drawer).not.toHaveTextContent("Salvar PV e mana");
    expect(drawer).not.toHaveTextContent("Usar");
  });

  it("abre a ficha ao clicar no card da ameaça", async () => {
    const user = userEvent.setup();
    renderCreate();

    await user.click(
      screen.getByRole("button", { name: /consultar ficha de sentinela etérea/i })
    );

    expect(screen.getByRole("dialog")).toHaveTextContent("Lâmina espectral");
  });

  it("adiciona ameaça com iniciativa inicial pela defesa e mantém edição", async () => {
    const user = userEvent.setup();
    renderCreate();

    expect(screen.queryByText("Selecionada")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Adicionar" }));
    const iniciativa = screen.getByDisplayValue("15");
    await user.clear(iniciativa);
    await user.type(iniciativa, "17");

    await user.type(
      screen.getByPlaceholderText("Emboscada na estrada"),
      "Entrada do templo"
    );
    await user.click(screen.getByRole("button", { name: "Criar combate" }));

    await waitFor(() => {
      expect(serviceMocks.criarCombateCampanha).toHaveBeenCalledWith(4, {
        nome: "Entrada do templo",
        personagens: [],
        ameacas: [{ ameacaId: 10, iniciativa: "17" }],
      });
    });
  });
});
