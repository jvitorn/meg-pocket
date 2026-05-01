import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps, ReactNode } from "react";

const routerMocks = vi.hoisted(() => ({
  refresh: vi.fn(),
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

vi.mock("next/image", () => ({
  default: ({
    alt,
    ...props
  }: ComponentProps<"img"> & { fill?: boolean; priority?: boolean }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt ?? ""} {...props} />
  ),
}));

vi.mock("sonner", () => ({
  toast: toastMocks,
}));

vi.mock("@/components/ui/drawer", () => ({
  Drawer: ({ open, children }: { open?: boolean; children: ReactNode }) =>
    open ? <>{children}</> : null,
  DrawerContent: ({ children }: { children: ReactNode }) => (
    <div role="dialog">{children}</div>
  ),
  DrawerDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  DrawerFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DrawerHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DrawerTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

import { CampanhaEditClient } from "@/components/campanhas/campanha-edit-client";

const campanha = {
  id: 4,
  nome: "Mesa de Teste",
  sinopse: "Uma mesa em andamento.",
  mestre: "Narradora",
  capa: "",
  tags: ["aventura"],
};

const personagens = [
  {
    id: 10,
    nome: "Ayla",
    jogador: "Jogadora",
    inventario: [
      {
        id: 30,
        itemId: 20,
        nome: "Espada gasta",
        tipo: "ARMA" as const,
        descricao: "Lamina usada.",
        durabilidadeAtual: 0,
        durabilidadeMax: 4,
        quantidade: 0,
        esgotado: true,
        observacoes: "",
      },
    ],
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

function mockFetchOk() {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ ok: true }),
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("CampanhaEditClient", () => {
  beforeEach(() => {
    routerMocks.refresh.mockReset();
    toastMocks.success.mockReset();
    toastMocks.error.mockReset();
    vi.unstubAllGlobals();
  });

  it("envia personagem, item e durabilidade ao vincular item pelo dialog", async () => {
    const fetchMock = mockFetchOk();

    render(
      <CampanhaEditClient
        campanha={campanha}
        personagens={personagens}
        catalogoItens={catalogoItens}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Vincular item" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).queryByText("Notação")).not.toBeInTheDocument();
    expect(within(dialog).queryByText("Slots")).not.toBeInTheDocument();
    fireEvent.click(
      within(dialog).getByRole("checkbox", {
        name: /editar valores deste inventário/i,
      })
    );
    fireEvent.change(within(dialog).getByLabelText("Quantidade"), {
      target: { value: "2" },
    });
    fireEvent.change(within(dialog).getByLabelText("Observações"), {
      target: { value: "Recompensa" },
    });
    fireEvent.change(within(dialog).getByLabelText("Durabilidade max."), {
      target: { value: "4" },
    });
    fireEvent.change(within(dialog).getByLabelText("Durabilidade atual"), {
      target: { value: "3" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Vincular item" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/campanhas/4/inventario",
        expect.objectContaining({ method: "POST" })
      );
    });

    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(String(init?.body))).toEqual({
      personagemId: "10",
      itemId: "20",
      quantidade: "2",
      observacoes: "Recompensa",
      durabilidadeAtual: "3",
      durabilidadeMax: "4",
    });
    expect(routerMocks.refresh).toHaveBeenCalledTimes(1);
    expect(toastMocks.success).toHaveBeenCalledWith(
      "Item incluído no inventário com sucesso."
    );
  });

  it("mostra resumo de inventário e aponta para a tela completa", () => {
    render(
      <CampanhaEditClient
        campanha={campanha}
        personagens={personagens}
        catalogoItens={catalogoItens}
      />
    );

    expect(
      screen.getByRole("heading", { name: "Inventário da campanha" })
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Recuperar item" })).not.toBeInTheDocument();

    const inventarioLinks = screen.getAllByRole("link", { name: /abrir inventário/i });
    expect(inventarioLinks[0]).toHaveAttribute(
      "href",
      "/campanhas/escudo/4/inventario"
    );

    expect(
      screen.getByRole("link", { name: /Ayla/i })
    ).toHaveAttribute("href", "/campanhas/escudo/4/inventario#personagem-10");
  });
});
