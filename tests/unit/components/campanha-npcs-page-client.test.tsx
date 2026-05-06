import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })
    );
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

    expect(screen.getAllByRole("heading", { name: "Mira" }).length).toBeGreaterThan(0);
    expect(toastMocks.success).toHaveBeenCalledWith("NPC gerado para revisão.");
  });

  it("abre drawer mobile ao gerar NPC e remove a aba de itens", async () => {
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

    const drawer = await screen.findByRole("dialog");
    expect(within(drawer).getByRole("tab", { name: /Narrativa/i })).toBeInTheDocument();
    expect(within(drawer).getByRole("tab", { name: /Cena/i })).toBeInTheDocument();
    expect(within(drawer).getByRole("tab", { name: /Motivações/i })).toBeInTheDocument();
    expect(within(drawer).getByRole("tab", { name: /Perfil/i })).toBeInTheDocument();
    expect(within(drawer).queryByRole("tab", { name: /Itens/i })).not.toBeInTheDocument();
  });

  it("mostra os campos obrigatórios reais ao iniciar NPC manual", () => {
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

    fireEvent.click(screen.getByRole("button", { name: "Novo NPC" }));

    expect(
      screen.getByText(/Nome, Raça, Gênero e Objetivo na campanha/i)
    ).toBeInTheDocument();
  });
});
