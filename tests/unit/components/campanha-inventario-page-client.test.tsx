import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

const routerMocks = vi.hoisted(() => ({
  refresh: vi.fn(),
}));

const serviceMocks = vi.hoisted(() => ({
  atualizarItemInventarioCampanha: vi.fn(),
  excluirItemInventarioCampanha: vi.fn(),
  vincularItemCampanha: vi.fn(),
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

vi.mock("@/services/campanhaApiService", () => serviceMocks);

vi.mock("@/components/stat-drawer", () => ({
  StatDrawer: () => null,
}));

import { CampanhaInventarioPageClient } from "@/components/campanhas/campanha-inventario-page-client";

const campanha = {
  id: 4,
  nome: "Mesa de Teste",
  mestre: "Narradora",
  capa: "",
  sinopse: "",
};

const personagens = [
  {
    id: 10,
    nome: "Ayla",
    jogador: "Jogadora",
    inventario: [],
  },
];

const catalogoItens = [
  {
    id: 20,
    nome: "Espada gasta",
    tipo: "ARMA" as const,
    descricao: "Lamina usada.",
    durabilidadeBase: 2,
    durabilidadeMax: 4,
  },
];

describe("CampanhaInventarioPageClient", () => {
  beforeEach(() => {
    routerMocks.refresh.mockReset();
    toastMocks.success.mockReset();
    toastMocks.error.mockReset();
    serviceMocks.vincularItemCampanha.mockReset();
    serviceMocks.vincularItemCampanha.mockResolvedValue({ ok: true });
  });

  it("usa o service para vincular item ao inventario da campanha", async () => {
    render(
      <CampanhaInventarioPageClient
        campanha={campanha}
        personagens={personagens}
        catalogoItens={catalogoItens}
        npcsCount={2}
      />
    );

    fireEvent.change(screen.getByLabelText("Quantidade"), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByLabelText("Observações"), {
      target: { value: "Recompensa" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Vincular item" }));

    await waitFor(() => {
      expect(serviceMocks.vincularItemCampanha).toHaveBeenCalledWith(4, {
        personagemId: "10",
        itemId: "20",
        quantidade: "2",
        observacoes: "Recompensa",
      });
    });

    expect(routerMocks.refresh).toHaveBeenCalledTimes(1);
    expect(toastMocks.success).toHaveBeenCalledWith("Item incluído no inventário.");
  });
});
