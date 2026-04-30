import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const routerMocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
}));

const fetchMock = vi.fn<typeof fetch>();

vi.stubGlobal("fetch", fetchMock);

vi.mock("next/navigation", () => ({
  useRouter: () => routerMocks,
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/magia-details-drawer", () => ({
  MagiaDetailsDrawer: () => null,
}));

vi.mock("@/components/personagens/personagem-image-upload", () => ({
  PersonagemImageUpload: ({
    onChange,
    disabled,
  }: {
    onChange: (value: { previewUrl: string; file: File | null } | null) => void;
    disabled?: boolean;
  }) => (
    <button
      type="button"
      disabled={disabled}
      onClick={() =>
        onChange({
          previewUrl: "blob:personagem-upload-preview",
          file: new File(["imagem"], "avatar.png", { type: "image/png" }),
        })
      }
    >
      Simular upload de imagem
    </button>
  ),
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogClose: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import PersonagemCreateForm from "@/components/personagens/personagem-create-form";

const props = {
  campanhas: [
    {
      id: 1,
      nome: "Campanha Alpha",
      sinopse: "A fronteira está em chamas.",
    },
  ],
  classes: [
    {
      id: 2,
      nome: "Elementalista",
      hp: 3,
      mana: 4,
      Magias: [
        {
          id: 10,
          nome: "Chama Astral",
          descricao: "Dispara uma rajada ígnea.",
          alcance: "Toque",
          custo_nivel: 2,
        },
      ],
    },
  ],
  racas: [
    {
      id: 3,
      nome: "Humano",
      hp: 5,
      mana: 6,
      descricao: "Versátil e adaptável.",
    },
  ],
  pericias: [
    {
      id: 20,
      nome: "Combate",
      tipo: "fisica",
      descricao: "Treinamento marcial.",
    },
  ],
};

function getActionButton(name: string) {
  const buttons = screen.getAllByRole("button", { name });
  return buttons[0];
}

describe("PersonagemCreateForm", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    routerMocks.push.mockReset();
    routerMocks.refresh.mockReset();
  });

  it(
    "exige a selecao de magia antes de avancar no grimorio",
    async () => {
      const user = userEvent.setup();

      render(<PersonagemCreateForm {...props} />);

    await user.click(getActionButton("Continuar"));
    await user.click(getActionButton("Continuar"));
    await user.click(getActionButton("Continuar"));

      expect(
        await screen.findByText("Selecione de 1 a 3 magias para continuar.")
      ).toBeInTheDocument();
    },
    15000
  );

  it(
    "envia a ficha completa e redireciona para a pagina do personagem criado",
    async () => {
      const user = userEvent.setup();
      fetchMock.mockResolvedValue(
        new Response(JSON.stringify({ id: 42 }), {
          status: 201,
          headers: { "content-type": "application/json" },
        })
      );

      render(<PersonagemCreateForm {...props} />);

      await user.click(getActionButton("Continuar"));
      await user.click(getActionButton("Continuar"));

      const magiaCardButton = screen.getByText("Chama Astral").closest("button");
      expect(magiaCardButton).not.toBeNull();
      await user.click(magiaCardButton!);

      await user.click(getActionButton("Continuar"));
      await user.click(getActionButton("Continuar"));
      await user.click(getActionButton("Continuar"));

      await user.type(screen.getByLabelText("Nome do personagem"), "Selene");
      await user.type(screen.getByLabelText("Apelido (opcional)"), "A Cronista");
      await user.type(
        screen.getByLabelText("Descrição curta"),
        "Observadora dos véus arcanos."
      );

      await user.click(getActionButton("Criar ficha"));

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith("/api/personagem/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nome: "Selene",
            apelido: "A Cronista",
            descricao: "Observadora dos véus arcanos.",
            imagemPrincipal: null,
            campanhaId: "1",
            classeId: "2",
            racaId: "3",
            magiaIds: [10],
            periciaIds: [20],
            elemento: "natureza",
          }),
        });
      });

      expect(routerMocks.push).toHaveBeenCalledWith("/personagens/42");
      expect(routerMocks.refresh).toHaveBeenCalledTimes(1);
    },
    15000
  );

  it(
    "envia a imagem para o storage antes de criar a ficha",
    async () => {
      const user = userEvent.setup();

      fetchMock
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ url: "http://localhost:9323/personagens/selene.png" }), {
            status: 201,
            headers: { "content-type": "application/json" },
          })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ id: 77 }), {
            status: 201,
            headers: { "content-type": "application/json" },
          })
        );

      render(<PersonagemCreateForm {...props} />);

      await user.click(getActionButton("Continuar"));
      await user.click(getActionButton("Continuar"));

      const magiaCardButton = screen.getByText("Chama Astral").closest("button");
      expect(magiaCardButton).not.toBeNull();
      await user.click(magiaCardButton!);

      await user.click(getActionButton("Continuar"));
      await user.click(getActionButton("Continuar"));
      await user.click(getActionButton("Continuar"));

      await user.type(screen.getByLabelText("Nome do personagem"), "Selene");
      await user.type(
        screen.getByLabelText("Descrição curta"),
        "Observadora dos véus arcanos."
      );
      await user.click(screen.getByRole("button", { name: "Simular upload de imagem" }));
      await user.click(getActionButton("Criar ficha"));

      await waitFor(() => {
        expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/storage/upload", {
          method: "POST",
          body: expect.any(FormData),
        });
      });

      await waitFor(() => {
        expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/personagem/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nome: "Selene",
            apelido: null,
            descricao: "Observadora dos véus arcanos.",
            imagemPrincipal: "http://localhost:9323/personagens/selene.png",
            campanhaId: "1",
            classeId: "2",
            racaId: "3",
            magiaIds: [10],
            periciaIds: [20],
            elemento: "natureza",
          }),
        });
      });

      expect(routerMocks.push).toHaveBeenCalledWith("/personagens/77");
      expect(routerMocks.refresh).toHaveBeenCalledTimes(1);
    },
    15000
  );

  it(
    "entra em modo edicao e envia alteracoes para a rota da ficha",
    async () => {
      const user = userEvent.setup();
      fetchMock.mockResolvedValue(
        new Response(JSON.stringify({ success: true, id: 42 }), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
      );

      render(
        <PersonagemCreateForm
          {...props}
          initialData={{
            id: 42,
            nome: "Selene",
            apelido: "A Cronista",
            descricao: "Observadora dos véus arcanos.",
            imagemPrincipal: "https://example.com/selene.png",
            campanhaId: 1,
            classeId: 2,
            racaId: 3,
            magiaIds: [10],
            periciaIds: [20],
            elemento: "natureza",
          }}
        />
      );

      const alterarButtons = screen.getAllByRole("button", {
        name: "Alterar ficha",
      });
      expect(alterarButtons.length).toBeGreaterThan(0);

      await user.clear(screen.getByLabelText("Nome do personagem"));
      await user.type(screen.getByLabelText("Nome do personagem"), "Selene Nova");
      await user.click(alterarButtons[0]);

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith("/api/personagem/42", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nome: "Selene Nova",
            apelido: "A Cronista",
            descricao: "Observadora dos véus arcanos.",
            imagemPrincipal: "https://example.com/selene.png",
            campanhaId: "1",
            classeId: "2",
            racaId: "3",
            magiaIds: [10],
            periciaIds: [20],
            elemento: "natureza",
          }),
        });
      });

      expect(routerMocks.push).toHaveBeenCalledWith("/personagens/42");
      expect(routerMocks.refresh).toHaveBeenCalledTimes(1);
    },
    15000
  );
});
