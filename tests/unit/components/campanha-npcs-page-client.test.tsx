import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

const routerMocks = vi.hoisted(() => ({
  refresh: vi.fn(),
}));

const serviceMocks = vi.hoisted(() => ({
  excluirNpcCampanha: vi.fn(),
  gerarNpcCampanha: vi.fn(),
  refinarNarrativaNpcCampanha: vi.fn(),
  salvarNpcCampanha: vi.fn(),
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

import { CampanhaNpcsPageClient } from "@/components/campanhas/campanha-npcs-page-client";

const campanha = {
  id: 4,
  nome: "Mesa de Teste",
  mestre: "Narradora",
  capa: "",
  sinopse: "",
};

const racas = [{ id: 1, nome: "Humano" }];
const classes = [{ id: 2, nome: "Mago" }];
const estilosNarrativos = [
  { chave: "classico", nome: "Clássico", descricao: null },
];

describe("CampanhaNpcsPageClient", () => {
  beforeEach(() => {
    routerMocks.refresh.mockReset();
    toastMocks.success.mockReset();
    toastMocks.error.mockReset();
    serviceMocks.gerarNpcCampanha.mockReset();
    serviceMocks.gerarNpcCampanha.mockResolvedValue({
      ok: true,
      npc: {
        nome: "Mira",
        racaId: 1,
        racaNome: "Humano",
        genero: "neutro",
        objetivoCampanha: "Guiar o grupo.",
      },
    });
  });

  it("usa o service para gerar NPC e preencher a ficha em revisao", async () => {
    render(
      <CampanhaNpcsPageClient
        campanha={campanha}
        npcs={[]}
        racas={racas}
        classes={classes}
        estilosNarrativos={estilosNarrativos}
        limite={50}
        personagensCount={1}
        inventarioCount={0}
      />
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Gerar NPC" })[0]);

    await waitFor(() => {
      expect(serviceMocks.gerarNpcCampanha).toHaveBeenCalledWith(4, {});
    });

    expect(screen.getByDisplayValue("Mira")).toBeInTheDocument();
    expect(toastMocks.success).toHaveBeenCalledWith("NPC gerado para revisão.");
  });
});
